export class Gauge {
  constructor() {
    this.depthFactor = 0;
  }
  update(sub) {
    const safeDepth = 400;
    if (sub.y > safeDepth) {
      // Damage increases the deeper you go
      this.depthFactor = (sub.y - safeDepth) / 200;
      sub.hull -= 0.05 * this.depthFactor;
      return true;
    }
    return false;
  }
  draw(ctx, sub) {
    ctx.save();
    const gaugeX = 770;
    const gaugeY = 400;
    const gaugeH = 150;

    // Gauge Background
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(gaugeX, gaugeY, 10, gaugeH);

    // Warning Zone (Red)
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    ctx.fillRect(gaugeX, gaugeY + 100, 10, 50);

    // Depth Needle
    const depthPos = (sub.y / 600) * gaugeH;
    ctx.fillStyle = sub.y > 400 ? "#f00" : "#66fcf1";
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(gaugeX - 5, gaugeY + depthPos, 20, 2);

    ctx.restore();
  }
}
