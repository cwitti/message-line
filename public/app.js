import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const WORD_LIMIT = 45;
const TITLE_LIMIT = 60;
const CHAR_LIMIT = 360;
const BASE_WORLD_WIDTH = 5200;
const FIRST_NOTE_X = 360;
const NOTE_SPACING = 340;
const NOTE_RIGHT_PADDING = 560;
const NOTE_LINE_OFFSET = -4;
const NOTE_WIDTH_DESKTOP = 208;
const NOTE_WIDTH_MOBILE = 128;
const NOTE_WIDTH_NARROW = 108;
const EDGE_NOTE_SCALE = 0.72;
const MOBILE_WORLD_SCALE = 0.47;
const NARROW_WORLD_SCALE = 0.39;
const NOTE_SCALE_MOBILE = 0.79;
const NOTE_SCALE_NARROW = 0.73;
const NOTE_COOLDOWN_MS = 5 * 60 * 1000;
const LINE_START_RATIO = 0.35;
const LINE_START_RATIO_MOBILE = 0.41;
const LINE_BOTTOM_CLEARANCE_DESKTOP = 360;
const LINE_BOTTOM_CLEARANCE_MOBILE = 210;
const ACTIVE_LINE_STORAGE_KEY = "message-line-active-line";
const LINE_COOLDOWN_STORAGE_KEY = "message-line-line-cooldowns";
const SWIPE_HINT_STORAGE_KEY = "message-line-swipe-hint-dismissed";
const NOTES_COLLECTION = "notes";
const NOTE_REPORTS_COLLECTION = "noteReports";
const LINE_SUGGESTIONS_COLLECTION = "lineSuggestions";
const DEFAULT_LINE_ID = "life";
const firebaseConfig = {
  apiKey: "AIzaSyBD_vdwWhmpeU8wvZKke-nNG-mt9F_jMSQ",
  authDomain: "aihelper-3481c.firebaseapp.com",
  projectId: "aihelper-3481c",
  storageBucket: "aihelper-3481c.firebasestorage.app",
  messagingSenderId: "559254482483",
  appId: "1:559254482483:web:5e401d8ca49f07538d7d46"
};
const DEFAULT_LINE_PREVIEW_LAYOUT = {
  ratios: [0.16, 0.5, 0.82],
  rotations: [-4, 1.5, -2],
  drops: [0, 2, 1]
};
const LINE_PREVIEW_LAYOUTS = [
  {
    ratios: [0.14, 0.47, 0.83],
    rotations: [-7, 2.5, -3],
    drops: [7, -2, 9]
  },
  {
    ratios: [0.19, 0.55, 0.86],
    rotations: [3, -5, 4],
    drops: [11, 6, 1]
  },
  {
    ratios: [0.16, 0.48, 0.79],
    rotations: [-5, 1.5, -6],
    drops: [4, -1, 8]
  },
  {
    ratios: [0.21, 0.52, 0.88],
    rotations: [5, -3, 2.5],
    drops: [10, 3, -1]
  },
  {
    ratios: [0.13, 0.57, 0.82],
    rotations: [-2, 4.5, -4],
    drops: [6, 12, 2]
  }
];
const LINE_CURVE_PATHS = [
  "M 0 44 C 190 31 390 57 610 43 S 835 37 1000 45",
  "M 0 43 C 210 54 420 56 625 47 S 855 34 1000 44",
  "M 0 45 C 205 41 400 52 620 45 S 860 41 1000 43",
  "M 0 42 C 195 54 410 54 630 47 S 860 36 1000 42",
  "M 0 43 C 205 52 420 49 640 45 S 865 39 1000 44"
];
const lineOptions = [
  {
    id: DEFAULT_LINE_ID,
    label: "Life",
    samples: ["Laundry on the heater", "Missed call from dad", "Someone left soup outside"]
  },
  {
    id: "happy",
    label: "Happy",
    samples: ["Bus driver waved back", "Cake at the office", "Sun came out at five"]
  },
  {
    id: "sad",
    label: "Sad",
    samples: ["Her cup still here", "Rain on the stairwell", "Couldn't finish the song"]
  },
  {
    id: "politics",
    label: "Politics",
    samples: ["Too many promises", "Council meeting ran long", "Sticker on a lamppost"]
  },
  {
    id: "wallstreet",
    label: "Wallstreet",
    samples: ["Green at open", "Coffee on the blotter", "Everyone suddenly a genius"]
  },
  {
    id: "art",
    label: "Art",
    samples: ["Paint on my sleeve", "Gallery was too quiet", "Someone laughed at the frame"]
  },
  {
    id: "love",
    label: "Love",
    samples: ["Borrowed hoodie weather", "Two toothbrushes now", "Missed you on the platform"]
  }
];
const lineOptionsById = new Map(lineOptions.map((line) => [line.id, line]));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const viewport = document.querySelector("#viewport");
const world = document.querySelector("#world");
const cord = document.querySelector("#cord");
const cordPath = document.querySelector("#cordPath");
const noteLayer = document.querySelector("#noteLayer");
const noteTemplate = document.querySelector("#noteTemplate");
const noteCount = document.querySelector("#noteCount");
const activeLineBadge = document.querySelector("#activeLineBadge");
const jumpNewest = document.querySelector("#jumpNewest");
const jumpTopUp = document.querySelector("#jumpTopUp");
const jumpTopDown = document.querySelector("#jumpTopDown");
const rankingPanel = document.querySelector("#rankingPanel");
const rankingTitle = document.querySelector("#rankingTitle");
const rankingList = document.querySelector("#rankingList");
const closeRanking = document.querySelector("#closeRanking");
const linePicker = document.querySelector("#linePicker");
const linePickerList = document.querySelector("#linePickerList");
const linePickerScrollScribble = document.querySelector("#linePickerScrollScribble");
const linePickerScrollThumb = document.querySelector("#linePickerScrollThumb");
const linePickerStatus = document.querySelector("#linePickerStatus");
const openLineSuggestion = document.querySelector("#openLineSuggestion");
const lineSuggestionModal = document.querySelector("#lineSuggestionModal");
const lineSuggestionForm = document.querySelector("#lineSuggestionForm");
const lineSuggestionTitleInput = document.querySelector("#lineSuggestionTitleInput");
const lineSuggestionTitleCounter = document.querySelector("#lineSuggestionTitleCounter");
const lineSuggestionReasonInput = document.querySelector("#lineSuggestionReasonInput");
const lineSuggestionReasonCounter = document.querySelector("#lineSuggestionReasonCounter");
const lineSuggestionStatus = document.querySelector("#lineSuggestionStatus");
const swipeHint = document.querySelector("#swipeHint");
const readerModal = document.querySelector("#readerModal");
const readerTitle = document.querySelector("#readerTitle");
const readerContent = document.querySelector("#readerContent");
const readerSheet = document.querySelector("#readerSheet");
const openReportNote = document.querySelector("#openReportNote");
const reportModal = document.querySelector("#reportModal");
const reportForm = document.querySelector("#reportForm");
const reportNoteLabel = document.querySelector("#reportNoteLabel");
const reportReasonInput = document.querySelector("#reportReasonInput");
const reportReasonCounter = document.querySelector("#reportReasonCounter");
const reportFormStatus = document.querySelector("#reportFormStatus");
const upvoteButton = document.querySelector("#upvoteButton");
const downvoteButton = document.querySelector("#downvoteButton");
const upvoteCount = document.querySelector("#upvoteCount");
const downvoteCount = document.querySelector("#downvoteCount");
const voteStatus = document.querySelector("#voteStatus");
const composerModal = document.querySelector("#composerModal");
const composerForm = document.querySelector("#composerForm");
const openLinePicker = document.querySelector("#openLinePicker");
const openComposer = document.querySelector("#openComposer");
const currentLineLabel = document.querySelector("#currentLineLabel");
const lineCooldownTimer = document.querySelector("#lineCooldownTimer");
const composerLineLabel = document.querySelector("#composerLineLabel");
const composerCooldownTimer = document.querySelector("#composerCooldownTimer");
const textMode = document.querySelector("#textMode");
const drawMode = document.querySelector("#drawMode");
const messagePanel = document.querySelector("#messagePanel");
const drawingPanel = document.querySelector("#drawingPanel");
const titleInput = document.querySelector("#titleInput");
const titleCounter = document.querySelector("#titleCounter");
const messageInput = document.querySelector("#messageInput");
const wordCounter = document.querySelector("#wordCounter");
const charCounter = document.querySelector("#charCounter");
const formError = document.querySelector("#formError");
const saveNote = document.querySelector("#saveNote");
const drawCanvas = document.querySelector("#drawCanvas");
const clearCanvas = document.querySelector("#clearCanvas");
const customColor = document.querySelector("#customColor");
const brushSize = document.querySelector("#brushSize");
const brushSizeValue = document.querySelector("#brushSizeValue");
const toolButtons = document.querySelectorAll(".tool-button");
const inkButtons = document.querySelectorAll(".ink");
const context = drawCanvas.getContext("2d");
const soundSources = {
  writing: "/assets/sounds/writing.mp3",
  open: "/assets/sounds/open.mp3"
};

