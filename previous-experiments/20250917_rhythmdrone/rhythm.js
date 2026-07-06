
const HybridAudio = window.HybridAudio || (() => {
    const shared = {
        context: null,
        masterGain: null,
        rhythmGain: null,
        droneGain: null,
        mixValue: 0.5,
        ensureContext() {
            if (!this.context) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.context = new AudioContext();
                this.masterGain = this.context.createGain();
                this.masterGain.gain.setValueAtTime(1, this.context.currentTime);
                this.masterGain.connect(this.context.destination);

                this.rhythmGain = this.context.createGain();
                this.droneGain = this.context.createGain();
                this.rhythmGain.connect(this.masterGain);
                this.droneGain.connect(this.masterGain);

                this.applyMixGains(0);
            }
            return this.context;
        },
        applyMixGains(time = 0.001) {
            if (!this.context || !this.rhythmGain || !this.droneGain) {
                return;
            }
            const balance = Math.max(0, Math.min(1, this.mixValue));
            const rhythmLevel = Math.cos(balance * Math.PI * 0.5);
            const droneLevel = Math.sin(balance * Math.PI * 0.5);
            const now = this.context.currentTime;
            if (time === 0) {
                this.rhythmGain.gain.setValueAtTime(rhythmLevel, now);
                this.droneGain.gain.setValueAtTime(droneLevel, now);
                return;
            }
            this.rhythmGain.gain.cancelScheduledValues(now);
            this.droneGain.gain.cancelScheduledValues(now);
            const smoothing = Math.max(0.01, time);
            this.rhythmGain.gain.setTargetAtTime(rhythmLevel, now, smoothing);
            this.droneGain.gain.setTargetAtTime(droneLevel, now, smoothing);
        },
        setMix(value) {
            this.mixValue = value;
            if (this.context) {
                this.applyMixGains();
            }
        }
    };
    return shared;
})();
window.HybridAudio = HybridAudio;

const HybridBridge = window.HybridBridge || (() => {
    const listeners = new Set();
    return {
        coordination: 0.45,
        rhythmEnergy: 0,
        tickDuration: 0.125,
        lastBeatTime: null,
        patternLength: 16,
        addRhythmListener(callback) {
            if (typeof callback === 'function') {
                listeners.add(callback);
            }
        },
        removeRhythmListener(callback) {
            listeners.delete(callback);
        },
        emitRhythmBeat(event) {
            const intensity = Math.max(0, Math.min(1, event.intensity || 0));
            this.rhythmEnergy = this.rhythmEnergy * 0.7 + intensity * 0.3;
            listeners.forEach(listener => {
                try {
                    listener({ ...event, coordination: this.coordination, energy: this.rhythmEnergy });
                } catch (err) {
                    console.error('Rhythm listener error', err);
                }
            });
        },
        updateTickDuration(value) {
            if (Number.isFinite(value) && value > 0) {
                this.tickDuration = value;
            }
        },
        updateCurrentBeatTime(time) {
            if (Number.isFinite(time)) {
                this.lastBeatTime = time;
            }
        },
        updatePatternLength(length) {
            if (Number.isFinite(length) && length > 0) {
                this.patternLength = length;
            }
        },
        setCoordination(value) {
            this.coordination = Math.max(0, Math.min(1, value));
        },
        getCoordination() {
            return this.coordination;
        },
        getRhythmEnergy() {
            return this.rhythmEnergy;
        },
        getAlignedTime(currentTime, baseDelay) {
            if (!this.lastBeatTime || !this.tickDuration || this.coordination < 0.25) {
                return currentTime + baseDelay;
            }
            const desired = currentTime + baseDelay;
            let nextBeat = this.lastBeatTime;
            while (nextBeat < desired) {
                nextBeat += this.tickDuration;
            }
            const blend = Math.min(1, this.coordination * 0.85);
            return desired * (1 - blend) + nextBeat * blend;
        }
    };
})();
window.HybridBridge = HybridBridge;

let audioContext;
let isPlaying = false;
let currentBeat = 0;
let schedulerId;
let soundRows = [];
let currentPattern = [];
let nextNoteTime = 0;
let lookahead = 25.0;
let scheduleAheadTime = 0.1;
let evolutionCounter = 0;
let transportButton = null;

