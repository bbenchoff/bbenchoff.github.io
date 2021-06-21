---
layout: default
---

## Portable Dumb Terminal

A product design for a palmtop computer. Effectively, it's a dumb terminal like a [VT100](https://en.wikipedia.org/wiki/VT100).

![Dumb Terminal Front](/images/VTPlastic.png)

![Dumb Terminal Side](/images/VTPlasticSide.png)

The design is centered around a single PCB containing microcontroller logic, RS-232 output, USB-C, battery circuitry, and a keyboard and display interface.

![Dumb Terminal PCB](/images/DumbBoard.png)

A Microchip SAMD51 microcontroller controls every portion of the device. As no display driver or parser for an ANSI terminal existed, I built them. The [NT35510 TFT library](/NT35510.html) controls the display and is capable of displaying 80x24 characters on screen. The [parser library](/pages/parser.html) 

Combined with the [silicone membrane keyboard](/keyboard.html) and [injection molded enclosure](/Palmtop.html), the portable dumb terminal is a complete product for sysadmins, engineers, and the small market of vintage computing enthusiasts. 

More information can be found in my [Dumb Terminal repository](https://github.com/bbenchoff/Dumb-Badge).

[back](./)