let notes = [];
let currentMode = "text";
let worldWidth = BASE_WORLD_WIDTH;
let activeTool = "pen";
let activeColor = "#2d2d2a";
let activeThickness = 4;
let hasDrawn = false;
let isDrawing = false;
let lastPoint = null;
let shapeStartPoint = null;
let canvasSnapshot = null;
let notesUnsubscribe = null;
let currentReaderNoteId = null;
let soundsUnlocked = false;
let virtualScroll = 0;
let targetVirtualScroll = 0;
let virtualScrollFrame = null;
let cooldownTicker = null;
let voteRequestToken = 0;
let lineLoadToken = 0;
let suppressNoteClickUntil = 0;
let currentLineId = readSavedLineId();
const pendingNoteCreations = new Map();
const pendingVoteRequests = new Map();
const noteColors = ["#fffdf7", "#f6fbff", "#f7fff8", "#fff8fb"];

function viewportLineWidth() {
  return Math.max(320, viewport.clientWidth || window.innerWidth || BASE_WORLD_WIDTH);
}

function viewportLineHeight() {
  return Math.max(680, viewport.clientHeight || window.innerHeight || 680);
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function isNarrowViewport() {
  return window.matchMedia("(max-width: 560px)").matches;
}

function worldCompressionScale() {
  if (isNarrowViewport()) return NARROW_WORLD_SCALE;
  if (isMobileViewport()) return MOBILE_WORLD_SCALE;
  return 1;
}

function visibleWorldWidth() {
  return viewportLineWidth() / worldCompressionScale();
}

function noteBaseWidth() {
  if (isNarrowViewport()) return NOTE_WIDTH_NARROW;
  if (isMobileViewport()) return NOTE_WIDTH_MOBILE;
  return NOTE_WIDTH_DESKTOP;
}

function noteScaleModifier() {
  if (isNarrowViewport()) return NOTE_SCALE_NARROW;
  if (isMobileViewport()) return NOTE_SCALE_MOBILE;
  return 1;
}

function noteFocusOffsetRatio() {
  if (isNarrowViewport()) return 0.8;
  if (isMobileViewport()) return 0.7;
  return 0.45;
}

function lineStartY() {
  const height = viewportLineHeight();
  const mobileViewport = isMobileViewport();
  const bottomClearance = mobileViewport ? LINE_BOTTOM_CLEARANCE_MOBILE : LINE_BOTTOM_CLEARANCE_DESKTOP;
  const startRatio = mobileViewport ? LINE_START_RATIO_MOBILE : LINE_START_RATIO;
  const minStart = mobileViewport ? 180 : 210;

  return Math.max(minStart, Math.min(height * startRatio, height - bottomClearance));
}

function lineY(x) {
  const width = viewportLineWidth();
  const t = x / width;
  const clampedT = Math.max(0, Math.min(1, t));
  const centerDip = Math.sin(clampedT * Math.PI) * 62;
  const handDrawnWobble = Math.sin(t * Math.PI * 2 + 0.45) * 8 + Math.sin(t * Math.PI * 4.2 - 0.8) * 4;

  return Math.round(lineStartY() + centerDip + handDrawnWobble);
}

function noteScaleAt(anchorX) {
  const width = viewportLineWidth();
  const centerX = width / 2;
  const distanceFromCenter = Math.min(1, Math.abs(anchorX - centerX) / centerX);

  return 1 - (1 - EDGE_NOTE_SCALE) * Math.pow(distanceFromCenter, 1.25);
}

function normalizeLineId(value) {
  const id = String(value || "").trim().toLowerCase();
  return lineOptionsById.has(id) ? id : DEFAULT_LINE_ID;
}

function readSavedLineId() {
  try {
    return normalizeLineId(window.localStorage.getItem(ACTIVE_LINE_STORAGE_KEY));
  } catch {
    return DEFAULT_LINE_ID;
  }
}

function persistLineId(lineId) {
  try {
    window.localStorage.setItem(ACTIVE_LINE_STORAGE_KEY, lineId);
  } catch {
    // Ignore storage errors and keep the session-local line.
  }
}

function readSwipeHintDismissed() {
  try {
    return window.localStorage.getItem(SWIPE_HINT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissSwipeHint() {
  if (!swipeHint || !isMobileViewport() || document.body.classList.contains("swipe-hint-dismissed")) return;
  document.body.classList.add("swipe-hint-dismissed");
  try {
    window.localStorage.setItem(SWIPE_HINT_STORAGE_KEY, "1");
  } catch {
    // Ignore storage errors and keep the session-local hint state.
  }
}

if (readSwipeHintDismissed()) {
  document.body.classList.add("swipe-hint-dismissed");
}

function readLineCooldownMap() {
  try {
    const raw = window.localStorage.getItem(LINE_COOLDOWN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([lineId, value]) => [normalizeLineId(lineId), Number(value)])
        .filter(([, value]) => Number.isFinite(value) && value > 0)
    );
  } catch {
    return {};
  }
}

function persistLineCooldownMap(cooldowns) {
  try {
    window.localStorage.setItem(LINE_COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
  } catch {
    // Ignore storage errors and keep the session-local line cooldowns.
  }
}

function pruneExpiredCooldowns(cooldowns = readLineCooldownMap()) {
  const now = Date.now();
  let changed = false;
  const nextCooldowns = Object.fromEntries(
    Object.entries(cooldowns).filter(([, expiresAt]) => {
      const keep = Number.isFinite(expiresAt) && expiresAt > now;
      if (!keep) changed = true;
      return keep;
    })
  );

  if (changed) persistLineCooldownMap(nextCooldowns);
  return nextCooldowns;
}

function getLineCooldownRemaining(lineId) {
  const cooldowns = pruneExpiredCooldowns();
  const expiresAt = cooldowns[normalizeLineId(lineId)];
  if (!Number.isFinite(expiresAt)) return 0;
  return Math.max(0, expiresAt - Date.now());
}

function setLineCooldown(lineId, expiresAt) {
  const cooldowns = pruneExpiredCooldowns();
  cooldowns[normalizeLineId(lineId)] = expiresAt;
  persistLineCooldownMap(cooldowns);
}

function formatCooldown(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function cooldownMessage(lineId = currentLineId) {
  const line = lineOptionsById.get(normalizeLineId(lineId)) || currentLine();
  return `Next note on ${line.label} in ${formatCooldown(getLineCooldownRemaining(line.id))}`;
}

function syncCooldownUI() {
  const remaining = getLineCooldownRemaining(currentLineId);
  const isCoolingDown = remaining > 0;
  const cooldownText = isCoolingDown ? cooldownMessage(currentLineId) : "";

  lineCooldownTimer.textContent = cooldownText;
  lineCooldownTimer.classList.toggle("line-cooldown-hidden", !isCoolingDown);
  composerCooldownTimer.textContent = cooldownText;
  composerCooldownTimer.classList.toggle("line-cooldown-hidden", !isCoolingDown);

  openComposer.disabled = isCoolingDown;
  const composerLabel = openComposer.querySelector(".button-label");
  if (composerLabel) {
    composerLabel.textContent = isCoolingDown ? `Wait ${formatCooldown(remaining)}` : "Add note";
  } else {
    openComposer.textContent = isCoolingDown ? `Wait ${formatCooldown(remaining)}` : "Add note";
  }

  if (composerModal.classList.contains("hidden")) {
    saveNote.disabled = isCoolingDown;
  }

  if (isCoolingDown && !cooldownTicker) {
    cooldownTicker = window.setInterval(syncCooldownUI, 1000);
  } else if (!isCoolingDown && cooldownTicker) {
    window.clearInterval(cooldownTicker);
    cooldownTicker = null;
  }
}

function currentLine() {
  return lineOptionsById.get(currentLineId) || lineOptionsById.get(DEFAULT_LINE_ID);
}

function updateLineContext() {
  const line = currentLine();
  currentLineLabel.textContent = line.label;
  composerLineLabel.textContent = line.label;
  activeLineBadge.textContent = line.label;
  syncCooldownUI();
}

function words(value) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function sanitizeMessage(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, CHAR_LIMIT);
}

function sanitizeTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, TITLE_LIMIT);
}

function fallbackTitle(note) {
  if (note.type === "drawing") {
    return "Pinned Drawing";
  }

  const message = sanitizeMessage(note.message);
  return sanitizeTitle(message.split(/\s+/).slice(0, 4).join(" ")) || "Pinned Note";
}

function normalizeVotes(value) {
  const up = Number(value?.up);
  const down = Number(value?.down);
  return {
    up: Number.isFinite(up) && up > 0 ? Math.floor(up) : 0,
    down: Number.isFinite(down) && down > 0 ? Math.floor(down) : 0
  };
}

function normalizeStoredNote(note) {
  const normalizedNote = {
    ...note,
    id: String(note?.id || ""),
    lineId: normalizeLineId(note?.lineId)
  };

  return {
    ...normalizedNote,
    title: sanitizeTitle(normalizedNote.title) || fallbackTitle(normalizedNote),
    votes: normalizeVotes(normalizedNote.votes)
  };
}

function isRenderableNote(note) {
  return note?.type === "text" || note?.type === "drawing";
}

function stopNotesSubscription() {
  if (typeof notesUnsubscribe === "function") {
    notesUnsubscribe();
  }
  notesUnsubscribe = null;
}

function firestorePermissionMessage(collectionName) {
  if (collectionName === NOTE_REPORTS_COLLECTION || collectionName === LINE_SUGGESTIONS_COLLECTION) {
    return `Firestore rules are blocking writes to "${collectionName}". Deploy the updated firestore.rules so this static app can save there.`;
  }

  return "Firestore rules are blocking note access. Deploy the updated firestore.rules for the static app.";
}

function friendlyFirestoreError(error, fallbackMessage, collectionName = NOTES_COLLECTION) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").trim();

  if (code.includes("permission-denied")) {
    return firestorePermissionMessage(collectionName);
  }

  if (code.includes("failed-precondition") && /index/i.test(message)) {
    return "Firestore needs the notes index for lineId + createdAt. Deploy firestore.indexes.json.";
  }

  return message || fallbackMessage;
}

function updateCounters() {
  const wordCount = words(messageInput.value).length;
  const charCount = messageInput.value.length;
  wordCounter.textContent = `${wordCount} / ${WORD_LIMIT} words`;
  charCounter.textContent = `${charCount} / ${CHAR_LIMIT}`;
  wordCounter.classList.toggle("over-limit", wordCount > WORD_LIMIT);
  charCounter.classList.toggle("over-limit", charCount > CHAR_LIMIT);
}

function updateTitleCounter() {
  const titleLength = titleInput.value.trim().length;
  titleCounter.textContent = `${titleLength} / ${TITLE_LIMIT}`;
  titleCounter.classList.toggle("over-limit", titleLength > TITLE_LIMIT);
}

function updateReportReasonCounter() {
  const length = reportReasonInput.value.trim().length;
  reportReasonCounter.textContent = `${length} / 280`;
  reportReasonCounter.classList.toggle("over-limit", length > 280);
}

function updateLineSuggestionCounters() {
  const titleLength = lineSuggestionTitleInput.value.trim().length;
  const reasonLength = lineSuggestionReasonInput.value.trim().length;
  lineSuggestionTitleCounter.textContent = `${titleLength} / 40`;
  lineSuggestionReasonCounter.textContent = `${reasonLength} / 280`;
  lineSuggestionTitleCounter.classList.toggle("over-limit", titleLength > 40);
  lineSuggestionReasonCounter.classList.toggle("over-limit", reasonLength > 280);
}

function clearElement(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

function createLinePreviewNote(lineIndex, sampleIndex, previewLayout) {
  const note = document.createElement("span");
  const ink = document.createElement("span");
  const scribbleWidths = [
    [76, 54, 70, 48],
    [60, 74, 46, 64],
    [68, 56, 78, 52]
  ];
  const scribbleRotations = [-3, 1, -2, 2];
  const ratio = previewLayout.ratios[sampleIndex % previewLayout.ratios.length] ?? DEFAULT_LINE_PREVIEW_LAYOUT.ratios[sampleIndex % DEFAULT_LINE_PREVIEW_LAYOUT.ratios.length];
  const rotation =
    previewLayout.rotations[sampleIndex % previewLayout.rotations.length] ??
    DEFAULT_LINE_PREVIEW_LAYOUT.rotations[sampleIndex % DEFAULT_LINE_PREVIEW_LAYOUT.rotations.length];
  const drop =
    previewLayout.drops[sampleIndex % previewLayout.drops.length] ??
    DEFAULT_LINE_PREVIEW_LAYOUT.drops[sampleIndex % DEFAULT_LINE_PREVIEW_LAYOUT.drops.length];
  const scribbleSet = scribbleWidths[(lineIndex + sampleIndex) % scribbleWidths.length];

  note.className = "line-choice-note";
  note.setAttribute("aria-hidden", "true");
  note.style.setProperty("--note-left", `${(ratio * 100).toFixed(2)}%`);
  note.style.setProperty("--note-rotation", `${rotation}deg`);
  note.style.setProperty("--note-drop", `${drop}px`);

  ink.className = "line-choice-note-ink";
  scribbleSet.forEach((width, scribbleIndex) => {
    const mark = document.createElement("span");
    mark.className = "line-choice-note-mark";
    mark.style.setProperty("--mark-width", `${width}%`);
    mark.style.setProperty("--mark-rotation", `${scribbleRotations[scribbleIndex % scribbleRotations.length]}deg`);
    ink.append(mark);
  });

  note.append(ink);
  return note;
}

function createLineCurve(index) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.classList.add("line-choice-curve");
  svg.setAttribute("viewBox", "0 0 1000 96");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  path.setAttribute("d", LINE_CURVE_PATHS[index % LINE_CURVE_PATHS.length]);
  svg.append(path);
  return { svg, path };
}

function createLineScribble() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const outer = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const inner = document.createElementNS("http://www.w3.org/2000/svg", "path");

  svg.classList.add("line-choice-scribble");
  svg.setAttribute("viewBox", "0 0 320 120");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  outer.classList.add("scribble-stroke", "scribble-stroke-outer");
  outer.setAttribute("pathLength", "100");
  outer.setAttribute(
    "d",
    "M 23 63 C 22 24 73 8 160 8 C 247 8 295 27 297 59 C 299 92 251 109 159 108 C 70 107 24 94 23 63 Z"
  );

  inner.classList.add("scribble-stroke", "scribble-stroke-inner");
  inner.setAttribute("pathLength", "100");
  inner.setAttribute("d", "M 74 20 C 128 8 218 9 274 31");

  svg.append(outer, inner);
  return svg;
}

