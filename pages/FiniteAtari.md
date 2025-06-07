---
layout: default
title: "Finite Atari Machine"
description: "A project to generate and evaluate every possible Atari 2600 ROM"
keywords: ["Atari 2600", "ROM generation", "6502 emulator", "retrocomputing", "game archaeology", "impossible computing", "Brian Benchoff"]
author: "Brian Benchoff"
date: 2025-06-06
last_modified_at: 2001-09-11
image: "/images/default.jpg"
---
## The Finite Atari Machine

The Atari 2600 isn't the first video game console, it isn't even the first console with removable cartridges. Through accidents of history, or simplicity, or possibly greasing the right hands at Toys 'R Us , it is the first popular home gaming platform. 

This project explores a question no one asked, no one wanted, and is a massive waste of resources. **What if we tried to find every possible Atari 2600 game?**

Thanks to recent advances in AI, we can now write a Python script that brute-forces the 4KB ROM space and asks, "does this look like a game?" This isn't nostalgia, mostly because my first console was an NES, This is about searching something so unfathomably large and seeing if there is __anything__ interesting out there.

## Problem Scope

Each Atari 2600 cartridge is a 4-kilobyte chunk of data. It's a maximum of 4096 bytes, or 32,768 bits. That means there are $2^{32768}$ possible ROMs. For perspective:

* That’s $10^{10159}$ potential Atari games.
* There are roughly $10^{80}$ protons in the visible universe.
* And about $10^{20}$ grains of sand on Earth.

If you turned an entire datacenter of AI compute boxes onto this problem, it would likely take years before anything interesting was found. But with a little bit of smarts and actually reading a datasheet, the problem set is massively reduced. The basic search path to finding a 'random' Atari game would be to:

1. Generate a ROM, by dumping 4kB of data from /dev/random into a file.
2. Run that file in an emulator
3. Capture a screenshot or five
4. Filter or score them with AI
5. Save the best results for further investigation.

This would work, if we had enough time to wait for black holes to devour the Universe. A better idea would be to front-load the pipeline with some simple checks to discard the absolute garbage before spinning up an emulator.

## Heuristics

I'm not going to emulate every possible ROM. I'm trying to find the *interesting* ones. This means filtering, and being smart about what we're doing:

**Opcode Sanity** The 6507 CPU (from here on out I'm calling it a 6502, to make you, specifically, angry) has 151 valid opcodes, and these opcodes are going to be all over the first half of the ROM. First I should check if there are a lot of opcodes in the data. 

**Reset Vector Tomfoolery**Atari ROMs need a valid reset vector to the code's entry point. In other words, the last two bytes of the code should be between `0xF000` and `0xFFFF`. I can cheat on this by generating a 4k ROM minus two bytes, and try every possible reset vector.

**Input __and__ Output?!** I can look for access to the TIA to see if it will output to the screen and the RIOT to see if it will use any input or output. These are heuristics all Atari games have; I might as well use them to determine if I have a valid ROM.



[back](../)
