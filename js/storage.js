/**
 * NoRulete - Storage Module
 * LocalStorage persistence for application state.
 */

import { AppState, STORAGE_KEYS } from './state.js';
import { elements } from './ui.js';

// ============================================
// Save to LocalStorage
// ============================================
export function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.ALL_NAMES, JSON.stringify(AppState.allNames));
        localStorage.setItem(STORAGE_KEYS.REMAINING_NAMES, JSON.stringify(AppState.remainingNames));
        localStorage.setItem(STORAGE_KEYS.SELECTED_ORDER, JSON.stringify(AppState.selectedOrder));
        localStorage.setItem(STORAGE_KEYS.LOSERS_LIST, JSON.stringify(AppState.losersList || []));
        localStorage.setItem(STORAGE_KEYS.ROTATION, AppState.currentRotation.toString());
        localStorage.setItem(STORAGE_KEYS.GAME_MODE, AppState.gameMode || '');
        localStorage.setItem(STORAGE_KEYS.LOSERS_COUNT, AppState.losersCountTarget.toString());
        localStorage.setItem(STORAGE_KEYS.WINNERS_COUNT, AppState.winnersCountTarget.toString());
        localStorage.setItem(STORAGE_KEYS.TOTAL_SPINS, AppState.totalSpins.toString());
        localStorage.setItem(STORAGE_KEYS.TOTAL_RESETS, AppState.totalResets.toString());
        localStorage.setItem(STORAGE_KEYS.OFFICIAL_MODE, JSON.stringify(AppState.officialMode));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// ============================================
// Load from LocalStorage
// ============================================
export function loadFromStorage() {
    try {
        const parseSafely = (key) => {
            const item = localStorage.getItem(key);
            if (!item || item === 'undefined' || item === 'null') return null;
            try {
                return JSON.parse(item);
            } catch (err) {
                console.warn(`Error parsing ${key}:`, err);
                return null;
            }
        };

        const allNames = parseSafely(STORAGE_KEYS.ALL_NAMES);
        const remainingNames = parseSafely(STORAGE_KEYS.REMAINING_NAMES);
        const selectedOrder = parseSafely(STORAGE_KEYS.SELECTED_ORDER);
        const losersList = parseSafely(STORAGE_KEYS.LOSERS_LIST);

        const rotation = localStorage.getItem(STORAGE_KEYS.ROTATION);
        const gameMode = localStorage.getItem(STORAGE_KEYS.GAME_MODE);
        const losersCount = localStorage.getItem(STORAGE_KEYS.LOSERS_COUNT);
        const winnersCount = localStorage.getItem(STORAGE_KEYS.WINNERS_COUNT);
        const totalSpins = localStorage.getItem(STORAGE_KEYS.TOTAL_SPINS);
        const totalResets = localStorage.getItem(STORAGE_KEYS.TOTAL_RESETS);
        const officialMode = parseSafely(STORAGE_KEYS.OFFICIAL_MODE);

        if (Array.isArray(allNames)) AppState.allNames = allNames;
        if (Array.isArray(remainingNames)) AppState.remainingNames = remainingNames;
        if (Array.isArray(selectedOrder)) AppState.selectedOrder = selectedOrder;
        if (Array.isArray(losersList)) AppState.losersList = losersList;

        if (rotation) AppState.currentRotation = parseFloat(rotation);
        if (gameMode) AppState.gameMode = gameMode;
        if (losersCount) AppState.losersCountTarget = parseInt(losersCount);
        if (winnersCount) AppState.winnersCountTarget = parseInt(winnersCount);
        if (totalSpins) AppState.totalSpins = parseInt(totalSpins);
        if (totalResets) AppState.totalResets = parseInt(totalResets);
        if (officialMode !== null) AppState.officialMode = officialMode;

        // Sync Official Mode UI
        if (elements.officialModeToggle && AppState.officialMode) {
            elements.officialModeToggle.checked = true;
            elements.transparencySection.classList.remove('hidden');
            elements.exportPdfBtn.classList.remove('hidden');
        }

        // Sync UI with loaded state
        if (elements.losersCountSelect) {
            const hasLosersKey = localStorage.getItem(STORAGE_KEYS.LOSERS_COUNT) !== null;
            if (hasLosersKey) {
                elements.losersCountSelect.value = AppState.losersCountTarget.toString();
            } else {
                elements.losersCountSelect.value = "2";
                AppState.losersCountTarget = 2;
            }
        }
        if (elements.winnersCountSelect) {
            elements.winnersCountSelect.value = AppState.winnersCountTarget.toString();
        }

    } catch (e) {
        console.error('Error loading from localStorage:', e);
    }
}

// ============================================
// Clear Storage
// ============================================
export function clearStorage() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
