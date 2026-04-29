import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDMpMpNWcrUHPTnzsaBUXvvRDjvOjNMWCI",
  authDomain: "awis-plan-tracker.firebaseapp.com",
  databaseURL: "https://awis-plan-tracker-default-rtdb.firebaseio.com/",
  projectId: "awis-plan-tracker",
  storageBucket: "awis-plan-tracker.firebasestorage.app",
  messagingSenderId: "466067892011",
  appId: "1:466067892011:web:19da867d5fa928228b076e",
  measurementId: "G-N4103D0M28",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);


const state = {
  ideas: [],
  plans: [],
};

const ideaForm = document.getElementById("ideaForm");
const planForm = document.getElementById("planForm");
const ideasList = document.getElementById("ideasList");
const plansList = document.getElementById("plansList");
const ideasCount = document.getElementById("ideasCount");
const plansCount = document.getElementById("plansCount");
const confirmedCount = document.getElementById("confirmedCount");
const emptyStateTemplate = document.getElementById("emptyState");
const syncMessage = document.getElementById("syncMessage");

const ideasRef = ref(database, "ideas");
const plansRef = ref(database, "plans");

ideaForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("ideaTitle").value.trim();
  const note = document.getElementById("ideaNote").value.trim();

  if (!title) {
    return;
  }

  const newIdeaRef = push(ideasRef);
  try {
    await set(newIdeaRef, {
      title,
      note,
    });
    ideaForm.reset();
  } catch (error) {
    console.error(error);
    setSyncState("error", "No pude guardar esta idea en Firebase.");
  }
});

planForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("planTitle").value.trim();
  const date = document.getElementById("planDate").value;
  const time = document.getElementById("planTime").value;
  const status = document.querySelector('input[name="status"]:checked').value;
  const note = document.getElementById("planNote").value.trim();

  if (!title || !date || !time) {
    return;
  }

  const newPlanRef = push(plansRef);
  try {
    await set(newPlanRef, {
      title,
      date,
      time,
      status,
      note,
    });
    planForm.reset();
    document.getElementById("statusProgress").checked = true;
  } catch (error) {
    console.error(error);
    setSyncState("error", "No pude guardar este plan en Firebase.");
  }
});

function renderIdeas() {
  ideasList.innerHTML = "";

  if (!state.ideas.length) {
    ideasList.appendChild(createEmptyState("Aqui quiero ir guardando ideas para nosotros y no olvidarlas."));
    return;
  }

  state.ideas.forEach((idea) => {
    const card = document.createElement("article");
    card.className = "entry-card";
    card.innerHTML = `
      <div class="entry-card-header">
        <div>
          <h3>${escapeHtml(idea.title)}</h3>
        </div>
        <span class="pill pill-progress">idea</span>
      </div>
      ${idea.note ? `<p>${escapeHtml(idea.note)}</p>` : ""}
      <div class="entry-actions">
        <button class="ghost-button" type="button" data-action="promote-idea" data-id="${idea.id}">Pasarla a plan</button>
        <button class="ghost-button" type="button" data-action="delete-idea" data-id="${idea.id}">Eliminar</button>
      </div>
    `;
    ideasList.appendChild(card);
  });
}

function renderPlans() {
  plansList.innerHTML = "";

  if (!state.plans.length) {
    plansList.appendChild(createEmptyState("Cuando ya tengamos algo mas claro, aqui quiero dejarlo bien anotado."));
    return;
  }

  state.plans.forEach((plan) => {
    const card = document.createElement("article");
    const isConfirmed = plan.status === "Confirmado";
    card.className = "entry-card";
    card.innerHTML = `
      <div class="entry-card-header">
        <div>
          <h3>${escapeHtml(plan.title)}</h3>
        </div>
        <span class="pill ${isConfirmed ? "pill-confirmed" : "pill-progress"}">${escapeHtml(plan.status)}</span>
      </div>
      <div class="entry-meta">
        <span>${formatDate(plan.date)}</span>
        <span>${formatTime(plan.time)}</span>
      </div>
      ${plan.note ? `<p>${escapeHtml(plan.note)}</p>` : ""}
      <div class="entry-actions">
        <button class="ghost-button" type="button" data-action="toggle-plan" data-id="${plan.id}">
          ${isConfirmed ? "Volver a en progreso" : "Confirmar plan"}
        </button>
        <button class="ghost-button" type="button" data-action="delete-plan" data-id="${plan.id}">Eliminar</button>
      </div>
    `;
    plansList.appendChild(card);
  });
}

