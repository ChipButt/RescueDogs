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
    const width = Math.floor(rect.width || 360);
    const height = Math.floor(rect.height || 360);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssWidth = width;
    this.cssHeight = height;
  }

  render() {
    const ctx = this.ctx;
    const width = this.cssWidth || 360;
    const height = this.cssHeight || 360;
    ctx.clearRect(0, 0, width, height);

    const tile = Math.min(width, height) / CONFIG.visibleTiles;
    const visibleCols = Math.ceil(width / tile);
    const visibleRows = Math.ceil(height / tile);
    const player = this.mission.player;
    const cameraX = player.x - Math.floor(visibleCols / 2);
    const cameraY = player.y - Math.floor(visibleRows / 2);

    for (let sy = 0; sy < visibleRows; sy += 1) {
      for (let sx = 0; sx < visibleCols; sx += 1) {
        this.drawTile(ctx, cameraX + sx, cameraY + sy, sx * tile, sy * tile, tile);
      }
    }

    this.drawFood(ctx, cameraX, cameraY, tile, visibleCols, visibleRows);
    this.drawRescueDogs(ctx, cameraX, cameraY, tile, visibleCols, visibleRows);
    this.drawFeralDogs(ctx, cameraX, cameraY, tile, visibleCols, visibleRows);
    this.drawFollowers(ctx, cameraX, cameraY, tile, visibleCols, visibleRows);
    this.drawPlayer(ctx, (player.x - cameraX) * tile, (player.y - cameraY) * tile, tile);
    this.drawFogOfWar(ctx, cameraX, cameraY, tile, visibleCols, visibleRows, width, height);
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
      ctx.fillRect(x + tile * 0.09, y + tile * 0.13, tile * 0.72, tile * 0.20);
      ctx.fillStyle = "#283521";
      ctx.fillRect(x + tile * 0.27, y + tile * 0.47, tile * 0.54, tile * 0.22);
      return;
    }
    ctx.fillStyle = "#6b5532";
    ctx.fillRect(x, y, tile, tile);
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, tile, tile);
    if (isStart) {
      ctx.strokeStyle = "#f1d27a";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 4, y + 4, tile - 8, tile - 8);
    }
  }

  drawFood(ctx, cameraX, cameraY, tile, cols, rows) {
    for (const bowl of this.mission.foodBowls) {
      const pos = this.toScreen(bowl, cameraX, cameraY, tile, cols, rows);
      if (!pos) continue;
      ctx.fillStyle = "#e2d7bb";
      ctx.beginPath();
      ctx.ellipse(pos.x + tile / 2, pos.y + tile * 0.62, tile * 0.24, tile * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8b4f25";
      ctx.fillRect(pos.x + tile * 0.38, pos.y + tile * 0.50, tile * 0.24, tile * 0.08);
    }
  }

  drawRescueDogs(ctx, cameraX, cameraY, tile, cols, rows) {
    for (const dog of this.mission.map.rescueDogs) {
      if (dog.state !== "waiting") continue;
      const pos = this.toScreen(dog, cameraX, cameraY, tile, cols, rows);
      if (!pos) continue;
      drawDog(ctx, pos.x, pos.y, tile, "#c99b5b", "#7b4c2e");
      ctx.fillStyle = "#fff2c4";
      ctx.font = `${tile * 0.28}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${dog.foodRequired}`, pos.x + tile * 0.50, pos.y + tile * 0.18);
    }
  }

  drawFollowers(ctx, cameraX, cameraY, tile, cols, rows) {
    for (const dog of this.mission.player.rescuedDogs) {
      const pos = this.toScreen(dog, cameraX, cameraY, tile, cols, rows);
      if (pos) drawDog(ctx, pos.x, pos.y, tile, "#d6b16c", "#8f673d");
    }
  }

  drawFeralDogs(ctx, cameraX, cameraY, tile, cols, rows) {
    const flashOn = Math.floor(Date.now() / 180) % 2 === 0;
    for (const dog of this.mission.map.feralDogs) {
      const pos = this.toScreen(dog, cameraX, cameraY, tile, cols, rows);
      if (!pos) continue;

      let offsetX = 0;
      if (dog.state === "alert") offsetX = flashOn ? -tile * 0.06 : tile * 0.06;

      let body = "#5e5142";
      let ear = "#2d241c";
      if (dog.state === "alert") {
        body = flashOn ? "#d94335" : "#7e3a2c";
        ear = "#3a1712";
      }
      if (dog.state === "chasing") {
        body = flashOn ? "#e34032" : "#7e3a2c";
        ear = "#3a1712";
      }

      drawDog(ctx, pos.x + offsetX, pos.y, tile, body, ear);

      if (dog.state === "alert") {
        ctx.fillStyle = "#ffef73";
        ctx.font = `${tile * 0.52}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("!", pos.x + tile * 0.50, pos.y + tile * 0.12);
      }

      if (dog.state === "chasing") {
        ctx.strokeStyle = flashOn ? "#ffdf6b" : "#ff5b4d";
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

  drawFogOfWar(ctx, cameraX, cameraY, tile, cols, rows) {
    const player = this.mission.player;
    const radius = CONFIG.playerVisionRange;
    for (let sy = 0; sy < rows; sy += 1) {
      for (let sx = 0; sx < cols; sx += 1) {
        const mx = cameraX + sx;
        const my = cameraY + sy;
        const distance = Math.abs(mx - player.x) + Math.abs(my - player.y);
        if (distance <= radius) continue;
        ctx.fillStyle = "#020502";
        ctx.fillRect(sx * tile, sy * tile, tile + 1, tile + 1);
      }
    }
  }

  toScreen(entity, cameraX, cameraY, tile, cols, rows) {
    const sx = entity.x - cameraX;
    const sy = entity.y - cameraY;
    if (sx < 0 || sy < 0 || sx >= cols || sy >= rows) return null;
    return { x: sx * tile, y: sy * tile };
  }
}