function linePreviewWireHeight() {
  if (isNarrowViewport()) return 72;
  if (isMobileViewport()) return 82;
  return 132;
}

function linePreviewPointAtRatio(path, ratio) {
  const targetX = 1000 * ratio;
  const totalLength = path.getTotalLength();
  let start = 0;
  let end = totalLength;

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const mid = (start + end) / 2;
    const point = path.getPointAtLength(mid);
    if (point.x < targetX) {
      start = mid;
    } else {
      end = mid;
    }
  }

  return path.getPointAtLength((start + end) / 2);
}

function renderLinePicker() {
  clearElement(linePickerList);
  const wireHeight = linePreviewWireHeight();
  const wireScale = wireHeight / 96;

  lineOptions.forEach((line, index) => {
    const button = document.createElement("button");
    const labelWrap = document.createElement("div");
    const topic = document.createElement("span");
    const topicText = document.createElement("span");
    const wire = document.createElement("div");
    const notesPreview = document.createElement("div");
    const previewLayout = LINE_PREVIEW_LAYOUTS[index % LINE_PREVIEW_LAYOUTS.length] ?? DEFAULT_LINE_PREVIEW_LAYOUT;

    button.className = "line-choice";
    button.type = "button";
    button.dataset.lineId = line.id;
    button.style.setProperty("--entry-delay", `${index * 44}ms`);
    button.setAttribute("aria-label", `Choose ${line.label}`);

    labelWrap.className = "line-choice-label-wrap";
    topic.className = "line-choice-topic";
    topicText.className = "line-choice-topic-text";

    topicText.textContent = line.label;
    topic.append(topicText, createLineScribble());
    labelWrap.append(topic);

    const curve = createLineCurve(index);
    wire.className = "line-choice-wire";
    notesPreview.className = "line-choice-notes";
    wire.append(curve.svg);
    line.samples.slice(0, 3).forEach((_, sampleIndex) => {
      const ratio =
        previewLayout.ratios[sampleIndex % previewLayout.ratios.length] ??
        DEFAULT_LINE_PREVIEW_LAYOUT.ratios[sampleIndex % DEFAULT_LINE_PREVIEW_LAYOUT.ratios.length];
      const previewNote = createLinePreviewNote(index, sampleIndex, previewLayout);
      const point = linePreviewPointAtRatio(curve.path, ratio);
      previewNote.style.setProperty("--attach-y", `${(point.y * wireScale).toFixed(2)}px`);
      notesPreview.append(previewNote);
    });
    wire.append(notesPreview);
    button.append(labelWrap, wire);
    button.addEventListener("click", () => selectLine(line.id));
    linePickerList.append(button);
  });

  syncLinePickerScrollScribble();
}

