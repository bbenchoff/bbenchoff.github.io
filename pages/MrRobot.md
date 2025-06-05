---
layout: default
title: "Mr. Robot Badge - Electronic Conference Badge"
description: "A custom electronic conference badge inspired by Mr. Robot, featuring LED effects and interactive elements"
keywords: ["electronic badge", "Mr Robot", "conference badge", "hardware hacking", "LED design", "badge electronics", "maker project", "hacker culture"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2021-06-21
image: "/images/RobotEngadget.jpg"
---
## Mr Robot Badge

The Mr. Robot Badge was a series of 'indie' electronic badges produced for DEFCON 25 & 26 -- and was featured on the official DC26 t-shirt. It was also featured on the [Engadget writeup of the event](https://www.engadget.com/2016-08-13-def-con-2016-badges.html).

![Mr Robot Badge](/images/RobotEngadget.jpg){: loading="lazy" alt="Mr Robot Badge"}

The idea behind this project was simply, "make a cool looking electronic badge". Previously, all the badges were monochromatic -- one color of soldermask, one color of silkscreen, and that's about it. I wanted something slightly more colorful, and hit upon the idea of using _clear_ soldermask, along with black and white silkscreen. This, combined with the popularity of the USA show _Mr Robot_ during DC25, and the choice was obvious: I'd do the "not a Guy Fawkes mask" from that show. Here's an idea of what the layer stackup looks like:

![PCB layers for Mr Robot Badge](/images/RobotPCB.png){: loading="lazy" alt="PCB layers for Mr Robot Badge"}

The electronics for the badge included an ESP-8266 with a LED matrix chip and enough buttons for a 'Game Boy' experience:

![Testing of Badge](/images/RobotGif.gif){: loading="lazy" alt="Testing of Badge"}.

The design vastly improved for DEFCON 26. Before DC26, a new LED driver chip was released by ISSI, allowing for an 18x18 matrix. Of course I had to [write a driver](/pages/IS31FL3741) to get that to work, but the base project, for the most part, stayed the same.

One thing was added for DC26: Add-Ons. Along with other DEFCON badge creators, I created an implemented a standard for inter-badge electronics; the [Shitty Add-On Standard](https://hackaday.com/2019/03/20/introducing-the-shitty-add-on-v1-69bis-standard/). This allows a user to add 'flair' to a badge. I took this a bit further with a full-color add-on, the Tide Pod Blockchain:

![a Tide Pod PCB](/images/tidepod.jpg){: loading="lazy" alt="a Tide Pod PCB"}

This add-on features dual-color printing via pad printing (although a panelized board could be done with a silkscreen process). On this small PCB is a serial EEPROM containing a unique serial number accessed by the main badge. The main badge reads this serial number and stores it in a linked list along with a hash of the previous item in the list. **I made a blockchain out of Tide Pods** and that's just the coolest thing ever.

More information can be found in the [Mr Robot Badge repository](https://github.com/bbenchoff/MrRobotBadge).

[back](../)