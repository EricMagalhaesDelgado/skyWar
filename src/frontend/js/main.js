import { clearBattleHistory, fetchBattleHistory, registerBattle } from "/js/api.js";

const arena = document.querySelector("#arena");
const announcement = document.querySelector("#announcement");
const historyList = document.querySelector("#history-list");
const planeTop = document.querySelector("#plane-top");
const planeBottom = document.querySelector("#plane-bottom");
const labelTop = document.querySelector("#label-top");
const labelBottom = document.querySelector("#label-bottom");
const setupForm = document.querySelector("#setup-form");
const fighterTopInput = document.querySelector("#fighter-top");
const fighterBottomInput = document.querySelector("#fighter-bottom");
const clearHistoryButton = document.querySelector("#clear-history-button");
const historyModal = document.querySelector("#history-modal");
const historyModalCancel = document.querySelector("#history-modal-cancel");
const historyModalConfirm = document.querySelector("#history-modal-confirm");
const battleOverlay = document.querySelector("#battle-overlay");
const settingsButton = document.querySelector("#settings-button");
const settingsModal = document.querySelector("#settings-modal");
const languageSelect = document.querySelector("#language-select");

let translations = {};
let currentLanguage = localStorage.getItem("skywar-language") || "pt";

const BOARD = {
  leftLimit: 8,
  rightLimit: 92,
  moveStep: 4,
  bulletSpeed: 7,
  bulletSymbol: "●",
};

const MOVE_SPEED_FACTOR = 0.35;
let BULLET_CAP_CURRENT = 3;
const BULLET_CAP_GROWTH_INTERVAL_MS = 5000;
const BULLET_CAP_MAX = 8;

const PLANE = {
  width: 96,
  height: 18,
  topY: 34,
  bottomOffset: 34,
  centerX: 50,
};

let lastHistoryVerbIndex = -1;
let audioContext = null;
let bulletCapTimerId = null;
const pressedKeys = new Set();

const state = {
  running: false,
  locked: false,
  fighterTop: "",
  fighterBottom: "",
  planes: {
    top: { x: PLANE.centerX, y: PLANE.topY, direction: 1, bullets: [] },
    bottom: { x: PLANE.centerX, y: null, direction: -1, bullets: [] },
  },
  animationFrameId: null,
};

/*---------------------------------------------------------------------------------*/
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/*---------------------------------------------------------------------------------*/
function setAnnouncement(message) {
  announcement.textContent = message;
}

/*---------------------------------------------------------------------------------*/
function updateLabels() {
  labelTop.textContent = state.fighterTop || t("waiting_state");
  labelBottom.textContent = state.fighterBottom || t("waiting_state");
}

/*---------------------------------------------------------------------------------*/
function createBulletElement(slot) {
  const bullet = document.createElement("div");
  bullet.className = "bullet";
  bullet.dataset.slot = slot;
  bullet.textContent = BOARD.bulletSymbol;
  arena.appendChild(bullet);
  return bullet;
}

/*---------------------------------------------------------------------------------*/
function createExplosionElement(x, y, variant = "default") {
  const explosion = document.createElement("div");
  explosion.className = variant === "impact" ? "explosion explosion--impact" : "explosion";
  explosion.style.left = `${x}px`;
  explosion.style.top = `${y}px`;
  arena.appendChild(explosion);

  window.setTimeout(() => {
    explosion.remove();
  }, variant === "impact" ? 520 : 280);
}

/*---------------------------------------------------------------------------------*/
function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

