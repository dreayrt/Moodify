const TARGET_RATE = 22050;
const FRAME_SIZE = 2048;
const HOP_SIZE = 512;
const MIN_LAG = Math.ceil(TARGET_RATE / 1200);
const MAX_LAG = Math.floor(TARGET_RATE / 65);
const SILENCE_RMS = 10 ** (-55 / 20);
const YIN_THRESHOLD = 0.15;
const FRAMES_PER_MESSAGE = Math.floor(TARGET_RATE / HOP_SIZE);

class KaraokePitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ring = new Float32Array(FRAME_SIZE);
    this.frame = new Float32Array(FRAME_SIZE);
    this.difference = new Float64Array(MAX_LAG + 1);
    this.ringIndex = FRAME_SIZE / 2;
    this.contextSamples = FRAME_SIZE / 2;
    this.realSamples = 0;
    this.framesProcessed = 0;
    this.phase = 0;
    this.previousInput = 0;
    this.hasPreviousInput = false;
    this.recording = false;
    this.targetPerSourceSample = TARGET_RATE / sampleRate;
    this.audioSamples = 0;
    this.sumSquares = 0;
    this.clippedSamples = 0;
    this.pendingPitches = [];
    this.pendingProbabilities = [];
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  handleMessage(message) {
    if (message?.type === "start") {
      this.resetCapture();
      this.recording = true;
      return;
    }
    if (message?.type === "abort") {
      this.recording = false;
      this.flushFeatures();
      return;
    }
    if (message?.type === "finalize" && this.recording) {
      this.finishCapture();
    }
  }

  resetCapture() {
    this.ring.fill(0);
    this.ringIndex = FRAME_SIZE / 2;
    this.contextSamples = FRAME_SIZE / 2;
    this.realSamples = 0;
    this.framesProcessed = 0;
    this.phase = 0;
    this.previousInput = 0;
    this.hasPreviousInput = false;
    this.audioSamples = 0;
    this.sumSquares = 0;
    this.clippedSamples = 0;
    this.pendingPitches = [];
    this.pendingProbabilities = [];
  }

  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (output) output.fill(0);
    if (!this.recording) return true;

    const channels = inputs[0];
    if (!channels?.length) return true;
    const frames = channels[0].length;
    for (let i = 0; i < frames; i += 1) {
      let value = 0;
      for (const channel of channels) value += channel[i] ?? 0;
      value /= channels.length;
      this.audioSamples += 1;
      this.sumSquares += value * value;
      if (Math.abs(value) >= 0.999) this.clippedSamples += 1;

      if (!this.hasPreviousInput) {
        this.previousInput = value;
        this.hasPreviousInput = true;
        continue;
      }

      const phaseBefore = this.phase;
      this.phase += this.targetPerSourceSample;
      if (this.phase >= 1) {
        const fraction = Math.max(0, Math.min(1,
          (1 - phaseBefore) / this.targetPerSourceSample));
        const resampled = this.previousInput + (value - this.previousInput) * fraction;
        this.appendTargetSample(resampled);
        this.phase -= 1;
      }
      this.previousInput = value;
    }
    return true;
  }

  appendTargetSample(value) {
    this.ring[this.ringIndex] = value;
    this.ringIndex = (this.ringIndex + 1) % FRAME_SIZE;
    this.contextSamples += 1;
    this.realSamples += 1;
    if (this.contextSamples >= FRAME_SIZE
        && (this.contextSamples - FRAME_SIZE) % HOP_SIZE === 0) {
      this.processFrame();
    }
  }

  processFrame() {
    let sumSquares = 0;
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      const value = this.ring[(this.ringIndex + i) % FRAME_SIZE];
      this.frame[i] = value;
      sumSquares += value * value;
    }
    const rms = Math.sqrt(sumSquares / FRAME_SIZE);
    let pitch = null;
    let confidence = 0;
    if (rms >= SILENCE_RMS) {
      const estimate = this.yin(this.frame);
      if (estimate) {
        pitch = estimate.pitch;
        confidence = estimate.confidence;
      }
    }
    this.pendingPitches.push(pitch);
    this.pendingProbabilities.push(confidence);
    this.framesProcessed += 1;
    if (this.pendingPitches.length >= FRAMES_PER_MESSAGE) this.flushFeatures();
  }

  yin(frame) {
    const compareLength = FRAME_SIZE - MAX_LAG;
    let runningDifference = 0;
    let bestLag = -1;
    let bestValue = Number.POSITIVE_INFINITY;

    for (let lag = 1; lag <= MAX_LAG; lag += 1) {
      let difference = 0;
      for (let i = 0; i < compareLength; i += 1) {
        const delta = frame[i] - frame[i + lag];
        difference += delta * delta;
      }
      this.difference[lag] = difference;
      runningDifference += difference;
      const normalized = runningDifference > 0
        ? difference * lag / runningDifference
        : 1;
      this.difference[lag] = normalized;
      if (lag >= MIN_LAG && normalized < bestValue) {
        bestValue = normalized;
        bestLag = lag;
      }
    }

    if (bestLag < MIN_LAG || bestValue > 0.35) return null;
    let selectedLag = bestLag;
    for (let lag = MIN_LAG; lag <= MAX_LAG; lag += 1) {
      if (this.difference[lag] < YIN_THRESHOLD) {
        selectedLag = lag;
        while (selectedLag < MAX_LAG
            && this.difference[selectedLag + 1] < this.difference[selectedLag]) {
          selectedLag += 1;
        }
        bestValue = this.difference[selectedLag];
        break;
      }
    }

    const left = this.difference[Math.max(MIN_LAG, selectedLag - 1)];
    const center = this.difference[selectedLag];
    const right = this.difference[Math.min(MAX_LAG, selectedLag + 1)];
    const denominator = left - 2 * center + right;
    const shift = Math.abs(denominator) > 1e-12
      ? 0.5 * (left - right) / denominator
      : 0;
    const refinedLag = selectedLag + Math.max(-0.5, Math.min(0.5, shift));
    const pitch = TARGET_RATE / refinedLag;
    if (!Number.isFinite(pitch) || pitch < 60 || pitch > 1300) return null;
    return { pitch, confidence: Math.max(0, Math.min(1, 1 - bestValue)) };
  }

  flushFeatures() {
    if (!this.pendingPitches.length) return;
    this.port.postMessage({
      type: "features",
      f0_hz: this.pendingPitches,
      voiced_probability: this.pendingProbabilities,
    });
    this.pendingPitches = [];
    this.pendingProbabilities = [];
  }

  finishCapture() {
    const expectedFrames = Math.ceil(this.realSamples / HOP_SIZE);
    while (this.framesProcessed < expectedFrames) this.appendPaddingSample();
    this.flushFeatures();
    const meanSquare = this.audioSamples ? this.sumSquares / this.audioSamples : 0;
    this.port.postMessage({
      type: "summary",
      duration_seconds: this.realSamples / TARGET_RATE,
      rms_dbfs: meanSquare > 0 ? 10 * Math.log10(meanSquare) : -240,
      clipped_fraction: this.audioSamples ? this.clippedSamples / this.audioSamples : 0,
      frame_count: this.framesProcessed,
    });
    this.recording = false;
  }

  appendPaddingSample() {
    this.ring[this.ringIndex] = 0;
    this.ringIndex = (this.ringIndex + 1) % FRAME_SIZE;
    this.contextSamples += 1;
    if (this.contextSamples >= FRAME_SIZE
        && (this.contextSamples - FRAME_SIZE) % HOP_SIZE === 0) {
      this.processFrame();
    }
  }
}

registerProcessor("karaoke-pitch-processor", KaraokePitchProcessor);
