export const STARTER_MAP = [
  "###################",
  "#S....#.......#...#",
  "####..#.#####.#.#.#",
  "#.....#.....#...#.#",
  "#.#########.#.###.#",
  "#.....a.....#.....#",
  "###.#########.###.#",
  "#...#.....f...#...#",
  "#.###.#########.#.#",
  "#.....#.........#.#",
  "#####.#.#######.#.#",
  "#b....#.....c...#.#",
  "#.#########.#####.#",
  "#.......#.........#",
  "#.#####.#.#######.#",
  "#...g...#.........#",
  "###################"
];

export const RESCUE_DOG_DEFS = {
  a: { id: "rescue_a", name: "Hungry Pup", foodRequired: 1 },
  b: { id: "rescue_b", name: "Shaking Dog", foodRequired: 2 },
  c: { id: "rescue_c", name: "Injured Dog", foodRequired: 3 }
};

export const FERAL_DOG_DEFS = {
  f: { id: "feral_f", name: "Frightened Feral Dog" },
  g: { id: "feral_g", name: "Territorial Feral Dog" }
};

export function parseMap(mapRows) {
  const walls = new Set();
  const rescueDogs = [];
  const feralDogs = [];
  let start = { x: 1, y: 1 };

  for (let y = 0; y < mapRows.length; y += 1) {
    for (let x = 0; x < mapRows[y].length; x += 1) {
      const char = mapRows[y][x];
      if (char === "#") walls.add(`${x},${y}`);
      if (char === "S") start = { x, y };
      if (RESCUE_DOG_DEFS[char]) {
        rescueDogs.push({ ...RESCUE_DOG_DEFS[char], x, y, startX: x, startY: y, state: "waiting" });
      }
      if (FERAL_DOG_DEFS[char]) {
        feralDogs.push({
          ...FERAL_DOG_DEFS[char],
          x,
          y,
          startX: x,
          startY: y,
          state: "idle",
          alertTurnsLeft: 0,
          eatingTurnsLeft: 0,
          targetFoodId: null
        });
      }
    }
  }

  return { rows: mapRows, width: mapRows[0].length, height: mapRows.length, walls, start, rescueDogs, feralDogs };
}
