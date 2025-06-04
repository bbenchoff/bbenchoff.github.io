---
layout: default
title: "Retro-Inspired Computer Case Designs"
description: "Collection of custom computer cases including a rackmount Mac, Frog Design-inspired Mini-ITX case, and SGI-style drive tower"
keywords: ["retro computing", "case design", "rackmount Mac", "Mini-ITX", "Frog Design", "industrial design", "Quadra 605", "custom cases"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-06-04
image: "/images/Mac2.PNG"
---
## Rackintosh

![Fusion render of rack mac](/images/Mac2.PNG){: loading="lazy" alt="Fusion render of rack mac"}

A rackmount Macintosh, from 1993. My [instagram](https://www.instagram.com/640by480/) requires me to keep an old Mac system around (pre-OS9, with a serial port), and existing solutions don't fit into my workstation layout. The solution is a rackmount Macintosh.

![Internals of rack mac](/images/Mac1.jpg){: loading="lazy" alt="Internals of rack mac"}

The enclsure is built around a [Hammond Manufacturing rackmount enclosure](https://www.hammfg.com/electronics/small-case/rack-mount/rm) -- 1U, 8" deep. I downloaded the 3D cad files from the Hammond website, added bezels for the floppy drive, ports, and power supply, and printed out the result. 

![Front of Rack mac](/images/Mac3.png){: loading="lazy" alt="Front of Rack mac"}

The internals are Quadra 605, with most of the original components transfered over. A SCSI drive won't fit, instead a BlueSCSI is used for the boot drive.

![Macworld 1993](/images/Macworld.jpg){: loading="lazy" alt="Macworld 1993"}

This was also featured in the [May 1993 edition of MacWorld](https://twitter.com/NanoRaptor/status/1457436098896941057). The files to make your own can be found in the [Rackmount Mac repo](https://github.com/bbenchoff/RackmountMac).

## Frog Design-inspired Mini-ITX enclosure

Inspired by the the best industrial design for computer cases of the 90s -- Packard Bell -- I decided to build my own Frog Design-inspired computer case. It supports a Mini ITX motherboard, with provisions for dual card slots.

![ATX Case](/images/Mobocase1.png){: loading="lazy" alt="ATX Case"}

The design offers little in the way for space for extended graphics cards, but in the mid-90s, graphics cards weren't that big, anyway. Of note is the slot-load DVD drive; although the DVD drive is slightly anachronistic, it does suit the design nicely.

## SGI-inspired Micro Quad-3.5" drive tower

A take-off of the big Zip drive tower, this enclosure fits four 3.5" drives, power supply, and interface electronics.

![Micro Zip Tower 1](/images/ZipTower1.png){: loading="lazy" alt="Micro Zip Tower 1"}
![Micro Zip Tower 2](/images/ZipTower2.png){: loading="lazy" alt="Micro Zip Tower 2"}

The design is inspired by the SGI O2, with a dash of Power Macintosh 6400. With four Zip 250 drives, this enclosure holds an entire gigabyte of data, accessable over USB 2 High Speed interface. This does not saturate the USB connection; the bottleneck is the drives.

## A Raspberry Pi BeBox

![Inside of BeBox](/images/BeBox2.png){: loading="lazy" alt="Inside of BeBox"}

Long story short -- I needed a Raspberry Pi to sit on a shelf for something (an FTP server, I think?), and I wanted it to look cool. A BeBox enclosure did not exist, so I made one.

This includes blinkenlights displaying the current CPU load. This is done with an MCP23017 I2C/GPIO expander. This board is mounted to the resin-printed front panel.

More information can be found in the [BeBox Repo](https://github.com/bbenchoff/Raspi-BeBox).

[back](../)