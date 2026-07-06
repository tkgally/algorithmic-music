const SharedHybridAudio = window.HybridAudio;
const SharedHybridBridge = window.HybridBridge;

const goldenRatio = 0.61803398875;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomBlend(count) {
  const weights = Array.from({ length: count }, () => Math.pow(Math.random(), 1.35) + 0.05);
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  return weights.map((value) => value / total);
}

function morphBlend(from, to, amount) {
  const blended = from.map((value, index) => value * (1 - amount) + to[index] * amount);
  const total = blended.reduce((sum, value) => sum + value, 0) || 1;
  return blended.map((value) => value / total);
}

function applyBlendFloor(value, count) {
  const floor = 0.08;
  return value * (1 - count * floor) + floor;
}

class HarmonicField {
  constructor() {
    this.minFrequency = 32.7; // ~C1
    this.maxFrequency = 1046.5; // ~C6
    this.baseFrequency = 110;
    this.motion = 0;
    this.phase = Math.random();
    this.ratioSet = [
      1.0,
      1.124,
      1.236,
      1.333,
      1.414,
      1.527,
      1.618,
      1.732,
      1.851,
      1.969,
      2.118,
    ];
  }

  drift() {
    this.motion += (Math.random() - 0.5) * 0.08;
    this.motion = Math.max(-1.0, Math.min(1.0, this.motion));
    const shift = this.motion * 0.035;
    const ratio = Math.pow(2, shift);
    this.baseFrequency *= ratio;
    if (this.baseFrequency < this.minFrequency * 0.6) {
      this.baseFrequency *= 2;
    } else if (this.baseFrequency > this.maxFrequency * 0.6) {
      this.baseFrequency *= 0.5;
    }
  }

  syncToRhythm(event, coordination) {
    if (!event || !Number.isFinite(coordination) || coordination <= 0) {
      return;
    }
    const strength = Math.min(1, coordination);
    const normalizedBeat = Number.isFinite(event.normalizedBeat) ? event.normalizedBeat : 0;
    this.phase = ((this.phase * (1 - strength * 0.6)) + (normalizedBeat * strength * 0.6)) % 1;
    if (event.isDownbeat) {
      const direction = event.intensity > 0.5 ? 1 : -1;
      this.motion += direction * strength * 0.2;
      this.motion = Math.max(-1, Math.min(1, this.motion));
      const intensityBias = (event.intensity || 0) - 0.5;
      const freqShift = Math.pow(2, intensityBias * strength * 0.5);
      this.baseFrequency *= freqShift;
      if (this.baseFrequency < this.minFrequency * 0.6) {
        this.baseFrequency *= 2;
      } else if (this.baseFrequency > this.maxFrequency * 0.6) {
        this.baseFrequency *= 0.5;
      }
    }
  }

  nextFrequency() {
    this.drift();
    this.phase = (this.phase + goldenRatio) % 1;
    const ratioIndex = Math.floor(this.phase * this.ratioSet.length) % this.ratioSet.length;
    const harmonicRatio = this.ratioSet[ratioIndex];
    let freq = this.baseFrequency * harmonicRatio;
    const octaveShift = Math.floor((Math.random() - 0.5) * 5); // -2 to +2 octaves
    freq *= Math.pow(2, octaveShift);
    const subtleDrift = 1 + (Math.random() - 0.5) * 0.06;
    freq *= subtleDrift;
    while (freq < this.minFrequency) {
      freq *= 2;
    }
    while (freq > this.maxFrequency) {
      freq *= 0.5;
    }
    return freq;
  }
}

class DroneVoice {
  constructor(context, field, masterGain, manager, index) {
    this.context = context;
    this.field = field;
    this.masterGain = masterGain;
    this.manager = manager;
    this.index = index;
    this.timeoutId = null;
    this.isStopped = true;
    this.activeNodes = [];
    this.previousBlend = randomBlend(3);
  }

  start(initialDelay = 0) {
    this.isStopped = false;
    const delay = Math.max(0, initialDelay);
    this.timeoutId = window.setTimeout(() => this.playNote(), delay * 1000);
  }

