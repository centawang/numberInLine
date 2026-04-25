/**
 * numberInLine – game logic
 *
 * Gameplay:
 *   1. Numbers 1‑N are shuffled and shown as tiles at the bottom.
 *   2. The number line at the top shows N empty slots (1 per position).
 *   3. Kids drag a tile onto the matching slot, OR click a tile then click a slot.
 *   4. Correct placements turn green; wrong placements shake red.
 *   5. Finishing all numbers triggers the win screen.
 *   6. A Hint button briefly reveals the next expected number on the line.
 */

'use strict';

// ─── Configuration ────────────────────────────────────────────────────────────

const LEVELS = [
  { label: 'Level 1 – 1 to 5',  min: 1, max: 5  },
  { label: 'Level 2 – 1 to 10', min: 1, max: 10 },
];
let currentLevel = 0;
let score = 0;

// ─── State ────────────────────────────────────────────────────────────────────

let numbers = [];        // ordered array for this round, e.g. [1,2,3,4,5]
let placed  = new Set(); // numbers already correctly placed
let selected = null;     // currently click-selected tile element (or null)

// ─── DOM helpers ──────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ─── Build / reset the board ─────────────────────────────────────────────────

function buildBoard() {
  const { min, max } = LEVELS[currentLevel];
  numbers = [];
  for (let i = min; i <= max; i++) numbers.push(i);
  placed.clear();
  selected = null;

  // --- Number line (slots) ---
  const lineEl = $('number-line');
  lineEl.innerHTML = '';
  numbers.forEach(n => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.value = n;
    slot.setAttribute('aria-label', `Slot for number ${n}`);

    // Drag-and-drop target events
    slot.addEventListener('dragover',  onSlotDragOver);
    slot.addEventListener('dragleave', onSlotDragLeave);
    slot.addEventListener('drop',      onSlotDrop);

    // Click target
    slot.addEventListener('click', () => onSlotClick(slot));

    lineEl.appendChild(slot);
  });

  // --- Scrambled tiles ---
  const scrambled = shuffle([...numbers]);
  const areaEl = $('scramble-area');
  areaEl.innerHTML = '';
  scrambled.forEach(n => {
    const tile = document.createElement('div');
    tile.className = `number-tile tile-${n}`;
    tile.textContent = n;
    tile.dataset.value = n;
    tile.draggable = true;
    tile.setAttribute('aria-label', `Number ${n}`);
    tile.setAttribute('tabindex', '0');

    tile.addEventListener('dragstart', onTileDragStart);
    tile.addEventListener('dragend',   onTileDragEnd);
    tile.addEventListener('click',     () => onTileClick(tile));
    tile.addEventListener('keydown',   e => { if (e.key === 'Enter' || e.key === ' ') onTileClick(tile); });

    areaEl.appendChild(tile);
  });

  setFeedback('');
  updateInfo();
}

// ─── Shuffle utility ─────────────────────────────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Attempt to place a number in a slot ─────────────────────────────────────

function attemptPlace(tileEl, slotEl) {
  const tileVal = Number(tileEl.dataset.value);
  const slotVal = Number(slotEl.dataset.value);

  if (tileVal === slotVal) {
    // ✅ Correct
    slotEl.textContent = tileVal;
    slotEl.classList.add('correct');
    slotEl.style.color = '#fff';
    // The drag/drop and click handlers all guard on the 'correct' class,
    // so no explicit removeEventListener is needed.

    tileEl.classList.add('placed');

    placed.add(tileVal);
    score += 10;
    updateInfo();
    setFeedback(`✅ ${tileVal} is correct! Great job!`, 'success');

    if (placed.size === numbers.length) {
      setTimeout(showWin, 700);
    }
  } else {
    // ❌ Wrong
    slotEl.classList.add('wrong');
    tileEl.classList.add('wrong');
    setFeedback(`❌ Oops! ${tileVal} doesn't go there. Try again!`, 'error');
    setTimeout(() => {
      slotEl.classList.remove('wrong');
      tileEl.classList.remove('wrong');
    }, 500);
  }

  // Deselect tile
  deselectTile();
}

// ─── Drag-and-drop handlers ──────────────────────────────────────────────────

let draggingTile = null;

function onTileDragStart(e) {
  draggingTile = e.currentTarget;
  draggingTile.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onTileDragEnd() {
  if (draggingTile) draggingTile.classList.remove('dragging');
  draggingTile = null;
}

function onSlotDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function onSlotDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onSlotDrop(e) {
  e.preventDefault();
  const slotEl = e.currentTarget;
  slotEl.classList.remove('drag-over');
  if (!draggingTile) return;
  if (slotEl.classList.contains('correct')) return;
  attemptPlace(draggingTile, slotEl);
}

// ─── Click-to-select handlers ────────────────────────────────────────────────

function onTileClick(tileEl) {
  if (tileEl.classList.contains('placed')) return;

  if (selected === tileEl) {
    deselectTile();
    return;
  }
  deselectTile();
  selected = tileEl;
  tileEl.style.outline = '4px solid #4a2c8a';
  tileEl.style.outlineOffset = '3px';
  setFeedback(`You picked ${tileEl.dataset.value}. Now tap the right spot on the line!`);
}

function onSlotClick(slotEl) {
  if (slotEl.classList.contains('correct')) return;
  if (!selected) {
    setFeedback('👆 First tap a number tile below, then tap its spot on the line!');
    return;
  }
  attemptPlace(selected, slotEl);
}

function deselectTile() {
  if (selected) {
    selected.style.outline = '';
    selected.style.outlineOffset = '';
    selected = null;
  }
}

// ─── Hint ────────────────────────────────────────────────────────────────────

function showHint() {
  // Find the lowest number not yet placed
  const next = numbers.find(n => !placed.has(n));
  if (next === undefined) return;

  const slotEl = document.querySelector(`.slot[data-value="${next}"]`);
  if (!slotEl) return;

  slotEl.style.background = '#f9ca24';
  slotEl.style.borderColor = '#f0932b';
  setFeedback(`💡 Hint: look for number ${next}!`);
  setTimeout(() => {
    slotEl.style.background = '';
    slotEl.style.borderColor = '';
  }, 1200);
}

// ─── Win screen ───────────────────────────────────────────────────────────────

function showWin() {
  $('win-score').textContent = score;
  const nextLevelIdx = currentLevel + 1;
  const nextBtn = $('btn-next-level');
  if (nextLevelIdx < LEVELS.length) {
    nextBtn.textContent = `➡️ ${LEVELS[nextLevelIdx].label}`;
    nextBtn.style.display = '';
  } else {
    nextBtn.style.display = 'none';
  }
  $('win-overlay').classList.add('show');
}

function closeWin() {
  $('win-overlay').classList.remove('show');
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function setFeedback(msg, type) {
  const el = $('feedback');
  el.textContent = msg;
  el.className = 'feedback' + (type ? ` ${type}` : '');
}

function updateInfo() {
  $('info-level').textContent = LEVELS[currentLevel].label;
  $('info-score').textContent = `Score: ${score}`;
}

// ─── Button wiring ────────────────────────────────────────────────────────────

$('btn-new-game').addEventListener('click', () => {
  score = 0;
  currentLevel = 0;
  buildBoard();
});

$('btn-hint').addEventListener('click', showHint);

$('btn-next-level').addEventListener('click', () => {
  currentLevel++;
  closeWin();
  buildBoard();
});

$('btn-play-again').addEventListener('click', () => {
  closeWin();
  buildBoard();
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

buildBoard();
