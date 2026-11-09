const STORAGE_KEY = "depose-recup-v1";

const SLOTS = [
  { id: "matin", label: "🌅 Dépose le matin" },
  { id: "soir", label: "🌇 Récupération le soir" },
];

const ASSIGNEES = ["a", "b", "both", "none"];

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const DEFAULT_ACTIVITIES = [
  { id: "act-1", day: 0, kid: "Z", name: "Harmonie", start: "17:00", end: "18:30" },
  { id: "act-2", day: 0, kid: "W", name: "Étude", start: "17:00", end: "18:00" },
  { id: "act-3", day: 2, kid: "W", name: "FM", start: "13:00", end: "14:15" },
  { id: "act-4", day: 2, kid: "W", name: "Chorale", start: "16:00", end: "17:00" },
  { id: "act-5", day: 2, kid: "W", name: "Théâtre", start: "14:15", end: "15:15" },
  { id: "act-6", day: 2, kid: "Z", name: "Théâtre", start: "13:15", end: "14:15" },
  { id: "act-7", day: 2, kid: "Z", name: "Clarinette", start: "19:15", end: "19:45" },
  { id: "act-8", day: 3, kid: "Z", name: "FM", start: "17:00", end: "18:30" },
  { id: "act-9", day: 3, kid: "W", name: "Piano", start: "18:10", end: "18:40" },
];

const DEFAULTS = {
  names: { a: "Moi", b: "Ma compagne" },
  weeks: {},
  activities: DEFAULT_ACTIVITIES,
};

const state = load();

let currentMonday = getMonday(new Date());

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      names: { ...DEFAULTS.names, ...(parsed.names || {}) },
      weeks: parsed.weeks || {},
      activities: parsed.activities || DEFAULT_ACTIVITIES,
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function weekKey(monday) {
  return monday.toISOString().slice(0, 10);
}

function getWeek(monday) {
  const key = weekKey(monday);
  if (!state.weeks[key]) {
    state.weeks[key] = { days: {} };
  }
  return state.weeks[key];
}

function getDay(monday, dateStr) {
  const week = getWeek(monday);
  if (!week.days[dateStr]) {
    week.days[dateStr] = { slots: {}, note: "" };
  }
  return week.days[dateStr];
}

