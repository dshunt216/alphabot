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
    comments: {},
    notifications: {},
    botStatus: {},
    attachments: {},
    templates: [],
    mdFiles: [],
    prompts: [],
    activity: [],
    links: [],
    apiKeys: []
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
      if (!data.notifications) data.notifications = {};
      if (!data.botStatus) data.botStatus = {};
      if (!data.attachments) data.attachments = {};
      if (!data.templates) data.templates = [];
      if (!data.mdFiles) data.mdFiles = [];
      if (!data.prompts) data.prompts = [];
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

function addNotification(data, handler, message, icon, link) {
  if (!data.notifications[handler]) data.notifications[handler] = [];
  data.notifications[handler].unshift({
    id: uuidv4(), message, icon: icon || 'zap', read: false,
    createdAt: new Date().toISOString(), link: link || null
  });
  // Keep last 50 per user
  if (data.notifications[handler].length > 50) data.notifications[handler] = data.notifications[handler].slice(0, 50);
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
  // Notify all team members about new project
  data.team.forEach(t => {
    if (t.handler !== req.user.handler) {
      addNotification(data, t.handler, `${req.user.handler} submitted "${item.title}" to the queue`, 'inbox', 'dashboard');
    }
  });
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
  // Notify the assigned handler
  if (member.handler !== req.user.handler) {
    addNotification(data, member.handler, `${req.user.handler} assigned "${busy.projectTitle}" to ${member.botName}`, 'bot', 'busy');
  }
  // Notify everyone else
  data.team.forEach(t => {
    if (t.handler !== req.user.handler && t.handler !== member.handler) {
      addNotification(data, t.handler, `${member.botName} is now working on "${busy.projectTitle}"`, 'bot', 'busy');
    }
  });
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
  // Notify all team members about completion
  data.team.forEach(t => {
    if (t.handler !== req.user.handler) {
      addNotification(data, t.handler, `${busy.botName} completed "${busy.projectTitle}" (+${points} pts)!`, 'trophy', 'victory');
    }
  });
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
  // Notify project owner about the comment
  const pid = req.params.projectId;
  const proj = data.intakeQueue.find(i => i.id === pid) || data.busyBots.find(b => b.id === pid) || data.hallOfVictory.find(v => v.id === pid);
  if (proj) {
    const projHandler = proj.handler || proj.submittedBy;
    if (projHandler && projHandler !== req.user.handler) {
      addNotification(data, projHandler, `${req.user.handler} commented on "${proj.title || proj.projectTitle}"`, 'message', null);
    }
  }
  saveData(data);
  res.json(comment);
});

// --- Project Detail (lookup across all collections) ---
app.get('/api/project/:id', authenticate, (req, res) => {
  const data = loadData();
  const id = req.params.id;
  // Check intake
  let project = data.intakeQueue.find(i => i.id === id);
  if (project) return res.json({ ...project, _type: 'intake', _comments: data.comments[id] || [], _attachments: data.attachments[id] || [] });
  // Check busy
  project = data.busyBots.find(b => b.id === id);
  if (project) return res.json({ ...project, _type: 'busy', _comments: data.comments[id] || [], _attachments: data.attachments[id] || [] });
  // Check victory
  project = data.hallOfVictory.find(v => v.id === id);
  if (project) return res.json({ ...project, _type: 'victory', _comments: data.comments[id] || [], _attachments: data.attachments[id] || [] });
  return res.status(404).json({ error: 'Project not found' });
});

// --- Notifications ---
app.get('/api/notifications', authenticate, (req, res) => {
  const data = loadData();
  res.json(data.notifications[req.user.handler] || []);
});

app.post('/api/notifications/read', authenticate, (req, res) => {
  const data = loadData();
  const notifs = data.notifications[req.user.handler] || [];
  if (req.body.id) {
    const n = notifs.find(n => n.id === req.body.id);
    if (n) n.read = true;
  } else {
    notifs.forEach(n => n.read = true);
  }
  saveData(data);
  res.json({ success: true });
});

// --- Bot Status ---
app.get('/api/bot-status', authenticate, (req, res) => {
  const data = loadData();
  res.json(data.botStatus || {});
});