/*---------------------------------------------------------------------------------*/
function playVictoryFanfare() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const startTime = context.currentTime + 0.02;
  const notes = [
    { offset: 0, frequency: 523.25 },
    { offset: 0.16, frequency: 659.25 },
    { offset: 0.32, frequency: 783.99 },
    { offset: 0.52, frequency: 1046.5 },
  ];

  notes.forEach((note, index) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(note.frequency, startTime + note.offset);
    oscillator.frequency.exponentialRampToValueAtTime(note.frequency * 1.12, startTime + note.offset + 0.11);

    gainNode.gain.setValueAtTime(0.0001, startTime + note.offset);
    gainNode.gain.exponentialRampToValueAtTime(0.22 - index * 0.02, startTime + note.offset + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + note.offset + 0.14);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startTime + note.offset);
    oscillator.stop(startTime + note.offset + 0.16);
  });
}

/*---------------------------------------------------------------------------------*/
function removeBullet(slot, bullet) {
  bullet.element.remove();
  const bullets = state.planes[slot].bullets;
  const bulletIndex = bullets.indexOf(bullet);

  if (bulletIndex >= 0) {
    bullets.splice(bulletIndex, 1);
  }
}

/*---------------------------------------------------------------------------------*/
function clearAllBullets() {
  for (const slot of ["top", "bottom"]) {
    for (const bullet of [...state.planes[slot].bullets]) {
      removeBullet(slot, bullet);
    }
  }
}

/*---------------------------------------------------------------------------------*/
function renderPlanes() {
  planeTop.style.left = `${state.planes.top.x}%`;
  planeBottom.style.left = `${state.planes.bottom.x}%`;
}

/*---------------------------------------------------------------------------------*/
function renderBullets() {
  for (const slot of ["top", "bottom"]) {
    for (const bullet of state.planes[slot].bullets) {
      bullet.element.style.left = `${bullet.x}%`;
      bullet.element.style.top = `${bullet.y}px`;
    }
  }
}

/*---------------------------------------------------------------------------------*/
function render() {
  renderPlanes();
  renderBullets();
}

/*---------------------------------------------------------------------------------*/
function resetBulletCap() {
  BULLET_CAP_CURRENT = 3;
}

/*---------------------------------------------------------------------------------*/
function startBulletCapGrowth() {
  stopBulletCapGrowth();

  bulletCapTimerId = window.setInterval(() => {
    if (BULLET_CAP_CURRENT >= BULLET_CAP_MAX) {
      stopBulletCapGrowth();
      return;
    }

    BULLET_CAP_CURRENT += 1;

    if (BULLET_CAP_CURRENT >= BULLET_CAP_MAX) {
      stopBulletCapGrowth();
    }
  }, BULLET_CAP_GROWTH_INTERVAL_MS);
}

/*---------------------------------------------------------------------------------*/
function stopBulletCapGrowth() {
  if (bulletCapTimerId !== null) {
    window.clearInterval(bulletCapTimerId);
    bulletCapTimerId = null;
  }
}

/*---------------------------------------------------------------------------------*/
function resetPositions() {
  clearPlaneOutcome();
  state.planes.top.x = PLANE.centerX;
  state.planes.top.y = PLANE.topY;
  state.planes.bottom.x = PLANE.centerX;
  state.planes.bottom.y = arena.clientHeight - PLANE.bottomOffset;
  clearAllBullets();
  render();
}

/*---------------------------------------------------------------------------------*/
function movePlane(slot, delta) {
  if (!state.running || state.locked) {
    return;
  }

  const plane = state.planes[slot];
  plane.x = clamp(plane.x + delta, BOARD.leftLimit, BOARD.rightLimit);
  renderPlanes();
}

/*---------------------------------------------------------------------------------*/
function applyKeyboardMovement() {
  if (!state.running || state.locked) {
    return;
  }

  const topDelta = (pressedKeys.has("d") ? 1 : 0) - (pressedKeys.has("a") ? 1 : 0);
  const bottomDelta = (pressedKeys.has("6") ? 1 : 0) - (pressedKeys.has("4") ? 1 : 0);
  const movementStep = BOARD.moveStep * MOVE_SPEED_FACTOR;

  if (topDelta !== 0) {
    movePlane("top", topDelta * movementStep);
  }

  if (bottomDelta !== 0) {
    movePlane("bottom", bottomDelta * movementStep);
  }
}

