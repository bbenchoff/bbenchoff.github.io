---
layout: default
title: "Handheld Linux Device with NiMH Power"
description: "A compact Linux handheld powered by Allwinner F1C200s, featuring NiMH batteries for easier shipping and lower cost"
keywords: ["handheld Linux", "Allwinner F1C200s", "NiMH battery", "embedded Linux", "ARM9", "portable computing", "DIY electronics", "SPI LCD"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-06-04
image: "/images/SAB.png"
---
---
layout: default


---

## Handheld Linux Device

![Handheld Linux Thing](/images/SAB.png){: loading="lazy" alt="Handheld Linux Thing"}

This is a small, handheld Linux device designed for low cost and manufacturability. Of note, this device does not use _lithium_ batteries, but rechargable NiMH AAA cells, as importing lithium cells is difficult; also, on a per-cell basis, NiMH are cheaper (with about 75% the capacity of Li cells).

## Features

* Allwinner F1C200s SoC
  * ARM9 core with 64MB of MB SDRAM, running at ~500MHz.
  * This is in an easily-assebled QFP88 package with minimal support components.
  * 64MB Flash, microSD card slot

* 320x240 SPI LCD, based on ILI9432 controller

* A silicone keyboard, a lot like <a href="https://bbenchoff.github.io/pages/keyboard.html">this other thing I built</a>

* Injection molded clamshell case
  * May be produced in many colors, like red, blue, green, white, black, possibly even pink

* Rechargable NiMH battery
  * Because I'm not shipping lithium.

## What it does

First off, it plays Doom, because it has to.

USB-C employs USB gadget protocol, allowing this device to become anything. SAO headers give serial, I2C, GPIO expansion, and reasonably stable software allows nearly infinite expandablity. It's a Swiss Army Device, something that's _sufficient_ for nearly any job, but is safe at home in your pocket.

![Handheld Linux Thing](/images/SAB-1.PNG){: loading="lazy" alt="Handheld Linux Thing"}
![Handheld Linux Thing](/images/SAB-3.png){: loading="lazy" alt="Handheld Linux Thing"}
![Handheld Linux Thing](/images/SAB-4.png){: loading="lazy" alt="Handheld Linux Thing"}
![Handheld Linux Thing](/images/SAB-5.png){: loading="lazy" alt="Handheld Linux Thing"}

[back](../)
