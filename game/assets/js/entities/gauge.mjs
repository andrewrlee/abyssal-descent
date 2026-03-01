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
    // Move to the bottom right, but give it some breathing room
    const centerX = ctx.canvas.width - 80;
    const centerY = ctx.canvas.height - 80;
    const radius = 50; // Smaller radius to save screen space

    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const totalArc = endAngle - startAngle;

    const maxDepth = 2000;
    const depthPercent = Math.min(sub.y / maxDepth, 1);
    const needleAngle = startAngle + depthPercent * totalArc;
    const dangerThreshold = 350; // Depth where things get dicey
    const isCritical = sub.y > dangerThreshold;

    // 1. Draw a pulsing red arc in the danger zone
    if (isCritical) {
      const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5; // Pulsing alpha
      ctx.beginPath();
      // Arc from 80% to 100% of the gauge
      ctx.arc(centerX, centerY, radius, startAngle + totalArc * 0.8, endAngle);
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.2 + pulse * 0.4})`;
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // 2. Add "Pressure Jitter" to the needle
    let needleJitter = 0;
    if (isCritical) {
      // Shakes more the deeper you go
      const intensity = (sub.y - dangerThreshold) / 500;
      needleJitter = (Math.random() - 0.5) * intensity * 0.1;
    }
    // 1. Subtle Background Arc (The "HUD" track)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = "rgba(102, 252, 241, 0.1)"; // Very faint
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. The Needle (The only bright element)
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor =
      sub.y > 1600 ? "rgba(255, 0, 0, 0.8)" : "rgba(102, 252, 241, 0.8)";
    ctx.strokeStyle = ctx.shadowColor;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    ctx.beginPath();
    // Needle doesn't start at center to keep the middle clear for text
    const innerNeedle = radius * 0.4;
    ctx.moveTo(
      centerX + Math.cos(needleAngle) * innerNeedle,
      centerY + Math.sin(needleAngle) * innerNeedle
    );
    ctx.lineTo(
      centerX + Math.cos(needleAngle) * radius,
      centerY + Math.sin(needleAngle) * radius
    );
    ctx.stroke();
    ctx.restore();

    // 3. Minimalist Digital Readout
    ctx.fillStyle = "rgba(102, 252, 241, 0.9)";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(sub.y) + "m", centerX, centerY + 5);

    ctx.font = "8px monospace";
    ctx.fillStyle = "rgba(102, 252, 241, 0.4)";
    ctx.fillText("DEPTH", centerX, centerY - 10);

    // 4. THE GLASS GLINT (The "Fancy" touch)
    // This adds a subtle reflection across the dial to make it look like glass
    const grad = ctx.createLinearGradient(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius
    );
    grad.addColorStop(0, "rgba(255, 255, 255, 0.0)");
    grad.addColorStop(0.45, "rgba(255, 255, 255, 0.0)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.08)"); // The "shine" line
    grad.addColorStop(0.55, "rgba(255, 255, 255, 0.0)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