function previewText(note) {
  return note.title || "Pinned Note";
}

function setCustomProperty(element, property, value) {
  if (element.style.getPropertyValue(property) !== value) {
    element.style.setProperty(property, value);
  }
}

function createNoteElement(note) {
  const fragment = noteTemplate.content.cloneNode(true);
  const button = fragment.querySelector(".hanging-note");
  button.dataset.id = note.id;
  button.addEventListener("click", (event) => {
    if (performance.now() < suppressNoteClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    openReader(note.id);
  });
  return button;
}

function updateNoteLayout(button, note, index) {
  const noteX = Number(note.x);
  const anchorX = ((Number.isFinite(noteX) ? noteX : 0) - virtualScroll) * worldCompressionScale();
  const scale = noteScaleAt(anchorX) * noteScaleModifier();
  const left = anchorX - noteBaseWidth() / 2;
  const top = lineY(anchorX) + NOTE_LINE_OFFSET + ((index % 3) * (isMobileViewport() ? 6 : 8));
  const leftValue = `${left.toFixed(1)}px`;
  const topValue = `${top}px`;
  const transformValue = `scale(${scale.toFixed(3)})`;
  const zIndexValue = String(Math.round(scale * 1000));

  if (button.style.left !== leftValue) button.style.left = leftValue;
  if (button.style.top !== topValue) button.style.top = topValue;
  if (button.style.transform !== transformValue) button.style.transform = transformValue;
  if (button.style.zIndex !== zIndexValue) button.style.zIndex = zIndexValue;
}

function updateRenderedNoteLayout() {
  const noteElements = new Map(
    Array.from(noteLayer.querySelectorAll(".hanging-note"), (button) => [button.dataset.id, button])
  );

  notes.forEach((note, index) => {
    const button = noteElements.get(String(note.id));
    if (button) updateNoteLayout(button, note, index);
  });
}

function updateNoteElement(button, note, index) {
  const paper = button.querySelector(".paper");
  const content = button.querySelector(".paper-content");
  const label = `Open ${note.title || "pinned note"}`;
  const text = previewText(note);

  updateNoteLayout(button, note, index);
  if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);

  setCustomProperty(button, "--base-rotation", `${note.rotation || 0}deg`);
  setCustomProperty(button, "--breeze-duration", `${5.4 + (index % 5) * 0.62}s`);
  setCustomProperty(button, "--breeze-delay", `${-1 * ((index * 0.73) % 6).toFixed(2)}s`);
  setCustomProperty(button, "--breeze-distance", `${5.2 + (index % 4) * 1.05}px`);
  setCustomProperty(button, "--breeze-rotation", `${1.5 + (index % 3) * 0.38}deg`);
  setCustomProperty(button, "--flex-duration", `${4.4 + (index % 6) * 0.45}s`);
  setCustomProperty(button, "--flex-delay", `${-1 * ((index * 0.51) % 4).toFixed(2)}s`);

  paper.style.background = note.color || "#fffdf7";
  content.classList.add("text-preview", "title-preview");
  if (content.dataset.previewText !== text) {
    content.dataset.previewText = text;
    content.textContent = text;
  }
}

function unlockSounds() {
  if (soundsUnlocked) return;
  soundsUnlocked = true;
  Object.values(soundSources).forEach((src) => {
    const audio = new Audio(src);
    audio.muted = true;
    audio.volume = 0;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => { });
  });
}

function playSound(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.78;
  audio.play().catch(() => { });
}

function voteStorageKey(noteId) {
  return `message-line-vote:${noteId}`;
}

function getLocalVote(noteId) {
  return normalizeVoteChoice(window.localStorage.getItem(voteStorageKey(noteId)));
}

function setLocalVote(noteId, vote) {
  if (vote) {
    window.localStorage.setItem(voteStorageKey(noteId), vote);
  } else {
    window.localStorage.removeItem(voteStorageKey(noteId));
  }
}

function getVotes(note) {
  return {
    up: Number(note?.votes?.up) || 0,
    down: Number(note?.votes?.down) || 0
  };
}

function normalizeVoteChoice(value) {
  return value === "up" || value === "down" ? value : null;
}

function applyVoteChoice(note, previousVote, nextVote) {
  const votes = getVotes(note);

  if (previousVote && votes[previousVote] > 0) {
    votes[previousVote] -= 1;
  }
  if (nextVote) {
    votes[nextVote] += 1;
  }

  return { ...note, votes };
}

function replaceNote(nextNote) {
  const index = notes.findIndex((note) => note.id === nextNote.id);
  if (index === -1) {
    notes.push(nextNote);
    return;
  }
  notes[index] = nextNote;
}

