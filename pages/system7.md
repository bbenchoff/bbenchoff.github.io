---
layout: default
title: "Recreating Classic Macintosh System 7 in CSS"
description: "A faithful recreation of the Macintosh System 7 interface using modern CSS and JavaScript, featuring working windows, menu system, and classic Mac aesthetics"
keywords: ["System 7", "CSS recreation", "Macintosh interface", "retro computing", "web development", "JavaScript UI", "vintage Mac OS", "window manager"]
author: "Brian Benchoff"
date: 2023-06-04
last_modified_at: 2023-06-04
image: "/images/system7screenshot.png"
---

## Recreating System 7 in CSS

![System 7 Screenshot](/images/system7screenshot.png){: loading="lazy" alt="Screenshot of System 7 CSS recreation showing classic Mac interface"}

After looking at various ways to present my portfolio of projects, I decided to recreate the classic Macintosh System 7 interface entirely in CSS and JavaScript. This isn't just a cosmetic recreation - it's a fully functional window manager with working menus, draggable windows, and even proper z-index management for window focus.

It's not perfect. If you build _anything_ you know where the problems are. Michelangelo knew what's wrong with David, even if no one else does. That said, anyone will be able to pick up what's wrong with my implementation. There is no file system, and you can't move the icons around the desktop. There's no settings, and why am I changing the desktop from the Finders menu bar? The windows look wonky and the scrollbars are all wrong.

But this is a pretty good start to a project, wouldn't you say?

### The Window Manager

The core of any GUI is its window management system. In System 7, windows have several key characteristics:

- A title bar with close button and centered title
- The ability to be dragged around the screen
- Proper window focus management (active windows have striped title bars)
- Resizable corners
- Scrollbars that match the System 7 aesthetic

The window management is handled by a Window class that creates DOM elements with the appropriate event listeners:

```javascript
class Window {
    constructor(title, content, type = 'document', x = 20, y = 50) {
        this.element = document.createElement('div');
        this.element.className = 'window';
        if (type === 'folder') this.element.classList.add('folder-window');
        
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
        this.makeResizable();
        this.bringToFront();
    }
}
```

One of the trickier aspects was recreating System 7's distinctive striped title bar for active windows. This was accomplished using CSS gradients:

```css
--system7-titlebar-active: linear-gradient(
    to bottom,
    #d8d8d8 0%,
    #d8d8d8 4px,
    #000000 4px,
    #000000 5px,
    #d8d8d8 5px,
    /* More gradient stops */
    #d8d8d8 22px
);
```

### The Menu System

System 7's menu system is equally distinctive. Each menu item can trigger different actions, and the entire menu bar needs to be responsive to window focus changes. The MenuManager class handles all of this functionality:

```javascript
const MenuManager = {
    init() {
        this.initializeMenuListeners();
        this.updateApplicationMenu();
        this.addMenuStyles();
    },

    updateApplicationMenu() {
        const programs = this.getOpenPrograms();
        let menuHTML = '';
        
        programs.forEach(program => {
            menuHTML += `
                <div class="dropdown-item ${program.hidden ? 'hidden-program' : ''}" 
                    onclick="MenuManager.switchToProgram('${program.name}')">
                    <span style="width: 16px; text-align: center;">
                        ${program.name === activeProgram ? '✓' : ''}
                    </span>
                    <img src="/assets/images/${program.icon}" class="menu-icon">
                    <span>${program.name}</span>
                </div>
            `;
        });
    }
};
```

### State Management

The System 7 simulation persists across reloads. This happens through a state management system which saves the state of all the windows, their positions, sizes, and z-indices in localstorage:

```javascript
const StateManager = {
    saveState() {
        const windows = Array.from(document.querySelectorAll('.window')).map(window => ({
            title: window.querySelector('.window-title').textContent,
            content: window.querySelector('.window-content').innerHTML,
            position: {
                left: window.style.left,
                top: window.style.top,
                width: window.style.width,
                height: window.style.height,
                zIndex: window.style.zIndex
            }
        }));

        localStorage.setItem(this.STATE_KEY, JSON.stringify({
            windows,
            desktop: {
                background: document.getElementById('desktop').style.background
            },
            menuState: {
                activeApp: document.querySelector('.app-menu').textContent
            }
        }));
    }
};
```

