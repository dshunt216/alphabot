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
  // Generate stable team IDs so sample data can reference them
  const teamIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  const now = new Date();

  return {
    team: [
      { id: teamIds[0], handler: 'Daniel', botName: "D'Vante", avatar: 'D' },
      { id: teamIds[1], handler: 'Austin', botName: "D'Angelo", avatar: 'A' },
      { id: teamIds[2], handler: 'Joe', botName: 'JoeB', avatar: 'J' },
      { id: teamIds[3], handler: 'Kenny', botName: 'MallCop', avatar: 'K' },
      { id: teamIds[4], handler: 'Dom', botName: 'Virgil Lablow', avatar: 'D' },
      { id: teamIds[5], handler: 'Nick', botName: 'Gibson', avatar: 'N' }
    ],
    users: [
      { id: uuidv4(), username: 'daniel', password: 'daniel123', handler: 'Daniel', role: 'admin' },
      { id: uuidv4(), username: 'austin', password: 'austin123', handler: 'Austin', role: 'member' },
      { id: uuidv4(), username: 'joe', password: 'joe123', handler: 'Joe', role: 'member' },
      { id: uuidv4(), username: 'kenny', password: 'kenny123', handler: 'Kenny', role: 'member' },
      { id: uuidv4(), username: 'dom', password: 'dom123', handler: 'Dom', role: 'member' },
      { id: uuidv4(), username: 'nick', password: 'nick123', handler: 'Nick', role: 'member' }
    ],
    // --- SAMPLE DATA (clearly labeled) ---
    intakeQueue: [
      {
        id: uuidv4(), title: '[SAMPLE] Inventory Reorder Alert System',
        description: 'Automatically detect when warehouse inventory drops below threshold and send reorder alerts to the supplier portal. Needs SMS + email notifications.',
        category: 'automation', submittedBy: 'Daniel', submittedAt: new Date(now - 2 * 86400000).toISOString(), priority: 'high', status: 'queued',
        dueDate: new Date(now + 3 * 86400000).toISOString().split('T')[0]
      },
      {
        id: uuidv4(), title: '[SAMPLE] Supplier Price Comparison Dashboard',
        description: 'Pull pricing data from our top 5 suppliers and display a comparison dashboard. Track price history over time for inventory items.',
        category: 'data', submittedBy: 'Austin', submittedAt: new Date(now - 1 * 86400000).toISOString(), priority: 'medium', status: 'queued',
        dueDate: new Date(now + 7 * 86400000).toISOString().split('T')[0]
      },
      {
        id: uuidv4(), title: '[SAMPLE] Warehouse Barcode Scanner App',
        description: 'Mobile-friendly web app that uses the phone camera to scan product barcodes and update inventory counts in real time.',
        category: 'interface', submittedBy: 'Kenny', submittedAt: new Date(now - 12 * 3600000).toISOString(), priority: 'medium', status: 'queued',
        dueDate: new Date(now + 14 * 86400000).toISOString().split('T')[0]
      },
      {
        id: uuidv4(), title: '[SAMPLE] Customer Return Processing Workflow',
        description: 'Streamlined workflow for handling customer returns — auto-generate RMA numbers, update inventory, trigger refund process.',
        category: 'workflow', submittedBy: 'Dom', submittedAt: new Date(now - 6 * 3600000).toISOString(), priority: 'low', status: 'queued',
        dueDate: ''
      }
    ],
    busyBots: [
      {
        id: uuidv4(), teamId: teamIds[0], handler: 'Daniel', botName: "D'Vante",
        projectTitle: '[SAMPLE] Shipping Label Automation',
        projectDescription: 'Auto-generate shipping labels from order data, pull carrier rates from UPS/FedEx APIs, and batch print for warehouse crew.',
        startedAt: new Date(now - 4 * 3600000).toISOString(), status: 'in-progress',
        dueDate: new Date(now + 2 * 86400000).toISOString().split('T')[0]
      },
      {
        id: uuidv4(), teamId: teamIds[1], handler: 'Austin', botName: "D'Angelo",
        projectTitle: '[SAMPLE] Customer Order Tracking Portal',
        projectDescription: 'Self-service portal where wholesale customers can check their order status, view invoices, and see estimated delivery times.',
        startedAt: new Date(now - 18 * 3600000).toISOString(), status: 'in-progress',
        dueDate: new Date(now + 5 * 86400000).toISOString().split('T')[0]
      }
    ],
    hallOfVictory: [
      {
        id: uuidv4(), teamId: teamIds[2], handler: 'Joe', botName: 'JoeB',
        projectTitle: '[SAMPLE] Invoice PDF Generator',
        projectDescription: 'Generates branded PDF invoices from order data with line items, tax calculations, and payment terms.',
        startedAt: new Date(now - 5 * 86400000).toISOString(),
        completedAt: new Date(now - 3 * 86400000).toISOString(),
        elapsedMs: 2 * 86400000, points: 150, awards: ['Same Day Ship'],
        deliverableUrl: 'https://github.com/example/invoice-generator',
        completionNotes: '[SAMPLE] Built with Node.js + PDFKit. Pulls order data from the master spreadsheet API.'
      },
      {
        id: uuidv4(), teamId: teamIds[3], handler: 'Kenny', botName: 'MallCop',
        projectTitle: '[SAMPLE] Product Catalog Sync',
        projectDescription: 'Syncs product catalog between Shopify storefront and internal inventory database every 15 minutes.',
        startedAt: new Date(now - 7 * 86400000).toISOString(),
        completedAt: new Date(now - 5 * 86400000).toISOString(),
        elapsedMs: 2 * 86400000, points: 150, awards: ['First Blood'],
        deliverableUrl: 'https://github.com/example/catalog-sync',
        completionNotes: '[SAMPLE] Cron job runs every 15min. Handles SKU mapping and price updates. Dashboard at /admin/sync-status.'
      },
      {
        id: uuidv4(), teamId: teamIds[5], handler: 'Nick', botName: 'Gibson',
        projectTitle: '[SAMPLE] Daily Sales Report Email',
        projectDescription: 'Automated daily email to management with sales totals, top products, and inventory warnings.',
        startedAt: new Date(now - 4 * 86400000).toISOString(),
        completedAt: new Date(now - 3.5 * 86400000).toISOString(),
        elapsedMs: 12 * 3600000, points: 200, awards: ['Same Day Ship'],
        deliverableUrl: 'https://github.com/example/daily-report',
        completionNotes: '[SAMPLE] Sends at 7am EST via SendGrid. Pulls from Postgres sales table.'
      }
    ],
    comments: {},
    activity: [
      { id: uuidv4(), type: 'project_submitted', handler: 'Daniel', detail: '[SAMPLE] Inventory Reorder Alert System', timestamp: new Date(now - 2 * 86400000).toISOString() },
      { id: uuidv4(), type: 'project_submitted', handler: 'Austin', detail: '[SAMPLE] Supplier Price Comparison Dashboard', timestamp: new Date(now - 1 * 86400000).toISOString() },
      { id: uuidv4(), type: 'bot_assigned', handler: 'Daniel', botName: "D'Vante", detail: '[SAMPLE] Shipping Label Automation', timestamp: new Date(now - 4 * 3600000).toISOString() },
      { id: uuidv4(), type: 'bot_assigned', handler: 'Austin', botName: "D'Angelo", detail: '[SAMPLE] Customer Order Tracking Portal', timestamp: new Date(now - 18 * 3600000).toISOString() },
      { id: uuidv4(), type: 'project_completed', handler: 'Nick', botName: 'Gibson', detail: '[SAMPLE] Daily Sales Report Email', points: 200, timestamp: new Date(now - 3.5 * 86400000).toISOString() },
      { id: uuidv4(), type: 'project_completed', handler: 'Kenny', botName: 'MallCop', detail: '[SAMPLE] Product Catalog Sync', points: 150, timestamp: new Date(now - 5 * 86400000).toISOString() },
      { id: uuidv4(), type: 'project_completed', handler: 'Joe', botName: 'JoeB', detail: '[SAMPLE] Invoice PDF Generator', points: 150, timestamp: new Date(now - 3 * 86400000).toISOString() },
    ],
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
      // Migrations for existing installs
      if (!data.users) {
        data.users = [
          { id: uuidv4(), username: 'daniel', password: 'daniel123', handler: 'Daniel', role: 'admin' },
          { id: uuidv4(), username: 'austin', password: 'austin123', handler: 'Austin', role: 'member' },
          { id: uuidv4(), username: 'joe', password: 'joe123', handler: 'Joe', role: 'member' },
          { id: uuidv4(), username: 'kenny', password: 'kenny123', handler: 'Kenny', role: 'member' },
          { id: uuidv4(), username: 'dom', password: 'dom123', handler: 'Dom', role: 'member' },
          { id: uuidv4(), username: 'nick', password: 'nick123', handler: 'Nick', role: 'member' }
        ];
      }
      if (!data.activity) data.activity = [];
      if (!data.comments) data.comments = {};
      saveData(data);
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

function addActivity(data, type, info) {
  data.activity.unshift({ id: uuidv4(), type, ...info, timestamp: new Date().toISOString() });
  // Keep last 100 entries
  if (data.activity.length > 100) data.activity = data.activity.slice(0, 100);
}

// --- Session Management ---
const sessions = {};

function authenticate(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }
  req.user = sessions[token];
  next();
}

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const data = loadData();
  const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const teamMember = data.team.find(t => t.handler === user.handler);
  const token = uuidv4();
  sessions[token] = { userId: user.id, handler: user.handler, role: user.role, teamId: teamMember?.id || null, createdAt: Date.now() };
  res.json({ token, user: { id: user.id, username: user.username, handler: user.handler, role: user.role, teamId: teamMember?.id || null, photoUrl: teamMember?.photoUrl || null } });
});