function removeNote(noteId) {
  notes = notes.filter((note) => note.id !== noteId);
}

function sortNotesByTime() {
  notes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function getRightmostX(sourceNotes = notes) {
  return sourceNotes.reduce((rightmost, note) => {
    const x = Number(note.x);
    return Number.isFinite(x) ? Math.max(rightmost, x) : rightmost;
  }, 0);
}

function getNextNoteX() {
  const rightmostX = getRightmostX();
  return rightmostX > 0 ? rightmostX + NOTE_SPACING : FIRST_NOTE_X;
}

function randomFrom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function createClientId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createOptimisticNote(body) {
  return {
    id: createClientId(),
    lineId: normalizeLineId(body.lineId),
    type: body.type,
    title: body.title,
    createdAt: new Date().toISOString(),
    x: getNextNoteX(),
    rotation: Number((Math.random() * 5 - 2.5).toFixed(2)),
    color: randomFrom(noteColors),
    votes: { up: 0, down: 0 },
    ...(body.type === "drawing" ? { image: body.image } : { message: body.message })
  };
}

function mergePendingNotes(serverNotes) {
  const serverNoteIds = new Set(serverNotes.map((note) => note.id));
  const mergedNotes = serverNotes.map((note) => pendingVoteRequests.get(note.id)?.note || note);

  pendingNoteCreations.forEach((note, noteId) => {
    if (note.lineId !== currentLineId) return;
    if (serverNoteIds.has(noteId)) {
      pendingNoteCreations.delete(noteId);
      return;
    }
    mergedNotes.push(pendingVoteRequests.get(noteId)?.note || note);
  });

  return mergedNotes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function updateVoteControls(note) {
  if (!note) return;
  const votes = getVotes(note);
  const localVote = getLocalVote(note.id);

  upvoteCount.textContent = votes.up;
  downvoteCount.textContent = votes.down;
  upvoteButton.classList.toggle("selected", localVote === "up");
  downvoteButton.classList.toggle("selected", localVote === "down");
  upvoteButton.disabled = false;
  downvoteButton.disabled = false;
  voteStatus.textContent = localVote ? `Your vote: ${localVote}` : "";
}

function updateCordPath() {
  const points = [];
  const width = viewportLineWidth();
  const height = viewportLineHeight();
  const step = Math.max(90, width / 18);

  for (let x = -80; x <= width + 120; x += step) {
    points.push(`${points.length ? "L" : "M"} ${x} ${lineY(x)}`);
  }
  cord.setAttribute("viewBox", `0 0 ${width} ${height}`);
  cordPath.setAttribute("d", points.join(" "));
}

function maxVirtualScroll() {
  return Math.max(0, worldWidth - visibleWorldWidth());
}

function clampVirtualScroll(value) {
  return Math.max(0, Math.min(value, maxVirtualScroll()));
}

function renderVirtualScroll() {
  updateRenderedNoteLayout();
}

function stopVirtualScrollAnimation() {
  if (virtualScrollFrame) {
    window.cancelAnimationFrame(virtualScrollFrame);
    virtualScrollFrame = null;
  }
}

function animateVirtualScroll() {
  const distance = targetVirtualScroll - virtualScroll;
  if (Math.abs(distance) < 0.2) {
    virtualScroll = targetVirtualScroll;
    renderVirtualScroll();
    virtualScrollFrame = null;
    return;
  }

  virtualScroll += distance * 0.12;
  renderVirtualScroll();
  virtualScrollFrame = window.requestAnimationFrame(animateVirtualScroll);
}

function smoothVirtualScrollTo(left) {
  targetVirtualScroll = clampVirtualScroll(left);
  if (!virtualScrollFrame) {
    virtualScrollFrame = window.requestAnimationFrame(animateVirtualScroll);
  }
}

function setVirtualScroll(left) {
  stopVirtualScrollAnimation();
  virtualScroll = clampVirtualScroll(left);
  targetVirtualScroll = virtualScroll;
  renderVirtualScroll();
}

function setWorldWidth(nextWidth) {
  const numeric = Number(nextWidth);
  worldWidth = Number.isFinite(numeric) ? Math.max(BASE_WORLD_WIDTH, numeric) : BASE_WORLD_WIDTH;
  document.documentElement.style.setProperty("--world-width", `${worldWidth}px`);
  world.style.width = `${worldWidth}px`;
  world.style.minWidth = `${worldWidth}px`;
  updateCordPath();
  virtualScroll = clampVirtualScroll(virtualScroll);
  targetVirtualScroll = clampVirtualScroll(targetVirtualScroll);
  renderVirtualScroll();
}

function renderNotes() {
  const noteElements = new Map(
    Array.from(noteLayer.querySelectorAll(".hanging-note"), (button) => [button.dataset.id, button])
  );
  const renderedIds = new Set();

  notes.forEach((note, index) => {
    const noteId = String(note.id);
    const button = noteElements.get(noteId) || createNoteElement(note);
    const currentButton = noteLayer.children[index] || null;

    renderedIds.add(noteId);
    updateNoteElement(button, note, index);
    if (currentButton !== button) {
      noteLayer.insertBefore(button, currentButton);
    }
  });

  noteElements.forEach((button, noteId) => {
    if (!renderedIds.has(noteId)) button.remove();
  });

  noteCount.textContent = notes.length === 1 ? "1 note" : `${notes.length} notes`;
}

function linePickerIsOpen() {
  return document.body.classList.contains("line-picker-open");
}

function syncLinePickerScrollScribble() {
  if (!linePickerScrollScribble || !linePickerScrollThumb) return;

  const { clientHeight, scrollHeight, scrollTop } = linePickerList;
  const hasOverflow = scrollHeight > clientHeight + 1;
  linePickerScrollScribble.classList.toggle("is-hidden", !hasOverflow);

  if (!hasOverflow) {
    linePickerScrollThumb.style.removeProperty("--thumb-height");
    linePickerScrollThumb.style.removeProperty("--thumb-offset");
    return;
  }

  const thumbHeight = Math.max(58, (clientHeight * clientHeight) / scrollHeight);
  const maxThumbOffset = Math.max(0, clientHeight - thumbHeight);
  const maxScrollTop = Math.max(1, scrollHeight - clientHeight);
  const thumbOffset = (scrollTop / maxScrollTop) * maxThumbOffset;

  linePickerScrollThumb.style.setProperty("--thumb-height", `${thumbHeight.toFixed(2)}px`);
  linePickerScrollThumb.style.setProperty("--thumb-offset", `${thumbOffset.toFixed(2)}px`);
}

function focusActiveLineChoice() {
  const activeChoice =
    linePickerList.querySelector(`.line-choice[data-line-id="${currentLineId}"]`) ||
    linePickerList.querySelector(".line-choice");

  if (activeChoice instanceof HTMLButtonElement) {
    activeChoice.focus();
  }
}

function openLinePickerView(options = {}) {
  const skipSceneTransition = options?.skipSceneTransition === true;

  closeRankingPanel();
  linePickerStatus.textContent = "";
  renderLinePicker();
  document.body.classList.toggle("line-picker-skip-scene-transition", skipSceneTransition);
  document.body.classList.add("line-picker-open");
  requestAnimationFrame(() => {
    if (skipSceneTransition) {
      requestAnimationFrame(() => {
        document.body.classList.remove("line-picker-skip-scene-transition");
      });
    }
    focusActiveLineChoice();
    syncLinePickerScrollScribble();
  });
}

function closeLinePickerView({ restoreFocus = true } = {}) {
  document.body.classList.remove("line-picker-open");
  if (restoreFocus) {
    requestAnimationFrame(() => openLinePicker.focus());
  }
}

function openLineSuggestionModal() {
  lineSuggestionForm.reset();
  lineSuggestionStatus.textContent = "";
  updateLineSuggestionCounters();
  lineSuggestionModal.classList.remove("hidden");
  requestAnimationFrame(() => lineSuggestionTitleInput.focus());
}

function closeLineSuggestionModal({ restoreFocus = true } = {}) {
  lineSuggestionModal.classList.add("hidden");
  if (restoreFocus && linePickerIsOpen()) {
    requestAnimationFrame(() => openLineSuggestion.focus());
  }
}

function selectLine(lineId) {
  const nextLineId = normalizeLineId(lineId);
  if (nextLineId === currentLineId) {
    closeLinePickerView();
    return;
  }

  currentLineId = nextLineId;
  persistLineId(currentLineId);
  updateLineContext();
  renderLinePicker();
  closeReader();
  closeRankingPanel();
  closeLinePickerView();
  loadNotes({ resetScroll: true });
}

function openReader(noteId) {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return;

  currentReaderNoteId = noteId;
  unlockSounds();
  playSound(soundSources.open);
  clearElement(readerContent);
  readerSheet.style.backgroundColor = note.color || "#fffdf7";
  readerTitle.textContent = note.title || "Pinned Note";
  reportNoteLabel.textContent = `Report "${note.title || "Pinned Note"}" for review.`;
  if (note.type === "drawing") {
    const image = document.createElement("img");
    image.className = "reader-drawing";
    image.src = note.image;
    image.alt = "Pinned drawing";
    readerContent.append(image);
  } else {
    const paragraph = document.createElement("p");
    paragraph.className = "reader-message";
    paragraph.textContent = note.message;
    readerContent.append(paragraph);
  }
  updateVoteControls(note);
  readerModal.classList.remove("hidden");
  readerModal.querySelector(".reader-close").focus();
}

function closeReader() {
  currentReaderNoteId = null;
  readerModal.classList.add("hidden");
  closeReportModal({ restoreFocus: false });
}

function openReportModal() {
  const note = notes.find((item) => item.id === currentReaderNoteId);
  if (!note) return;

  reportForm.reset();
  reportFormStatus.textContent = "";
  reportNoteLabel.textContent = `Report "${note.title || "Pinned Note"}" for review.`;
  updateReportReasonCounter();
  reportModal.classList.remove("hidden");
  requestAnimationFrame(() => reportReasonInput.focus());
}

function closeReportModal({ restoreFocus = true } = {}) {
  reportModal.classList.add("hidden");
  if (restoreFocus && !readerModal.classList.contains("hidden")) {
    requestAnimationFrame(() => openReportNote.focus());
  }
}

function fitCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = drawCanvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (drawCanvas.width === width && drawCanvas.height === height) return;
  drawCanvas.width = width;
  drawCanvas.height = height;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  resetCanvas();
}

function resetCanvas() {
  const rect = drawCanvas.getBoundingClientRect();
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  context.restore();
  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, rect.width || drawCanvas.width, rect.height || drawCanvas.height);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = activeThickness;
  hasDrawn = false;
}

