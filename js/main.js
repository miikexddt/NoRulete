/**
 * NoRulete - Main Entry Point
 * Application initialization, event listeners, and all handler functions.
 */

import { AppState } from './state.js';
import { saveToStorage, loadFromStorage } from './storage.js';
import { SoundManager } from './audio.js';
import { drawWheel, animateWheel, startIdleAnimation, stopIdleAnimation, initCanvas } from './wheel.js';
import {
    elements,
    updateTransparencyCounters,
    showWinnerResult,
    render,
    showToast,
    setDrawWheelFn,
    setAutoAddCallback,
} from './ui.js';

// ============================================
// Wire up dependencies (avoid circular imports)
// ============================================
setDrawWheelFn(drawWheel);
setAutoAddCallback(() => autoAddLastParticipant());

// ============================================
// Initialize Application
// ============================================
function init() {
    // Force scroll to top on reload
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Initialize canvas context
    initCanvas();

    loadFromStorage();
    setupEventListeners();
    render();
    updateTransparencyCounters();

    // SESSION-BASED SPLASH SCREEN LOGIC
    const splashSeen = sessionStorage.getItem('ruleta_splash_seen');

    if (splashSeen && elements.splashScreen) {
        elements.splashScreen.classList.add('hidden');
        elements.splashScreen.style.display = 'none';
        if (elements.startScreen) elements.startScreen.classList.add('animate-in');
        setTimeout(() => elements.splashScreen.remove(), 50);
    } else {
        if (elements.splashVideo) {
            elements.splashVideo.muted = true;
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

    // Giveaway Settings
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

    // Focus / Projector Mode
    const focusModeBtn = document.getElementById('focusModeBtn');
    if (focusModeBtn) {
        focusModeBtn.addEventListener('click', toggleFocusMode);
    }

    // Official Mode Toggle
    elements.officialModeToggle.addEventListener('change', handleOfficialModeToggle);
    elements.confirmOfficialModeBtn.addEventListener('click', confirmOfficialMode);
    elements.cancelOfficialModeBtn.addEventListener('click', cancelOfficialMode);
    elements.detailsToggle.addEventListener('click', toggleModalDetails);

    // Splash Screen Interaction
    if (elements.splashStartBtn && elements.splashVideo) {
        elements.splashStartBtn.addEventListener('click', () => {
            finishSplash();
        });
    }

    // Close winner overlay on click outside
    elements.winnerOverlay.addEventListener('click', (e) => {
        if (e.target === elements.winnerOverlay) {
            handleContinue();
        }
    });

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
            // Exit focus mode with Escape
            const container = document.querySelector('.app-container');
            if (container.classList.contains('focus-mode')) {
                toggleFocusMode();
            }
        }
        // 'F' key for focus mode
        if (e.code === 'KeyF' && !e.ctrlKey && !e.altKey && !e.metaKey && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
            toggleFocusMode();
        }
    });
}

// ============================================
// Splash Screen
// ============================================
function finishSplash() {
    sessionStorage.setItem('ruleta_splash_seen', 'true');

    elements.splashScreen.classList.add('fade-out');

    setTimeout(() => {
        if (elements.splashVideo) {
            elements.splashVideo.pause();
            elements.splashVideo.src = "";
            elements.splashVideo.load();
        }

        elements.splashScreen.classList.add('hidden');

        if (elements.startScreen) elements.startScreen.classList.add('animate-in');

        if (elements.splashScreen && elements.splashScreen.parentNode) {
            elements.splashScreen.remove();
        }
    }, 500);
}

// ============================================
// Mode Selection & Game Start
// ============================================
function handleModeSelect(mode) {
    SoundManager.init();

    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));

    if (mode === 'classroom') {
        elements.modeClassroomBtn.classList.add('active');
    } else if (mode === 'giveaway') {
        elements.modeGiveawayBtn.classList.add('active');
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

    elements.startScreen.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    AppState.allNames = [];
    AppState.remainingNames = [];
    AppState.selectedOrder = [];
    AppState.losersList = [];

    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        if (mode === 'giveaway') {
            tableContainer.classList.add('split-view');
        } else {
            tableContainer.classList.remove('split-view');
        }
    }

    saveToStorage();
    render();
}

