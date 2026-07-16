const app = document.querySelector(".farm-app-f4");
const stage = document.querySelector(".farm-stage-f4");
const actors = Array.from(document.querySelectorAll(".actor-f3"));
const chicks = actors.filter((actor) => actor.dataset.kind === "chick");
const farmer = actors.find((actor) => actor.dataset.kind === "farmer");
const mother = actors.find((actor) => actor.dataset.kind === "mother");
const motionToggle = document.querySelector("[data-motion-toggle]");

const hatcheryWrap = document.querySelector(".hatchery-wrap-f4");
const hatcheryToggle = document.querySelector("[data-hatchery-toggle]");
const addIncubatingButton = document.querySelector("[data-add-incubating]");
const eggSlots = Array.from(document.querySelectorAll("[data-egg-slot]"));
const eggCountElements = document.querySelectorAll("[data-egg-count]");
const incubatingCountElements = document.querySelectorAll("[data-incubating-count]");
const hatcheryStatus = document.querySelector("[data-hatchery-status]");
const hatcheryCopy = document.querySelector("[data-hatchery-copy]");

const kitchenPanel = document.querySelector("[data-kitchen-panel]");
const kitchenBackdrop = document.querySelector("[data-kitchen-backdrop]");
const kitchenAction = document.querySelector("[data-kitchen-action]");
const kitchenCopy = document.querySelector("[data-kitchen-copy]");
const eggChoiceView = document.querySelector("[data-egg-choices]");
const cookView = document.querySelector("[data-cook-view]");
const chooseHatchButton = document.querySelector("[data-choose-hatch]");
const chooseCookButton = document.querySelector("[data-choose-cook]");
const backChoicesButton = document.querySelector("[data-back-choices]");
const hatchChoiceCopy = document.querySelector("[data-hatch-choice-copy]");
const eggFeedback = document.querySelector("[data-egg-feedback]");
const rescueWrap = document.querySelector(".rescue-wrap-f4");
const rescueToggle = document.querySelector("[data-rescue-toggle]");

let eggStock = 3;
let incubating = 1;
let cookingState = "empty";
let motionPaused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let interactionRunning = false;
let specialVisitRunning = false;
let interactionTimer;
let visitTimer;

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const random = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const chickHomes = [
  [32, 292, 360, 525],
  [300, 500, 345, 535],
  [495, 700, 325, 525],
  [710, 940, 325, 535],
  [350, 625, 545, 705],
  [705, 1020, 545, 708],
  [940, 1080, 430, 575],
  [185, 390, 420, 545],
];

function scaleZone(zone) {
  const sx = stage.clientWidth / 1194;
  const sy = stage.clientHeight / 834;
  return { minX: zone[0] * sx, maxX: zone[1] * sx, minY: zone[2] * sy, maxY: zone[3] * sy };
}

function getZone(actor) {
  if (actor.dataset.kind === "chick" && actor._manualHome) {
    const sx = stage.clientWidth / 1194;
    const sy = stage.clientHeight / 834;
    const minFieldX = 18 * sx;
    const maxFieldX = stage.clientWidth - actor.offsetWidth - 18;
    const minFieldY = 300 * sy;
    const maxFieldY = stage.clientHeight - actor.offsetHeight - 10;
    return {
      minX: clamp(actor._manualHome.x - 82 * sx, minFieldX, maxFieldX),
      maxX: clamp(actor._manualHome.x + 82 * sx, minFieldX, maxFieldX),
      minY: clamp(actor._manualHome.y - 62 * sy, minFieldY, maxFieldY),
      maxY: clamp(actor._manualHome.y + 62 * sy, minFieldY, maxFieldY),
    };
  }
  if (actor.dataset.kind === "chick") return scaleZone(chickHomes[Number(actor.dataset.home) % chickHomes.length]);
  if (actor.dataset.kind === "mother") return scaleZone([560, 790, 470, 635]);
  return scaleZone([760, 975, 445, 625]);
}

function updateDepth(actor, y) {
  actor.style.zIndex = String(18 + Math.round(y / 15));
}

function faceDirection(actor, targetX) {
  const shell = actor.querySelector(".sprite-shell-f3");
  const currentX = actor._position?.x ?? parseFloat(actor.style.left) ?? 0;
  shell.classList.toggle("is-facing-left", targetX < currentX);
}

