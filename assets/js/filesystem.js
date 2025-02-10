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
                    'System 7 Web Theme': {
                        type: 'document',
                        icon: 'finder-icon.png',
                        file: 'system7'
                    },
                    'Dennis Nedry': {
                        type: 'document',
                        icon: 'jp.png',
                        file: 'nedry'
                    },
                    'Embedded SSL and GZIP': {
                        type: 'document',
                        icon: 'gzip.png',
                        file: 'BusTideDisplay'
                    },
                    'SFMTA-API': {
                        type: 'document',
                        icon: 'sfmta-logo.png',
                        file: 'sfmta-api'
                    },
                    'Reading ΔΣ DAQs': {
                        type: 'document',
                        icon: 'deltasig.png',
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
                        icon: 'terminal.png',
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
                        icon: 'deltasig.png',
                        file: 'IsoTherm'
                    },
                    'Nikon Lens Adapter': {
                        type: 'document',
                        icon: 'quicktake.png',
                        file: 'QuicktakeLens'
                    },
                    'E-Ink Bus Station Display': {
                        type: 'document',
                        icon: 'buscircle.png',
                        file: 'BusTideDisplay'
                    },
                    '$15 Linux Device': {
                        type: 'document',
                        icon: 'Tux.png',
                        file: 'LinuxDevice'
                    },
                    'Portable Dumb Terminal': {
                        type: 'document',
                        icon: 'terminal.png',
                        file: 'dumb'
                    },
                    'Mr. Robot Badge': {
                        type: 'document',
                        icon: 'RobotHead.png',
                        file: 'MrRobot'
                    },
                    'Zip Drive Tower': {
                        type: 'document',
                        icon: 'zipdisk.png',
                        file: 'atapi'
                    },
                    'Full Color Circuit Boards': {
                        type: 'document',
                        icon: 'doc-icon.png',
                        file: 'colorPCB'
                    },
                    'RGB Gaming Coaster': {
                        type: 'document',
                        icon: 'razer.png',
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
                    },
                    'Rebuild Duo Batteries': {
                        type: 'document',
                        icon: 'Duo.png',
                        file: 'DuoBatt'
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
                        icon: 'BeOS.png',
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

// File system helper functions
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

    // Look for the item in the file system
    const item = findItem(fileSystem['Macintosh HD'], name);

    if (item) {
        if (item.type === 'folder') {
            new Window(name, createFolderContents(item), 'folder');
        } else if (item.type === 'document') {
            openPage(item.file);
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
            openPage(fileMap[name]);
        } else if (name === 'JP') {
            const videoContent = `
                <video width="200" height="200" autoplay loop>
                    <source src="/assets/videos/TheKing.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
            new Window('TheKing', videoContent, 'document', window.innerWidth / 2 - 100, window.innerHeight / 2 - 100);
        }
    }
}

// Desktop initialization and icon management
function initializeDesktop() {
    const desktop = document.getElementById('desktop');
    const ICON_HEIGHT = 80;
    let topPosition = 20;
    
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
        { name: 'Isolated Thermocouple', icon: 'deltasig.png' },
        { name: 'Citicar', icon: 'redcar.png' },
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

    div.setAttribute('data-name', name);
    div.setAttribute('data-type', isAlias ? 'alias' : 'folder');

    return div;
}

// Event listeners
document.addEventListener('dblclick', (e) => {
    const icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    
    const name = icon.dataset.name;
    handleDoubleClick(name);
});