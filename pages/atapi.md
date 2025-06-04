---
layout: default
title: "atapi"
description: "Hardware engineering and PCB design documentation by Brian Benchoff"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-06-04
image: "/images/default.jpg"
---
---
layout: default


---

## Zip Drive Tower

**What is it?** It's a tower of Zip drives, all connected over USB. This demands a picture, so:

![Zip Drive Tower](/images/Atapi-tower.jpg){: loading="lazy" alt="Zip Drive Tower"}

The Zip drive tower is built from fifteen ATAPI Zip-100 drives. A custom board was made for fifteen ATAPI-to-USB converters.

**Why build this?**

There are two reasons I built the Zip drive tower. The _least_ important reason is to build a RAID array, just because. This turned out to be just as useless as expected; the array is slow (as Zip drives are very slow) and in RAID 0 configuration only presents a volume ~1.5GB in size. It also draws about 15 Amps at 5V on startup, so it's far less economical than a thumb drive.

The _second_ reason is to start a record label. The rise of vinyl and cassette relases signals public interest in rare media formats, and it's too expensive to build a minidisc duplicator. Either way, I can produce some releases for Akai samplers and MPCs.

**Building the USB -> IDE Adapters**

While new USB to IDE/ATAPI adapters can be purchased, they do not work with what operating systems consider a 'floppy' drive; this includes Zip drives, MO drives, and MD-Data drives. There are, however, chipsets that do present floppy drives as standard drives to the OS. In this case, I cloned a GL811E chipset by depopulating and delayering a board:

![Delayering USB adapter](/images/atapiGL811e.gif){: loading="lazy" alt="Delayering USB adapter"}

From there, a replacement PCB was constructed and new boards were made with New Old Stock GL811E chips. These USB to ATAPI adapter boards were then connected to a USB hub where they can be accessed by the OS.

![Eagle PCB of IDE adapter](/images/USBtoATAPI.png){: loading="lazy" alt="Eagle PCB of IDE adapter"}

The 'finished' version of this project is a four-drive tower, with four Z250 drives, a four-port USB hub, and the IDE->USB adapters. The case for this tower is 3D printed, with a second case printed for SCSI applications:

![Micro Zip Tower 1](/images/ZipTower1.png){: loading="lazy" alt="Micro Zip Tower 1"}
![Micro Zip Tower 2](/images/ZipTower2.png){: loading="lazy" alt="Micro Zip Tower 2"}


More information can be found in the [ATAPI Tower repository](https://github.com/bbenchoff/ATAPI_Tower).

[back](../)