/*---------------------------------------------------------------------------------*/
function flashWinner(slot) {
  arena.classList.remove("flash-top", "flash-bottom");
  arena.classList.add(slot === "top" ? "flash-top" : "flash-bottom");
}

/*---------------------------------------------------------------------------------*/
function setPlaneOutcome(winnerSlot) {
  const loserSlot = winnerSlot === "top" ? "bottom" : "top";
  const winnerPlane = winnerSlot === "top" ? planeTop : planeBottom;
  const loserPlane = loserSlot === "top" ? planeTop : planeBottom;

  winnerPlane.classList.add("plane--winner");
  loserPlane.classList.add("plane--defeated");
}

/*---------------------------------------------------------------------------------*/
function clearPlaneOutcome() {
  planeTop.classList.remove("plane--winner", "plane--defeated");
  planeBottom.classList.remove("plane--winner", "plane--defeated");
}

/*---------------------------------------------------------------------------------*/
function animatePlaneToCenter(slot, onComplete) {
  const plane = state.planes[slot];
  const startX = plane.x;
  const targetX = PLANE.centerX;
  const distance = targetX - startX;
  const duration = 900;
  const startTime = performance.now();

  function step(now) {
    const progress = clamp((now - startTime) / duration, 0, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    plane.x = startX + distance * easedProgress;
    renderPlanes();

    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }

    if (typeof onComplete === "function") {
      onComplete();
    }
  }

  requestAnimationFrame(step);
}

/*---------------------------------------------------------------------------------*/
async function finishBattle(winnerSlot) {
  state.running = false;
  state.locked = true;
  cancelAnimationFrame(state.animationFrameId);
  stopBulletCapGrowth();
  flashWinner(winnerSlot);
  setPlaneOutcome(winnerSlot);
  playVictoryFanfare();

  const winnerName = winnerSlot === "top" ? state.fighterTop : state.fighterBottom;
  setAnnouncement(t("battle_won", { winner: winnerName }));

  animatePlaneToCenter(winnerSlot);
  
  showVictoryMessage(winnerName);
  
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });
  
  battleOverlay.textContent = "";
  battleOverlay.classList.add("battle-overlay-hidden");
  battleOverlay.classList.remove("victory-message");
  
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
  
  document.querySelector(".page-shell").classList.remove("fullscreen-mode");

  try {
    await registerBattle({
      fighter_top: state.fighterTop,
      fighter_bottom: state.fighterBottom,
      winner_name: winnerName,
      winner_slot: winnerSlot,
    });
    await loadHistory();
  } catch (error) {
    setAnnouncement(t("battle_registration_error", { winner: winnerName, error: error.message }));
  }
}

/*---------------------------------------------------------------------------------*/
function detectHit(bullet, attackerSlot) {
  const targetSlot = attackerSlot === "top" ? "bottom" : "top";
  const targetElement = targetSlot === "top" ? planeTop : planeBottom;
  const bulletRect = bullet.element.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();

  return !(
    bulletRect.right < targetRect.left ||
    bulletRect.left > targetRect.right ||
    bulletRect.bottom < targetRect.top ||
    bulletRect.top > targetRect.bottom
  );
}

/*---------------------------------------------------------------------------------*/
function detectBulletCollision(topBullet, bottomBullet) {
  const topRect = topBullet.element.getBoundingClientRect();
  const bottomRect = bottomBullet.element.getBoundingClientRect();

  return !(
    topRect.right < bottomRect.left ||
    topRect.left > bottomRect.right ||
    topRect.bottom < bottomRect.top ||
    topRect.top > bottomRect.bottom
  );
}

