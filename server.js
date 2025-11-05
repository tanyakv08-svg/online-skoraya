// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET = 'medmarshrout_secret_key_2025';

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const db = new sqlite3.Database('db.sqlite', (err) => {
  if (err) console.error('DB Error:', err);
  else console.log('DB connected');
});

// === Создание таблиц ===
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
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
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});