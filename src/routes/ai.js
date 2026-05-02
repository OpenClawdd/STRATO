import { Router } from 'express';

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
router.post('/api/ai/vision', express.json({ limit: '10mb', verify: (req, _res, buf) => {
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

export default router;
