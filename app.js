const STORAGE_KEY = "mylinks.items";

const state = {
  links: loadLinks(),
  search: "",
  tag: "",
};

const grid = document.getElementById("linksGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const tagFilter = document.getElementById("tagFilter");
const addBtn = document.getElementById("addBtn");
const dialog = document.getElementById("linkDialog");
const linkForm = document.getElementById("linkForm");
const dialogTitle = document.getElementById("dialogTitle");
const cancelBtn = document.getElementById("cancelBtn");
const linkIdInput = document.getElementById("linkId");
const linkTitleInput = document.getElementById("linkTitle");
const linkUrlInput = document.getElementById("linkUrl");
const linkTagsInput = document.getElementById("linkTags");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const themeToggle = document.getElementById("themeToggle");

function loadLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.links));
}

function parseTags(raw) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function allTags() {
  const set = new Set();
  state.links.forEach((l) => l.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}

function renderTagFilter() {
  const current = tagFilter.value;
  tagFilter.innerHTML = '<option value="">Todas las etiquetas</option>';
  allTags().forEach((tag) => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    tagFilter.appendChild(opt);
  });
  tagFilter.value = current;
}

function filteredLinks() {
  const q = state.search.trim().toLowerCase();
  return state.links.filter((l) => {
    const matchesQuery =
      !q ||
      l.title.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q);
    const matchesTag = !state.tag || l.tags.includes(state.tag);
    return matchesQuery && matchesTag;
  });
}

function render() {
  renderTagFilter();
  const items = filteredLinks();
  grid.innerHTML = "";
  emptyState.hidden = items.length !== 0;

  items.forEach((link) => {
    const card = document.createElement("article");
    card.className = "link-card";

    const a = document.createElement("a");
    a.className = "link-title";
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.title;

    const url = document.createElement("div");
    url.className = "link-url";
    url.textContent = link.url;

    const tagList = document.createElement("div");
    tagList.className = "tag-list";
    link.tags.forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.textContent = t;
      tagList.appendChild(chip);
    });

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => openDialog(link));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Eliminar";
    deleteBtn.addEventListener("click", () => deleteLink(link.id));

    actions.append(editBtn, deleteBtn);
    card.append(a, url, tagList, actions);
    grid.appendChild(card);
  });
}

function openDialog(link) {
  linkForm.reset();
  if (link) {
    dialogTitle.textContent = "Editar enlace";
    linkIdInput.value = link.id;
    linkTitleInput.value = link.title;
    linkUrlInput.value = link.url;
    linkTagsInput.value = link.tags.join(", ");
  } else {
    dialogTitle.textContent = "Añadir enlace";
    linkIdInput.value = "";
  }
  dialog.showModal();
}

function deleteLink(id) {
  state.links = state.links.filter((l) => l.id !== id);
  saveLinks();
  render();
}

linkForm.addEventListener("submit", (e) => {
  const id = linkIdInput.value;
  const title = linkTitleInput.value.trim();
  const url = linkUrlInput.value.trim();
  const tags = parseTags(linkTagsInput.value);

  if (id) {
    const link = state.links.find((l) => l.id === id);
    Object.assign(link, { title, url, tags });
  } else {
    state.links.unshift({
      id: crypto.randomUUID(),
      title,
      url,
      tags,
      createdAt: Date.now(),
    });
  }
  saveLinks();
  render();
});

addBtn.addEventListener("click", () => openDialog(null));
cancelBtn.addEventListener("click", () => dialog.close());

searchInput.addEventListener("input", (e) => {
  state.search = e.target.value;
  render();
});

tagFilter.addEventListener("change", (e) => {
  state.tag = e.target.value;
  render();
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.links, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mylinks-export.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

importInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Formato inválido");
    const normalized = parsed.map((item) => ({
      id: item.id || crypto.randomUUID(),
      title: String(item.title || "Sin título"),
      url: String(item.url || "#"),
      tags: Array.isArray(item.tags) ? item.tags : [],
      createdAt: item.createdAt || Date.now(),
    }));
    state.links = normalized;
    saveLinks();
    render();
  } catch (err) {
    alert("No se pudo importar el archivo: " + err.message);
  } finally {
    importInput.value = "";
  }
});

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("mylinks.theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

(function initTheme() {
  const saved = localStorage.getItem("mylinks.theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
})();

render();