app.put('/api/bot-status/:teamId', authenticate, (req, res) => {
  const data = loadData();
  const member = data.team.find(t => t.id === req.params.teamId);
  if (!member) return res.status(404).json({ error: 'Team member not found' });
  data.botStatus[req.params.teamId] = {
    status: req.body.status || 'online',
    updatedAt: new Date().toISOString()
  };
  saveData(data);
  res.json(data.botStatus[req.params.teamId]);
});

// --- Attachments ---
app.get('/api/attachments/:projectId', authenticate, (req, res) => {
  const data = loadData();
  res.json(data.attachments[req.params.projectId] || []);
});

app.post('/api/attachments/:projectId', authenticate, (req, res) => {
  const data = loadData();
  if (!data.attachments[req.params.projectId]) data.attachments[req.params.projectId] = [];
  const att = {
    id: uuidv4(),
    name: req.body.name,
    url: req.body.url,
    type: req.body.type || 'link',
    size: req.body.size || null,
    addedBy: req.user.handler,
    addedAt: new Date().toISOString()
  };
  data.attachments[req.params.projectId].push(att);
  saveData(data);
  res.json(att);
});

app.delete('/api/attachments/:projectId/:attachmentId', authenticate, (req, res) => {
  const data = loadData();
  const list = data.attachments[req.params.projectId] || [];
  data.attachments[req.params.projectId] = list.filter(a => a.id !== req.params.attachmentId);
  saveData(data);
  res.json({ success: true });
});

// --- Templates ---
app.get('/api/templates', authenticate, (req, res) => {
  const data = loadData();
  res.json(data.templates || []);
});

app.post('/api/templates', authenticate, (req, res) => {
  const data = loadData();
  const template = {
    id: uuidv4(),
    name: req.body.name,
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || 'general',
    priority: req.body.priority || 'medium',
    createdBy: req.user.handler,
    createdAt: new Date().toISOString()
  };
  data.templates.push(template);
  saveData(data);
  res.json(template);
});