function formatDate(date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function fmtTime(t) {
  const [h, m] = t.split(":");
  return `${h}h${m}`;
}

function activitiesForDay(dayIndex) {
  return state.activities
    .filter((a) => a.day === dayIndex)
    .sort((a, b) => a.start.localeCompare(b.start));
}

function assigneeLabel(value) {
  const a = state.names.a;
  const b = state.names.b;
  switch (value) {
    case "a": return a;
    case "b": return b;
    case "both": return `${a} + ${b}`;
    default: return "Personne";
  }
}

function renderActivities() {
  const container = document.getElementById("activities-list");
  container.innerHTML = "";
  for (let d = 0; d < 7; d++) {
    const acts = activitiesForDay(d);
    if (acts.length === 0) continue;
    const group = document.createElement("div");
    group.className = "activity-day";
    const title = document.createElement("span");
    title.className = "activity-day-name";
    title.textContent = DAYS[d];
    group.appendChild(title);
    for (const act of acts) {
      const row = document.createElement("span");
      row.className = "activity-row";
      row.innerHTML = `<span class="activity-kid">${act.kid}</span> ${act.name} <span class="activity-time">${fmtTime(act.start)} – ${fmtTime(act.end)}</span>`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "activity-delete";
      del.textContent = "✕";
      del.title = "Supprimer cette activité";
      del.addEventListener("click", () => {
        state.activities = state.activities.filter((a) => a.id !== act.id);
        save();
        render();
      });
      row.appendChild(del);
      group.appendChild(row);
    }
    container.appendChild(group);
  }
}

function render() {
  document.getElementById("name-a").value = state.names.a;
  document.getElementById("name-b").value = state.names.b;

  const sunday = new Date(currentMonday);
  sunday.setDate(sunday.getDate() + 6);
  document.getElementById("week-label").textContent =
    `Semaine du ${currentMonday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;

  renderActivities();

  const container = document.getElementById("days");
  container.innerHTML = "";

  const todayStr = new Date().toISOString().slice(0, 10);
  const counts = { a: 0, b: 0, both: 0, none: 0 };

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentMonday);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const day = getDay(currentMonday, dateStr);
    const weekday = (date.getDay() + 6) % 7;

    const card = document.createElement("article");
    card.className = "day-card" + (dateStr === todayStr ? " today" : "");

    const title = document.createElement("div");
    title.className = "day-title";
    title.innerHTML = `<span>${formatDate(date)}</span><span class="date">${date.toLocaleDateString("fr-FR", { year: "numeric" })}</span>`;
    card.appendChild(title);

    for (const slot of SLOTS) {
      const value = day.slots[slot.id] || "none";
      counts[value]++;
      const el = document.createElement("div");
      el.className = `slot ${value}`;
      el.innerHTML = `<span class="label">${slot.label}</span><span class="assignee">${assigneeLabel(value)}</span>`;
      el.addEventListener("click", () => {
        const current = day.slots[slot.id] || "none";
        const next = ASSIGNEES[(ASSIGNEES.indexOf(current) + 1) % ASSIGNEES.length];
        day.slots[slot.id] = next;
        save();
        render();
      });
      card.appendChild(el);
    }

    const acts = activitiesForDay(weekday);
    if (acts.length > 0) {
      const list = document.createElement("div");
      list.className = "day-activities";
      for (const act of acts) {
        const row = document.createElement("div");
        row.className = "day-activity";
        row.innerHTML = `<span class="activity-kid">${act.kid}</span> ${act.name} <span class="activity-time">${fmtTime(act.start)} – ${fmtTime(act.end)}</span>`;
        list.appendChild(row);
      }
      card.appendChild(list);
    }

    const note = document.createElement("textarea");
    note.className = "day-note";
    note.placeholder = "Note pour la journée (horaires, garderie, etc.)";
    note.value = day.note;
    note.rows = 1;
    note.addEventListener("input", () => {
      day.note = note.value;
      save();
    });
    card.appendChild(note);

    container.appendChild(card);
  }

  const summary = document.getElementById("week-summary");
  summary.innerHTML = "";
  const badges = [
    { key: "a", cls: "a", label: state.names.a },
    { key: "b", cls: "b", label: state.names.b },
    { key: "both", cls: "both", label: "Ensemble" },
  ];
  for (const b of badges) {
    const el = document.createElement("span");
    el.className = `badge ${b.cls}`;
    el.textContent = `${b.label} : ${counts[b.key]} / 14`;
    summary.appendChild(el);
  }
}

document.getElementById("name-a").addEventListener("input", (e) => {
  state.names.a = e.target.value.trim() || "Moi";
  save();
  render();
});

document.getElementById("name-b").addEventListener("input", (e) => {
  state.names.b = e.target.value.trim() || "Ma compagne";
  save();
  render();
});

document.getElementById("prev-week").addEventListener("click", () => {
  currentMonday.setDate(currentMonday.getDate() - 7);
  render();
});

document.getElementById("next-week").addEventListener("click", () => {
  currentMonday.setDate(currentMonday.getDate() + 7);
  render();
});

document.getElementById("current-week").addEventListener("click", () => {
  currentMonday = getMonday(new Date());
  render();
});

const daySelect = document.getElementById("activity-day");
DAYS.forEach((d, i) => {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = d;
  daySelect.appendChild(opt);
});

document.getElementById("activity-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("activity-name").value.trim();
  const start = document.getElementById("activity-start").value;
  const end = document.getElementById("activity-end").value;
  if (!name || !start || !end || end <= start) {
    alert("Remplis un nom et des horaires cohérents (début < fin).");
    return;
  }
  state.activities.push({
    id: `act-${Date.now()}`,
    day: Number(daySelect.value),
    kid: document.getElementById("activity-kid").value,
    name,
    start,
    end,
  });
  save();
  e.target.reset();
  render();
});

document.getElementById("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "depose-recup-planning.json";
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state.names = { ...DEFAULTS.names, ...(parsed.names || {}) };
      state.weeks = parsed.weeks || {};
      state.activities = parsed.activities || DEFAULT_ACTIVITIES;
      save();
      render();
    } catch {
      alert("Fichier JSON invalide.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

render();