function updateThickness() {
  activeThickness = Number(brushSize.value) || 4;
  brushSizeValue.textContent = activeThickness;
}

function setActiveTool(tool) {
  activeTool = tool;
  toolButtons.forEach((button) => button.classList.toggle("selected", button.dataset.tool === tool));
}

function setActiveColor(color) {
  activeColor = color;
  customColor.value = color;
  inkButtons.forEach((button) => button.classList.toggle("selected", button.dataset.color.toLowerCase() === color.toLowerCase()));
}

function prepareDrawingStyle() {
  context.strokeStyle = activeColor;
  context.lineWidth = activeThickness;
  context.lineCap = "round";
  context.lineJoin = "round";
}

function restoreCanvasSnapshot() {
  if (canvasSnapshot) {
    context.putImageData(canvasSnapshot, 0, 0);
  }
}

function drawShape(from, to) {
  prepareDrawingStyle();
  context.beginPath();

  if (activeTool === "line") {
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    return;
  }

  if (activeTool === "square") {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    const width = Math.sign(dx || 1) * size;
    const height = Math.sign(dy || 1) * size;
    context.strokeRect(from.x, from.y, width, height);
    return;
  }

  if (activeTool === "circle") {
    const radius = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
    context.arc(from.x, from.y, radius, 0, Math.PI * 2);
    context.stroke();
  }
}

function exportDrawingDataUrl() {
  const output = document.createElement("canvas");
  output.width = 680;
  output.height = 480;
  const outputContext = output.getContext("2d");
  outputContext.fillStyle = "#fffdf7";
  outputContext.fillRect(0, 0, output.width, output.height);
  outputContext.drawImage(drawCanvas, 0, 0, output.width, output.height);
  return output.toDataURL("image/png");
}

function setMode(mode) {
  currentMode = mode;
  const isText = mode === "text";
  textMode.classList.toggle("active", isText);
  drawMode.classList.toggle("active", !isText);
  textMode.setAttribute("aria-selected", String(isText));
  drawMode.setAttribute("aria-selected", String(!isText));
  messagePanel.classList.toggle("hidden", !isText);
  drawingPanel.classList.toggle("hidden", isText);
  formError.textContent = "";
  if (isText) {
    messageInput.focus();
  } else {
    requestAnimationFrame(fitCanvas);
  }
}

function openComposerModal() {
  const remaining = getLineCooldownRemaining(currentLineId);
  if (remaining > 0) {
    formError.textContent = cooldownMessage(currentLineId);
    syncCooldownUI();
    return;
  }

  titleInput.value = "";
  messageInput.value = "";
  formError.textContent = "";
  hasDrawn = false;
  updateLineContext();
  setMode("text");
  updateTitleCounter();
  updateCounters();
  resetCanvas();
  composerModal.classList.remove("hidden");
  syncCooldownUI();
  requestAnimationFrame(() => titleInput.focus());
}

function closeComposer() {
  composerModal.classList.add("hidden");
}

function canvasPoint(event) {
  const rect = drawCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function drawSegment(from, to) {
  prepareDrawingStyle();
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
}

function startDrawing(event) {
  event.preventDefault();
  drawCanvas.setPointerCapture(event.pointerId);
  isDrawing = true;
  hasDrawn = true;
  lastPoint = canvasPoint(event);
  shapeStartPoint = lastPoint;
  canvasSnapshot = activeTool === "pen" ? null : context.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
}

function continueDrawing(event) {
  if (!isDrawing || !lastPoint) return;
  const nextPoint = canvasPoint(event);
  if (activeTool === "pen") {
    drawSegment(lastPoint, nextPoint);
    lastPoint = nextPoint;
    return;
  }

  restoreCanvasSnapshot();
  drawShape(shapeStartPoint, nextPoint);
}

function stopDrawing(event) {
  if (isDrawing && activeTool !== "pen" && shapeStartPoint) {
    restoreCanvasSnapshot();
    drawShape(shapeStartPoint, canvasPoint(event));
  }
  if (drawCanvas.hasPointerCapture(event.pointerId)) {
    drawCanvas.releasePointerCapture(event.pointerId);
  }
  isDrawing = false;
  lastPoint = null;
  shapeStartPoint = null;
  canvasSnapshot = null;
}

function loadNotes({ quiet = false, resetScroll = false } = {}) {
  const requestToken = ++lineLoadToken;
  const requestedLineId = currentLineId;
  let handledInitialSnapshot = false;

  stopNotesSubscription();

  try {
    const notesQuery = query(
      collection(db, NOTES_COLLECTION),
      where("lineId", "==", requestedLineId)
    );

    notesUnsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        if (requestToken !== lineLoadToken || requestedLineId !== currentLineId) return;

        const serverNotes = snapshot.docs
          .map((noteSnapshot) => ({ id: noteSnapshot.id, ...noteSnapshot.data() }))
          .filter(isRenderableNote)
          .map(normalizeStoredNote);

        notes = mergePendingNotes(serverNotes);
        const pendingWorldWidth = getRightmostX(notes) + NOTE_RIGHT_PADDING;
        setWorldWidth(Math.max(BASE_WORLD_WIDTH, pendingWorldWidth));
        if (resetScroll && !handledInitialSnapshot) {
          const newest = notes.at(-1);
          setVirtualScroll(newest ? newest.x - visibleWorldWidth() * noteFocusOffsetRatio() : 0);
        }
        handledInitialSnapshot = true;
        renderNotes();
        refreshOpenRanking();
        if (currentReaderNoteId && !readerModal.classList.contains("hidden")) {
          updateVoteControls(notes.find((note) => note.id === currentReaderNoteId));
        }
      },
      (error) => {
        if (requestToken !== lineLoadToken || requestedLineId !== currentLineId) return;
        if (!quiet) {
          formError.textContent = friendlyFirestoreError(error, "The line is out of reach.");
        }
      }
    );
  } catch (error) {
    if (requestToken !== lineLoadToken || requestedLineId !== currentLineId) return;
    if (!quiet) formError.textContent = friendlyFirestoreError(error, "The line is out of reach.");
  }
}

