// Initialize the System7 interface
document.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
    initializeEventListeners();
    checkUrlParameters();
});

function initializeSystem() {
    initializeClock();
    initializeDesktop();
    if (typeof MenuManager !== 'undefined') {
        MenuManager.init();
    }
}

function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    if (page) {
        openPage(page);
    }
}

// Clock functionality
function initializeClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('clock').textContent = `${hours}:${minutes}`;
}

// Background Management
function setBackground(image) {
    const desktop = document.getElementById('desktop');
    const viewMenuItems = document.querySelectorAll('#view-menu .dropdown-item');
    viewMenuItems.forEach(item => {
        item.textContent = item.textContent.replace('✔ ', '');
    });

    const backgrounds = {
        MacOS: { url: 'MacOS.jpg', repeat: 'no-repeat center center fixed', size: 'cover' },
        cats: { url: 'cats.png', repeat: 'repeat', size: 'auto' },
        circuits: { url: 'circuits.png', repeat: 'repeat', size: 'auto' },
        grass: { url: 'grass.png', repeat: 'repeat', size: 'auto' },
        pebbles: { url: 'pebbles.png', repeat: 'repeat', size: 'auto' },
        plaid: { url: 'plaid.png', repeat: 'repeat', size: 'auto' }
    };

    const bg = backgrounds[image];
    if (bg) {
        desktop.style.background = `url('/assets/images/backgrounds/${bg.url}') ${bg.repeat}`;
        desktop.style.backgroundSize = bg.size;
        document.querySelector(`#view-menu .dropdown-item:contains('${image}')`).textContent = `✔ ${image}`;
        
        // Save state after background change
        if (typeof StateManager !== 'undefined') {
            StateManager.saveState();
        }
    }
}

// About Window
function showAboutWindow() {
    const content = `
        <div style="display: flex; align-items: center;">
            <img src="/assets/images/moof.png" alt="Moof" style="width: 64px; height: 64px; margin-right: 20px;">
            <div>
                <p>This is my design portfolio, built in Jekyll and a bit of CSS.</p>
                <p>While I have experience in classic Mac OS programming, CSS is far more frustrating than Metrowerks Codewarrior and ResEdit.</p>
            </div>
        </div>
    `;
    
    const aboutWindow = new Window(
        'About This Website', 
        content, 
        'about', 
        window.innerWidth / 2 - 200, 
        window.innerHeight / 2 - 150
    );
    
    // Configure the about window
    aboutWindow.element.style.resize = 'none';
    aboutWindow.element.style.width = '400px';
    aboutWindow.element.style.height = '200px';
    aboutWindow.element.querySelector('.window-resizer')?.remove();
    aboutWindow.element.querySelector('.window-content').style.overflow = 'hidden';

    // Play sound if available
    if (typeof SoundManager !== 'undefined') {
        SoundManager.play('click');
    }
}

// Sound Management
function toggleSound() {
    const enabled = localStorage.getItem('soundEnabled') !== 'false';
    localStorage.setItem('soundEnabled', !enabled);
    
    if (typeof SoundManager !== 'undefined') {
        SoundManager.setVolume(!enabled ? 0.5 : 0);
    }
    
    // Update menu checkmark
    if (typeof StateManager !== 'undefined') {
        StateManager.updateSoundMenuCheck(!enabled);
    }
}

// Theme Toggle
function toggleTheme() {
    window.location.href = '/';
}

// Initialize desktop and event listeners
function initializeEventListeners() {
    // Global click handler for closing menus and handling desktop clicks
    document.addEventListener('mousedown', (e) => {
        // Handle menu closing
        if (!e.target.closest('.menubar-item') && !e.target.closest('.dropdown-menu')) {
            if (typeof MenuManager !== 'undefined') {
                MenuManager.closeAllMenus();
            }
        }

        // Handle clicks on the desktop (not on windows or menus)
        if (e.target.id === 'desktop') {
            e.preventDefault();
            e.stopPropagation();

            // Deactivate all windows
            document.querySelectorAll('.window').forEach(win => {
                win.classList.remove('active');
                win.querySelector('.window-titlebar').style.background = 
                    'var(--system7-titlebar-inactive)';
            });

            // Update application name and menu with slight delay to ensure DOM updates
            setTimeout(() => {
                const appMenu = document.querySelector('.app-menu');
                if (appMenu) {
                    appMenu.querySelector('.app-icon').src = '/assets/images/finder-icon.png';
                    appMenu.querySelector('.app-name').textContent = 'Finder';
                }

                // Switch to Finder in menu manager
                if (typeof MenuManager !== 'undefined') {
                    MenuManager.switchToProgram('Finder');
                }
            }, 10);
        }
    });

    // Global key handlers
    document.addEventListener('keydown', (e) => {
        // Add key shortcuts here if needed
        if (e.key === 'Escape') {
            if (typeof MenuManager !== 'undefined') {
                MenuManager.closeAllMenus();
            }
        }
    });

    // Window focus handling
    document.addEventListener('mousedown', (e) => {
        const window = e.target.closest('.window');
        if (window) {
            Array.from(document.querySelectorAll('.window')).forEach(w => {
                if (w !== window) {
                    w.classList.remove('active');
                }
            });
            window.classList.add('active');
        }
    });
}