/**
 * Ruleta de la Mala Suerte
 * Educational SPA for random participation order selection
 */

// ============================================
// State Management
// ============================================
const AppState = {
    allNames: [],           // Original list of all names
    remainingNames: [],     // Names not yet selected
    selectedOrder: [],      // Names in order of selection (Winners in standard mode)
    losersList: [],         // "Salados" (Giveaway mode only)
    isSpinning: false,
    isIdling: false,     // New: Track idle state
    idleId: null,        // New: RequestAnimationFrame ID for idle
    currentRotation: 0,
    audioEnabled: true,

    // New Mode State
    gameMode: null,         // 'classroom' | 'giveaway'
    losersCountTarget: 0,   // How many losers to select (0-5)
    winnersCountTarget: 0,  // How many winners to select (0 = all remaining)

    // Transparency counters (read-only for user)
    totalSpins: 0,          // Total wheel spins
    totalResets: 0,         // Total game resets

    // Mode toggles
    officialMode: false,    // Whether official/legal mode is enabled
};

// ... SoundManager ... (omitted for brevity, assume unchanged if not shown in context)

// ============================================
// Sound Management (Web Audio API)
// ============================================
const SoundManager = {
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

        // High pitch tick sound (wood block style)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        // Short snappy envelope
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
            // Play the custom audio for "Sorteo General"
            const audio = new Audio('ganadorAudio.mp3');
            audio.volume = 0.6;
            audio.play().catch(err => console.warn("Error playing ganadorAudio.mp3:", err));
        } else {
            // Formal synthesized sound for "Sorteo de Grupos" (Universitarios)
            if (!this.ctx) return;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

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

        // Play the custom audio file provided by the user
        const audio = new Audio('sadAudio.mp3');
        audio.volume = 0.6;
        audio.play().catch(err => console.warn("Error playing sadAudio.mp3:", err));
    },

    speakWinner(name, position) {
        if (!AppState.voiceEnabled) return;
        // ... (rest of speakWinner)
    },
    // ... rest of SoundManager ...
    playThunder() {
        if (!AppState.audioEnabled || !this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 1.5; // 1.5s noise
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

        // Lowpass filter for rumble
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
        // fast ticks
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playTick(), i * 50);
        }
    }
};

// ... Storage Keys ... (unchanged)
const STORAGE_KEYS = {
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
    OFFICIAL_MODE: 'ruleta_officialMode', // New Key
};

