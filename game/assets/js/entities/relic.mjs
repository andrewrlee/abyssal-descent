export class Relic {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 12 + Math.random() * 8;
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = 0.02;
    this.color = [
      "#66fcf1",
      "#f5edce",
      "#ff0055",
      "#a066ff",
      "#ccff00",
      "#ff8c00",
      "#0047ff",
    ][Math.floor(Math.random() * 7)];
    this.points = Math.floor(Math.random() * 3) + 3;
    this.pulse = Math.random() * 10;
    this.detected = 0; // The "Awakening" timer (frames)
  }

  update(sonarRadius, sub, levelManager) {
    // 1. Check if Sonar Wave is passing over us
    const distToSub = Math.hypot(this.x - sub.x, this.y - sub.y);

    const torchRange = 150; // Max distance of light
    const torchSpread = 0.5; // Width of beam (approx 30 degrees)

    // Calculate the angle from the sub to the relic
    const angleToRelic = Math.atan2(this.y - sub.y, this.x - sub.x);

    // Check the difference between sub's heading and angle to relic
    // We use Math.atan2 logic to normalize the angle difference
    let angleDiff = Math.abs(this.normalizeAngle(angleToRelic - sub.angle));

    // TRIGGER CONDITION: Within range AND within beam spread
    if (distToSub < torchRange && angleDiff < torchSpread) {
      if (this.canSeeRelic(sub, this, levelManager)) {
      // if (this.detected < 60) {
        this.detected = 120; // Stay "awake" while lit
      }
    }

    // Standard animation logic...
    if (this.detected > 0) this.detected--;
    this.angle += this.detected > 0 ? 0.1 : 0.02;

    // If sonar radius is within 10px of our distance, awaken!
    if (Math.abs(sonarRadius - distToSub) < 10) {
      if (this.detected < 60) {
        this.detected = 180; // Stay awake for 3 seconds (60fps * 3)
        // Play a tiny high-pitched chime here if you like!
      }
    }

    // 2. Behavior Logic
    if (this.detected > 0) {
      this.detected--;
      this.rotSpeed = 0.15; // Spin fast when awake
      this.angle += this.rotSpeed;
    } else {
      this.rotSpeed = 0.02; // Slow idle
      this.angle += this.rotSpeed;
    }
    this.pulse += 0.05;
  }

  normalizeAngle(a) {
    while (a < -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
  }

  canSeeRelic(sub, relic, levelManager) {
    const dist = Math.hypot(relic.x - sub.x, relic.y - sub.y);
    const steps = Math.floor(dist / 10); // Check every 10 pixels

    for (let i = 1; i <= steps; i++) {
      // Linear interpolation to find the point along the line
      const checkX = sub.x + (relic.x - sub.x) * (i / steps);
      const checkY = sub.y + (relic.y - sub.y) * (i / steps);

      const gridC = Math.floor(checkX / 40); // TILE size
      const gridR = Math.floor(checkY / 40);

      if (!levelManager.isWater(gridC, gridR)) {
        return false; // Found a wall, block the light!
      }
    }
    return true; // Path is clear
  }

  draw(ctx) {
    const isAwake = this.detected > 0;
    const pulseVal = Math.sin(this.pulse) * (isAwake ? 8 : 2);

    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. The Core Aura
    const glowRad = isAwake ? this.size + 20 + pulseVal : 5;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRad);
    grad.addColorStop(0, isAwake ? this.color : "#ffffff");
    grad.addColorStop(1, "transparent");

    ctx.globalAlpha = isAwake ? 0.6 : 0.3;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
    ctx.fill();

    // 2. The Mysterious Geometry (Only visible when awake)
    if (isAwake) {
      ctx.rotate(this.angle);
      ctx.globalAlpha = Math.min(1, this.detected / 20); // Fade out at end of timer
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;

      ctx.beginPath();
      for (let i = 0; i < this.points; i++) {
        const px = Math.cos((i / this.points) * Math.PI * 2) * this.size;
        const py = Math.sin((i / this.points) * Math.PI * 2) * this.size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // 3. Central "Spark"
      ctx.fillStyle = this.color;
      ctx.fillRect(-2, -2, 4, 4);
    } else {
      // Sleeping state: just a tiny, faint glimmer
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