function syncPosition(actor) {
  const stageRect = stage.getBoundingClientRect();
  const actorRect = actor.getBoundingClientRect();
  const x = actorRect.left - stageRect.left;
  const y = actorRect.top - stageRect.top;
  actor._animation?.cancel();
  actor._animation = null;
  actor._position = { x, y };
  actor.style.left = `${x}px`;
  actor.style.top = `${y}px`;
  updateDepth(actor, y);
}

async function moveActor(actor, target, duration = random(9000, 15000)) {
  if (motionPaused) return;
  const start = actor._position ?? { x: parseFloat(actor.style.left) || 0, y: parseFloat(actor.style.top) || 0 };
  faceDirection(actor, target.x);
  actor.classList.add("is-walking");
  actor._animation?.cancel();
  actor._animation = actor.animate(
    [{ left: `${start.x}px`, top: `${start.y}px` }, { left: `${target.x}px`, top: `${target.y}px` }],
    { duration, easing: "ease-in-out", fill: "forwards" },
  );

  try {
    await actor._animation.finished;
  } catch {
    actor.classList.remove("is-walking");
    return;
  }

  actor.style.left = `${target.x}px`;
  actor.style.top = `${target.y}px`;
  actor._position = target;
  actor._animation = null;
  actor.classList.remove("is-walking");
  updateDepth(actor, target.y);
}

function targetIsSeparate(actor, target) {
  const chickThreshold = clamp(108 - Math.max(0, chicks.length - 8) * 2, 54, 108);
  const threshold = actor.dataset.kind === "chick" ? chickThreshold : 145;
  const centerX = target.x + actor.offsetWidth / 2;
  const centerY = target.y + actor.offsetHeight / 2;
  return actors.every((other) => {
    if (other === actor || !other._position) return true;
    const otherX = other._position.x + other.offsetWidth / 2;
    const otherY = other._position.y + other.offsetHeight / 2;
    return Math.hypot(centerX - otherX, centerY - otherY) >= threshold;
  });
}

function positionIsBlocked(actor, target) {
  if (actor.dataset.kind !== "chick") return false;
  const insetX = actor.offsetWidth * .17;
  const insetTop = actor.offsetHeight * .12;
  const insetBottom = actor.offsetHeight * .08;
  const actorBox = {
    left: target.x + insetX,
    right: target.x + actor.offsetWidth - insetX,
    top: target.y + insetTop,
    bottom: target.y + actor.offsetHeight - insetBottom,
  };
  const obstacles = [
    { element: document.querySelector(".task-board-f3"), topInset: 0 },
    // 孵化棚图片顶部约 15.6% 是透明画布，不应形成看不见的空气墙。
    { element: hatcheryWrap, topInset: hatcheryWrap.offsetHeight * (196 / 1254) },
    { element: rescueWrap, topInset: 0 },
  ];
  return obstacles.some(({ element, topInset }) => {
    const padding = 2;
    const box = {
      left: element.offsetLeft - padding,
      right: element.offsetLeft + element.offsetWidth + padding,
      top: element.offsetTop + topInset - padding,
      bottom: element.offsetTop + element.offsetHeight + padding,
    };
    return actorBox.right > box.left && actorBox.left < box.right && actorBox.bottom > box.top && actorBox.top < box.bottom;
  });
}

function randomTarget(actor) {
  const zone = getZone(actor);
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const candidate = { x: random(zone.minX, zone.maxX), y: random(zone.minY, zone.maxY) };
    if (!positionIsBlocked(actor, candidate) && targetIsSeparate(actor, candidate)) return candidate;
  }
  return actor._position ?? { x: zone.minX, y: zone.minY };
}

async function wanderLoop(actor, token) {
  while (!motionPaused && actor._wanderToken === token) {
    await wait(random(2600, 5600));
    if (motionPaused || actor.dataset.busy === "true" || actor._wanderToken !== token) continue;
    await moveActor(actor, randomTarget(actor), random(9200, 15800));
    if (motionPaused || actor.dataset.busy === "true" || actor._wanderToken !== token) continue;
    if (Math.random() < 0.24) {
      const gesture = actor.dataset.kind === "farmer" ? "gesture-wave" : actor.dataset.kind === "mother" ? "gesture-wiggle" : "gesture-hop";
      actor.classList.add(gesture);
      await wait(1000);
      actor.classList.remove(gesture);
    }
  }
}