function getDroneSynth() {
    return window.droneSynth || window.synth || null;
}

function areEnginesRunning() {
    const synth = getDroneSynth();
    return Boolean(isPlaying || (synth && synth.isRunning));
}

function updateTransportButton() {
    if (!transportButton) {
        transportButton = document.getElementById('transportToggle');
        if (!transportButton) {
            return;
        }
    }

    const running = areEnginesRunning();
    transportButton.textContent = running ? 'Stop' : 'Start';
    transportButton.classList.toggle('is-active', running);
}

window.refreshTransportButton = updateTransportButton;

async function toggleTransportState() {
    const synth = getDroneSynth();
    const running = areEnginesRunning();

    if (running) {
        if (isPlaying) {
            stopRhythm();
        }
        if (synth && synth.isRunning) {
            await synth.stop();
        }
    } else {
        startRhythm();
        if (synth && !synth.isRunning) {
            await synth.start();
        }
    }

    updateTransportButton();
}

function initTransportControls() {
    transportButton = document.getElementById('transportToggle');
    if (!transportButton) {
        return;
    }

    transportButton.addEventListener('click', async () => {
        if (transportButton.disabled) {
            return;
        }
        transportButton.disabled = true;
        try {
            await toggleTransportState();
        } catch (error) {
            console.error('Transport toggle failed', error);
        } finally {
            transportButton.disabled = false;
            updateTransportButton();
        }
    });

    updateTransportButton();
}

// Sound mapping based on user's selection
const selectedSounds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 19];
const soundNames = [
    'Deep Kick', 'Punchy Kick', 'Snare Hit', 'Crisp Snare', 'Closed Hi-Hat',
    'Open Hi-Hat', 'Ride Cymbal', 'Crash Cymbal', 'High Tom', 'Mid Tom',
    'Floor Tom', 'Hand Clap', 'Wood Block', 'Shaker', 'Distorted Kick'
];

const timeSignatureOptions = [
    {
        label: '4/4',
        pulses: [
            { steps: 4, accent: 1.0, tail: 0.35 },
            { steps: 4, accent: 0.6, tail: 0.3 },
            { steps: 4, accent: 0.85, tail: 0.35 },
            { steps: 4, accent: 0.5, tail: 0.3 }
        ]
    },
    {
        label: '3/4',
        pulses: [
            { steps: 3, accent: 1.0, tail: 0.2 },
            { steps: 3, accent: 0.65, tail: 0.2 }
        ]
    },
    {
        label: '6/8',
        pulses: [
            { steps: 3, accent: 1.0, tail: 0.25 },
            { steps: 3, accent: 0.8, tail: 0.25 }
        ]
    },
    {
        label: '7/8',
        pulses: [
            { steps: 2, accent: 1.0, tail: 0.3 },
            { steps: 2, accent: 0.75, tail: 0.3 },
            { steps: 3, accent: 0.65, tail: 0.25 }
        ]
    }
];

const patternLengthMultipliers = [0.5, 1, 2];

function getTimeSignature() {
    const control = document.getElementById('timeSig');
    const index = control ? parseInt(control.value, 10) : 0;
    return timeSignatureOptions[index] || timeSignatureOptions[0];
}

function getSignaturePulses() {
    const signature = getTimeSignature();
    return signature.pulses || [];
}

function getMeasureSteps() {
    return getSignaturePulses().reduce((sum, pulse) => sum + pulse.steps, 0) || 1;
}

function getPatternLengthForIndex(index) {
    const multiplier = patternLengthMultipliers[index] || patternLengthMultipliers[1];
    return Math.max(1, Math.round(getMeasureSteps() * multiplier));
}

function refreshPatternLengthDisplay() {
    const slider = document.getElementById('patternLen');
    if (!slider) return;
    const valueSpan = document.getElementById('patternLen-value');
    if (!valueSpan) return;
    const length = getPatternLengthForIndex(parseInt(slider.value, 10));
    valueSpan.textContent = length;
}

