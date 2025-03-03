---
layout: default


---

## Classic Mac Development

 <img src="/images/MetrowerksCD.png" alt="The Metrowerks Guy" align="right" hspace="10" width="268">

 This is the page I'm using for a description of my Classic Mac development environment. This is how I make software for old Macintosh computers from the Macintosh SE to the titanium PowerBook G4. 

### Hardware

 The era I'm targeting spans a vast array of hardware, with a vast difference between the minimum and maximum hardware something something

 My main workstation is a **Power Macintosh G3**, desktop case, OS 8.6, with 544MB of RAM, and a BlueSCSI with a few different sized volumes. This is where the development happens, with testing on lower-spec systems: A **PowerBook Duo 2300c and Duo 280c** form my mobile fleet, representing the tail end of the M68k and beginnings of PPC eras. I need a mobile old mac for photography work, and Duos are the last ones with an easily reparable battery. BlueSCSI for the 280 and a very large Compact Flash card for the 2300. Finally, An **SE/30** is the low end of my fleet, with 128MB of RAM and Gigabyte-sized volumes thanks to another BlueSCSI. I see no reason my software should target anything lower.

### IDE & Other Tools

I'm using **Metrowerks CodeWarrior Pro 4** because this seems to be the sweet spot for my rig. There is good support for OS 8/9 systems, while still allowing for cross-compilation to M68k platforms and the creation of a Fat Binary. Of course I'm using C++.

Version control is provided by Apple's **SourceServer**. This is a version control system that was provided by Apple with the Macintosh Programmer's Workbench. [CWProjector](https://web.archive.org/web/20071009211617/http://www.electricfish.com/products/CWProjector/) integrates Projector with the CodeWarrior IDE. No, I don't like this, which is why I'm building a Git desktop client.

**ResEdit** also makes an appearance, but a lot of the resource-intensive (pun intended) work is being done with **Resorcerer 2.2**. This is a resource editor that adds support for new Appearance Manager controls introduced in OS 8.

**MacTCP Watcher** is used to debug internet connections...

Finally, **Installer VISE** creates an installer application for the finished app.

To talk to the outside world, I'm using a local **FTP Server**. Communicating with the outside world on vintage Macs is difficult, and while I could sneakernet files out of this ecosystem, the Duos don't have a built-in floppy drive and this is an easier solution anyway. I'm using [Transmit](https://download-cdn.panic.com/transmit/Transmit%201/) from Panic, yes the PlayDate Panic.

Combined, these tools represent something close to the state of the art around 1999. This is right around the time of the Blue & White G3, and OS 8.6, the beginnings of the not-beige era, while still allowing me to write something that will run on anything from Macintosh SE to a G4 Cube.

[back](../)
