export class Relic {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 12 + Math.random() * 8;
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = 0.02;
    this.color = ["#66fcf1", "#f5edce", "#ff0055", "#a066ff"][
      Math.floor(Math.random() * 4)
    ];
    this.points = Math.floor(Math.random() * 3) + 3;
    this.pulse = Math.random() * 10;
    this.detected = 0; // The "Awakening" timer (frames)
  }

  update(sonarRadius, subX, subY) {
    // 1. Check if Sonar Wave is passing over us
    const distToSub = Math.hypot(this.x - subX, this.y - subY);
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

  draw(ctx) {
    const isAwake = this.detected > 0;
    const pulseVal = Math.sin(this.pulse) * (isAwake ? 8 : 2);
    const alpha = isAwake ? 1.0 : 0.2; // Dim when sleeping

    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. The Core Aura
    const glowRad = isAwake ? this.size + 20 + pulseVal : 5;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRad);
    grad.addColorStop(0, this.color);
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
      ctx.strokeStyle = "#ffffff";
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
      ctx.fillStyle = "#fff";
      ctx.fillRect(-2, -2, 4, 4);
    } else {
      // Sleeping state: just a tiny, faint glimmer
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