function applyStereoWidthToPattern() {
    const slider = document.getElementById('stereoWidth');
    if (!slider) return;
    const stereoWidth = parseInt(slider.value, 10) / 100 || 0;
    currentPattern.forEach(beat => {
        beat.forEach(note => {
            note.pan = (Math.random() - 0.5) * stereoWidth;
        });
    });
}

function getPulseContext(stepIndex) {
    const pulses = getSignaturePulses();
    const measureSteps = getMeasureSteps();
    if (!pulses.length || measureSteps <= 0) {
        return null;
    }

    const normalizedStep = ((stepIndex % measureSteps) + measureSteps) % measureSteps;
    let cursor = 0;
    for (let i = 0; i < pulses.length; i++) {
        const pulse = pulses[i];
        const pulseStart = cursor;
        const pulseEnd = cursor + pulse.steps;
        if (normalizedStep >= pulseStart && normalizedStep < pulseEnd) {
            const stepInPulse = normalizedStep - pulseStart;
            const isPulseStart = stepInPulse === 0;
            const isPulseMid = pulse.steps > 1 && stepInPulse === Math.floor(pulse.steps / 2);
            const tailWeight = pulse.tail !== undefined ? pulse.tail : 0.3;
            const accentWeight = (pulse.accent || 1) * (isPulseStart ? 1 : tailWeight);
            return {
                measureSteps,
                pulseIndex: i,
                pulseStart,
                pulseSteps: pulse.steps,
                stepInPulse,
                isPulseStart,
                isPulseMid,
                isMeasureEnd: normalizedStep === measureSteps - 1,
                accentWeight
            };
        }
        cursor = pulseEnd;
    }
    return null;
}

// Initialize controls
function initControls() {
    const sliders = document.querySelectorAll('input.slider');
    sliders.forEach(slider => {
        if (!(slider instanceof HTMLInputElement)) {
            return;
        }
        const valueSpan = document.getElementById(slider.id + '-value');
        slider.addEventListener('input', () => updateSliderValue(slider, valueSpan));
        updateSliderValue(slider, valueSpan);
    });
    refreshSoundDisplay();
    generateNewPattern();
}

function updateSliderValue(slider, valueSpan) {
    let displayValue = slider.value;

    switch(slider.id) {
        case 'timeSig':
            displayValue = getTimeSignature().label;
            refreshPatternLengthDisplay();
            break;
        case 'patternLen':
            displayValue = getPatternLengthForIndex(parseInt(slider.value, 10));
            break;
        case 'bpm':
        case 'syncopation':
        case 'onBeat':
        case 'evolution':
        case 'soundCount':
        case 'stereoWidth':
        case 'complexity':
        case 'swing':
        case 'accentProb':
        case 'fillFreq':
        case 'lowEmphasis':
        case 'highEmphasis':
        case 'humanize':
            displayValue = slider.value;
            break;
    }

    if (valueSpan) {
        valueSpan.textContent = displayValue;
    }
    handleSliderSideEffects(slider.id);
}

function handleSliderSideEffects(sliderId) {
    const refreshGridControls = ['soundCount', 'patternLen', 'timeSig'];
    const regeneratePatternControls = ['soundCount', 'patternLen', 'timeSig', 'complexity', 'syncopation', 'onBeat', 'accentProb', 'fillFreq'];

    if (refreshGridControls.includes(sliderId)) {
        refreshSoundDisplay();
    }

    if (sliderId === 'stereoWidth') {
        applyStereoWidthToPattern();
        updatePatternDisplay();
        return;
    }

    if (regeneratePatternControls.includes(sliderId)) {
        generateNewPattern();
        currentBeat = currentBeat % getPatternLength();
        return;
    }

    if (sliderId === 'lowEmphasis' || sliderId === 'highEmphasis') {
        return;
    }

}

