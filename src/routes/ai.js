import { Router, json } from 'express';
import store from '../db/store.js';
import { validateMessage } from '../middleware/sanitize.js';

const router = Router();

let aiClient = null;
let aiOnline = false;

// ── Initialize AI client ──
async function initAI() {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    aiClient = await ZAI.create();
    aiOnline = true;
    console.log('[STRATO] AI client initialized');
  } catch (err) {
    // AI is optional — missing config is expected in development
    if (err.message && err.message.includes('.z-ai-config')) {
      console.warn('[STRATO] AI client skipped — no .z-ai-config found. AI features will be offline.');
    } else {
      console.warn('[STRATO] AI client failed to initialize:', err.message);
    }
    aiOnline = false;
  }
}

initAI();

// ── Valid message roles ──
const VALID_ROLES = new Set(['user', 'assistant', 'system']);

// ── AI status endpoint ──
router.get('/api/ai/status', (req, res) => {
  res.json({ online: aiOnline });
});

// ── AI chat endpoint ──
router.post('/api/ai/chat', async (req, res) => {
  if (!aiOnline || !aiClient) {
    return res.status(503).json({ error: 'AI service is currently offline' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Validate message format — don't reflect user input in errors
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Each message must have role and content' });
    }
    if (!VALID_ROLES.has(msg.role)) {
      return res.status(400).json({ error: 'Invalid role provided' });
    }
  }

  // 15-second timeout via AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const completion = await aiClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are STRATO AI, a helpful assistant built into the STRATO web proxy. Be concise, friendly, and helpful. You can help with web browsing tips, homework questions, and general knowledge. Keep responses under 500 words.',
        },
        ...messages,
      ],
    }, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'AI returned an empty response' });
    }

    res.json({ message: { role: 'assistant', content } });
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI service timed out' });
    }

    console.error('[STRATO] AI chat error:', err.message);
    res.status(500).json({ error: 'AI service error. Try again.' });
  }
});

// ── AI Vision endpoint (Snap & Solve) ──
// Uses larger body limit for image uploads — but validate size BEFORE full parse
router.post('/api/ai/vision', json({ limit: '10mb', verify: (req, _res, buf) => {
  // Reject oversized payloads at the raw buffer level before JSON parse
  if (buf.length > 10 * 1024 * 1024) {
    const err = new Error('Image too large — max 10MB');
    err.status = 413;
    throw err;
  }
} }), async (req, res) => {
  if (!aiOnline || !aiClient) {
    return res.status(503).json({ error: 'AI service is currently offline' });
  }

  const { image, prompt } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  // Validate base64 image — must start with data:image/ or be valid base64
  const isDataUrl = image.startsWith('data:image/');

  if (!isDataUrl) {
    // Validate entire string as base64 (not just first 100 chars)
    if (!/^[A-Za-z0-9+/=]+$/.test(image)) {
      return res.status(400).json({ error: 'Invalid image format — must be base64 or data URL' });
    }
  }

  // Size limit: 10MB decoded
  const estimatedSize = image.length * 0.75;
  if (estimatedSize > 10 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image too large — max 10MB' });
  }

  const userPrompt = prompt || 'Solve this question. Show your work step by step and give the final answer clearly at the end.';

  // 25-second timeout for vision (longer than chat)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const completion = await aiClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are STRATO Snap & Solve — a visual question solver built into STRATO. Students screenshot homework questions (especially IXL) and paste them. You analyze the image, identify the question, solve it step by step, and give a clear final answer. Format: Step-by-step solution, then a clear "Answer: ..." line at the end. Be concise but thorough. If you cannot read the image, say so.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: isDataUrl ? image : `data:image/png;base64,${image}` } },
          ],
        },
      ],
    }, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'AI returned an empty response' });
    }

    res.json({ message: { role: 'assistant', content } });
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI vision timed out — try a smaller image' });
    }

    console.error('[STRATO] AI vision error:', err.message);
    res.status(500).json({ error: 'AI vision error. Try again.' });
  }
});

