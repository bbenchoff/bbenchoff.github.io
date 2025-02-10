// Menu System Management
const MenuManager = {
    init() {
        this.initializeMenuListeners();
        this.updateApplicationMenu();
        this.addMenuStyles();
    },

    hideProgram(programName) {
        if (!programName || programName === 'Finder') return;
        
        const windows = Array.from(document.querySelectorAll('.window'));
        windows.forEach(window => {
            const title = window.querySelector('.window-title').textContent;
            if (title === programName) {
                window.classList.add('hidden');
                window.style.display = 'none';
            }
        });
        
        this.updateApplicationMenu();
    },

    hideOthers() {
        const activeWindow = this.getActiveWindow();
        if (!activeWindow) return;
        
        const currentProgram = activeWindow.querySelector('.window-title').textContent;
        const windows = Array.from(document.querySelectorAll('.window'));
        
        windows.forEach(window => {
            const title = window.querySelector('.window-title').textContent;
            if (title !== currentProgram && !window.classList.contains('folder-window')) {
                window.classList.add('hidden');
                window.style.display = 'none';
            }
        });
        
        this.updateApplicationMenu();
    },

    showAll() {
        const windows = Array.from(document.querySelectorAll('.window.hidden'));
        windows.forEach(window => {
            window.classList.remove('hidden');
            window.style.display = 'block';
        });
        
        this.updateApplicationMenu();
    },

    initializeMenuListeners() {
        // Menu click handlers
        document.querySelectorAll('.menubar-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const menuName = item.dataset.menu;
                const menu = document.getElementById(menuName + '-menu');
                
                if (menu) {
                    this.closeAllMenus();
                    
                    // Position and show the menu
                    const rect = item.getBoundingClientRect();
                    menu.style.display = 'block';
                    
                    // Special positioning for application menu
                    if (menuName === 'application') {
                        menu.style.right = '10px';  // Align with right margin
                        menu.style.left = 'auto';
                        menu.style.top = `${rect.bottom}px`;
                    } else {
                        menu.style.left = `${rect.left}px`;
                        menu.style.right = 'auto';
                        menu.style.top = `${rect.bottom}px`;
                    }
                    
                    // Play menu sound if available
                    if (typeof SoundManager !== 'undefined') {
                        SoundManager.play('click');
                    }

                    // Stop event propagation
                    e.stopPropagation();
                }
            });
        });

        // Close menus when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.menubar-item') && !e.target.closest('.dropdown-menu')) {
                this.closeAllMenus();
            }
        });

        // Handle menu item clicks
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.addEventListener('mousedown', (e) => {
                const menuItem = e.target.closest('.dropdown-item');
                if (menuItem) {
                    e.stopPropagation();
                    // Close menus after slight delay to allow click handlers to fire
                    setTimeout(() => this.closeAllMenus(), 100);
                }
            });
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllMenus();
            }
        });
    },

    closeAllMenus() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    },

    getOpenPrograms() {
        // Get all open windows (including hidden ones)
        const windows = Array.from(document.querySelectorAll('.window'));
        
        // Create a map to store unique programs
        const programs = new Map();
        
        // Always add Finder
        programs.set('Finder', {
            name: 'Finder',
            icon: 'MacSE.png',
            windows: []
        });
    
        // Add each window's program
        windows.forEach(window => {
            // Skip if it's a folder window or utility window
            if (window.classList.contains('folder-window') || 
                window.querySelector('.window-title').textContent === 'Get Info') {
                return;
            }
            
            const title = window.querySelector('.window-title').textContent;
            
            // Find the program info in filesystem
            const item = findItem(fileSystem, title);
            const icon = item ? item.icon : 'doc-icon.png';
            
            if (!programs.has(title)) {
                programs.set(title, {
                    name: title,
                    icon: icon,
                    windows: [window],
                    hidden: window.classList.contains('hidden')
                });
            } else {
                programs.get(title).windows.push(window);
                // If any window is visible, program is considered visible
                programs.get(title).hidden = programs.get(title).hidden && 
                                           window.classList.contains('hidden');
            }
        });
    
        return Array.from(programs.values());
    },

    updateApplicationMenu() {
        const appMenu = document.querySelector('.app-menu');
        const appIcon = appMenu.querySelector('.app-icon');
        const appName = appMenu.querySelector('.app-name');
        const menu = document.getElementById('application-menu');
        
        // Get all open programs
        const programs = this.getOpenPrograms();
        
        // Get current active program - will be Finder if nothing else is active
        const activeProgram = this.getActiveProgram();
        
        // Update app menu icon and name
        if (activeProgram === 'Finder') {
            appIcon.src = '/assets/images/MacSE.png';
            appName.textContent = 'Finder';
        } else {
            const item = findItem(fileSystem, activeProgram);
            if (item && item.icon) {
                appIcon.src = `/assets/images/${item.icon}`;
            } else {
                appIcon.src = '/assets/images/doc-icon.png';
            }
            appName.textContent = activeProgram;
        }

        // Build menu HTML
        let menuHTML = `
            <div class="dropdown-item ${activeProgram === 'Finder' ? 'disabled' : ''}" 
                onclick="MenuManager.hideProgram('${activeProgram}')">
                Hide ${activeProgram}
            </div>
            <div class="dropdown-item" onclick="MenuManager.hideOthers()">
                Hide Others
            </div>
            <div class="dropdown-item" onclick="MenuManager.showAll()">
                Show All
            </div>
            <div class="dropdown-divider"></div>
        `;

        // Add program list
        programs.forEach(program => {
            menuHTML += `
                <div class="dropdown-item ${program.hidden ? 'hidden-program' : ''}" 
                    onclick="MenuManager.switchToProgram('${program.name}')">
                    <span style="width: 16px; text-align: center;">
                        ${program.name === activeProgram ? '✓' : ''}
                    </span>
                    <img src="/assets/images/${program.icon}" class="menu-icon" width="16" height="16">
                    <span>${program.name}</span>
                </div>
            `;
        });

        menu.innerHTML = menuHTML;
    },

    hideProgram(programName) {
        // We'll implement this later
        console.log('Hide', programName);
    },

    hideOthers() {
        // We'll implement this later
        console.log('Hide Others');
    },

    showAll() {
        // We'll implement this later
        console.log('Show All');
    },

    addMenuStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .dropdown-item {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 2px 10px;
                cursor: default;
                white-space: nowrap;
            }
    
            .dropdown-item.disabled {
                color: #808080;
                cursor: default;
            }
    
            .dropdown-item.hidden-program {
                color: #808080;
            }
    
            .menu-icon {
                width: 16px;
                height: 16px;
                object-fit: contain;
            }
    
            .dropdown-divider {
                height: 1px;
                background: var(--system7-border);
                margin: 2px 0;
            }
    
            .window.hidden {
                display: none;
            }
        `;
        document.head.appendChild(style);
    },

    getActiveWindow() {
        const highestZ = Math.max(
            ...Array.from(document.querySelectorAll('.window'))
                .map(el => parseInt(el.style.zIndex) || 0)
        );
        return document.querySelector(`.window[style*="z-index: ${highestZ}"]`);
    },

    switchToProgram(programName) {
        const windows = Array.from(document.querySelectorAll('.window'));
        const highestZ = this.getHighestZIndex();
        let newZ = highestZ + 1;
        
        // If switching to Finder, deactivate all windows
        if (programName === 'Finder') {
            windows.forEach(window => {
                window.querySelector('.window-titlebar').style.background = 
                    'var(--system7-titlebar-inactive)';
            });
            // Update application name and icon
            const appMenu = document.querySelector('.app-menu');
            appMenu.querySelector('.app-icon').src = '/assets/images/MacSE.png';
            appMenu.querySelector('.app-name').textContent = 'Finder';
        } else {
            // Regular program switching logic
            windows.forEach(window => {
                const title = window.querySelector('.window-title').textContent;
                if (title === programName) {
                    if (window.classList.contains('hidden')) {
                        window.classList.remove('hidden');
                        window.style.visibility = 'visible';
                    }
                    window.style.zIndex = newZ++;
                    window.querySelector('.window-titlebar').style.background = 
                        'var(--system7-titlebar-active)';
                } else {
                    window.querySelector('.window-titlebar').style.background = 
                        'var(--system7-titlebar-inactive)';
                }
            });
        }
        
        this.updateApplicationMenu();
    },

    getHighestZIndex() {
        return Math.max(
            ...Array.from(document.querySelectorAll('.window'))
                .map(el => parseInt(el.style.zIndex) || 0)
        );
    },

    closeActiveWindow() {
        const activeWindow = this.getActiveWindow();
        if (activeWindow) {
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('drop');
            }
            activeWindow.remove();
            this.updateApplicationMenu(); // Update menu to reflect new active window
            if (typeof StateManager !== 'undefined') {
                StateManager.saveState();
            }
        }
    },

    getInfo() {
        const activeWindow = this.getActiveWindow();
        if (!activeWindow) return;

        const title = activeWindow.querySelector('.window-title').textContent;
        const type = activeWindow.classList.contains('folder-window') ? 'Folder' : 'Document';
        
        const content = `
            <div style="padding: 10px">
                <p><strong>Name:</strong> ${title}</p>
                <p><strong>Type:</strong> ${type}</p>
                <p><strong>Created:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
        `;

        new Window('Get Info', content, 'info', 
            window.innerWidth / 2 - 150, 
            window.innerHeight / 2 - 100);
    },

    getActiveProgram() {
        const activeWindow = this.getActiveWindow();
        
        // If no active window, return Finder
        if (!activeWindow) return 'Finder';
        
        // If window is a folder window, return Finder
        if (activeWindow.classList.contains('folder-window')) {
            return 'Finder';
        }
        
        // Return the title of the active window
        return activeWindow.querySelector('.window-title').textContent;
    }
};

// Initialize menu system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    MenuManager.init();
});

MenuManager.hideProgram = function(programName) {
    if (!programName || programName === 'Finder') return;
    
    // Hide all windows of this program
    const windows = Array.from(document.querySelectorAll('.window'));
    windows.forEach(window => {
        const title = window.querySelector('.window-title').textContent;
        if (title === programName && !window.classList.contains('folder-window')) {
            window.style.visibility = 'hidden';
            window.classList.add('hidden');
        }
    });

    // Find next visible program
    const programs = this.getOpenPrograms();
    let foundCurrent = false;
    let nextProgram = 'Finder';  // Default to Finder if no other visible programs

    // First try to find the next visible program after the current one
    for (const program of programs) {
        if (foundCurrent && !program.hidden) {
            nextProgram = program.name;
            break;
        }
        if (program.name === programName) {
            foundCurrent = true;
        }
    }

    // If we didn't find a next program, try to find the first visible program before the current one
    if (nextProgram === 'Finder' && foundCurrent) {
        for (const program of programs) {
            if (program.name === programName) {
                break;
            }
            if (!program.hidden) {
                nextProgram = program.name;
            }
        }
    }

    // Switch to the next program
    this.switchToProgram(nextProgram);
    this.updateApplicationMenu();
};

MenuManager.hideOthers = function() {
    const activeWindow = this.getActiveWindow();
    if (!activeWindow) return;
    
    const currentProgram = activeWindow.querySelector('.window-title').textContent;
    const windows = Array.from(document.querySelectorAll('.window'));
    
    windows.forEach(window => {
        const title = window.querySelector('.window-title').textContent;
        if (title !== currentProgram && !window.classList.contains('folder-window')) {
            window.style.visibility = 'hidden';
            window.classList.add('hidden');
        }
    });
    
    this.updateApplicationMenu();
};

MenuManager.showAll = function() {
    const windows = Array.from(document.querySelectorAll('.window.hidden'));
    windows.forEach(window => {
        window.classList.remove('hidden');
        window.style.visibility = 'visible';
    });
    
    this.updateApplicationMenu();
};

MenuManager.switchToProgram = function(programName) {
    const windows = Array.from(document.querySelectorAll('.window'));
    const highestZ = this.getHighestZIndex();
    let newZ = highestZ + 1;
    
    // If switching to Finder, deactivate all windows
    if (programName === 'Finder') {
        windows.forEach(window => {
            window.querySelector('.window-titlebar').style.background = 
                'var(--system7-titlebar-inactive)';
        });
        // Update application name and icon
        const appMenu = document.querySelector('.app-menu');
        appMenu.querySelector('.app-icon').src = '/assets/images/MacSE.png';
        appMenu.querySelector('.app-name').textContent = 'Finder';
    } else {
        // Regular program switching logic
        windows.forEach(window => {
            const title = window.querySelector('.window-title').textContent;
            if (title === programName) {
                if (window.classList.contains('hidden')) {
                    window.classList.remove('hidden');
                    window.style.visibility = 'visible';
                }
                window.style.zIndex = newZ++;
                window.querySelector('.window-titlebar').style.background = 
                    'var(--system7-titlebar-active)';
            } else {
                window.querySelector('.window-titlebar').style.background = 
                    'var(--system7-titlebar-inactive)';
            }
        });
    }
    
    this.updateApplicationMenu();
};

MenuManager.getActiveProgram = function() {
    const activeWindow = this.getActiveWindow();
    
    // If no active window, or all windows hidden, return Finder
    if (!activeWindow || this.areAllProgramsHidden()) {
        return 'Finder';
    }

    // If active window is a folder, return Finder
    if (activeWindow.classList.contains('folder-window')) {
        return 'Finder';
    }

    // If window is hidden, it can't be active
    if (activeWindow.classList.contains('hidden')) {
        return 'Finder';
    }

    // Return the title of the active window
    return activeWindow.querySelector('.window-title').textContent;
};

MenuManager.areAllProgramsHidden = function() {
    const windows = Array.from(document.querySelectorAll('.window'));
    const programWindows = windows.filter(w => 
        !w.classList.contains('folder-window') && 
        !w.classList.contains('utility-window')
    );
    
    // If no program windows exist, or all program windows are hidden
    return programWindows.length === 0 || 
           programWindows.every(w => w.classList.contains('hidden'));
};