function startWander(actor) {
  actor._wanderToken = (actor._wanderToken || 0) + 1;
  wanderLoop(actor, actor._wanderToken);
}

function stopActor(actor) {
  actor._wanderToken = (actor._wanderToken || 0) + 1;
  actor.dataset.busy = "true";
  syncPosition(actor);
}

function releaseActor(actor) {
  actor.dataset.busy = "false";
  startWander(actor);
}

function setTalk(actor, line, translation) {
  const bubble = actor.querySelector(".actor-talk-f3");
  bubble.innerHTML = `${line}<small>${translation}</small>`;
  actor.classList.add("is-talking");
}

function clearTalk(...targets) {
  (targets.length ? targets : actors).forEach((actor) => actor.classList.remove("is-talking"));
}

function addEmote(x, y, value = "♡") {
  const emote = document.createElement("span");
  emote.className = "interaction-emote-f3";
  emote.textContent = value;
  emote.style.left = `${x}px`;
  emote.style.top = `${y}px`;
  stage.append(emote);
  window.setTimeout(() => emote.remove(), 1600);
}

function chooseInteraction() {
  const pairIndex = Math.floor(Math.random() * chicks.length);
  const chickA = chicks[pairIndex];
  const chickB = chicks[(pairIndex + 2 + Math.floor(Math.random() * 2)) % chicks.length];
  const type = Math.floor(Math.random() * 3);
  if (type === 0) return { a: mother, b: chickA, aLine: ["来抱抱～", "Come here!"], bLine: ["Mama!", "妈妈！"], emote: "♡" };
  if (type === 1) return { a: farmer, b: chickA, aLine: ["一起学新词！", "Let's learn!"], bLine: ["Okay!", "好呀！"], emote: "♪" };
  return { a: chickA, b: chickB, aLine: ["Hello!", "你好！"], bLine: ["Friend!", "朋友！"], emote: "♡" };
}

async function runInteraction() {
  if (motionPaused || interactionRunning || specialVisitRunning) return;
  interactionRunning = true;
  const interaction = chooseInteraction();
  const { a, b } = interaction;
  stopActor(a);
  stopActor(b);

  const aZone = getZone(a);
  const bZone = getZone(b);
  const meetX = clamp((a._position.x + b._position.x) / 2, Math.max(aZone.minX, bZone.minX) - 55, Math.min(aZone.maxX, bZone.maxX) + 55);
  const meetY = clamp((a._position.y + b._position.y) / 2, 465, 625);
  const gap = a.dataset.kind === "chick" && b.dataset.kind === "chick" ? 60 : 82;

  await Promise.all([
    moveActor(a, { x: meetX - gap, y: meetY }, 6200),
    moveActor(b, { x: meetX + gap, y: meetY + 18 }, 6200),
  ]);
  if (motionPaused) {
    clearTalk(a, b);
    releaseActor(a);
    releaseActor(b);
    interactionRunning = false;
    return;
  }

  setTalk(a, interaction.aLine[0], interaction.aLine[1]);
  setTalk(b, interaction.bLine[0], interaction.bLine[1]);
  a.classList.add(a.dataset.kind === "farmer" ? "gesture-wave" : "gesture-wiggle");
  b.classList.add("gesture-hop");
  addEmote(meetX + 60, meetY - 8, interaction.emote);
  await wait(2400);
  clearTalk(a, b);
  a.classList.remove("gesture-wave", "gesture-wiggle", "gesture-hop");
  b.classList.remove("gesture-wave", "gesture-wiggle", "gesture-hop");

  await Promise.all([
    moveActor(a, randomTarget(a), 6500),
    moveActor(b, randomTarget(b), 6500),
  ]);
  releaseActor(a);
  releaseActor(b);
  interactionRunning = false;
}

