import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const STORAGE_KEY = "mylinks.items";

const SEED_LINKS = [
  {
    id: "seed-aoty",
    title: "Album of the Year",
    url: "https://www.albumoftheyear.org/",
    tags: ["música"],
    color: "#db2777",
    createdAt: Date.now(),
  },
];

const state = {
  links: [],
  search: "",
  tag: "",
  user: null,
};

let cloud = null; // set up if Firebase is configured

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
const linkColorInput = document.getElementById("linkColor");
const colorPicker = document.getElementById("linkColorPicker");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const themeToggle = document.getElementById("themeToggle");
const authBtn = document.getElementById("authBtn");
const userAvatar = document.getElementById("userAvatar");
const syncStatus = document.getElementById("syncStatus");
const localModeBanner = document.getElementById("localModeBanner");

function loadLocalLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [...SEED_LINKS];
  } catch {
    return [...SEED_LINKS];
  }
}

function saveLocalLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.links));
}

function faviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function parseTags(raw) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function allTags() {
  const set = new Set();
  state.links.forEach((l) => (l.tags || []).forEach((t) => set.add(t)));
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
    const matchesTag = !state.tag || (l.tags || []).includes(state.tag);
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
    card.style.setProperty("--card-color", link.color || "#4f46e5");

    const head = document.createElement("div");
    head.className = "card-head";

    const favicon = document.createElement("img");
    favicon.className = "favicon";
    favicon.src = faviconUrl(link.url);
    favicon.alt = "";
    favicon.loading = "lazy";

    const headText = document.createElement("div");
    headText.className = "card-head-text";

    const a = document.createElement("a");
    a.className = "link-title";
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.title;

    const url = document.createElement("div");
    url.className = "link-url";
    url.textContent = link.url;

    headText.append(a, url);
    head.append(favicon, headText);

    const tagList = document.createElement("div");
    tagList.className = "tag-list";
    (link.tags || []).forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.textContent = t;
      chip.addEventListener("click", () => {
        state.tag = t;
        tagFilter.value = t;
        render();
      });
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
    card.append(head, tagList, actions);
    grid.appendChild(card);
  });
}

function openDialog(link) {
  linkForm.reset();
  setSelectedColor("#4f46e5");
  if (link) {
    dialogTitle.textContent = "Editar enlace";
    linkIdInput.value = link.id;
    linkTitleInput.value = link.title;
    linkUrlInput.value = link.url;
    linkTagsInput.value = (link.tags || []).join(", ");
    setSelectedColor(link.color || "#4f46e5");
  } else {
    dialogTitle.textContent = "Añadir enlace";
    linkIdInput.value = "";
  }
  dialog.showModal();
}

function setSelectedColor(color) {
  linkColorInput.value = color;
  [...colorPicker.querySelectorAll(".color-swatch")].forEach((sw) => {
    sw.classList.toggle("selected", sw.dataset.color === color);
  });
}

colorPicker.addEventListener("click", (e) => {
  const btn = e.target.closest(".color-swatch");
  if (!btn) return;
  setSelectedColor(btn.dataset.color);
});

async function deleteLink(id) {
  if (cloud) {
    await cloud.deleteLink(id);
    return;
  }
  state.links = state.links.filter((l) => l.id !== id);
  saveLocalLinks();
  render();
}

linkForm.addEventListener("submit", async () => {
  const id = linkIdInput.value;
  const title = linkTitleInput.value.trim();
  const url = linkUrlInput.value.trim();
  const tags = parseTags(linkTagsInput.value);
  const color = linkColorInput.value;

  if (cloud) {
    await cloud.saveLink({ id: id || undefined, title, url, tags, color });
    return;
  }

  if (id) {
    const link = state.links.find((l) => l.id === id);
    Object.assign(link, { title, url, tags, color });
  } else {
    state.links.unshift({
      id: crypto.randomUUID(),
      title,
      url,
      tags,
      color,
      createdAt: Date.now(),
    });
  }
  saveLocalLinks();
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
      color: item.color || "#4f46e5",
      createdAt: item.createdAt || Date.now(),
    }));
    if (cloud) {
      await cloud.importLinks(normalized);
    } else {
      state.links = normalized;
      saveLocalLinks();
      render();
    }
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

async function initCloudSync() {
  const { initializeApp } = await import(
    "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js"
  );
  const {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
  } = await import(
    "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js"
  );
  const {
    getFirestore,
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    writeBatch,
  } = await import(
    "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js"
  );

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  let unsubscribeLinks = null;

  authBtn.hidden = false;
  authBtn.textContent = "Iniciar sesión con Google";
  authBtn.addEventListener("click", () => {
    if (state.user) {
      signOut(auth);
    } else {
      signInWithPopup(auth, provider).catch((err) => {
        alert("No se pudo iniciar sesión: " + err.message);
      });
    }
  });
  userAvatar.addEventListener("click", () => signOut(auth));

  function linksCol(uid) {
    return collection(db, "users", uid, "links");
  }

  cloud = {
    async saveLink({ id, title, url, tags, color }) {
      const uid = state.user.uid;
      const ref = id ? doc(linksCol(uid), id) : doc(linksCol(uid));
      await setDoc(ref, {
        title,
        url,
        tags,
        color,
        createdAt: Date.now(),
      });
    },
    async deleteLink(id) {
      await deleteDoc(doc(linksCol(state.user.uid), id));
    },
    async importLinks(items) {
      const uid = state.user.uid;
      const batch = writeBatch(db);
      items.forEach((item) => {
        const ref = doc(linksCol(uid), item.id);
        batch.set(ref, {
          title: item.title,
          url: item.url,
          tags: item.tags,
          color: item.color,
          createdAt: item.createdAt,
        });
      });
      await batch.commit();
    },
  };

  onAuthStateChanged(auth, async (user) => {
    state.user = user;
    if (unsubscribeLinks) {
      unsubscribeLinks();
      unsubscribeLinks = null;
    }

    if (user) {
      authBtn.hidden = true;
      userAvatar.hidden = false;
      userAvatar.src = user.photoURL || "";
      userAvatar.title = `${user.displayName || user.email} · clic para cerrar sesión`;
      syncStatus.hidden = false;
      syncStatus.textContent = "☁ Sincronizado";
      localModeBanner.hidden = true;

      unsubscribeLinks = onSnapshot(linksCol(user.uid), async (snap) => {
        if (snap.empty && !snap.metadata.hasPendingWrites) {
          await cloud.importLinks(SEED_LINKS);
          return;
        }
        state.links = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        render();
      });
    } else {
      authBtn.hidden = false;
      userAvatar.hidden = true;
      syncStatus.hidden = false;
      syncStatus.textContent = "Sin sincronizar";
      localModeBanner.hidden = true;
      state.links = loadLocalLinks();
      render();
    }
  });
}

if (isFirebaseConfigured) {
  state.links = [];
  render();
  initCloudSync().catch((err) => {
    console.error("Firebase init failed", err);
    localModeBanner.hidden = false;
    state.links = loadLocalLinks();
    render();
  });
} else {
  localModeBanner.hidden = false;
  state.links = loadLocalLinks();
  render();
}
