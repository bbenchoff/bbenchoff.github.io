---
layout: default
title: "PowerBook Duo Battery Rebuild Guide"
description: "Comprehensive guide for rebuilding both main and PRAM batteries for Apple PowerBook Duo laptops"
keywords: ["PowerBook Duo", "battery rebuild", "PRAM battery", "vintage Apple", "laptop repair", "VL2320", "retro computing", "hardware restoration"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2023-04-15
image: "/images/Duo/pramdiagram.png"
---

# Powerbook Duo Battery Rebuild

The 90s was defined by gadgets. Today, your phone is a digital camera and camcoder, movie player, music player, connection to the Internet, VR device, and just about everything else you could think of. In the 90s, all of these devices existed as seperate devices. There were walkmen, cellular modems, Palm Pilots, and so forth. This extended to computing; the Powerbook Duo series of laptops had only two ports: a serial port, and a gigantic, weird dock connector. To this dock connector you could add CD ROM drives, Ethernet adapters, and adapters for an external monitor. It's the gadget-iest laptop ever made.

The Powerbook Duo is also an _exceptional_ laptop for <a href="https://bbenchoff.github.io/pages/QuicktakeLens.html">retro digital photography</a>, especially using an Apple Quicktake 150 camera. This camera requires an old Mac (with serial ports) to download images. It's light, small, and relatively thin for a vintage laptop. It's also the last Apple laptop without 'smart' battery packs. This means the batteries can be rebuilt easily with just a few dollars in tools and materials.

To take my retro digital photography rig on the road, I've acquired a few Powerbook Duos (a 2300c and a 280c) and rebuilt the batteries, both the main battery and the smaller internal PROM battery. It's somewhat easy, and I've decided to document the process on this page.

# Battery Pack

blah blah something something

# PRAM Battery

The PRAM battery is found next to the trackpad or trackball. This battery keeps the RTC powered, so the Mac can remember the date and time. I suspect the PRAM battery is also somehow used in the power management circuity; I've had difficulty turning a Duo on when it has a dead PRAM battery, even if connected to the charger and with a full (main) battery installed. In any event, if you're taking a Duo apart to install a BlueSCSI or whatever, it's a good idea to change the PRAM battery. The parts are cheap, and it's an easy process.

## Parts Needed
* Two (2) VL2320 coin cell batteries - you could substitute for VL2020 batteries.
* Soldering iron

## Assembly

The Duo PRAM battery is just two 3V batteries, wired in series. The red is postitve, black is negative, and white is the center. The VL2020 (or VL2320) batteries came with leads meant to be soldered into a PCB; you can solder to these leads and solder the leads together without destroying the battery.

Solder everything up and wrap it in heat shrink tubing. Install it, and it'll be good for another 30 years.

![The battery assembled](/images/Duo/prom.jpg){: loading="lazy" alt="The battery assembled"}

![Diagram](/images/Duo/pramdiagram.png){: loading="lazy" alt="Diagram"}





[back](../)