function handleGoToStart() {
    AppState.gameMode = null;
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;
    AppState.isSpinning = false;

    if (elements.confettiContainer) {
        elements.confettiContainer.innerHTML = '';
    }

    AppState.remainingNames = [...AppState.allNames];

    saveToStorage();
    render();

    showToast('Volviendo al inicio', 'info');
}

// ============================================
// Core Event Handlers
// ============================================
function handleLoadNames() {
    const input = elements.namesInput.value.trim();
    if (!input) {
        showToast('Por favor, ingresa al menos un nombre', 'error');
        return;
    }

    const names = [...new Set(
        input.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0)
    )];

    if (names.length < 2) {
        showToast('Por favor, ingresa al menos 2 nombres diferentes', 'error');
        return;
    }

    AppState.allNames = [...names];
    AppState.remainingNames = [...names];
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;

    saveToStorage();
    render();

    startIdleAnimation();

    showToast(`¡${names.length} participantes cargados!`, 'success');
}

function handleSpin() {
    if (AppState.isSpinning || AppState.remainingNames.length === 0) return;

    stopIdleAnimation();

    AppState.totalSpins++;
    updateTransparencyCounters();

    AppState.isSpinning = true;
    elements.spinBtn.disabled = true;
    elements.shuffleBtn.disabled = true;
    elements.wheelCanvas.classList.add('spinning');

    const numSegments = AppState.remainingNames.length;
    const segmentAngle = 360 / numSegments;

    const fullSpins = 20 + Math.random() * 10;
    const randomAngle = Math.random() * 360;
    const targetRotation = AppState.currentRotation + (fullSpins * 360) + randomAngle;

    elements.wheelCanvas.style.setProperty('--spin-duration', '10s');

    const normalizedRotation = targetRotation % 360;

    const pointerAngle = (360 - normalizedRotation + 360) % 360;
    const winningIndex = Math.floor(pointerAngle / segmentAngle) % numSegments;

    animateWheel(AppState.currentRotation, targetRotation, 10000, () => {
        AppState.currentRotation = normalizedRotation;
        AppState.isSpinning = false;
        elements.wheelCanvas.classList.remove('spinning');

        const selectedName = AppState.remainingNames[winningIndex];

        AppState.remainingNames.splice(winningIndex, 1);

        if (AppState.gameMode === 'giveaway') {
            handleGiveawayResult(selectedName);
        } else {
            AppState.selectedOrder.push(selectedName);
            showWinnerResult(selectedName, AppState.selectedOrder.length, 'winner');
        }

        saveToStorage();
    });
}

function handleGiveawayResult(name) {
    const currentLosers = AppState.losersList.length;
    const maxLosers = AppState.losersCountTarget;

    if (currentLosers < maxLosers) {
        AppState.losersList.push(name);
        showWinnerResult(name, AppState.losersList.length, 'loser');
    } else {
        AppState.selectedOrder.push(name);

        const maxWinners = AppState.winnersCountTarget;
        const currentWinners = AppState.selectedOrder.length;
        const isLastWinner = maxWinners > 0 && currentWinners >= maxWinners;

        showWinnerResult(name, currentWinners, 'winner', isLastWinner);
    }
}

function handleShuffle() {
    if (!AppState.remainingNames || AppState.remainingNames.length < 2) return;

    stopIdleAnimation();
    SoundManager.playShuffle();

    // Fisher-Yates shuffle
    for (let i = AppState.remainingNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [AppState.remainingNames[i], AppState.remainingNames[j]] = [AppState.remainingNames[j], AppState.remainingNames[i]];
    }

    drawWheel(AppState.currentRotation);
    startIdleAnimation();

    showToast('¡Nombres mezclados!', 'success');
}

function handleReset() {
    AppState.totalResets++;

    AppState.remainingNames = [...AppState.allNames];
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;
    AppState.isSpinning = false;

    if (elements.confettiContainer) {
        elements.confettiContainer.innerHTML = '';
    }

    elements.winnerOverlay.classList.remove('active');

    saveToStorage();
    render();

    startIdleAnimation();
    updateTransparencyCounters();

    showToast('¡Juego reiniciado! Los nombres se mantienen.', 'success');
}

