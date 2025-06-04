---
layout: default
title: "dumb"
description: "Hardware engineering and PCB design documentation by Brian Benchoff"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-06-04
image: "/images/default.jpg"
---
## Portable Dumb Terminal

A product design for a palmtop computer. Effectively, it's a dumb terminal like a [VT100](https://en.wikipedia.org/wiki/VT100).

![Dumb Terminal Front](/images/VTPlastic.png){: loading="lazy" alt="Dumb Terminal Front"}

[![Real Hardware](/images/YoutubePic.PNG){: loading="lazy" alt="Real Hardware"}](https://www.youtube.com/watch?v=wYfpptgb6W8)

![Dumb Terminal Side](/images/VTPlasticSide.png){: loading="lazy" alt="Dumb Terminal Side"}

The design is centered around a single PCB containing microcontroller logic, RS-232 output, USB-C, battery circuitry, and a keyboard and display interface.

![Dumb Terminal PCB](/images/DumbBoard.png){: loading="lazy" alt="Dumb Terminal PCB"}

A Microchip SAMD51 microcontroller controls every portion of the device. As no display driver or parser for an ANSI terminal existed, I built them. The [NT35510 TFT library](/pages/NT35510.html) controls the display and is capable of displaying 80x24 characters on screen. The [parser library](/pages/parser.html) 

![htop running on display](/images/htop.png){: loading="lazy" alt="htop running on display"}

Combined with the [silicone membrane keyboard](/pages/keyboard.html) and [injection molded enclosure](/pages/Palmtop.html), the portable dumb terminal is a complete product for sysadmins, engineers, and the small market of vintage computing enthusiasts. 

More information can be found in my [Dumb Terminal repository](https://github.com/bbenchoff/Dumb-Badge).

[back](../)