  playNote() {
    this.timeoutId = null;
    if (this.isStopped || !this.manager.isRunning) {
      return;
    }

    const ctx = this.context;
    const now = ctx.currentTime;
    const rhythmState = this.manager.getRhythmState ? this.manager.getRhythmState() : { energy: 0, coordination: 0, lastEvent: null };
    const energy = Math.max(0, Math.min(1, rhythmState.energy || 0));
    const coordination = Math.max(0, Math.min(1, rhythmState.coordination || 0));
    const syncIntensity = Math.min(1, energy * coordination);
    const baseDelay = randomBetween(0.04, 0.12) * (coordination > 0 ? 1 - 0.3 * coordination : 1);
    let startTime = now + baseDelay;
    if (SharedHybridBridge && typeof SharedHybridBridge.getAlignedTime === 'function') {
      startTime = SharedHybridBridge.getAlignedTime(now, baseDelay);
    }
    let totalDuration = randomBetween(1.2, 10);
    totalDuration *= 1 - 0.2 * syncIntensity;
    totalDuration = Math.max(1, totalDuration);
    let attack = Math.min(randomBetween(0.3, 2.2), totalDuration * 0.5);
    let release = Math.min(randomBetween(0.8, 3.5), totalDuration * 0.6);
    if (syncIntensity > 0) {
      attack *= 1 - 0.45 * syncIntensity;
      release *= 1 - 0.3 * syncIntensity;
    }
    attack = Math.max(0.12, attack);
    release = Math.max(0.35, release);
    if (attack + release > totalDuration * 0.9) {
      const scale = (totalDuration * 0.9) / (attack + release);
      attack *= scale;
      release *= scale;
    }
    const sustainTime = Math.max(0.15, totalDuration - attack - release);
    let frequency = this.field.nextFrequency();
    if (rhythmState.lastEvent && rhythmState.lastEvent.isDownbeat && coordination > 0.3) {
      const octaveBias = rhythmState.lastEvent.intensity > 0.55 ? 0.5 : -0.25;
      frequency *= Math.pow(2, octaveBias * coordination);
    }
    frequency = Math.min(this.field.maxFrequency, Math.max(this.field.minFrequency, frequency));

    const gain = ctx.createGain();
    const mixGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const panner = ctx.createStereoPanner();

    const oscillatorTypes = ['sine', 'triangle', 'sawtooth'];
    const nextBlend = randomBlend(oscillatorTypes.length);
    const blendMid = morphBlend(this.previousBlend, nextBlend, randomBetween(0.35, 0.75));
    const blendEnd = morphBlend(
      blendMid,
      randomBlend(oscillatorTypes.length),
      randomBetween(0.4, 0.85),
    );
    const blendStart = this.previousBlend;
    this.previousBlend = blendEnd.slice();

    const fadeEnd = startTime + attack + sustainTime + release;
    const midTime = Math.min(fadeEnd, startTime + attack + sustainTime * randomBetween(0.25, 0.85));
    const epsilon = 0.0001;

    const oscillators = [];
    const oscGains = [];

    oscillatorTypes.forEach((type, index) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      const baseFrequency = frequency * (1 + (Math.random() - 0.5) * 0.01 * (index + 1));
      osc.frequency.setValueAtTime(baseFrequency, startTime);
      const endFrequency = baseFrequency * (1 + (Math.random() - 0.5) * 0.04);
      osc.frequency.linearRampToValueAtTime(endFrequency, startTime + totalDuration);

      const oscGain = ctx.createGain();
      const startWeight = applyBlendFloor(blendStart[index], oscillatorTypes.length);
      const midWeight = applyBlendFloor(blendMid[index], oscillatorTypes.length);
      const endWeight = applyBlendFloor(blendEnd[index], oscillatorTypes.length);
      oscGain.gain.setValueAtTime(startWeight, startTime);
      oscGain.gain.linearRampToValueAtTime(midWeight * randomBetween(0.85, 1.2), midTime);
      const settleTime = Math.max(
        midTime + 0.1,
        startTime + attack + sustainTime * randomBetween(0.5, 1.05),
      );
      oscGain.gain.linearRampToValueAtTime(Math.max(0.05, endWeight * randomBetween(0.7, 1.15)), Math.min(settleTime, fadeEnd));
      oscGain.gain.linearRampToValueAtTime(Math.max(0.03, endWeight * 0.6), fadeEnd);

      osc.connect(oscGain);
      oscGain.connect(mixGain);
      oscillators.push(osc);
      oscGains.push(oscGain);
    });

    const mixPulseTime = startTime + attack + sustainTime * randomBetween(0.2, 0.9);
    const mixBoost = 1 + syncIntensity * 0.25;
    mixGain.gain.setValueAtTime(Math.min(1.6, randomBetween(0.85, 1.1) * mixBoost), startTime);
    mixGain.gain.linearRampToValueAtTime(Math.min(1.6, randomBetween(0.7, 1.25) * (1 + syncIntensity * 0.2)), Math.min(mixPulseTime, fadeEnd));
    mixGain.gain.linearRampToValueAtTime(Math.min(1.5, randomBetween(0.7, 1.05) * (1 + syncIntensity * 0.15)), fadeEnd);

