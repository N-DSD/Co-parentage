const STORAGE_KEY = "depose-recup-v2";

const KIDS = ["I", "W", "Z"];

const ASSIGNEES_MATIN = ["a", "b", "both", "none"];
const ASSIGNEES_SOIR = ["a", "b", "both", "seul", "none"];

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

let baseMonday = nextMonday();

function nextMonday() {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + 7);
  return monday;
}

function load() {
  const fromHash = parseHashState();
  if (fromHash) return fromHash;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return normalizeState(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function normalizeState(parsed) {
  return {
    names: { ...DEFAULTS.names, ...(parsed.names || {}) },
    weeks: parsed.weeks || {},
    activities: parsed.activities || DEFAULT_ACTIVITIES,
  };
}

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function parseHashState() {
  const m = location.hash.match(/^#d=([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  try {
    return normalizeState(JSON.parse(b64urlDecode(m[1])));
  } catch {
    return null;
  }
}

function shareState() {
  const cutoff = new Date(baseMonday);
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const weeks = {};
  for (const key of Object.keys(state.weeks)) {
    if (key >= cutoffKey) weeks[key] = state.weeks[key];
  }
  return { names: state.names, activities: state.activities, weeks };
}

function shareUrl() {
  return `${location.origin}${location.pathname}#d=${b64urlEncode(JSON.stringify(shareState()))}`;
}

let hashTimer = null;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    history.replaceState(null, "", `#d=${b64urlEncode(JSON.stringify(shareState()))}`);
  }, 300);
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
    week.days[dateStr] = { kids: {}, note: "" };
    for (const kid of KIDS) {
      week.days[dateStr].kids[kid] = { matin: "none", soir: "none" };
    }
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

function shortDate(date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtTime(t) {
  const [h, m] = t.split(":");
  return `${h}h${m}`;
}

function activitiesFor(dayIndex, kid) {
  return state.activities
    .filter((a) => a.day === dayIndex && a.kid === kid)
    .sort((a, b) => a.start.localeCompare(b.start));
}

function assigneeLabel(value) {
  const a = state.names.a;
  const b = state.names.b;
  switch (value) {
    case "a": return a;
    case "b": return b;
    case "both": return `${a} + ${b}`;
    case "seul": return "Rentre seul";
    default: return "Personne";
  }
}

function renderActivities() {
  const container = document.getElementById("activities-list");
  container.innerHTML = "";
  for (let d = 0; d < 7; d++) {
    for (const kid of KIDS) {
      const acts = activitiesFor(d, kid);
      if (acts.length === 0) continue;
      const group = document.createElement("div");
      group.className = "activity-day";
      const title = document.createElement("span");
      title.className = "activity-day-name";
      title.textContent = `${DAYS[d]} · ${kid}`;
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
}

function renderSlotChip(kid, field, value, assignables, day) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = `slot-chip ${field} ${value}`;
  const label = field === "matin" ? "🌅 Matin" : "🌇 Soir";
  chip.innerHTML = `<span class="label">${label}</span><span class="assignee">${assigneeLabel(value)}</span>`;
  chip.addEventListener("click", () => {
    const current = day.kids[kid][field];
    const next = assignables[(assignables.indexOf(current) + 1) % assignables.length];
    day.kids[kid][field] = next;
    save();
    render();
  });
  return chip;
}

function renderWeek(monday, container) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const weekSection = document.createElement("section");
  weekSection.className = "week-section";
  const h2 = document.createElement("h2");
  h2.textContent = `Semaine du ${shortDate(monday)} au ${shortDate(sunday)}`;
  weekSection.appendChild(h2);

  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const day = getDay(monday, dateStr);
    const weekday = (date.getDay() + 6) % 7;

    const card = document.createElement("article");
    card.className = "day-card" + (dateStr === todayStr ? " today" : "");

    const title = document.createElement("div");
    title.className = "day-title";
    title.innerHTML = `<span>${formatDate(date)}</span><span class="date">${date.toLocaleDateString("fr-FR", { year: "numeric" })}</span>`;
    card.appendChild(title);

    for (const kid of KIDS) {
      const row = document.createElement("div");
      row.className = "kid-row";

      const kidName = document.createElement("span");
      kidName.className = "kid-name";
      kidName.textContent = kid;
      row.appendChild(kidName);

      row.appendChild(renderSlotChip(kid, "matin", day.kids[kid].matin, ASSIGNEES_MATIN, day));
      row.appendChild(renderSlotChip(kid, "soir", day.kids[kid].soir, ASSIGNEES_SOIR, day));

      const acts = activitiesFor(weekday, kid);
      if (acts.length > 0) {
        const actsEl = document.createElement("span");
        actsEl.className = "kid-activities";
        actsEl.textContent = acts
          .map((a) => `${a.name} ${fmtTime(a.start)}–${fmtTime(a.end)}`)
          .join(", ");
        row.appendChild(actsEl);
      } else if (day.kids[kid].soir !== "seul" && day.kids[kid].soir !== "none") {
        const hint = document.createElement("span");
        hint.className = "kid-activities muted";
        hint.textContent = "récup. école/crèche";
        row.appendChild(hint);
      }

      card.appendChild(row);
    }

    const note = document.createElement("textarea");
    note.className = "day-note";
    note.placeholder = "Note pour la journée";
    note.value = day.note;
    note.rows = 1;
    note.addEventListener("input", () => {
      day.note = note.value;
      save();
    });
    card.appendChild(note);

    weekSection.appendChild(card);
  }

  container.appendChild(weekSection);
}

