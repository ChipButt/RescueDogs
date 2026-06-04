export const CONFIG = {
  tileSize: 32,
  visibleTiles: 11,
  startingFood: 8,
  dogEatTurns: 3,
  maxFoodBowlAge: 10,
  directions: {
    north: { dx: 0, dy: -1, label: "North" },
    east: { dx: 1, dy: 0, label: "East" },
    south: { dx: 0, dy: 1, label: "South" },
    west: { dx: -1, dy: 0, label: "West" }
  }
};
