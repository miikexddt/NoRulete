/**
 * NoRulete - Audio Module
 * Sound management using Web Audio API and HTML5 Audio.
 */

import { AppState } from './state.js';

// ============================================
// Sound Management (Web Audio API)
// ============================================
export const SoundManager = {
    ctx: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playTick() {
        if (!AppState.audioEnabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },

    playWin() {
        if (!AppState.audioEnabled) return;

        if (AppState.gameMode === 'giveaway') {
            const audio = new Audio('ganadorAudio.mp3');
            audio.volume = 0.6;
            audio.play().catch(err => console.warn("Error playing ganadorAudio.mp3:", err));
        } else {
            if (!this.ctx) return;
            const notes = [523.25, 659.25, 783.99, 1046.50];

            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq;

                const startTime = this.ctx.currentTime + (i * 0.1);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 2);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 2);
            });
        }
    },

    playLoser() {
        if (!AppState.audioEnabled) return;

        const audio = new Audio('sadAudio.mp3');
        audio.volume = 0.6;
        audio.play().catch(err => console.warn("Error playing sadAudio.mp3:", err));
    },

    playThunder() {
        if (!AppState.audioEnabled || !this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 1.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 1.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },

    playShuffle() {
        if (!AppState.audioEnabled || !this.ctx) return;
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playTick(), i * 50);
        }
    }
};
