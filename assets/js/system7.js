document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    if (page) {
        openPage(page);
    }
    initializeDesktop();
    updateClock();
    setInterval(updateClock, 1000);
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
                        file: 'BusTideDisplay'
                    },
                    '$15 Linux Device': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'LinuxDevice'
                    },
                    'Portable Dumb Terminal': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'dumb'
                    },
                    'Mr. Robot Badge': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'MrRobot'
                    },
                    'Zip Drive Tower': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'atapi'
                    },
                    'Full Color Circuit Boards': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'colorPCB'
                    },
                    'RGB Gaming Coaster': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'RGBgaming'
                    },
                    'Serial Fidget Spinner': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'FidgetSpinner'
                    },
                    'Baud Box': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'BaudBox'
                    },
                    'A Wall of Circuit Boards': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'ShittyWall'
                    }
                }
            },
            'CAD Design': {
                type: 'folder',
                icon: 'folder-icon.png',
                contents: {
                    'Silicone Keyboard': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'keyboard'
                    },
                    'Injection Molded Palmtop': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'Palmtop'
                    },
                    'Retro-inspired Industrial Design': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'MiniITX'
                    },
                    'Quarter-Scale Retrocomputing': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'BeBox'
                    },
                    'Hardened Clamshell Computer': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'clamshell'
                    },
                    '3D Printed Tank Treads': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'Tread'
                    },
                    'Porygon': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'Porygon'
                    }
                }
            },
            'Access main security grid': {
                type: 'document',
                icon: 'jp.png'
            }
        }
    }
};

function handleDoubleClick(name) {
    // Check for Access main security grid specifically 
    if (name === 'Access main security grid') {
        const videoContent = `
            <video width="200" height="200" autoplay loop>
                <source src="/assets/video/TheKing.mp4" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
        const jpWindow = new Window('The King', videoContent, 'document', 
                                     window.innerWidth / 2 - 115, 
                                     window.innerHeight / 2 - 125);
        jpWindow.element.style.width = '230px';
        jpWindow.element.style.height = '250px';
        jpWindow.element.style.resize = 'none';
        const resizeHandle = jpWindow.element.querySelector('.window-resizer');
        if (resizeHandle) {
            resizeHandle.remove();
        }
        return;
    }

    if (name === 'Macintosh HD') {
        const hdFolder = fileSystem['Macintosh HD'];
        new Window(name, createFolderContents(hdFolder), 'folder');
        return;
    }

    // Helper function to find an item in the file system
    function findItem(obj, searchName) {
        // Check direct contents first
        if (obj.contents && obj.contents[searchName]) {
            return obj.contents[searchName];
        }
        // If not found, search recursively through all folders
        for (const value of Object.values(obj.contents || {})) {
            if (value.contents) {
                const found = findItem(value, searchName);
                if (found) return found;
            }
        }
        return null;
    }

    // Look for the item in the file system
    const item = findItem(fileSystem['Macintosh HD'], name);

    if (item) {
        console.log('Found item:', item); // Debug log
        if (item.type === 'folder') {
            new Window(name, createFolderContents(item), 'folder');
        } else if (item.type === 'document') {
            fetch(`/pages/${item.file}.html`)
                .then(response => response.text())
                .then(content => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;
                    const mainContent = tempDiv.querySelector('.main-content');
                    const windowContent = mainContent ? mainContent.innerHTML : content;
                    new Window(name, windowContent, 'document');
                })
                .catch(error => console.error('Error loading document:', error));
        }
    } else {
        // Check if it's an alias
        const fileMap = {
            'Bus Tracker Display': 'BusTideDisplay',
            'Isolated Thermocouple': 'IsoTherm',
            'Citicar': 'Citicar',
            'CAN Car Conversion': 'CANconversion'
        };
        
        if (fileMap[name]) {
            fetch(`/pages/${fileMap[name]}.html`)
                .then(response => response.text())
                .then(content => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;
                    const mainContent = tempDiv.querySelector('.main-content');
                    if (mainContent) {
                        new Window(name, mainContent.innerHTML, 'document');
                    } else {
                        new Window(name, content, 'document');
                    }
                });
        } else if (name === 'JP') {
            const videoContent = `
                <video width="200" height="200" autoplay loop>
                    <source src="/assets/videos/TheKing.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
            new Window('TheKing', videoContent, 'document', window.innerWidth / 2 - 100, window.innerHeight / 2 - 100);
            return;
        } else {
            console.log('Item not found:', name);
        }
    }
}

