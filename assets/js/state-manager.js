// State management for System 7 interface
const StateManager = {
    STATE_KEY: 'system7State',
    AUTO_SAVE_INTERVAL: 5000,

    saveState() {
        try {
            // Capture all open windows
            const windows = Array.from(document.querySelectorAll('.window')).map(window => ({
                title: window.querySelector('.window-title').textContent,
                content: window.querySelector('.window-content').innerHTML,
                type: window.dataset.windowType || (window.classList.contains('folder-window') ? 'folder' : 'document'),
                position: {
                    left: window.style.left,
                    top: window.style.top,
                    width: window.style.width,
                    height: window.style.height,
                    zIndex: window.style.zIndex
                }
            }));

            // Capture desktop state
            const desktop = {
                background: document.getElementById('desktop').style.background,
                backgroundSize: document.getElementById('desktop').style.backgroundSize
            };

            // Capture menu state
            const menuState = {
                activeApp: document.querySelector('.app-menu').textContent,
                soundEnabled: localStorage.getItem('soundEnabled') !== 'false'
            };

            const state = {
                windows,
                desktop,
                menuState,
                lastSaved: new Date().toISOString()
            };

            localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving state:', error);
        }
    },

    loadState() {
        try {
            const savedState = localStorage.getItem(this.STATE_KEY);
            if (!savedState) return;

            const state = JSON.parse(savedState);

            // Restore desktop background
            const desktop = document.getElementById('desktop');
            if (desktop) {
                desktop.style.background = state.desktop.background;
                desktop.style.backgroundSize = state.desktop.backgroundSize;

                // Update menu checkmark
                const backgroundName = this.getBackgroundNameFromStyle(state.desktop.background);
                if (backgroundName) {
                    this.updateBackgroundMenuCheckmark(backgroundName);
                }
            }

            // Restore menu state
            if (state.menuState) {
                // Restore sound state
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.setVolume(state.menuState.soundEnabled ? 0.5 : 0);
                }
                this.updateSoundMenuCheck(state.menuState.soundEnabled);
            }

            // Restore windows
            state.windows.forEach(windowState => {
                Window.restore(windowState);
            });

            // Update application menu after windows are restored
            if (typeof MenuManager !== 'undefined') {
                MenuManager.updateApplicationMenu();
            }
        } catch (error) {
            console.error('Error loading state:', error);
            // If there's an error loading state, remove the corrupted state
            localStorage.removeItem(this.STATE_KEY);
        }
    },

    getBackgroundNameFromStyle(backgroundStyle) {
        if (!backgroundStyle) return null;
        const matches = backgroundStyle.match(/backgrounds\/(.*?)\./);
        return matches ? matches[1] : null;
    },

    updateBackgroundMenuCheckmark(backgroundName) {
        const viewMenuItems = document.querySelectorAll('#view-menu .dropdown-item');
        viewMenuItems.forEach(item => {
            item.textContent = item.textContent.replace('✔ ', '');
            if (item.textContent.includes(backgroundName)) {
                item.textContent = '✔ ' + item.textContent;
            }
        });
    },

    updateSoundMenuCheck(enabled) {
        const menuItem = document.querySelector('#apple-menu .dropdown-item:contains("Sound")');
        if (menuItem) {
            menuItem.textContent = `Sound ${enabled ? '✓' : ''}`;
        }
    },

    startAutoSave() {
        // Clear any existing auto-save interval
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // Start new auto-save interval
        this.autoSaveInterval = setInterval(() => this.saveState(), this.AUTO_SAVE_INTERVAL);

        // Save state before page unload
        window.addEventListener('beforeunload', () => this.saveState());

        // Save state when windows are closed
        document.addEventListener('click', (e) => {
            if (e.target.matches('.window-close')) {
                setTimeout(() => this.saveState(), 100);
            }
        });

        // Save state when background is changed
        const viewMenuItems = document.querySelectorAll('#view-menu .dropdown-item');
        viewMenuItems.forEach(item => {
            item.addEventListener('click', () => {
                setTimeout(() => this.saveState(), 100);
            });
        });
    },

    clearState() {
        localStorage.removeItem(this.STATE_KEY);
    }
};

// Initialize state management when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    StateManager.loadState();
    StateManager.startAutoSave();
});