// Procedural Sound Synthesizer using Web Audio API

class SoundscapeSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentNodes: any[] = [];
  private currentType: string | null = null;
  private rainLFO: OscillatorNode | null = null;
  private oceanLFO: OscillatorNode | null = null;
  private forestLFO: OscillatorNode | null = null;
  private spaceLFOs: OscillatorNode[] = [];
  private pianoTimeout: any = null;
  private isPianoPlaying = false;
  private noiseBuffer: AudioBuffer | null = null;
  private currentVolume = 0.5;

  private initContext() {
    if (!this.ctx) {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
      this.createNoiseBuffer();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.1);
    }
  }

  public async start(type: 'rain' | 'ocean' | 'forest' | 'space' | 'piano') {
    this.stop();
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.currentType = type;

    if (type === 'rain') {
      this.startRain();
    } else if (type === 'ocean') {
      this.startOcean();
    } else if (type === 'forest') {
      this.startForest();
    } else if (type === 'space') {
      this.startSpace();
    } else if (type === 'piano') {
      this.startPiano();
    }
  }

  public stop() {
    // Clear timeouts
    if (this.pianoTimeout) {
      clearTimeout(this.pianoTimeout);
      this.pianoTimeout = null;
    }
    this.isPianoPlaying = false;

    // Disconnect and stop all nodes
    this.currentNodes.forEach(node => {
      try {
        node.stop?.();
      } catch (e) {}
      try {
        node.disconnect();
      } catch (e) {}
    });
    this.currentNodes = [];

    // Stop LFOs
    if (this.rainLFO) { this.rainLFO.stop(); this.rainLFO = null; }
    if (this.oceanLFO) { this.oceanLFO.stop(); this.oceanLFO = null; }
    if (this.forestLFO) { this.forestLFO.stop(); this.forestLFO = null; }
    this.spaceLFOs.forEach(lfo => { try { lfo.stop(); } catch(e){} });
    this.spaceLFOs = [];

    this.currentType = null;
  }

  // RAIN SYNTHESIS
  private startRain() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Source
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    // Filters to shape the rain sound
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1200, this.ctx.currentTime);

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(800, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(1.0, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    // LFO for wind/rain gusts
    this.rainLFO = this.ctx.createOscillator();
    this.rainLFO.type = 'sine';
    this.rainLFO.frequency.setValueAtTime(0.1, this.ctx.currentTime); // Very slow

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    // Connections
    this.rainLFO.connect(lfoGain);
    lfoGain.connect(rainGain.gain); // Modulate volume

    noiseSource.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(rainGain);
    rainGain.connect(this.masterGain);

    noiseSource.start();
    this.rainLFO.start();

    this.currentNodes.push(noiseSource, lowpass, bandpass, rainGain, lfoGain);
  }

  // OCEAN SYNTHESIS
  private startOcean() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Source
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    // Filters for wave swashing
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(350, this.ctx.currentTime);
    lowpass.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const waveGain = this.ctx.createGain();
    waveGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    // Ocean Waves LFO (~12 second wave cycle)
    this.oceanLFO = this.ctx.createOscillator();
    this.oceanLFO.type = 'sine';
    this.oceanLFO.frequency.setValueAtTime(0.08, this.ctx.currentTime); // ~12s

    const filterLfoGain = this.ctx.createGain();
    filterLfoGain.gain.setValueAtTime(180, this.ctx.currentTime); // Modulate filter cutoff between 170Hz and 530Hz

    const ampLfoGain = this.ctx.createGain();
    ampLfoGain.gain.setValueAtTime(0.1, this.ctx.currentTime); // Modulate amplitude

    // Connect LFO to filters and gain
    this.oceanLFO.connect(filterLfoGain);
    filterLfoGain.connect(lowpass.frequency);

    this.oceanLFO.connect(ampLfoGain);
    ampLfoGain.connect(waveGain.gain);

    // Main signal path
    noiseSource.connect(lowpass);
    lowpass.connect(waveGain);
    waveGain.connect(this.masterGain);

    noiseSource.start();
    this.oceanLFO.start();

    this.currentNodes.push(noiseSource, lowpass, waveGain, filterLfoGain, ampLfoGain);
  }

  // FOREST SYNTHESIS (Gentle Wind + Birds)
  private startForest() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Wind Source
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = this.noiseBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.1, this.ctx.currentTime);

    // Wind LFO
    this.forestLFO = this.ctx.createOscillator();
    this.forestLFO.type = 'sine';
    this.forestLFO.frequency.setValueAtTime(0.15, this.ctx.currentTime);

    const windLfoGain = this.ctx.createGain();
    windLfoGain.gain.setValueAtTime(150, this.ctx.currentTime);

    this.forestLFO.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain);

    windSource.start();
    this.forestLFO.start();

    this.currentNodes.push(windSource, windFilter, windGain, windLfoGain);

    // Bird scheduler
    this.scheduleBirdChirps();
  }

  private scheduleBirdChirps() {
    if (this.currentType !== 'forest' || !this.ctx || !this.masterGain) return;

    const delay = 4000 + Math.random() * 5000; // Chirp every 4-9 seconds
    this.pianoTimeout = setTimeout(() => {
      this.triggerBirdChirp();
      this.scheduleBirdChirps();
    }, delay);
  }

  private triggerBirdChirp() {
    if (!this.ctx || !this.masterGain || this.currentType !== 'forest') return;

    const now = this.ctx.currentTime;
    
    // Create oscillator for the chirp
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    
    const chirpGain = this.ctx.createGain();
    chirpGain.gain.setValueAtTime(0, now);
    
    // Connect
    osc.connect(chirpGain);
    chirpGain.connect(this.masterGain);

    // Bird chirp frequency envelope: quick sweeping slide up and down
    const startFreq = 2200 + Math.random() * 400;
    osc.frequency.setValueAtTime(startFreq, now);
    
    // Quick bird-like chirping sweep pattern
    chirpGain.gain.linearRampToValueAtTime(0.04, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(startFreq + 600, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(startFreq - 400, now + 0.15);
    chirpGain.gain.linearRampToValueAtTime(0, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // SPACE AMBIENT PAD SYNTHESIS
  private startSpace() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Ambient space drone: minor chord C3, G3, D4, Eb4 (deep and calm)
    const baseFreqs = [130.81, 196.00, 293.66, 311.13]; // C3, G3, D4, Eb4
    
    baseFreqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.Q.setValueAtTime(1.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, now);

      // Low frequency modulators for filter sweep
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.05 + idx * 0.015, now); // Shifting phases

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(80, now);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Connect signal
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      lfo.start(now);

      this.currentNodes.push(osc, filter, gain, lfoGain);
      this.spaceLFOs.push(lfo);
    });
  }

  // SOFT PIANO SYNTHESIS
  private startPiano() {
    this.isPianoPlaying = true;
    this.schedulePianoNotes();
  }

  private schedulePianoNotes() {
    if (!this.isPianoPlaying || !this.ctx || this.currentType !== 'piano') return;

    // Pentatonic scale notes (C Minor Pentatonic: C, Eb, F, G, Bb)
    const notes = [
      130.81, 155.56, 174.61, 196.00, 233.08, // Octave 3
      261.63, 311.13, 349.23, 392.00, 466.16, // Octave 4
      523.25, 622.25, 698.46, 783.99, 932.33  // Octave 5
    ];

    // Pick 1-2 notes to play
    const numNotes = Math.random() > 0.7 ? 2 : 1;
    for (let i = 0; i < numNotes; i++) {
      const randomFreq = notes[Math.floor(Math.random() * notes.length)];
      this.playPianoTone(randomFreq);
    }

    // Schedule next notes (every 3 to 7 seconds)
    const nextInterval = 3000 + Math.random() * 4000;
    this.pianoTimeout = setTimeout(() => {
      this.schedulePianoNotes();
    }, nextInterval);
  }

  private playPianoTone(frequency: number) {
    if (!this.ctx || !this.masterGain || this.currentType !== 'piano') return;

    const now = this.ctx.currentTime;
    
    // Piano key sound setup
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator(); // Subharmonic/detuned for depth
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 0.998, now); // Detune slightly

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(frequency * 1.5, now);

    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0, now);

    // Connections
    osc1.connect(lowpass);
    osc2.connect(lowpass);
    lowpass.connect(amp);
    amp.connect(this.masterGain);

    // Soft release envelope: smooth slow attack, very long tail decay
    amp.gain.linearRampToValueAtTime(0.08, now + 0.08); // Soft attack
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 4.5); // Warm, long decay

    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 5.0);
    osc2.stop(now + 5.0);
  }

  /**
   * Modulate the audio characteristics based on progress (0.0 to 1.0)
   * As session progresses, we filter out higher frequencies and lower LFO speed to make it calmer
   */
  public updateStage(progress: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // As meditation progresses, slightly reduce overall volume by up to 20% to settle into silence
    const targetVol = this.currentVolume * (1 - progress * 0.2);
    this.masterGain.gain.setTargetAtTime(targetVol, now, 0.5);

    // Find and adjust any lowpass filters in our synthesizers to dim the high frequencies
    this.currentNodes.forEach(node => {
      if (node instanceof BiquadFilterNode) {
        if (node.type === 'lowpass') {
          // Progressively lower filter cutoff frequency
          const currentFreq = node.frequency.value;
          const targetFreq = Math.max(120, currentFreq * (1 - progress * 0.3));
          node.frequency.setTargetAtTime(targetFreq, now, 1.0);
        }
      }
    });
  }
}

export const audioSynth = new SoundscapeSynth();
