export class InputController {
  constructor(mission, renderer) {
    this.mission = mission;
    this.renderer = renderer;
    this.bindButtons();
  }

  bindButtons() {
    document.querySelectorAll("[data-dir]").forEach((button) => {
      button.addEventListener("click", () => {
        this.mission.attemptMove(button.dataset.dir);
        this.renderer.render();
      });
    });

    document.getElementById("waitBtn").addEventListener("click", () => {
      this.mission.waitTurn();
      this.renderer.render();
    });

    document.getElementById("dropFoodBtn").addEventListener("click", () => {
      this.mission.dropFood();
      this.renderer.render();
    });

    document.getElementById("restartBtn").addEventListener("click", () => {
      this.mission.reset();
      this.renderer.render();
    });
  }
}