async function saveCurrentNote(event) {
  event.preventDefault();
  unlockSounds();
  formError.textContent = "";
  saveNote.disabled = true;
  let optimisticNote = null;
  const requestLineId = currentLineId;

  try {
    const remaining = getLineCooldownRemaining(requestLineId);
    if (remaining > 0) throw new Error(cooldownMessage(requestLineId));

    const title = titleInput.value.trim();
    if (!title) throw new Error("Add a title first.");

    const body = { title: sanitizeTitle(title), lineId: requestLineId, type: currentMode === "draw" ? "drawing" : "text" };
    if (currentMode === "text") {
      const message = sanitizeMessage(messageInput.value);
      const wordCount = words(message).length;
      if (!message) throw new Error("Write a message first.");
      if (wordCount > WORD_LIMIT) throw new Error(`Keep it to ${WORD_LIMIT} words or fewer.`);
      body.message = message;
    } else {
      if (!hasDrawn) throw new Error("Add a drawing first.");
      body.image = exportDrawingDataUrl();
    }

    optimisticNote = createOptimisticNote(body);
    pendingNoteCreations.set(optimisticNote.id, optimisticNote);
    notes.push(optimisticNote);
    sortNotesByTime();
    closeComposer();
    playSound(soundSources.writing);
    setWorldWidth(Math.max(worldWidth, optimisticNote.x + NOTE_RIGHT_PADDING));
    renderNotes();
    scrollToNote(optimisticNote);
    saveNote.disabled = false;

    const noteToSave = normalizeStoredNote({
      ...body,
      id: optimisticNote.id,
      createdAt: optimisticNote.createdAt,
      x: optimisticNote.x,
      rotation: optimisticNote.rotation,
      color: optimisticNote.color,
      votes: { up: 0, down: 0 }
    });

    await setDoc(doc(db, NOTES_COLLECTION, optimisticNote.id), noteToSave);

    pendingNoteCreations.delete(optimisticNote.id);
    setLineCooldown(requestLineId, Date.now() + NOTE_COOLDOWN_MS);
    if (currentLineId === requestLineId) {
      removeNote(optimisticNote.id);
      replaceNote(noteToSave);
      sortNotesByTime();
      setWorldWidth(Math.max(worldWidth, noteToSave.x + NOTE_RIGHT_PADDING));
      renderNotes();
      scrollToNote(noteToSave);
    }
    syncCooldownUI();
  } catch (error) {
    if (optimisticNote) {
      pendingNoteCreations.delete(optimisticNote.id);
      if (currentLineId === requestLineId) {
        removeNote(optimisticNote.id);
        renderNotes();
        composerModal.classList.remove("hidden");
      }
    }
    formError.textContent = friendlyFirestoreError(error, error.message || "The note could not be pinned.");
  } finally {
    saveNote.disabled = getLineCooldownRemaining(currentLineId) > 0;
  }
}

function scrollToNote(note) {
  smoothVirtualScrollTo(note.x - visibleWorldWidth() * noteFocusOffsetRatio());
}

function jumpToNewest() {
  const newest = notes.at(-1);
  if (newest) scrollToNote(newest);
}

