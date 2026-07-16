const farm = document.querySelector(".farm-v2");
const chicks = Array.from(document.querySelectorAll(".farm-chick"));
const motionToggle = document.querySelector("[data-motion-toggle]");
let talkTimer;

chicks.forEach((chick, index) => {
  chick.addEventListener("click", () => {
    window.clearTimeout(talkTimer);
    chicks.forEach((item) => item.classList.remove("is-talking"));

    [index, (index + 1) % chicks.length, (index + 2) % chicks.length].forEach((target) => {
      chicks[target].classList.add("is-talking");
    });

    talkTimer = window.setTimeout(() => {
      chicks.forEach((item) => item.classList.remove("is-talking"));
    }, 3600);
  });
});

motionToggle.addEventListener("click", () => {
  const paused = farm.classList.toggle("motion-paused");
  motionToggle.textContent = paused ? "动效：关" : "动效：开";
  motionToggle.setAttribute("aria-pressed", String(paused));
});