    const filterTypes = ['bandpass', 'lowpass', 'highpass'];
    filter.type = filterTypes[Math.floor(Math.random() * filterTypes.length)];
    const filterFreq = Math.min(1800, frequency * randomBetween(0.6, 2.4) * (1 + syncIntensity * 0.8));
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(randomBetween(2, 12) * (1 + syncIntensity * 0.4), startTime);

    const basePan = randomBetween(-1, 1) * (1 - coordination * 0.4);
    const rhythmicPan = rhythmState.lastEvent && rhythmState.lastEvent.isDownbeat ? randomBetween(-0.3, 0.3) * coordination : 0;
    const panPosition = Math.max(-1, Math.min(1, basePan + rhythmicPan));
    panner.pan.setValueAtTime(panPosition, startTime);

    const maxGain = randomBetween(0.12, 0.32) * (1 + syncIntensity * 0.4);
    const sustainLevel = maxGain * randomBetween(0.55, 0.85 + syncIntensity * 0.1);

    gain.gain.setValueAtTime(epsilon, startTime);
    gain.gain.exponentialRampToValueAtTime(maxGain, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + sustainTime);
    gain.gain.linearRampToValueAtTime(epsilon, fadeEnd);

    mixGain.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    const startDelayMs = Math.max(0, (startTime - ctx.currentTime) * 1000);
    window.setTimeout(() => this.manager.registerVoiceStart(), startDelayMs);

    oscillators.forEach((oscillator) => {
      oscillator.start(startTime);
      oscillator.stop(fadeEnd + 0.1);
    });

    const primaryOscillator = oscillators[0];
    const nodeRecord = {
      oscillators,
      oscGains,
      mixGain,
      gain,
      filter,
      panner,
      primaryOscillator,
    };
    this.activeNodes.push(nodeRecord);

    if (primaryOscillator) {
      primaryOscillator.onended = () => {
        this.manager.registerVoiceEnd();
        this.activeNodes = this.activeNodes.filter(
          (node) => node.primaryOscillator !== primaryOscillator,
        );
      };
    }

    const restBase = this.index === 0 ? randomBetween(0.2, 1.0) : randomBetween(0.6, 4.5);
    const rest = Math.max(0.2, restBase * (1 - 0.5 * syncIntensity));
    const nextDelay = attack + sustainTime + release + rest;
    if (!this.isStopped) {
      this.timeoutId = window.setTimeout(() => this.playNote(), nextDelay * 1000);
    }
  }

  stop() {
    this.isStopped = true;
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    const now = this.context.currentTime;
    this.activeNodes.forEach(({ oscillators, oscGains, mixGain, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        const currentValue = gain.gain.value;
        gain.gain.setValueAtTime(currentValue, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
        if (mixGain) {
          mixGain.gain.cancelScheduledValues(now);
          const mixValue = mixGain.gain.value || 0.0001;
          mixGain.gain.setValueAtTime(mixValue, now);
          mixGain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
        }
        (oscGains || []).forEach((oscGain) => {
          try {
            oscGain.gain.cancelScheduledValues(now);
            const value = oscGain.gain.value || 0.0001;
            oscGain.gain.setValueAtTime(value, now);
            oscGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
          } catch (err) {
            // Ignore if gain node is no longer active
          }
        });
        (oscillators || []).forEach((oscillator) => {
          try {
            oscillator.stop(now + 0.5);
          } catch (err) {
            // Oscillator already stopped
          }
        });
      } catch (err) {
        // Ignore nodes that are already stopped
      }
    });
    this.activeNodes = [];
  }
}

