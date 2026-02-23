export class AudioManager {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.osc = null;
    this.lfo = null;
    this.running = false;
  }

  playSound(freq, type, duration, vol) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioCtx.currentTime + duration
    );
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  start() {
    if (this.running) return;
    this.running = true;

    // 1. The Core Hum (Low Frequency)
    this.osc = this.audioCtx.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.setValueAtTime(40, this.audioCtx.currentTime); // Deep 40Hz

    // 2. Low Pass Filter (Removes the harsh "buzz," leaves the "thump")
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(100, this.audioCtx.currentTime);

    // 3. The "Chug" (LFO to oscillate volume)
    const vca = this.audioCtx.createGain();
    vca.gain.value = 0.1;

    this.lfo = this.audioCtx.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.setValueAtTime(2, this.audioCtx.currentTime); // 2 "chugs" per second

    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.value = 0.05;

    // Connect LFO to volume
    this.lfo.connect(lfoGain);
    lfoGain.connect(vca.gain);

    // Chain: Osc -> Filter -> Gain -> Output
    this.osc.connect(filter);
    filter.connect(vca);
    vca.connect(this.audioCtx.destination);

    this.osc.start();
    this.lfo.start();
  }

  // Dynamic Speed: Call this in your update loop!
  setSpeed(speed) {
    if (!this.running) return;
    // Faster movement = higher pitch and faster "chugging"
    const pitch = 40 + speed * 10;
    const tempo = 2 + speed * 2;
    this.osc.frequency.setTargetAtTime(pitch, this.audioCtx.currentTime, 0.1);
    this.lfo.frequency.setTargetAtTime(tempo, this.audioCtx.currentTime, 0.1);
  }

  playCollectSound() {
    if (!this.running) return;
    const now = this.audioCtx.currentTime;

    // 1. The "Bubble" (Low-frequency pop)
    const osc1 = this.audioCtx.createOscillator();
    const gain1 = this.audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(400, now + 0.1); // Quick rise

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    // 2. The "Metallic Clink" (High-frequency shimmer)
    const osc2 = this.audioCtx.createOscillator();
    const gain2 = this.audioCtx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(800, now + 0.05); // Offset slightly
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

    gain2.gain.setValueAtTime(0, now); // Starts silent
    gain2.gain.setTargetAtTime(0.2, now + 0.05, 0.01); // Quick peak
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // 3. Reverb/Echo (Optional: simulated by a Filter)
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1000;
    filter.Q.value = 1;

    // Connections
    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(filter);
    gain2.connect(filter);
    filter.connect(this.audioCtx.destination);

    // Execution
    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.3);
    console.log("played");
  }

  playSinkingSound() {
    if (!this.running) return;
    const now = this.audioCtx.currentTime;

    // --- LAYER 1: THE CRUNCH (Low Thud) ---
    const thud = this.audioCtx.createOscillator();
    const thudGain = this.audioCtx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(100, now);
    thud.frequency.exponentialRampToValueAtTime(0.01, now + 0.5); // Pitch "drops" away

    thudGain.gain.setValueAtTime(0.5, now);
    thudGain.gain.linearRampToValueAtTime(0, now + 0.5);

    // --- LAYER 2: METAL TEARING (The Screech) ---
    const metal = this.audioCtx.createOscillator();
    const metalGain = this.audioCtx.createGain();
    metal.type = "sawtooth";
    metal.frequency.setValueAtTime(200, now);
    // Modulate frequency randomly to sound like groaning metal
    metal.frequency.linearRampToValueAtTime(150, now + 0.2);
    metal.frequency.linearRampToValueAtTime(180, now + 0.4);

    const metalFilter = this.audioCtx.createBiquadFilter();
    metalFilter.type = "bandpass";
    metalFilter.frequency.value = 1000;
    metalFilter.Q.value = 5; // Narrow focus for "metallic" feel

    metalGain.gain.setValueAtTime(0, now);
    metalGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    metalGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    // --- LAYER 3: THE BUBBLES (White Noise) ---
    const bufferSize = this.audioCtx.sampleRate * 1.5;
    const buffer = this.audioCtx.createBuffer(
      1,
      bufferSize,
      this.audioCtx.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 1.2);

    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    // --- CONNECTIONS ---
    thud.connect(thudGain);
    thudGain.connect(this.audioCtx.destination);

    metal.connect(metalFilter);
    metalFilter.connect(metalGain);
    metalGain.connect(this.audioCtx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);

    // --- EXECUTION ---
    thud.start(now);
    thud.stop(now + 0.5);
    metal.start(now);
    metal.stop(now + 0.8);
    noise.start(now);
    noise.stop(now + 1.5);
  }

  playCreakSound() {
    if (!this.running) return;
    const now = this.audioCtx.currentTime;

    // 1. The "Metal Strain" (The core groan)
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = "triangle";
    // Start low, slide slightly up and then back down
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.linearRampToValueAtTime(65, now + 0.5);
    osc.frequency.linearRampToValueAtTime(58, now + 1.2);

    // 2. The "Filter Sweep" (This makes it feel underwater)
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.1); // "Pop" open
    filter.frequency.exponentialRampToValueAtTime(150, now + 1.2); // Muffle down

    // 3. The Envelope (Slow attack, slow decay)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.4); // Fade in the stress
    gain.gain.linearRampToValueAtTime(0, now + 1.2); // Fade out

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 1.2);

    // 4. The "Micro-Snap" (A tiny high-pitched tick for detail)
    if (Math.random() > 0.5) {
      const tick = this.audioCtx.createOscillator();
      const tickGain = this.audioCtx.createGain();
      tick.type = "square";
      tick.frequency.setValueAtTime(1200, now + 0.4);
      tickGain.gain.setValueAtTime(0.02, now + 0.4);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      tick.connect(tickGain);
      tickGain.connect(this.audioCtx.destination);
      tick.start(now + 0.4);
      tick.stop(now + 0.45);
    }
  }

  stop() {
    if (!this.running) return;
    if (this.osc && this.lfo) {
      this.osc.stop();
      this.lfo.stop();
    }
  }
}
