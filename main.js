import { Mission } from "./game/mission.js";
import { Renderer } from "./game/renderer.js";
import { InputController } from "./game/input.js";

const foodCount = document.getElementById("foodCount");
const rescuedCount = document.getElementById("rescuedCount");
const statusText = document.getElementById("statusText");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const modalActions = document.getElementById("modalActions");
const canvas = document.getElementById("gameCanvas");

let renderer;
let input;

function setRealViewportHeight() {
  const vv = window.visualViewport;
  const rawHeight = vv ? vv.height : window.innerHeight;
  const browserPad = window.matchMedia("(display-mode: standalone)").matches ? 0 : 88;
  const appHeight = Math.max(520, Math.floor(rawHeight - browserPad));
  document.documentElement.style.setProperty("--app-height", `${appHeight}px`);
}

setRealViewportHeight();
window.addEventListener("resize", setRealViewportHeight);
window.addEventListener("orientationchange", setRealViewportHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", setRealViewportHeight);
  window.visualViewport.addEventListener("scroll", setRealViewportHeight);
}

function hideModal() {
  modal.classList.add("hidden");
  modalActions.innerHTML = "";
}

function showModal({ title, text, html, actions }) {
  modalTitle.textContent = title;
  if (html) modalText.innerHTML = html;
  else modalText.textContent = text || "";
  modalActions.innerHTML = "";

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.disabled = Boolean(action.disabled);
    button.addEventListener("click", () => {
      if (action.disabled) return;
      hideModal();
      action.action();
      renderer.render();
    });
    modalActions.appendChild(button);
  });

  modal.classList.remove("hidden");
}

const mission = new Mission({
  onStatus: (message) => { statusText.textContent = message; },
  onStats: ({ food, rescued }) => {
    foodCount.textContent = food;
    rescuedCount.textContent = rescued;
  },
  onModal: showModal
});

renderer = new Renderer(canvas, mission);
input = new InputController(mission, renderer);

function loop(now) {
  input.update();
  mission.tick(now);
  renderer.render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.DogRescueMaze = {
  mission,
  getResult: () => mission.lastResult,
  restart: () => mission.reset()
};
