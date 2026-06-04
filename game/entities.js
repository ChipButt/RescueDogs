import { CONFIG } from "./config.js";

export function createPlayer(start) {
  return { x: start.x, y: start.y, direction: "south", food: CONFIG.startingFood, rescuedDogs: [], pathHistory: [] };
}

export function positionKey(x, y) {
  return `${x},${y}`;
}

export function isBlockedByWall(map, x, y) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  return map.walls.has(positionKey(x, y));
}

export function isWalkable(map, x, y) {
  return !isBlockedByWall(map, x, y);
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function findPath(map, start, goal) {
  if (samePos(start, goal)) return [];
  const queue = [{ x: start.x, y: start.y, path: [] }];
  const seen = new Set([positionKey(start.x, start.y)]);
  const dirs = Object.values(CONFIG.directions);

  while (queue.length) {
    const current = queue.shift();
    for (const dir of dirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = positionKey(nx, ny);
      if (seen.has(key) || !isWalkable(map, nx, ny)) continue;
      const nextPath = [...current.path, { x: nx, y: ny }];
      if (nx === goal.x && ny === goal.y) return nextPath;
      seen.add(key);
      queue.push({ x: nx, y: ny, path: nextPath });
    }
  }
  return null;
}

export function moveOneStepToward(map, entity, target) {
  const path = findPath(map, entity, target);
  if (!path || path.length === 0) return false;
  entity.x = path[0].x;
  entity.y = path[0].y;
  return true;
}

export function canSeeAlongCorridor(map, from, to, maxDistance = 6) {
  const distance = manhattan(from, to);
  if (distance > maxDistance) return false;
  if (from.x !== to.x && from.y !== to.y) return false;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let x = from.x + dx;
  let y = from.y + dy;
  while (x !== to.x || y !== to.y) {
    if (!isWalkable(map, x, y)) return false;
    x += dx;
    y += dy;
  }
  return true;
}