/*---------------------------------------------------------------------------------*/
function spawnCollisionExplosion(rectA, rectB, variant = "default") {
  const arenaRect = arena.getBoundingClientRect();
  const x = (Math.max(rectA.left, rectB.left) + Math.min(rectA.right, rectB.right)) / 2;
  const y = (Math.max(rectA.top, rectB.top) + Math.min(rectA.bottom, rectB.bottom)) / 2;
  createExplosionElement(x - arenaRect.left, y - arenaRect.top, variant);
}

/*---------------------------------------------------------------------------------*/
function resolveBulletCollision(topBullet, bottomBullet) {
  const topRect = topBullet.element.getBoundingClientRect();
  const bottomRect = bottomBullet.element.getBoundingClientRect();

  spawnCollisionExplosion(topRect, bottomRect);
  removeBullet("top", topBullet);
  removeBullet("bottom", bottomBullet);
}

/*---------------------------------------------------------------------------------*/
function resolvePlaneHit(bullet, slot) {
  const targetSlot = slot === "top" ? "bottom" : "top";
  const bulletRect = bullet.element.getBoundingClientRect();
  const targetRect = (targetSlot === "top" ? planeTop : planeBottom).getBoundingClientRect();

  spawnCollisionExplosion(bulletRect, targetRect, "impact");
  clearAllBullets();
  finishBattle(slot);
}

/*---------------------------------------------------------------------------------*/
function animate() {
  if (!state.running) {
    return;
  }

  applyKeyboardMovement();

  for (const slot of ["top", "bottom"]) {
    for (const bullet of [...state.planes[slot].bullets]) {
      bullet.y += BOARD.bulletSpeed * state.planes[slot].direction;

      if (detectHit(bullet, slot)) {
        resolvePlaneHit(bullet, slot);
        return;
      }

      if (bullet.y < 0 || bullet.y > arena.clientHeight) {
        removeBullet(slot, bullet);
      }
    }
  }

  for (const topBullet of [...state.planes.top.bullets]) {
    for (const bottomBullet of [...state.planes.bottom.bullets]) {
      if (detectBulletCollision(topBullet, bottomBullet)) {
        resolveBulletCollision(topBullet, bottomBullet);
      }
    }
  }

  renderBullets();
  state.animationFrameId = requestAnimationFrame(animate);
}

/*---------------------------------------------------------------------------------*/
function shoot(slot) {
  const plane = state.planes[slot];

  if (!state.running || state.locked || plane.bullets.length >= BULLET_CAP_CURRENT) {
    return;
  }

  const startY = slot === "top" ? plane.y + PLANE.height + 8 : plane.y - 8;
  const bullet = {
    x: plane.x,
    y: startY,
    element: createBulletElement(slot),
  };

  plane.bullets.push(bullet);
  renderBullets();
}

/*---------------------------------------------------------------------------------*/
function sanitizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

/*---------------------------------------------------------------------------------*/
function getNextHistoryVerb() {
  const verbs = translations[currentLanguage]?.history_verbs || [];
  if (verbs.length === 0) return "";
  lastHistoryVerbIndex = (lastHistoryVerbIndex + 1) % verbs.length;
  return verbs[lastHistoryVerbIndex];
}

/*---------------------------------------------------------------------------------*/
function openHistoryModal() {
  historyModal.classList.remove("modal-hidden");
  historyModal.setAttribute("aria-hidden", "false");
  historyModalCancel.focus();
}

/*---------------------------------------------------------------------------------*/
function closeHistoryModal() {
  historyModal.classList.add("modal-hidden");
  historyModal.setAttribute("aria-hidden", "true");
  clearHistoryButton.focus();
}

/*---------------------------------------------------------------------------------*/
function isHistoryModalOpen() {
  return !historyModal.classList.contains("modal-hidden");
}

/*---------------------------------------------------------------------------------*/
function t(key, replacements = {}) {
  let text = translations[currentLanguage]?.[key] || key;
  
  for (const [placeholder, value] of Object.entries(replacements)) {
    text = text.replace(`{${placeholder}}`, value);
  }
  
  return text;
}

