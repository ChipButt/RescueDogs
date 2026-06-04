import { CONFIG } from "./config.js";
import { STARTER_MAP, parseMap } from "./maps.js";
import { createPlayer, isWalkable, manhattan, samePos, moveOneStepToward, canSeeAlongCorridor, findPath } from "./entities.js";

export class Mission {
  constructor({ onStatus, onStats, onModal } = {}) {
    this.onStatus = onStatus || (() => {});
    this.onStats = onStats || (() => {});
    this.onModal = onModal || (() => {});
    this.reset();
  }

  reset() {
    this.map = parseMap(STARTER_MAP);
    this.player = createPlayer(this.map.start);
    this.foodBowls = [];
    this.turn = 0;
    this.isOver = false;
    this.lastResult = null;
    this.status("Find dogs. Avoid ferals. Get back out.");
    this.publishStats();
  }

  status(text) { this.onStatus(text); }
  publishStats() { this.onStats({ food: this.player.food, rescued: this.player.rescuedDogs.length }); }

  attemptMove(direction) {
    if (this.isOver) return;
    const dir = CONFIG.directions[direction];
    if (!dir) return;
    this.player.direction = direction;
    const nx = this.player.x + dir.dx;
    const ny = this.player.y + dir.dy;
    if (!isWalkable(this.map, nx, ny)) {
      this.status("Blocked by trash piles.");
      return;
    }
    this.advanceTurn(() => {
      this.recordPlayerHistory();
      this.player.x = nx;
      this.player.y = ny;
      this.tryRescueDogOnTile();
      this.updateFollowingDogs();
    });
  }

  waitTurn() {
    if (this.isOver) return;
    this.advanceTurn(() => {
      this.recordPlayerHistory();
      this.updateFollowingDogs();
    });
  }

  dropFood() {
    if (this.isOver) return;
    if (this.player.food <= 0) {
      this.status("No dog food left.");
      return;
    }
    this.advanceTurn(() => {
      this.player.food -= 1;
      this.foodBowls.push({ id: `food_${Date.now()}_${this.turn}`, x: this.player.x, y: this.player.y, age: 0 });
      this.status("You dropped food on your current tile.");
    });
  }

  advanceTurn(playerAction) {
    this.turn += 1;
    playerAction();
    this.ageFoodBowls();
    this.updateFeralDogs();
    this.checkCaught();
    this.checkExitPrompt();
    this.publishStats();
  }

  recordPlayerHistory() {
    this.player.pathHistory.unshift({ x: this.player.x, y: this.player.y });
    this.player.pathHistory = this.player.pathHistory.slice(0, 80);
  }

  updateFollowingDogs() {
    this.player.rescuedDogs.forEach((dog, index) => {
      const trailIndex = (index + 1) * 2 - 1;
      const trailPos = this.player.pathHistory[trailIndex];
      if (trailPos) { dog.x = trailPos.x; dog.y = trailPos.y; }
    });
  }

  tryRescueDogOnTile() {
    const dog = this.map.rescueDogs.find((candidate) => candidate.state === "waiting" && candidate.x === this.player.x && candidate.y === this.player.y);
    if (!dog) return;
    if (this.player.food < dog.foodRequired) {
      this.status(`${dog.name} needs ${dog.foodRequired} food. You do not have enough.`);
      return;
    }
    this.player.food -= dog.foodRequired;
    dog.state = "following";
    dog.x = this.player.x;
    dog.y = this.player.y;
    this.player.rescuedDogs.push(dog);
    this.status(`${dog.name} is following you.`);
  }

  ageFoodBowls() {
    this.foodBowls.forEach((bowl) => { bowl.age += 1; });
    this.foodBowls = this.foodBowls.filter((bowl) => bowl.age <= CONFIG.maxFoodBowlAge);
  }

  updateFeralDogs() {
    for (const dog of this.map.feralDogs) {
      if (dog.state === "idle") this.updateIdleFeralDog(dog);
      else if (dog.state === "chasing") this.updateChasingFeralDog(dog);
      else if (dog.state === "eating") this.updateEatingFeralDog(dog);
      else if (dog.state === "returning") this.updateReturningFeralDog(dog);
    }
  }

  updateIdleFeralDog(dog) {
    const path = findPath(this.map, dog, this.player);
    if (path && path.length <= dog.triggerRadius) {
      dog.state = "chasing";
      this.status(`${dog.name} has started chasing you.`);
      this.updateChasingFeralDog(dog);
    }
  }

  updateChasingFeralDog(dog) {
    const visibleFood = this.findVisibleFoodForDog(dog);
    if (visibleFood) {
      dog.targetFoodId = visibleFood.id;
      moveOneStepToward(this.map, dog, visibleFood);
      if (samePos(dog, visibleFood)) {
        this.foodBowls = this.foodBowls.filter((bowl) => bowl.id !== visibleFood.id);
        dog.state = "eating";
        dog.eatingTurnsLeft = CONFIG.dogEatTurns;
        dog.targetFoodId = null;
        this.status(`${dog.name} stopped to eat.`);
      }
      return;
    }
    moveOneStepToward(this.map, dog, this.player);
  }

  updateEatingFeralDog(dog) {
    dog.eatingTurnsLeft -= 1;
    if (dog.eatingTurnsLeft <= 0) {
      dog.state = "returning";
      this.status(`${dog.name} is going back to its corner.`);
    }
  }

  updateReturningFeralDog(dog) {
    const home = { x: dog.startX, y: dog.startY };
    if (samePos(dog, home)) {
      dog.state = "idle";
      this.status(`${dog.name} has calmed down.`);
      return;
    }
    moveOneStepToward(this.map, dog, home);
  }

  findVisibleFoodForDog(dog) {
    const candidates = this.foodBowls.filter((bowl) => canSeeAlongCorridor(this.map, dog, bowl, 8)).sort((a, b) => manhattan(dog, a) - manhattan(dog, b));
    return candidates[0] || null;
  }

  checkCaught() {
    if (this.isOver) return;
    const caughtBy = this.map.feralDogs.find((dog) => dog.state === "chasing" && dog.x === this.player.x && dog.y === this.player.y);
    if (!caughtBy) return;
    this.isOver = true;
    this.lastResult = { success: false, dogsRescued: 0, foodRemaining: this.player.food, reason: "caught" };
    this.onModal({ title: "Mission Failed", text: "The frightened dog chased you back out of the trash yard. You will need to try again.", actions: [{ label: "Restart Mission", action: () => this.reset() }] });
  }

  checkExitPrompt() {
    if (this.isOver) return;
    const onExit = this.player.x === this.map.start.x && this.player.y === this.map.start.y;
    if (!onExit || this.player.rescuedDogs.length === 0) return;
    this.onModal({ title: "Leave Trash Yard?", text: `You have ${this.player.rescuedDogs.length} rescued dog${this.player.rescuedDogs.length === 1 ? "" : "s"} following you. Leave now or keep exploring?`, actions: [{ label: "Leave Mission", action: () => this.completeMission() }, { label: "Keep Exploring", action: () => {} }] });
  }

  completeMission() {
    this.isOver = true;
    this.lastResult = { success: true, dogsRescued: this.player.rescuedDogs.length, foodRemaining: this.player.food, reason: "escaped" };
    this.onModal({ title: "Mission Complete", text: `You rescued ${this.lastResult.dogsRescued} dog${this.lastResult.dogsRescued === 1 ? "" : "s"} and returned with ${this.lastResult.foodRemaining} food left.`, actions: [{ label: "Play Again", action: () => this.reset() }] });
  }
}