function refreshSoundDisplay() {
    const grid = document.getElementById('soundGrid');
    if (!grid) return;

    clearSoundHighlights();
    grid.innerHTML = '';
    soundRows = [];

    const soundCount = getSoundCount();
    const patternLength = getPatternLength();

    for (let soundIdx = 0; soundIdx < soundCount; soundIdx++) {
        const row = document.createElement('div');
        row.className = 'sound-row';

        const label = document.createElement('div');
        label.className = 'sound-label';
        label.textContent = soundNames[soundIdx] || `Sound ${soundIdx + 1}`;
        row.appendChild(label);

        const beatTrack = document.createElement('div');
        beatTrack.className = 'sound-beats';
        beatTrack.style.gridTemplateColumns = `repeat(${patternLength}, 1fr)`;

        const beats = [];
        for (let beatIndex = 0; beatIndex < patternLength; beatIndex++) {
            const beat = document.createElement('div');
            beat.className = 'sound-beat';
            const pulseContext = getPulseContext(beatIndex);
            beat.textContent = (pulseContext && pulseContext.isPulseStart) ? '●' : '·';
            beatTrack.appendChild(beat);
            beats.push(beat);
        }

        row.appendChild(beatTrack);
        grid.appendChild(row);
        soundRows.push({ beats });
    }

    updatePatternDisplay();
}

function getPatternLength() {
    const slider = document.getElementById('patternLen');
    const index = slider ? parseInt(slider.value, 10) : 1;
    return getPatternLengthForIndex(index);
}

function getSoundCount() {
    const slider = document.getElementById('soundCount');
    return slider ? parseInt(slider.value, 10) : soundNames.length;
}

