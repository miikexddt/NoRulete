/**
 * NoRulete - Wheel Module
 * Canvas drawing, animation, and idle rotation for the wheel.
 */

import { AppState } from './state.js';
import { SoundManager } from './audio.js';
import { elements } from './ui.js';

// ============================================
// Wheel Configuration
// ============================================
export const wheelConfig = {
    colors: [
        '#FDD835', // Yellow
        '#FF5252', // Red
        '#26C6DA', // Cyan
        '#7E57C2'  // Purple
    ],
    centerRadius: 42,
    textOffset: 0.65,
};

// Center logo image
export const centerLogo = new Image();
centerLogo.src = 'luck_fixed.png?v=' + Date.now();

// Canvas context (initialized after DOM ready)
let ctx = null;

export function initCanvas() {
    ctx = elements.wheelCanvas.getContext('2d');
    // Redraw when logo loads
    centerLogo.onload = () => {
        drawWheel(AppState.currentRotation);
    };
}

// ============================================
// Draw the Wheel
// ============================================
export function drawWheel(rotation = 0) {
    if (!ctx) return;

    const canvas = elements.wheelCanvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (AppState.remainingNames.length === 0) {
        drawEmptyWheel(centerX, centerY, radius);
        return;
    }

    const segmentAngle = (2 * Math.PI) / AppState.remainingNames.length;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw segments
    AppState.remainingNames.forEach((name, index) => {
        const startAngle = index * segmentAngle - Math.PI / 2;
        const endAngle = startAngle + segmentAngle;

        const fillStyle = wheelConfig.colors[index % wheelConfig.colors.length];

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();

        // Draw border
        ctx.strokeStyle = AppState.gameMode === 'giveaway' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${calculateFontSize(AppState.remainingNames.length)}px Outfit`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;

        const maxLength = AppState.remainingNames.length > 8 ? 12 : 18;
        const displayName = name.length > maxLength ? name.substring(0, maxLength - 1) + '…' : name;
        ctx.fillText(displayName, radius * 0.9, 5);
        ctx.restore();
    });

    ctx.restore();

    // Center circle (Advanced Animated Hub)
    ctx.save();
    ctx.translate(centerX, centerY);

    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 3) * 4;
    const auraRotation = time * 0.5;

    // 1. Rotating Aura
    ctx.save();
    ctx.rotate(auraRotation);
    const auraGradient = ctx.createRadialGradient(0, 0, wheelConfig.centerRadius, 0, 0, wheelConfig.centerRadius + 15 + pulse);
    auraGradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    auraGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, wheelConfig.centerRadius + 20 + pulse, 0, 2 * Math.PI);
    ctx.fillStyle = auraGradient;
    ctx.fill();
    ctx.restore();

    // 2. Hub Base & shadow
    ctx.beginPath();
    ctx.arc(0, 0, wheelConfig.centerRadius + 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15 + pulse;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
    ctx.fill();

    // 3. Draw the Custom Logo Image
    if (centerLogo.complete && centerLogo.naturalWidth !== 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, wheelConfig.centerRadius - 1, 0, 2 * Math.PI);
        ctx.clip();

        const logoScale = 1.05 + (pulse * 0.015);
        const size = wheelConfig.centerRadius * 2 * logoScale;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(centerLogo, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    // 4. Premium Rim
    ctx.beginPath();
    ctx.arc(0, 0, wheelConfig.centerRadius, 0, 2 * Math.PI);
    const rimGradient = ctx.createLinearGradient(-40, -40, 40, 40);
    rimGradient.addColorStop(0, '#6366f1');
    rimGradient.addColorStop(0.5, '#a5b4fc');
    rimGradient.addColorStop(1, '#6366f1');
    ctx.strokeStyle = rimGradient;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 8;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawEmptyWheel(centerX, centerY, radius) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#252542';
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#71717a';
    ctx.font = 'bold 20px Outfit';
    ctx.fillText('¡Todos han', centerX, centerY - 10);
    ctx.fillText('participado!', centerX, centerY + 20);
}

function calculateFontSize(numSegments) {
    // Scale font based on the canvas's actual rendered size (bigger screen = bigger text)
    const canvas = elements.wheelCanvas;
    const renderedSize = Math.min(canvas.clientWidth, canvas.clientHeight);
    const scale = renderedSize / 400; // 400px as baseline

    let baseFontSize;
    if (numSegments <= 4) baseFontSize = 20;
    else if (numSegments <= 8) baseFontSize = 17;
    else if (numSegments <= 12) baseFontSize = 15;
    else if (numSegments <= 16) baseFontSize = 13;
    else baseFontSize = 11;

    return Math.round(baseFontSize * Math.max(scale, 0.8)); // never go below 80% of base
}

// ============================================
// Animation Functions
// ============================================
export function animateWheel(startRotation, endRotation, duration, callback) {
    const startTime = performance.now();
    const segmentAngle = 360 / AppState.remainingNames.length;
    let lastSegmentIndex = Math.floor(startRotation / segmentAngle);

    function animate(currentTime) {
        // Interruption check
        if (!AppState.isSpinning) {
            console.log('Animation interrupted');
            return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentRotation = startRotation + (endRotation - startRotation) * easeProgress;
        const currentSegmentIndex = Math.floor(currentRotation / segmentAngle);

        if (currentSegmentIndex !== lastSegmentIndex) {
            SoundManager.playTick();

            // Visual Animation: Trigger reflow to restart tick animation
            elements.wheelPointer.classList.remove('tick');
            void elements.wheelPointer.offsetWidth;
            elements.wheelPointer.classList.add('tick');

            lastSegmentIndex = currentSegmentIndex;
        }

        drawWheel(currentRotation);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            callback();
        }
    }

    requestAnimationFrame(animate);
}

// ============================================
// Idle Animation
// ============================================
export function startIdleAnimation() {
    if (AppState.isIdling || AppState.isSpinning || AppState.remainingNames.length === 0) return;

    AppState.isIdling = true;

    function idleLoop() {
        if (!AppState.isIdling) return;

        AppState.currentRotation += 0.2;
        drawWheel(AppState.currentRotation);

        AppState.idleId = requestAnimationFrame(idleLoop);
    }

    AppState.idleId = requestAnimationFrame(idleLoop);
}

export function stopIdleAnimation() {
    AppState.isIdling = false;
    if (AppState.idleId) {
        cancelAnimationFrame(AppState.idleId);
        AppState.idleId = null;
    }
}
