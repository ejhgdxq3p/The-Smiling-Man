/**
 * AudioManager - Handles all game audio
 * Uses Web Audio API for procedural sound generation
 */

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
        
        // Try to initialize on user interaction
        this.initPromise = null;
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
            
            // Start ambient hum
            this.startAmbientHum();
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }
    
    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
    }
    
    startAmbientHum() {
        if (!this.ctx) return;
        
        // Low frequency oscillator for ambient hum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 60; // 60Hz hum
        
        gain.gain.value = 0.05;
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        
        // Add some wobble
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.5;
        lfoGain.gain.value = 5;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
    }
    
    playTypeSound() {
        if (!this.ctx) {
            this.ensureInit();
            return;
        }
        
        // Short click sound for typing
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.value = 800 + Math.random() * 400;
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialDecayTo ? 
            gain.gain.exponentialDecayTo(0.01, this.ctx.currentTime + 0.05) :
            gain.gain.setTargetAtTime(0.01, this.ctx.currentTime, 0.02);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }
    
    playCollision(type = 'light') {
        if (!this.ctx) {
            this.ensureInit();
            return;
        }
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        if (type === 'heavy') {
            // Low, heavy thud
            osc.type = 'sine';
            osc.frequency.value = 80;
            filter.type = 'lowpass';
            filter.frequency.value = 200;
            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.setTargetAtTime(0.01, this.ctx.currentTime, 0.1);
        } else {
            // High, light ping
            osc.type = 'triangle';
            osc.frequency.value = 600 + Math.random() * 400;
            filter.type = 'highpass';
            filter.frequency.value = 400;
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.setTargetAtTime(0.01, this.ctx.currentTime, 0.05);
        }
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
    
    playError() {
        if (!this.ctx) {
            this.ensureInit();
            return;
        }
        
        // Distorted Windows error sound
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const distortion = this.ctx.createWaveShaper();
        
        // Create distortion curve
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i / 128) - 1;
            curve[i] = Math.tanh(x * 3);
        }
        distortion.curve = curve;
        
        osc1.type = 'square';
        osc1.frequency.value = 440;
        
        osc2.type = 'square';
        osc2.frequency.value = 523.25;
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.setTargetAtTime(0.01, this.ctx.currentTime + 0.1, 0.1);
        
        osc1.connect(distortion);
        osc2.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.2);
        osc2.stop(this.ctx.currentTime + 0.2);
        
        // Second tone
        setTimeout(() => {
            if (!this.ctx) return;
            const osc3 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            
            osc3.type = 'square';
            osc3.frequency.value = 349.23;
            
            gain2.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain2.gain.setTargetAtTime(0.01, this.ctx.currentTime + 0.1, 0.1);
            
            osc3.connect(gain2);
            gain2.connect(this.masterGain);
            
            osc3.start();
            osc3.stop(this.ctx.currentTime + 0.2);
        }, 200);
    }
    
    playSuccess() {
        if (!this.ctx) return;
        
        // Ascending tone
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        notes.forEach((freq, i) => {
            setTimeout(() => {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
                gain.gain.setTargetAtTime(0.01, this.ctx.currentTime + 0.15, 0.05);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start();
                osc.stop(this.ctx.currentTime + 0.2);
            }, i * 100);
        });
    }
    
    setMasterVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }
}
