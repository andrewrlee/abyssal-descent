export class Shake {
  constructor() {
    this.shake = 0;
  }

  triggerShake(level) {
    this.shake = level;
  }

  update() {
    if (this.shake > 0) {
      this.shake *= 0.92;
    }
  }

  draw(ctx) {
    if (this.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
    }
  }
}
