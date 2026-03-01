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
    this.generateCraggyEdges();
    this.currentLevelIndex = index;
  }

  generateCraggyEdges() {
    this.edges = [];
    const jitter = 15;

    for (let r = 0; r < this.worldMap.length; r++) {
      for (let c = 0; c < this.worldMap[0].length; c++) {
        if (!this.isWater(c, r)) {
          const x = c * TILE;
          const y = r * TILE;

          // Check neighbors: if a neighbor is empty, create a jagged edge for that side
          // Top Edge
          if (this.isWater(c, r - 1)) {
            this.edges.push(this.createSegment(x, y, x + TILE, y, jitter));
          }
          // Bottom Edge
          if (this.isWater(c, r + 1)) {
            this.edges.push(
              this.createSegment(x, y + TILE, x + TILE, y + TILE, jitter)
            );
          }
          // Left Edge
          if (this.isWater(c - 1, r)) {
            this.edges.push(this.createSegment(x, y, x, y + TILE, jitter));
          }
          // Right Edge
          if (this.isWater(c + 1, r)) {
            this.edges.push(
              this.createSegment(x + TILE, y, x + TILE, y + TILE, jitter)
            );
          }
        }
      }
    }
  }

  createSegment(x1, y1, x2, y2, j) {
    // Create a midpoint to make the line "uneven"
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * j;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * j;
    return [
      { x: x1, y: y1 },
      { x: midX, y: midY },
      { x: x2, y: y2 },
    ];
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
