/// server.js
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Настройка Express
const app = express();
const PORT = process.env.PORT || 0; // 0 = попросить ОС дать свободный порт
const server = app.listen(PORT, () => {
  const { port } = server.address();
console.log('Server listening on http://localhost:' + port);

});

app.use(cors());
app.use(express.json());
// --- Автосоздание пользователей при первом запуске ---
const bcrypt = require('bcrypt');

app.get('/api/seed', async (req, res) => {
  if (!process.env.SEED_KEY || req.query.key !== process.env.SEED_KEY) {
    return res.status(403).json({ error: 'forbidden' });
  }

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS appeals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fio TEXT, age INTEGER, location TEXT, chronic TEXT, symptoms TEXT,
      priority TEXT, type TEXT, date TEXT, status TEXT DEFAULT 'new'
    )`);
  });

  const upsertUser = (username, password, role) => new Promise(async (resolve) => {
    db.get('SELECT id FROM users WHERE username=?', [username], async (err, row) => {
      if (err) return resolve({ user: username, created: false, error: String(err) });
      if (row) return resolve({ user: username, created: false, note: 'exists' });
      const hash = await bcrypt.hash(password, 10);
      db.run('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)',
        [username, hash, role],
        (e) => resolve({ user: username, created: !e, error: e ? String(e) : null })
      );
    });
  });

  const results = [];
  results.push(await upsertUser('admin', 'admin123', 'admin'));
  results.push(await upsertUser('tanya', '123456', 'patient'));

  res.json({ ok: true, results });
});
// Раздача статических файлов (HTML, CSS, JS)
app.use(express.static(__dirname));
const page = (name) => (req, res) =>
  res.sendFile(path.join(__dirname, name));

app.get('/index.html',   page('index.html'));
app.get('/patient.html', page('patient.html'));
app.get('/admin.html',   page('admin.html'));
app.get('/doctor.html',  page('doctor.html'));

// Чтобы при открытии http://localhost:56578 загружался index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Подключение БД
const db = new sqlite3.Database('db.sqlite', (err) => {
  if (err) console.error('DB Error:', err);
  else console.log('DB connected');
});

// === Создание таблиц ===
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,ы
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    fio TEXT,
    age INTEGER,
    location TEXT,
    chronic TEXT,
    symptoms TEXT,
    status TEXT DEFAULT 'new',
    priority TEXT,
    type TEXT,
    date TEXT
  )`);
});

// === Middleware ===
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен отсутствует' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

// === Приоритет и тип ===
function calculatePriorityAndType({ age, chronic, symptoms }) {
  let priority = 'low';
  let type = 'плановый';

  const high = ['боль в груди', 'одышка', 'потеря сознания', 'кровь', 'судороги', 'инфаркт', 'инсульт'];
  const medium = ['температура', 'тошнота', 'рвота', 'диарея', 'сильная боль', 'головокружение'];

  const s = symptoms.toLowerCase();
  const hasHigh = high.some(w => s.includes(w));
  const hasMedium = medium.some(w => s.includes(w));
  const hasChronic = chronic && chronic.trim() !== '';

  if (age >= 65 || hasHigh || (hasChronic && hasMedium)) {
    priority = 'high'; type = 'срочный';
  } else if (hasMedium || hasChronic) {
    priority = 'medium'; type = 'первоочередной';
  }
  return { priority, type };
}

// === API ===

// Регистрация
app.post('/api/register', async (req, res) => {
  const { login, password, role } = req.body;
  if (!login || !password || !['patient', 'doctor'].includes(role)) {
    return res.status(400).json({ error: 'Неверные данные' });
  }
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (login, password, role) VALUES (?, ?, ?)', [login, hash, role], function(err) {
    if (err) return res.status(400).json({ error: 'Логин занят' });
    res.json({ message: 'Успешно' });
  });
});

// Вход
app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  db.get('SELECT * FROM users WHERE login = ?', [login], async (err, user) => {
    if (err || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '24h' });
    res.json({ token, role: user.role });
  });
});

// Создать обращение
app.post('/api/appeals', authenticate, (req, res) => {
  const { fio, age, location, chronic, symptoms } = req.body;
  if (!fio || !age || !symptoms) return res.status(400).json({ error: 'Заполните обязательные поля' });

  const { priority, type } = calculatePriorityAndType({ age, chronic: chronic || '', symptoms });
  const date = new Date().toLocaleString('ru');

  db.run(
    `INSERT INTO appeals (patient_id, fio, age, location, chronic, symptoms, priority, type, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, fio, age, location || null, chronic || null, symptoms, priority, type, date],
    function(err) {
      if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
      res.json({ id: this.lastID });
    }
  );
});

// Получить обращения (с фильтром по status)
app.get('/api/appeals', authenticate, (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM appeals';
  const params = [];

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY date DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Обновить статус
app.put('/api/appeals/:id', authenticate, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Укажите статус' });

  db.run('UPDATE appeals SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json({ success: true });
  });
});

// Главная
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск
