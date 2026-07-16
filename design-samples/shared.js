document.querySelectorAll("[data-name-form]").forEach((form) => {
  const input = form.querySelector("input");
  const message = form.querySelector("[data-message]");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = input.value.trim();

    if (!name) {
      message.textContent = "先写下一个喜欢的名字吧～";
      input.classList.remove("shake");
      void input.offsetWidth;
      input.classList.add("shake");
      input.focus();
      return;
    }

    message.textContent = `太好啦！以后就叫她“${name}”！`;
  });
});