### The Scrollbars

These are not perfect. They're not perfect because they're _hard to do_. Nevertheless, I have a reasonable simulation of classic Mac OS scrollbars on the windows. These aren't just styled divs - they're fully functional scrollbars that match the original System 7 design down to the pixel:

```css
.window-content::-webkit-scrollbar-thumb:vertical {
    background: linear-gradient(
        transparent 12.5%,
        #353594 0,
        #353594 25%,
        transparent 0,
        transparent 37.5%,
        #353594 0,
        #353594 50%,
        transparent 0,
        transparent 62.5%,
        #353594 0,
        #353594 75%,
        transparent 0,
        transparent 87.5%,
        #353594 0
    ) 50%/7px 8px no-repeat,
    linear-gradient(
        #cdcdfc 12.5%,
        transparent 0,
        transparent 25%,
        #cdcdfc 0,
        #cdcdfc 37.5%,
        transparent 0,
        transparent 50%,
        #cdcdfc 0,
        #cdcdfc 62.5%,
        transparent 0,
        transparent 75%,
        #cdcdfc 0,
        #cdcdfc 87.5%,
        transparent 0
    ) 49%/7px 8px no-repeat,
    #9b9bf9;
}
```

### A Calculator

![The Calculator](/images/calculator.png){: loading="lazy" alt="The Calculator"}

System 7 needs apps, not just web pages, so a simple calculator was added to the Apple menu. It's your basic RPN calculator written in Javascript.

### More Apps

I saw _Jurassic Park_ in theatres, and for thirty years I could never figure out why no one made a small Mac app of Newman wagging his finger and saying "Ah Ah Ah! You didn't say the magic word!". It's so obvious of a program to write.

[So I wrote it](https://www.macintoshrepository.org/54228-nedry). The Mac version is a proper app written in Codewarrior 4. There's an installer. It'll run on just about any Mac that supported color. Truthfully, it's a simple app -- it's just looping a quicktime movie -- but no one built it for thirty years, so I had to.

The web version I created for this is pretty similar -- it's just a looping video file with a bit of CSS to turn it into an "app" on this simulated system. Everything that's old is new again, I guess.

### Icons

The classic Mac OS is defined by its icons, and things are _boring_ if all the files in a folder use the same icon. 90s Mac shareware knew this well, and there are tens of thousands of little 32x32 bitmaps to spice up your Finder window. Most of these bitmaps are saved online somewhere [like Macintosh Repository](https://www.macintoshrepository.org/). If you want, you can make the icon of your masters thesis a Simpsons character.

I needed icons for my projects, so I edited the filesystem to support an icon per file. This is presented as a 32x32 .png file with transparency:

![The icons I'm using](/images/icons.png){: loading="lazy" alt="The icons I'm using"}

Actually obtaining these icons as .png files was a challenge: the icon archives from the 90s were designed for classic Mac operating systems -- the icons themselves are actually empty files on a Mac volume, with the icon applied. There's no actual _file_ in the windows and linux sense. To get icons from an old Mac system onto the web, I had to:

* Boot up my Power Macintosh G3 desktop. It's running 8.6.
* Find the icon I want, press command-I, to open the Info box for that file, and copy and paste the icon into my clipboard
* From there, I can open up Photoshop version 4 (no, not CS4), create a blank 32x32 document, and paste the icon in.
* Save the photoshop document, transfer to a modern computer, and export as a .PNG with transparency.

This is how I got the icons for folders and control strips. Some of the other icons were drawn by hand, and others simply ripped from the web and saved to the right proportions.

### Mobile Responsiveness

Ha! No, this is a desktop-only site. It also doesn't work in Firefox. While CSS and web technologies are far more frustrating than ResEdit and CodeWarrior ever were, recreating System 7's interface was an interesting exercise in web development. The complete source code is available in my GitHub repository, where you can see how all these components work together to create a faithful recreation of this classic interface.

[back](../)