function initAudio() {
    if (!audioContext) {
        audioContext = HybridAudio.ensureContext();
        HybridAudio.applyMixGains();
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function generateNewPattern() {
    const patternLength = getPatternLength();
    HybridBridge.updatePatternLength(patternLength);
    const soundCount = getSoundCount();
    const complexity = parseInt(document.getElementById('complexity').value, 10);
    const syncopation = parseInt(document.getElementById('syncopation').value, 10);
    const onBeat = parseInt(document.getElementById('onBeat').value, 10);
    const stereoWidth = parseInt(document.getElementById('stereoWidth').value, 10) / 100;
    const accentProbability = parseInt(document.getElementById('accentProb').value, 10) / 100;
    const fillFrequency = parseInt(document.getElementById('fillFreq').value, 10) / 100;

    currentPattern = [];

    for (let beat = 0; beat < patternLength; beat++) {
        currentPattern[beat] = [];

        const pulseContext = getPulseContext(beat);
        if (!pulseContext) {
            continue;
        }

        let baseProbability = complexity / 100;
        if (pulseContext.isPulseStart) {
            baseProbability *= 0.5 + (onBeat / 100) * 1.8;
        } else if (pulseContext.isPulseMid) {
            baseProbability *= 0.35 + (syncopation / 100) * 1.5;
        } else {
            baseProbability *= 0.25;
        }

        baseProbability *= pulseContext.accentWeight;

        if (pulseContext.isMeasureEnd) {
            baseProbability *= 1 + fillFrequency;
        }

        for (let soundIdx = 0; soundIdx < soundCount; soundIdx++) {
            let probability = baseProbability;

            if (soundIdx < 2) {
                probability *= pulseContext.isPulseStart ? 1.45 : 0.25;
            } else if (soundIdx < 4) {
                probability *= pulseContext.isPulseMid ? 1.3 : 0.65;
                if (pulseContext.isMeasureEnd) {
                    probability *= 1 + fillFrequency;
                }
            } else if (soundIdx < 6) {
                probability *= 0.9;
            } else if (soundIdx >= 9 && soundIdx <= 11 && pulseContext.isMeasureEnd) {
                probability *= 1 + fillFrequency * 1.5;
            }

            probability = Math.min(0.98, probability);

            if (Math.random() < probability) {
                let velocity = 0.5 + (Math.random() * 0.5);

                if (pulseContext.isPulseStart && Math.random() < accentProbability) {
                    velocity = Math.min(1, velocity + 0.35);
                }

                if (pulseContext.isMeasureEnd && fillFrequency > 0) {
                    velocity = Math.min(1, velocity + fillFrequency * 0.4);
                }

                currentPattern[beat].push({
                    soundIndex: soundIdx,
                    velocity: velocity,
                    pan: (Math.random() - 0.5) * stereoWidth
                });
            }
        }
    }

    currentBeat = currentBeat % Math.max(1, currentPattern.length);
    updatePatternDisplay();
}

function updatePatternDisplay() {
    if (!soundRows.length) return;

    soundRows.forEach(row => {
        row.beats.forEach((beatEl, index) => {
            const pulseContext = getPulseContext(index);
            beatEl.classList.remove('beat-has-note', 'beat-current', 'beat-triggered');
            beatEl.textContent = (pulseContext && pulseContext.isPulseStart) ? '●' : '·';
        });
    });

    currentPattern.forEach((notes, beatIndex) => {
        notes.forEach(note => {
            const soundRow = soundRows[note.soundIndex];
            if (!soundRow) return;
            const cell = soundRow.beats[beatIndex];
            if (!cell) return;
            cell.classList.add('beat-has-note');
            cell.textContent = '●';
        });
    });
}

function evolvePattern() {
    const evolutionRate = parseInt(document.getElementById('evolution').value, 10);
    if (evolutionRate === 0) return;

    evolutionCounter++;
    const evolutionThreshold = 100 - evolutionRate;
    const stereoWidth = parseInt(document.getElementById('stereoWidth').value, 10) / 100;
    const accentProbability = parseInt(document.getElementById('accentProb').value, 10) / 100;
    const fillFrequency = parseInt(document.getElementById('fillFreq').value, 10) / 100;

    if (evolutionCounter % Math.max(1, evolutionThreshold / 10) === 0) {
        // Subtle evolution - modify existing pattern
        const patternLength = currentPattern.length;
        const numChanges = Math.ceil((evolutionRate / 100) * patternLength * 0.2);

        for (let i = 0; i < numChanges; i++) {
            const beatIndex = Math.floor(Math.random() * patternLength);
            const pulseContext = getPulseContext(beatIndex);
            if (!pulseContext) {
                continue;
            }

            if (Math.random() < 0.5 && currentPattern[beatIndex].length > 0) {
                // Remove a sound
                const soundIndex = Math.floor(Math.random() * currentPattern[beatIndex].length);
                currentPattern[beatIndex].splice(soundIndex, 1);
            } else {
                // Add a sound
                const soundCount = getSoundCount();
                const soundIdx = Math.floor(Math.random() * soundCount);
                let velocity = 0.3 + (Math.random() * 0.4);

                if (pulseContext.isPulseStart && Math.random() < accentProbability) {
                    velocity = Math.min(1, velocity + 0.3);
                }

                if (pulseContext.isMeasureEnd && fillFrequency > 0) {
                    velocity = Math.min(1, velocity + fillFrequency * 0.4);
                }

                currentPattern[beatIndex].push({
                    soundIndex: soundIdx,
                    velocity: velocity,
                    pan: (Math.random() - 0.5) * stereoWidth
                });
            }
        }

        updatePatternDisplay();
    }

    // Major evolution - generate completely new pattern
    if (evolutionCounter % Math.max(1, evolutionThreshold * 2) === 0) {
        generateNewPattern();
    }
}

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleNote(currentBeat, nextNoteTime);
        nextNote();
    }
    schedulerId = setTimeout(scheduler, lookahead);
}

function nextNote() {
    const bpm = parseInt(document.getElementById('bpm').value);
    const swing = parseInt(document.getElementById('swing').value);

    let secondsPerBeat = 60.0 / (bpm * 4); // 16th note timing

    // Apply swing
    if (swing > 0 && currentBeat % 2 === 1) {
        secondsPerBeat *= 1 + (swing / 100) * 0.5;
    }

    // Apply humanization
    const humanize = parseInt(document.getElementById('humanize').value);
    if (humanize > 0) {
        const timing_variation = (Math.random() - 0.5) * (humanize / 100) * 0.02;
        secondsPerBeat += timing_variation;
    }

    HybridBridge.updateTickDuration(secondsPerBeat);
    nextNoteTime += secondsPerBeat;
    currentBeat = (currentBeat + 1) % getPatternLength();

    if (currentBeat === 0) {
        evolvePattern();
    }
}

