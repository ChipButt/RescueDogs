import { CONFIG } from "./config.js";
import { LEVEL_MAPS, parseMap } from "./maps.js";
import { createPlayer, isWalkable, manhattan, samePos, moveOneStepToward, canSeeAlongCorridor, findPath } from "./entities.js";

export class Mission {
  constructor({ onStatus, onStats, onModal, onComplete, startingFood } = {}) {
    this.onStatus = onStatus || (() => {});
    this.onStats = onStats || (() => {});
    this.onModal = onModal || (() => {});
    this.onComplete = onComplete || null;
    this.startingFood = Math.max(0, Number(startingFood ?? CONFIG.startingFood) || 0);
    this.currentLevelIndex = 0;
    this.reset();
  }

  reset(levelIndex = this.currentLevelIndex) {
    this.currentLevelIndex = levelIndex % LEVEL_MAPS.length;
    this.level = LEVEL_MAPS[this.currentLevelIndex];
    this.map = parseMap(this.level.rows);
    this.player = createPlayer(this.map.start, this.startingFood);
    this.foodBowls = [];
    this.turn = 0;
    this.isOver = false;
    this.isPaused = false;
    this.moveDirection = null;
    this.lastPlayerMoveAt = 0;
    this.lastFeralMoveAt = 0;
    this.lastResult = null;
    this.status(`${this.level.name}: find the pup and get back out.`);
    this.publishStats();
  }

  nextLevel() {
    this.reset((this.currentLevelIndex + 1) % LEVEL_MAPS.length);
  }

  status(text) { this.onStatus(text); }
  publishStats() { this.onStats({ food: this.player.food, rescued: this.player.rescuedDogs.length }); }
  setMoveDirection(direction) { this.moveDirection = direction; }

  finishMission(result) {
    this.lastResult = result;
    if (this.onComplete) {
      this.onComplete(result);
      return true;
    }
    return false;
  }

  tick(now) {
    if (this.isOver || this.isPaused) return;
    if (this.moveDirection && now - this.lastPlayerMoveAt >= CONFIG.playerMoveMs) {
      this.movePlayer(this.moveDirection);
      this.lastPlayerMoveAt = now;
    }
    if (now - this.lastFeralMoveAt >= CONFIG.feralMoveMs) {
      this.advanceWorld();
      this.lastFeralMoveAt = now;
    }
  }

  movePlayer(direction) {
    const dir = CONFIG.directions[direction];
    if (!dir) return;
    this.player.direction = direction;
    const nx = this.player.x + dir.dx;
    const ny = this.player.y + dir.dy;
    if (!isWalkable(this.map, nx, ny)) {
      this.status("Blocked by trash piles.");
      return;
    }
    this.recordPlayerHistory();
    this.player.x = nx;
    this.player.y = ny;
    this.updateFollowingDogs();
    this.checkForRescueDogPrompt();
    this.checkExitPrompt();
    this.publishStats();
  }

  dropFood() {
    if (this.isOver || this.isPaused) return;
    if (this.player.food <= 0) {
      this.status("No dog food left.");
      return;
    }
    this.player.food -= 1;
    this.foodBowls.push({ id: `food_${Date.now()}_${this.turn}`, x: this.player.x, y: this.player.y, age: 0 });
    this.status("Dropped food on your current tile.");
    this.publishStats();
  }

  advanceWorld() {
    this.turn += 1;
    this.ageFoodBowls();
    this.updateFeralDogs();
    this.checkCaught();
    this.publishStats();
  }

  recordPlayerHistory() {
    this.player.pathHistory.unshift({ x: this.player.x, y: this.player.y });
    this.player.pathHistory = this.player.pathHistory.slice(0, 80);
  }

  updateFollowingDogs() {
    this.player.rescuedDogs.forEach((dog, index) => {
      const trailPos = this.player.pathHistory[index];
      if (trailPos) { dog.x = trailPos.x; dog.y = trailPos.y; }
    });
  }

  checkForRescueDogPrompt() {
    const dog = this.map.rescueDogs.find((candidate) => candidate.state === "waiting" && candidate.x === this.player.x && candidate.y === this.player.y);
    if (!dog) return;
    this.isPaused = true;
    this.moveDirection = null;
    const canFeed = this.player.food >= dog.foodRequired;
    this.onModal({
      title: dog.name,
      html: `<div class="rescue-card"><div class="dog-face">🐶</div><div class="dog-lines"><div>\"...whine...\"</div><div>This pup looks weak and needs help.</div><div class="food-need">🥣 x ${dog.foodRequired}</div></div></div>`,
      actions: [
        { label: canFeed ? "Give Food" : "Not Enough Food", disabled: !canFeed, action: () => this.feedRescueDog(dog) },
        { label: "Leave", action: () => { this.isPaused = false; this.status("You left the pup for now."); } }
      ]
    });
  }