function handleBackToInput() {
    stopIdleAnimation();

    const previousNames = [...AppState.allNames];

    AppState.allNames = [];
    AppState.remainingNames = [];
    AppState.selectedOrder = [];
    AppState.losersList = [];
    AppState.currentRotation = 0;
    AppState.isSpinning = false;

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

function handleContinue() {
    elements.winnerOverlay.classList.remove('active');
    render();

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

        startIdleAnimation();
    }
}

// ============================================
// Auto-Add Last Participant
// ============================================
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

// ============================================
// Official Mode
// ============================================
function handleOfficialModeToggle(e) {
    if (AppState.isSpinning || AppState.selectedOrder.length > 0 || AppState.losersList.length > 0) {
        e.preventDefault();
        elements.officialModeToggle.checked = AppState.officialMode;
        showToast('⚠ Debes REINICIAR el juego para cambiar de modo.', 'error');
        return;
    }

    if (elements.officialModeToggle.checked) {
        elements.officialModeToggle.checked = false;
        showOfficialModeModal();
    } else {
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

    AppState.totalSpins = 0;
    AppState.totalResets = 0;
    updateTransparencyCounters();

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

    elements.detailsToggle.innerHTML = isExpanded
        ? '<svg class="icon icon--xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg> Ocultar detalles'
        : '<svg class="icon icon--xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg> Ver detalles';
}

// ============================================
// Focus / Projector Mode
// ============================================
function toggleFocusMode() {
    const container = document.querySelector('.app-container');
    const focusModeBtn = document.getElementById('focusModeBtn');
    const isActive = container.classList.toggle('focus-mode');

    if (focusModeBtn) {
        focusModeBtn.classList.toggle('active', isActive);
        // Swap icon: expand ↔ shrink
        focusModeBtn.innerHTML = isActive
            ? '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"></path><path d="M20 10h-6V4"></path><path d="M14 10l7-7"></path><path d="M3 21l7-7"></path></svg>'
            : '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>';
    }

    // Redraw wheel at new size
    setTimeout(() => drawWheel(AppState.currentRotation), 50);

    showToast(isActive ? 'Modo Proyector activado (F para alternar, Esc para salir)' : 'Modo normal', 'success');
}

// ============================================
// PDF Export
// ============================================
function handleExportPDF() {
    if (AppState.selectedOrder.length === 0 && AppState.losersList.length === 0) {
        showToast('No hay resultados para exportar', 'error');
        return;
    }

    if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        showToast('Generador de PDF no cargado. Recarga la página.', 'error');
        return;
    }

    const originalText = elements.exportPdfBtn.innerHTML;
    elements.exportPdfBtn.disabled = true;
    elements.exportPdfBtn.innerHTML = '<span class="loading-spinner"></span> Generando PDF...';

    const container = document.createElement('div');
    container.id = 'pdf-export-container';
    document.body.appendChild(container);

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES');
    const modeTitle = AppState.gameMode === 'giveaway' ? 'Informe de Sorteo General' : 'Informe Oficial de Participación';

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

    window.html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;

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

// ============================================
// Initialize on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', init);

// Remove Page Loader
window.addEventListener('load', () => {
    const loader = document.getElementById('page-loader');
    if (!loader) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        const subtext = document.getElementById('loader-subtext');
        if (subtext) {
            subtext.textContent = "Optimizando videos para móvil...";
            subtext.style.display = 'block';
        }

        const videos = document.querySelectorAll('video');
        let loadedVideos = 0;

        const removeLoader = () => {
            setTimeout(() => {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 500);
            }, 1000);
        };

        if (videos.length === 0) {
            removeLoader();
        } else {
            // Max 4 seconds wait on mobile for videos
            const timeout = setTimeout(removeLoader, 4000);

            videos.forEach(v => {
                if (v.readyState >= 3) {
                    loadedVideos++;
                } else {
                    v.addEventListener('canplaythrough', () => {
                        loadedVideos++;
                        if (loadedVideos >= videos.length) {
                            clearTimeout(timeout);
                            removeLoader();
                        }
                    }, { once: true });
                }
            });

            if (loadedVideos >= videos.length) {
                clearTimeout(timeout);
                removeLoader();
            }
        }
    } else {
        // PC Logic: Quick hide
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 500);
        }, 500);
    }
});
