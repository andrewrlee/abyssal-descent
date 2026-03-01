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

  drawDetectedWalls(levelManager, ctx, sonarRadius) {
    const normalizeAngle = (a) => {
      while (a < -Math.PI) a += Math.PI * 2;
      while (a > Math.PI) a -= Math.PI * 2;
      return a;
    };

    levelManager.edges.forEach((edge) => {
      const midX = edge[1].x;
      const midY = edge[1].y;
      const dist = Math.hypot(midX - this.x, midY - this.y);

      // 1. Detection Logic
      const isHitBySonar = Math.abs(dist - sonarRadius) < 20;
      const angleToEdge = Math.atan2(midY - this.y, midX - this.x);
      const angleDiff = Math.abs(normalizeAngle(angleToEdge - this.angle));
      const isHitByTorch = dist < 180 && angleDiff < 0.55;

      // 2. If it's currently hit, we check LOS and set alpha to max
      if (isHitBySonar || isHitByTorch) {
        let isVisible = true;

        if (isHitByTorch && isVisible) {
          // Torch provides a high alpha, but it decays FAST
          edge.alpha = 0.9;
          edge.lastHitBy = "torch";
        } else if (isHitBySonar && isVisible) {
          // Sonar provides a "super-charge" that decays SLOWER
          edge.alpha = 1.2;
          edge.lastHitBy = "sonar";
        }
        const steps = Math.max(1, Math.floor(dist / 12));

        for (let i = 1; i < steps; i++) {
          const checkX = this.x + (midX - this.x) * (i / steps);
          const checkY = this.y + (midY - this.y) * (i / steps);
          const gridX = Math.floor(checkX / TILE);
          const gridY = Math.floor(checkY / TILE);

          if (!levelManager.isWater(gridX, gridY)) {
            if (gridX !== edge.c || gridY !== edge.r) {
              isVisible = false;
              break;
            }
          }
        }

        if (isVisible) {
          if (isVisible) {
            ctx.save();

            // --- STEP 1: ENGINE VIBRATION ---
            // Adds a tiny jitter to the world based on sub movement
            const shake = (Math.random() - 0.5) * 0.7;
            ctx.translate(shake, shake);

            // --- STEP 2: ANALOG COLORS ---
            const baseColor = isHitBySonar ? "#66fcf1" : "#f5edce";
            ctx.strokeStyle = baseColor;

            // Create a flickering alpha for "Signal Interference"
            const flicker = 0.7 + Math.random() * 0.3;
            const falloff = 1 - Math.min(1, dist / 220);
            ctx.globalAlpha = edge.alpha * flicker * falloff;

            // --- STEP 3: THE JITTERED PATH ---
            // Instead of a straight line, we add a tiny midpoint offset
            ctx.beginPath();
            ctx.moveTo(edge[0].x, edge[0].y);

            // Midpoint with random "roughness"
            const j = 1.2; // Jitter amount
            const mx = edge[1].x + (Math.random() - 0.5) * j;
            const my = edge[1].y + (Math.random() - 0.5) * j;

            ctx.lineTo(mx, my);
            ctx.lineTo(edge[2].x, edge[2].y);

            // --- STEP 4: MULTI-PASS STROKE (The Glow) ---
            // Pass A: Wide, faint glow (The Phosphor)
            ctx.lineWidth = isHitBySonar ? 2 : 1;
            ctx.shadowBlur = 12;
            ctx.shadowColor = baseColor;
            ctx.stroke();

            // Pass B: Sharp, bright core (The Signal)
            ctx.shadowBlur = 0;
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = "#ffffff"; // Bright white center
            ctx.globalAlpha *= 0.8;
            ctx.stroke();

            ctx.restore();
          }
        }
      }
    });
  }

  getIntersection(ray, segment) {
    const x1 = ray.x1,
      y1 = ray.y1,
      x2 = ray.x2,
      y2 = ray.y2;
    const x3 = segment.x1,
      y3 = segment.y1,
      x4 = segment.x2,
      y4 = segment.y2;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return null; // Parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

    // If t is between 0-1, the intersection is on the ray
    // If u is between 0-1, the intersection is on the wall segment
    if (t > 0 && t <= 1 && u >= 0 && u <= 1) {
      return t; // Returns the percentage along the ray (0 to 1)
    }
    return null;
  }

  castTorch(levelManager, ctx) {
    const range = 180;
    const fov = 1.1;
    const rays = 120;

    // 1. Pre-filter edges (only check edges within torch range)
    const subAngle = this.angle;
    const normalizeAngle = (a) => {
      while (a < -Math.PI) a += Math.PI * 2;
      while (a > Math.PI) a -= Math.PI * 2;
      return a;
    };
    const nearbyEdges = levelManager.edges.filter((e) => {
      const dx = e[1].x - this.x;
      const dy = e[1].y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > range + 20) return false;

      // Dot product to check if the edge is "in front" of the sub
      const angleToEdge = Math.atan2(dy, dx);
      const diff = Math.abs(normalizeAngle(angleToEdge - subAngle));
      return diff < 1.6; // Only check edges in a 180-degree forward arc
    });

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);

    for (let i = 0; i <= rays; i++) {
      let angle = this.angle - fov / 2 + (i / rays) * fov;
      let rayEnd = {
        x1: this.x,
        y1: this.y,
        x2: this.x + Math.cos(angle) * range,
        y2: this.y + Math.sin(angle) * range,
      };

      let closestT = 1; // 1 means the full range of the torch

      // Check this ray against every craggy segment
      nearbyEdges.forEach((edge) => {
        // Check both segments of your jagged edge (p0-p1 and p1-p2)
        const seg1 = {
          x1: edge[0].x,
          y1: edge[0].y,
          x2: edge[1].x,
          y2: edge[1].y,
        };
        const seg2 = {
          x1: edge[1].x,
          y1: edge[1].y,
          x2: edge[2].x,
          y2: edge[2].y,
        };

        const t1 = this.getIntersection(rayEnd, seg1);
        if (t1 !== null && t1 < closestT) closestT = t1;

        const t2 = this.getIntersection(rayEnd, seg2);
        if (t2 !== null && t2 < closestT) closestT = t2;
      });

      const finalX = this.x + Math.cos(angle) * (range * closestT);
      const finalY = this.y + Math.sin(angle) * (range * closestT);
      ctx.lineTo(finalX, finalY);
    }

    // Gradient and fill logic...
    let grad = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      range
    );
    grad.addColorStop(0, `rgba(102, 252, 241, 0.4)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  draw(levelManager, ctx) {
    // this.drawDetectedWalls(levelManager, ctx);
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
  }
}
