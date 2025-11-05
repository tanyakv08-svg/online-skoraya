// patient.js
const API_BASE = '/api';

const token = localStorage.getItem('token');
if (!token) {
  alert("Необходимо войти в систему");
  window.location.href = 'index.html';
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// === Отправка обращения ===
document.getElementById("appealForm").addEventListener("submit", async e => {
  e.preventDefault();

  const formData = {
    fio: document.getElementById("fio").value.trim(),
    age: parseInt(document.getElementById("age").value),
    location: document.getElementById("location").value.trim(),
    chronic: document.getElementById("chronic").value.trim(),
    symptoms: document.getElementById("symptoms").value.trim()
  };

  if (!formData.fio || !formData.age || !formData.symptoms) {
    alert("Заполните ФИО, возраст и симптомы");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/appeals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Ошибка сервера");
    }

    alert("Обращение отправлено!");
    e.target.reset();
    renderMyAppeals();
  } catch (err) {
    alert("Ошибка: " + err.message);
  }
});

// === Мои обращения ===
async function renderMyAppeals() {
  try {
    const meRes = await fetch(`${API_BASE}/me`, { headers });
    const user = await meRes.json();
    const myId = user.id;

    const appealsRes = await fetch(`${API_BASE}/appeals`, { headers });
    const allAppeals = await appealsRes.json();

    const myAppeals = allAppeals.filter(a => a.patient_id === myId);

    const tbody = document.querySelector("#appealsTable tbody");
    tbody.innerHTML = "";

    if (myAppeals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">У вас нет обращений</td></tr>`;
      return;
    }

    myAppeals.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.id}</td>
        <td>${a.date}</td>
        <td>${a.symptoms}</td>
        <td><span class="status ${a.status}">${getStatusText(a.status)}</span></td>
        <td><span class="priority ${a.priority}">${getPriorityText(a.priority)}</span></td>
        <td>${a.type || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    document.querySelector("#appealsTable tbody").innerHTML = 
      `<tr><td colspan="6">Ошибка загрузки</td></tr>`;
  }
}

function getStatusText(s) {
  return s === "new" ? "Новое" : 
         s === "in-progress" ? "В работе" : 
         "Завершено";
}

function getPriorityText(p) {
  return p === 'high' ? 'Высокий' : 
         p === 'medium' ? 'Средний' : 
         p === 'low' ? 'Низкий' : '-';
}

// === Тема ===
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const btn = document.getElementById("themeToggle");
  btn.textContent = document.body.classList.contains("dark") ? "Светлая тема" : "Тёмная тема";
});

// === Выход ===
document.getElementById("logoutBtn").addEventListener("click", () => {
  if (confirm("Выйти?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "index.html";
  }
});

renderMyAppeals();