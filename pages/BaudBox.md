---
layout: default
title: "BaudBox"
description: "Hardware engineering and PCB design documentation by Brian Benchoff"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-06-04
image: "/images/default.jpg"
---
## Baud Box, a 256-key keyboard

During the development of the [terminal parser library](/pages/parser.html), I needed a way to print *all* characters over a serial port manually. This includes characters not normally typed on a keyboard (ASCII range 0x80-0xFF), as well as characters not usually used in the 21st century (Shift In/Out, 0x0E-0x0F, Bell, 0x07). The simplest solution would be a 256-key keyboard, so I built a keyboard with 18 keys.

![Render of Baud Box](/images/BaudBox.jpg){: loading="lazy" alt="Render of Baud Box"}

The device uses a dual 14-segment display to show the current buffer, or what has already been typed. Pressing 'Transmit' sends that byte over the serial port. The 'Backspace' key erases the buffer.

![Printed Baud Box](/images/BaudBoxReal.jpg){: loading="lazy" alt="Printed Baud Box"}

The device uses a 3D printed enclosure with the special addition of a PCB front panel. On the front panel are three rotary switches for selecting the baud rate (up to 19200), the parity, and the stop bits. All of this is controlled by an Arduino with battery circuit.

More information can be found in my [Serial Keyboard repository](https://github.com/bbenchoff/SerialKeybard). This repo contains a few files, but is mostly geared towards an unoptimized build with the internal structure consisting of five(!) different PCBs. The SerialKeyboard.brd is just a 18-key keyboard with diodes. The DisplayCarrier.brd is an interposer between the display and Motherboard.brd, which is the only thing with active electronics. There's also an Arduino in there and the front panel, which makes for a grand total of five different PCBs in this project.

I have started work on a simplified version, MasterBoard.brd, which would combine this all into one single circuit board. This work is not completed.

If someone can find me a source of 2U 'Transmit' keycaps, I'll get right on that.

[back](../)