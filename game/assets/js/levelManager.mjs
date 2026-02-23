import { Relic } from "./entities/relic.mjs";
import { Relics } from "./entities/relics.mjs";
import { levels } from "./levels.mjs";

const TILE = 40;

export class LevelManager {
  constructor() {
    this.currentLevelIndex = 0;
    this.worldMap = undefined;
    this.sub = undefined;
    this.relics = undefined;
  }

  loadLevel(index, sub) {
    const level = levels[index];
    console.log(`Loading: ${level.name}`);

    // 1. Set the Map
    this.worldMap = level.layout; // This replaces the old 2D array

    // 2. Reset Player
    this.sub = sub;
    this.sub.reset(level.start.x, level.start.y);

    // 3. Clear and Spawn Entities
    this.spawnRelics(level.relicCount);

    // beasts = [];
    // this.spawnEnemies(index + 1); // Get harder as level index increases

    this.currentLevelIndex = index;
  }

  isWater(x, y) {
    return this.worldMap?.[y]?.[x] === 0;
  }

  spawnRelics(count) {
    let relics = [];
    for (let i = 0; i < count; i++) {
      let r, c;
      do {
        r = Math.floor(Math.random() * 15);
        c = Math.floor(Math.random() * 20);
      } while (!this.isWater(c, r));
      const relic = new Relic(c * TILE + 20, r * TILE + 20);
      relics.push(relic);
    }
    this.relics = new Relics(relics);
  }

  checkWinCondition() {
    if (this.relics.relics.length === 0) {
      this.nextLevel();
    }
  }

  nextLevel() {
    if (this.currentLevelIndex + 1 < levels.length) {
      this.loadLevel(this.currentLevelIndex + 1, this.sub);
    } else {
      alert("Surface Reached! You Escaped the Abyss.");
    }
  }
}