function scheduleNote(beatNumber, time) {
    const timeUntilPlayback = Math.max(0, (time - audioContext.currentTime) * 1000);

    setTimeout(() => {
        soundRows.forEach(row => {
            row.beats.forEach(beatEl => beatEl.classList.remove('beat-current'));
            const targetBeat = row.beats[beatNumber];
            if (targetBeat) {
                targetBeat.classList.add('beat-current');
            }
        });
    }, timeUntilPlayback);

    const beatNotes = currentPattern[beatNumber] || [];
    beatNotes.forEach(noteData => {
        playScheduledSound(noteData.soundIndex, time, noteData.velocity, noteData.pan);

        const soundRow = soundRows[noteData.soundIndex];
        if (!soundRow) return;
        const cell = soundRow.beats[beatNumber];
        if (!cell) return;

        setTimeout(() => {
            cell.classList.add('beat-triggered');
            setTimeout(() => cell.classList.remove('beat-triggered'), 160);
        }, timeUntilPlayback);
    });

    const totalVelocity = beatNotes.reduce((sum, note) => sum + (note.velocity || 0), 0);
    const intensity = Math.min(1, totalVelocity / Math.max(1, getSoundCount()));
    const patternLength = getPatternLength();
    const pulseContext = getPulseContext(beatNumber);
    const normalizedBeat = patternLength > 0 ? (beatNumber % patternLength) / patternLength : 0;
    const measureSteps = getMeasureSteps();
    const isDownbeat = measureSteps > 0 ? (beatNumber % measureSteps === 0) : beatNumber === 0;

    HybridBridge.updateCurrentBeatTime(time);
    HybridBridge.emitRhythmBeat({
        time,
        beatIndex: beatNumber,
        patternLength,
        intensity,
        normalizedBeat,
        isDownbeat,
        isMeasureEnd: pulseContext ? pulseContext.isMeasureEnd : false,
        activeVoices: beatNotes.length
    });
}

function playScheduledSound(soundIndex, time, velocity = 1.0, pan = 0) {
    const adjustedVelocity = velocity;

    // Create panner for stereo positioning
    const panner = audioContext.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    const destination = HybridAudio.rhythmGain || audioContext.destination;
    panner.connect(destination);

    // Apply emphasis adjustments
    const lowEmphasis = parseInt(document.getElementById('lowEmphasis').value) / 100;
    const highEmphasis = parseInt(document.getElementById('highEmphasis').value) / 100;

    let finalVelocity = adjustedVelocity;
    if (soundIndex < 5) { // Low frequency sounds (kicks, snares, low toms)
        finalVelocity *= lowEmphasis;
    } else if (soundIndex >= 5 && soundIndex < 8) { // High frequency sounds (hi-hats, cymbals)
        finalVelocity *= highEmphasis;
    }

    finalVelocity = Math.min(1, finalVelocity);

    const soundId = selectedSounds[soundIndex];
    if (!soundId) {
        return;
    }

    // Play the selected sound
    switch(soundId) {
        case 1: createScheduledKick(60, 0.5, finalVelocity, time, panner); break;
        case 2: createScheduledKick(80, 0.3, finalVelocity * 1.2, time, panner); break;
        case 3: createScheduledSnare(200, 0.15, finalVelocity, time, panner); break;
        case 4: createScheduledSnare(300, 0.1, finalVelocity, time, panner); break;
        case 5: createScheduledHiHat(8000, 0.05, finalVelocity * 0.6, time, panner); break;
        case 6: createScheduledHiHat(6000, 0.2, finalVelocity * 0.8, time, panner); break;
        case 7: createScheduledCymbal(3000, 0.8, finalVelocity * 0.7, time, panner); break;
        case 8: createScheduledCymbal(4000, 1.5, finalVelocity, time, panner); break;
        case 9: createScheduledTom(200, 0.3, finalVelocity, time, panner); break;
        case 10: createScheduledTom(150, 0.4, finalVelocity, time, panner); break;
        case 11: createScheduledTom(100, 0.5, finalVelocity, time, panner); break;
        case 12: createScheduledClap(time, panner, finalVelocity); break;
        case 14: createScheduledWoodBlock(time, panner, finalVelocity); break;
        case 15: createScheduledShaker(time, panner, finalVelocity); break;
        case 19: createScheduledDistortedKick(time, panner, finalVelocity); break;
    }
}

// Scheduled sound creation functions
function createScheduledKick(frequency, duration, gain, time, destination) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.01, time + duration);

    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
}