// ── Subject-specific system prompts (v21: 10 subjects) ──
const SUBJECT_PROMPTS = {
  math: 'You are STRATO Math Tutor, an expert mathematics tutor. Help students understand mathematical concepts, solve problems step by step, and check their work. Show clear reasoning, use proper mathematical notation when helpful, and explain the "why" behind each step. Keep responses concise but thorough.',
  science: 'You are STRATO Science Tutor, an expert science tutor covering biology, chemistry, physics, and earth science. Help students understand scientific concepts, design experiments, and analyze data. Use clear explanations with real-world examples. Keep responses concise but thorough.',
  history: 'You are STRATO History Tutor, an expert history tutor covering world history, US history, and government. Help students understand historical events, analyze primary sources, and draw connections between past and present. Provide context and multiple perspectives. Keep responses concise but thorough.',
  english: 'You are STRATO English Tutor, an expert English language and literature tutor. Help students with writing, grammar, literary analysis, vocabulary, and reading comprehension. Provide constructive feedback on writing and guide analysis of texts. Keep responses concise but thorough.',
  general: 'You are STRATO Tutor, a helpful and knowledgeable tutor across all academic subjects. Help students understand concepts, solve problems, and develop study skills. Adapt your approach to the subject and student level. Keep responses concise but thorough.',
  computer_science: 'You are STRATO CS Tutor, an expert computer science tutor. Help students with programming (Python, JavaScript, Java, C++), algorithms, data structures, web development, and computational thinking. Provide code examples with explanations. Debug errors step by step. Keep responses concise but thorough.',
  spanish: 'You are STRATO Spanish Tutor, an expert Spanish language tutor. Help students with Spanish grammar, vocabulary, conversation, reading comprehension, and cultural context. Provide translations with explanations. Correct errors gently and suggest improvements. Keep responses concise but thorough.',
  french: 'You are STRATO French Tutor, an expert French language tutor. Help students with French grammar, vocabulary, conversation, reading comprehension, and cultural context. Provide translations with explanations. Correct errors gently and suggest improvements. Keep responses concise but thorough.',
  economics: 'You are STRATO Economics Tutor, an expert economics tutor covering microeconomics, macroeconomics, and personal finance. Help students understand economic concepts, analyze markets, and apply economic reasoning. Use real-world examples. Keep responses concise but thorough.',
  art: 'You are STRATO Art Tutor, an expert art and design tutor. Help students understand art history, techniques, composition, color theory, and creative processes. Provide constructive feedback on artwork descriptions. Encourage creative thinking and experimentation. Keep responses concise but thorough.',
};

// ── Socratic addition to system prompt ──
const SOCRATIC_ADDITION = ' IMPORTANT: Use the Socratic method — guide the student to discover answers themselves by asking probing questions rather than giving direct answers. Ask follow-up questions that lead them to think critically. Only provide direct answers as a last resort or when explicitly asked.';

// ── AI Tutor endpoint ──
router.post('/api/ai/tutor', async (req, res) => {
  if (!aiOnline || !aiClient) {
    return res.status(503).json({ error: 'AI service is currently offline' });
  }

  const { messages, subject, socratic } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Validate message format
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Each message must have role and content' });
    }
    if (!VALID_ROLES.has(msg.role)) {
      return res.status(400).json({ error: 'Invalid role provided' });
    }
  }

  // Validate subject
  const normalizedSubject = (subject || 'general').toLowerCase().trim();
  if (!SUBJECT_PROMPTS[normalizedSubject]) {
    return res.status(400).json({
      error: `Invalid subject. Valid subjects: ${Object.keys(SUBJECT_PROMPTS).join(', ')}`,
    });
  }

  // Build system prompt based on subject and Socratic mode
  let systemPrompt = SUBJECT_PROMPTS[normalizedSubject];
  if (socratic === true) {
    systemPrompt += SOCRATIC_ADDITION;
  }

  // 25-second timeout for tutor
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const completion = await aiClient.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'AI returned an empty response' });
    }

    res.json({
      message: { role: 'assistant', content },
      subject: normalizedSubject,
      socratic: socratic === true,
    });
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI tutor timed out' });
    }

    console.error('[STRATO] AI tutor error:', err.message);
    res.status(500).json({ error: 'AI tutor error. Try again.' });
  }
});

