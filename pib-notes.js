const storageKey = "upscIAS-pib-notes";
const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector("#mainNav");
const notesForm = document.querySelector("#notesForm");
const noteDate = document.querySelector("#noteDate");
const noteTitle = document.querySelector("#noteTitle");
const noteTags = document.querySelector("#noteTags");
const sourceUrl = document.querySelector("#sourceUrl");
const noteFile = document.querySelector("#noteFile");
const noteBody = document.querySelector("#noteBody");
const notesStatus = document.querySelector("#notesStatus");
const notesSearch = document.querySelector("#notesSearch");
const notesList = document.querySelector("#notesList");
const clearForm = document.querySelector("#clearForm");
const exportNotes = document.querySelector("#exportNotes");
let editingId = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(storageKey, JSON.stringify(notes));
}

function setStatus(message) {
  notesStatus.value = message;
  window.setTimeout(() => {
    if (notesStatus.value === message) notesStatus.value = "";
  }, 2600);
}

function clearEditor() {
  editingId = null;
  notesForm.reset();
  noteDate.value = today();
  notesForm.querySelector(".primary-action").textContent = "Save Note";
}

function noteMatches(note, query) {
  const text = [note.date, note.title, note.tags, note.source, note.body].join(" ").toLowerCase();
  return text.includes(query);
}

function renderNotes() {
  const query = notesSearch.value.trim().toLowerCase();
  const notes = loadNotes()
    .filter((note) => !query || noteMatches(note, query))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (notes.length === 0) {
    notesList.innerHTML = `<p class="empty-state">No PIB notes saved yet.</p>`;
    return;
  }

  notesList.innerHTML = notes.map((note) => `
    <article class="note-card" data-note-id="${note.id}">
      <div>
        <time datetime="${note.date}">${note.date}</time>
        <h3>${escapeHtml(note.title)}</h3>
        <p>${escapeHtml(preview(note.body))}</p>
        <div class="note-meta">
          ${tagMarkup(note.tags)}
          ${note.source ? `<a href="${escapeAttribute(note.source)}" target="_blank" rel="noreferrer">Source</a>` : ""}
        </div>
      </div>
      <div class="note-card-actions">
        <button type="button" data-action="edit">Edit</button>
        <button type="button" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
}

function preview(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 190 ? `${compact.slice(0, 190)}...` : compact;
}

function tagMarkup(tags) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function upsertNote(event) {
  event.preventDefault();
  const notes = loadNotes();
  const wasEditing = Boolean(editingId);
  const note = {
    id: editingId || crypto.randomUUID(),
    date: noteDate.value,
    title: noteTitle.value.trim(),
    tags: noteTags.value.trim(),
    source: sourceUrl.value.trim(),
    body: noteBody.value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (!note.title || !note.date || !note.body) {
    setStatus("Add date, title, and notes.");
    return;
  }

  const nextNotes = editingId
    ? notes.map((item) => item.id === editingId ? note : item)
    : [note, ...notes];

  saveNotes(nextNotes);
  clearEditor();
  renderNotes();
  setStatus(wasEditing ? "Note updated." : "Note saved.");
}

function editNote(id) {
  const note = loadNotes().find((item) => item.id === id);
  if (!note) return;
  editingId = id;
  noteDate.value = note.date;
  noteTitle.value = note.title;
  noteTags.value = note.tags;
  sourceUrl.value = note.source;
  noteBody.value = note.body;
  notesForm.querySelector(".primary-action").textContent = "Update Note";
  notesForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteNote(id) {
  saveNotes(loadNotes().filter((note) => note.id !== id));
  if (editingId === id) clearEditor();
  renderNotes();
  setStatus("Note deleted.");
}

menuButton.addEventListener("click", () => {
  const nextState = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(nextState));
  mainNav.classList.toggle("is-open", nextState);
});

noteFile.addEventListener("change", async () => {
  const file = noteFile.files[0];
  if (!file) return;
  const text = await file.text();
  if (!noteTitle.value.trim()) noteTitle.value = file.name.replace(/\.[^.]+$/, "");
  noteBody.value = text;
  setStatus("File imported.");
});

document.querySelector("#quickTags").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const tags = noteTags.value.split(",").map((tag) => tag.trim()).filter(Boolean);
  if (!tags.includes(button.textContent)) tags.push(button.textContent);
  noteTags.value = tags.join(", ");
});

notesList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest("[data-note-id]");
  if (button.dataset.action === "edit") editNote(card.dataset.noteId);
  if (button.dataset.action === "delete") deleteNote(card.dataset.noteId);
});

exportNotes.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(loadNotes(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `upscIAS-pib-notes-${today()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

notesForm.addEventListener("submit", upsertNote);
notesSearch.addEventListener("input", renderNotes);
clearForm.addEventListener("click", clearEditor);

noteDate.value = today();
renderNotes();
