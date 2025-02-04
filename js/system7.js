const fileSystem = {
    macHD: {
        name: 'Macintosh HD',
        type: 'folder',
        icon: 'hd-icon.png',
        parent: null
    },
    software: {
        name: 'Software',
        type: 'folder',
        icon: 'folder-icon.png',
        parent: 'macHD'
    },
    hardware: {
        name: 'Hardware',
        type: 'folder',
        icon: 'folder-icon.png',
        parent: 'macHD'
    },
    cad: {
        name: 'CAD Design',
        type: 'folder',
        icon: 'folder-icon.png',
        parent: 'macHD'
    },
    // Add items for each folder's contents
    busTracker: {
        name: 'Embedded SSL and GZIP',
        type: 'document',
        icon: 'doc-icon.png',
        parent: 'software',
        file: 'BusTideDisplay'
    },
    // ... add more items as needed
};

function handleIconClick(event) {
    const target = event.currentTarget;
    const iconId = target.id;
    
    if (iconId === 'macHD') {
        createNewWindow('Macintosh HD', getTopLevelFolders());
    } else if (fileSystem[iconId]) {
        createNewWindow(iconId, getContentForFolder(iconId));
    }
}

function getTopLevelFolders() {
    return Object.keys(fileSystem)
        .filter(key => fileSystem[key].parent === 'macHD')
        .map(key => ({
            id: key,
            name: fileSystem[key].name,
            type: 'folder'
        }));
}

function getContentForFolder(folderId) {
    return Object.keys(fileSystem)
        .filter(key => fileSystem[key].parent === folderId)
        .map(key => ({
            id: key,
            name: fileSystem[key].name,
            type: fileSystem[key].type || 'alias'
        }));
}

function createNewWindow(title, contents) {
    const windowId = 'window_' + Math.random().toString(36).substr(2, 9);
    const windowEl = document.createElement('div');
    windowEl.className = 'window';
    windowEl.id = windowId;
    
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.textContent = title;
    
    const contentArea = document.createElement('div');
    contentArea.className = 'window-content';
    
    contents.forEach(item => {
        const icon = createIcon(item.id, item.name, item.type);
        contentArea.appendChild(icon);
    });
    
    windowEl.appendChild(titleBar);
    windowEl.appendChild(contentArea);
    document.body.appendChild(windowEl);
    
    makeWindowDraggable(windowEl);
}

function getFolderContents(folderId) {
    return Object.entries(fileSystem)
        .filter(([_, item]) => item.parent === folderId)
        .map(([id, item]) => ({
            id: id,
            name: item.name,
            type: item.type,
            icon: item.icon
        }));
}

function createFolderWindow(folderId) {
    const folder = fileSystem[folderId];
    if (!folder) return;

    const contents = getFolderContents(folderId);
    let html = '';
    
    contents.forEach(item => {
        html += `
            <div class="desktop-icon" data-id="${item.id}" data-type="${item.type}">
                <img src="/assets/images/${item.icon}" alt="${item.name}">
                <div class="desktop-icon-label">${item.name}</div>
            </div>
        `;
    });

    new Window(folder.name, html, 'folder');
}

// Update the double-click handler
function handleDoubleClick(name) {
    const item = Object.entries(fileSystem).find(([_, item]) => item.name === name)?.[0];
    
    if (!item) return;
    
    if (fileSystem[item].type === 'folder') {
        createFolderWindow(item);
    } else if (fileSystem[item].type === 'document') {
        // Handle document opening (existing code)
        // ...existing code...
    }
}

// ...existing code...
