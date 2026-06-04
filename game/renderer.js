import { CONFIG } from "./config.js";

function drawDog(ctx, x, y, size, body, ear) {
  ctx.fillStyle = body;
  ctx.fillRect(x + size * 0.20, y + size * 0.34, size * 0.55, size * 0.38);
  ctx.fillRect(x + size * 0.58, y + size * 0.22, size * 0.28, size * 0.28);
  ctx.fillStyle = ear;
  ctx.fillRect(x + size * 0.56, y + size * 0.18, size * 0.12, size * 0.18);
  ctx.fillRect(x + size * 0.78, y + size * 0.18, size * 0.10, size * 0.18);
  ctx.fillStyle = "#111";
  ctx.fillRect(x + size * 0.74, y + size * 0.31, size * 0.06, size * 0.06);
}

export class Renderer {
  constructor(canvas, mission) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mission = mission;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width || 360, rect.height || 360));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = Math.floor(size * dpr);
    this.canvas.height = Math.floor(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssSize = size;
  }

  render() {
    const ctx = this.ctx;
    const size = this.cssSize || 360;
    ctx.clearRect(0, 0, size, size);
    const tile = size / CONFIG.visibleTiles;
    const player = this.mission.player;
    const half = Math.floor(CONFIG.visibleTiles / 2);
    const cameraX = player.x - half;
    const cameraY = player.y - half;

    for (let sy = 0; sy < CONFIG.visibleTiles; sy += 1) {
      for (let sx = 0; sx < CONFIG.visibleTiles; sx += 1) {
        this.drawTile(ctx, cameraX + sx, cameraY + sy, sx * tile, sy * tile, tile);
      }
    }

    this.drawFood(ctx, cameraX, cameraY, tile);
    this.drawRescueDogs(ctx, cameraX, cameraY, tile);
    this.drawFeralDogs(ctx, cameraX, cameraY, tile);
    this.drawFollowers(ctx, cameraX, cameraY, tile);
    this.drawPlayer(ctx, half * tile, half * tile, tile);
  }

  drawTile(ctx, mx, my, x, y, tile) {
    const map = this.mission.map;
    const isOutside = mx < 0 || my < 0 || mx >= map.width || my >= map.height;
    const isWall = isOutside || map.walls.has(`${mx},${my}`);
    const isStart = mx === map.start.x && my === map.start.y;
    if (isWall) {
      ctx.fillStyle = "#403528";
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = "#5a4b39";
      ctx.fillRect(x + 3, y + 4, tile - 8, 7);
      ctx.fillStyle = "#283521";
      ctx.fillRect(x + 9, y + 15, tile - 12, 8);
      return;
    }
    ctx.fillStyle = "#6b5532";
    ctx.fillRect(x, y, tile, tile);
    if (isStart) {
      ctx.strokeStyle = "#f1d27a";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 4, y + 4, tile - 8, tile - 8);
    }
  }

  drawFood(ctx, cameraX, cameraY, tile) {
    for (const bowl of this.mission.foodBowls) {
      const pos = this.toScreen(bowl, cameraX, cameraY, tile);
      if (!pos) continue;
      ctx.fillStyle = "#e2d7bb";
      ctx.beginPath();
      ctx.ellipse(pos.x + tile / 2, pos.y + tile * 0.62, tile * 0.24, tile * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8b4f25";
      ctx.fillRect(pos.x + tile * 0.38, pos.y + tile * 0.50, tile * 0.24, tile * 0.08);
    }
  }

  drawRescueDogs(ctx, cameraX, cameraY, tile) {
    for (const dog of this.mission.map.rescueDogs) {
      if (dog.state !== "waiting") continue;
      const pos = this.toScreen(dog, cameraX, cameraY, tile);
      if (!pos) continue;
      drawDog(ctx, pos.x, pos.y, tile, "#c99b5b", "#7b4c2e");
      ctx.fillStyle = "#fff2c4";
      ctx.font = `${tile * 0.28}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${dog.foodRequired}`, pos.x + tile * 0.50, pos.y + tile * 0.18);
    }
  }

  drawFollowers(ctx, cameraX, cameraY, tile) {
    for (const dog of this.mission.player.rescuedDogs) {
      const pos = this.toScreen(dog, cameraX, cameraY, tile);
      if (pos) drawDog(ctx, pos.x, pos.y, tile, "#d6b16c", "#8f673d");
    }
  }

  drawFeralDogs(ctx, cameraX, cameraY, tile) {
    for (const dog of this.mission.map.feralDogs) {
      const pos = this.toScreen(dog, cameraX, cameraY, tile);
      if (!pos) continue;
      const body = dog.state === "chasing" ? "#7e3a2c" : "#5e5142";
      drawDog(ctx, pos.x, pos.y, tile, body, "#2d241c");
      if (dog.state === "chasing") {
        ctx.strokeStyle = "#ffdf6b";
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x + 3, pos.y + 3, tile - 6, tile - 6);
      }
    }
  }

  drawPlayer(ctx, x, y, tile) {
    ctx.fillStyle = "#203b5c";
    ctx.fillRect(x + tile * 0.28, y + tile * 0.34, tile * 0.44, tile * 0.42);
    ctx.fillStyle = "#f0c795";
    ctx.fillRect(x + tile * 0.32, y + tile * 0.14, tile * 0.36, tile * 0.28);
    ctx.fillStyle = "#3a2418";
    ctx.fillRect(x + tile * 0.30, y + tile * 0.10, tile * 0.40, tile * 0.10);
  }

  toScreen(entity, cameraX, cameraY, tile) {
    const sx = entity.x - cameraX;
    const sy = entity.y - cameraY;
    if (sx < 0 || sy < 0 || sx >= CONFIG.visibleTiles || sy >= CONFIG.visibleTiles) return null;
    return { x: sx * tile, y: sy * tile };
  }
}