function getRankedNotes(direction) {
  return notes
    .filter((note) => Number(note?.votes?.[direction]) > 0)
    .sort((a, b) => {
      const voteDelta = getVotes(b)[direction] - getVotes(a)[direction];
      if (voteDelta) return voteDelta;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

function closeRankingPanel() {
  rankingPanel.classList.add("hidden");
}

function openRanking(direction) {
  clearElement(rankingList);
  const ranked = getRankedNotes(direction);
  const label = direction === "up" ? "upvotes" : "downvotes";
  rankingTitle.textContent = `Most ${label}`;

  if (!ranked.length) {
    const empty = document.createElement("p");
    empty.className = "ranking-empty";
    empty.textContent = `No ${label} yet.`;
    rankingList.append(empty);
  }

  ranked.slice(0, 12).forEach((note, index) => {
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const score = document.createElement("span");

    button.className = "ranking-item";
    button.type = "button";
    title.textContent = `${index + 1}. ${note.title || "Pinned Note"}`;
    score.textContent = getVotes(note)[direction];
    button.append(title, score);
    button.addEventListener("click", () => {
      closeRankingPanel();
      scrollToNote(note);
    });
    rankingList.append(button);
  });

  rankingPanel.classList.remove("hidden");
  closeRanking.focus();
}

function jumpToMostVoted(direction) {
  openRanking(direction);
}

function refreshOpenRanking() {
  if (rankingPanel.classList.contains("hidden")) {
    return;
  }
  const title = rankingTitle.textContent.toLowerCase();
  openRanking(title.includes("down") ? "down" : "up");
}

async function submitVote(direction) {
  const note = notes.find((item) => item.id === currentReaderNoteId);
  if (!note) return;

  const requestLineId = currentLineId;
  const previousVote = getLocalVote(note.id);
  const nextVote = previousVote === direction ? null : direction;
  const requestToken = ++voteRequestToken;
  const optimisticNote = applyVoteChoice(note, previousVote, nextVote);

  replaceNote(optimisticNote);
  pendingVoteRequests.set(note.id, { token: requestToken, note: optimisticNote });
  setLocalVote(note.id, nextVote);
  updateVoteControls(optimisticNote);
  refreshOpenRanking();

  try {
    const persistedNote = await runTransaction(db, async (transaction) => {
      const noteRef = doc(db, NOTES_COLLECTION, note.id);
      const snapshot = await transaction.get(noteRef);
      if (!snapshot.exists()) {
        throw new Error("Note not found.");
      }

      const liveNote = normalizeStoredNote({ id: snapshot.id, ...snapshot.data() });
      const updatedNote = applyVoteChoice(liveNote, previousVote, nextVote);
      transaction.update(noteRef, { votes: updatedNote.votes });
      return updatedNote;
    });

    if (pendingVoteRequests.get(note.id)?.token !== requestToken) return;

    pendingVoteRequests.delete(note.id);
    if (currentLineId !== requestLineId) return;
    replaceNote(persistedNote);
    updateVoteControls(persistedNote);
    refreshOpenRanking();
  } catch (error) {
    if (pendingVoteRequests.get(note.id)?.token !== requestToken) return;

    pendingVoteRequests.delete(note.id);
    if (currentLineId !== requestLineId) return;
    replaceNote(note);
    setLocalVote(note.id, previousVote);
    updateVoteControls(note);
    voteStatus.textContent = error.message;
    refreshOpenRanking();
  }
}

async function submitNoteReport(event) {
  event.preventDefault();
  const note = notes.find((item) => item.id === currentReaderNoteId);
  if (!note) {
    reportFormStatus.textContent = "Open a note before reporting it.";
    return;
  }

  const reason = reportReasonInput.value.trim();
  if (!reason) {
    reportFormStatus.textContent = "Add a reason so the report can be reviewed.";
    return;
  }

  const submitButton = reportForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  reportFormStatus.textContent = "";

  try {
    await addDoc(collection(db, NOTE_REPORTS_COLLECTION), {
      noteId: note.id,
      lineId: note.lineId,
      noteTitle: note.title,
      noteType: note.type,
      noteCreatedAt: note.createdAt,
      reason: sanitizeMessage(reason),
      status: "pending",
      createdAt: new Date().toISOString()
    });

    closeReportModal({ restoreFocus: false });
    voteStatus.textContent = "Report received. It will be reviewed.";
  } catch (error) {
    reportFormStatus.textContent = friendlyFirestoreError(
      error,
      "The report could not be saved.",
      NOTE_REPORTS_COLLECTION
    );
  } finally {
    submitButton.disabled = false;
  }
}

async function submitLineSuggestion(event) {
  event.preventDefault();
  const label = lineSuggestionTitleInput.value.trim();
  const reason = lineSuggestionReasonInput.value.trim();
  if (!label) {
    lineSuggestionStatus.textContent = "Add a line name first.";
    return;
  }
  if (!reason) {
    lineSuggestionStatus.textContent = "Add a short reason so it can be reviewed.";
    return;
  }

  const submitButton = lineSuggestionForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  lineSuggestionStatus.textContent = "";

  try {
    await addDoc(collection(db, LINE_SUGGESTIONS_COLLECTION), {
      label: sanitizeTitle(label).slice(0, 40),
      suggestedId:
        sanitizeTitle(label)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || `suggested-line-${Date.now()}`,
      reason: sanitizeMessage(reason).slice(0, 280),
      status: "pending",
      createdAt: new Date().toISOString()
    });

    closeLineSuggestionModal({ restoreFocus: false });
    linePickerStatus.textContent = "Your suggestion was sent and will be reviewed.";
  } catch (error) {
    lineSuggestionStatus.textContent = friendlyFirestoreError(
      error,
      "The suggestion could not be saved.",
      LINE_SUGGESTIONS_COLLECTION
    );
  } finally {
    submitButton.disabled = false;
  }
}

function wireScrolling() {
  let trackingPointer = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startScroll = 0;
  const dragThreshold = 8;

  viewport.addEventListener("wheel", (event) => {
    const dominantDelta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (dominantDelta) {
      dismissSwipeHint();
      smoothVirtualScrollTo(targetVirtualScroll + dominantDelta * 0.62);
      event.preventDefault();
    }
  }, { passive: false });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (!isMobileViewport() && event.target instanceof Element && event.target.closest(".hanging-note")) {
      return;
    }
    stopVirtualScrollAnimation();
    trackingPointer = true;
    dragging = false;
    startX = event.clientX;
    startY = event.clientY;
    startScroll = virtualScroll;
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!trackingPointer) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (!dragging) {
      if (Math.abs(deltaX) < dragThreshold && Math.abs(deltaY) < dragThreshold) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY) * 0.85) return;
      dragging = true;
      if (!viewport.hasPointerCapture(event.pointerId)) {
        viewport.setPointerCapture(event.pointerId);
      }
      dismissSwipeHint();
      viewport.classList.add("dragging");
    }

    setVirtualScroll(startScroll - (event.clientX - startX));
    event.preventDefault();
  });

  viewport.addEventListener("pointerup", (event) => {
    trackingPointer = false;
    if (dragging) {
      suppressNoteClickUntil = performance.now() + 300;
    }
    dragging = false;
    viewport.classList.remove("dragging");
    targetVirtualScroll = virtualScroll;
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  });

  viewport.addEventListener("pointercancel", () => {
    trackingPointer = false;
    dragging = false;
    viewport.classList.remove("dragging");
    targetVirtualScroll = virtualScroll;
  });
}

openLinePicker.addEventListener("click", openLinePickerView);
openLineSuggestion.addEventListener("click", openLineSuggestionModal);
openComposer.addEventListener("click", openComposerModal);
jumpNewest.addEventListener("click", jumpToNewest);
jumpTopUp.addEventListener("click", () => jumpToMostVoted("up"));
jumpTopDown.addEventListener("click", () => jumpToMostVoted("down"));
closeRanking.addEventListener("click", closeRankingPanel);
openReportNote.addEventListener("click", openReportModal);
upvoteButton.addEventListener("click", () => submitVote("up"));
downvoteButton.addEventListener("click", () => submitVote("down"));
textMode.addEventListener("click", () => setMode("text"));
drawMode.addEventListener("click", () => setMode("draw"));
titleInput.addEventListener("input", updateTitleCounter);
messageInput.addEventListener("input", updateCounters);
reportReasonInput.addEventListener("input", updateReportReasonCounter);
lineSuggestionTitleInput.addEventListener("input", updateLineSuggestionCounters);
lineSuggestionReasonInput.addEventListener("input", updateLineSuggestionCounters);
composerForm.addEventListener("submit", saveCurrentNote);
reportForm.addEventListener("submit", submitNoteReport);
lineSuggestionForm.addEventListener("submit", submitLineSuggestion);
clearCanvas.addEventListener("click", resetCanvas);
brushSize.addEventListener("input", updateThickness);
customColor.addEventListener("input", () => setActiveColor(customColor.value));
toolButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTool(button.dataset.tool));
});
drawCanvas.addEventListener("pointerdown", startDrawing);
drawCanvas.addEventListener("pointermove", continueDrawing);
drawCanvas.addEventListener("pointerup", stopDrawing);
drawCanvas.addEventListener("pointerleave", () => {
  isDrawing = false;
  lastPoint = null;
  shapeStartPoint = null;
  canvasSnapshot = null;
});

document.querySelectorAll("[data-close-reader]").forEach((element) => element.addEventListener("click", closeReader));
document.querySelectorAll("[data-close-composer]").forEach((element) => element.addEventListener("click", closeComposer));
document.querySelectorAll("[data-close-report]").forEach((element) => element.addEventListener("click", () => closeReportModal()));
document
  .querySelectorAll("[data-close-line-suggestion]")
  .forEach((element) => element.addEventListener("click", () => closeLineSuggestionModal()));
linePicker.addEventListener("click", (event) => {
  if (event.target === linePicker) {
    closeLinePickerView();
  }
});
linePickerList.addEventListener("scroll", syncLinePickerScrollScribble);

inkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveColor(button.dataset.color);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!reportModal.classList.contains("hidden")) {
      closeReportModal();
      return;
    }
    if (!lineSuggestionModal.classList.contains("hidden")) {
      closeLineSuggestionModal();
      return;
    }
    if (linePickerIsOpen()) {
      closeLinePickerView();
      return;
    }
    closeReader();
    closeComposer();
    closeRankingPanel();
  }
});

window.addEventListener("resize", () => {
  if (!drawingPanel.classList.contains("hidden")) fitCanvas();
  if (linePickerIsOpen()) renderLinePicker();
  updateCordPath();
  setVirtualScroll(targetVirtualScroll);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopNotesSubscription();
  } else {
    loadNotes({ quiet: true });
  }
});

document.addEventListener("pointerdown", unlockSounds, { once: true, capture: true });
document.addEventListener("keydown", unlockSounds, { once: true, capture: true });

wireScrolling();
setWorldWidth(BASE_WORLD_WIDTH);
setActiveTool("pen");
setActiveColor("#2d2d2a");
updateThickness();
updateLineContext();
renderLinePicker();
updateTitleCounter();
updateCounters();
updateReportReasonCounter();
updateLineSuggestionCounters();
fitCanvas();
syncCooldownUI();
loadNotes({ resetScroll: true });
openLinePickerView({ skipSceneTransition: true });