async function visitHatchery() {
  if (motionPaused || interactionRunning || specialVisitRunning || farmer.dataset.busy === "true") return;
  specialVisitRunning = true;
  stopActor(farmer);
  const scaleX = stage.clientWidth / 1194;
  const scaleY = stage.clientHeight / 834;
  await moveActor(farmer, { x: 270 * scaleX, y: 545 * scaleY }, 8500);
  if (!motionPaused) {
    setTalk(farmer, "小鸡宝宝，慢慢长大哦～", "Grow well, little chick!" );
    farmer.classList.add("gesture-wave");
    const activeEgg = eggSlots.find((slot) => slot.classList.contains("is-incubating"));
    activeEgg?.classList.add("visit-wobble");
    await wait(2800);
    activeEgg?.classList.remove("visit-wobble");
    farmer.classList.remove("gesture-wave");
    clearTalk(farmer);
    await moveActor(farmer, randomTarget(farmer), 9000);
  }
  releaseActor(farmer);
  specialVisitRunning = false;
}

function scheduleInteraction() {
  window.clearTimeout(interactionTimer);
  interactionTimer = window.setTimeout(async () => {
    await runInteraction();
    scheduleInteraction();
  }, random(18000, 28000));
}

function scheduleVisit() {
  window.clearTimeout(visitTimer);
  visitTimer = window.setTimeout(async () => {
    await visitHatchery();
    scheduleVisit();
  }, random(26000, 42000));
}

function updateEggUI() {
  eggCountElements.forEach((element) => { element.textContent = String(eggStock); });
  incubatingCountElements.forEach((element) => { element.textContent = String(incubating); });
  hatcheryStatus.textContent = `${incubating} 颗孵化中`;
  const availableSlots = 3 - incubating;
  hatcheryCopy.textContent = availableSlots > 0 ? `蛋会各自在巢里轻轻晃动，还可以放入 ${availableSlots} 颗。` : "三个巢位都住进了小鸡宝宝，耐心等它们破壳吧。";
  addIncubatingButton.disabled = eggStock === 0 || incubating === 3;
  addIncubatingButton.textContent = incubating === 3 ? "孵化位已满" : eggStock === 0 ? "没有剩余鸡蛋" : "放入一颗鸡蛋孵化";
  chooseHatchButton.disabled = eggStock === 0 || incubating === 3;
  chooseCookButton.disabled = eggStock === 0 && cookingState === "empty";
  hatchChoiceCopy.textContent = incubating === 3 ? "三个巢位都住满了" : `还有 ${availableSlots} 个空巢位`;
}

function showEggChoices() {
  eggChoiceView.hidden = false;
  cookView.hidden = true;
  eggFeedback.textContent = "";
  backChoicesButton.disabled = cookingState !== "empty";
}

function showCookView() {
  eggChoiceView.hidden = true;
  cookView.hidden = false;
  backChoicesButton.disabled = cookingState !== "empty";
  kitchenAction.focus();
}

function openEggPanel() {
  kitchenPanel.hidden = false;
  kitchenBackdrop.hidden = false;
  hatcheryWrap.classList.remove("is-open");
  rescueWrap.classList.remove("is-open");
  if (cookingState === "empty") showEggChoices();
  else showCookView();
}

function closeKitchen() {
  kitchenPanel.hidden = true;
  kitchenBackdrop.hidden = true;
}

function setCookingState(state) {
  cookingState = state;
  kitchenPanel.classList.remove("is-raw", "is-cooking", "is-ready");
  if (state !== "empty") kitchenPanel.classList.add(`is-${state}`);
  backChoicesButton.disabled = state !== "empty";
  updateEggUI();
}

function allocateEggToHatchery() {
  if (eggStock === 0 || incubating === 3) return false;
  const nextSlot = eggSlots.find((slot) => !slot.classList.contains("is-incubating"));
  nextSlot.classList.add("is-incubating", "visit-wobble");
  window.setTimeout(() => nextSlot.classList.remove("visit-wobble"), 1700);
  eggStock -= 1;
  incubating += 1;
  updateEggUI();
  return true;
}

