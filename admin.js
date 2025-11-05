// admin.js
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

const API_BASE = '/api';

// === Загрузка врачей ===
async function loadDoctors() {
  try {
    const res = await fetch(`${API_BASE}/doctors`, { headers });
    const doctors = await res.json();
    const tbody = document.querySelector("#doctorsTable tbody");
    tbody.innerHTML = "";

    doctors.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.name}</td>
        <td>${d.specialization}</td>
        <td>
          <button class="btn-delete" onclick="deleteDoctor(${d.id})">
            <i class="fas fa-trash"></i> Удалить
          </button>
        </td>`;
      tbody.appendChild(tr);
    });

    // Заполняем фильтр врачей
    const select = document.getElementById("filterDoctor");
    select.innerHTML = `<option value="">Все врачи</option>`;
    doctors.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      select.appendChild(opt);
    });
  } catch (err) {
    alert("Ошибка загрузки врачей");
  }
}

// === Удаление врача ===
async function deleteDoctor(id) {
  if (!confirm("Удалить врача?")) return;
  try {
    await fetch(`${API_BASE}/doctors/${id}`, {
      method: 'DELETE',
      headers
    });
    loadDoctors();
  } catch (err) {
    alert("Ошибка удаления");
  }
}

// === Добавление врача ===
function openDoctorModal() {
  document.getElementById("doctorModal").style.display = "flex";
}

function closeDoctorModal() {
  document.getElementById("doctorModal").style.display = "none";
}

async function saveDoctor() {
  const name = document.getElementById("newDoctorName").value.trim();
  const spec = document.getElementById("newDoctorSpec").value.trim();
  if (!name || !spec) return alert("Заполните все поля");

  try {
    await fetch(`${API_BASE}/doctors`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, specialization: spec })
    });
    closeDoctorModal();
    loadDoctors();
    document.getElementById("newDoctorName").value = "";
    document.getElementById("newDoctorSpec").value = "";
  } catch (err) {
    alert("Ошибка добавления");
  }
}

// === Фильтры ===
document.getElementById("applyFilters").onclick = () => {
  const status = document.getElementById("filterStatus").value;
  const doctor = document.getElementById("filterDoctor").value;
  const priority = document.getElementById("filterPriority").value;
  const type = document.getElementById("filterType").value;

  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (doctor) params.append("doctor_id", doctor);
  if (priority) params.append("priority", priority);
  if (type) params.append("type", type);

  loadAppeals(params.toString());
};

// === Загрузка обращений (с фильтрами) ===
async function loadAppeals(filter = "") {
  try {
    const res = await fetch(`${API_BASE}/appeals${filter ? `?${filter}` : ''}`, { headers });
    const appeals = await res.json();
    // Здесь будет таблица обращений (если нужно)
    console.log(appeals);
  } catch (err) {
    console.error(err);
  }
}

// === Кнопки ===
document.getElementById("addDoctorBtn").onclick = openDoctorModal;
document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Выйти?")) {
    localStorage.clear();
    window.location.href = "index.html";
  }
};

// === Тема ===
document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("dark");
  const btn = document.getElementById("themeToggle");
  btn.textContent = document.body.classList.contains("dark") ? "Светлая тема" : "Тёмная тема";
  localStorage.setItem('theme', document.body.classList.contains("dark") ? 'dark' : 'light');
};

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add("dark");
  document.getElementById("themeToggle").textContent = "Светлая тема";
}

// === Инициализация ===
loadDoctors();
loadAppeals();