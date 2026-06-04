export class InputController {
  constructor(mission, renderer) {
    this.mission = mission;
    this.renderer = renderer;
    this.activeDirection = null;
    this.pointerStart = null;
    this.bindTouchMovement();
    this.bindButtons();
    this.bindZoomLocks();
  }

  getDirectionFromDelta(dx, dy) {
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return null;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "east" : "west";
    return dy > 0 ? "south" : "north";
  }

  bindTouchMovement() {
    const area = document.getElementById("playArea");
    area.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.pointerStart = { x: event.clientX, y: event.clientY };
      this.activeDirection = null;
      area.setPointerCapture(event.pointerId);
    });

    area.addEventListener("pointermove", (event) => {
      if (!this.pointerStart) return;
      event.preventDefault();
      const dx = event.clientX - this.pointerStart.x;
      const dy = event.clientY - this.pointerStart.y;
      const dir = this.getDirectionFromDelta(dx, dy);
      if (dir) this.activeDirection = dir;
    });

    const clear = (event) => {
      if (event) event.preventDefault();
      this.pointerStart = null;
      this.activeDirection = null;
    };

    area.addEventListener("pointerup", clear);
    area.addEventListener("pointercancel", clear);
    area.addEventListener("lostpointercapture", clear);
  }

  bindButtons() {
    document.getElementById("dropFoodBtn").addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.mission.dropFood();
      this.renderer.render();
    });

    document.getElementById("restartBtn").addEventListener("click", () => {
      this.mission.reset();
      this.renderer.render();
    });
  }

  bindZoomLocks() {
    let lastTouchEnd = 0;
    document.addEventListener("touchend", (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 350) event.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });

    document.addEventListener("gesturestart", (event) => event.preventDefault());
    document.addEventListener("gesturechange", (event) => event.preventDefault());
    document.addEventListener("gestureend", (event) => event.preventDefault());
  }

  update() {
    if (this.activeDirection) this.mission.setMoveDirection(this.activeDirection);
    else this.mission.setMoveDirection(null);
  }
}
