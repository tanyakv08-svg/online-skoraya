// doctor.js
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

const API_BASE = '/api';

async function renderDoctorTable() {
  try {
    const response = await fetch(`${API_BASE}/appeals?status=new`, { headers });
    const appeals = await response.json();
    const tbody = document.querySelector("#doctorTable tbody");
    tbody.innerHTML = "";
    
    if (appeals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">Нет обращений</td></tr>`;
      return;
    }

    appeals.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.id}</td>
        <td>${a.fio}</td>
        <td>${a.symptoms}</td>
        <td><span class="status ${a.status}">${getStatusText(a.status)}</span></td>
        <td><span class="priority ${a.priority}">${getPriorityText(a.priority)}</span></td>
        <td>${a.type || '-'}</td>
        <td>
          ${a.status === "new" ? `<button onclick="takeInWork('${a.id}')">Взять</button>` :
           a.status === "in-progress" ? `<button onclick="completeAppeal('${a.id}')">Завершить</button>` : "-"}
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Ошибка загрузки:', err);
  }
}

async function takeInWork(id) {
  try {
    await fetch(`${API_BASE}/appeals/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'in-progress' })
    });
    renderDoctorTable();
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

async function completeAppeal(id) {
  try {
    await fetch(`${API_BASE}/appeals/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'done' })
    });
    renderDoctorTable();
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

function getStatusText(status) {
  return status === "new" ? "Новое" : status === "in-progress" ? "В работе" : "Завершено";
}

function getPriorityText(p) {
  return p === 'high' ? 'Высокий' : 
         p === 'medium' ? 'Средний' : 
         p === 'low' ? 'Низкий' : '-';
}

// === Тема ===
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeToggle.textContent = document.body.classList.contains("dark") ? "Светлая тема" : "Тёмная тема";
});

// === Выход ===
document.getElementById("logoutBtn").addEventListener("click", () => {
  if (confirm("Выйти из системы?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "index.html";
  }
});

renderDoctorTable();