async function feedChick() {
  const target = chicks[Math.floor(Math.random() * chicks.length)];
  const food = document.createElement("img");
  food.className = "flying-food-f4";
  food.src = "assets/fried-egg-f4.png";
  food.alt = "";
  food.style.left = `${stage.clientWidth * .72}px`;
  food.style.top = `${stage.clientHeight * .42}px`;
  stage.append(food);
  const targetX = target._position.x + target.offsetWidth * .35;
  const targetY = target._position.y + target.offsetHeight * .35;
  const animation = food.animate(
    [
      { left: food.style.left, top: food.style.top, transform: "scale(1) rotate(0)" },
      { left: `${targetX}px`, top: `${targetY}px`, transform: "scale(.48) rotate(12deg)" },
    ],
    { duration: 1200, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
  );
  await animation.finished;
  food.remove();
  target.classList.add("gesture-hop");
  setTalk(target, "Yummy!", "好香呀！");
  addEmote(targetX + 35, targetY - 12, "♡");
  await wait(1700);
  target.classList.remove("gesture-hop");
  clearTalk(target);
}

function beginChickDrag(event, actor) {
  if (event.button !== 0 || actor.dataset.busy === "true") return;
  window.clearTimeout(actor._dragResumeTimer);
  stopActor(actor);
  const stageRect = stage.getBoundingClientRect();
  const actorRect = actor.getBoundingClientRect();
  actor._dragState = {
    pointerId: event.pointerId,
    offsetX: event.clientX - actorRect.left,
    offsetY: event.clientY - actorRect.top,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    lastValidPosition: { ...actor._position },
  };
  actor.setPointerCapture(event.pointerId);
  actor.classList.add("is-dragging");
  stage.classList.add("is-dragging-chick");
  event.preventDefault();
}

function moveDraggedChick(event, actor) {
  const drag = actor._dragState;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const stageRect = stage.getBoundingClientRect();
  const sx = stage.clientWidth / 1194;
  const sy = stage.clientHeight / 834;
  const x = clamp(event.clientX - stageRect.left - drag.offsetX, 18 * sx, stage.clientWidth - actor.offsetWidth - 18);
  const y = clamp(event.clientY - stageRect.top - drag.offsetY, 300 * sy, stage.clientHeight - actor.offsetHeight - 10);
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) drag.moved = true;
  actor._position = { x, y };
  if (!positionIsBlocked(actor, actor._position)) drag.lastValidPosition = { ...actor._position };
  actor.style.left = `${x}px`;
  actor.style.top = `${y}px`;
  updateDepth(actor, y);
  event.preventDefault();
}

function endChickDrag(event, actor) {
  const drag = actor._dragState;
  if (!drag || drag.pointerId !== event.pointerId) return;
  actor.releasePointerCapture?.(event.pointerId);
  actor.classList.remove("is-dragging");
  stage.classList.remove("is-dragging-chick");
  if (positionIsBlocked(actor, actor._position)) {
    actor._position = { ...drag.lastValidPosition };
    actor.style.left = `${actor._position.x}px`;
    actor.style.top = `${actor._position.y}px`;
    updateDepth(actor, actor._position.y);
  }
  actor._dragState = null;
  actor.dataset.busy = "false";

  if (drag.moved) {
    actor._manualHome = { ...actor._position };
    actor._draggedUntil = Date.now() + 500;
    setTalk(actor, "Here!", "我在这里散步～");
    actor._dragResumeTimer = window.setTimeout(() => {
      clearTalk(actor);
      if (!motionPaused && actor.dataset.busy !== "true") startWander(actor);
    }, 4200);
  } else if (!motionPaused) {
    actor._dragResumeTimer = window.setTimeout(() => {
      if (actor.dataset.busy !== "true") startWander(actor);
    }, 1800);
  }
}

actors.forEach((actor) => {
  const sx = stage.clientWidth / 1194;
  const sy = stage.clientHeight / 834;
  const x = Number(actor.dataset.x) * sx;
  const y = Number(actor.dataset.y) * sy;
  actor._position = { x, y };
  actor.style.left = `${x}px`;
  actor.style.top = `${y}px`;
  actor.dataset.busy = "false";
  updateDepth(actor, y);

  actor.addEventListener("click", async () => {
    if ((actor._draggedUntil || 0) > Date.now()) return;
    if (motionPaused || actor.dataset.busy === "true") return;
    stopActor(actor);
    clearTalk();
    setTalk(actor, actor.dataset.line, actor.dataset.translation);
    const gesture = actor.dataset.kind === "farmer" ? "gesture-wave" : actor.dataset.kind === "mother" ? "gesture-wiggle" : "gesture-hop";
    actor.classList.add(gesture);
    await wait(1600);
    actor.classList.remove(gesture);
    clearTalk(actor);
    releaseActor(actor);
  });

  if (actor.dataset.kind === "chick") {
    actor.addEventListener("pointerdown", (event) => beginChickDrag(event, actor));
    actor.addEventListener("pointermove", (event) => moveDraggedChick(event, actor));
    actor.addEventListener("pointerup", (event) => endChickDrag(event, actor));
    actor.addEventListener("pointercancel", (event) => endChickDrag(event, actor));
  }
});

