export class Relics {
  constructor(relics) {
    this.relics = relics;
  }
  update(sonarRadius, sub, levelManager) {
    const sizeBefore = this.relics.length;
    this.relics = this.relics.filter(
      (r) => Math.hypot(sub.x - r.x, sub.y - r.y) > 20
    );
    this.relics.forEach((r) => r.update(sonarRadius, sub, levelManager));
    return sizeBefore != this.relics.length;
  }

  draw(ctx) {
    this.relics.forEach((r) => r.draw(ctx));
  }
}
