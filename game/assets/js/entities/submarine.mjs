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

  update(levelManager, keys, joystick) {
    // 1. Determine Input Thrust (0 to 1)
    let inputThrust = 0;
    if (keys["ArrowUp"]) {
      inputThrust = 1.0;
    } else if (joystick && joystick.active) {
      inputThrust = joystick.thrust;
    }

    // 2. Handle Rotation (Mobile vs Keyboard)
    if (joystick && joystick.active) {
      // Smoothly rotate toward the joystick angle
      let angleDiff = joystick.angle - this.angle;
      // Normalize to prevent the sub from spinning 360 degrees the "long way"
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      this.angle += angleDiff * 0.08; // Damped rotation for a "heavy" feel
    } else {
      if (keys["ArrowLeft"]) this.angle -= 0.045;
      if (keys["ArrowRight"]) this.angle += 0.045;
    }

    // 3. Apply Acceleration based on inputThrust
    if (inputThrust > 0) {
      // Variable acceleration: pulling the stick halfway moves the sub slowly
      this.speed = Math.min(this.speed + 0.08 * inputThrust, 2.2);
    } else {
      this.speed *= 0.98; // Natural water drag
    }

    // 4. Collision Detection & Movement
    let nextX = this.x + Math.cos(this.angle) * this.speed;
    let nextY = this.y + Math.sin(this.angle) * this.speed;

    if (
      levelManager.isWater(Math.floor(nextX / TILE), Math.floor(nextY / TILE))
    ) {
      this.x = nextX;
      this.y = nextY;
    } else {
      // CRASH LOGIC
      if (this.invuln <= 0 && Math.abs(this.speed) > 0.4) {
        this.hull -= 10;
        this.invuln = 60;
        this.speed = -0.8; // Bounce back

        // MOBILE HAPTICS: Shake the phone on impact
        if (window.navigator.vibrate) window.navigator.vibrate([50, 30, 50]);

        return true; // Signal a collision occurred
      }
      this.speed = 0; // Stop if hitting a wall at low speed
    }

    // 5. Vital Systems & Rickety Engine Shake
    if (this.invuln > 0) this.invuln--;
    this.o2 -= 0.008;

    // Add a tiny random jitter to x/y if the engine is pushing hard
    if (inputThrust > 0.8) {
      this.x += (Math.random() - 0.5) * 0.5;
      this.y += (Math.random() - 0.5) * 0.5;
    }

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
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(edge[0].x, edge[0].y);

          ctx.lineTo(edge[1].x, edge[1].y);
          ctx.lineTo(edge[2].x, edge[2].y);

          ctx.shadowBlur = 0;
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = "#655a5a"; // Bright white center
          ctx.globalAlpha *= 0.8;
          ctx.stroke();

          ctx.restore();
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
    const rays = 60;

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
    this.drawDetectedWalls(levelManager, ctx);
    this.castTorch(levelManager, ctx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 1. MAIN HULL (The "Rusty" Body)
    // We draw two halves to make it look like separate welded plates
    ctx.fillStyle = "#1a222d"; // Darker, iron-like color
    ctx.strokeStyle = "#45a29e"; // Dull teal (oxidized copper look)
    ctx.lineWidth = 1.5;

    // Back Plate
    ctx.beginPath();
    ctx.ellipse(-5, 0, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Front Plate (Overlapping to show a seam)
    ctx.beginPath();
    ctx.ellipse(8, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. RIVETS (The "Rickety" Detail)
    ctx.fillStyle = "#45a29e";
    for (let i = 0; i < 8; i++) {
      const rAngle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        -5 + Math.cos(rAngle) * 10,
        Math.sin(rAngle) * 8,
        1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 3. THE "JUNK" SAIL (Conning Tower)
    // Make it look tilted or uneven
    ctx.save();
    ctx.rotate(-0.05); // Slight "crooked" lean
    ctx.fillStyle = "#1a222d";
    ctx.fillRect(-4, -10, 8, 10);
    ctx.strokeRect(-4, -10, 8, 10);

    // Periscope (Thin, shaky wire)
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, -15);
    ctx.lineTo(3, -15);
    ctx.stroke();
    ctx.restore();

    // 4. EXPOSED PIPES (The "Unfinished" look)
    ctx.strokeStyle = "#66fcf1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-15, 4);
    ctx.bezierCurveTo(-18, 8, -10, 12, -5, 8); // A loose wire/pipe hanging off
    ctx.stroke();

    // 5. THE PORTHOLE (Flickering Light)
    // Give it a "dying bulb" feel
    const flicker = Math.random() > 0.95 ? 0.3 : 1;
    ctx.fillStyle =
      this.invuln > 0 ? "#ff0055" : `rgba(102, 252, 241, ${flicker})`;
    ctx.shadowBlur = 15 * flicker;
    ctx.shadowColor = "#66fcf1";
    ctx.beginPath();
    ctx.arc(14, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // 6. REAR PROPELLER (The "Wobbly" fan)
    const propSpin = (Date.now() * 0.02) % (Math.PI * 2);
    ctx.save();
    ctx.translate(-18, 0);
    ctx.rotate(propSpin);
    ctx.strokeStyle = "#45a29e";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.moveTo(-2, 0);
    ctx.lineTo(2, 0);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
}