app.delete('/api/templates/:id', authenticate, (req, res) => {
  const data = loadData();
  data.templates = (data.templates || []).filter(t => t.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.post('/api/templates/:id/use', authenticate, (req, res) => {
  const data = loadData();
  const template = (data.templates || []).find(t => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const item = {
    id: uuidv4(),
    title: template.title,
    description: template.description,
    category: template.category,
    submittedBy: req.user.handler,
    submittedAt: new Date().toISOString(),
    priority: template.priority,
    status: 'queued',
    dueDate: req.body.dueDate || ''
  };
  data.intakeQueue.push(item);
  addActivity(data, 'project_submitted', { handler: req.user.handler, detail: `${item.title} (from template)` });
  data.team.forEach(t => {
    if (t.handler !== req.user.handler) {
      addNotification(data, t.handler, `${req.user.handler} created "${item.title}" from a template`, 'inbox', 'dashboard');
    }
  });
  saveData(data);
  res.json(item);
});

// --- MD Files Repository ---
app.get('/api/md-files', authenticate, (req, res) => {
  const data = loadData();
  res.json(data.mdFiles || []);
});

app.post('/api/md-files', authenticate, (req, res) => {
  const data = loadData();
  if (!data.mdFiles) data.mdFiles = [];
  const mdFile = {
    id: uuidv4(),
    name: req.body.name,
    content: req.body.content || '',
    description: req.body.description || '',
    uploadedBy: req.user.handler,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.mdFiles.push(mdFile);
  addActivity(data, 'md_file_added', { handler: req.user.handler, detail: mdFile.name });
  data.team.forEach(t => {
    if (t.handler !== req.user.handler) {
      addNotification(data, t.handler, `${req.user.handler} shared "${mdFile.name}" in the MD repository`, 'file', 'links');
    }
  });
  saveData(data);
  res.json(mdFile);
});

app.put('/api/md-files/:id', authenticate, (req, res) => {
  const data = loadData();
  const file = (data.mdFiles || []).find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (req.body.name) file.name = req.body.name;
  if (req.body.content !== undefined) file.content = req.body.content;
  if (req.body.description !== undefined) file.description = req.body.description;
  file.updatedAt = new Date().toISOString();
  saveData(data);
  res.json(file);
});

app.delete('/api/md-files/:id', authenticate, (req, res) => {
  const data = loadData();
  data.mdFiles = (data.mdFiles || []).filter(f => f.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// Download .md file
app.get('/api/md-files/:id/download', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
  if (!token || !sessions[token]) return res.status(401).json({ error: 'Not authenticated' });
  const data = loadData();
  const file = (data.mdFiles || []).find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  const filename = file.name.endsWith('.md') ? file.name : file.name + '.md';
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(file.content);
});

// --- Prompt Paste Board ---
app.get('/api/prompts', authenticate, (req, res) => {
  const data = loadData();
  res.json(data.prompts || []);
});

app.post('/api/prompts', authenticate, (req, res) => {
  const data = loadData();
  if (!data.prompts) data.prompts = [];
  const prompt = {
    id: uuidv4(),
    title: req.body.title,
    content: req.body.content,
    category: req.body.category || 'general',
    createdBy: req.user.handler,
    createdAt: new Date().toISOString()
  };
  data.prompts.push(prompt);
  addActivity(data, 'prompt_added', { handler: req.user.handler, detail: prompt.title });
  data.team.forEach(t => {
    if (t.handler !== req.user.handler) {
      addNotification(data, t.handler, `${req.user.handler} shared a prompt: "${prompt.title}"`, 'message', 'links');
    }
  });
  saveData(data);
  res.json(prompt);
});

app.put('/api/prompts/:id', authenticate, (req, res) => {
  const data = loadData();
  const prompt = (data.prompts || []).find(p => p.id === req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
  if (req.body.title) prompt.title = req.body.title;
  if (req.body.content !== undefined) prompt.content = req.body.content;
  if (req.body.category) prompt.category = req.body.category;
  saveData(data);
  res.json(prompt);
});

app.delete('/api/prompts/:id', authenticate, (req, res) => {
  const data = loadData();
  data.prompts = (data.prompts || []).filter(p => p.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// --- CSV Export (supports token as query param for direct download) ---
app.get('/api/export/csv', (req, res) => {
  // Allow auth via query param for direct browser download
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
  if (!token || !sessions[token]) return res.status(401).json({ error: 'Not authenticated' });
  const data = loadData();
  const type = req.query.type || 'all';

  function escapeCsv(val) {
    const s = String(val == null ? '' : val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  let csv = '';
  if (type === 'intake' || type === 'all') {
    csv += 'Section: Intake Queue\n';
    csv += 'Title,Category,Priority,Submitted By,Submitted At,Due Date,Status\n';
    data.intakeQueue.forEach(i => {
      csv += [i.title, i.category, i.priority, i.submittedBy, i.submittedAt, i.dueDate || '', i.status].map(escapeCsv).join(',') + '\n';
    });
    csv += '\n';
  }
  if (type === 'busy' || type === 'all') {
    csv += 'Section: Busy Bots\n';
    csv += 'Project,Handler,Bot,Started At,Due Date,Status\n';
    data.busyBots.forEach(b => {
      csv += [b.projectTitle, b.handler, b.botName, b.startedAt, b.dueDate || '', b.status].map(escapeCsv).join(',') + '\n';
    });
    csv += '\n';
  }
  if (type === 'victory' || type === 'all') {
    csv += 'Section: Hall of Victory\n';
    csv += 'Project,Handler,Bot,Started,Completed,Points,Awards,Deliverable URL,Notes\n';
    data.hallOfVictory.forEach(v => {
      csv += [v.projectTitle, v.handler, v.botName, v.startedAt, v.completedAt, v.points, v.awards.join('; '), v.deliverableUrl || '', v.completionNotes || ''].map(escapeCsv).join(',') + '\n';
    });
    csv += '\n';
  }
  if (type === 'team' || type === 'all') {
    csv += 'Section: Team\n';
    csv += 'Handler,Bot Name,Victories,Total Points\n';
    data.team.forEach(t => {
      const wins = data.hallOfVictory.filter(v => v.teamId === t.id).length;
      const pts = data.hallOfVictory.filter(v => v.teamId === t.id).reduce((s, v) => s + v.points, 0);
      csv += [t.handler, t.botName, wins, pts].map(escapeCsv).join(',') + '\n';
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=alphabot-export-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
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