hatcheryToggle.addEventListener("click", () => {
  const open = hatcheryWrap.classList.toggle("is-open");
  hatcheryToggle.setAttribute("aria-expanded", String(open));
  rescueWrap.classList.remove("is-open");
});

addIncubatingButton.addEventListener("click", () => {
  allocateEggToHatchery();
});

document.querySelector("[data-open-egg-panel]").addEventListener("click", openEggPanel);
document.querySelector("[data-close-kitchen]").addEventListener("click", closeKitchen);
kitchenBackdrop.addEventListener("click", closeKitchen);

chooseHatchButton.addEventListener("click", () => {
  if (allocateEggToHatchery()) {
    eggFeedback.textContent = `放好啦！现在有 ${incubating} 颗鸡蛋正在孵化。`;
  } else {
    eggFeedback.textContent = incubating === 3 ? "三个巢位都住满啦。" : "鸡蛋已经用完啦。";
  }
});

chooseCookButton.addEventListener("click", () => {
  if (eggStock === 0 && cookingState === "empty") {
    eggFeedback.textContent = "鸡蛋已经用完啦，完成今日学习就能再得到一颗。";
    return;
  }
  showCookView();
});

backChoicesButton.addEventListener("click", () => {
  if (cookingState === "empty") showEggChoices();
});

kitchenAction.addEventListener("click", async () => {
  if (cookingState === "empty") {
    if (eggStock === 0) {
      kitchenCopy.textContent = "鸡蛋已经用完啦，完成今日学习就能再得到一颗。";
      return;
    }
    eggStock -= 1;
    updateEggUI();
    setCookingState("raw");
    kitchenCopy.textContent = "鸡蛋已经进锅啦，点一下开火。";
    kitchenAction.textContent = "开火，慢慢煎一煎";
    return;
  }

  if (cookingState === "raw") {
    setCookingState("cooking");
    kitchenAction.disabled = true;
    kitchenAction.textContent = "正在煎蛋…";
    kitchenCopy.textContent = "滋滋～等蛋白变成漂亮的奶油色。";
    await wait(1900);
    setCookingState("ready");
    kitchenAction.disabled = false;
    kitchenAction.textContent = "喂给一只小鸡";
    kitchenCopy.textContent = "煎好啦！选一只小鸡分享今天的奖励。";
    return;
  }

  if (cookingState === "ready") {
    closeKitchen();
    await feedChick();
    setCookingState("empty");
    kitchenAction.textContent = "放一颗鸡蛋进锅里";
    kitchenCopy.textContent = "锅还是空的。要再拿一颗鸡蛋来煎吗？";
    showEggChoices();
  }
});

rescueToggle.addEventListener("click", () => {
  const open = rescueWrap.classList.toggle("is-open");
  rescueToggle.setAttribute("aria-expanded", String(open));
  hatcheryWrap.classList.remove("is-open");
});

document.querySelector("[data-rescue-action]").addEventListener("click", (event) => {
  event.currentTarget.textContent = "救援补练将在下一屏继续";
});

motionToggle.addEventListener("click", () => {
  motionPaused = !motionPaused;
  app.classList.toggle("motion-paused", motionPaused);
  motionToggle.textContent = motionPaused ? "动效：关" : "动效：开";
  motionToggle.setAttribute("aria-pressed", String(motionPaused));

  actors.forEach((actor) => {
    if (motionPaused) syncPosition(actor);
    else if (actor.dataset.busy !== "true") startWander(actor);
  });

  window.clearTimeout(interactionTimer);
  window.clearTimeout(visitTimer);
  if (!motionPaused) {
    scheduleInteraction();
    scheduleVisit();
  }
});

updateEggUI();

if (motionPaused) {
  app.classList.add("motion-paused");
  motionToggle.textContent = "动效：关";
  motionToggle.setAttribute("aria-pressed", "true");
} else {
  actors.forEach((actor, index) => window.setTimeout(() => startWander(actor), 1000 + index * 380));
  scheduleInteraction();
  scheduleVisit();
}
