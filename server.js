const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
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

// --- API Routes ---

// Get full state
app.get('/api/state', (req, res) => {
  res.json(loadData());
});

// --- Team ---
app.put('/api/team/:id/bot-name', (req, res) => {
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

// --- Intake Queue ---
app.post('/api/intake', (req, res) => {
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

app.delete('/api/intake/:id', (req, res) => {
  const data = loadData();
  data.intakeQueue = data.intakeQueue.filter(i => i.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.put('/api/intake/:id', (req, res) => {
  const data = loadData();
  const idx = data.intakeQueue.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.intakeQueue[idx] = { ...data.intakeQueue[idx], ...req.body };
  saveData(data);
  res.json(data.intakeQueue[idx]);
});

// --- Busy Bots (assign project to bot) ---
app.post('/api/busy', (req, res) => {
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

app.delete('/api/busy/:id', (req, res) => {
  const data = loadData();
  data.busyBots = data.busyBots.filter(b => b.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// --- Complete a project (move to Hall of Victory) ---
app.post('/api/complete/:busyId', (req, res) => {
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
app.get('/api/coalesce', (req, res) => {
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
app.get('/api/links', (req, res) => {
  res.json(loadData().links);
});

app.post('/api/links', (req, res) => {
  const data = loadData();
  const link = { id: uuidv4(), label: req.body.label, url: req.body.url, category: req.body.category || 'other' };
  data.links.push(link);
  saveData(data);
  res.json(link);
});

app.delete('/api/links/:id', (req, res) => {
  const data = loadData();
  data.links = data.links.filter(l => l.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// --- API Keys ---
app.get('/api/keys', (req, res) => {
  res.json(loadData().apiKeys);
});

app.post('/api/keys', (req, res) => {
  const data = loadData();
  const key = { id: uuidv4(), label: req.body.label, key: req.body.key, masked: true };
  data.apiKeys.push(key);
  saveData(data);
  res.json(key);
});

app.put('/api/keys/:id', (req, res) => {
  const data = loadData();
  const k = data.apiKeys.find(a => a.id === req.params.id);
  if (!k) return res.status(404).json({ error: 'Not found' });
  if (req.body.label) k.label = req.body.label;
  if (req.body.key) k.key = req.body.key;
  saveData(data);
  res.json(k);
});

app.delete('/api/keys/:id', (req, res) => {
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