class DroneSynth {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.dynamicGain = null;
    this.field = new HarmonicField();
    this.voices = [];
    this.isRunning = false;
    this.activeVoiceCount = 0;
    this.statusCallback = null;
    this.targetGain = 0.5;
    this.rhythmEnergy = 0;
    this.lastRhythmEvent = null;
    this.rhythmListener = null;
    if (SharedHybridBridge && typeof SharedHybridBridge.addRhythmListener === 'function') {
      this.rhythmListener = (event) => this.handleRhythmEvent(event);
      SharedHybridBridge.addRhythmListener(this.rhythmListener);
    }
  }

  async ensureContext() {
    if (!this.context) {
      const fallback = () => new (window.AudioContext || window.webkitAudioContext)();
      const context = SharedHybridAudio && typeof SharedHybridAudio.ensureContext === 'function'
        ? SharedHybridAudio.ensureContext()
        : fallback();
      this.context = context;
      this.dynamicGain = context.createGain();
      this.dynamicGain.gain.setValueAtTime(1, context.currentTime);
      this.masterGain = context.createGain();
      this.masterGain.gain.setValueAtTime(this.targetGain, context.currentTime);
      this.dynamicGain.connect(this.masterGain);
      const destination = SharedHybridAudio && SharedHybridAudio.droneGain ? SharedHybridAudio.droneGain : context.destination;
      this.masterGain.connect(destination);
      if (SharedHybridAudio && typeof SharedHybridAudio.applyMixGains === 'function') {
        SharedHybridAudio.applyMixGains();
      }
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    return this.context;
  }

  async start() {
    await this.ensureContext();
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    if (this.dynamicGain && this.context) {
      const now = this.context.currentTime;
      const current = this.dynamicGain.gain.value || 0.0001;
      this.dynamicGain.gain.cancelScheduledValues(now);
      this.dynamicGain.gain.setValueAtTime(current, now);
      this.dynamicGain.gain.linearRampToValueAtTime(1, now + 0.4);
    }
    if (this.voices.length === 0) {
      for (let i = 0; i < 8; i += 1) {
        this.voices.push(new DroneVoice(this.context, this.field, this.dynamicGain, this, i));
      }
    }
    this.voices.forEach((voice, index) => voice.start(index * 0.65));
    this.updateStatus();
  }

  async stop() {
    if (!this.context || !this.isRunning) {
      return;
    }
    this.isRunning = false;
    this.voices.forEach((voice) => voice.stop());
    if (this.dynamicGain) {
      const now = this.context.currentTime;
      const current = this.dynamicGain.gain.value || 0.0001;
      this.dynamicGain.gain.cancelScheduledValues(now);
      this.dynamicGain.gain.setValueAtTime(current, now);
      this.dynamicGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
    }
    this.rhythmEnergy = 0;
    this.lastRhythmEvent = null;
    this.updateStatus();
  }

  setVolume(value) {
    this.targetGain = value;
    if (this.masterGain) {
      const time = this.context ? this.context.currentTime : 0;
      this.masterGain.gain.cancelScheduledValues(time);
      this.masterGain.gain.linearRampToValueAtTime(value, time + 0.2);
    }
  }

  handleRhythmEvent(event) {
    const coordination = event && Number.isFinite(event.coordination)
      ? Math.max(0, Math.min(1, event.coordination))
      : (SharedHybridBridge && typeof SharedHybridBridge.getCoordination === 'function'
        ? Math.max(0, Math.min(1, SharedHybridBridge.getCoordination()))
        : 0);
    const intensity = event && Number.isFinite(event.intensity) ? Math.max(0, Math.min(1, event.intensity)) : 0;
    const influence = coordination * intensity;
    this.rhythmEnergy = this.rhythmEnergy * 0.6 + influence * 0.4;
    this.lastRhythmEvent = event || null;
    if (this.field && typeof this.field.syncToRhythm === 'function') {
      this.field.syncToRhythm(event, coordination);
    }
    if (this.isRunning && this.dynamicGain && this.context) {
      const now = this.context.currentTime;
      const boost = Math.min(1.35, 1 + Math.max(0, intensity - 0.25) * coordination * 0.6);
      this.dynamicGain.gain.cancelScheduledValues(now);
      this.dynamicGain.gain.setTargetAtTime(boost, now, 0.06);
      this.dynamicGain.gain.setTargetAtTime(1, now + 0.4, 0.08);
    }
  }

  getRhythmState() {
    const coordination = SharedHybridBridge && typeof SharedHybridBridge.getCoordination === 'function'
      ? Math.max(0, Math.min(1, SharedHybridBridge.getCoordination()))
      : 0;
    const energy = Math.max(0, Math.min(1, this.rhythmEnergy));
    this.rhythmEnergy = Math.max(0, this.rhythmEnergy * (coordination > 0 ? 0.97 : 0.94));
    return {
      energy,
      coordination,
      lastEvent: this.lastRhythmEvent,
    };
  }

  registerVoiceStart() {
    this.activeVoiceCount += 1;
    this.updateStatus();
  }

  registerVoiceEnd() {
    this.activeVoiceCount = Math.max(0, this.activeVoiceCount - 1);
    this.updateStatus();
  }

  onStatusChange(callback) {
    this.statusCallback = callback;
  }

  updateStatus() {
    if (typeof this.statusCallback === 'function') {
      this.statusCallback({
        running: this.isRunning,
        voices: this.activeVoiceCount,
        volume: this.targetGain,
      });
    }
  }
}

const synth = new DroneSynth();
window.droneSynth = synth;

function updateInterfaceStatus(status) {
  const voiceLabel = document.getElementById('voice-count');
  if (voiceLabel) {
    voiceLabel.textContent = `${status.voices}`;
  }
  if (typeof window.refreshTransportButton === 'function') {
    window.refreshTransportButton();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  synth.onStatusChange(updateInterfaceStatus);
  updateInterfaceStatus({ running: false, voices: 0 });
});