// ============================================
// DOM Elements
// ============================================
const elements = {
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
// Wheel Configuration
// ============================================
const wheelConfig = {
    colors: [
        '#FDD835', // Yellow
        '#FF5252', // Red
        '#26C6DA', // Cyan
        '#7E57C2'  // Purple
    ],
    centerRadius: 42, // Balanced size
    textOffset: 0.65,
};

const centerLogo = new Image();
centerLogo.onload = () => {
    drawWheel(AppState.currentRotation);
};
// Use the fixed luck logo version
centerLogo.src = 'luck_fixed.png?v=' + Date.now();

// ============================================
// Canvas Context
// ============================================
let ctx = elements.wheelCanvas.getContext('2d');

// ============================================
// Initialize Application
// ============================================
function init() {
    // Force scroll to top on reload
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    loadFromStorage();
    setupEventListeners();
    render();
    updateTransparencyCounters();

    // SESSION-BASED SPLASH SCREEN LOGIC
    // Show splash screen only once per session (browser tab life).
    // If user refreshes (F5), sessionStorage persists -> Skip Splash.
    // If user closes tab and reopens -> sessionStorage clears -> Show Splash.
    const splashSeen = sessionStorage.getItem('ruleta_splash_seen');

    if (splashSeen && elements.splashScreen) {
        // Already seen in this session, hide immediately
        elements.splashScreen.classList.add('hidden');
        elements.splashScreen.style.display = 'none'; // Ensure no flash
        if (elements.startScreen) elements.startScreen.classList.add('animate-in');
        setTimeout(() => elements.splashScreen.remove(), 50);
    } else {
        // First time in session: attempt to force play video if it exists
        if (elements.splashVideo) {
            elements.splashVideo.muted = true; // Browser requirement for autoplay
            elements.splashVideo.play().catch(err => {
                console.warn("Video autoplay attempted but blocked by browser:", err);
            });
        }
    }

    // Start Idle animation if names are present (e.g. on refresh)
    if (AppState.allNames.length > 0) {
        startIdleAnimation();
    }
}

// ============================================
// Update Transparency Counters Display
// ============================================
function updateTransparencyCounters() {
    if (elements.spinCountDisplay) {
        elements.spinCountDisplay.textContent = AppState.totalSpins;
    }
    if (elements.resetCountDisplay) {
        elements.resetCountDisplay.textContent = AppState.totalResets;
    }
}

// ============================================
// Event Listeners
// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Mode Selection
    elements.modeClassroomBtn.addEventListener('click', (e) => {
        if (e.target.closest('.mode-settings')) return;
        handleModeSelect('classroom');
    });
    elements.modeGiveawayBtn.addEventListener('click', (e) => {
        if (e.target.closest('.mode-settings')) return;
        handleModeSelect('giveaway');
    });

    // Classroom Settings
    elements.startClassroomBtn.addEventListener('click', () => startGame('classroom'));

    // Giveaway Settings - Listen to select change
    elements.losersCountSelect.addEventListener('change', (e) => {
        AppState.losersCountTarget = parseInt(e.target.value);
        saveToStorage();
    });

    elements.winnersCountSelect.addEventListener('change', (e) => {
        AppState.winnersCountTarget = parseInt(e.target.value);
        saveToStorage();
    });

    elements.startGiveawayBtn.addEventListener('click', () => startGame('giveaway'));

    // Main App
    elements.loadNamesBtn.addEventListener('click', () => { SoundManager.init(); handleLoadNames(); });
    elements.spinBtn.addEventListener('click', () => { SoundManager.init(); handleSpin(); });
    elements.shuffleBtn.addEventListener('click', () => { SoundManager.init(); handleShuffle(); });
    elements.resetBtn.addEventListener('click', handleReset);
    elements.exportPdfBtn.addEventListener('click', handleExportPDF);
    elements.continueBtn.addEventListener('click', handleContinue);
    elements.backToInputBtn.addEventListener('click', handleBackToInput);
    elements.goToStartBtn.addEventListener('click', handleGoToStart);

    // Official Mode Toggle
    elements.officialModeToggle.addEventListener('change', handleOfficialModeToggle);
    elements.confirmOfficialModeBtn.addEventListener('click', confirmOfficialMode);
    elements.cancelOfficialModeBtn.addEventListener('click', cancelOfficialMode);
    elements.detailsToggle.addEventListener('click', toggleModalDetails);


    // Splash Screen Interaction
    if (elements.splashStartBtn && elements.splashVideo) {
        elements.splashStartBtn.addEventListener('click', () => {
            // Optimization: No audio init here to prevent lag. Video is already playing (autoplay).
            finishSplash();
        });

        // Listen for when video finishes - removed auto-finish to let it loop or stay until user clicks
        // elements.splashVideo.addEventListener('ended', () => { ... }); 

        function finishSplash() {
            // Mark as seen for this session
            sessionStorage.setItem('ruleta_splash_seen', 'true');

            // Add exit animation class
            elements.splashScreen.classList.add('fade-out');

            // Wait for animation to finish before removing
            setTimeout(() => {
                // Stop video to release resources
                if (elements.splashVideo) {
                    elements.splashVideo.pause();
                    elements.splashVideo.src = ""; // Unload
                    elements.splashVideo.load();
                }

                elements.splashScreen.classList.add('hidden'); // Ensure hidden

                // Trigger premium entry animation for home screen
                if (elements.startScreen) elements.startScreen.classList.add('animate-in');

                // Fully remove from DOM
                if (elements.splashScreen && elements.splashScreen.parentNode) {
                    elements.splashScreen.remove();
                }
            }, 500); // Match CSS transition duration
        }

    }

    // Close winner overlay on click outside
    elements.winnerOverlay.addEventListener('click', (e) => {
        if (e.target === elements.winnerOverlay) {
            handleContinue();
        }
    });



    // Splash Screen Logic

    // Support Modal Logic
    const supportModal = document.getElementById('support-modal');
    const openSupportBtn = document.getElementById('openSupportBtn');
    const closeSupportBtn = document.getElementById('closeSupportBtn');

    if (supportModal && openSupportBtn && closeSupportBtn) {
        openSupportBtn.addEventListener('click', () => {
            supportModal.classList.add('active');
        });

        closeSupportBtn.addEventListener('click', () => {
            supportModal.classList.remove('active');
        });

        // Close on click outside
        supportModal.addEventListener('click', (e) => {
            if (e.target === supportModal) {
                supportModal.classList.remove('active');
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const isStartScreenHidden = elements.startScreen.classList.contains('hidden');
        if (e.code === 'Space' && !AppState.isSpinning && AppState.remainingNames.length > 0 && isStartScreenHidden) {
            e.preventDefault();
            handleSpin();
        }
        if (e.code === 'Escape') {
            if (elements.winnerOverlay.classList.contains('active')) {
                handleContinue();
            }
            if (supportModal && supportModal.classList.contains('active')) {
                supportModal.classList.remove('active');
            }
        }
    });
}

// ============================================
// Internal Logic Functions for Modes
// ============================================
function handleModeSelect(mode) {
    SoundManager.init();

    // UI Update for Cards
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));

    if (mode === 'classroom') {
        elements.modeClassroomBtn.classList.add('active');
        // Now just show the button, don't start immediately
    } else if (mode === 'giveaway') {
        elements.modeGiveawayBtn.classList.add('active');
        // Always ensure selection is visible
        const losersCount = AppState.losersCountTarget || 2;
        const winnersCount = AppState.winnersCountTarget || 0;
        AppState.losersCountTarget = losersCount;
        AppState.winnersCountTarget = winnersCount;
        elements.losersCountSelect.value = losersCount.toString();
        elements.winnersCountSelect.value = winnersCount.toString();
    }
}

