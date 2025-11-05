const API_BASE = '/api';

function toggleForm() {
  const auth = document.getElementById('authForm');
  const reg = document.getElementById('regForm');
  auth.style.display = auth.style.display === 'none' ? 'block' : 'none';
  reg.style.display = reg.style.display === 'none' ? 'block' : 'none';
}

async function login() {
  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;
  if (!login || !password) return alert('Заполните все поля');

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    const data = await res.json();
    if (data.error) return alert(data.error);

    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    window.location.href = `${data.role}.html`;
  } catch (err) {
    alert('Ошибка входа');
  }
}

async function register() {
  const login = document.getElementById('regLogin').value.trim();
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  if (!login || !password) return alert('Заполните все поля');

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password, role })
    });
    const data = await res.json();
    if (data.error) return alert(data.error);

    alert('Регистрация успешна! Войдите.');
    toggleForm();
  } catch (err) {
    alert('Ошибка регистрации');
  }
}

// Проверка при загрузке
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (token && role) {
    fetch(`${API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.role === role) {
        window.location.href = `${role}.html`;
      }
    })
    .catch(() => localStorage.clear());
  }
});