// Event delegation for all clicks
document.addEventListener('dblclick', (e) => {
    const icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    
    const name = icon.dataset.name;
    console.log('Double clicked:', name); // Debug log
    handleDoubleClick(name);
});

// Create folder contents
function createFolderContents(folder) {
    let html = '';
    Object.entries(folder.contents).forEach(([name, item]) => {
        html += `
            <div class="desktop-icon" data-type="${item.type}" data-name="${name}">
                <img src="/assets/images/${item.icon}" alt="${name}">
                <div class="desktop-icon-label">${name}</div>
            </div>
        `;
    });
    return html;
}

function initializeDesktop() {
    const desktop = document.getElementById('desktop');
    const ICON_HEIGHT = 80; // Height of each icon including spacing
    let topPosition = 20; // Starting position from top
    
    // Add HD icon
    const hdIcon = createDesktopIcon(
        'Macintosh HD', 
        'hd-icon.png',
        false,
        { right: '20px', top: `${topPosition}px` }
    );
    desktop.appendChild(hdIcon);
    topPosition += ICON_HEIGHT;

    // Add aliases to main projects
    const projects = [
        { name: 'Bus Tracker Display', icon: 'muni.png' },
        { name: 'Isolated Thermocouple', icon: 'doc-icon.png' },
        { name: 'Citicar', icon: 'redcar.png' }, // Updated icon for Citicar
        { name: 'CAN Car Conversion', icon: 'can.png' }
    ];

    projects.forEach((project) => {
        const icon = createDesktopIcon(
            project.name,
            project.icon,
            true,
            { right: '20px', top: `${topPosition}px` }
        );
        desktop.appendChild(icon);
        topPosition += ICON_HEIGHT;
    });
}

function createDesktopIcon(name, icon, isAlias = false, position = {}) {
    const div = document.createElement('div');
    div.className = 'desktop-icon' + (isAlias ? ' alias' : '');
    Object.assign(div.style, position);

    div.innerHTML = `
        <img src="/assets/images/${icon}" alt="${name}">
        <div class="desktop-icon-label">${name}</div>
    `;

    // Add data attributes
    div.setAttribute('data-name', name);
    div.setAttribute('data-type', isAlias ? 'alias' : 'folder');

    return div;
}

// Menu system
document.querySelectorAll('.menubar-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const menuName = item.dataset.menu;
        const menu = document.getElementById(menuName + '-menu');
        if (menu) {
            closeAllMenus();
            menu.style.display = 'block';
            menu.style.left = item.offsetLeft + 'px';
            // No need to add top positioning as it's handled by CSS
        }
    });
});

function closeAllMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.menubar-item')) {
        closeAllMenus();
    }
});

// Theme toggle function
function toggleTheme() {
    window.location.href = '{{ site.baseurl }}/';
}

function showAboutWindow() {
    const content = `
        <div style="display: flex; align-items: center;">
            <img src="/assets/images/moof.png" alt="Moof" style="width: 64px; height: 64px; margin-right: 20px;">
            <div>
                <p>This is my design portfolio, built in Jekyll and a bit of CSS.</p><p>While I have experience in classic Mac OS programming, CSS is far more frustrating than Metrowerks Codewarrior and ResEdit.</p>
            </div>
        </div>
    `;
    const aboutWindow = new Window('About This Website', content, 'document', window.innerWidth / 2 - 200, window.innerHeight / 2 - 150);
    
    // Remove resize handle and disable resizing
    const resizeHandle = aboutWindow.element.querySelector('.window-resizer');
    if (resizeHandle) {
        resizeHandle.remove();
    }
    
    // Set fixed dimensions and styles
    aboutWindow.element.style.resize = 'none';
    aboutWindow.element.style.overflow = 'hidden';
    aboutWindow.element.style.width = '400px';
    aboutWindow.element.style.height = '200px'; // Increased height
    aboutWindow.element.querySelector('.window-content').style.overflow = 'hidden';
}

// Initialize the interface
initializeDesktop();

function updateClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('clock').textContent = `${hours}:${minutes}`;
}

setInterval(updateClock, 1000);
updateClock();
