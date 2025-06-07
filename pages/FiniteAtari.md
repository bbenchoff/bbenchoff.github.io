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

The Atari 2600 isn't the first video game console, it isn't even the first console with removable cartridges. Through accidents of history, or simplicity, or possibly greasing the right hands at Toys 'R Us, it is the first popular home gaming platform. 

This project explores a question no one asked, no one wanted, and is a massive waste of resources. **What if we tried to find every possible Atari 2600 game?**

Thanks to recent advances in AI, we can now write a Python script that brute-forces the 4KB ROM space and asks, "does this look like a game?" This isn't nostalgia, mostly because my first console was an NES. This is about searching something so unfathomably large and seeing if there is _anything_ interesting out there.

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

**Opcode Sanity** The 6507 CPU (from here on out I'm calling it a 6502, to make you, specifically, angry) has 151 valid opcodes, and these opcodes are going to be all over the first half of the ROM. First I should check if there are a lot of opcodes in the data. These opcodes are:

<code>
    0x00, 0x01, 0x05, 0x06, 0x08, 0x09, 0x0A, 0x0D, 0x0E, 0x10, 0x11, 0x15, 0x16, 0x18,
    0x19, 0x1D, 0x1E, 0x20, 0x21, 0x24, 0x25, 0x26, 0x28, 0x29, 0x2A, 0x2C, 0x2D, 0x2E,
    0x30, 0x31, 0x35, 0x36, 0x38, 0x39, 0x3D, 0x3E, 0x40, 0x41, 0x45, 0x46, 0x48, 0x49,
    0x4A, 0x4C, 0x4D, 0x4E, 0x50, 0x51, 0x55, 0x56, 0x58, 0x59, 0x5D, 0x5E, 0x60, 0x61,
    0x65, 0x66, 0x68, 0x69, 0x6A, 0x6C, 0x6D, 0x6E, 0x70, 0x71, 0x75, 0x76, 0x78, 0x79,
    0x7D, 0x7E, 0x81, 0x84, 0x85, 0x86, 0x88, 0x8A, 0x8C, 0x8D, 0x8E, 0x90, 0x91, 0x94,
    0x95, 0x96, 0x98, 0x99, 0x9A, 0x9D, 0xA0, 0xA1, 0xA2, 0xA4, 0xA5, 0xA6, 0xA8, 0xA9,
    0xAA, 0xAC, 0xAD, 0xAE, 0xB0, 0xB1, 0xB4, 0xB5, 0xB6, 0xB8, 0xB9, 0xBA, 0xBC, 0xBD,
    0xBE, 0xC0, 0xC1, 0xC4, 0xC5, 0xC6, 0xC8, 0xC9, 0xCA, 0xCC, 0xCD, 0xCE, 0xD0, 0xD1,
    0xD5, 0xD6, 0xD8, 0xD9, 0xDD, 0xDE, 0xE0, 0xE1, 0xE4, 0xE5, 0xE6, 0xE8, 0xE9, 0xEA,
    0xEC, 0xED, 0xEE, 0xF0, 0xF1, 0xF5, 0xF6, 0xF8, 0xF9, 0xFD, 0xFE
<code>

Random data has about a 59% chance of being a valid opcode (151 out of 256 possible bytes). Real games should do much better than that. The bulk of the first kilobyte or so of data should be made up of these opcodes.

**Reset Vector Tomfoolery** Atari ROMs need a valid reset vector to the code's entry point. In other words, the last two bytes of the code should be between `0xF000` and `0xFFFF`. I can cheat on this by generating a 4k ROM minus two bytes, and try every possible reset vector.

**Input __and__ Output?!** I can look for access to the TIA (Television Interface Adapter) to see if it will output to the screen and the RIOT (RAM-I/O-Timer) to see if it will use any input or output. These are heuristics all Atari games have; I might as well use them to determine if I have a valid ROM.

The TIA handles all graphics and sound, so any game needs to write to these registers:

<code>
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
    0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
    0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23,
    0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F
<code>

And the RIOT registers are:
<code>
    0x280, 0x281, 0x282, 0x283, 0x284, 0x285, 0x286, 0x287, 0x294, 0x295, 
    0x296, 0x297
<code>

Every valid ROM will have at least one access to the RIOT registers for input handling, and many accesses to the TIA registers for graphics.

**Branches and Jumps** We're looking for games here, and every game has loops and structure. These show up as branch instructions (for loops and conditionals) and jump instructions (for subroutines and major flow control):

* Branch opcodes: `0x10, 0x30, 0x50, 0x70, 0x90, 0xB0, 0xD0, 0xF0`
* Jump opcodes: `0x4C` (JMP absolute), `0x6C` (JMP indirect), `0x20` (JSR - jump to subroutine)

Take all of this together, and we can assign some heuristics to validate what counts as a "game". If we're really smart, we can even make some educated guesses about what the exact heuristics should be.

## Calibrating Against Reality

To validate these heuristics, I analyzed the [Atari 2600 Full ROM Collection](https://archive.org/details/Atari2600FullRomCollectionReuploadByDataghost) from the Internet Archive - all 1,530 commercial Atari ROMs ever made. A simple Python script opened each ROM and applied the same heuristics I'd use on generated ROMs.

Real games are far more sophisticated than I expected:

### ROM Characteristics by Metric

| Metric | Min | 5th % | 10th % | 25th % | Median | 75th % | 90th % | 95th % | Max | Mean |
|--------|-----|-------|--------|--------|--------|--------|--------|--------|-----|------|
| **Valid Opcodes** | 1.7% | 65.6% | 70.0% | 74.0% | 76.0% | 77.9% | 79.6% | 81.4% | 90.7% | 74.8% |
| **TIA Accesses** | 1 | 51 | 66 | 103 | 154 | 222 | 337 | 476 | 2,101 | 190 |
| **RIOT Accesses** | 0 | 1 | 1 | 2 | 2 | 4 | 6 | 8 | 67 | 3.2 |
| **Branch Instructions** | 8 | 177 | 200 | 296 | 364 | 528 | 789 | 1,066 | 5,928 | 457 |
| **Jump Instructions** | 1 | 37 | 54 | 76 | 111 | 172 | 260 | 351 | 1,495 | 142 |
| **Unique Opcodes** | 29 | 125 | 129 | 137 | 143 | 148 | 151 | 151 | 151 | 141 |
| **Overall Score** | 0.393 | 0.799 | 0.810 | 0.823 | 0.851 | 0.879 | 0.905 | 0.928 | 1.004 | 0.853 |

The Overall Score combines all heuristics into a single metric using weighted averages:

`
Score = (Opcode Ratio × 0.25) + 
        (TIA Accesses/20 × 0.20) + 
        (RIOT Accesses/10 × 0.15) + 
        (Branches/15 × 0.15) + 
        (Jumps/8 × 0.10) + 
        (Unique Opcodes/30 × 0.10) + 
        (Loop Patterns × 0.05)

`

Real games scored between 0.393 and 1.004, with an average of 0.853. This composite score helps rank how "game-like" any ROM appears based on multiple characteristics rather than relying on a single metric. The weights prioritize opcodes and graphics capability (TIA) as the most important indicators, with control flow and I/O capability as secondary factors.

This analysis revealed that my initial "gut feeling" thresholds were laughably wrong. I was looking for ROMs with 5+ TIA accesses when real games average 190. I was looking for 3+ branches when real games average 457.

The calibration was crucial - it let me set thresholds based on actual data rather than guesses, targeting different percentiles of real games depending on how selective I wanted to be.

### Suggested Thresholds for Random Generation

Based on this analysis, here are three threshold sets targeting different selectivity levels. I should be able to generate the 'Easy' ROMs quickly, but it's doubtful they'll be very good games. Games with the 'Medium' difficulty of being generated should be more game-like, but generated less frequently than the 'Easy' games. 'Hard' games will come along once in a blue moon, but you might find _Adventure_ in there.

| Difficulty | Opcode % | TIA | RIOT | Branches | Jumps | Unique | Score | Target |
|------------|----------|-----|------|----------|-------|--------|-------|---------|
| **Easy** | 66% | 51 | 1 | 177 | 37 | 125 | 0.80 | Bottom 5% |
| **Medium** | 70% | 66 | 1 | 200 | 54 | 129 | 0.81 | Bottom 10% |
| **Hard** | 74% | 103 | 2 | 296 | 76 | 137 | 0.82 | Bottom 25% |

Since even the 'Easy' thresholds still require finding ROMs in the bottom 5% of real games, I needed to search millions of candidates to find anything promising. Fortunately, analyzing 4KB ROM images is exactly the kind of embarrassingly parallel problem GPUs excel at.

## CUDA Search

My GTX 1070 has 1,920 CUDA cores compared to my CPU's 8 cores - that's a 240x difference in parallel processing units. More importantly, each CUDA core can independently generate and analyze a ROM simultaneously. Instead of generating ROMs sequentially and passing them through a pipeline, I can generate a million ROMs in parallel, analyze them all at once, and only transfer the promising candidates back to the CPU.

The CUDA implementation moves all the heuristics directly onto the GPU. Each thread generates one 4KB ROM using CUDA's random number generator, then immediately applies the same analysis pipeline: counting valid opcodes, detecting TIA/RIOT register accesses, finding branch patterns, and calculating the composite score. The beauty of this approach is that a million ROM analyses happen in parallel rather than sequence.


[back](../)
