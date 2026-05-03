import { Router } from 'express';

const router = Router();

// ── Fake page templates ──
const FAKE_PAGES = {
  classroom: {
    title: 'Google Classroom',
    favicon: 'https://www.google.com/favicon.ico',
    body: () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Classroom</title>
  <link rel="icon" href="https://www.google.com/favicon.ico">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Google Sans', 'Roboto', sans-serif; background: #fff; }
    .header { background: #202124; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
    .header h1 { font-size: 20px; font-weight: 400; }
    .header .icon { width: 32px; height: 32px; background: #1a73e8; border-radius: 50%; }
    .classes { padding: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .class-card { border: 1px solid #dadce0; border-radius: 8px; overflow: hidden; cursor: pointer; }
    .class-card:hover { box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .class-banner { height: 80px; }
    .class-info { padding: 12px 16px; }
    .class-name { font-size: 16px; font-weight: 500; color: #202124; margin-bottom: 4px; }
    .class-section { font-size: 13px; color: #5f6368; }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon"></div>
    <h1>Google Classroom</h1>
  </div>
  <div class="classes">
    <div class="class-card">
      <div class="class-banner" style="background: #1a73e8;"></div>
      <div class="class-info">
        <div class="class-name">Mathematics</div>
        <div class="class-section">Period 2 - Mr. Johnson</div>
      </div>
    </div>
    <div class="class-card">
      <div class="class-banner" style="background: #34a853;"></div>
      <div class="class-info">
        <div class="class-name">English Language Arts</div>
        <div class="class-section">Period 3 - Ms. Williams</div>
      </div>
    </div>
    <div class="class-card">
      <div class="class-banner" style="background: #ea4335;"></div>
      <div class="class-info">
        <div class="class-name">Science</div>
        <div class="class-section">Period 4 - Mrs. Davis</div>
      </div>
    </div>
    <div class="class-card">
      <div class="class-banner" style="background: #fbbc04;"></div>
      <div class="class-info">
        <div class="class-name">Social Studies</div>
        <div class="class-section">Period 5 - Mr. Brown</div>
      </div>
    </div>
  </div>
</body>
</html>`,
  },

  drive: {
    title: 'Google Drive',
    favicon: 'https://www.google.com/favicon.ico',
    body: () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Drive</title>
  <link rel="icon" href="https://www.google.com/favicon.ico">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Google Sans', 'Roboto', sans-serif; background: #fff; }
    .header { background: #fff; border-bottom: 1px solid #dadce0; padding: 8px 16px; display: flex; align-items: center; gap: 12px; }
    .header .logo { width: 40px; height: 40px; }
    .header h1 { font-size: 22px; color: #5f6368; font-weight: 400; }
    .content { padding: 24px; }
    .file-list { list-style: none; }
    .file-item { display: flex; align-items: center; padding: 8px 12px; border-radius: 8px; gap: 12px; }
    .file-item:hover { background: #f1f3f4; }
    .file-icon { width: 24px; height: 24px; }
    .file-name { font-size: 14px; color: #202124; }
  </style>
</head>
<body>
  <div class="header">
    <svg class="logo" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 13.8z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-10.2-17.7c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>
    <h1>My Drive</h1>
  </div>
  <div class="content">
    <ul class="file-list">
      <li class="file-item"><span class="file-icon">📄</span><span class="file-name">English Essay Draft.docx</span></li>
      <li class="file-item"><span class="file-icon">📊</span><span class="file-name">Science Data Spreadsheet.xlsx</span></li>
      <li class="file-item"><span class="file-icon">📑</span><span class="file-name">History Presentation.pptx</span></li>
      <li class="file-item"><span class="file-icon">📄</span><span class="file-name">Math Homework.pdf</span></li>
    </ul>
  </div>
</body>
</html>`,
  },

  docs: {
    title: 'Google Docs',
    favicon: 'https://www.google.com/favicon.ico',
    body: () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Docs</title>
  <link rel="icon" href="https://www.google.com/favicon.ico">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Google Sans', 'Roboto', sans-serif; background: #f1f3f4; }
    .header { background: #fff; border-bottom: 1px solid #dadce0; padding: 8px 16px; display: flex; align-items: center; gap: 12px; }
    .header h1 { font-size: 18px; color: #202124; font-weight: 400; }
    .toolbar { background: #fff; padding: 4px 16px; display: flex; gap: 8px; border-bottom: 1px solid #dadce0; }
    .toolbar button { background: none; border: none; padding: 6px 10px; font-size: 13px; color: #5f6368; cursor: pointer; border-radius: 4px; }
    .toolbar button:hover { background: #f1f3f4; }
    .editor { background: #fff; max-width: 816px; margin: 24px auto; padding: 96px 96px 120px; min-height: 600px; box-shadow: 0 0 0 1px #dadce0; }
    .editor p { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #202124; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Untitled document</h1>
  </div>
  <div class="toolbar">
    <button>File</button>
    <button>Edit</button>
    <button>View</button>
    <button>Insert</button>
    <button>Format</button>
    <button>Tools</button>
  </div>
  <div class="editor">
    <p>Start typing your document here...</p>
  </div>
</body>
</html>`,
  },

  slides: {
    title: 'Google Slides',
    favicon: 'https://www.google.com/favicon.ico',
    body: () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Slides</title>
  <link rel="icon" href="https://www.google.com/favicon.ico">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Google Sans', 'Roboto', sans-serif; background: #f1f3f4; }
    .header { background: #fff; border-bottom: 1px solid #dadce0; padding: 8px 16px; display: flex; align-items: center; gap: 12px; }
    .header h1 { font-size: 18px; color: #202124; font-weight: 400; }
    .slide-area { background: #fff; max-width: 700px; margin: 40px auto; aspect-ratio: 16/9; border: 1px solid #dadce0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .slide-area p { font-size: 24px; color: #5f6368; }
    .thumbnails { position: fixed; left: 0; top: 80px; width: 120px; padding: 12px; }
    .thumb { width: 96px; height: 54px; background: #fff; border: 2px solid #1a73e8; border-radius: 4px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Untitled presentation</h1>
  </div>
  <div class="thumbnails">
    <div class="thumb"></div>
  </div>
  <div class="slide-area">
    <p>Click to add text</p>
  </div>
</body>
</html>`,
  },

  sheets: {
    title: 'Google Sheets',
    favicon: 'https://www.google.com/favicon.ico',
    body: () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Sheets</title>
  <link rel="icon" href="https://www.google.com/favicon.ico">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Google Sans', 'Roboto', sans-serif; background: #f1f3f4; }
    .header { background: #fff; border-bottom: 1px solid #dadce0; padding: 8px 16px; display: flex; align-items: center; gap: 12px; }
    .header h1 { font-size: 18px; color: #202124; font-weight: 400; }
    .toolbar { background: #fff; padding: 4px 16px; display: flex; gap: 8px; border-bottom: 1px solid #dadce0; }
    .toolbar button { background: none; border: none; padding: 6px 10px; font-size: 13px; color: #5f6368; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    td, th { border: 1px solid #dadce0; padding: 4px 8px; font-size: 12px; min-width: 100px; }
    th { background: #f1f3f4; color: #5f6368; font-weight: 500; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Untitled spreadsheet</h1>
  </div>
  <div class="toolbar">
    <button>File</button>
    <button>Edit</button>
    <button>View</button>
    <button>Insert</button>
    <button>Format</button>
  </div>
  <table>
    <tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th></tr>
    <tr><th>1</th><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><th>2</th><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><th>3</th><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><th>4</th><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><th>5</th><td></td><td></td><td></td><td></td><td></td></tr>
  </table>
</body>
</html>`,
  },
};

// ── POST /api/stealth/classroom — Generate fake Google Classroom page ──
router.post('/api/stealth/classroom', (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { classes } = req.body;
    const defaultClasses = [
      { name: 'Mathematics', section: 'Period 2', teacher: 'Mr. Johnson', color: '#1a73e8' },
      { name: 'English Language Arts', section: 'Period 3', teacher: 'Ms. Williams', color: '#34a853' },
      { name: 'Science', section: 'Period 4', teacher: 'Mrs. Davis', color: '#ea4335' },
      { name: 'Social Studies', section: 'Period 5', teacher: 'Mr. Brown', color: '#fbbc04' },
    ];

    const classList = Array.isArray(classes) && classes.length > 0 ? classes : defaultClasses;

    const classCards = classList
      .map(
        (c) => `
    <div class="class-card">
      <div class="class-banner" style="background: ${c.color || '#1a73e8'};"></div>
      <div class="class-info">
        <div class="class-name">${escapeHtml(c.name || 'Class')}</div>
        <div class="class-section">${escapeHtml(c.section || '')} - ${escapeHtml(c.teacher || '')}</div>
      </div>
    </div>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Classroom</title>
  <link rel="icon" href="https://www.google.com/favicon.ico">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Google Sans', 'Roboto', sans-serif; background: #fff; }
    .header { background: #202124; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
    .header h1 { font-size: 20px; font-weight: 400; }
    .header .icon { width: 32px; height: 32px; background: #1a73e8; border-radius: 50%; }
    .classes { padding: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .class-card { border: 1px solid #dadce0; border-radius: 8px; overflow: hidden; cursor: pointer; }
    .class-card:hover { box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .class-banner { height: 80px; }
    .class-info { padding: 12px 16px; }
    .class-name { font-size: 16px; font-weight: 500; color: #202124; margin-bottom: 4px; }
    .class-section { font-size: 13px; color: #5f6368; }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon"></div>
    <h1>Google Classroom</h1>
  </div>
  <div class="classes">${classCards}</div>
</body>
</html>`;

    res.type('html').send(html);
  } catch (err) {
    console.error('[STRATO] Stealth classroom error:', err.message);
    res.status(500).json({ error: 'Failed to generate stealth page' });
  }
});

// ── GET /api/stealth/fake/:type — Get fake page HTML ──
router.get('/api/stealth/fake/:type', (req, res) => {
  try {
    const { type } = req.params;

    const page = FAKE_PAGES[type];
    if (!page) {
      return res.status(400).json({
        error: `Invalid stealth type. Valid types: ${Object.keys(FAKE_PAGES).join(', ')}`,
      });
    }

    res.type('html').send(page.body());
  } catch (err) {
    console.error('[STRATO] Stealth fake page error:', err.message);
    res.status(500).json({ error: 'Failed to generate stealth page' });
  }
});

// ── POST /api/stealth/auto — Returns config for auto-stealth behavior ──
router.post('/api/stealth/auto', (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { enabled, fakePage, keyBinding, hideOnBlur, panicKey } = req.body;

    const config = {
      enabled: enabled !== false,
      fakePage: fakePage || 'classroom',
      keyBinding: keyBinding || 'Escape',
      hideOnBlur: hideOnBlur !== false,
      panicKey: panicKey || '`',
      availablePages: Object.keys(FAKE_PAGES),
      behavior: {
        hideOnBlur: hideOnBlur !== false,
        blurReplaceDelay: 50,
        restoreOnFocus: true,
        changeTitleOnBlur: true,
        changeFaviconOnBlur: true,
        blurTitle: FAKE_PAGES[fakePage || 'classroom']?.title || 'Google Classroom',
        blurFavicon: 'https://www.google.com/favicon.ico',
      },
    };

    res.json(config);
  } catch (err) {
    console.error('[STRATO] Stealth auto config error:', err.message);
    res.status(500).json({ error: 'Failed to get stealth config' });
  }
});

// ── HTML escape utility ──
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export default router;