function render() {
  document.getElementById("name-a").value = state.names.a;
  document.getElementById("name-b").value = state.names.b;

  const end = new Date(baseMonday);
  end.setDate(end.getDate() + 13);
  document.getElementById("week-label").textContent =
    `Semaines du ${shortDate(baseMonday)} au ${shortDate(end)}`;

  renderActivities();

  const container = document.getElementById("weeks");
  container.innerHTML = "";

  const nextWeekMonday = new Date(baseMonday);
  nextWeekMonday.setDate(nextWeekMonday.getDate() + 7);
  renderWeek(baseMonday, container);
  renderWeek(nextWeekMonday, container);

  const counts = { a: { matin: 0, soir: 0 }, b: { matin: 0, soir: 0 }, both: { matin: 0, soir: 0 } };
  for (let w = 0; w < 2; w++) {
    const monday = new Date(baseMonday);
    monday.setDate(monday.getDate() + 7 * w);
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      const day = getDay(monday, date.toISOString().slice(0, 10));
      for (const kid of KIDS) {
        for (const field of ["matin", "soir"]) {
          const v = day.kids[kid][field];
          if (counts[v]) counts[v][field]++;
        }
      }
    }
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
    el.textContent = `${b.label} : ${counts[b.key].matin} matins · ${counts[b.key].soir} soirs`;
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
  baseMonday.setDate(baseMonday.getDate() - 7);
  render();
});

document.getElementById("next-week").addEventListener("click", () => {
  baseMonday.setDate(baseMonday.getDate() + 7);
  render();
});

document.getElementById("current-week").addEventListener("click", () => {
  baseMonday = nextMonday();
  render();
});

const daySelect = document.getElementById("activity-day");
DAYS.forEach((d, i) => {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = d;
  daySelect.appendChild(opt);
});

const kidSelect = document.getElementById("activity-kid");
kidSelect.innerHTML = "";
for (const kid of KIDS) {
  const opt = document.createElement("option");
  opt.value = kid;
  opt.textContent = kid;
  kidSelect.appendChild(opt);
}

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
    kid: kidSelect.value,
    name,
    start,
    end,
  });
  save();
  e.target.reset();
  render();
});

document.getElementById("share-btn").addEventListener("click", async () => {
  const url = shareUrl();
  try {
    await navigator.clipboard.writeText(url);
    alert("Lien copié ! Envoie-le par SMS/WhatsApp : en l'ouvrant, le planning se charge automatiquement.");
  } catch {
    prompt("Copie ce lien et envoie-le :", url);
  }
});

document.getElementById("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "co-parentage-planning.json";
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
