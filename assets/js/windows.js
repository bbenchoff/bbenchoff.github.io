// Window management system
class Window {
    constructor(title, content, type = 'document', x = 20, y = 50) {
        this.element = document.createElement('div');
        this.element.className = 'window';
        if (type === 'folder') this.element.classList.add('folder-window');
        
        // Set initial position
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';

        // Set size based on window type
        if (title === 'Macintosh HD') {
            this.element.style.width = '500px'; 
            this.element.style.height = '200px'; 
        } else if (title === 'Calculator') {
            this.element.style.width = '160px';
            this.element.style.height = '255px';
        } else if (type === 'document') {
            this.element.style.width = '800px';
            this.element.style.height = '600px';
        } else {
            this.element.style.width = '600px';
            this.element.style.height = '400px';
        }

        // Create window structure
        this.element.innerHTML = `
            <div class="window-titlebar">
                <div class="window-close"></div>
                <div class="window-title">${title}</div>
            </div>
            <div class="window-content">${content}</div>
            <div class="window-resizer"></div>
        `;

        // Set window type for menu handling
        this.element.dataset.windowType = type;

        // Initialize window behaviors
        this.makeDraggable();
        this.makeCloseable();
        this.makeActivatable();
        this.makeResizable();
        this.bringToFront();
        
        // Add to desktop
        document.getElementById('desktop').appendChild(this.element);

        // Update application menu immediately after window creation
        if (typeof MenuManager !== 'undefined') {
            MenuManager.updateApplicationMenu();
        }
    }

    makeActivatable() {
        this.element.addEventListener('mousedown', (e) => {
            if (!e.target.classList.contains('window-close')) {
                this.bringToFront();
            }
        });
        // Remove any desktop click handling from here
    }

    makeDraggable() {
        const titlebar = this.element.querySelector('.window-titlebar');
        let isDragging = false;
        let initialX, initialY;

        titlebar.addEventListener('mousedown', (e) => {
            isDragging = true;
            initialX = e.clientX - this.element.offsetLeft;
            initialY = e.clientY - this.element.offsetTop;
            this.bringToFront();
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                this.element.style.left = (e.clientX - initialX) + 'px';
                this.element.style.top = (e.clientY - initialY) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.debouncedSaveState();
            }
        });
    }

    makeResizable() {
        const resizer = this.element.querySelector('.window-resizer');
        if (!resizer) return;

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startWidth = this.element.offsetWidth;
            const startHeight = this.element.offsetHeight;
            const startX = e.clientX;
            const startY = e.clientY;
            
            const onMouseMove = (moveEvent) => {
                const newWidth = startWidth + (moveEvent.clientX - startX);
                const newHeight = startHeight + (moveEvent.clientY - startY);
                this.element.style.width = `${Math.max(200, newWidth)}px`;
                this.element.style.height = `${Math.max(100, newHeight)}px`;
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.debouncedSaveState();
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    makeCloseable() {
        const closeButton = this.element.querySelector('.window-close');
        closeButton.addEventListener('click', () => {
            // Play close sound if available
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('drop');
            }
            
            this.element.remove();
            
            // Reset application name to Finder if no windows are active
            if (!document.querySelector('.window')) {
                updateActiveApplication('Finder');
            }
            
            // Update application menu
            if (typeof MenuManager !== 'undefined') {
                MenuManager.updateApplicationMenu();
            }

            // Save state
            if (typeof StateManager !== 'undefined') {
                StateManager.saveState();
            }
        });
    }

    bringToFront() {
        const windows = document.querySelectorAll('.window');
        let maxZ = 0;
        windows.forEach(win => {
            const z = parseInt(win.style.zIndex || 0);
            maxZ = Math.max(maxZ, z);
            win.classList.remove('active');
            win.querySelector('.window-titlebar').style.background = 
                'var(--system7-titlebar-inactive)';
        });
        
        this.element.style.zIndex = maxZ + 1;
        this.element.classList.add('active');
        this.element.querySelector('.window-titlebar').style.background = 
            'var(--system7-titlebar-active)';

        // Update MenuManager
        if (typeof MenuManager !== 'undefined') {
            MenuManager._finderActive = this.element.classList.contains('folder-window');
            MenuManager.updateApplicationMenu();
        }
    }

    debouncedSaveState() {
        if (this.saveStateTimeout) {
            clearTimeout(this.saveStateTimeout);
        }
        this.saveStateTimeout = setTimeout(() => {
            if (typeof StateManager !== 'undefined') {
                StateManager.saveState();
            }
        }, 500);
    }

    static restore(windowState) {
        return new Window(
            windowState.title, 
            windowState.content, 
            windowState.type, 
            parseInt(windowState.position.left), 
            parseInt(windowState.position.top)
        );
    }
}

// Add this function to update the application name
function updateActiveApplication(windowTitle) {
    const appName = document.getElementById('current-app-name');
    if (appName) {
        appName.textContent = windowTitle || 'Finder';
    }
}

// Find the function that handles window focus and add the update call
// This might be in your window click handler or focus handler
function setActiveWindow(window) {
    // ...existing code...
    updateActiveApplication(window.querySelector('.window-title').textContent);
    // ...existing code...
}

// Function to open a page in a new window
function openPage(page) {
    fetch(`/pages/${page}.html`)
        .then(response => response.text())
        .then(content => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            const mainContent = tempDiv.querySelector('.main-content');
            const windowContent = mainContent ? mainContent.innerHTML : content;
            
            // Get the title from the filesystem
            const fileItem = findItem(fileSystem, page);
            const windowTitle = fileItem ? fileItem.name : page;
            
            // Create new window with proper title
            new Window(windowTitle, windowContent, 'document');
        })
        .catch(error => console.error('Error loading page:', error));
}