function startGame(mode) {
    AppState.gameMode = mode;

    // Hide Start Screen
    elements.startScreen.classList.add('hidden');

    // Reset scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset internal state just in case
    AppState.allNames = [];
    AppState.remainingNames = [];
    AppState.selectedOrder = [];
    AppState.losersList = [];

    saveToStorage();
    render();
}

function handleGoToStart() {
    // Reset mode and current game progress but KEEP current input names if any
    AppState.gameMode = null;
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;
    AppState.isSpinning = false; // This will trigger interruption in animateWheel

    // Clear any active confetti
    if (elements.confettiContainer) {
        elements.confettiContainer.innerHTML = '';
    }

    // We keep AppState.allNames so the input field doesn't clear if they return from a game
    AppState.remainingNames = [...AppState.allNames];

    saveToStorage();
    render();

    // Feedback
    showToast('Volviendo al inicio', 'info');
}


// ============================================
// LocalStorage Functions
// ============================================
function saveToStorage() {
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
        // Persist Official Mode
        localStorage.setItem(STORAGE_KEYS.OFFICIAL_MODE, JSON.stringify(AppState.officialMode));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

function loadFromStorage() {
    try {
        const parseSafely = (key, defaultVal) => {
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
        if (totalSpins) AppState.totalSpins = parseInt(totalSpins);
        if (totalResets) AppState.totalResets = parseInt(totalResets);
        if (officialMode !== null) AppState.officialMode = officialMode;

        // Sync Official Mode UI
        if (elements.officialModeToggle && AppState.officialMode) {
            elements.officialModeToggle.checked = true;
            elements.transparencySection.classList.remove('hidden');
            elements.exportPdfBtn.classList.remove('hidden');
        }

        // SYNC UI WITH LOADED STATE
        if (elements.losersCountSelect) {
            // Check if key existed to distinguish between "saved 0" and "default 0"
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
        // Do NOT clear storage here to avoid data loss on partial failures
    }
}

function clearStorage() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

// ============================================
// Event Handlers
// ============================================
function handleLoadNames() {
    const input = elements.namesInput.value.trim();
    if (!input) {
        showToast('Por favor, ingresa al menos un nombre', 'error');
        return;
    }

    // Parse names (one per line, remove empty lines and duplicates)
    const names = [...new Set(
        input.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0)
    )];

    if (names.length < 2) {
        showToast('Por favor, ingresa al menos 2 nombres diferentes', 'error');
        return;
    }

    // Initialize state
    AppState.allNames = [...names];
    AppState.remainingNames = [...names];
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;

    saveToStorage();
    render();

    // START IDLE
    startIdleAnimation();

    showToast(`¡${names.length} participantes cargados!`, 'success');
}

function handleSpin() {
    if (AppState.isSpinning || AppState.remainingNames.length === 0) return;

    // STOP IDLE before spinning
    stopIdleAnimation();

    // Increment spin counter
    AppState.totalSpins++;
    updateTransparencyCounters();

    AppState.isSpinning = true;
    elements.spinBtn.disabled = true;
    elements.shuffleBtn.disabled = true;
    elements.wheelCanvas.classList.add('spinning');

    const numSegments = AppState.remainingNames.length;
    const segmentAngle = 360 / numSegments;

    // Generate a random final rotation (FASTER: 20-30 full spins)
    const fullSpins = 20 + Math.random() * 10;
    const randomAngle = Math.random() * 360;

    // Hide Start Screen
    elements.startScreen.classList.add('hidden');

    // Reset scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset internal state just in case
    AppState.allNames = [];
    AppState.remainingNames = [];
    AppState.selectedOrder = [];
    AppState.losersList = [];

    saveToStorage();
    render();
}

function handleGoToStart() {
    // Reset mode and current game progress but KEEP current input names if any
    AppState.gameMode = null;
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;
    AppState.isSpinning = false; // This will trigger interruption in animateWheel

    // Clear any active confetti
    if (elements.confettiContainer) {
        elements.confettiContainer.innerHTML = '';
    }

    // We keep AppState.allNames so the input field doesn't clear if they return from a game
    AppState.remainingNames = [...AppState.allNames];

    saveToStorage();
    render();

    // Feedback
    showToast('Volviendo al inicio', 'info');
}


// ============================================
// LocalStorage Functions
// ============================================
function saveToStorage() {
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
        // Persist Official Mode
        localStorage.setItem(STORAGE_KEYS.OFFICIAL_MODE, JSON.stringify(AppState.officialMode));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

function loadFromStorage() {
    try {
        const parseSafely = (key, defaultVal) => {
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
        if (totalSpins) AppState.totalSpins = parseInt(totalSpins);
        if (totalResets) AppState.totalResets = parseInt(totalResets);
        if (officialMode !== null) AppState.officialMode = officialMode;

        // Sync Official Mode UI
        if (elements.officialModeToggle && AppState.officialMode) {
            elements.officialModeToggle.checked = true;
            elements.transparencySection.classList.remove('hidden');
            elements.exportPdfBtn.classList.remove('hidden');
        }

        // SYNC UI WITH LOADED STATE
        if (elements.losersCountSelect) {
            // Check if key existed to distinguish between "saved 0" and "default 0"
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
        // Do NOT clear storage here to avoid data loss on partial failures
    }
}

function clearStorage() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

// ============================================
// Event Handlers
// ============================================
function handleLoadNames() {
    const input = elements.namesInput.value.trim();
    if (!input) {
        showToast('Por favor, ingresa al menos un nombre', 'error');
        return;
    }

    // Parse names (one per line, remove empty lines and duplicates)
    const names = [...new Set(
        input.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0)
    )];

    if (names.length < 2) {
        showToast('Por favor, ingresa al menos 2 nombres diferentes', 'error');
        return;
    }

    // Initialize state
    AppState.allNames = [...names];
    AppState.remainingNames = [...names];
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;

    saveToStorage();
    render();

    // START IDLE
    startIdleAnimation();

    showToast(`¡${names.length} participantes cargados!`, 'success');
}

function handleSpin() {
    if (AppState.isSpinning || AppState.remainingNames.length === 0) return;

    // STOP IDLE before spinning
    stopIdleAnimation();

    // Increment spin counter
    AppState.totalSpins++;
    updateTransparencyCounters();

    AppState.isSpinning = true;
    elements.spinBtn.disabled = true;
    elements.shuffleBtn.disabled = true;
    elements.wheelCanvas.classList.add('spinning');

    const numSegments = AppState.remainingNames.length;
    const segmentAngle = 360 / numSegments;

    // Generate a random final rotation (FASTER: 20-30 full spins)
    const fullSpins = 20 + Math.random() * 10;
    const randomAngle = Math.random() * 360;
    const targetRotation = AppState.currentRotation + (fullSpins * 360) + randomAngle;

    // Set CSS variable for animation sync (fixed duration)
    elements.wheelCanvas.style.setProperty('--spin-duration', '10s');

    // Start Visual Effects

    // Normalize the final rotation to 0-360 range
    const normalizedRotation = targetRotation % 360;

    // Calculate which segment is at the TOP (where the pointer is)
    const pointerAngle = (360 - normalizedRotation + 360) % 360;
    const winningIndex = Math.floor(pointerAngle / segmentAngle) % numSegments;

    // Animate the wheel
    animateWheel(AppState.currentRotation, targetRotation, 10000, () => {
        AppState.currentRotation = normalizedRotation;
        AppState.isSpinning = false;
        if (AppState.isSpinning) { // Check spinning state to avoid double cleanup
            elements.wheelCanvas.classList.remove('spinning');
        }

        // Get the winning name based on where the pointer lands
        const selectedName = AppState.remainingNames[winningIndex];

        // Update State (Remove from remaining)
        AppState.remainingNames.splice(winningIndex, 1);

        // BRANCH LOGIC BASED ON MODE
        if (AppState.gameMode === 'giveaway') {
            handleGiveawayResult(selectedName);
        } else {
            // Classroom Mode (Standard)
            AppState.selectedOrder.push(selectedName);
            showWinnerResult(selectedName, AppState.selectedOrder.length, 'winner');
        }

        saveToStorage();
    });
}

function handleGiveawayResult(name) {
    // Check if we are still finding Losers
    const currentLosers = AppState.losersList.length;
    const maxLosers = AppState.losersCountTarget;

    if (currentLosers < maxLosers) {
        // IT'S A LOSER!
        AppState.losersList.push(name);
        showWinnerResult(name, AppState.losersList.length, 'loser');
    } else {
        // IT'S A WINNER!
        AppState.selectedOrder.push(name);

        // Check if we reached the winners limit
        const maxWinners = AppState.winnersCountTarget;
        const currentWinners = AppState.selectedOrder.length;
        const isLastWinner = maxWinners > 0 && currentWinners >= maxWinners;

        showWinnerResult(name, currentWinners, 'winner', isLastWinner);
    }
}

function showWinnerResult(name, position, type, isLastWinner = false) {
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

function handleShuffle() {
    if (!AppState.remainingNames || AppState.remainingNames.length < 2) return;

    stopIdleAnimation(); // Stop to shuffle

    SoundManager.playShuffle();

    // Fisher-Yates shuffle
    for (let i = AppState.remainingNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [AppState.remainingNames[i], AppState.remainingNames[j]] = [AppState.remainingNames[j], AppState.remainingNames[i]];
    }

    // Redraw
    drawWheel(AppState.currentRotation);

    startIdleAnimation(); // Resume idle

    showToast('¡Nombres mezclados!', 'success');
}

function handleReset() {
    // Increment reset counter
    AppState.totalResets++;

    // Keep allNames and gameMode, reset everything else
    AppState.remainingNames = [...AppState.allNames];
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;
    AppState.isSpinning = false;

    // Clear any active confetti
    if (elements.confettiContainer) {
        elements.confettiContainer.innerHTML = '';
    }

    // Close winner overlay if open
    elements.winnerOverlay.classList.remove('active');

    saveToStorage();
    render();

    // START IDLE
    startIdleAnimation();

    updateTransparencyCounters();

    showToast('¡Juego reiniciado! Los nombres se mantienen.', 'success');
}

function handleBackToInput() {
    // Stop Idle
    stopIdleAnimation();

    // Store previous names to pre-fill textarea
    const previousNames = [...AppState.allNames];

    // Reset game state but keep names for textarea
    AppState.allNames = [];
    AppState.remainingNames = [];
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;
    AppState.isSpinning = false;

    // Pre-fill textarea with previous names so user can modify/add
    if (previousNames.length > 0) {
        elements.namesInput.value = previousNames.join('\n');
    }

    saveToStorage();
    render();
    elements.namesInput.focus();

    if (previousNames.length > 0) {
        showToast('Nombres anteriores restaurados. Puedes modificarlos o añadir más.', 'info');
    }
}

function handleOfficialModeToggle(e) {
    // SECURITY: Prevent toggling if game is active or has results
    if (AppState.isSpinning || AppState.selectedOrder.length > 0 || AppState.losersList.length > 0) {
        e.preventDefault();
        // Revert visual state since we prevented the action
        elements.officialModeToggle.checked = AppState.officialMode;
        showToast('⚠ Debes REINICIAR el juego para cambiar de modo.', 'error');
        return;
    }

    // If trying to activate, show confirmation modal first
    if (elements.officialModeToggle.checked) {
        // Uncheck immediately - will be checked on confirmation
        elements.officialModeToggle.checked = false;
        showOfficialModeModal();
    } else {
        // Deactivating - no confirmation needed
        AppState.officialMode = false;
        elements.transparencySection.classList.add('hidden');
        elements.exportPdfBtn.classList.add('hidden');

        saveToStorage();
    }
}

function showOfficialModeModal() {
    elements.officialModeModal.classList.add('active');
}

function hideOfficialModeModal() {
    elements.officialModeModal.classList.remove('active');
}

function confirmOfficialMode() {
    AppState.officialMode = true;
    elements.officialModeToggle.checked = true;

    // Reset counters for official session to ensure a clean start
    AppState.totalSpins = 0;
    AppState.totalResets = 0;
    updateTransparencyCounters();

    // Activate official mode UI
    elements.transparencySection.classList.remove('hidden');
    elements.exportPdfBtn.classList.remove('hidden');


    hideOfficialModeModal();
    saveToStorage();
    showToast('Modo Oficial activado. Sorteo transparente habilitado.', 'success');
}

function cancelOfficialMode() {
    elements.officialModeToggle.checked = false;
    hideOfficialModeModal();
}

function toggleModalDetails() {
    const isExpanded = elements.detailsToggle.classList.toggle('expanded');
    elements.modalDetailsList.classList.toggle('hidden', !isExpanded);

    // Update button text
    elements.detailsToggle.innerHTML = isExpanded
        ? '<svg class="icon icon--xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg> Ocultar detalles'
        : '<svg class="icon icon--xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg> Ver detalles';
}



function handleExportPDF() {
    if (AppState.selectedOrder.length === 0 && AppState.losersList.length === 0) {
        showToast('No hay resultados para exportar', 'error');
        return;
    }

    if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        showToast('Generador de PDF no cargado. Recarga la página.', 'error');
        return;
    }

    // Feedback to user
    const originalText = elements.exportPdfBtn.innerHTML;
    elements.exportPdfBtn.disabled = true;
    elements.exportPdfBtn.innerHTML = '<span class="loading-spinner"></span> Generando PDF...';

    // 1. Create the HTML structure for the PDF (Professional Report)
    const container = document.createElement('div');
    container.id = 'pdf-export-container';
    document.body.appendChild(container);

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES');
    const modeTitle = AppState.gameMode === 'giveaway' ? 'Informe de Sorteo General' : 'Informe Oficial de Participación';

    // Header
    let htmlContent = `
        <div class="pdf-header">
            <div class="pdf-header-left">
                <div class="pdf-title">Ruleta de la Mala Suerte</div>
                <div class="pdf-subtitle">${modeTitle}</div>
            </div>
            <div class="pdf-header-right">
                 <div class="pdf-meta-date">Fecha de Emisión</div>
                 <div style="font-weight: bold;">${dateStr}</div>
                 <div style="font-size: 11px; color: #777;">Hora: ${timeStr}</div>
            </div>
        </div>
        
        <div class="pdf-stats-grid">
            <div class="pdf-stat-item">
                <div class="pdf-stat-label">Total Giros</div>
                <div class="pdf-stat-value">${AppState.totalSpins}</div>
            </div>
            <div class="pdf-stat-item">
                <div class="pdf-stat-label">Reinicios</div>
                <div class="pdf-stat-value">${AppState.totalResets}</div>
            </div>
            <div class="pdf-stat-item">
                <div class="pdf-stat-label">Participantes</div>
                <div class="pdf-stat-value">${AppState.allNames.length}</div>
            </div>
        </div>
    `;

    // LOSERS SECTION (Giveaway Mode)
    if (AppState.gameMode === 'giveaway' && AppState.losersList.length > 0) {
        htmlContent += `
        <div class="pdf-section">
            <div class="pdf-section-header">Registro de Eliminaciones</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th class="pdf-col-pos">Orden</th>
                        <th class="pdf-col-name">Participante</th>
                    </tr>
                </thead>
                <tbody>
        `;

        AppState.losersList.forEach((name, index) => {
            htmlContent += `
                <tr>
                    <td class="pdf-col-pos">${index + 1}</td>
                    <td class="pdf-col-name">${name}</td>
                </tr>`;
        });

        htmlContent += `</tbody></table></div>`;
    }

    // WINNERS SECTION
    if (AppState.selectedOrder.length > 0) {
        const sectionTitle = AppState.gameMode === 'giveaway' ? 'Participantes Restantes (Ganadores)' : 'Orden de Selección Oficial';
        htmlContent += `
        <div class="pdf-section">
            <div class="pdf-section-header">${sectionTitle}</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th class="pdf-col-pos">#</th>
                        <th class="pdf-col-name">Nombre del Participante</th>
                    </tr>
                </thead>
                <tbody>
        `;

        AppState.selectedOrder.forEach((name, index) => {
            htmlContent += `
                <tr>
                    <td class="pdf-col-pos">${index + 1}</td>
                    <td class="pdf-col-name">${name}</td>
                </tr>`;
        });

        htmlContent += `</tbody></table></div>`;
    }

    htmlContent += `
        <div class="pdf-footer">
            <div>Plataforma: Ruleta de la Mala Suerte</div>
            <div>ID de Sesión: ${Date.now().toString(36).toUpperCase()}</div>
            <div>Página 1 de 1</div>
        </div>
    `;

    container.innerHTML = htmlContent;

    // 2. Use html2canvas to render it
    window.html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;

        // A4 Paper Size
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`Reporte_Oficial_${Date.now()}.pdf`);

        // Cleanup
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
        elements.exportPdfBtn.disabled = false;
        elements.exportPdfBtn.innerHTML = originalText;
        showToast('Informe oficial generado correctamente', 'success');

    }).catch(err => {
        console.error('PDF Error:', err);
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
        elements.exportPdfBtn.disabled = false;
        elements.exportPdfBtn.innerHTML = originalText;
        showToast('Error al generar el informe', 'error');
    });
}


function handleContinue() {
    elements.winnerOverlay.classList.remove('active');
    render();

    // Check if we already reached the winners limit (giveaway mode)
    if (AppState.gameMode === 'giveaway') {
        const maxWinners = AppState.winnersCountTarget;
        const currentWinners = AppState.selectedOrder.length;

        if (maxWinners > 0 && currentWinners >= maxWinners) {
            elements.spinBtn.disabled = true;
            elements.shuffleBtn.disabled = true;
            elements.remainingText.textContent = "¡Sorteo completado!";
            return;
        }
    }

    if (AppState.remainingNames.length > 0) {
        elements.spinBtn.disabled = false;
        elements.shuffleBtn.disabled = false;
        elements.spinBtn.focus();

        // RESUME IDLE
        startIdleAnimation();
    }
}

// ============================================
// Wheel Drawing Functions
// ============================================
function drawWheel(rotation = 0) {
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
    const auraRotation = time * 0.5; // Slow rotation for the aura

    // 1. Rotating Aura (Fluidity)
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
    ctx.fillStyle = '#ffffff'; // Solid white for best contrast
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
    ctx.shadowBlur = 0; // Reset shadow
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow
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
    if (numSegments <= 4) return 18;
    if (numSegments <= 8) return 16;
    if (numSegments <= 12) return 14;
    if (numSegments <= 16) return 12;
    return 10;
}

// ============================================
// Animation Functions
// ============================================
function animateWheel(startRotation, endRotation, duration, callback) {
    const startTime = performance.now();
    const segmentAngle = 360 / AppState.remainingNames.length;
    let lastSegmentIndex = Math.floor(startRotation / segmentAngle);

    function animate(currentTime) {
        // Interruption check: if isSpinning was set to false manually (e.g. by handleGoToStart)
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

            // Visual Animation: Trigger reflow to restart animation
            elements.wheelPointer.classList.remove('tick');
            void elements.wheelPointer.offsetWidth; // Force reflow
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

function startIdleAnimation() {
    if (AppState.isIdling || AppState.isSpinning || AppState.remainingNames.length === 0) return;

    AppState.isIdling = true;

    function idleLoop() {
        if (!AppState.isIdling) return;

        // Slow rotation
        AppState.currentRotation += 0.2; // Adjust speed here
        drawWheel(AppState.currentRotation);

        AppState.idleId = requestAnimationFrame(idleLoop);
    }

    AppState.idleId = requestAnimationFrame(idleLoop);
}

function stopIdleAnimation() {
    AppState.isIdling = false;
    if (AppState.idleId) {
        cancelAnimationFrame(AppState.idleId);
        AppState.idleId = null;
    }
}

function autoAddLastParticipant() {
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

function createConfetti() {
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

// ============================================
// UI Update Functions
// ============================================
function render() {
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

    // Check for Giveaway Completion (Limit Reached)
    let isGiveawayComplete = false;
    if (AppState.gameMode === 'giveaway') {
        const maxWinners = AppState.winnersCountTarget;
        const currentWinners = AppState.selectedOrder.length;
        if (maxWinners > 0 && currentWinners >= maxWinners) {
            isGiveawayComplete = true;
        }
    }

    // Auto-add last participant if only 1 remains AND we are not mid-spin
    // BUT only if the specific Giveaway limit hasn't been reached yet
    if (AppState.remainingNames.length === 1 && !AppState.isSpinning && !isGiveawayComplete) {
        autoAddLastParticipant();
        return; // Stop here, auto-add will trigger another render
    }

    // Update spin button and shuffle button
    // Disable if no remaining, spinning, OR if giveaway is complete
    const canSpin = hasRemaining && !AppState.isSpinning && !isGiveawayComplete;
    elements.spinBtn.disabled = !canSpin;

    // Shuffle needs at least 2 people
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
    drawWheel(AppState.currentRotation);

    // Update results table
    updateResultsTable();
}

function updateResultsTable() {
    const hasSelected = AppState.selectedOrder.length > 0;
    const hasLosers = AppState.losersList.length > 0;
    const showResults = hasSelected || hasLosers;

    // Toggle main container empty state
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

    // Build Winners/Standard table rows
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
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// Initialize on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', init);

// Remove Page Loader
window.addEventListener('load', () => {
    const loader = document.getElementById('page-loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.remove(); // Optional: remove from DOM
            }, 500);
        }, 500); // Minimum view time
    }
});
