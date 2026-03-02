import { AudioManager } from "./audioManager.mjs";
import { Gauge } from "./entities/gauge.mjs";
import { Shake } from "./entities/shake.mjs";
import { Sonar } from "./entities/sonar.mjs";
import { Submarine } from "./entities/submarine.mjs";
import { SurvivalMetrics } from "./entities/survivalmetrics.mjs";
import { LevelManager } from "./levelManager.mjs";

class AbyssEngine {
  constructor() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");

    // --- Ghosting Canvas (Persistence) ---
    this.ghostCanvas = document.createElement("canvas");
    this.ghostCanvas.width = 800;
    this.ghostCanvas.height = 600;
    this.ghostCtx = this.ghostCanvas.getContext("2d");

    this.sub = new Submarine(60, 60);
    this.levelManager = new LevelManager();
    this.levelManager.loadLevel(0, this.sub);

    this.audioManager = new AudioManager();
    this.sonar = new Sonar(this.audioManager);
    this.shake = new Shake();
    this.gauge = new Gauge();
    this.survivalMetrics = new SurvivalMetrics();

    this.keys = {};

    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      this.audioManager.start();
    });
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        this.audioManager.start();
        this.isTouching = true;
        const t = e.touches[0];

        // If touch is on the left: Handle Joystick
        if (t.clientX < window.innerWidth / 2) {
          this.joystickBase = { x: t.clientX, y: t.clientY };
        }
        // If touch is on the right: Trigger Sonar
        else {
          if (this.sonar.triggerSonar(this.canvas)) {
            this.shake.triggerShake(25);
            if (window.navigator.vibrate) window.navigator.vibrate(20); // Haptic click
          }
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener("touchmove", (e) => {
      if (!this.isTouching) return;
      const touch = e.touches[0];

      // Calculate distance from base to current finger position
      const dx = touch.clientX - this.joystickBase.x;
      const dy = touch.clientY - this.joystickBase.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(Math.hypot(dx, dy), 50); // Cap the pull distance

      // Map this to submarine controls
      this.sub.angle = angle;
      this.sub.speed = dist / 50; // 0 to 1 thrust
    });

    this.canvas.addEventListener("touchend", () => {
      this.isTouching = false;
      this.sub.speed = 0;
    });

    document.getElementById("start-btn").addEventListener("click", () => {
      this.enterFullscreen();
    });
    this.loop();
  }

  enterFullscreen() {
    const doc = window.document;
    const docEl = doc.documentElement;

    const requestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;

    if (requestFullScreen) {
      requestFullScreen.call(docEl);
    }
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set the internal drawing resolution (Sharpness)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Set the CSS display size (Layout)
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";

    // Scale the context so 1 unit = 1 pixel regardless of DPR
    this.ctx.scale(dpr, dpr);

    // Update your game constants
    // WIDTH = width;
    // HEIGHT = height;
  }
  update() {
    if (this.keys["Space"]) {
      if (this.sonar.triggerSonar(this.canvas)) {
        this.shake.triggerShake(25);
      }
    }
    if (this.sub.update(this.levelManager, this.keys, this.joystickBase)) {
      this.audioManager.playSound(80, "triangle", 0.4, 0.2);
      this.shake.triggerShake(15);
    }
    if (this.gauge.update(this.sub)) {
      this.shake.triggerShake(
        Math.max(this.shake.shake, this.gauge.depthFactor * 2)
      );

      // Play hull creak sound periodically
      if (Math.random() > 0.98) this.audioManager.playCreakSound();
    }

    this.audioManager.setSpeed(this.sub.speed);
    this.shake.update();
    this.sonar.update();

    if (
      this.levelManager.relics.update(
        this.sonar.sonarRadius,
        this.sub,
        this.levelManager
      )
    ) {
      this.audioManager.playCollectSound();
    }
    if (this.sub.hull <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.audioManager.playSinkingSound();
      this.audioManager.stop();
    }

    // Phosphor decay on Ghost Canvas
    this.ghostCtx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ghostCtx.fillRect(0, 0, 800, 600);

    this.levelManager.checkWinCondition();
  }

  draw() {
    this.ctx.save();

    // 1. Apply shake effect
    this.shake.draw(this.ctx);

    // 2. Background
    this.ctx.fillStyle = "#01050a";
    this.ctx.fillRect(0, 0, 800, 600);

    // 4. High-Contrast Sonar Ignition
    this.sonar.draw(this.levelManager, this.ctx, this.ghostCtx, this.sub);

    // 5. Render Ghosting & Torch
    this.ctx.save();
    this.ctx.globalCompositeOperation = "screen";
    this.ctx.drawImage(this.ghostCanvas, 0, 0);
    this.ctx.restore();

    // 6. Final Layer (Relics & Sub)
    this.sub.draw(this.levelManager, this.ctx);
    this.levelManager.relics.draw(this.ctx);
    this.gauge.draw(this.ctx, this.sub);
    this.survivalMetrics.drawSurvivalMeters(this.ctx, this.sub);

    this.ctx.restore();
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

new AbyssEngine();
