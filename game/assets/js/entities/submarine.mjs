const TILE = 40;

export class Submarine {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 0;
    this.hull = 100;
    this.o2 = 100;
    this.radius = 12;
    this.invuln = 0;
    this.particles = [];
  }
  reset(x, y) {
    this.x = x;
    this.y = y;
    this.o2 = 100;
    this.hull = 100;
  }

  update(levelManager, keys) {
    if (keys["ArrowLeft"]) this.angle -= 0.045;
    if (keys["ArrowRight"]) this.angle += 0.045;
    if (keys["ArrowUp"]) this.speed = Math.min(this.speed + 0.08, 2.2);
    else this.speed *= 0.98;

    let nextX = this.x + Math.cos(this.angle) * this.speed;
    let nextY = this.y + Math.sin(this.angle) * this.speed;

    if (
      levelManager.isWater(Math.floor(nextX / TILE), Math.floor(nextY / TILE))
    ) {
      this.x = nextX;
      this.y = nextY;
    } else {
      // Collision!
      if (this.invuln <= 0 && Math.abs(this.speed) > 0.4) {
        this.hull -= 10;
        this.invuln = 60;
        this.speed = -0.8;
        return true;
      }
    }
    if (Math.abs(this.speed) > 0.5 && Math.random() > 0.7) {
      this.particles.push({
        x: this.x - Math.cos(this.angle) * 15,
        y: this.y - Math.sin(this.angle) * 15,
        life: 1.0,
        size: Math.random() * 3,
      });
    }
    if (this.invuln > 0) this.invuln--;
    this.o2 -= 0.008;
    return false;
  }

  castTorch(levelManager, ctx) {
    let range = 150;
    const fov = 1.1;
    const rays = 150;
    let intensity = 0.4; // Default opacity

    // Calculate "Flicker Factor"
    if (this.hull < 50) {
      // As hull drops, intensity wavers more
      const hullPercent = this.hull / 100;
      // High chance of "dimming" if hull is low
      if (Math.random() > hullPercent + 0.2) {
        intensity = Math.random() * 0.1; // Dimming
        range = 100 + Math.random() * 50; // Beam shortens
      }
    }

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    for (let i = 0; i <= rays; i++) {
      let angle = this.angle - fov / 2 + (i / rays) * fov;
      let dx = Math.cos(angle),
        dy = Math.sin(angle);
      let dist = range;

      for (let d = 0; d < range; d += 8) {
        let checkX = Math.floor((this.x + dx * d) / TILE);
        let checkY = Math.floor((this.y + dy * d) / TILE);
        if (!levelManager.isWater(checkX, checkY)) {
          for (let f = d - 8; f <= d; f++) {
            if (
              !levelManager.isWater(
                Math.floor((this.x + dx * f) / TILE),
                Math.floor((this.y + dy * f) / TILE)
              )
            ) {
              dist = f - 0.5;
              break;
            }
          }
          break;
        }
      }
      ctx.lineTo(this.x + dx * dist, this.y + dy * dist);
    }
    let grad = ctx.createRadialGradient(
      this.x,
      this.y,
      5,
      this.x,
      this.y,
      range
    );
    grad.addColorStop(0, `rgba(102, 252, 241, ${intensity})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  draw(levelManager, ctx) {
    this.castTorch(levelManager, ctx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 1. Propeller Animation (oscillates based on speed)
    if (this.speed !== 0) {
      ctx.save();
      ctx.strokeStyle = "#45a29e";
      ctx.lineWidth = 2;
      const propOsc = Math.sin(Date.now() * 0.05) * 8; // Flickers fast
      ctx.beginPath();
      ctx.moveTo(-15, -propOsc);
      ctx.lineTo(-15, propOsc);
      ctx.stroke();
      ctx.restore();
    }

    // 2. The Hull (Main Body)
    // Create a linear gradient to give a 3D "top-down" metallic look
    let hullGrad = ctx.createLinearGradient(0, -8, 0, 8);
    hullGrad.addColorStop(0, "#1f2833"); // Shadow edge
    hullGrad.addColorStop(0.5, "#45a29e"); // Highlight center
    hullGrad.addColorStop(1, "#1f2833"); // Shadow edge

    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    // Tapered body: x, y, radiusX, radiusY, rotation, start, end
    ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#66fcf1";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. The Sail (Conning Tower)
    ctx.fillStyle = "#1f2833";
    ctx.fillRect(-2, -4, 6, 8);
    ctx.strokeStyle = "#66fcf1";
    ctx.strokeRect(-2, -4, 6, 8);

    // 4. Front Porthole / Lens
    ctx.fillStyle = this.invuln > 0 ? "#ff0055" : "#66fcf1"; // Red flash if damaged
    ctx.beginPath();
    ctx.arc(12, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // 5. Light Glow (Lens Flare)
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#66fcf1";
    ctx.beginPath();
    ctx.arc(12, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    this.particles.forEach((p, i) => {
      p.life -= 0.02;
      ctx.fillStyle = `rgba(102, 252, 241, ${p.life * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (p.life <= 0) this.particles.splice(i, 1);
    });
  }
}
