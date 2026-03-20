/**
 * NoRulete - State Management Module
 * Centralized application state and storage key constants.
 */

// ============================================
// Application State
// ============================================
export const AppState = {
    allNames: [],           // Original list of all names
    remainingNames: [],     // Names not yet selected
    selectedOrder: [],      // Names in order of selection (Winners in standard mode)
    losersList: [],         // "Salados" (Giveaway mode only)
    isSpinning: false,
    isIdling: false,        // Track idle state
    idleId: null,           // RequestAnimationFrame ID for idle
    currentRotation: 0,
    audioEnabled: true,

    // Mode State
    gameMode: null,         // 'classroom' | 'giveaway'
    losersCountTarget: 0,   // How many losers to select (0-5)
    winnersCountTarget: 0,  // How many winners to select (0 = all remaining)

    // Transparency counters (read-only for user)
    totalSpins: 0,          // Total wheel spins
    totalResets: 0,         // Total game resets

    // Mode toggles
    officialMode: false,    // Whether official/legal mode is enabled
};

// ============================================
// Storage Keys
// ============================================
export const STORAGE_KEYS = {
    ALL_NAMES: 'ruleta_allNames',
    REMAINING_NAMES: 'ruleta_remainingNames',
    SELECTED_ORDER: 'ruleta_selectedOrder',
    ROTATION: 'ruleta_rotation',
    GAME_MODE: 'ruleta_gameMode',
    LOSERS_COUNT: 'ruleta_losersCount',
    WINNERS_COUNT: 'ruleta_winnersCount',
    LOSERS_LIST: 'ruleta_losersList',
    TOTAL_SPINS: 'ruleta_totalSpins',
    TOTAL_RESETS: 'ruleta_totalResets',
    OFFICIAL_MODE: 'ruleta_officialMode',
};
