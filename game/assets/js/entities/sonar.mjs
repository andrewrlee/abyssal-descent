const TILE = 40;

export class Sonar {
  constructor(audioManager) {
    this.sonarRadius = 0;
    this.sonarCooldown = 0;
    this.audioManager = audioManager;
    this.sonarMax = 200; // increase to make more powerful
  }

  triggerSonar(canvas) {
    if (this.sonarCooldown > 0) return false;
    this.audioManager.playSound(600, "sine", 1.2, 0.1);
    this.sonarRadius = 2;
    this.sonarCooldown = 200;
    canvas.classList.add("sonar-glitch");
    setTimeout(() => canvas.classList.remove("sonar-glitch"), 250);
    return true;
  }

  update() {
    if (this.sonarRadius > 0) {
      this.sonarRadius += 1.2;
      if (this.sonarRadius > this.sonarMax) this.sonarRadius = 0;
    }
    if (this.sonarCooldown > 0) this.sonarCooldown--;
  }

  draw(levelManager, ctx, ghostCtx, sub) {
    if (this.sonarRadius > 0) {
      this.drawSonar(levelManager, ctx, ghostCtx, sub);
      this.drawGridAndScanlines(ctx);
    }
  }

  drawSonar(levelManager, ctx, ghostCtx, sub) {
    const opacity = 1 - this.sonarRadius / this.sonarMax;
    const beamWidth = 70;
    const rInner = Math.max(0.1, this.sonarRadius - beamWidth);
    const rOuter = Math.max(0.2, this.sonarRadius);

    // Draw to Main
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    let ignitionGrad = ctx.createRadialGradient(
      sub.x,
      sub.y,
      rInner,
      sub.x,
      sub.y,
      rOuter
    );
    ignitionGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    ignitionGrad.addColorStop(0.5, `rgba(0, 255, 255, ${opacity})`);
    ignitionGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = ignitionGrad;
    ctx.beginPath();
    ctx.arc(sub.x, sub.y, rOuter, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Paint to Ghost Canvas
    ghostCtx.save();
    ghostCtx.beginPath();
    levelManager.worldMap.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v === 1) ghostCtx.rect(c * TILE, r * TILE, TILE, TILE);
      })
    );
    ghostCtx.clip();
    ghostCtx.fillStyle = `rgba(69, 162, 158, ${opacity * 0.25})`;
    ghostCtx.beginPath();
    ghostCtx.arc(sub.x, sub.y, rOuter, 0, Math.PI * 2);
    ghostCtx.fill();
    ghostCtx.restore();
  }

  drawGridAndScanlines(ctx) {
    ctx.save();
    ctx.globalAlpha = (1 - this.sonarRadius / this.sonarMax) * 0.15;
    ctx.strokeStyle = "#45a29e";
    for (let i = 0; i < 800; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 600);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(800, i);
      ctx.stroke();
    }
    ctx.restore();
  }
}
