---
layout: default
title: "RGB Gaming Coaster"
description: "A high-density PCB design featuring 214 RGB LEDs in a 72mm coaster form factor, powered by IS31FL3741 LED drivers and ATSamD21"
keywords: ["RGB LEDs", "PCB design", "IS31FL3741", "ATSamD21", "electronics", "LED matrix", "gaming accessories", "embedded systems"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2021-06-21
image: "/images/RGBGaming.jpg"
---
## RGB Gaming Coaster

An experiment in high-density routing, the RGB Gaming Coaster drives 214 RGB LEDs in a package only 72mm in diameter. Because everything else related to computers is bedazzled with RGB LEDs, this is device is to be used as a 'gaming' coaster.

![Composite of PCB layers](/images/RGBcomposite.png){: loading="lazy" alt="Composite of PCB layers"}

Because of the high density, a four layer PCB was used for the layout. Eletronics consist of two IS31FL3741 LED drivers, one for each half of the display. These drivers are controlled by a Microchip ATSamD21. Power is provided by a battery charging and boost circuit allowing the device to function away from a USB port.

The device uses the [IS31FL3741 LED driver display library](https://bbenchoff.github.io/IS31FL3741.html) I wrote for an earlier project, and was manufactured by Macrofab (one of one ever produced).

![RGB Gaming PCB](/images/RGBGaming.jpg){: loading="lazy" alt="RGB Gaming PCB"}

More information can be found in the [RGB Gaming Coaster repository](https://github.com/bbenchoff/RGB-Gaming-Coaster).


[back](../)