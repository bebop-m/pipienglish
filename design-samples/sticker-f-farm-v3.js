const app = document.querySelector(".farm-app-f3");
const stage = document.querySelector(".farm-stage-f3");
const actors = Array.from(document.querySelectorAll(".actor-f3"));
const motionToggle = document.querySelector("[data-motion-toggle]");
const hatchery = document.querySelector(".hatchery-f3");

let motionPaused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let interactionRunning = false;
let interactionTimer;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const random = (min, max) => min + Math.random() * (max - min);

function getZone(actor) {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const actorWidth = actor.offsetWidth;
  const actorHeight = actor.offsetHeight;

  if (actor.dataset.kind === "chick") {
    return {
      minX: 292,
      maxX: width - actorWidth - 20,
      minY: 365,
      maxY: height - actorHeight - 12,
    };
  }

  return {
    minX: 360,
    maxX: width - actorWidth - 20,
    minY: 350,
    maxY: height - actorHeight - 8,
  };
}

function updateDepth(actor, y) {
  actor.style.zIndex = String(18 + Math.round(y / 16));
}

function faceDirection(actor, targetX) {
  const shell = actor.querySelector(".sprite-shell-f3");
  const currentX = actor._position?.x ?? (parseFloat(actor.style.left) || 0);
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

async function moveActor(actor, target, duration = random(3600, 6200)) {
  if (motionPaused) return;

  const start = actor._position ?? {
    x: parseFloat(actor.style.left) || 0,
    y: parseFloat(actor.style.top) || 0,
  };

  faceDirection(actor, target.x);
  actor.classList.add("is-walking");
  actor._animation?.cancel();
  actor._animation = actor.animate(
    [
      { left: `${start.x}px`, top: `${start.y}px` },
      { left: `${target.x}px`, top: `${target.y}px` },
    ],
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

function randomTarget(actor) {
  const zone = getZone(actor);
  return {
    x: random(zone.minX, zone.maxX),
    y: random(zone.minY, zone.maxY),
  };
}

async function wander(actor) {
  if (motionPaused || actor.dataset.busy === "true") return;
  await moveActor(actor, randomTarget(actor));
  if (motionPaused || actor.dataset.busy === "true") return;

  if (Math.random() < 0.32) {
    const gesture = actor.dataset.kind === "farmer" ? "gesture-wave" : actor.dataset.kind === "mother" ? "gesture-wiggle" : "gesture-hop";
    actor.classList.add(gesture);
    await wait(1100);
    actor.classList.remove(gesture);
  }

  window.setTimeout(() => wander(actor), random(900, 2600));
}

function setTalk(actor, line, translation) {
  const bubble = actor.querySelector(".actor-talk-f3");
  bubble.innerHTML = `${line}<small>${translation}</small>`;
  actor.classList.add("is-talking");
}

function clearTalk() {
  actors.forEach((actor) => actor.classList.remove("is-talking"));
}

function addEmote(x, y, value = "♥") {
  const emote = document.createElement("span");
  emote.className = "interaction-emote-f3";
  emote.textContent = value;
  emote.style.left = `${x}px`;
  emote.style.top = `${y}px`;
  stage.append(emote);
  window.setTimeout(() => emote.remove(), 1600);
}

function chooseInteraction() {
  const mother = actors.find((actor) => actor.dataset.kind === "mother");
  const farmer = actors.find((actor) => actor.dataset.kind === "farmer");
  const chicks = actors.filter((actor) => actor.dataset.kind === "chick");
  const chickA = chicks[Math.floor(Math.random() * chicks.length)];
  const chickB = chicks[(chicks.indexOf(chickA) + 1 + Math.floor(Math.random() * (chicks.length - 1))) % chicks.length];
  const type = Math.floor(Math.random() * 3);

  if (type === 0) return { a: mother, b: chickA, aLine: ["来抱抱～", "Come here!"], bLine: ["Mama!", "妈妈！"], emote: "♥" };
  if (type === 1) return { a: farmer, b: chickA, aLine: ["一起学新词！", "Let's learn!"], bLine: ["Okay!", "好呀！"], emote: "✦" };
  return { a: chickA, b: chickB, aLine: ["Hello!", "你好！"], bLine: ["Friend!", "朋友！"], emote: "♪" };
}

async function runInteraction() {
  if (motionPaused || interactionRunning) return;
  interactionRunning = true;
  const interaction = chooseInteraction();
  const { a, b } = interaction;

  a.dataset.busy = "true";
  b.dataset.busy = "true";
  syncPosition(a);
  syncPosition(b);

  const zoneA = getZone(a);
  const meetX = clamp(random(520, 890), zoneA.minX, zoneA.maxX);
  const meetY = clamp(random(465, 610), zoneA.minY, zoneA.maxY);
  const gap = Math.min(120, (a.offsetWidth + b.offsetWidth) * .25);

  await Promise.all([
    moveActor(a, { x: meetX - gap, y: meetY }, 2100),
    moveActor(b, { x: meetX + gap, y: meetY + 22 }, 2100),
  ]);

  setTalk(a, interaction.aLine[0], interaction.aLine[1]);
  setTalk(b, interaction.bLine[0], interaction.bLine[1]);
  a.classList.add(a.dataset.kind === "farmer" ? "gesture-wave" : "gesture-wiggle");
  b.classList.add("gesture-hop");
  addEmote(meetX + 72, meetY - 5, interaction.emote);

  await wait(2600);
  clearTalk();
  a.classList.remove("gesture-wave", "gesture-wiggle", "gesture-hop");
  b.classList.remove("gesture-wave", "gesture-wiggle", "gesture-hop");
  a.dataset.busy = "false";
  b.dataset.busy = "false";
  interactionRunning = false;
  wander(a);
  wander(b);
}

function scheduleInteraction() {
  window.clearTimeout(interactionTimer);
  interactionTimer = window.setTimeout(async () => {
    await runInteraction();
    scheduleInteraction();
  }, random(8500, 13000));
}

actors.forEach((actor) => {
  const x = Number(actor.dataset.x);
  const y = Number(actor.dataset.y);
  actor._position = { x, y };
  actor.style.left = `${x}px`;
  actor.style.top = `${y}px`;
  updateDepth(actor, y);

  actor.addEventListener("click", async () => {
    if (motionPaused) return;
    actor.dataset.busy = "true";
    syncPosition(actor);
    clearTalk();
    setTalk(actor, actor.dataset.line, actor.dataset.translation);
    const gesture = actor.dataset.kind === "farmer" ? "gesture-wave" : actor.dataset.kind === "mother" ? "gesture-wiggle" : "gesture-hop";
    actor.classList.add(gesture);
    await wait(1600);
    actor.classList.remove(gesture, "is-talking");
    actor.dataset.busy = "false";
    wander(actor);
  });
});

hatchery.addEventListener("click", () => {
  const expanded = hatchery.getAttribute("aria-expanded") === "true";
  hatchery.setAttribute("aria-expanded", String(!expanded));
  hatchery.classList.remove("is-nudging");
  void hatchery.offsetWidth;
  hatchery.classList.add("is-nudging");
});

motionToggle.addEventListener("click", () => {
  motionPaused = !motionPaused;
  app.classList.toggle("motion-paused", motionPaused);
  motionToggle.textContent = motionPaused ? "动效：关" : "动效：开";
  motionToggle.setAttribute("aria-pressed", String(motionPaused));

  actors.forEach((actor) => {
    if (motionPaused) syncPosition(actor);
    else if (actor.dataset.busy !== "true") wander(actor);
  });

  if (motionPaused) window.clearTimeout(interactionTimer);
  else scheduleInteraction();
});

if (motionPaused) {
  app.classList.add("motion-paused");
  motionToggle.textContent = "动效：关";
  motionToggle.setAttribute("aria-pressed", "true");
} else {
  actors.forEach((actor, index) => window.setTimeout(() => wander(actor), 900 + index * 240));
  scheduleInteraction();
}
