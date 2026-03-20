/**
 * NoRulete - UI Module
 * DOM references, rendering, results table, toasts, confetti, and utility functions.
 */

import { AppState } from './state.js';
import { SoundManager } from './audio.js';

// ============================================
// DOM Elements
// ============================================
export const elements = {
    // Mode Selection
    startScreen: document.getElementById('startScreen'),
    modeClassroomBtn: document.getElementById('modeClassroomBtn'),
    modeGiveawayBtn: document.getElementById('modeGiveawayBtn'),
    giveawaySettings: document.getElementById('giveawaySettings'),
    startGiveawayBtn: document.getElementById('startGiveawayBtn'),
    losersCountSelect: document.getElementById('losersCountSelect'),
    winnersCountSelect: document.getElementById('winnersCountSelect'),
    classroomSettings: document.getElementById('classroomSettings'),
    startClassroomBtn: document.getElementById('startClassroomBtn'),
    goToStartBtn: document.getElementById('goToStartBtn'),

    // Splash Screen
    splashScreen: document.getElementById('splashScreen'),
    splashStartBtn: document.getElementById('splashStartBtn'),
    splashVideo: document.getElementById('splashVideo'),

    // Main App
    namesInput: document.getElementById('namesInput'),
    loadNamesBtn: document.getElementById('loadNamesBtn'),
    inputSection: document.getElementById('inputSection'),
    wheelSection: document.getElementById('wheelSection'),
    wheelCanvas: document.getElementById('wheelCanvas'),
    wheelPointer: document.querySelector('.wheel-pointer'),
    spinBtn: document.getElementById('spinBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    remainingText: document.getElementById('remainingText'),
    backToInputBtn: document.getElementById('backToInputBtn'),

    // Results
    resultsTable: document.getElementById('resultsTable'),
    resultsBody: document.getElementById('resultsBody'),
    losersSection: document.getElementById('losersSection'),
    losersTable: document.getElementById('losersTable'),
    losersBody: document.getElementById('losersBody'),
    winnersSection: document.getElementById('winnersSection'),
    winnersTitle: document.getElementById('winnersTitle'),
    emptyState: document.getElementById('emptyState'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    resetBtn: document.getElementById('resetBtn'),

    // Official Mode & Transparency
    officialModeToggle: document.getElementById('officialModeToggle'),
    transparencySection: document.getElementById('transparencySection'),
    spinCountDisplay: document.getElementById('spinCount'),
    resetCountDisplay: document.getElementById('resetCount'),

    // Winner Overlay
    winnerOverlay: document.getElementById('winnerOverlay'),
    winnerName: document.getElementById('winnerName'),
    winnerPosition: document.getElementById('winnerPosition'),
    winnerLabel: document.querySelector('.winner-label'),
    continueBtn: document.getElementById('continueBtn'),
    confettiContainer: document.getElementById('confettiContainer'),

    // Official Mode Modal
    officialModeModal: document.getElementById('officialModeModal'),
    confirmOfficialModeBtn: document.getElementById('confirmOfficialModeBtn'),
    cancelOfficialModeBtn: document.getElementById('cancelOfficialModeBtn'),
    detailsToggle: document.getElementById('detailsToggle'),
    modalDetailsList: document.getElementById('modalDetailsList'),
};

// ============================================
// Transparency Counters Display
// ============================================
export function updateTransparencyCounters() {
    if (elements.spinCountDisplay) {
        elements.spinCountDisplay.textContent = AppState.totalSpins;
    }
    if (elements.resetCountDisplay) {
        elements.resetCountDisplay.textContent = AppState.totalResets;
    }
}

// ============================================
// Winner Result Display
// ============================================
export function showWinnerResult(name, position, type, isLastWinner = false) {
    elements.winnerName.textContent = name;

    if (type === 'loser') {
        elements.winnerLabel.textContent = "¡Eliminado!";
        elements.winnerPosition.textContent = "Sigue intentando, para el otro año será!";
        elements.winnerOverlay.classList.remove('winner-theme');
        elements.winnerOverlay.classList.add('loser-theme');
        SoundManager.playLoser();
    } else {
        elements.winnerLabel.textContent = "El participante";

        if (isLastWinner) {
            elements.winnerPosition.textContent = "¡Último ganador! Sorteo finalizado.";
            elements.spinBtn.disabled = true;
            elements.shuffleBtn.disabled = true;
            elements.remainingText.textContent = "¡Sorteo completado!";
        } else {
            elements.winnerPosition.textContent = AppState.gameMode === 'giveaway' ? '¡Es el afortunado!' : `Posición #${position}`;
        }

        elements.winnerOverlay.classList.remove('loser-theme');
        elements.winnerOverlay.classList.add('winner-theme');
        SoundManager.playWin();
        createConfetti();
    }

    elements.winnerOverlay.classList.add('active');
    updateResultsTable();
}

// ============================================
// Auto-Add Last Participant
// ============================================
export function autoAddLastParticipant(handleGiveawayResult, saveToStorage, render) {
    const lastParticipant = AppState.remainingNames[0];
    AppState.remainingNames = [];

    if (AppState.gameMode === 'giveaway') {
        handleGiveawayResult(lastParticipant);
    } else {
        AppState.selectedOrder.push(lastParticipant);
        showWinnerResult(lastParticipant, AppState.selectedOrder.length, 'winner');
    }

    saveToStorage();
    render();
}

// ============================================
// Render UI
// ============================================
let _drawWheel = null;

export function setDrawWheelFn(fn) {
    _drawWheel = fn;
}

export function render() {
    const hasNames = AppState.allNames.length > 0;
    const hasRemaining = AppState.remainingNames.length > 0;

    // Hide Start Screen if mode is selected
    if (AppState.gameMode) {
        elements.startScreen.classList.add('hidden');
    } else {
        elements.startScreen.classList.remove('hidden');
    }

    // Toggle input/wheel sections
    if (hasNames) {
        elements.inputSection.classList.add('hidden');
        elements.wheelSection.classList.add('active');
    } else {
        elements.inputSection.classList.remove('hidden');
        elements.wheelSection.classList.remove('active');
    }

    // Check for Giveaway Completion
    let isGiveawayComplete = false;
    if (AppState.gameMode === 'giveaway') {
        const maxWinners = AppState.winnersCountTarget;
        const currentWinners = AppState.selectedOrder.length;
        if (maxWinners > 0 && currentWinners >= maxWinners) {
            isGiveawayComplete = true;
        }
    }

    // Auto-add last participant if only 1 remains
    if (AppState.remainingNames.length === 1 && !AppState.isSpinning && !isGiveawayComplete) {
        // We need the handlers from main.js - use the injected callback
        if (_autoAddCallback) {
            _autoAddCallback();
        }
        return;
    }

    // Update spin/shuffle buttons
    const canSpin = hasRemaining && !AppState.isSpinning && !isGiveawayComplete;
    elements.spinBtn.disabled = !canSpin;

    const canShuffle = hasRemaining && AppState.remainingNames.length >= 2 && !AppState.isSpinning && !isGiveawayComplete;
    elements.shuffleBtn.disabled = !canShuffle;

    // Update remaining text
    if (isGiveawayComplete) {
        elements.remainingText.textContent = "¡Sorteo completado!";
    } else if (hasRemaining) {
        elements.remainingText.textContent = `${AppState.remainingNames.length} participante${AppState.remainingNames.length !== 1 ? 's' : ''} restante${AppState.remainingNames.length !== 1 ? 's' : ''}`;
    } else if (hasNames) {
        elements.remainingText.textContent = '¡Todos han participado!';
    } else {
        elements.remainingText.textContent = 'Carga nombres para comenzar';
    }

    // Update action buttons
    const hasResults = AppState.selectedOrder.length > 0 || AppState.losersList.length > 0;
    elements.exportPdfBtn.disabled = !hasResults;

    // Draw wheel
    if (_drawWheel) {
        _drawWheel(AppState.currentRotation);
    }

    // Update results table
    updateResultsTable();
}

let _autoAddCallback = null;

export function setAutoAddCallback(fn) {
    _autoAddCallback = fn;
}

// ============================================
// Results Table
// ============================================
export function updateResultsTable() {
    const hasSelected = AppState.selectedOrder.length > 0;
    const hasLosers = AppState.losersList.length > 0;
    const showResults = hasSelected || hasLosers;

    // Toggle empty state
    if (showResults) {
        elements.emptyState.classList.add('hidden');
    } else {
        elements.emptyState.classList.remove('hidden');
    }

    // Handle Split Tables for Giveaway Mode
    if (AppState.gameMode === 'giveaway') {
        elements.losersSection.classList.toggle('hidden', !hasLosers);
        elements.losersTable.classList.toggle('active', hasLosers);
        elements.winnersTitle.innerHTML = '<svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg> Lista de Ganadores';

        // Populate Losers
        elements.losersBody.innerHTML = AppState.losersList.map((name, index) => {
            const isNew = index === AppState.losersList.length - 1;
            return `
                <tr class="${isNew ? 'new-entry' : ''}">
                    <td>${index + 1}</td>
                    <td>${escapeHtml(name)}</td>
                </tr>
            `;
        }).join('');
    } else {
        elements.losersSection.classList.add('hidden');
        elements.losersTable.classList.remove('active');
        elements.winnersTitle.innerHTML = '<svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg> Orden de Participación';
    }

    // Update main results table visibility
    elements.resultsTable.classList.toggle('active', hasSelected);

    // Build table rows
    elements.resultsBody.innerHTML = AppState.selectedOrder.map((name, index) => {
        const isNew = index === AppState.selectedOrder.length - 1;
        return `
            <tr class="${isNew ? 'new-entry' : ''}">
                <td>${index + 1}</td>
                <td>${escapeHtml(name)}</td>
            </tr>
        `;
    }).join('');
}

// ============================================
// Utility Functions
// ============================================
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function showToast(message, type = 'success') {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function createConfetti() {
    const container = elements.confettiContainer;
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 4000);
    }
}
