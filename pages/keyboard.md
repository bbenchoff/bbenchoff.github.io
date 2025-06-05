---
layout: default
title: "Custom Silicone Membrane Keyboard"
description: "Design and manufacturing process of a custom silicone membrane keyboard with 69 keys, including PCB design and printing process"
keywords: ["silicone keyboard", "membrane keyboard", "PCB design", "keyboard manufacturing", "pad printing", "keyboard scanning", "hardware design", "Eagle library"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2021-06-21
image: "/images/KeyboardArial.png"
---
## Silicone Membrane Keyboard


A side project for the [Portable Dumb Terminal](https://bbenchoff.github.io/pages/dumb.html), this silicone membrane keyboard is a custom keyboard, much like the buttons in a TV remote control. It was designed in Fusion360 and manufactured for ~$1/piece in quantity 1000.

![Silicone Membrane Keyboard](/images/KeyboardArial.png){: loading="lazy" alt="Silicone Membrane Keyboard"}

The keyboard presents 69 keys to the user and is interfaced with a custom Eagle library for 'carbon pill' buttons. Reading the keyboard is as like any keypad scanning firmware, with the exception that diodes are not used in this implementation -- instead, a custom scanning protocol was used to prevent key ghosting.

The keyboards were manufacured with a process that is like -- but not identical to -- injection molding. Imagine putting a sheet of silicone inside a waffle iron. Legends were then printed onto the keycaps using a pad printing process. Because the legend printing is seperate from the forming of the silicone, many different legend styles can be created without manufacturing a new mold, DVORAK, QWERTZ, and AZERTY, for example.

More information can be found in the [Portable Dumb Terminal repository](https://github.com/bbenchoff/Dumb-Badge).


[back](../)