function createScheduledSnare(frequency, duration, gain, time, destination) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1;

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    noise.start(time);
}

function createScheduledHiHat(frequency, duration, gain, time, destination) {
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = frequency;

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    noise.start(time);
}

function createScheduledCymbal(frequency, duration, gain, time, destination) {
    const frequencies = [frequency, frequency * 1.2, frequency * 1.5, frequency * 2.1];

    frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        const individualGain = gain / frequencies.length;
        gainNode.gain.setValueAtTime(individualGain, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gainNode);
        gainNode.connect(destination);

        osc.start(time);
        osc.stop(time + duration);
    });
}

function createScheduledTom(frequency, duration, gain, time, destination) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, time + duration);

    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.start(time);
    osc.stop(time + duration);
}

function createScheduledClap(time, destination, gain = 0.8) {
    for (let i = 0; i < 3; i++) {
        const bufferSize = audioContext.sampleRate * 0.01;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let j = 0; j < bufferSize; j++) {
            data[j] = Math.random() * 2 - 1;
        }

        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = gain;

        noise.connect(gainNode);
        gainNode.connect(destination);

        noise.start(time + i * 0.01);
    }
}

function createScheduledWoodBlock(time, destination, gain = 0.8) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.value = 1200;

    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.start(time);
    osc.stop(time + 0.05);
}

function createScheduledShaker(time, destination, gain = 0.6) {
    const bufferSize = audioContext.sampleRate * 0.15;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.01);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = gain;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    noise.start(time);
}

function createScheduledDistortedKick(time, destination, gain = 1.0) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const waveshaper = audioContext.createWaveShaper();

    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + 20) * x * 20 * deg) / (Math.PI + 20 * Math.abs(x));
    }
    waveshaper.curve = curve;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(70, time);
    osc.frequency.exponentialRampToValueAtTime(0.5, time + 0.5);

    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc.connect(waveshaper);
    waveshaper.connect(gainNode);
    gainNode.connect(destination);

    osc.start(time);
    osc.stop(time + 0.5);
}

function clearSoundHighlights() {
    soundRows.forEach(row => {
        row.beats.forEach(beatEl => {
            beatEl.classList.remove('beat-current', 'beat-triggered');
        });
    });
}

function startRhythm() {
    if (isPlaying) return;

    initAudio();
    HybridBridge.updatePatternLength(getPatternLength());
    if (audioContext) {
        HybridBridge.updateCurrentBeatTime(audioContext.currentTime);
    }
    isPlaying = true;
    currentBeat = 0;
    nextNoteTime = audioContext.currentTime;
    evolutionCounter = 0;

    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = 'Grooving...';
    }
    scheduler();
    updateTransportButton();
}

function stopRhythm() {
    if (!isPlaying) return;

    isPlaying = false;
    clearTimeout(schedulerId);

    clearSoundHighlights();

    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = 'Ready to groove...';
    }
    updateTransportButton();
}

function initBlendControls() {
    const mixSlider = document.getElementById('mixBalance');
    const mixValue = document.getElementById('mixBalance-value');
    if (mixSlider && mixValue) {
        const updateMix = () => {
            const numeric = parseInt(mixSlider.value, 10) || 0;
            mixValue.textContent = numeric;
            HybridAudio.setMix(numeric / 100);
            if (HybridAudio.context) {
                HybridAudio.applyMixGains();
            }
        };
        mixSlider.addEventListener('input', updateMix);
        updateMix();
    }

    const coordinationSlider = document.getElementById('coordination');
    const coordinationValue = document.getElementById('coordination-value');
    if (coordinationSlider && coordinationValue) {
        const updateCoordination = () => {
            const numeric = parseInt(coordinationSlider.value, 10) || 0;
            coordinationValue.textContent = numeric;
            HybridBridge.setCoordination(numeric / 100);
        };
        coordinationSlider.addEventListener('input', updateCoordination);
        updateCoordination();
    }
}

// Initialize everything when the page loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        initControls();
    } catch (error) {
        console.error('Rhythm control initialization failed', error);
    }
    initBlendControls();
    initTransportControls();
});
