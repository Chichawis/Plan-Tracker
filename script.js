const storageKeys = {
  ideas: "awis-plan-tracker-ideas",
  plans: "awis-plan-tracker-plans",
};

const state = {
  ideas: loadItems(storageKeys.ideas, [
    {
      id: crypto.randomUUID(),
      title: "Ir por algo rico y platicar sin prisa",
      note: "Solo quiero guardar esto para que no se me vaya la idea.",
    },
  ]),
  plans: loadItems(storageKeys.plans, [
    {
      id: crypto.randomUUID(),
      title: "Salir por un cafe y vernos tranquilos",
      date: getUpcomingDate(4),
      time: "18:30",
      status: "En progreso",
      note: "Quiero ir viendo desde ahorita si si podemos acomodarlo.",
    },
  ]),
};

const ideaForm = document.getElementById("ideaForm");
const planForm = document.getElementById("planForm");
const ideasList = document.getElementById("ideasList");
const plansList = document.getElementById("plansList");
const ideasCount = document.getElementById("ideasCount");
const plansCount = document.getElementById("plansCount");
const confirmedCount = document.getElementById("confirmedCount");
const emptyStateTemplate = document.getElementById("emptyState");

ideaForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("ideaTitle").value.trim();
  const note = document.getElementById("ideaNote").value.trim();

  if (!title) {
    return;
  }

  state.ideas.unshift({
    id: crypto.randomUUID(),
    title,
    note,
  });

  persist();
  renderIdeas();
  renderSummary();
  ideaForm.reset();
});

planForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("planTitle").value.trim();
  const date = document.getElementById("planDate").value;
  const time = document.getElementById("planTime").value;
  const status = document.querySelector('input[name="status"]:checked').value;
  const note = document.getElementById("planNote").value.trim();

  if (!title || !date || !time) {
    return;
  }

  state.plans.unshift({
    id: crypto.randomUUID(),
    title,
    date,
    time,
    status,
    note,
  });

  state.plans.sort((left, right) => {
    const leftValue = `${left.date}T${left.time}`;
    const rightValue = `${right.date}T${right.time}`;
    return leftValue.localeCompare(rightValue);
  });

  persist();
  renderPlans();
  renderSummary();
  planForm.reset();
  document.getElementById("statusProgress").checked = true;
});

function loadItems(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function persist() {
  localStorage.setItem(storageKeys.ideas, JSON.stringify(state.ideas));
  localStorage.setItem(storageKeys.plans, JSON.stringify(state.plans));
}

function renderIdeas() {
  ideasList.innerHTML = "";

  if (!state.ideas.length) {
    ideasList.appendChild(createEmptyState("Aqui vamos a ir guardando ideas para no olvidarlas."));
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
    plansList.appendChild(createEmptyState("Cuando ya tengamos algo claro, aqui lo dejamos bien anotado."));
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
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "delete-idea") {
    state.ideas = state.ideas.filter((idea) => idea.id !== id);
    persist();
    renderIdeas();
    renderSummary();
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
    state.plans = state.plans.filter((plan) => plan.id !== id);
    persist();
    renderPlans();
    renderSummary();
    return;
  }

  if (action === "toggle-plan") {
    state.plans = state.plans.map((plan) =>
      plan.id === id
        ? { ...plan, status: plan.status === "Confirmado" ? "En progreso" : "Confirmado" }
        : plan
    );
    persist();
    renderPlans();
    renderSummary();
  }
});

renderIdeas();
renderPlans();
renderSummary();
