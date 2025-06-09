---
layout: default
title: "Finite Atari Machine"
description: "A project to generate and evaluate every possible Atari 2600 ROM"
keywords: ["Atari 2600", "ROM generation", "6502 emulator", "procedural generation", "Brian Benchoff"]
author: "Brian Benchoff"
date: 2025-06-06
last_modified_at: 2001-09-11
image: "/images/FiniteAtari/FiniteAtariCard.png"
---
<!-- ── Finite Atari Machine banner ── -->
<div class="fam-banner">
  <img
    src="/images/FiniteAtari/FiniteAtariBanner.png"
    alt="Finite Atari Machine banner"
    class="fam-banner__img"
  >
  <h1 class="fam-banner__title">Finite&nbsp;Atari&nbsp;Machine</h1>
</div>

<style>
  .fam-banner {
    position: relative;
    width: 100%;
    margin: 0 0 1.5rem;
    overflow: hidden;
    line-height: 0;
    border-radius: 0.5rem;
  }

  .fam-banner__img {
    width: 100%;
    height: auto;
    display: block;
    filter: brightness(65%);
  }

  .fam-banner__title {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 0;
    font-size: clamp(1.4rem, 5vw, 3rem);
    letter-spacing: 0.08em;
    color: #fff;
    text-shadow:
      0 0 6px rgba(0,0,0,.9),
      0 0 12px rgba(255,64,255,.8),
      0 0 24px rgba(0,255,255,.6);
    /* background & border removed */
  }

  @media (prefers-color-scheme: dark) {
    .fam-banner__img { filter: brightness(55%); }
  }
</style>


This project generated around 300 Billion individual 4kB files of random data. These files were winnowed down to about 10,000 through some heuristics gleaned from the complete collection of Atari ROM files. Finally, a classifier system scanned them using an Atari 2600 emulator to see if any of these random files were actually an Atari game. This project answers a question no one asked, no one wanted, and is a massive waste of resources: What if I shove a billion monkeys in a GPU and asked them to write a game for the Atari 2600?

Thanks to advances in GPUs, AI, and machine learning, we can now (very quickly) write a Python script that dumps garbage into 4KB ROMs and asks, *"does this look like a game?"*  This isn’t nostalgia, because my first console was an NES. This is about exploring something unimaginably vast and seeing if anything weird falls out.

## Results First

Because no one reads below the fold, here’s an interactive emulator showcasing the most interesting Atari ROMs discovered. There’s no genetic algorithm here; just billions of random files run through an emulator. These are the best of the weird:

<div style="width:100%; max-width:900px; margin-inline:auto">
  <p style="margin:0 0 .5rem;
            font-size:.875rem;
            font-weight:600;
            color:#d73a49;">
    <strong>WARNING: turn your volume down. There’s a bug in <a href="https://github.com/EmulatorJS/EmulatorJS">EmulatorJS</a>.</strong>
  </p>

  <div style="
        width:100%;
        height:80vh;               /* desktop/tablet height */
        max-height:calc(100dvh - 4rem); /* full height on mobile minus a little */
      ">
    <iframe src="/assets/pages/finiteatarirunner.html"
            width="100%" height="100%"
            frameborder="0" loading="lazy"
            allowfullscreen
            style="display:block"></iframe>
  </div>
</div>

## Problem Scope

Assume each Atari 2600 cartridge is a 4 kilobyte chunk of data. It's a maximum of 4096 bytes, or 32,768 bits. That means there are $2^{32768}$ possible ROMs. For perspective:

* That’s $10^{10159}$ potential Atari games.
* There are about $10^{20}$ grains of sand on Earth.
* And roughly $10^{80}$ protons in the visible universe.

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
</code>

Random data has about a 59% chance of being a valid opcode (151 out of 256 possible bytes). Real games should do much better than that. The structure of an Atari ROM has the first kilobyte as executable, with everything after that being data and graphics data. Analysing the full set commercial Atari ROMs reveals $>$ 75% of the first kilobyte should be opcodes.