  feedRescueDog(dog) {
    if (this.player.food < dog.foodRequired) {
      this.isPaused = false;
      this.status("Not enough dog food.");
      return;
    }
    this.player.food -= dog.foodRequired;
    dog.state = "following";
    dog.x = this.player.x;
    dog.y = this.player.y;
    this.player.rescuedDogs.push(dog);
    this.updateFollowingDogs();
    this.isPaused = false;
    this.status(`${dog.name} is following directly behind you.`);
    this.publishStats();
  }

  ageFoodBowls() {
    this.foodBowls.forEach((bowl) => { bowl.age += 1; });
    this.foodBowls = this.foodBowls.filter((bowl) => bowl.age <= CONFIG.maxFoodBowlAge);
  }

  updateFeralDogs() {
    for (const dog of this.map.feralDogs) {
      if (dog.state === "idle") this.updateIdleFeralDog(dog);
      else if (dog.state === "alert") this.updateAlertFeralDog(dog);
      else if (dog.state === "chasing") this.updateChasingFeralDog(dog);
      else if (dog.state === "eating") this.updateEatingFeralDog(dog);
      else if (dog.state === "returning") this.updateReturningFeralDog(dog);
    }
  }

  canDogDetectPlayer(dog) {
    const path = findPath(this.map, dog, this.player);
    return Boolean(path && path.length <= CONFIG.wildDogReactionRange);
  }

  updateIdleFeralDog(dog) {
    if (this.canDogDetectPlayer(dog)) {
      dog.state = "alert";
      dog.alertTurnsLeft = CONFIG.feralAlertTurns;
      this.status(`${dog.name} has spotted you!`);
    }
  }

  updateAlertFeralDog(dog) {
    const visibleFood = this.findVisibleFoodForDog(dog);
    if (visibleFood) {
      dog.state = "chasing";
      this.updateChasingFeralDog(dog);
      return;
    }
    if (!this.canDogDetectPlayer(dog)) {
      dog.state = "idle";
      dog.alertTurnsLeft = 0;
      this.status(`${dog.name} lost sight of you.`);
      return;
    }
    dog.alertTurnsLeft -= 1;
    if (dog.alertTurnsLeft <= 0) {
      dog.state = "chasing";
      this.status(`${dog.name} is chasing you.`);
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
      dog.alertTurnsLeft = 0;
      this.status(`${dog.name} has calmed down.`);
      return;
    }
    moveOneStepToward(this.map, dog, home);
  }

  findVisibleFoodForDog(dog) {
    const candidates = this.foodBowls.filter((bowl) => canSeeAlongCorridor(this.map, dog, bowl, CONFIG.wildDogReactionRange + 3)).sort((a, b) => manhattan(dog, a) - manhattan(dog, b));
    return candidates[0] || null;
  }

  checkCaught() {
    if (this.isOver) return;
    const caughtBy = this.map.feralDogs.find((dog) => dog.state === "chasing" && dog.x === this.player.x && dog.y === this.player.y);
    if (!caughtBy) return;
    this.isOver = true;
    this.moveDirection = null;
    const result = { success: false, dogsRescued: 0, foodRemaining: this.player.food, reason: "caught" };
    if (this.finishMission(result)) return;
    this.onModal({ title: "Mission Failed", text: "The frightened dog chased you back out of the landfill. You will need to try again.", actions: [{ label: "Restart Mission", action: () => this.reset() }] });
  }

  checkExitPrompt() {
    if (this.isOver || this.isPaused) return;
    const onExit = this.player.x === this.map.start.x && this.player.y === this.map.start.y;
    if (!onExit || this.player.rescuedDogs.length === 0) return;
    this.isPaused = true;
    this.moveDirection = null;
    this.onModal({ title: "Leave Landfill?", text: `You have ${this.player.rescuedDogs.length} rescued pup following you. Leave now?`, actions: [{ label: "Leave Mission", action: () => this.completeMission() }, { label: "Keep Exploring", action: () => { this.isPaused = false; } }] });
  }

  completeMission() {
    this.isOver = true;
    this.isPaused = false;
    this.moveDirection = null;
    const result = { success: true, dogsRescued: this.player.rescuedDogs.length, foodRemaining: this.player.food, reason: "escaped", level: this.currentLevelIndex + 1 };
    if (this.finishMission(result)) return;
    this.onModal({ title: "Mission Complete", text: `You rescued the pup from ${this.level.name} and returned with ${result.foodRemaining} food left.`, actions: [{ label: "Next Level", action: () => this.nextLevel() }, { label: "Replay Level", action: () => this.reset() }] });
  }
}
