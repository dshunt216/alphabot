const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Data Layer ---
function getDefaultData() {
  return {
    team: [
      { id: uuidv4(), handler: 'Daniel', botName: "D'Vante", avatar: 'D' },
      { id: uuidv4(), handler: 'Austin', botName: "D'Angelo", avatar: 'A' },
      { id: uuidv4(), handler: 'Joe', botName: 'JoeB', avatar: 'J' },
      { id: uuidv4(), handler: 'Kenny', botName: 'MallCop', avatar: 'K' },
      { id: uuidv4(), handler: 'Dom', botName: 'Virgil Lablow', avatar: 'D' },
      { id: uuidv4(), handler: 'Nick', botName: 'Gibson', avatar: 'N' }
    ],
    users: [
      { id: uuidv4(), username: 'daniel', password: 'daniel123', handler: 'Daniel', role: 'admin' },
      { id: uuidv4(), username: 'austin', password: 'austin123', handler: 'Austin', role: 'member' },
      { id: uuidv4(), username: 'joe', password: 'joe123', handler: 'Joe', role: 'member' },
      { id: uuidv4(), username: 'kenny', password: 'kenny123', handler: 'Kenny', role: 'member' },
      { id: uuidv4(), username: 'dom', password: 'dom123', handler: 'Dom', role: 'member' },
      { id: uuidv4(), username: 'nick', password: 'nick123', handler: 'Nick', role: 'member' }
    ],
    intakeQueue: [],
    busyBots: [],
    hallOfVictory: [],
    links: [
      { id: uuidv4(), label: 'Team Google Drive', url: 'https://drive.google.com', category: 'drive' },
      { id: uuidv4(), label: 'Master Spreadsheet', url: 'https://docs.google.com/spreadsheets', category: 'spreadsheet' },
      { id: uuidv4(), label: 'Project Tracker Sheet', url: 'https://docs.google.com/spreadsheets', category: 'spreadsheet' }
    ],
    apiKeys: [
      { id: uuidv4(), label: 'OpenAI API Key', key: 'sk-xxxx...configure-me', masked: true },
      { id: uuidv4(), label: 'Anthropic API Key', key: 'sk-ant-xxxx...configure-me', masked: true },
      { id: uuidv4(), label: 'Google Sheets API Key', key: 'AIza...configure-me', masked: true }
    ]
  };
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      // Migration: add users array if missing (existing installs)
      if (!data.users) {
        data.users = [
          { id: uuidv4(), username: 'daniel', password: 'daniel123', handler: 'Daniel', role: 'admin' },
          { id: uuidv4(), username: 'austin', password: 'austin123', handler: 'Austin', role: 'member' },
          { id: uuidv4(), username: 'joe', password: 'joe123', handler: 'Joe', role: 'member' },
          { id: uuidv4(), username: 'kenny', password: 'kenny123', handler: 'Kenny', role: 'member' },
          { id: uuidv4(), username: 'dom', password: 'dom123', handler: 'Dom', role: 'member' },
          { id: uuidv4(), username: 'nick', password: 'nick123', handler: 'Nick', role: 'member' }
        ];
        saveData(data);
      }
      return data;
    }
  } catch (e) {
    console.error('Error loading data, resetting:', e.message);
  }
  const data = getDefaultData();
  saveData(data);
  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- Session Management ---
// In-memory sessions: { token: { userId, handler, role, createdAt } }
const sessions = {};

function authenticate(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }
  req.user = sessions[token];
  next();
}

// --- Auth Routes (no auth required) ---

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const data = loadData();
  const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  // Find their team member info
  const teamMember = data.team.find(t => t.handler === user.handler);
  const token = uuidv4();
  sessions[token] = {
    userId: user.id,
    handler: user.handler,
    role: user.role,
    teamId: teamMember?.id || null,
    createdAt: Date.now()
  };

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      handler: user.handler,
      role: user.role,
      teamId: teamMember?.id || null,
      photoUrl: teamMember?.photoUrl || null
    }
  });
});

// Verify session / get current user
app.get('/api/me', authenticate, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.userId);
  const teamMember = data.team.find(t => t.handler === req.user.handler);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({
    id: user.id,
    username: user.username,
    handler: user.handler,
    role: user.role,
    teamId: teamMember?.id || null,
    photoUrl: teamMember?.photoUrl || null
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token) delete sessions[token];
  res.json({ success: true });
});