/*---------------------------------------------------------------------------------*/
function updatePageText() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    
    // For labels with input children, preserve the input element
    if (element.tagName === "LABEL" && element.querySelector("input")) {
      const input = element.querySelector("input");
      let labelText = t(key);
      element.innerHTML = `${labelText}\n            `;
      element.appendChild(input);
      
      if (input.id === "fighter-top") {
        input.placeholder = t("fighter_top_placeholder");
      } else if (input.id === "fighter-bottom") {
        input.placeholder = t("fighter_bottom_placeholder");
      }
    } else {
      // For all other elements, just update text
      element.textContent = t(key);
    }
  });

  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }

  updateLabels();
}

/*---------------------------------------------------------------------------------*/
function openSettingsModal() {
  settingsModal.classList.remove("modal-hidden");
  settingsModal.setAttribute("aria-hidden", "false");
  languageSelect.focus();
}

/*---------------------------------------------------------------------------------*/
function closeSettingsModal() {
  settingsModal.classList.add("modal-hidden");
  settingsModal.setAttribute("aria-hidden", "true");
  settingsButton.focus();
}

/*---------------------------------------------------------------------------------*/
function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("skywar-language", lang);
  lastHistoryVerbIndex = -1;
  updatePageText();
  loadHistory();
  closeSettingsModal();
}

/*---------------------------------------------------------------------------------*/
async function loadTranslations() {
  try {
    const response = await fetch("/assets/translations.json");
    translations = await response.json();
    updatePageText();
  } catch (error) {
    console.error("Failed to load translations:", error);
  }
}

/*---------------------------------------------------------------------------------*/
function showCountdown() {
  return new Promise((resolve) => {
    battleOverlay.classList.remove("battle-overlay-hidden");
    let count = 3;

    const countInterval = setInterval(() => {
      battleOverlay.textContent = count;
      count--;

      if (count < 0) {
        clearInterval(countInterval);
        battleOverlay.classList.add("battle-overlay-hidden");
        resolve();
      }
    }, 1000);
  });
}

/*---------------------------------------------------------------------------------*/
function showVictoryMessage(winnerName) {
  battleOverlay.textContent = t("battle_won_message", { winner: winnerName });
  battleOverlay.classList.add("victory-message");
  battleOverlay.classList.remove("battle-overlay-hidden");
}

/*---------------------------------------------------------------------------------*/
async function startBattle(fighterTop, fighterBottom) {
  state.fighterTop = fighterTop;
  state.fighterBottom = fighterBottom;
  state.locked = true;
  state.running = false;
  resetBulletCap();
  arena.classList.remove("flash-top", "flash-bottom");
  battleOverlay.textContent = "";
  battleOverlay.classList.remove("victory-message");
  document.querySelector(".page-shell").classList.add("fullscreen-mode");
  updateLabels();
  resetPositions();
  setAnnouncement(t("battle_started", { top: fighterTop, bottom: fighterBottom }));
  
  await showCountdown();
  
  state.locked = false;
  state.running = true;
  cancelAnimationFrame(state.animationFrameId);
  startBulletCapGrowth();
  state.animationFrameId = requestAnimationFrame(animate);
}

/*---------------------------------------------------------------------------------*/
function handleKeydown(event) {
  const target = event.target;
  const isEditableField = target instanceof HTMLElement && (
    target.matches("input, textarea, select") || target.isContentEditable
  );

  if (isEditableField) {
    return;
  }

  const key = event.key.toLowerCase();

  if (["a", "s", "d", "4", "5", "6"].includes(key)) {
    event.preventDefault();
  }

  if (["a", "d", "4", "6"].includes(key)) {
    pressedKeys.add(key);
  }

  switch (key) {
    case "s":
      shoot("top");
      break;
    case "5":
      shoot("bottom");
      break;
    default:
      break;
  }
}

