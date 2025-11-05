import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// --- SQLite (создаётся автоматически в ./data/app.sqlite) ---
let db;
async function initDb() {
  db = await open({
    filename: './data/app.sqlite',
    driver: sqlite3.Database
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('SQLite ready');
}

// --- Healthcheck ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// --- Demo register ---
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });
    const hash = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (email, password_hash) VALUES (?,?)', [email, hash]);
    res.json({ ok: true });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'email exists' });
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// --- Demo login ---
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const row = await db.get('SELECT * FROM users WHERE email=?', [email]);
    if (!row) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ sub: row.id, email }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

// --- Secure route ---
function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'no token' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

app.get('/secure/profile', auth, async (req, res) => {
  const row = await db.get('SELECT id, email, created_at FROM users WHERE id=?', [req.user.sub]);
  res.json({ user: row });
});

// --- Start ---
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});