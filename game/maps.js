export const LEVEL_MAPS = [
  {
    name: "Level 1 - First Search",
    rows: [
      "###################",
      "#S....#...........#",
      "####..#.#########.#",
      "#.....#.........#.#",
      "#.#########.###.#.#",
      "#.........#...#.#.#",
      "#.#######.###.#.#.#",
      "#.#...f.#.....#...#",
      "#.#.###.#########.#",
      "#...#.............#",
      "#####.###########.#",
      "#.................#",
      "#.###############.#",
      "#........a........#",
      "###################"
    ]
  },
  {
    name: "Level 2 - Split Trail",
    rows: [
      "###################",
      "#S......#.........#",
      "######..#.#######.#",
      "#.......#.....f.#.#",
      "#.#############.#.#",
      "#.............#.#.#",
      "#.###########.#.#.#",
      "#...........#.#...#",
      "###########.#.###.#",
      "#.....g.....#.....#",
      "#.###############.#",
      "#...............a.#",
      "###################"
    ]
  },
  {
    name: "Level 3 - Long Loop",
    rows: [
      "###################",
      "#S....#...........#",
      "####..#.#########.#",
      "#.....#.........#.#",
      "#.###########.###.#",
      "#...........#.....#",
      "#########.#.#####.#",
      "#.....f...#.......#",
      "#.###########.###.#",
      "#.........g...#...#",
      "#.#############.#.#",
      "#...............#a#",
      "###################"
    ]
  },
  {
    name: "Level 4 - False Ends",
    rows: [
      "###################",
      "#S......#.........#",
      "######..#.#######.#",
      "#.......#...f...#.#",
      "#.###########.#.#.#",
      "#.............#...#",
      "#.###############.#",
      "#.................#",
      "#####.###########.#",
      "#.....#.....g.....#",
      "#.###.#.#########.#",
      "#...#............a#",
      "###################"
    ]
  },
  {
    name: "Level 5 - Tight Branches",
    rows: [
      "###################",
      "#S....#...........#",
      "####..#.#########.#",
      "#.....#.........#.#",
      "#.#######.#####.#.#",
      "#.......#.....#...#",
      "#######.#####.###.#",
      "#...f...#...g.....#",
      "#.#######.#######.#",
      "#...............#.#",
      "#.#############.#.#",
      "#...............#a#",
      "###################"
    ]
  },
  {
    name: "Level 6 - Risky Rescue",
    rows: [
      "###################",
      "#S......#.........#",
      "######..#.#######.#",
      "#.......#.......#.#",
      "#.#############.#.#",
      "#.....f.......#...#",
      "#.###########.###.#",
      "#...........#.....#",
      "#########.#.#####.#",
      "#.....g...#...h...#",
      "#.###########.###.#",
      "#...............a.#",
      "###################"
    ]
  },
  {
    name: "Level 7 - Deep Landfill",
    rows: [
      "###################",
      "#S....#...........#",
      "####..#.#########.#",
      "#.....#.....f...#.#",
      "#.#########.###.#.#",
      "#.........#...#...#",
      "#.#######.###.###.#",
      "#.#...g.#.....#...#",
      "#.#.###.#########.#",
      "#...#.............#",
      "#####.###########.#",
      "#.....h...........#",
      "#.###############.#",
      "#...............a.#",
      "###################"
    ]
  }
];

export const RESCUE_DOG_DEFS = {
  a: { id: "rescue_a", name: "Lost Pup", foodRequired: 1 }
};

export const FERAL_DOG_DEFS = {
  f: { id: "feral_f", name: "Frightened Wild Dog" },
  g: { id: "feral_g", name: "Territorial Wild Dog" },
  h: { id: "feral_h", name: "Nervous Wild Dog" }
};

function key(x, y) {
  return `${x},${y}`;
}

function isInside(map, x, y) {
  return y >= 0 && y < map.height && x >= 0 && x < map.width;
}

function isOpenTile(map, x, y) {
  return isInside(map, x, y) && !map.walls.has(key(x, y));
}

function findReachableTilesByDistance(map) {
  const queue = [{ x: map.start.x, y: map.start.y, distance: 0 }];
  const visited = new Set([key(map.start.x, map.start.y)]);
  const reachable = [];
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ];

  while (queue.length) {
    const current = queue.shift();
    reachable.push(current);

    for (const direction of directions) {
      const nx = current.x + direction.dx;
      const ny = current.y + direction.dy;
      const tileKey = key(nx, ny);
      if (visited.has(tileKey) || !isOpenTile(map, nx, ny)) continue;
      visited.add(tileKey);
      queue.push({ x: nx, y: ny, distance: current.distance + 1 });
    }
  }

  return reachable.sort((a, b) => b.distance - a.distance || b.y - a.y || b.x - a.x);
}

function placeRescueDogsAtFarthestTiles(map) {
  if (!map.rescueDogs.length) return;
  const occupied = new Set([
    key(map.start.x, map.start.y),
    ...map.feralDogs.map((dog) => key(dog.x, dog.y))
  ]);
  const farthestTiles = findReachableTilesByDistance(map).filter((tile) => !occupied.has(key(tile.x, tile.y)));

  map.rescueDogs.forEach((dog, index) => {
    const tile = farthestTiles[index] || farthestTiles[0];
    if (!tile) return;
    dog.x = tile.x;
    dog.y = tile.y;
    dog.startX = tile.x;
    dog.startY = tile.y;
    occupied.add(key(tile.x, tile.y));
  });
}

export function parseMap(mapRows) {
  const walls = new Set();
  const rescueDogs = [];
  const feralDogs = [];
  let start = { x: 1, y: 1 };

  for (let y = 0; y < mapRows.length; y += 1) {
    for (let x = 0; x < mapRows[y].length; x += 1) {
      const char = mapRows[y][x];
      if (char === "#") walls.add(key(x, y));
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

  const map = { rows: mapRows, width: mapRows[0].length, height: mapRows.length, walls, start, rescueDogs, feralDogs };
  placeRescueDogsAtFarthestTiles(map);
  return map;
}
