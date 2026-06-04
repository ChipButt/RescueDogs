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

function hideModal() {
  modal.classList.add("hidden");
  modalActions.innerHTML = "";
}

function showModal({ title, text, actions }) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalActions.innerHTML = "";

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => {
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
new InputController(mission, renderer);

function loop() {
  renderer.render();
  requestAnimationFrame(loop);
}

loop();

window.DogRescueMaze = {
  mission,
  getResult: () => mission.lastResult,
  restart: () => mission.reset()
};