**Reset Vector Tomfoolery** Atari ROMs need a valid reset vector to the code's entry point. In other words, the last two bytes of the code should be between `0xF000` and `0xFFFF`. I can cheat on this by generating a 4k ROM minus two bytes, and then try every possible reset vector during emulation. _That's only 4096 times as much work_.

**Input _and_ Output?!** I can look for access to the TIA (Television Interface Adapter) to see if it will output to the screen and the RIOT (RAM-I/O-Timer) to see if it will use any input or output. The TIA handles all graphics and sound, and does so with extremely specific patterns, discovered by looking at the patterns in all real Atari games. The pattern analysis revealed:

* 90% use zero page addressing (`STA $02`, `STX $06`, `STY $00`)
* 80% are STA instructions, 10% STX, 10% STY
* Indexed addressing is common (`STA $00,X`, `STY $10,X`)
* WSYNC ($02) dominates - 18.8% of all TIA accesses (games constantly sync to the TV)

The most critical TIA registers games actually use:
<code>
$02 (WSYNC) - 18.8% of accesses - TV synchronization
$1B (GRP0)  - 8.4% of accesses  - Player 0 graphics  
$1C (GRP1)  - 7.0% of accesses  - Player 1 graphics
$2A (HMOVE) - 4.9% of accesses  - Horizontal movement
$0E/$0F (PF1/PF2) - 7.8% combined - Playfield graphics
</code>

Instead of blindly counting any store to the TIA range `$00-$2F`, I look for the specific instruction patterns real games use.

The RIOT registers are more complex due to memory mirroring. The Atari 2600 uses incomplete address decoding, causing the same hardware to appear at multiple addresses. The RIOT chip contains:

* Timer registers: Canonical addresses `$0280-$0287`, but due to mirroring also appear at `$80-$87`, `$180-$187`, `$380-$387`, etc.
* I/O registers: Canonical addresses `$0294-$0297`, also mirrored at `$94-$97`, `$194-$197`, etc.

In actual ROM files, you'll find programmers using the shorter mirrored addresses because they're more efficient. A typical instruction like `STA $80` (set timer) appears in the ROM as `85 80    ; STA $80 (zero page addressing)` rather than the wasteful `8D 80 02    ; STA $0280 (absolute addressing)`. My heuristics look for this.

**Branches and Jumps** We're looking for games here, and every game has loops and structure. These show up as branch instructions (for loops and conditionals) and jump instructions (for subroutines and major flow control). These show up as backwards branches (loops) and forward branches (conditionals).

* Branch opcodes: `0x10, 0x30, 0x50, 0x70, 0x90, 0xB0, 0xD0, 0xF0`
* Jump opcodes: `0x4C` (JMP absolute), `0x6C` (JMP indirect), `0x20` (JSR - jump to subroutine)

Take all of this together, and we can assign some heuristics to validate what counts as a "game".

## Calibrating Against Reality