app.get('/api/me', authenticate, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.userId);
  const teamMember = data.team.find(t => t.handler === req.user.handler);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, handler: user.handler, role: user.role, teamId: teamMember?.id || null, photoUrl: teamMember?.photoUrl || null });
});

app.post('/api/logout', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token) delete sessions[token];
  res.json({ success: true });
});

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

// --- Protected Routes ---

// Get full state (includes activity now)
app.get('/api/state', authenticate, (req, res) => {
  const data = loadData();
  const safeData = { ...data };
  delete safeData.users;
  res.json(safeData);
});

// --- Team ---
app.put('/api/team/:id/bot-name', authenticate, (req, res) => {
  const data = loadData();
  const member = data.team.find(t => t.id === req.params.id);
  if (!member) return res.status(404).json({ error: 'Team member not found' });
  const oldName = member.botName;
  member.botName = req.body.botName;
  data.busyBots.forEach(b => { if (b.teamId === req.params.id) b.botName = req.body.botName; });
  data.hallOfVictory.forEach(v => { if (v.teamId === req.params.id) v.botName = req.body.botName; });
  addActivity(data, 'bot_renamed', { handler: member.handler, detail: `${oldName} → ${req.body.botName}` });
  saveData(data);
  res.json(member);
});

app.put('/api/team/:id/photo', authenticate, (req, res) => {
  const data = loadData();
  const member = data.team.find(t => t.id === req.params.id);
  if (!member) return res.status(404).json({ error: 'Team member not found' });
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
    submittedBy: req.body.submittedBy || req.user.handler,
    submittedAt: new Date().toISOString(),
    priority: req.body.priority || 'medium',
    status: 'queued',
    dueDate: req.body.dueDate || ''
  };
  data.intakeQueue.push(item);
  addActivity(data, 'project_submitted', { handler: req.user.handler, detail: item.title });
  saveData(data);
  res.json(item);
});