// ── AI Conversation History ──

// GET /api/ai/history — Get conversation history for user
router.get('/api/ai/history', async (req, res) => {
  try {
    const username = res.locals.username;
    const conversations = await store.query('chat_messages',
      (m) => m.username === username && m.roomId === 'ai_history',
      { sort: { field: 'created_at', order: 'desc' }, limit: 100 }
    );
    res.json({ conversations: conversations.data || [], total: conversations.total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load conversation history' });
  }
});

// DELETE /api/ai/history — Clear conversation history
router.delete('/api/ai/history', async (req, res) => {
  try {
    const username = res.locals.username;
    const removed = await store.deleteMany('chat_messages',
      (m) => m.username === username && m.roomId === 'ai_history'
    );
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// ── AI Suggested Prompts ──
const SUGGESTED_PROMPTS = {
  math: [
    'How do I solve quadratic equations?',
    'Explain the Pythagorean theorem',
    'What is the derivative of x²?',
    'How do I calculate probabilities?',
    'Help me understand fractions',
  ],
  science: [
    'Explain the water cycle',
    'What is photosynthesis?',
    'How does Newton\'s third law work?',
    'What causes earthquakes?',
    'Explain the periodic table',
  ],
  history: [
    'What caused World War I?',
    'Explain the Civil Rights Movement',
    'What was the Renaissance?',
    'How did the Industrial Revolution change society?',
    'What was the Cold War?',
  ],
  english: [
    'Help me write a thesis statement',
    'What are the types of figurative language?',
    'How do I analyze a poem?',
    'Explain the difference between there/their/they\'re',
    'What makes a good essay introduction?',
  ],
  computer_science: [
    'Explain how a for loop works',
    'What is a linked list?',
    'How do I write a function in Python?',
    'What is Big O notation?',
    'Explain the difference between == and ===',
  ],
  spanish: [
    'How do I conjugate present tense verbs?',
    'What is the difference between ser and estar?',
    'Help me with Spanish greetings',
    'Explain subjunctive mood',
    'How do I form questions in Spanish?',
  ],
  french: [
    'How do I conjugate être and avoir?',
    'Explain French article usage',
    'Help me with French pronunciation rules',
    'What is the passé composé?',
    'How do I form negatives in French?',
  ],
  economics: [
    'What is supply and demand?',
    'Explain inflation',
    'How does the stock market work?',
    'What is GDP?',
    'Explain opportunity cost',
  ],
  art: [
    'Explain the color wheel',
    'What is perspective in drawing?',
    'How did Impressionism change art?',
    'What are the principles of design?',
    'Explain contrast in composition',
  ],
  general: [
    'How should I study for a test?',
    'What are good note-taking strategies?',
    'How do I manage my time better?',
    'What is critical thinking?',
    'How can I improve my memory?',
  ],
};

// GET /api/ai/prompts/:subject — Get suggested prompts for a subject
router.get('/api/ai/prompts/:subject', (req, res) => {
  const subject = req.params.subject;
  const prompts = SUGGESTED_PROMPTS[subject] || SUGGESTED_PROMPTS.general;
  res.json({ subject, prompts });
});

// GET /api/ai/subjects — Get available tutor subjects
router.get('/api/ai/subjects', (req, res) => {
  res.json({
    subjects: Object.keys(SUBJECT_PROMPTS).map(key => ({
      id: key,
      name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      hasPrompts: !!SUGGESTED_PROMPTS[key],
    })),
  });
});

export default router;