To validate these heuristics, I analyzed the [Atari 2600 Full ROM Collection](https://archive.org/details/Atari2600FullRomCollectionReuploadByDataghost) from the Internet Archive - all 1,530 commercial Atari ROMs ever made. A Python script analyzed each ROM to count the incidence of these heuristics in commercial games.

### ROM Characteristics by Metric

Here's what real Atari games actually look like:

| Metric                 | Min   | 5th % | 10th % | 25th % | Median | 75th % | 90th % | 95th % | Max   | Mean  |
|------------------------|-------|-------|--------|--------|--------|--------|--------|--------|-------|-------|
| **Valid Opcodes (%)**  | 42.1% | 65.6% | 70.0%  | 74.0%  | 76.0%  | 77.9%  | 79.6%  | 81.4%  | 90.7% | 74.8% |
| **TIA Accesses**       | 12    | **93**| 118    | 186    | 282    | 398    | 567    | 743    | 2,847 | **341**|
| **RIOT Accesses**      | 3     | **34**| 47     | 72     | 111    | 158    | 219    | 287    | 891   | **134**|
| **RIOT Timer Access**  | 1     | 22    | 31     | 51     | 78     | 115    | 161    | 211    | 723   | **95** |
| **RIOT I/O Access**    | 0     | 8     | 12     | 18     | 28     | 41     | 58     | 74     | 201   | **33** |
| **Branch Instructions**| 28    | 177   | 200    | 296    | 364    | 528    | 789    | 1,066  | 5,928 | 457   |
| **Jump Instructions**  | 3     | 37    | 54     | 76     | 111    | 172    | 260    | 351    | 1,495 | 142   |
| **Unique Opcodes**     | 29    | 125   | 129    | 137    | 143    | 148    | 151    | 151    | 151   | 141   |


### Instruction Distribution
- **STA (Store A)**: 71.8% - Writing graphics data, colors, positions
- **STX (Store X)**: 9.3% - Often used for indexed operations  
- **STY (Store Y)**: 8.5% - Similar to STX patterns
- **LDA (Load A)**: 6.7% - Games also *read* from TIA (collision detection, etc.)
- **Other**: 3.7% - Indexed addressing, absolute mode

### Addressing Modes
- **Zero page**: 82.1% - `STA $02`, `STX $1B` (fastest, most common)
- **Zero page indexed**: 13.2% - `STA $00,X`, `STY $10,X` (sprite positioning)
- **Absolute**: 4.7% - `STA $001B` (rare, but exists)

### Most Accessed TIA Registers
```
$02 (WSYNC) - 18.8% - TV horizontal sync (critical timing)
$1B (GRP0)  - 8.4%  - Player 0 graphics data
$1C (GRP1)  - 7.0%  - Player 1 graphics data  
$2A (HMOVE) - 4.9%  - Horizontal movement strobe
$0E (PF1)   - 4.1%  - Playfield graphics register 1
$0F (PF2)   - 3.7%  - Playfield graphics register 2
```

### RIOT Pattern Analysis

RIOT usage splits into two clear categories:

**Timer Operations (78% of RIOT usage)**
- **Registers**: `$80-$87` (1T, 8T, 64T, 1024T intervals plus timer read)
- **Purpose**: Timing loops, delays, frame counting
- **Pattern**: Write to set timer, read `$84` to check status

**I/O Operations (22% of RIOT usage)**
- **Registers**: `$94-$97` (joystick/paddle inputs, console switches)
- **Purpose**: Reading player input, detecting game reset
- **Pattern**: Mostly reads (`LDA $94`), occasional writes for configuration


### Composite Scoring (Updated)

The corrected composite score uses realistic weights based on actual game analysis:

```
Score = (Opcode Ratio × 0.25) + 
        (min(TIA_Accesses/150, 1.0) × 0.30) + 
        (min(RIOT_Accesses/50, 1.0) × 0.20) + 
        (min(Branches/200, 1.0) × 0.15) + 
        (min(Jumps/40, 1.0) × 0.10)
```

Real games scored between 0.393 and 1.004, with an average of 0.853. This composite score helps rank how "game-like" any ROM appears based on multiple characteristics rather than relying on a single metric. The weights prioritize opcodes and graphics capability (TIA) as the most important indicators, with control flow and I/O capability as secondary factors.

## Mining Atari Games

The first implementation of this project was extremely simple -- a single thread Python script that generated 4kB minus two bytes of random data, counted the number of branches, jumps, the number of valid opcodes, backwards branches (or a loop), and the number of vectors pointing to the ROM. This was very slow, around 300-400 ROMs checked per second.

This is a massively parallel search, though. My GTX 1070 (I know, except I exclusively play TF2, Rocket League, and Kerbal Space Program, [nvidia plz gib H200 + SXM5 PCIe carrier board](https://bbenchoff.github.io/pages/SXM2PCIe.html)) has 1,920 CUDA cores compared to my CPU's 20 cores - that's almost 100x difference in parallel processing units. More importantly, each CUDA core can independently generate and analyze a ROM simultaneously. Instead of generating ROMs sequentially and passing them through a pipeline, I can generate a million ROMs in parallel, analyze them all at once, and only transfer the promising candidates back to the CPU.

The CUDA implementation moves all the heuristics directly onto the GPU. Each thread generates one 4KB ROM using CUDA's random number generator, then immediately applies the same analysis pipeline: counting valid opcodes, detecting TIA/RIOT register accesses, finding branch patterns, and calculating the composite score. This was written with the the CuPy library:

```python
"""
CUDA Atari ROM Generator
"""

import cupy as cp
import numpy as np
import time
from pathlib import Path

# Constants
ROM_SIZE = 4094  # Reset vector tested later
BATCH_SIZE = 1024 * 256

# Discovery thresholds based on observed patterns
OPCODE_THRESHOLD = 0.58
TIA_THRESHOLD = 50
RIOT_THRESHOLD = 13
BRANCH_THRESHOLD = 150
JUMP_THRESHOLD = 37
INSTRUCTION_VARIETY = 100
MIN_SCORE = 0.52

# Valid 6502 opcodes (151 total)
VALID_OPCODES = np.array([
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
], dtype=np.uint8)

# Control flow opcodes
BRANCH_OPCODES = np.array([0x10, 0x30, 0x50, 0x70, 0x90, 0xB0, 0xD0, 0xF0], dtype=np.uint8)
JUMP_OPCODES = np.array([0x4C, 0x6C, 0x20], dtype=np.uint8)

def create_lookup_tables():
    """Create GPU lookup tables for ROM analysis"""
    valid_lut = cp.zeros(256, dtype=cp.bool_)
    valid_lut[VALID_OPCODES] = True
    
    branch_lut = cp.zeros(256, dtype=cp.bool_)
    branch_lut[BRANCH_OPCODES] = True
    
    jump_lut = cp.zeros(256, dtype=cp.bool_)
    jump_lut[JUMP_OPCODES] = True
    
    # TIA instruction lookups
    tia_store_lut = cp.zeros(256, dtype=cp.bool_)
    tia_store_lut[[0x85, 0x86, 0x84, 0x95, 0x96, 0x94]] = True
    
    tia_load_lut = cp.zeros(256, dtype=cp.bool_)
    tia_load_lut[[0xA5, 0xA6, 0xA4, 0xB5, 0xB6, 0xB4]] = True
    
    tia_abs_lut = cp.zeros(256, dtype=cp.bool_)
    tia_abs_lut[[0x8D, 0x8E, 0x8C, 0xAD, 0xAE, 0xAC]] = True
    
    # RIOT instruction lookups
    riot_access_lut = cp.zeros(256, dtype=cp.bool_)
    riot_access_lut[[0x85, 0x86, 0x84, 0xA5, 0xA6, 0xA4]] = True
    
    # Address range masks
    tia_range_mask = cp.arange(256, dtype=cp.uint8) <= 0x2F
    riot_timer_mask = (cp.arange(256, dtype=cp.uint8) >= 0x80) & (cp.arange(256, dtype=cp.uint8) <= 0x87)
    riot_io_mask = (cp.arange(256, dtype=cp.uint8) >= 0x94) & (cp.arange(256, dtype=cp.uint8) <= 0x97)
    
    return {
        'valid': valid_lut,
        'branch': branch_lut,
        'jump': jump_lut,
        'tia_store': tia_store_lut,
        'tia_load': tia_load_lut,
        'tia_abs': tia_abs_lut,
        'riot_access': riot_access_lut,
        'tia_range': tia_range_mask,
        'riot_timer': riot_timer_mask,
        'riot_io': riot_io_mask
    }

def analyze_roms(roms, lut):
    """Analyze ROMs for game-like patterns"""
    batch_size = roms.shape[0]
    
    # Opcode analysis
    valid_opcodes_count = cp.sum(lut['valid'][roms], axis=1)
    opcode_ratio = valid_opcodes_count.astype(cp.float32) / ROM_SIZE
    
    # Control flow analysis
    branch_count = cp.sum(lut['branch'][roms], axis=1)
    jump_count = cp.sum(lut['jump'][roms], axis=1)
    
    # TIA analysis
    tia_accesses = cp.zeros(batch_size, dtype=cp.int32)
    
    # Zero page addressing
    tia_store_zp = lut['tia_store'][roms[:, :-1]] & lut['tia_range'][roms[:, 1:]]
    tia_load_zp = lut['tia_load'][roms[:, :-1]] & lut['tia_range'][roms[:, 1:]]
    tia_zp_total = cp.sum(tia_store_zp | tia_load_zp, axis=1)
    tia_accesses += tia_zp_total
    
    # Absolute addressing
    tia_abs_positions = lut['tia_abs'][roms[:, :-2]]
    tia_abs_targets = lut['tia_range'][roms[:, 1:-1]] & (roms[:, 2:] == 0x00)
    tia_abs_total = cp.sum(tia_abs_positions & tia_abs_targets, axis=1)
    tia_accesses += tia_abs_total
    
    # RIOT analysis
    riot_accesses = cp.zeros(batch_size, dtype=cp.int32)
    
    # Timer access
    riot_timer_positions = lut['riot_access'][roms[:, :-1]]
    riot_timer_targets = lut['riot_timer'][roms[:, 1:]]
    riot_timer_hits = cp.sum(riot_timer_positions & riot_timer_targets, axis=1)
    riot_accesses += riot_timer_hits
    
    # I/O access
    riot_io_positions = lut['riot_access'][roms[:, :-1]]
    riot_io_targets = lut['riot_io'][roms[:, 1:]]
    riot_io_hits = cp.sum(riot_io_positions & riot_io_targets, axis=1)
    riot_accesses += riot_io_hits
    
    # Unique opcode counting in first 1KB (code section)
    unique_opcodes = cp.zeros(batch_size, dtype=cp.int32)
    first_kb = roms[:, :1024]  # First 1KB where code typically resides
    
    # Count unique valid opcodes in the code section
    for opcode in VALID_OPCODES:
        has_opcode = cp.any(first_kb == opcode, axis=1)
        unique_opcodes += has_opcode.astype(cp.int32)
    
    # Composite score
    scores = (
        opcode_ratio * 0.25 + 
        cp.minimum(tia_accesses / 150.0, 1.0) * 0.30 +
        cp.minimum(riot_accesses / 50.0, 1.0) * 0.20 +
        cp.minimum(branch_count / 200.0, 1.0) * 0.15 +
        cp.minimum(jump_count / 40.0, 1.0) * 0.10
    )
    
    # Promising ROM detection
    promising = (
        (opcode_ratio >= OPCODE_THRESHOLD) &
        (tia_accesses >= TIA_THRESHOLD) &
        (riot_accesses >= RIOT_THRESHOLD) &
        (branch_count >= BRANCH_THRESHOLD) &
        (jump_count >= JUMP_THRESHOLD) &
        (unique_opcodes >= INSTRUCTION_VARIETY) &
        (scores >= MIN_SCORE)
    )
    
    return {
        'scores': scores,
        'opcode_ratio': opcode_ratio,
        'tia_accesses': tia_accesses,
        'riot_accesses': riot_accesses,
        'branch_count': branch_count,
        'jump_count': jump_count,
        'unique_opcodes': unique_opcodes,
        'promising': promising
    }

def save_promising_rom(rom_data, score, rom_id, output_dir):
    """Save promising ROM with: number_score_timestamp.bin"""
    timestamp = int(time.time())
    filename = f"{rom_id:06d}_{score:.3f}_{timestamp}.bin"
    filepath = output_dir / filename
    
    with open(filepath, 'wb') as f:
        f.write(rom_data.tobytes())
    
    return filename

def main():
    print("Finite Atari Machine - Streamlined CUDA Generator")
    print("=" * 60)
    print(f"Batch size: {BATCH_SIZE:,} ROMs per batch")
    print(f"ROM size: {ROM_SIZE:,} bytes")
    print()
    print("Thresholds:")
    print(f"  Opcodes: {OPCODE_THRESHOLD:.1%}")
    print(f"  TIA: {TIA_THRESHOLD}+")
    print(f"  RIOT: {RIOT_THRESHOLD}+")
    print(f"  Branches: {BRANCH_THRESHOLD}+")
    print(f"  Jumps: {JUMP_THRESHOLD}+")
    print(f"  Unique opcodes: {INSTRUCTION_VARIETY}+")
    print(f"  Min score: {MIN_SCORE:.2f}")
    print()
    
    # GPU info
    try:
        gpu_props = cp.cuda.runtime.getDeviceProperties(0)
        gpu_name = gpu_props['name'].decode()
        total_mem = cp.cuda.runtime.memGetInfo()[1] // 1024**2
        print(f"GPU: {gpu_name}")
        print(f"Memory: {total_mem:,} MB")
    except Exception:
        print("GPU: CuPy device detected")
    
    print("\nInitializing lookup tables...")
    
    # Setup
    output_dir = Path("finite_atari_roms")
    output_dir.mkdir(exist_ok=True)
    
    lookup_tables = create_lookup_tables()
    
    # Statistics
    total_generated = 0
    promising_found = 0
    start_time = time.time()
    last_report = start_time
    best_score_ever = 0.0
    
    print("Starting ROM generation...")
    print("=" * 60)
    
    try:
        while True:
            batch_start = time.time()
            
            # Generate batch of ROMs
            roms = cp.random.randint(0, 256, size=(BATCH_SIZE, ROM_SIZE), dtype=cp.uint8)
            
            # Analyze ROMs
            analysis = analyze_roms(roms, lookup_tables)
            
            # Track best score
            current_best = float(cp.max(analysis['scores']))
            if current_best > best_score_ever:
                best_score_ever = current_best
            
            # Check for promising ROMs
            promising_indices = cp.where(analysis['promising'])[0]
            
            if len(promising_indices) > 0:
                # Save promising ROMs
                promising_roms = cp.asnumpy(roms[promising_indices])
                promising_scores = cp.asnumpy(analysis['scores'][promising_indices])
                
                for i in range(len(promising_indices)):
                    filename = save_promising_rom(
                        promising_roms[i], promising_scores[i], promising_found, output_dir
                    )
                    promising_found += 1
            
            total_generated += BATCH_SIZE
            batch_time = time.time() - batch_start
            
            # Progress reporting
            current_time = time.time()
            if current_time - last_report >= 4:
                # Get best ROM stats for this batch
                scores = cp.asnumpy(analysis['scores'])
                best_idx = np.argmax(scores)
                best_opcodes = float(analysis['opcode_ratio'][best_idx])
                best_tia = int(analysis['tia_accesses'][best_idx])
                best_riot = int(analysis['riot_accesses'][best_idx])
                best_branches = int(analysis['branch_count'][best_idx])
                best_jumps = int(analysis['jump_count'][best_idx])
                
                elapsed = current_time - start_time
                rate = total_generated / elapsed
                success_rate = promising_found / total_generated * 100 if total_generated > 0 else 0
                
                print(f"\rGenerated: {total_generated:,} | Found: {promising_found} | "
                      f"Success: {success_rate:.8f}% | Rate: {rate:,.0f}/sec | "
                      f"Best: {best_score_ever:.3f} | "
                      f"Op:{best_opcodes:.1%} TIA:{best_tia} RIOT:{best_riot} Br:{best_branches} Jmp:{best_jumps}", 
                      end="", flush=True)
                
                last_report = current_time
    
    except KeyboardInterrupt:
        elapsed = time.time() - start_time
        rate = total_generated / elapsed
        success_rate = promising_found / total_generated * 100 if total_generated > 0 else 0
        
        print(f"\n\nStopped after {elapsed:.1f} seconds")
        print(f"Total ROMs generated: {total_generated:,}")
        print(f"Promising ROMs found: {promising_found}")
        print(f"Success rate: {success_rate:.8f}%")
        print(f"Average rate: {rate:,.0f} ROMs/second")
        print(f"Best score achieved: {best_score_ever:.4f}")
        print(f"Results saved in: {output_dir}")

if __name__ == "__main__":
    main()

```

...Which gave me a whopping 60,000 'random' ROMs checked per second. With the heuristics, I was finding one 'promising' ROM for every 2.59 million ROMs generated. It's one ROM per minute. And the best part is all of these ROMs could be assumed to do _something_ if I ran them in an emulator.

## First Results from 10,000 ROMs

After checking _billions and billions_ of potential ROMs, I had a collection of about 10,000 that passed the heuristics laid out above. I could move onto the next step: checking them all in an emulator. 

I tried two methods of running these 10,000 ROMs in an emulator to see if there was anything 'game-like'. The first was a classifier, trained on ~1,500 real commercial Atari ROMs (positives) and ~1,500 GPU-generated random ROMs (negatives). These trained a model (Random Forest) with features ranging from "Would the emulator execute the ROM", to more pertinate features such as, "how many times did the registers of the TIA change during 2 seconds of execution time."

This is, academically, the correct way to do this. By scripting in output from [Stella](https://stella-emu.github.io/), and [MAME](https://www.mamedev.org/), I was able to build a classifier that would tell me if a random ROM _could_ run on an Atari. Unfortunately, it didn't work. The top-scoring results were mostly all black screens when run on an emulator. This made sense when I looked at the model. The most important features were:

| Feature             | Value    |
|---------------------|----------|
| execution_time      | 0.9847   |
| output_lines        | 0.0086   |
| stdout_length       | 0.0067   |
| crashed             | 0.0000   |
| stderr_length       | 0.0000   |
| video_indicators    | 0.0000   |
| audio_indicators    | 0.0000   |
| tia_activity        | 0.0000   |
| game_indicators     | 0.0000   |
| error_indicators    | 0.0000   |

It was obvious what was happening: I was only selecting for ROMs that _ran_, not ROMs that _did anything interesting_. A quick check showed they were just booting into an infinite loop; After booting, there would be a few instructions that did nothing until eventually jumping back to somewhere around the reset vector.

In short, a classifier on the actual machine code was worthless. Or my training data was. But then again, there’s no training set for Atari games that almost work — just masterpieces and garbage.

## Second Results, Finding Anything Interesting


## GPU to Emulator Pipeline


## What I found

![A rom, running](/images/FiniteAtari/FiniteAtari1.gif)
![A rom, running](/images/FiniteAtari/FiniteAtari2.gif)

Blah blah blah

![A rom, running](/images/FiniteAtari/FiniteAtari3.gif)

## A Real, Actual, Protogame

Despite my entire pipeline being focused on generating visual output, I discovered something that is more than just weird visual ouput. The ROM I'm calling `51014` ([here's a link](/assets/pages/roms/5101496f45e8b74244cc8134e590bfb3464eb669.bin) to the actual ROM file) displays some game-like behavior. It's an infinite loop of visual output that responds to human input. Take a look at the .gifs below:

<style>
  /* Responsive side-by-side figures */
  .fam-images {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
  }

  .fam-images figure {
    flex: 1 1 300px;
    max-width: 300px;
    margin: 0;
    text-align: center;
  }

  .fam-images img {
    display: block;
    width: 100%;
    height: auto;
  }

  .fam-images figcaption {
    margin-top: 0.5em;
    font-size: 0.9em;
    color: #666;
  }
</style>

<div class="fam-images">
  <figure>
    <img
      src="/images/FiniteAtari/ActualGame1.gif"
      alt="51014 without using the controller"
      loading="lazy"
    >
    <figcaption>51014 without using the controller</figcaption>
  </figure>

  <figure>
    <img
      src="/images/FiniteAtari/ActualGame2.gif"
      alt="5104, pressing Up on the joystick a few times"
      loading="lazy"
    >
    <figcaption>5104, pressing Up on the joystick a few times</figcaption>
  </figure>
</div>

Rom `51014` consists of a yellow background with two static vertical red stripes on the screen. There is also a third stripe -- actually a pair of red stripes -- that is not static; it looks like it's tearing every few scanlines. By pressing Up on the joystick, that torn pair of stripes stays still. It's input being translated into visual output.

It's certainly not impressive from a programming point of view, but considering the fact it was generated _only out of properly filtering random data_ is crazy. Combine a few more of these into a single rom and you have a game!

## Future Work?

I targeted the Atari 2600 for a reason. It's dead simple, there are no memory mappers or program and character ROMs, and it doesn't have the 'Nintendo Logo copy protection' the original Game Boy has. Basically, if you throw random bytes at an Atari, _something_ is going to fall out, which I have proven here.

But others have suggested other platforms to target, like the NES or Game Boy. These will not work as well as the 2600 for a few reasons.

**The NES** is much more complex, with memory mappers required for nearly any game. You can't just drop random bytes into the ROM and expect anything. Rather, you _could_ but it would take much longer than waiting for an Atari game. The NES uses split character and program ROMs for code and graphics. These are stored separately. You could dump garbage into a CHR ROM while keeping the PRG of Tetris, but you'd just get static. Reverse it with the PRG of Mario 3 and maybe you'll see a quarter of a Mario sprite flicker once.

**The Game Boy** requires a 48-byte Nintendo logo at a hardcoded location in the ROM. Sure, you could brute-force this by just slapping it in after being generated, but there's a whole boot ROM that must complete successfully before anything happens. And there's bank switching chips to consider.

In contrast, the Atari 2600 is astonishingly stupid. It boots straight into ROM with zero safeguards. It will send video after nine instructions. _Something_ is going to fall out if you shake it enough.

## A Conclusion

<figure style="float: right; margin: 0 0 1em 1em; max-width: 300px;">
  <img src="/images/blurst.png" alt="It was the best of times, it was the blurst of times?" style="width: 100%;">
  <figcaption style="font-size: 0.9em; text-align: center; color: #666;">
    It was the best of times, it was the blurst of times?
  </figcaption>
</figure>

The idea that I could pull random video games out of the ether is absurd at first, but I knew this would work before I began. I can describe this in both as a philosophical / thought experiment, and as a technical inevitability.


What I'm doing is not Infinite Monkey Theorem. A million monkeys will eventually produces the works of Shakespeare, that's true, but it would take longer than any time the Universe has left. I'm not asking monkeys to produce the works of Shakespeare, I'm asking them to produce _any_ work. Producing the word 'banana' in the standard ASCII character set is just $\frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} = \frac{1}{281{,}474{,}976{,}710{,}656}$ or once about every 300 trillion monkeys. I'm not looking for the word 'banana', I'm just looking for _a word_. Just any word in the dictionary. I don't care if I'm not generating _Yar's Revenge_, I just want something that runs on an Atari. That's significantly easier. 

The _technical_ reason why I knew this would work is the simplicity of the Atari. The simplest thing you could ever create on an Atari looks something like this:

<pre class="no-collapse"><code>
; Program starts at $F000

F000: A9 84       ; LDA #$84        - Load a color value (red/orange)
F002: 85 09       ; STA $09         - Store to COLUBK (background color register)
F004: 85 02       ; STA $02         - Store to WSYNC (wait for horizontal sync)
F006: 4C 04 F0    ; JMP $F004       - Jump back to the WSYNC line (infinite loop)
</code></pre>

That's nine instructions. In fact, we can do the math on that, too. It would have to start with `A9`, and then it could be any one of 128 total colors. Then it's `85 09` to store the background color, `85 02` to wait for `WSYNC`, and `4C 04 F0` for the jump back to the previous instruction. It's $\frac{1}{256} \times \frac{128}{256} \times \frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} \times \frac{1}{256} = \frac{1}{36{,}893{,}488{,}147{,}419{,}103{,}232}$, or about 36 Pentillion. There are nearly infinite variations on this code though, so after a few Billion ROMs tested, I'm bound to get _something_ for my efforts.

You can find all the code for this in the [Finite Atari Machine repo](https://github.com/bbenchoff/FiniteAtariMachine)


[back](../)
