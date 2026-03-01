export class SurvivalMetrics {
  drawSurvivalMeters(ctx, sub) {
    ctx.save();
    // Positioned in the bottom-left corner
    const centerX = 80;
    const centerY = ctx.canvas.height - 80;
    const radius = 50;

    // We'll use two concentric arcs
    // Outer arc = Hull (Health)
    // Inner arc = Oxygen
    const startAngle = Math.PI * 0.2; // 36 degrees
    const endAngle = Math.PI * 1.6; // 288 degrees
    const totalArc = endAngle - startAngle;

    // 1. HULL GAUGE (Outer)
    const hullPercent = Math.max(sub.hull / 100, 0);
    const hullColor =
      hullPercent < 0.3 ? "rgba(255, 50, 50, 0.8)" : "rgba(102, 252, 241, 0.8)";

    // Background track
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Active Hull line
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius,
      startAngle,
      startAngle + totalArc * hullPercent
    );
    ctx.strokeStyle = hullColor;
    ctx.lineWidth = 6;
    ctx.shadowBlur = hullPercent < 0.3 ? 15 : 0; // Pulse glow if dying
    ctx.shadowColor = "red";
    ctx.stroke();

    // 2. OXYGEN GAUGE (Inner)
    const o2Percent = Math.max(sub.o2 / 100, 0);
    const o2Color = "rgba(255, 255, 255, 0.7)"; // Oxygen is usually white/blue

    // Background track
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 10, startAngle, endAngle);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Active Oxygen line
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius - 10,
      startAngle,
      startAngle + totalArc * o2Percent
    );
    ctx.strokeStyle = o2Color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. READOUTS
    ctx.textAlign = "center";
    ctx.shadowBlur = 0;

    // Hull Number
    ctx.fillStyle = hullColor;
    ctx.font = "bold 14px monospace";
    ctx.fillText(Math.ceil(sub.hull), centerX, centerY);

    // Labels
    ctx.font = "8px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("HULL", centerX, centerY + 12);
    ctx.fillText("O2", centerX, centerY - 15);

    // 4. GLASS GLINT (Mirrored)
    const grad = ctx.createLinearGradient(
      centerX + radius,
      centerY - radius,
      centerX - radius,
      centerY + radius
    );
    grad.addColorStop(0.48, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.06)");
    grad.addColorStop(0.52, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