/*---------------------------------------------------------------------------------*/
function handleKeyup(event) {
  const key = event.key.toLowerCase();

  if (["a", "d", "4", "6"].includes(key)) {
    pressedKeys.delete(key);
  }
}

/*---------------------------------------------------------------------------------*/
async function abandonBattle() {
  if (!state.running || state.locked) {
    return;
  }

  state.running = false;
  state.locked = true;
  cancelAnimationFrame(state.animationFrameId);
  stopBulletCapGrowth();
  clearAllBullets();
  clearPlaneOutcome();
  setAnnouncement(t("battle_abandoned"));

  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  document.querySelector(".page-shell").classList.remove("fullscreen-mode");
}

/*---------------------------------------------------------------------------------*/
function renderHistoryItem(battle) {
  const item = document.createElement("article");
  item.className = "history-item";

  const createdAt = new Date(battle.created_at).toLocaleString("pt-BR");
  const loserName = battle.winner_slot === "top" ? battle.fighter_bottom : battle.fighter_top;
  const verb = getNextHistoryVerb();

  item.innerHTML = `
    <p>${battle.winner_name} ${verb} ${loserName}</p>
    <time datetime="${battle.created_at}">${createdAt}</time>
  `;

  return item;
}

/*---------------------------------------------------------------------------------*/
async function loadHistory() {
  try {
    const history = await fetchBattleHistory();
    historyList.innerHTML = "";

    if (!history.length) {
      historyList.innerHTML = `<div class="history-empty">${t("no_history")}</div>`;
      return;
    }

    history.forEach((battle) => {
      historyList.appendChild(renderHistoryItem(battle));
    });
  } catch (error) {
    historyList.innerHTML = `<div class="history-empty">${error.message}</div>`;
  }
}

/*---------------------------------------------------------------------------------*/
async function handleClearHistory() {
  openHistoryModal();
}

/*---------------------------------------------------------------------------------*/
async function confirmClearHistory() {
  clearHistoryButton.disabled = true;
  historyModalConfirm.disabled = true;

  try {
    await clearBattleHistory();
    await loadHistory();
    setAnnouncement(t("history_cleared"));
  } catch (error) {
    setAnnouncement(error.message);
  } finally {
    historyModalConfirm.disabled = false;
    clearHistoryButton.disabled = false;
    closeHistoryModal();
  }
}

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fighterTop = sanitizeName(fighterTopInput.value);
  const fighterBottom = sanitizeName(fighterBottomInput.value);

  if (!fighterTop || !fighterBottom) {
    setAnnouncement(t("empty_names_error"));
    return;
  }

  startBattle(fighterTop, fighterBottom);
});

clearHistoryButton.addEventListener("click", handleClearHistory);
historyModalCancel.addEventListener("click", closeHistoryModal);
historyModalConfirm.addEventListener("click", confirmClearHistory);

historyModal.addEventListener("click", (event) => {
  if (event.target === historyModal) {
    closeHistoryModal();
  }
});

window.addEventListener("keydown", handleKeydown);
window.addEventListener("keyup", handleKeyup);
window.addEventListener("resize", () => {
  if (!arena.clientHeight) {
    return;
  }

  state.planes.bottom.y = arena.clientHeight - PLANE.bottomOffset;
  if (!state.running) {
    render();
  }
});

window.addEventListener("blur", () => {
  pressedKeys.clear();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (isHistoryModalOpen()) {
      closeHistoryModal();
    } else if (!settingsModal.classList.contains("modal-hidden")) {
      closeSettingsModal();
    } else if (state.running && !state.locked) {
      abandonBattle();
    }
  }
});

settingsButton.addEventListener("click", openSettingsModal);
languageSelect.addEventListener("change", (event) => {
  changeLanguage(event.target.value);
});

settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    closeSettingsModal();
  }
});

loadTranslations().then(() => {
  updateLabels();
  resetPositions();
  loadHistory();
});