function renderSummary() {
  ideasCount.textContent = String(state.ideas.length);
  plansCount.textContent = String(state.plans.length);
  confirmedCount.textContent = String(state.plans.filter((plan) => plan.status === "Confirmado").length);
}

function createEmptyState(message) {
  const clone = emptyStateTemplate.content.firstElementChild.cloneNode(true);
  clone.querySelector("p").textContent = message;
  return clone;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatTime(timeString) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2024-01-01T${timeString}`));
}

function getUpcomingDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

document.addEventListener("click", (event) => {
  void handleActionClick(event);
});

async function handleActionClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "delete-idea") {
    try {
      await remove(ref(database, `ideas/${id}`));
    } catch (error) {
      console.error(error);
      setSyncState("error", "No pude eliminar esta idea.");
    }
    return;
  }

  if (action === "promote-idea") {
    const idea = state.ideas.find((entry) => entry.id === id);

    if (!idea) {
      return;
    }

    document.getElementById("planTitle").value = idea.title;
    document.getElementById("planNote").value = idea.note || "";
    document.getElementById("planDate").focus();
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    return;
  }

  if (action === "delete-plan") {
    try {
      await remove(ref(database, `plans/${id}`));
    } catch (error) {
      console.error(error);
      setSyncState("error", "No pude eliminar este plan.");
    }
    return;
  }

  if (action === "toggle-plan") {
    const plan = state.plans.find((entry) => entry.id === id);

    if (!plan) {
      return;
    }

    try {
      await update(ref(database, `plans/${id}`), {
        status: plan.status === "Confirmado" ? "En progreso" : "Confirmado",
      });
    } catch (error) {
      console.error(error);
      setSyncState("error", "No pude cambiar el estado de este plan.");
    }
  }
}

function subscribeToIdeas() {
  onValue(
    ideasRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        await seedIdeas();
        return;
      }

      state.ideas = mapSnapshot(snapshot.val());
      renderIdeas();
      renderSummary();
      setSyncState("live", "Todo se esta guardando y compartiendo entre dispositivos.");
    },
    (error) => {
      console.error(error);
      setSyncState("error", "No pude leer las ideas de Firebase. Revisa las reglas o la conexion.");
    }
  );
}

function subscribeToPlans() {
  onValue(
    plansRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        await seedPlans();
        return;
      }

      state.plans = mapSnapshot(snapshot.val()).sort((left, right) => {
        const leftValue = `${left.date}T${left.time}`;
        const rightValue = `${right.date}T${right.time}`;
        return leftValue.localeCompare(rightValue);
      });

      renderPlans();
      renderSummary();
      setSyncState("live", "Todo se esta guardando y compartiendo entre dispositivos.");
    },
    (error) => {
      console.error(error);
      setSyncState("error", "No pude leer los planes de Firebase. Revisa las reglas o la conexion.");
    }
  );
}

async function seedIdeas() {
  const writes = defaults.ideas.map((idea) => set(push(ideasRef), idea));
  await Promise.all(writes);
}

async function seedPlans() {
  const writes = defaults.plans.map((plan) => set(push(plansRef), plan));
  await Promise.all(writes);
}

function mapSnapshot(value) {
  return Object.entries(value).map(([id, item]) => ({ id, ...item }));
}

function setSyncState(mode, message) {
  syncMessage.textContent = message;
  syncMessage.classList.remove("is-live", "is-error");

  if (mode === "live") {
    syncMessage.classList.add("is-live");
  }

  if (mode === "error") {
    syncMessage.classList.add("is-error");
  }
}

renderIdeas();
renderPlans();
renderSummary();
subscribeToIdeas();
subscribeToPlans();