app.delete('/api/intake/:id', authenticate, (req, res) => {
  const data = loadData();
  const item = data.intakeQueue.find(i => i.id === req.params.id);
  if (item) addActivity(data, 'project_removed', { handler: req.user.handler, detail: item.title });
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

// --- Busy Bots ---
app.post('/api/busy', authenticate, (req, res) => {
  const data = loadData();
  const member = data.team.find(t => t.id === req.body.teamId);
  if (!member) return res.status(404).json({ error: 'Team member not found' });
  let intakeItem = null;
  if (req.body.intakeId) {
    intakeItem = data.intakeQueue.find(i => i.id === req.body.intakeId);
    data.intakeQueue = data.intakeQueue.filter(i => i.id !== req.body.intakeId);
  }
  const busy = {
    id: uuidv4(), teamId: member.id, handler: member.handler, botName: member.botName,
    projectTitle: req.body.projectTitle, projectDescription: req.body.projectDescription || '',
    startedAt: new Date().toISOString(), status: 'in-progress',
    dueDate: req.body.dueDate || intakeItem?.dueDate || ''
  };
  data.busyBots.push(busy);
  addActivity(data, 'bot_assigned', { handler: member.handler, botName: member.botName, detail: busy.projectTitle });
  saveData(data);
  res.json(busy);
});

app.delete('/api/busy/:id', authenticate, (req, res) => {
  const data = loadData();
  const bot = data.busyBots.find(b => b.id === req.params.id);
  if (bot) addActivity(data, 'bot_unassigned', { handler: bot.handler, botName: bot.botName, detail: bot.projectTitle });
  data.busyBots = data.busyBots.filter(b => b.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// --- Complete a project ---
app.post('/api/complete/:busyId', authenticate, (req, res) => {
  const data = loadData();
  const busyIdx = data.busyBots.findIndex(b => b.id === req.params.busyId);
  if (busyIdx === -1) return res.status(404).json({ error: 'Busy bot not found' });
  const busy = data.busyBots[busyIdx];
  const elapsed = Date.now() - new Date(busy.startedAt).getTime();
  const hours = Math.floor(elapsed / 3600000);

  let points = 100;
  if (hours < 1) points += 200;
  else if (hours < 24) points += 100;
  else if (hours < 72) points += 50;

  const awards = [];
  if (hours < 1) awards.push('Lightning');
  if (hours < 24) awards.push('Same Day Ship');
  if (data.hallOfVictory.filter(v => v.teamId === busy.teamId).length === 0) awards.push('First Blood');
  if (data.hallOfVictory.filter(v => v.teamId === busy.teamId).length >= 4) awards.push('Veteran');
  if (data.hallOfVictory.filter(v => v.teamId === busy.teamId).length >= 9) awards.push('Legend');

  const victory = {
    id: uuidv4(), teamId: busy.teamId, handler: busy.handler, botName: busy.botName,
    projectTitle: busy.projectTitle, projectDescription: busy.projectDescription,
    startedAt: busy.startedAt, completedAt: new Date().toISOString(),
    elapsedMs: elapsed, points, awards,
    deliverableUrl: req.body.deliverableUrl || '',
    completionNotes: req.body.completionNotes || ''
  };
  data.hallOfVictory.push(victory);
  data.busyBots.splice(busyIdx, 1);
  addActivity(data, 'project_completed', { handler: busy.handler, botName: busy.botName, detail: busy.projectTitle, points });
  saveData(data);
  res.json(victory);
});

// --- Coalesce ---
app.get('/api/coalesce', authenticate, (req, res) => {
  const data = loadData();
  const queue = data.intakeQueue;
  const busy = data.busyBots;
  const recommendations = [];

  function getKeywords(text) {
    const stop = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','is','it','that','this','as','be','are','was','were','been','has','have','had','do','does','did','will','would','could','should','can','may','i','we','they','he','she','my','our','their','his','her','its','not','no','so','if','up','out','all','just','also','want','need','create','build','make','app','interface','system','tool','new','get','use','sample']);
    return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
  }

  for (let i = 0; i < queue.length; i++) {
    for (let j = i + 1; j < queue.length; j++) {
      const kw1 = getKeywords(queue[i].title + ' ' + queue[i].description);
      const kw2 = getKeywords(queue[j].title + ' ' + queue[j].description);
      const overlap = kw1.filter(w => kw2.includes(w));
      if (overlap.length >= 2) {
        recommendations.push({
          type: 'merge_queue', items: [queue[i], queue[j]],
          reason: `Both projects involve: ${[...new Set(overlap)].join(', ')}. Consider combining into one project.`,
          confidence: Math.min(overlap.length / Math.max(kw1.length, kw2.length, 1), 1)
        });
      }
    }
  }
  for (const item of queue) {
    for (const b of busy) {
      const kw1 = getKeywords(item.title + ' ' + item.description);
      const kw2 = getKeywords(b.projectTitle + ' ' + (b.projectDescription || ''));
      const overlap = kw1.filter(w => kw2.includes(w));
      if (overlap.length >= 2) {
        recommendations.push({
          type: 'add_to_existing', intakeItem: item, existingProject: b,
          reason: `This intake request shares themes with "${b.projectTitle}" (already in progress by ${b.botName}): ${[...new Set(overlap)].join(', ')}. Consider adding as a feature.`,
          confidence: Math.min(overlap.length / Math.max(kw1.length, kw2.length, 1), 1)
        });
      }
    }
  }
  recommendations.sort((a, b) => b.confidence - a.confidence);
  res.json(recommendations);
});

// --- Links ---
app.get('/api/links', authenticate, (req, res) => { res.json(loadData().links); });
app.post('/api/links', authenticate, (req, res) => {
  const data = loadData();
  const link = { id: uuidv4(), label: req.body.label, url: req.body.url, category: req.body.category || 'other' };
  data.links.push(link);
  addActivity(data, 'link_added', { handler: req.user.handler, detail: link.label });
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
app.get('/api/keys', authenticate, (req, res) => { res.json(loadData().apiKeys); });
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

// --- Comments ---
app.get('/api/comments/:projectId', authenticate, (req, res) => {
  const data = loadData();
  res.json(data.comments[req.params.projectId] || []);
});

app.post('/api/comments/:projectId', authenticate, (req, res) => {
  const data = loadData();
  if (!data.comments[req.params.projectId]) data.comments[req.params.projectId] = [];
  const comment = {
    id: uuidv4(),
    author: req.user.handler,
    text: req.body.text,
    createdAt: new Date().toISOString()
  };
  data.comments[req.params.projectId].push(comment);
  saveData(data);
  res.json(comment);
});

// --- Project Detail (lookup across all collections) ---
app.get('/api/project/:id', authenticate, (req, res) => {
  const data = loadData();
  const id = req.params.id;
  // Check intake
  let project = data.intakeQueue.find(i => i.id === id);
  if (project) return res.json({ ...project, _type: 'intake', _comments: data.comments[id] || [] });
  // Check busy
  project = data.busyBots.find(b => b.id === id);
  if (project) return res.json({ ...project, _type: 'busy', _comments: data.comments[id] || [] });
  // Check victory
  project = data.hallOfVictory.find(v => v.id === id);
  if (project) return res.json({ ...project, _type: 'victory', _comments: data.comments[id] || [] });
  return res.status(404).json({ error: 'Project not found' });
});

// --- Search ---
app.get('/api/search', authenticate, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ results: [] });
  const data = loadData();
  const results = [];
  // Search intake queue
  data.intakeQueue.forEach(item => {
    if ((item.title + ' ' + item.description + ' ' + item.submittedBy).toLowerCase().includes(q)) {
      results.push({ type: 'intake', id: item.id, title: item.title, subtitle: `Queued by ${item.submittedBy}`, page: 'dashboard' });
    }
  });
  // Search busy bots
  data.busyBots.forEach(b => {
    if ((b.projectTitle + ' ' + b.projectDescription + ' ' + b.handler + ' ' + b.botName).toLowerCase().includes(q)) {
      results.push({ type: 'busy', id: b.id, title: b.projectTitle, subtitle: `${b.botName} (${b.handler}) — In Progress`, page: 'busy' });
    }
  });
  // Search hall of victory
  data.hallOfVictory.forEach(v => {
    if ((v.projectTitle + ' ' + (v.projectDescription || '') + ' ' + v.handler + ' ' + v.botName + ' ' + (v.completionNotes || '')).toLowerCase().includes(q)) {
      results.push({ type: 'victory', id: v.id, title: v.projectTitle, subtitle: `Completed by ${v.botName} (${v.handler})`, page: 'victory' });
    }
  });
  // Search team
  data.team.forEach(t => {
    if ((t.handler + ' ' + t.botName).toLowerCase().includes(q)) {
      results.push({ type: 'team', id: t.id, title: t.handler, subtitle: `Bot: ${t.botName}`, page: 'team' });
    }
  });
  res.json({ results: results.slice(0, 15) });
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