// Change password
app.put('/api/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const data = loadData();
  const user = data.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.password !== currentPassword) return res.status(401).json({ error: 'Current password is incorrect' });

  user.password = newPassword;
  saveData(data);
  res.json({ success: true });
});

// --- Protected API Routes ---

// Get full state
app.get('/api/state', authenticate, (req, res) => {
  const data = loadData();
  // Don't send passwords to the client
  const safeData = { ...data };
  delete safeData.users;
  res.json(safeData);
});

// --- Team ---
app.put('/api/team/:id/bot-name', authenticate, (req, res) => {
  const data = loadData();
  const member = data.team.find(t => t.id === req.params.id);
  if (!member) return res.status(404).json({ error: 'Team member not found' });
  member.botName = req.body.botName;
  // Update references in busyBots and hallOfVictory
  data.busyBots.forEach(b => { if (b.teamId === req.params.id) b.botName = req.body.botName; });
  data.hallOfVictory.forEach(v => { if (v.teamId === req.params.id) v.botName = req.body.botName; });
  saveData(data);
  res.json(member);
});

// --- Profile Picture Upload ---
app.put('/api/team/:id/photo', authenticate, (req, res) => {
  const data = loadData();
  const member = data.team.find(t => t.id === req.params.id);
  if (!member) return res.status(404).json({ error: 'Team member not found' });
  // Expect base64 data URL in req.body.photo
  if (!req.body.photo) return res.status(400).json({ error: 'No photo provided' });
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const matches = req.body.photo.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
  if (!matches) return res.status(400).json({ error: 'Invalid image format' });
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const filename = `${req.params.id}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(matches[2], 'base64'));
  member.photoUrl = `/uploads/${filename}?t=${Date.now()}`;
  saveData(data);
  res.json(member);
});

// --- Intake Queue ---
app.post('/api/intake', authenticate, (req, res) => {
  const data = loadData();
  const item = {
    id: uuidv4(),
    title: req.body.title,
    description: req.body.description,
    category: req.body.category || 'general',
    submittedBy: req.body.submittedBy,
    submittedAt: new Date().toISOString(),
    priority: req.body.priority || 'medium',
    status: 'queued'
  };
  data.intakeQueue.push(item);
  saveData(data);
  res.json(item);
});

app.delete('/api/intake/:id', authenticate, (req, res) => {
  const data = loadData();
  data.intakeQueue = data.intakeQueue.filter(i => i.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.put('/api/intake/:id', authenticate, (req, res) => {
  const data = loadData();
  const idx = data.intakeQueue.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.intakeQueue[idx] = { ...data.intakeQueue[idx], ...req.body };
  saveData(data);
  res.json(data.intakeQueue[idx]);
});

// --- Busy Bots (assign project to bot) ---
app.post('/api/busy', authenticate, (req, res) => {
  const data = loadData();
  const member = data.team.find(t => t.id === req.body.teamId);
  if (!member) return res.status(404).json({ error: 'Team member not found' });
  // Remove from intake if provided
  if (req.body.intakeId) {
    data.intakeQueue = data.intakeQueue.filter(i => i.id !== req.body.intakeId);
  }
  const busy = {
    id: uuidv4(),
    teamId: member.id,
    handler: member.handler,
    botName: member.botName,
    projectTitle: req.body.projectTitle,
    projectDescription: req.body.projectDescription || '',
    startedAt: new Date().toISOString(),
    status: 'in-progress'
  };
  data.busyBots.push(busy);
  saveData(data);
  res.json(busy);
});

app.delete('/api/busy/:id', authenticate, (req, res) => {
  const data = loadData();
  data.busyBots = data.busyBots.filter(b => b.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// --- Complete a project (move to Hall of Victory) ---
app.post('/api/complete/:busyId', authenticate, (req, res) => {
  const data = loadData();
  const busyIdx = data.busyBots.findIndex(b => b.id === req.params.busyId);
  if (busyIdx === -1) return res.status(404).json({ error: 'Busy bot not found' });
  const busy = data.busyBots[busyIdx];
  const startTime = new Date(busy.startedAt).getTime();
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / 3600000);

  // Points system: base 100 + speed bonus
  let points = 100;
  if (hours < 1) points += 200;       // Lightning fast
  else if (hours < 24) points += 100;  // Same day
  else if (hours < 72) points += 50;   // Within 3 days

  // Awards
  const awards = [];
  if (hours < 1) awards.push('Lightning');
  if (hours < 24) awards.push('Same Day Ship');
  if (data.hallOfVictory.filter(v => v.teamId === busy.teamId).length === 0) awards.push('First Blood');
  if (data.hallOfVictory.filter(v => v.teamId === busy.teamId).length >= 4) awards.push('Veteran');
  if (data.hallOfVictory.filter(v => v.teamId === busy.teamId).length >= 9) awards.push('Legend');

  const victory = {
    id: uuidv4(),
    teamId: busy.teamId,
    handler: busy.handler,
    botName: busy.botName,
    projectTitle: busy.projectTitle,
    projectDescription: busy.projectDescription,
    startedAt: busy.startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: elapsed,
    points,
    awards
  };
  data.hallOfVictory.push(victory);
  data.busyBots.splice(busyIdx, 1);
  saveData(data);
  res.json(victory);
});

// --- Coalesce Recommendations ---
app.get('/api/coalesce', authenticate, (req, res) => {
  const data = loadData();
  const queue = data.intakeQueue;
  const busy = data.busyBots;
  const recommendations = [];

  // Keyword extraction helper
  function getKeywords(text) {
    const stop = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','is','it','that','this','as','be','are','was','were','been','has','have','had','do','does','did','will','would','could','should','can','may','i','we','they','he','she','my','our','their','his','her','its','not','no','so','if','up','out','all','just','also','want','need','create','build','make','app','interface','system','tool','new','get','use']);
    return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
  }

  // Compare intake items to each other
  for (let i = 0; i < queue.length; i++) {
    for (let j = i + 1; j < queue.length; j++) {
      const kw1 = getKeywords(queue[i].title + ' ' + queue[i].description);
      const kw2 = getKeywords(queue[j].title + ' ' + queue[j].description);
      const overlap = kw1.filter(w => kw2.includes(w));
      if (overlap.length >= 2) {
        recommendations.push({
          type: 'merge_queue',
          items: [queue[i], queue[j]],
          reason: `Both projects involve: ${[...new Set(overlap)].join(', ')}. Consider combining into one project.`,
          confidence: Math.min(overlap.length / Math.max(kw1.length, kw2.length, 1), 1)
        });
      }
    }
  }

  // Compare intake items to active projects
  for (const item of queue) {
    for (const b of busy) {
      const kw1 = getKeywords(item.title + ' ' + item.description);
      const kw2 = getKeywords(b.projectTitle + ' ' + (b.projectDescription || ''));
      const overlap = kw1.filter(w => kw2.includes(w));
      if (overlap.length >= 2) {
        recommendations.push({
          type: 'add_to_existing',
          intakeItem: item,
          existingProject: b,
          reason: `This intake request shares themes with "${b.projectTitle}" (already in progress by ${b.botName}): ${[...new Set(overlap)].join(', ')}. Consider adding as a feature.`,
          confidence: Math.min(overlap.length / Math.max(kw1.length, kw2.length, 1), 1)
        });
      }
    }
  }

  // Sort by confidence
  recommendations.sort((a, b) => b.confidence - a.confidence);
  res.json(recommendations);
});

// --- Links ---
app.get('/api/links', authenticate, (req, res) => {
  res.json(loadData().links);
});

app.post('/api/links', authenticate, (req, res) => {
  const data = loadData();
  const link = { id: uuidv4(), label: req.body.label, url: req.body.url, category: req.body.category || 'other' };
  data.links.push(link);
  saveData(data);
  res.json(link);
});

app.delete('/api/links/:id', authenticate, (req, res) => {
  const data = loadData();
  data.links = data.links.filter(l => l.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// --- API Keys ---
app.get('/api/keys', authenticate, (req, res) => {
  res.json(loadData().apiKeys);
});

app.post('/api/keys', authenticate, (req, res) => {
  const data = loadData();
  const key = { id: uuidv4(), label: req.body.label, key: req.body.key, masked: true };
  data.apiKeys.push(key);
  saveData(data);
  res.json(key);
});

app.put('/api/keys/:id', authenticate, (req, res) => {
  const data = loadData();
  const k = data.apiKeys.find(a => a.id === req.params.id);
  if (!k) return res.status(404).json({ error: 'Not found' });
  if (req.body.label) k.label = req.body.label;
  if (req.body.key) k.key = req.body.key;
  saveData(data);
  res.json(k);
});

app.delete('/api/keys/:id', authenticate, (req, res) => {
  const data = loadData();
  data.apiKeys = data.apiKeys.filter(k => k.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   🤖 ALPHABOT is live on port ${PORT}    ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
