document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    if (page) {
        openPage(page);
    }
});

// Window management
class Window {
    constructor(title, content, type = 'document', x = 20, y = 50) {
        this.element = document.createElement('div');
        this.element.className = 'window';
        if (type === 'folder') this.element.classList.add('folder-window');
        
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        if (title === 'Macintosh HD') {
            this.element.style.width = '500px'; 
            this.element.style.height = '200px'; 
        } else {
            this.element.style.width = '600px';
            this.element.style.height = '400px';
        }

        this.element.innerHTML = `
            <div class="window-titlebar">
                <div class="window-close"></div>
                <div class="window-title">${title}</div>
            </div>
            <div class="window-content">${content}</div>
            <div class="window-resizer"></div>
        `;

        this.makeDraggable();
        this.makeCloseable();
        this.makeActivatable();

        // Add resizable functionality
        const resizer = this.element.querySelector('.window-resizer');
        if (resizer) {
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const startWidth = this.element.offsetWidth;
                const startHeight = this.element.offsetHeight;
                const startX = e.clientX;
                const startY = e.clientY;
                
                const onMouseMove = (moveEvent) => {
                    const newWidth = startWidth + (moveEvent.clientX - startX);
                    const newHeight = startHeight + (moveEvent.clientY - startY);
                    this.element.style.width = `${newWidth}px`;
                    this.element.style.height = `${newHeight}px`;
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        };
        this.bringToFront();
        
        document.getElementById('desktop').appendChild(this.element);
    }
    makeActivatable() {
        // Add click handler to entire window
        this.element.addEventListener('mousedown', (e) => {
            // Ignore clicks on the close button
            if (!e.target.classList.contains('window-close')) {
                this.bringToFront();
            }
        });
    }
    makeDraggable() {
        const titlebar = this.element.querySelector('.window-titlebar');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        titlebar.addEventListener('mousedown', (e) => {
            isDragging = true;
            initialX = e.clientX - this.element.offsetLeft;
            initialY = e.clientY - this.element.offsetTop;
            this.bringToFront();
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                this.element.style.left = currentX + 'px';
                this.element.style.top = currentY + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    makeCloseable() {
        const closeButton = this.element.querySelector('.window-close');
        closeButton.addEventListener('click', () => {
            this.element.remove();
        });
    }

    bringToFront() {
        const windows = document.querySelectorAll('.window');
        let maxZ = 0;
        windows.forEach(win => {
            const z = parseInt(win.style.zIndex || 0);
            maxZ = Math.max(maxZ, z);
            win.querySelector('.window-titlebar').style.background = 
                'var(--system7-titlebar-inactive)';
        });
        this.element.style.zIndex = maxZ + 1;
        this.element.querySelector('.window-titlebar').style.background = 
            'var(--system7-titlebar-active)';
    }
    // Debounced save state to prevent too many saves during drag operations
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

    // Static method to restore a window from saved state
    static restore(windowState) {
        return new Window(
            windowState.title,
            windowState.content,
            windowState.type,
            0, // x and y are handled by options
            0, // x and y are handled by options
            windowState.position // Pass saved position as options
        );
    }
}

// File System Structure
const fileSystem = {
    'Macintosh HD': {
        type: 'folder',
        icon: 'hd-icon.png',
        contents: {
            'Software': {
                type: 'folder',
                icon: 'folder-icon.png',
                contents: {
                    'Dennis Nedry': {
                        type: 'document',
                        icon: 'jp.png',
                        file: 'nedry'
                    },
                    'Embedded SSL and GZIP': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'BusTideDisplay'
                    },
                    'Reading ΔΣ DAQs': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'IsoTherm'
                    },
                    'Instagram Clone': {
                        type: 'document',
                        icon: 'quicktake.png',
                        file: 'InstaClone'
                    },
                    'IS31FL3741 Driver': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'IS31FL3741'
                    },
                    'NT35510 TFT Driver': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'NT35510'
                    },
                    'Terminal Parsing Library': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'parser'
                    }
                }
            },
            'Hardware': {
                type: 'folder',
                icon: 'folder-icon.png',
                contents: {
                    'Isolated Thermocouple Reader': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'IsoTherm'
                    },
                    'Nikon Lens Adapter': {
                        type: 'document',
                        icon: 'quicktake.png',
                        file: 'QuicktakeLens'
                    },
                    'E-Ink Bus Station Display': {
                        type: 'document',
                        icon: 'doc-icon.png',
