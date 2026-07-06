// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startStopBtn = document.getElementById('start-stop-btn');
    const paramsContainer = document.getElementById('synth-params');
    const visualizerContainer = document.getElementById('visualizer-container');

    // --- Audio Context ---
    let audioContext;
    let isPlaying = false;

    // --- Synthesis Parameters ---
    const params = {
        conversationDensity: { value: 0.5, label: 'Conversation Density', tooltip: 'How much voices respond to each other vs. play solo.' },
        emotionalTemperature: { value: 0.5, label: 'Emotional Temperature', tooltip: 'Shifts the mood from contemplative/sparse to energetic/dense.' },
        patternMemory: { value: 0.5, label: 'Pattern Memory', tooltip: 'How much voices repeat their own phrases vs. creating new ones.' },
        harmonicMagnetism: { value: 0.7, label: 'Harmonic Magnetism', tooltip: 'How strongly voices are pulled toward consonant harmonies.' },
        rhythmicElasticity: { value: 0.5, label: 'Rhythmic Elasticity', tooltip: 'From rigid, grid-based timing to fluid, human-like timing.' },
        voiceEvolution: { value: 0.3, label: 'Voice Evolution', tooltip: 'How much the timbre of each voice transforms over time.' },
        evolutionaryRate: { value: 0.2, label: 'Evolutionary Rate', tooltip: 'How quickly melodies and timbres transform.' },
        // ADSR Envelope Controls
        attack: { value: 0.3, label: 'Attack Time', tooltip: 'How quickly notes reach full volume (0.01s - 2s).' },
        decay: { value: 0.4, label: 'Decay Time', tooltip: 'Time to reach sustain level after attack (0.01s - 2s).' },
        sustain: { value: 0.6, label: 'Sustain Level', tooltip: 'Volume level during the sustain phase (0-100%).' },
        release: { value: 0.5, label: 'Release Time', tooltip: 'How long notes fade out after ending (0.1s - 4s).' },
        // Timbre Controls
        filterFrequency: { value: 0.7, label: 'Filter Brightness', tooltip: 'Base filter cutoff frequency (200Hz - 8000Hz).' },
        filterResonance: { value: 0.3, label: 'Filter Resonance', tooltip: 'Filter resonance/emphasis at cutoff frequency.' },
        filterEnvelope: { value: 0.5, label: 'Filter Envelope', tooltip: 'How much the envelope affects filter cutoff.' },
        timbreModulation: { value: 0.4, label: 'Timbre Modulation', tooltip: 'Amount of timbral variation during notes.' },
        envelopeVariation: { value: 0.3, label: 'Envelope Variation', tooltip: 'How much ADSR values vary between notes.' }
    };

    // --- Music Generation State ---
    const numVoices = 5;
    let voices = [];
    let masterGain;
    let mainLoopInterval;
    let nextEvolutionTime = 0;

    const scales = {
        pentatonicMajor: [0, 2, 4, 7, 9],
        pentatonicMinor: [0, 3, 5, 7, 10],
        ionian: [0, 2, 4, 5, 7, 9, 11],
        dorian: [0, 2, 3, 5, 7, 9, 10],
        lydian: [0, 2, 4, 6, 7, 9, 11],
        mixolydian: [0, 2, 4, 5, 7, 9, 10],
        aeolian: [0, 2, 3, 5, 7, 8, 10],
        locrian: [0, 1, 3, 5, 6, 8, 10],
    };
    let currentScale = scales.pentatonicMajor;
    const baseMidi = 36; // C2

    // --- UI Initialization ---
    function createControls() {
        for (const key in params) {
            const param = params[key];
            const paramDiv = document.createElement('div');
            paramDiv.classList.add('param');
            const label = document.createElement('label');
            label.setAttribute('for', key);
            label.textContent = param.label;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = key;
            slider.min = 0;
            slider.max = 1;
            slider.step = 0.01;
            slider.value = param.value;
            slider.addEventListener('input', (e) => {
                param.value = parseFloat(e.target.value);
            });
            const tooltip = document.createElement('span');
            tooltip.classList.add('tooltip');
            tooltip.textContent = param.tooltip;
            paramDiv.appendChild(label);
            paramDiv.appendChild(slider);
            paramDiv.appendChild(tooltip);
            paramsContainer.appendChild(paramDiv);
        }
    }

    function createVisualizer() {
        for (let i = 0; i < numVoices; i++) {
            const voiceViz = document.createElement('div');
            voiceViz.classList.add('voice-viz');
            voiceViz.id = `voice-viz-${i}`;
            voiceViz.textContent = i + 1;
            visualizerContainer.appendChild(voiceViz);
        }
    }

    // --- Web Audio API Initialization ---
    function initAudio() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.6;
        masterGain.connect(audioContext.destination);

        const waveForms = ['sine', 'triangle', 'sawtooth', 'square'];
        const panValues = [-0.8, -0.4, 0, 0.4, 0.8];

        for (let i = 0; i < numVoices; i++) {
            const osc = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const panner = audioContext.createStereoPanner();
            
            osc.type = waveForms[i % waveForms.length];
            gainNode.gain.value = 0;
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            filter.Q.value = 1;
            panner.pan.value = panValues[i];

            osc.connect(filter).connect(gainNode).connect(panner).connect(masterGain);
            osc.start();

            voices.push({
                id: i,
                osc,
                gainNode,
                filter,
                panner,
                history: [],
                isPlaying: false,
                nextNoteTime: 0,
                currentNote: null,
                currentMidi: null,
                lastActivity: 0,
                activeNotes: [] // Track active notes for proper envelope management
            });
        }
    }

    // --- Music Generation Logic ---
    function midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function scaleToMidi(noteInScale, octave) {
        const degree = noteInScale % currentScale.length;
        const octaveOffset = Math.floor(noteInScale / currentScale.length);
        return baseMidi + (octave + octaveOffset) * 12 + currentScale[degree];
    }

    function getNextNote(voice) {
        // 1. Pattern Memory: Decide whether to pull from history
        if (Math.random() < params.patternMemory.value && voice.history.length > 0) {
            const historicalNote = voice.history[Math.floor(Math.random() * voice.history.length)];
            // Mutate slightly
            if (Math.random() < 0.7) {
                 return historicalNote + (Math.random() > 0.5 ? 1 : -1);
            }
            return historicalNote;
        }

        // 2. Harmonic Magnetism: Influence from other voices
        const otherNotes = voices
            .filter(v => v.isPlaying && v.id !== voice.id)
            .map(v => v.currentMidi % 12);

        let bestChoice = -1;
        let maxScore = -Infinity;

        for (let i = 0; i < currentScale.length * 2; i++) { // Check two octaves
            let score = 0;
            const candidateNote = currentScale[i % currentScale.length];

            // Favor smaller melodic leaps from the voice's last note
            if (voice.currentMidi) {
                const interval = Math.abs((voice.currentMidi % 12) - candidateNote);
                score += 1 / (interval + 1);
            }

            // Harmonic consonance scoring
            if (otherNotes.length > 0) {
                let harmonyScore = 0;
                otherNotes.forEach(otherNote => {
                    const interval = Math.abs(candidateNote - otherNote) % 12;
                    if ([0, 4, 7].includes(interval)) harmonyScore += 2; // Unison, Major 3rd, Perfect 5th
                    else if ([3, 5, 9].includes(interval)) harmonyScore += 1; // Minor 3rd, Perfect 4th, Major 6th
                });
                score += harmonyScore * params.harmonicMagnetism.value;
            } else {
                // If no one else is playing, just be random within the scale
                score += Math.random();
            }

            if (score > maxScore) {
                maxScore = score;
                bestChoice = i;
            }
        }
        
        const octave = Math.floor(Math.random() * 2) + 1; // Octaves 2 and 3
        return scaleToMidi(bestChoice, octave);
    }

    function scheduleNote(voice) {
        const now = audioContext.currentTime;
        if (now < voice.nextNoteTime) return;

        // Decide if this voice should play (Conversation Density & Emotional Temperature)
        const conversationUrge = Math.random() < params.conversationDensity.value;
        const lastActiveVoice = voices.sort((a, b) => b.lastActivity - a.lastActivity)[0];
        
        let playProbability = params.emotionalTemperature.value * 0.4;
        if (conversationUrge && lastActiveVoice.id !== voice.id) {
             playProbability += 0.4; // More likely to play if responding
        }

        if (Math.random() > playProbability) {
            const silenceDuration = (1 - params.emotionalTemperature.value) * (2 + Math.random() * 2);
            voice.nextNoteTime = now + silenceDuration;
            return;
        }

        // Start new note
        const midi = getNextNote(voice);
        voice.currentMidi = midi;
        voice.history.push(midi);
        if (voice.history.length > 20) voice.history.shift();

        const freq = midiToFreq(midi);
        
        // Calculate ADSR values with variation
        const envVariation = params.envelopeVariation.value;
        const attackTime = (0.01 + params.attack.value * 1.99) * (1 + (Math.random() - 0.5) * envVariation);
        const decayTime = (0.01 + params.decay.value * 1.99) * (1 + (Math.random() - 0.5) * envVariation);
        const sustainLevel = params.sustain.value * (1 + (Math.random() - 0.5) * envVariation * 0.5);
        const releaseTime = (0.1 + params.release.value * 3.9) * (1 + (Math.random() - 0.5) * envVariation);
        
        // Note duration affected by emotional temperature
        const noteDuration = (0.2 + Math.random() * 2) * (1 + params.emotionalTemperature.value);
        
        const noteVelocity = (Math.random() * 0.3 + 0.1) * (0.5 + params.emotionalTemperature.value * 0.5);

        // Cancel any scheduled changes
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.filter.frequency.cancelScheduledValues(now);
        
        // Set oscillator frequency
        voice.osc.frequency.setValueAtTime(freq, now);
        
        // ADSR Envelope
        voice.gainNode.gain.setValueAtTime(0.0001, now);
        // Attack
        voice.gainNode.gain.exponentialRampToValueAtTime(noteVelocity, now + attackTime);
        // Decay to sustain
        voice.gainNode.gain.exponentialRampToValueAtTime(noteVelocity * sustainLevel, now + attackTime + decayTime);
        
        // Filter envelope with timbre modulation
        const baseFilterFreq = 200 + params.filterFrequency.value * 7800; // 200Hz to 8000Hz
        const filterEnvAmount = params.filterEnvelope.value * 3000;
        const filterModulation = 1 + (Math.random() - 0.5) * params.timbreModulation.value;
        
        voice.filter.Q.value = 0.5 + params.filterResonance.value * 19.5; // Q from 0.5 to 20
        voice.filter.frequency.setValueAtTime(baseFilterFreq * 0.2, now);
        // Filter attack
        voice.filter.frequency.exponentialRampToValueAtTime(
            baseFilterFreq * filterModulation + filterEnvAmount, 
            now + attackTime
        );
        // Filter decay
        voice.filter.frequency.exponentialRampToValueAtTime(
            baseFilterFreq * filterModulation, 
            now + attackTime + decayTime
        );
        
        // Add subtle filter LFO during sustain
        if (params.timbreModulation.value > 0.1) {
            const lfoRate = 2 + Math.random() * 4; // 2-6 Hz
            const lfoDepth = params.timbreModulation.value * 500;
            for (let t = 0; t < noteDuration; t += 0.1) {
                const lfoTime = now + attackTime + decayTime + t;
                const lfoValue = baseFilterFreq + Math.sin(lfoTime * lfoRate * Math.PI * 2) * lfoDepth;
                voice.filter.frequency.setValueAtTime(Math.max(lfoValue, 100), lfoTime);
            }
        }
        
        // Schedule note off with release
        const noteEndTime = now + noteDuration;
        voice.gainNode.gain.setValueAtTime(noteVelocity * sustainLevel, noteEndTime);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEndTime + releaseTime);
        
        voice.isPlaying = true;
        voice.lastActivity = now;

        // Rhythmic Elasticity
        const baseNextTime = noteEndTime + releaseTime + 0.1;
        const elasticity = (Math.random() - 0.5) * params.rhythmicElasticity.value;
        voice.nextNoteTime = baseNextTime + elasticity;

        // Visual feedback
        const vizElement = document.getElementById(`voice-viz-${voice.id}`);
        const noteColor = `hsl(${(midi * 30) % 360}, 80%, 60%)`;
        vizElement.style.backgroundColor = noteColor;
        vizElement.style.borderColor = `hsl(${(midi * 30) % 360}, 100%, 80%)`;
        vizElement.style.boxShadow = `0 0 20px ${noteColor}`;
        vizElement.style.transform = `scale(${1 + noteVelocity * 0.5})`;
        
        setTimeout(() => {
            vizElement.style.backgroundColor = '#2a2a2a';
            vizElement.style.borderColor = '#444';
            vizElement.style.boxShadow = '0 0 0px rgba(255, 255, 255, 0)';
            vizElement.style.transform = 'scale(1)';
        }, (noteDuration + releaseTime) * 1000);
    }
    
    function evolveVoices() {
        const now = audioContext.currentTime;
        if (now < nextEvolutionTime) return;

        voices.forEach(voice => {
            if (Math.random() < params.voiceEvolution.value) {
                const waveForms = ['sine', 'triangle', 'sawtooth', 'square'];
                const currentFormIndex = waveForms.indexOf(voice.osc.type);
                let newFormIndex = (currentFormIndex + (Math.random() > 0.5 ? 1 : -1) + waveForms.length) % waveForms.length;
                voice.osc.type = waveForms[newFormIndex];
            }
        });

        const evolutionInterval = (1 - params.evolutionaryRate.value) * 20 + 2; // between 2 and 22 seconds
        nextEvolutionTime = now + evolutionInterval;
    }


    function musicLoop() {
        if (!isPlaying) return;
        
        voices.forEach(voice => {
            scheduleNote(voice);
        });

        evolveVoices();
    }

    // --- Event Handlers ---
    startStopBtn.addEventListener('click', () => {
        if (!audioContext) {
            initAudio();
        }

        isPlaying = !isPlaying;
        if (isPlaying) {
            audioContext.resume();
            startStopBtn.textContent = 'Stop';
            startStopBtn.classList.add('playing');
            nextEvolutionTime = audioContext.currentTime + 5;
            mainLoopInterval = setInterval(musicLoop, 150); // Scheduler runs every 150ms
        } else {
            startStopBtn.textContent = 'Start';
            startStopBtn.classList.remove('playing');
            voices.forEach(voice => {
                if (voice.isPlaying) {
                    voice.gainNode.gain.cancelScheduledValues(audioContext.currentTime);
                    voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2);
                    voice.isPlaying = false;
                }
            });
            clearInterval(mainLoopInterval);
        }
    });

    // --- Initial Setup ---
    createControls();
    createVisualizer();
});
