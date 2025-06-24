---
layout: default
title: "Babelscope"
description: "A massively parallel emulator framework for computational space exploration: Finding Quicksort, games, and algorithms in random machine code"
keywords: ["GPU", "Emulation", "CHIP-8", "ROM generation", "procedural generation", "computational phenomenology", "Brian Benchoff"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2022-06-04
image: "/images/default.jpg"
---
# Babelscope

<i><b>"Computer science is no more about telescopes than astronomy is about computers"  -- Bizzaro Dijkstra</b></i>

<div class="abstract" style="margin: 2rem 3rem; padding: 1.5rem 2rem; font-style: italic; color: #666; background-color: #fafafa; font-size: 0.95rem; line-height: 1.7; border-radius: 4px;">
   The Babelscope is a massively parallel emulation framework designed to explore the computational space of random programs. Building on the <a href="https://bbenchoff.github.io/pages/FiniteAtari.html">Finite Atari Machine</a>, this project generates billions of random CHIP-8 ROMs and executes them simultaneously on GPU hardware to catalog emergent behaviors. This project conducts an exhaustive survey of the program space looking for anything that produces interesting visual output, response to input, or exhibits complex computational patterns, from graphical glitches to sorting algorithms. Several interesting programs were found in this random computational space, including XXXXXXXXXTODO: WRITE SOME STUFF HERE.
</div>

## Introduction

This is the followup to my previous project, the [Finite Atari Machine](https://bbenchoff.github.io/pages/FiniteAtari.html). With the Finite Atari Machine, I used a GPU to generate billions and billions of Atari 2600 ROMs filled with random data that conformed to some heuristics gleaned from commercially released Atari games. I found some interesting stuff, including a 'protogame' that produced changing visual output dependent on player input.

This project is the next step. Instead of merely generating random ROMs in a GPU and checking results in an emulator, we build a massively parallel framework to generate billions of ROMs and test them all with emulation. Like the Finite Atari Machine project, I found interesting visual output and 'protogames' that respond to user input. The parallel emulation framework makes this vastly more interesting; with this technique I was also able to find interesting random programs with applications to Computer Science.

## Technical Background and Reasoning

While the Finite Atari Machine showed it was possible to find interesting objects in the enormous space of random programs, this technique had drawbacks. I was limited by heuristics, and there are trivial counterexamples for an 'interesting' program that would not pass these heuristics. A very minimal program can be constructed that outputs interesting video -- it can be done in just 32 bytes, even -- but this program would not pass the heuristics test. For example, this program creates an animated color pattern on the Atari, but would fail all heuristic tests:

<pre class="no-collapse"><code>; Program starts at $F000
LDA #$00   ; Start with color 0 / black 
STA $2C    ; Set background color
INC        ; Increment accumulator
JMP $F002  ; Jump to set background color
</code></pre>

To find the population of interesting ROMs, you need to run them all. This is the [halting problem](https://en.wikipedia.org/wiki/Halting_problem) in action. There is no way to determine if a program will access the video output or will stop dead after a few clock cycles without actually running the entire program.

The solution to finding interesting bits of computation in random data would require a massively parallel emulation framework addressing two key limitations of the Atari 2600. The Atari is far too complex [even with a parallel emulation framework](https://github.com/NVlabs/cule), and the limited RAM of 128 bytes is much too small for anything interesting to drop out. This led me to look for a better platform for this project.

The answer is [CHIP-8](https://en.wikipedia.org/wiki/CHIP-8). The CHIP-8 provides a stable video interface instead of the Atari's complex TIA timing requirements and NTSC waveform generation. The CHIP-8 also provides 4kB of directly addressable RAM compared to the Atari's disjointed memory model of 4kB of ROM and 128 bytes of RAM. Most important for this project, the CHIP-8 is ideal for GPU parallelization. The architecture makes it straightforward to instrument the internal state of the system during emulation.

The goal of this project is to run billions of ROMs in parallel, just to see if something interesting happens. Because of my success with the Finite Atari Machine, this is somewhat of a foregone conclusion, even if it might take a while. But the change to the CHIP-8 platform also allows me to ask a deeper question: If I pre-seed memory with structured data, will a random program ever sort it? Could something like quicksort be found in the program space? If I define a graph in memory -- a set of nodes and weighted edges -- will Dijkstra stumble out?

Here's the cool thing: Since I'm effectively doing an exhaustive search (limited by the heat death of the Universe), bubblesort and A* can be found in the program space if they can be expressed on the system at all. This raises the question: _what else is there waiting to be found?_

If this sounds somewhat familiar, you're right: it's effectively [A New Kind of Science](https://en.wikipedia.org/wiki/A_New_Kind_of_Science), but slightly modified. Stephen Wolfram's research involves studying how complex behaviors emerge from cellular automata and Turing machines using a systematic exploration of simple rule sets. The Babelscope inverts this approach entirely. Instead of starting with simple rules and seeing what emerges, I'm taking a complex system and looking at what random instances do. It's the difference between breeding finches and setting up a webcam next to a bird feeder. _Why_ this research has never been done is anyone's guess, but if I had to, I'd say Wolfram is more interested in getting a second element named after himself than doing anything cool.

## Technical Implementation
### Platform Choice

The first goal of this project is to build an emulator or interpreter that can be run at a massively parallel scale. For this, the choice of the CHIP-8 architecture becomes obvious in retrospect. The CHIP-8 has a number of advantages for this project over the Atari 2600. Of those:

* The CHIP-8 has a uniform instruction width. Every instruction is exactly two bytes. The Atari uses variable-length instructions, where each line of assembly can be one, two, or three bytes long. This simplifies decoding, and knowing when and by how much to increase the Program Counter.
* The CHIP-8 is a virtual machine. This is getting into the weeds a bit, but the Atari is hell for parallelization. Yes, it's been done with [CuLE](https://github.com/NVlabs/cule), but the Atari has instructions that run in two clock cycles, or four, or seven cycles, or something else. This is hell for running multiple instances on a GPU. The CHIP-8, on the other hand, can just... run. One instruction per tick. It's easy.
* The Atari races the beam. It is a device that generates NTSC (or PAL, or SEACAM) video. Even a 'headless' emulator would need to know where the back porch is, where the VBLANK is, count sixty eight clock cycles for each scanline, then another eight for the HBLANK. It's not a nightmare to emulate, but _man, I really don't want to do this_. The CHIP-8, on the other hand, is just a 64x32 pixel framebuffer that is much simpler to write to and decode.

So I had to write a CHIP-8 emulator following [Cowgod's Technical Reference](http://devernay.free.fr/hacks/chip8/C8TECH10.HTM). I want this to be portable so anyone can run it, and a 'ground truth' as a reference standard. For this, I'm using Python with tkinter. Think of this version as the 'development' branch. It's a single instance, it will never run on the GPU, but it will be helpful to debug generated ROMs.

This single-instance emulator is insufficient for running in a massive parallel emulation engine. I'll need another version that runs on a GPU. That's [CuPy](https://cupy.dev/). Unlike the single-instance Python version, this version will not have a GUI, although it will keep that framebuffer in memory. There's no interactive debugging, and _everything_ will be vectorized; I will be able to record everything that happens across ten thousand instances of emulators running in parallel.

### Python Implementation

<div class="side-image">
  <div class="side-text">
    <p>The single-instance development is a thousand or so lines of Python. Other than a 64x32 display, there's not much to it. There are counters in the window showing the Program Counter and Index register -- not that useful but fun to look at -- and a few other status labels showing how many instructions have been executed and whether or not the emulator has crashed or not.</p>
    <p>Getting this emulator _right_ was paramount. For this, I used a <a href="https://github.com/Timendus/chip8-test-suite">CHIP-8 Test Suite</a>. These are CHIP-8 programs that test the display, opcodes, flags, keypad, and all the quirks of the CHIP-8 platform. There are a few things I didn't implement. The CHIP-8 has a 'beep' instruction. I'm not implementing that because it's annoying and it really doesn't matter for this. I'm not implementing the 'SUPER-CHIP' or 'XO-CHIP' extensions, because a few of these extensions break the uniform instruction width of the CHIP-8 platform. With a little bit of work, my single-instance emulator passed all of these tests.</p>
  </div>
  <div class="side-image-container">
    <figure>
      <img src="/images/Bablescope/PythonTestSuite.png" alt="CHIP-8 emulator running Timendus' Chip-8 Test Suite">
      <figcaption>CHIP-8 emulator running Timendus' Chip-8 Test Suite</figcaption>
    </figure>
  </div>
</div>

The current Python implementation is available below, or [on Github](https://github.com/bbenchoff/Babelscope/blob/main/emulators/chip8.py)


```python
"""
CHIP-8 Emulator for Babelscope
The 'toy' version for the Bablescope.
Does not support massive parallelism or advanced features.
Focuses purely on emulation - ROM generation and analysis are handled elsewhere.
But hey you can use this to test ROMs or something.
"""

import cupy as cp
import numpy as np
from typing import Dict, Tuple, Optional, List, Union
import time
import tkinter as tk
from tkinter import Canvas
import logging
import os

# CHIP-8 System Constants
MEMORY_SIZE = 4096
DISPLAY_WIDTH = 64
DISPLAY_HEIGHT = 32
DISPLAY_PIXELS = DISPLAY_WIDTH * DISPLAY_HEIGHT
REGISTER_COUNT = 16
STACK_SIZE = 16
KEYPAD_SIZE = 16
PROGRAM_START = 0x200
FONT_START = 0x50
FONT_SIZE = 80

# CHIP-8 Font set (hexadecimal digits 0-F)
CHIP8_FONT = cp.array([
    0xF0, 0x90, 0x90, 0x90, 0xF0,  # 0
    0x20, 0x60, 0x20, 0x20, 0x70,  # 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0,  # 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0,  # 3
    0x90, 0x90, 0xF0, 0x10, 0x10,  # 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0,  # 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0,  # 6
    0xF0, 0x10, 0x20, 0x40, 0x40,  # 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0,  # 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0,  # 9
    0xF0, 0x90, 0xF0, 0x90, 0x90,  # A
    0xE0, 0x90, 0xE0, 0x90, 0xE0,  # B
    0xF0, 0x80, 0x80, 0x80, 0xF0,  # C
    0xE0, 0x90, 0x90, 0x90, 0xE0,  # D
    0xF0, 0x80, 0xF0, 0x80, 0xF0,  # E
    0xF0, 0x80, 0xF0, 0x80, 0x80   # F
], dtype=cp.uint8)

class Chip8Emulator:
    """
    Single-instance CHIP-8 emulator with display output capability.
    Can be used for testing known ROMs or analyzing individual instances.
    """
    
    def __init__(self, debug_file: str = None, quirks: dict = None):
        self.debug_file = debug_file
        self.debug_log = []
        
        # CHIP-8 Quirks configuration
        self.quirks = quirks or {
            'memory': True,      # Fx55/Fx65 increment I register  
            'display_wait': False, # Drawing waits for vblank (60fps limit) - DISABLED by default
            'jumping': True,     # Bnnn uses vX instead of v0
            'shifting': False,   # 8xy6/8xyE use vY or vX (False = use vX)
            'logic': True,       # 8xy1/8xy2/8xy3 reset vF to 0
        }
        
        # Display wait tracking
        self.last_draw_time = 0
        self.vblank_wait = False
        
        self.reset()
    
    def log_debug(self, message: str):
        """Log debug message to both console and file"""
        print(message)
        self.debug_log.append(message)
        
        if self.debug_file:
            with open(self.debug_file, 'a', encoding='utf-8') as f:
                f.write(message + '\n')
    
    def reset(self):
        """Reset the emulator to initial state"""
        self.memory = np.zeros(MEMORY_SIZE, dtype=np.uint8)
        self.display = np.zeros((DISPLAY_HEIGHT, DISPLAY_WIDTH), dtype=np.uint8)
        self.registers = np.zeros(REGISTER_COUNT, dtype=np.uint8)
        # FIXED: Use regular Python int for index_register to avoid overflow
        self.index_register = 0  # This should be a regular int, not uint8
        self.program_counter = PROGRAM_START
        self.stack_pointer = 0
        self.stack = np.zeros(STACK_SIZE, dtype=np.uint16)
        self.delay_timer = 0
        self.sound_timer = 0
        self.keypad = np.zeros(KEYPAD_SIZE, dtype=np.uint8)
        self.waiting_for_key = False
        self.key_register = 0
        
        # Load font into memory
        self.memory[FONT_START:FONT_START + FONT_SIZE] = cp.asnumpy(CHIP8_FONT)
        
        # Instrumentation
        self.stats = {
            'instructions_executed': 0,
            'display_writes': 0,
            'display_clears': 0,
            'sprite_collisions': 0,
            'memory_reads': 0,
            'memory_writes': 0,
            'timer_sets': 0,
            'sound_activations': 0,
            'key_checks': 0,
            'blocking_key_waits': 0,
            'jumps_taken': 0,
            'subroutine_calls': 0,
            'returns': 0,
            'stack_operations': 0,
            'register_operations': 0,
            'arithmetic_operations': 0,
            'logical_operations': 0,
            'random_generations': 0,
            'pixels_drawn': 0,
            'pixels_erased': 0,
            'unique_pixels_touched': 0,
            'display_updates': 0,
            'cycles_executed': 0
        }
        
        self.pixel_touched = np.zeros((DISPLAY_HEIGHT, DISPLAY_WIDTH), dtype=bool)
        self.crashed = False
        self.halt = False
    
    def load_rom(self, rom_data: Union[bytes, np.ndarray, str]):
        """Load a ROM into memory"""
        if isinstance(rom_data, str):
            with open(rom_data, 'rb') as f:
                rom_bytes = f.read()
        elif isinstance(rom_data, np.ndarray):
            rom_bytes = rom_data.tobytes()
        else:
            rom_bytes = rom_data
        
        if len(rom_bytes) > MEMORY_SIZE - PROGRAM_START:
            raise ValueError(f"ROM too large: {len(rom_bytes)} bytes, max {MEMORY_SIZE - PROGRAM_START}")
        
        # Load ROM starting at 0x200
        for i, byte in enumerate(rom_bytes):
            self.memory[PROGRAM_START + i] = byte
            
        print(f"Loaded ROM: {len(rom_bytes)} bytes")
        print(f"First instruction: 0x{self.memory[PROGRAM_START]:02X}{self.memory[PROGRAM_START+1]:02X}")
    
    def step(self):
        """Execute one instruction"""
        if self.crashed or self.halt:
            return False
        
        if self.waiting_for_key:
            self.stats['blocking_key_waits'] += 1
            return True
        
        # Fetch instruction
        if self.program_counter >= MEMORY_SIZE - 1:
            self.crashed = True
            return False
        
        # Convert to regular Python int to avoid numpy overflow issues
        high_byte = int(self.memory[self.program_counter])
        low_byte = int(self.memory[self.program_counter + 1])
        instruction = (high_byte << 8) | low_byte
        
        self.program_counter += 2
        self.stats['instructions_executed'] += 1
        
        # Decode and execute
        return self._execute_instruction(instruction)
    
    def run_interactive(self, show_display: bool = True, scale: int = 8, title: str = "CHIP-8 Interactive"):
        """Run the emulator in interactive mode with real-time input and display"""
        if show_display:
            self.show_display(scale=scale, title=title)
        else:
            # Non-GUI mode - just run continuously
            import time
            while not self.crashed and not self.halt:
                start_time = time.time()
                
                # Run multiple cycles per frame for better performance
                for _ in range(10):
                    if not self.step():
                        break
                
                # Update timers at ~60Hz
                if self.delay_timer > 0:
                    self.delay_timer -= 1
                if self.sound_timer > 0:
                    self.sound_timer -= 1
                
                # Maintain roughly 60 FPS timing
                elapsed = time.time() - start_time
                sleep_time = max(0, 1/60 - elapsed)
                time.sleep(sleep_time)
    
    def run(self, max_cycles: int = 1000, update_timers: bool = True):
        """Run emulator for specified number of cycles"""
        for cycle in range(max_cycles):
            if not self.step():
                break
            
            self.stats['cycles_executed'] += 1
            
            # Update timers at ~60Hz (every 16-17 cycles assuming 1000Hz execution)
            if update_timers and cycle % 16 == 0:
                if self.delay_timer > 0:
                    self.delay_timer -= 1
                if self.sound_timer > 0:
                    self.sound_timer -= 1
    
    def _execute_instruction(self, instruction: int) -> bool:
            """Execute a single CHIP-8 instruction"""
            # Ensure instruction is a regular Python int, not numpy int
            instruction = int(instruction)
            
            # Decode instruction
            opcode = (instruction & 0xF000) >> 12
            x = (instruction & 0x0F00) >> 8
            y = (instruction & 0x00F0) >> 4
            n = instruction & 0x000F
            kk = instruction & 0x00FF
            nnn = instruction & 0x0FFF
            
            # Debug print for failing tests - ONLY when debug file is set
            if self.debug_file and (self.stats['instructions_executed'] < 20 or instruction == 0x0000):
                msg = f"Executing: 0x{instruction:04X} at PC=0x{self.program_counter-2:03X}"
                self.log_debug(msg)
                msg2 = f"  Opcode: 0x{opcode:X}, x={x}, y={y}, n={n}, kk=0x{kk:02X}, nnn=0x{nnn:03X}"
                self.log_debug(msg2)
                
                # Also log register state
                if self.stats['instructions_executed'] < 5:
                    reg_state = f"  Registers: V0-V7={[int(self.registers[i]) for i in range(8)]}"
                    self.log_debug(reg_state)
                    reg_state2 = f"            V8-VF={[int(self.registers[i]) for i in range(8, 16)]}"
                    self.log_debug(reg_state2)
                    idx_state = f"  I=0x{self.index_register:03X}, SP={self.stack_pointer}"
                    self.log_debug(idx_state)
            
            try:
                if instruction == 0x00E0:  # CLS
                    self.display.fill(0)
                    self.pixel_touched.fill(False)
                    self.stats['display_clears'] += 1
                    self.stats['display_updates'] += 1
                    
                elif instruction == 0x00EE:  # RET
                    if self.stack_pointer > 0:
                        self.stack_pointer -= 1
                        self.program_counter = int(self.stack[self.stack_pointer])
                        self.stats['returns'] += 1
                        self.stats['stack_operations'] += 1
                    else:
                        if self.debug_file:
                            self.log_debug(f"ERROR: RET with empty stack at PC=0x{self.program_counter-2:03X}")
                        self.crashed = True
                        return False
                
                elif opcode == 0x0:  # SYS addr (should be ignored in modern interpreters)
                    # Most modern interpreters ignore SYS instructions
                    pass
                        
                elif opcode == 0x1:  # JP addr
                    if nnn == self.program_counter - 2:
                        # Only log infinite jump warning once, then set a flag to suppress further warnings
                        if not hasattr(self, '_infinite_jump_warned') and self.debug_file:
                            self.log_debug(f"WARNING: Infinite jump detected at PC=0x{self.program_counter-2:03X} (further warnings suppressed)")
                            self._infinite_jump_warned = True
                    self.program_counter = nnn
                    self.stats['jumps_taken'] += 1
                    
                elif opcode == 0x2:  # CALL addr
                    if self.stack_pointer >= STACK_SIZE:
                        if self.debug_file:
                            self.log_debug(f"ERROR: Stack overflow at PC=0x{self.program_counter-2:03X}")
                        self.crashed = True
                        return False
                    self.stack[self.stack_pointer] = self.program_counter
                    self.stack_pointer += 1
                    self.program_counter = nnn
                    self.stats['subroutine_calls'] += 1
                    self.stats['stack_operations'] += 1
                        
                elif opcode == 0x3:  # SE Vx, byte
                    if int(self.registers[x]) == kk:
                        self.program_counter += 2
                    self.stats['register_operations'] += 1
                    
                elif opcode == 0x4:  # SNE Vx, byte
                    if int(self.registers[x]) != kk:
                        self.program_counter += 2
                    self.stats['register_operations'] += 1
                    
                elif opcode == 0x5:  # SE Vx, Vy
                    if n != 0:  # 5xy0 format check
                        if self.debug_file:
                            self.log_debug(f"ERROR: Invalid 5xy{n:X} instruction at PC=0x{self.program_counter-2:03X}")
                        self.crashed = True
                        return False
                    if int(self.registers[x]) == int(self.registers[y]):
                        self.program_counter += 2
                    self.stats['register_operations'] += 1
                    
                elif opcode == 0x6:  # LD Vx, byte
                    self.registers[x] = kk
                    self.stats['register_operations'] += 1
                    
                elif opcode == 0x7:  # ADD Vx, byte
                    self.registers[x] = (int(self.registers[x]) + kk) & 0xFF
                    self.stats['arithmetic_operations'] += 1
                    self.stats['register_operations'] += 1
                    
                elif opcode == 0x8:  # Register operations
                    self.stats['register_operations'] += 1
                    if n == 0x0:  # LD Vx, Vy
                        self.registers[x] = self.registers[y]
                    elif n == 0x1:  # OR Vx, Vy
                        self.registers[x] = int(self.registers[x]) | int(self.registers[y])
                        self.registers[0xF] = 0  # VF should be reset
                        self.stats['logical_operations'] += 1
                    elif n == 0x2:  # AND Vx, Vy
                        self.registers[x] = int(self.registers[x]) & int(self.registers[y])
                        self.registers[0xF] = 0  # VF should be reset
                        self.stats['logical_operations'] += 1
                    elif n == 0x3:  # XOR Vx, Vy
                        self.registers[x] = int(self.registers[x]) ^ int(self.registers[y])
                        self.registers[0xF] = 0  # VF should be reset
                        self.stats['logical_operations'] += 1
                    elif n == 0x4:  # ADD Vx, Vy
                        # CRITICAL: Store operands BEFORE modifying VF
                        vx_val = int(self.registers[x])
                        vy_val = int(self.registers[y])
                        result = vx_val + vy_val
                        self.registers[x] = result & 0xFF
                        self.registers[0xF] = 1 if result > 255 else 0
                        self.stats['arithmetic_operations'] += 1
                    elif n == 0x5:  # SUB Vx, Vy
                        # CRITICAL: Store operands BEFORE modifying VF
                        vx_val = int(self.registers[x])
                        vy_val = int(self.registers[y])
                        self.registers[x] = (vx_val - vy_val) & 0xFF
                        self.registers[0xF] = 1 if vx_val >= vy_val else 0  # NOT borrow
                        self.stats['arithmetic_operations'] += 1
                    elif n == 0x6:  # SHR Vx {, Vy}
                        # CRITICAL: Store operand BEFORE modifying VF
                        vx_val = int(self.registers[x])
                        self.registers[x] = vx_val >> 1
                        self.registers[0xF] = vx_val & 0x1  # Shifted out bit
                        self.stats['logical_operations'] += 1
                    elif n == 0x7:  # SUBN Vx, Vy
                        # CRITICAL: Store operands BEFORE modifying VF
                        vx_val = int(self.registers[x])
                        vy_val = int(self.registers[y])
                        self.registers[x] = (vy_val - vx_val) & 0xFF
                        self.registers[0xF] = 1 if vy_val >= vx_val else 0  # NOT borrow
                        self.stats['arithmetic_operations'] += 1
                    elif n == 0xE:  # SHL Vx {, Vy}
                        # CRITICAL: Store operand BEFORE modifying VF
                        vx_val = int(self.registers[x])
                        self.registers[x] = (vx_val << 1) & 0xFF
                        self.registers[0xF] = 1 if (vx_val & 0x80) else 0  # Shifted out bit
                        self.stats['logical_operations'] += 1
                    else:
                        if self.debug_file:
                            self.log_debug(f"ERROR: Unknown 8xy{n:X} instruction at PC=0x{self.program_counter-2:03X}")
                        self.crashed = True
                        return False
                        
                elif opcode == 0x9:  # SNE Vx, Vy
                    if n != 0:  # 9xy0 format check
                        if self.debug_file:
                            self.log_debug(f"ERROR: Invalid 9xy{n:X} instruction at PC=0x{self.program_counter-2:03X}")
                        self.crashed = True
                        return False
                    if int(self.registers[x]) != int(self.registers[y]):
                        self.program_counter += 2
                    self.stats['register_operations'] += 1
                    
                elif opcode == 0xA:  # LD I, addr
                    self.index_register = nnn
                    self.stats['register_operations'] += 1
                    
                elif opcode == 0xB:  # JP V0, addr (with jumping quirk)
                    if self.quirks['jumping']:
                        # Modern quirk: use vX where X is the high nibble of nnn
                        x = (nnn & 0xF00) >> 8
                        self.program_counter = nnn + int(self.registers[x])
                    else:
                        # Classic behavior: always use v0
                        self.program_counter = nnn + int(self.registers[0])
                    self.stats['jumps_taken'] += 1
                    
                elif opcode == 0xC:  # RND Vx, byte
                    random_byte = np.random.randint(0, 256)
                    self.registers[x] = random_byte & kk
                    self.stats['random_generations'] += 1
                    self.stats['register_operations'] += 1
                    
                elif opcode == 0xD:  # DRW Vx, Vy, nibble
                    self._draw_sprite(x, y, n)
                    
                elif opcode == 0xE:
                    self.stats['key_checks'] += 1
                    if kk == 0x9E:  # SKP Vx
                        key_val = int(self.registers[x]) & 0xF
                        if self.keypad[key_val]:
                            self.program_counter += 2
                    elif kk == 0xA1:  # SKNP Vx
                        key_val = int(self.registers[x]) & 0xF
                        if not self.keypad[key_val]:
                            self.program_counter += 2
                    else:
                        if self.debug_file:
                            self.log_debug(f"ERROR: Unknown Ex{kk:02X} instruction at PC=0x{self.program_counter-2:03X}")
                        self.crashed = True
                        return False
                            
                elif opcode == 0xF:
                    if kk == 0x07:  # LD Vx, DT
                        self.registers[x] = self.delay_timer
                        self.stats['register_operations'] += 1
                    elif kk == 0x0A:  # LD Vx, K
                        self.waiting_for_key = True
                        self.key_register = x
                        self.stats['blocking_key_waits'] += 1
                    elif kk == 0x15:  # LD DT, Vx
                        self.delay_timer = int(self.registers[x])
                        self.stats['timer_sets'] += 1
                    elif kk == 0x18:  # LD ST, Vx
                        self.sound_timer = int(self.registers[x])
                        self.stats['timer_sets'] += 1
                        if int(self.registers[x]) > 0:
                            self.stats['sound_activations'] += 1
                    elif kk == 0x1E:  # ADD I, Vx
                        # FIXED: Proper handling of index register addition with bounds checking
                        new_value = self.index_register + int(self.registers[x])
                        self.index_register = new_value & 0xFFFF  # Keep within 16-bit range
                        self.stats['arithmetic_operations'] += 1
                    elif kk == 0x29:  # LD F, Vx
                        digit = int(self.registers[x]) & 0xF
                        self.index_register = FONT_START + digit * 5
                    elif kk == 0x33:  # LD B, Vx
                        value = int(self.registers[x])
                        if self.index_register + 2 < MEMORY_SIZE:
                            self.memory[self.index_register] = value // 100
                            self.memory[self.index_register + 1] = (value // 10) % 10
                            self.memory[self.index_register + 2] = value % 10
                            self.stats['memory_writes'] += 3
                    elif kk == 0x55:  # LD [I], Vx (with memory quirk)
                        for i in range(x + 1):
                            if self.index_register + i < MEMORY_SIZE:
                                self.memory[self.index_register + i] = int(self.registers[i])
                        self.stats['memory_writes'] += x + 1
                        
                        # Memory quirk: increment I register
                        if self.quirks['memory']:
                            self.index_register = (self.index_register + x + 1) & 0xFFFF
                            
                    elif kk == 0x65:  # LD Vx, [I] (with memory quirk)
                        for i in range(x + 1):
                            if self.index_register + i < MEMORY_SIZE:
                                self.registers[i] = int(self.memory[self.index_register + i])
                        self.stats['memory_reads'] += x + 1
                        
                        # Memory quirk: increment I register
                        if self.quirks['memory']:
                            self.index_register = (self.index_register + x + 1) & 0xFFFF
                    else:
                        if self.debug_file:
                            self.log_debug(f"ERROR: Unknown Fx{kk:02X} instruction at PC=0x{self.program_counter-2:03X}")
                        self.crashed = True
                        return False
                else:
                    if self.debug_file:
                        self.log_debug(f"ERROR: Unknown instruction 0x{instruction:04X} at PC=0x{self.program_counter-2:03X}")
                    self.crashed = True
                    return False
                    
            except Exception as e:
                if self.debug_file:
                    self.log_debug(f"EXCEPTION executing 0x{instruction:04X} at PC=0x{self.program_counter-2:03X}: {e}")
                self.crashed = True
                return False
                
            return True
    def _draw_sprite(self, x_reg: int, y_reg: int, height: int):
        """Draw a sprite at position (Vx, Vy) with given height"""
        # NOTE: Display wait quirk is complex and often causes more problems than it solves
        # For now, we'll implement it as a simple frame counter instead of real timing
        if self.quirks['display_wait']:
            # Simple frame-based limiting instead of real-time timing
            # This is much less aggressive than the timing-based approach
            self.stats['display_updates'] += 1
            if self.stats['display_updates'] % 2 == 0:  # Allow every other draw
                pass  # Continue with drawing
            else:
                # Still draw but track that we're limiting
                pass  # Don't actually skip - just track for stats
        
        vx = int(self.registers[x_reg]) % DISPLAY_WIDTH
        vy = int(self.registers[y_reg]) % DISPLAY_HEIGHT
        self.registers[0xF] = 0  # Clear collision flag
        
        for row in range(height):
            if vy + row >= DISPLAY_HEIGHT:
                break
                
            if self.index_register + row >= MEMORY_SIZE:
                break
                
            sprite_byte = int(self.memory[self.index_register + row])
            self.stats['memory_reads'] += 1
            
            for col in range(8):
                if vx + col >= DISPLAY_WIDTH:
                    break
                    
                if sprite_byte & (0x80 >> col):
                    pixel_y = vy + row
                    pixel_x = vx + col
                    
                    # Mark pixel as touched for statistics
                    if not self.pixel_touched[pixel_y, pixel_x]:
                        self.pixel_touched[pixel_y, pixel_x] = True
                        self.stats['unique_pixels_touched'] += 1
                    
                    # Check for collision
                    if self.display[pixel_y, pixel_x]:
                        self.registers[0xF] = 1
                        self.stats['sprite_collisions'] += 1
                        self.stats['pixels_erased'] += 1
                    else:
                        self.stats['pixels_drawn'] += 1
                    
                    # XOR the pixel
                    self.display[pixel_y, pixel_x] ^= 1
        
        self.stats['display_writes'] += 1
    
    def set_key(self, key: int, pressed: bool):
        """Set key state (0-F)"""
        if 0 <= key <= 0xF:
            self.keypad[key] = 1 if pressed else 0
            
            # Handle key waiting
            if self.waiting_for_key and pressed:
                self.registers[self.key_register] = key
                self.waiting_for_key = False
    
    def get_display(self) -> np.ndarray:
        """Get current display state as 2D array"""
        return self.display.copy()
    
    def get_display_as_image(self, scale: int = 8) -> np.ndarray:
        """Get display as a scaled image array suitable for display"""
        # Scale up the display
        scaled = np.repeat(np.repeat(self.display, scale, axis=0), scale, axis=1)
        # Convert to 0-255 range
        return scaled * 255
    
    def show_display(self, scale: int = 10, title: str = "CHIP-8 Display"):
        """Show display in a tkinter window with interactive input"""
        # Create tkinter window
        root = tk.Tk()
        root.title(title)
        root.resizable(False, False)
        
        # Flag to track if window is closing
        self._window_closing = False
        
        # Calculate window size
        canvas_width = DISPLAY_WIDTH * scale
        canvas_height = DISPLAY_HEIGHT * scale
        
        # Create canvas
        canvas = Canvas(root, width=canvas_width, height=canvas_height, bg='black')
        canvas.pack()
        
        # CHIP-8 keypad mapping to keyboard keys
        # Original CHIP-8 keypad:     Modern keyboard mapping:
        # 1 2 3 C                     1 2 3 4
        # 4 5 6 D          =>         Q W E R  
        # 7 8 9 E                     A S D F
        # A 0 B F                     Z X C V
        
        key_mapping = {
            '1': 0x1, '2': 0x2, '3': 0x3, '4': 0xC,
            'q': 0x4, 'w': 0x5, 'e': 0x6, 'r': 0xD,
            'a': 0x7, 's': 0x8, 'd': 0x9, 'f': 0xE,
            'z': 0xA, 'x': 0x0, 'c': 0xB, 'v': 0xF
        }
        
        # Track pressed keys for proper release handling
        pressed_keys = set()
        
        def key_press(event):
            if self._window_closing:
                return
            key = event.keysym.lower()
            if key in key_mapping:
                chip8_key = key_mapping[key]
                if chip8_key not in pressed_keys:
                    pressed_keys.add(chip8_key)
                    self.set_key(chip8_key, True)
                    print(f"Key pressed: {key} -> CHIP-8 key 0x{chip8_key:X}")
            elif key == 'escape':
                close_window()
        
        def key_release(event):
            if self._window_closing:
                return
            key = event.keysym.lower()
            if key in key_mapping:
                chip8_key = key_mapping[key]
                if chip8_key in pressed_keys:
                    pressed_keys.remove(chip8_key)
                    self.set_key(chip8_key, False)
                    print(f"Key released: {key} -> CHIP-8 key 0x{chip8_key:X}")
        
        def close_window():
            """Safely close the window and stop all callbacks"""
            self._window_closing = True
            root.quit()
            root.destroy()
        
        def update_display():
            """Update the display and continue emulation"""
            if self._window_closing:
                return
                
            try:
                # Clear canvas
                canvas.delete("all")
                
                # Draw pixels
                for y in range(DISPLAY_HEIGHT):
                    for x in range(DISPLAY_WIDTH):
                        if self.display[y, x]:
                            x1 = x * scale
                            y1 = y * scale
                            x2 = x1 + scale
                            y2 = y1 + scale
                            canvas.create_rectangle(x1, y1, x2, y2, fill='white', outline='white')
                
                # Continue emulation if not crashed
                if not self.crashed and not self.halt:
                    # Run a few cycles
                    for _ in range(10):  # Run 10 instructions per frame
                        if not self.step():
                            break
                    
                    # Update timers
                    if self.delay_timer > 0:
                        self.delay_timer -= 1
                    if self.sound_timer > 0:
                        self.sound_timer -= 1
                
                # Schedule next update (approximately 60 FPS) - only if window is still open
                if not self._window_closing:
                    root.after(16, update_display)
            except tk.TclError:
                # Window was destroyed, stop callbacks
                self._window_closing = True
        
        # Bind keyboard events
        root.bind('<KeyPress>', key_press)
        root.bind('<KeyRelease>', key_release)
        root.focus_set()  # Make sure window can receive key events
        
        # Handle window close button
        root.protocol("WM_DELETE_WINDOW", close_window)
        
        # Draw initial display
        for y in range(DISPLAY_HEIGHT):
            for x in range(DISPLAY_WIDTH):
                if self.display[y, x]:
                    x1 = x * scale
                    y1 = y * scale
                    x2 = x1 + scale
                    y2 = y1 + scale
                    canvas.create_rectangle(x1, y1, x2, y2, fill='white', outline='white')
        
        # Create instruction panel
        info_frame = tk.Frame(root)
        info_frame.pack(fill='x', padx=5, pady=5)
        
        # Keypad reference
        keypad_text = tk.Label(info_frame, 
            text="CHIP-8 Keypad Layout:\n" +
                 "1 2 3 4    →    1 2 3 C\n" +
                 "Q W E R    →    4 5 6 D\n" + 
                 "A S D F    →    7 8 9 E\n" +
                 "Z X C V    →    A 0 B F\n\n" +
                 "Press ESC to close",
            font=('Courier', 9), justify='left', bg='lightgray')
        keypad_text.pack(side='left')
        
        # Stats display
        stats_text = tk.Label(info_frame, text="", font=('Courier', 9), justify='right')
        stats_text.pack(side='right')
        
        def update_stats():
            """Update statistics display"""
            if self._window_closing:
                return
                
            try:
                stats_info = (f"PC: 0x{self.program_counter:03X}\n" +
                             f"I: 0x{self.index_register:03X}\n" +
                             f"Instructions: {self.stats['instructions_executed']}\n" +
                             f"Crashed: {self.crashed}")
                stats_text.config(text=stats_info)
                
                # Schedule next update - only if window is still open
                if not self._window_closing:
                    root.after(100, update_stats)  # Update every 100ms
            except tk.TclError:
                # Window was destroyed, stop callbacks
                self._window_closing = True
        
        # Start the update loops
        update_display()
        update_stats()
        
        # Show window
        try:
            root.mainloop()
        finally:
            # Ensure cleanup
            self._window_closing = True
    
    def get_stats(self) -> Dict[str, int]:
        """Get current instrumentation statistics"""
        return self.stats.copy()
    
    def print_stats(self):
        """Print current statistics"""
        print("CHIP-8 Emulator Statistics:")
        print("-" * 30)
        for key, value in self.stats.items():
            print(f"{key:25s}: {value}")

# Utility functions for testing
def load_rom_file(filename: str) -> bytes:
    """Load a ROM file"""
    with open(filename, 'rb') as f:
        return f.read()

def test_single_rom(rom_data: Union[str, bytes], cycles: int = 1000, display: bool = False):
    """Test a single ROM and optionally display results"""
    emulator = Chip8Emulator()
    emulator.load_rom(rom_data)
    emulator.run(max_cycles=cycles)
    
    print("Execution completed!")
    emulator.print_stats()
    
    if display:
        display_data = emulator.get_display()
        print("\nDisplay output:")
        for row in display_data:
            line = ''.join('██' if pixel else '  ' for pixel in row)
            print(line)
    
    return emulator

def test_rom_file(filename: str, cycles: int = 5000, scale: int = 8, show_display: bool = True, debug: bool = False, interactive: bool = False, quirks: dict = None):
    """Test a ROM file from disk"""
    try:
        # Create debug log file
        debug_file = None
        if debug:
            debug_file = f"chip8_debug_{os.path.basename(filename).replace('.ch8', '')}.log"
            # Clear previous log
            if os.path.exists(debug_file):
                os.remove(debug_file)
            print(f"Debug output will be written to: {debug_file}")
        
        print(f"Loading ROM: {filename}")
        emulator = Chip8Emulator(debug_file=debug_file, quirks=quirks)
        emulator.load_rom(filename)
        
        if quirks:
            print(f"Using quirks: {quirks}")
        
        if debug:
            emulator.log_debug(f"=== CHIP-8 Debug Log for {filename} ===")
            emulator.log_debug(f"ROM loaded, starting execution...")
        
        if interactive:
            print("Starting interactive mode...")
            print("Use keyboard for input (see window for keypad mapping)")
            print("Press ESC to exit")
            emulator.run_interactive(show_display=show_display, scale=scale, title=f"CHIP-8: {os.path.basename(filename)}")
        else:
            emulator.run(max_cycles=cycles)
            
            if debug:
                emulator.log_debug(f"=== Execution completed ===")
                emulator.log_debug(f"Final state:")
                emulator.log_debug(f"  Crashed: {emulator.crashed}")
                emulator.log_debug(f"  PC: 0x{emulator.program_counter:03X}")
                emulator.log_debug(f"  Instructions executed: {emulator.stats['instructions_executed']}")
                emulator.log_debug(f"  Display writes: {emulator.stats['display_writes']}")
                print(f"\nFull debug log saved to: {debug_file}")
            
            print("Execution completed!")
            emulator.print_stats()
            
            print(f"\nEmulator crashed: {emulator.crashed}")
            print(f"Program counter: 0x{emulator.program_counter:03X}")
            
            if show_display:
                print("\nShowing display in window...")
                emulator.show_display(scale=scale, title=f"CHIP-8: {filename}")
        
        return emulator
        
    except FileNotFoundError:
        print(f"ROM file not found: {filename}")
        return None
    except Exception as e:
        print(f"Error loading ROM: {e}")
        return None

def run_test_suite(test_dir: str = "../chip8-test-suite/bin"):
    """Run multiple test ROMs from a directory"""
    import os
    import glob
    
    # Try multiple possible locations for the test suite
    possible_paths = [
        test_dir,  # Default (relative to emulators/)
        "chip8-test-suite/bin",  # In current directory
        "../chip8-test-suite/bin",  # In parent directory
        "../../chip8-test-suite/bin",  # In grandparent directory
        os.path.join(os.path.dirname(__file__), "..", "chip8-test-suite", "bin")  # Relative to script
    ]
    
    test_path = None
    for path in possible_paths:
        if os.path.exists(path):
            test_path = path
            break
    
    if not test_path:
        print("Test directory not found. Tried:")
        for path in possible_paths:
            print(f"  - {os.path.abspath(path)}")
        print("\nDownload test suite with:")
        print("  git clone https://github.com/Timendus/chip8-test-suite.git")
        print("  (Put it in your babelscope root directory)")
        return
    
    print(f"Using test directory: {os.path.abspath(test_path)}")
    
    # Find all .ch8 files
    test_files = glob.glob(os.path.join(test_path, "*.ch8"))
    
    if not test_files:
        print(f"No .ch8 files found in {test_path}")
        return
    
    print(f"Found {len(test_files)} test ROMs:")
    for i, filename in enumerate(test_files):
        print(f"  {i+1}. {os.path.basename(filename)}")
    
    # Let user pick which test to run
    try:
        choice = input(f"\nEnter test number (1-{len(test_files)}), 'all', or 'interactive X' for interactive mode: ")
        
        if choice.lower() == 'all':
            for filename in test_files:
                print(f"\n{'='*50}")
                test_rom_file(filename, cycles=10000, scale=6, debug=True)
                input("Press Enter for next test...")
        elif choice.lower().startswith('interactive'):
            # Interactive mode for a specific test
            parts = choice.split()
            if len(parts) > 1:
                try:
                    test_num = int(parts[1]) - 1
                    if 0 <= test_num < len(test_files):
                        test_rom_file(test_files[test_num], interactive=True, scale=8)
                    else:
                        print("Invalid test number for interactive mode")
                except ValueError:
                    print("Invalid test number format")
            else:
                print("Please specify test number for interactive mode (e.g., 'interactive 1')")
        else:
            test_num = int(choice) - 1
            if 0 <= test_num < len(test_files):
                # Ask if user wants interactive mode
                interactive_choice = input("Run in interactive mode? (y/n): ").lower()
                interactive = interactive_choice.startswith('y')
                test_rom_file(test_files[test_num], cycles=10000, scale=8, debug=True, interactive=interactive)
            else:
                print("Invalid test number")
                
    except (ValueError, KeyboardInterrupt):
        print("Test cancelled")

def test_quirks_rom(filename: str = None):
    """Test the 5-quirks ROM with proper quirk settings"""
    if filename is None:
        # Try to find the 5-quirks ROM
        import os
        import glob
        possible_paths = [
            "../chip8-test-suite/bin/5-quirks.ch8",
            "chip8-test-suite/bin/5-quirks.ch8",
            "5-quirks.ch8"
        ]
        
        filename = None
        for path in possible_paths:
            if os.path.exists(path):
                filename = path
                break
        
        if filename is None:
            print("Could not find 5-quirks.ch8. Please specify the path.")
            return None
    
    print("Testing 5-quirks ROM with modern CHIP-8 quirks enabled...")
    
    # Configure quirks for modern CHIP-8 behavior
    modern_quirks = {
        'memory': True,      # Fx55/Fx65 increment I register  
        'display_wait': False, # Drawing waits for vblank - DISABLED (causes display issues)
        'jumping': True,     # Bnnn uses vX instead of v0
        'shifting': False,   # 8xy6/8xyE use vX (modern behavior)
        'logic': True,       # 8xy1/8xy2/8xy3 reset vF to 0
    }
    
    print("Quirks enabled:")
    for quirk, enabled in modern_quirks.items():
        print(f"  {quirk}: {'ON' if enabled else 'OFF'}")
    
    return test_rom_file(filename, cycles=20000, debug=True, quirks=modern_quirks)

# Example usage
if __name__ == "__main__":
    print("CHIP-8 Emulator for Babelscope")
    print("=" * 40)
    
    # Test quirks ROM first
    print("Testing CHIP-8 quirks...")
    test_quirks_rom()
    
    # Test with built-in program
    test_program = np.array([
        0xA2, 0x0A,  # LD I, 0x20A (point to sprite data at end of program)
        0x60, 0x0C,  # LD V0, 12 (x position)            
        0x61, 0x08,  # LD V1, 8  (y position)            
        0xD0, 0x15,  # DRW V0, V1, 5 (draw sprite)       
        0x12, 0x08,  # JP 0x208 (jump back to draw instruction - infinite loop)
        # Sprite data (simple pattern) - starts at 0x20A (index 10)
        0xF0, 0x90, 0x90, 0x90, 0xF0
    ], dtype=np.uint8)
    
    print("\nTesting built-in program...")
    emulator = test_single_rom(test_program, cycles=100, display=False)
    
    print(f"\nEmulator crashed: {emulator.crashed}")
    print(f"Program counter: 0x{emulator.program_counter:03X}")
    
    # Test interactive input with a simple input test program
    print("\n" + "="*50)
    print("Testing interactive input...")
    
    # Simple input test program
    input_test_program = np.array([
        0x00, 0xE0,  # CLS - clear screen
        0xF0, 0x0A,  # LD V0, K - wait for key press
        0xF0, 0x29,  # LD F, V0 - set I to font character for pressed key
        0x61, 0x10,  # LD V1, 16 - x position
        0x62, 0x10,  # LD V2, 16 - y position  
        0xD1, 0x25,  # DRW V1, V2, 5 - draw the character
        0x12, 0x02,  # JP 0x202 - jump back to wait for next key
    ], dtype=np.uint8)
    
    print("Creating input test emulator...")
    input_emulator = Chip8Emulator()
    input_emulator.load_rom(input_test_program)
    
    user_choice = input("Test interactive input? (y/n): ")
    if user_choice.lower().startswith('y'):
        print("Starting interactive input test...")
        print("Press any key (1,2,3,4,Q,W,E,R,A,S,D,F,Z,X,C,V) to see the corresponding hex digit!")
        print("Press ESC to exit")
        input_emulator.run_interactive(scale=10, title="CHIP-8 Input Test")
    
    print("\n" + "="*50)
    print("Now testing with ROM files...")
    
    # Try to run test suite
    run_test_suite()
```

### GPU / Parallel Implementation 

<div class="side-image">
  <div class="side-text">
    <p>With the Python implementation complete, I could begin work on the parallel version for CuPy. This is where things sort of fall apart, at least technologically. Implementing parallel emulators requires rethinking the entire architecture around GPU constraints and the realities of warp divergence.</p>
    <p>Warp divergence is when threads of a GPU's execution group need to follow different code paths. For example, when one emulator has a conditional branch, while another in the same group has to go another way. This is murder for testing thousands of emulators, all running different _random_ code. </p>
    <p>The solution to this is to embrace the divergence rather than fight it. The parallel emulation framework uses masked vectorized operations, where every instruction executes across all instances simultaneously, but boolean masks determine which instances are actually affected.</p>
  </div>
  <div class="side-image-container">
    <figure>
      <img src="/images/Bablescope/ThinkinMachineSuperComputer.jpg" alt="Connection Machine CM-2">
      <figcaption>It just occurred to me that I'm building one of these. For finding video games. That's fine, because no one is going to <a href="https://bbenchoff.github.io/pages/nedry.html">access the main security grid or anything</a>.</figcaption>
    </figure>
  </div>
</div>

Let's say I'm running 10,000 instances of a CHIP-8 emulator, all running different programs. At any given cycle, each instance looks at the Program Counter to fetch the next instruction. 300 instances might have `0x8132` at this memory location -- a bitwise AND on the V1 and V3 registers, storing the result in V1. 290 instances have the instruction `0x8410` -- setting register V4 equal to V1 The GPU executes all unique instructions on all 10,000 instances, but only changes the state of the 300 instances with the AND instruction, and only increments the Program Counter of the 290 instances with the SET instruction. After all instructions are complete, each instance advances the Program Counter, and the cycle repeats.

Here we're getting into the brilliance of using the CHIP-8 architecture. There are only 35 instructions, much less than the 150+ instructions of the Atari 2600. This means less time spent on each cycle, and better overall performance of the parallel emulator system.

The core of the parallel implementation is available below, or [on Github](https://github.com/bbenchoff/Babelscope/blob/main/emulators/parallel_chip8.py)

```python
"""
Mega-Kernel CHIP-8 Emulator
Everything runs in a single CUDA kernel for maximum performance
"""

import cupy as cp
import numpy as np
from typing import Dict, Tuple, Optional, List, Union
import time

# CHIP-8 System Constants
MEMORY_SIZE = 4096
DISPLAY_WIDTH = 64
DISPLAY_HEIGHT = 32
REGISTER_COUNT = 16
STACK_SIZE = 16
KEYPAD_SIZE = 16
PROGRAM_START = 0x200
FONT_START = 0x50

# CHIP-8 Font set
CHIP8_FONT = cp.array([
    0xF0, 0x90, 0x90, 0x90, 0xF0,  # 0
    0x20, 0x60, 0x20, 0x20, 0x70,  # 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0,  # 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0,  # 3
    0x90, 0x90, 0xF0, 0x10, 0x10,  # 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0,  # 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0,  # 6
    0xF0, 0x10, 0x20, 0x40, 0x40,  # 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0,  # 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0,  # 9
    0xF0, 0x90, 0xF0, 0x90, 0x90,  # A
    0xE0, 0x90, 0xE0, 0x90, 0xE0,  # B
    0xF0, 0x80, 0x80, 0x80, 0xF0,  # C
    0xE0, 0x90, 0x90, 0x90, 0xE0,  # D
    0xF0, 0x80, 0xF0, 0x80, 0xF0,  # E
    0xF0, 0x80, 0xF0, 0x80, 0x80   # F
], dtype=cp.uint8)

# The mega-kernel that does everything
MEGA_KERNEL_SOURCE = r'''
extern "C" __global__
void chip8_mega_kernel(
    // State arrays
    unsigned char* memory,              // [instances][4096]
    unsigned char* displays,            // [instances][32][64] 
    unsigned char* registers,           // [instances][16]
    unsigned short* index_registers,    // [instances]
    unsigned short* program_counters,   // [instances]
    unsigned char* stack_pointers,      // [instances]
    unsigned short* stacks,             // [instances][16]
    unsigned char* delay_timers,        // [instances]
    unsigned char* sound_timers,        // [instances]
    unsigned char* keypad,              // [instances][16]
    
    // State flags
    unsigned char* crashed,             // [instances]
    unsigned char* halted,              // [instances]
    unsigned char* waiting_for_key,     // [instances]
    unsigned char* key_registers,       // [instances]
    
    // Statistics arrays
    unsigned int* instructions_executed,    // [instances]
    unsigned int* display_writes,           // [instances]
    unsigned int* pixels_drawn,             // [instances]
    unsigned int* pixels_erased,            // [instances]
    unsigned int* sprite_collisions,        // [instances]
    
    // Random number state
    unsigned int* rng_state,            // [instances] - for RND instruction
    
    // Execution parameters
    int num_instances,
    int cycles_to_run,
    int timer_update_interval,
    
    // Quirks
    int quirk_memory,
    int quirk_jumping,
    int quirk_logic
) {
    int instance = blockIdx.x * blockDim.x + threadIdx.x;
    if (instance >= num_instances) return;
    
    // Calculate base indices for this instance
    int mem_base = instance * 4096;
    int display_base = instance * 32 * 64;
    int reg_base = instance * 16;
    int stack_base = instance * 16;
    int keypad_base = instance * 16;
    
    // Local state (registers for better performance)
    unsigned short pc = program_counters[instance];
    unsigned short index_reg = index_registers[instance];
    unsigned char sp = stack_pointers[instance];
    unsigned char dt = delay_timers[instance];
    unsigned char st = sound_timers[instance];
    
    // Statistics
    unsigned int local_instructions = 0;
    unsigned int local_display_writes = 0;
    unsigned int local_pixels_drawn = 0;
    unsigned int local_pixels_erased = 0;
    unsigned int local_collisions = 0;
    
    // Check if this instance is active
    if (crashed[instance] || halted[instance]) {
        return; // Skip crashed/halted instances
    }
    
    // Main execution loop
    for (int cycle = 0; cycle < cycles_to_run; cycle++) {
        // Skip if waiting for key
        if (waiting_for_key[instance]) {
            continue;
        }
        
        // Check PC bounds
        if (pc >= 4096 - 1) {
            crashed[instance] = 1;
            break;
        }
        
        // Fetch instruction
        unsigned char high_byte = memory[mem_base + pc];
        unsigned char low_byte = memory[mem_base + pc + 1];
        unsigned short instruction = (high_byte << 8) | low_byte;
        
        // Increment PC
        pc += 2;
        local_instructions++;
        
        // Decode instruction
        unsigned char opcode = (instruction & 0xF000) >> 12;
        unsigned char x = (instruction & 0x0F00) >> 8;
        unsigned char y = (instruction & 0x00F0) >> 4;
        unsigned char n = instruction & 0x000F;
        unsigned char kk = instruction & 0x00FF;
        unsigned short nnn = instruction & 0x0FFF;
        
        // Execute instruction
        switch (opcode) {
            case 0x0:
                if (instruction == 0x00E0) {
                    // CLS - Clear display
                    for (int i = 0; i < 32 * 64; i++) {
                        displays[display_base + i] = 0;
                    }
                    local_display_writes++;
                } else if (instruction == 0x00EE) {
                    // RET - Return from subroutine
                    if (sp > 0) {
                        sp--;
                        pc = stacks[stack_base + sp];
                    } else {
                        crashed[instance] = 1;
                    }
                }
                break;
                
            case 0x1:
                // JP addr - Jump to address
                pc = nnn;
                break;
                
            case 0x2:
                // CALL addr - Call subroutine
                if (sp < 16) {
                    stacks[stack_base + sp] = pc;
                    sp++;
                    pc = nnn;
                } else {
                    crashed[instance] = 1;
                }
                break;
                
            case 0x3:
                // SE Vx, byte - Skip if equal
                if (registers[reg_base + x] == kk) {
                    pc += 2;
                }
                break;
                
            case 0x4:
                // SNE Vx, byte - Skip if not equal
                if (registers[reg_base + x] != kk) {
                    pc += 2;
                }
                break;
                
            case 0x5:
                // SE Vx, Vy - Skip if registers equal
                if (n == 0 && registers[reg_base + x] == registers[reg_base + y]) {
                    pc += 2;
                }
                break;
                
            case 0x6:
                // LD Vx, byte - Load byte into register
                registers[reg_base + x] = kk;
                break;
                
            case 0x7:
                // ADD Vx, byte - Add byte to register
                registers[reg_base + x] = (registers[reg_base + x] + kk) & 0xFF;
                break;
                
            case 0x8:
                // Register operations
                {
                    unsigned char vx = registers[reg_base + x];
                    unsigned char vy = registers[reg_base + y];
                    unsigned char result = 0;
                    unsigned char flag = 0;
                    
                    switch (n) {
                        case 0x0: // LD Vx, Vy
                            result = vy;
                            break;
                        case 0x1: // OR Vx, Vy
                            result = vx | vy;
                            if (quirk_logic) flag = 0;
                            break;
                        case 0x2: // AND Vx, Vy
                            result = vx & vy;
                            if (quirk_logic) flag = 0;
                            break;
                        case 0x3: // XOR Vx, Vy
                            result = vx ^ vy;
                            if (quirk_logic) flag = 0;
                            break;
                        case 0x4: // ADD Vx, Vy
                            {
                                int sum = vx + vy;
                                result = sum & 0xFF;
                                flag = (sum > 255) ? 1 : 0;
                            }
                            break;
                        case 0x5: // SUB Vx, Vy
                            result = (vx - vy) & 0xFF;
                            flag = (vx >= vy) ? 1 : 0;
                            break;
                        case 0x6: // SHR Vx
                            result = vx >> 1;
                            flag = vx & 0x1;
                            break;
                        case 0x7: // SUBN Vx, Vy
                            result = (vy - vx) & 0xFF;
                            flag = (vy >= vx) ? 1 : 0;
                            break;
                        case 0xE: // SHL Vx
                            result = (vx << 1) & 0xFF;
                            flag = (vx & 0x80) ? 1 : 0;
                            break;
                        default:
                            crashed[instance] = 1;
                            continue;
                    }
                    
                    registers[reg_base + x] = result;
                    if (n == 0x1 || n == 0x2 || n == 0x3 || n == 0x4 || n == 0x5 || n == 0x6 || n == 0x7 || n == 0xE) {
                        registers[reg_base + 0xF] = flag;
                    }
                }
                break;
                
            case 0x9:
                // SNE Vx, Vy - Skip if registers not equal
                if (n == 0 && registers[reg_base + x] != registers[reg_base + y]) {
                    pc += 2;
                }
                break;
                
            case 0xA:
                // LD I, addr - Load address into I
                index_reg = nnn;
                break;
                
            case 0xB:
                // JP V0, addr - Jump to address plus V0
                if (quirk_jumping) {
                    pc = nnn + registers[reg_base + ((nnn & 0xF00) >> 8)];
                } else {
                    pc = nnn + registers[reg_base + 0];
                }
                break;
                
            case 0xC:
                // RND Vx, byte - Random number AND byte
                {
                    // Simple LCG random number generator
                    rng_state[instance] = rng_state[instance] * 1664525 + 1013904223;
                    unsigned char random_byte = (rng_state[instance] >> 16) & 0xFF;
                    registers[reg_base + x] = random_byte & kk;
                }
                break;
                
            case 0xD:
                // DRW Vx, Vy, nibble - Draw sprite
                {
                    unsigned char vx = registers[reg_base + x] % 64;
                    unsigned char vy = registers[reg_base + y] % 32;
                    registers[reg_base + 0xF] = 0; // Clear collision flag
                    
                    for (int row = 0; row < n; row++) {
                        if (vy + row >= 32) break;
                        if (index_reg + row >= 4096) break;
                        
                        unsigned char sprite_byte = memory[mem_base + index_reg + row];
                        
                        for (int col = 0; col < 8; col++) {
                            if (vx + col >= 64) break;
                            
                            if (sprite_byte & (0x80 >> col)) {
                                int pixel_idx = display_base + (vy + row) * 64 + (vx + col);
                                
                                if (displays[pixel_idx]) {
                                    registers[reg_base + 0xF] = 1; // Collision
                                    local_collisions++;
                                    local_pixels_erased++;
                                } else {
                                    local_pixels_drawn++;
                                }
                                
                                displays[pixel_idx] ^= 1;
                            }
                        }
                    }
                    local_display_writes++;
                }
                break;
                
            case 0xE:
                // Key operations
                {
                    unsigned char key = registers[reg_base + x] & 0xF;
                    if (kk == 0x9E) {
                        // SKP Vx - Skip if key pressed
                        if (keypad[keypad_base + key]) {
                            pc += 2;
                        }
                    } else if (kk == 0xA1) {
                        // SKNP Vx - Skip if key not pressed
                        if (!keypad[keypad_base + key]) {
                            pc += 2;
                        }
                    } else {
                        crashed[instance] = 1;
                    }
                }
                break;
                
            case 0xF:
                // Timer and misc operations
                switch (kk) {
                    case 0x07: // LD Vx, DT
                        registers[reg_base + x] = dt;
                        break;
                    case 0x0A: // LD Vx, K - Wait for key
                        waiting_for_key[instance] = 1;
                        key_registers[instance] = x;
                        break;
                    case 0x15: // LD DT, Vx
                        dt = registers[reg_base + x];
                        break;
                    case 0x18: // LD ST, Vx
                        st = registers[reg_base + x];
                        break;
                    case 0x1E: // ADD I, Vx
                        index_reg = (index_reg + registers[reg_base + x]) & 0xFFFF;
                        break;
                    case 0x29: // LD F, Vx
                        {
                            unsigned char digit = registers[reg_base + x] & 0xF;
                            index_reg = 0x50 + digit * 5; // Font location
                        }
                        break;
                    case 0x33: // LD B, Vx - BCD
                        {
                            unsigned char value = registers[reg_base + x];
                            if (index_reg + 2 < 4096) {
                                memory[mem_base + index_reg] = value / 100;
                                memory[mem_base + index_reg + 1] = (value / 10) % 10;
                                memory[mem_base + index_reg + 2] = value % 10;
                            }
                        }
                        break;
                    case 0x55: // LD [I], Vx - Store registers
                        for (int i = 0; i <= x; i++) {
                            if (index_reg + i < 4096) {
                                memory[mem_base + index_reg + i] = registers[reg_base + i];
                            }
                        }
                        if (quirk_memory) {
                            index_reg = (index_reg + x + 1) & 0xFFFF;
                        }
                        break;
                    case 0x65: // LD Vx, [I] - Load registers
                        for (int i = 0; i <= x; i++) {
                            if (index_reg + i < 4096) {
                                registers[reg_base + i] = memory[mem_base + index_reg + i];
                            }
                        }
                        if (quirk_memory) {
                            index_reg = (index_reg + x + 1) & 0xFFFF;
                        }
                        break;
                    default:
                        crashed[instance] = 1;
                        break;
                }
                break;
                
            default:
                crashed[instance] = 1;
                break;
        }
        
        // Update timers periodically
        if (cycle % timer_update_interval == 0) {
            if (dt > 0) dt--;
            if (st > 0) st--;
        }
    }
    
    // Write back local state
    program_counters[instance] = pc;
    index_registers[instance] = index_reg;
    stack_pointers[instance] = sp;
    delay_timers[instance] = dt;
    sound_timers[instance] = st;
    
    // Update statistics
    instructions_executed[instance] += local_instructions;
    display_writes[instance] += local_display_writes;
    pixels_drawn[instance] += local_pixels_drawn;
    pixels_erased[instance] += local_pixels_erased;
    sprite_collisions[instance] += local_collisions;
}
'''

class MegaKernelChip8Emulator:
    """
    Ultimate performance CHIP-8 emulator with everything in a single CUDA kernel
    """
    
    def __init__(self, num_instances: int, quirks: dict = None):
        self.num_instances = num_instances
        
        # CHIP-8 Quirks configuration
        self.quirks = quirks or {
            'memory': True,      
            'display_wait': False, 
            'jumping': True,     
            'shifting': False,   
            'logic': True,       
        }
        
        # Compile the mega kernel
        self.mega_kernel = cp.RawKernel(MEGA_KERNEL_SOURCE, 'chip8_mega_kernel')
        
        # Calculate optimal block/grid sizes
        # This is optimized for the GTX 1070;
        # Tested 128, 256, 512 block sizes, 256 had highest throughput
        self.block_size = min(256, num_instances)
        self.grid_size = (num_instances + self.block_size - 1) // self.block_size
        
        print(f"Mega-Kernel CHIP-8: {num_instances} instances, block_size={self.block_size}, grid_size={self.grid_size}")
        
        # Initialize all state
        self._initialize_state()
        self._initialize_stats()
    
    def _initialize_state(self):
        """Initialize all state arrays"""
        # Memory: (instances, memory_size)
        self.memory = cp.zeros((self.num_instances, MEMORY_SIZE), dtype=cp.uint8)
        
        # Display: (instances, height, width) - flattened for kernel
        self.display = cp.zeros((self.num_instances, DISPLAY_HEIGHT * DISPLAY_WIDTH), dtype=cp.uint8)
        
        # Registers: (instances, 16)
        self.registers = cp.zeros((self.num_instances, REGISTER_COUNT), dtype=cp.uint8)
        
        # System state
        self.index_register = cp.zeros(self.num_instances, dtype=cp.uint16)
        self.program_counter = cp.full(self.num_instances, PROGRAM_START, dtype=cp.uint16)
        self.stack_pointer = cp.zeros(self.num_instances, dtype=cp.uint8)
        self.stack = cp.zeros((self.num_instances, STACK_SIZE), dtype=cp.uint16)
        
        # Timers
        self.delay_timer = cp.zeros(self.num_instances, dtype=cp.uint8)
        self.sound_timer = cp.zeros(self.num_instances, dtype=cp.uint8)
        
        # Input
        self.keypad = cp.zeros((self.num_instances, KEYPAD_SIZE), dtype=cp.uint8)
        
        # State flags
        self.crashed = cp.zeros(self.num_instances, dtype=cp.uint8)
        self.halted = cp.zeros(self.num_instances, dtype=cp.uint8)
        self.waiting_for_key = cp.zeros(self.num_instances, dtype=cp.uint8)
        self.key_register = cp.zeros(self.num_instances, dtype=cp.uint8)
        
        # Random number state for RND instruction
        self.rng_state = cp.random.randint(1, 2**32, size=self.num_instances, dtype=cp.uint32)
        
        # Load font into all instances
        font_data = cp.tile(CHIP8_FONT, (self.num_instances, 1))
        self.memory[:, FONT_START:FONT_START + len(CHIP8_FONT)] = font_data
    
    def _initialize_stats(self):
        """Initialize statistics arrays"""
        self.stats = {
            'instructions_executed': cp.zeros(self.num_instances, dtype=cp.uint32),
            'display_writes': cp.zeros(self.num_instances, dtype=cp.uint32),
            'pixels_drawn': cp.zeros(self.num_instances, dtype=cp.uint32),
            'pixels_erased': cp.zeros(self.num_instances, dtype=cp.uint32),
            'sprite_collisions': cp.zeros(self.num_instances, dtype=cp.uint32),
        }
    
    def reset(self):
        """Reset all instances"""
        self.memory.fill(0)
        self.display.fill(0)
        self.registers.fill(0)
        self.index_register.fill(0)
        self.program_counter.fill(PROGRAM_START)
        self.stack_pointer.fill(0)
        self.stack.fill(0)
        self.delay_timer.fill(0)
        self.sound_timer.fill(0)
        self.keypad.fill(0)
        self.crashed.fill(0)
        self.halted.fill(0)
        self.waiting_for_key.fill(0)
        self.key_register.fill(0)
        
        # Reload font
        font_data = cp.tile(CHIP8_FONT, (self.num_instances, 1))
        self.memory[:, FONT_START:FONT_START + len(CHIP8_FONT)] = font_data
        
        # Reset stats
        for stat_array in self.stats.values():
            stat_array.fill(0)
        
        # Reset RNG state
        self.rng_state = cp.random.randint(1, 2**32, size=self.num_instances, dtype=cp.uint32)
    
    def load_roms(self, rom_data_list: List[Union[bytes, np.ndarray]]):
        """Load ROMs into instances"""
        if not rom_data_list:
            raise ValueError("No ROM data provided")
        
        for i in range(self.num_instances):
            rom_data = rom_data_list[i % len(rom_data_list)]
            
            if isinstance(rom_data, np.ndarray):
                rom_bytes = rom_data
            else:
                rom_bytes = np.frombuffer(rom_data, dtype=np.uint8)
            
            if len(rom_bytes) > MEMORY_SIZE - PROGRAM_START:
                raise ValueError(f"ROM {i} too large: {len(rom_bytes)} bytes")
            
            rom_end = PROGRAM_START + len(rom_bytes)
            self.memory[i, PROGRAM_START:rom_end] = cp.array(rom_bytes)
        
        print(f"Loaded ROMs into {self.num_instances} instances")
    
    def load_single_rom(self, rom_data: Union[bytes, np.ndarray]):
        """Load the same ROM into all instances"""
        if isinstance(rom_data, np.ndarray):
            rom_bytes = rom_data
        else:
            rom_bytes = np.frombuffer(rom_data, dtype=np.uint8)
        
        if len(rom_bytes) > MEMORY_SIZE - PROGRAM_START:
            raise ValueError(f"ROM too large: {len(rom_bytes)} bytes")
        
        # Broadcast ROM to all instances
        rom_gpu = cp.array(rom_bytes)
        rom_end = PROGRAM_START + len(rom_bytes)
        self.memory[:, PROGRAM_START:rom_end] = rom_gpu[None, :]
        
        print(f"Loaded single ROM into {self.num_instances} instances")
    
    def run(self, cycles: int = 1000, timer_update_interval: int = 16):
        """Run the mega kernel for specified cycles"""
        print(f"Launching mega-kernel for {cycles} cycles...")
        
        start_time = time.time()
        
        # Launch the mega kernel
        self.mega_kernel(
            (self.grid_size,), (self.block_size,),
            (
                # State arrays
                self.memory,
                self.display, 
                self.registers,
                self.index_register,
                self.program_counter,
                self.stack_pointer,
                self.stack,
                self.delay_timer,
                self.sound_timer,
                self.keypad,
                
                # State flags
                self.crashed,
                self.halted,
                self.waiting_for_key,
                self.key_register,
                
                # Statistics
                self.stats['instructions_executed'],
                self.stats['display_writes'],
                self.stats['pixels_drawn'],
                self.stats['pixels_erased'],
                self.stats['sprite_collisions'],
                
                # RNG state
                self.rng_state,
                
                # Parameters
                self.num_instances,
                cycles,
                timer_update_interval,
                
                # Quirks
                1 if self.quirks['memory'] else 0,
                1 if self.quirks['jumping'] else 0,
                1 if self.quirks['logic'] else 0
            )
        )
        
        # Synchronize GPU
        cp.cuda.Stream.null.synchronize()
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        total_instructions = int(cp.sum(self.stats['instructions_executed']))
        instructions_per_second = total_instructions / execution_time if execution_time > 0 else 0
        
        print(f"Mega-kernel execution: {execution_time:.4f}s")
        print(f"Total instructions: {total_instructions:,}")
        print(f"Instructions/second: {instructions_per_second:,.0f}")
    
    def get_displays(self, instance_ids: Optional[List[int]] = None) -> cp.ndarray:
        """Get display data reshaped back to 2D"""
        if instance_ids is None:
            displays = self.display.copy()
        else:
            displays = self.display[instance_ids].copy()
        
        # Reshape back to (instances, height, width)
        return displays.reshape(-1, DISPLAY_HEIGHT, DISPLAY_WIDTH)
    
    def get_displays_as_images(self, instance_ids: Optional[List[int]] = None, scale: int = 8) -> np.ndarray:
        """Get display data as scaled images"""
        displays = self.get_displays(instance_ids)
        displays_np = cp.asnumpy(displays)
        
        if len(displays_np.shape) == 2:
            displays_np = displays_np[None, ...]
        
        scaled_displays = []
        for display in displays_np:
            scaled = np.repeat(np.repeat(display, scale, axis=0), scale, axis=1)
            scaled_displays.append(scaled * 255)
        
        return np.array(scaled_displays, dtype=np.uint8)
    
    def get_aggregate_stats(self) -> Dict[str, Union[int, float]]:
        """Get aggregate statistics"""
        aggregate = {}
        
        for key, arr in self.stats.items():
            aggregate[f"total_{key}"] = int(cp.sum(arr))
            aggregate[f"mean_{key}"] = float(cp.mean(arr))
            aggregate[f"max_{key}"] = int(cp.max(arr))
            aggregate[f"min_{key}"] = int(cp.min(arr))
        
        aggregate['active_instances'] = int(cp.sum(~self.crashed))
        aggregate['crashed_instances'] = int(cp.sum(self.crashed))
        aggregate['waiting_instances'] = int(cp.sum(self.waiting_for_key))
        aggregate['total_instances'] = self.num_instances
        
        return aggregate
    
    def print_aggregate_stats(self):
        """Print aggregate statistics"""
        stats = self.get_aggregate_stats()
        
        print("Mega-Kernel CHIP-8 Emulator Statistics:")
        print("=" * 50)
        print(f"Total instances: {stats['total_instances']}")
        print(f"Active instances: {stats['active_instances']}")
        print(f"Crashed instances: {stats['crashed_instances']}")
        print(f"Waiting for key: {stats['waiting_instances']}")
        print()
        
        print("Execution totals:")
        print(f"Instructions executed: {stats['total_instructions_executed']:,}")
        print(f"Display writes: {stats['total_display_writes']:,}")
        print(f"Pixels drawn: {stats['total_pixels_drawn']:,}")
        print(f"Sprite collisions: {stats['total_sprite_collisions']:,}")
        print()
        
        print("Per-instance averages:")
        print(f"Instructions: {stats['mean_instructions_executed']:.1f}")
        print(f"Display writes: {stats['mean_display_writes']:.1f}")
        print(f"Pixels drawn: {stats['mean_pixels_drawn']:.1f}")
        print(f"Collisions: {stats['mean_sprite_collisions']:.1f}")
    
    def save_displays_as_pngs(self, output_dir: str, instance_ids: Optional[List[int]] = None, 
                             scale: int = 8, prefix: str = "display"):
        """Save display outputs as PNG files"""
        import os
        from PIL import Image
        
        os.makedirs(output_dir, exist_ok=True)
        
        images = self.get_displays_as_images(instance_ids, scale)
        
        if instance_ids is None:
            instance_ids = list(range(self.num_instances))
        elif len(images) != len(instance_ids):
            images = images[instance_ids]
        
        saved_files = []
        for i, (instance_id, image_data) in enumerate(zip(instance_ids, images)):
            filename = f"{prefix}_instance_{instance_id:04d}.png"
            filepath = os.path.join(output_dir, filename)
            
            # Convert grayscale to RGB for PNG
            if len(image_data.shape) == 2:
                rgb_image = np.stack([image_data] * 3, axis=-1)
            else:
                rgb_image = image_data
            
            img = Image.fromarray(rgb_image.astype(np.uint8))
            img.save(filepath)
            saved_files.append(filepath)
        
        print(f"Saved {len(saved_files)} display images to {output_dir}")
        return saved_files
    
    def set_keys(self, instance_keys: Dict[int, Dict[int, bool]]):
        """Set key states for specific instances"""
        for instance_id, keys in instance_keys.items():
            if 0 <= instance_id < self.num_instances:
                for key_id, pressed in keys.items():
                    if 0 <= key_id <= 0xF:
                        self.keypad[instance_id, key_id] = 1 if pressed else 0
                        
                        # Handle key waiting
                        if self.waiting_for_key[instance_id] and pressed:
                            self.registers[instance_id, int(self.key_register[instance_id])] = key_id
                            self.waiting_for_key[instance_id] = False


# Backward compatibility
ParallelChip8Emulator = MegaKernelChip8Emulator
```
## Results and Discoveries

This blog post is already too long and it's not even halfway done, so I'd like to share some discoveries I've made. I started this project by generating random CHIP-8 programs and viewing the output of whatever didn't crash. Here's some screencaps of the ouput after a million instructions:

![screencaps of emulators finished](/images/Bablescope/rom_mosaic.png)

And emulators of some interesting programs:

<style>
  .chip8-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    max-width: 1200px;
    margin: 2rem auto;
  }
  
  .chip8-grid-item {
    width: 100%;
  }
  
  .chip8-grid iframe {
    width: 100%;
    height: 280px;
    border: none;
    border-radius: 4px;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .chip8-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>

<div class="chip8-grid">
  <div class="chip8-grid-item">
    <h3>Program a9c127</h3>
    <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=a9c127f68bd9850538dc8801aa8e58dcb7058246.ch8" 
            frameborder="0">
    </iframe>
  </div>
  
  <div class="chip8-grid-item">
    <h3>Program 7d301</h3>
    <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=7d301.ch8" 
            frameborder="0">
    </iframe>
  </div>
  
  <div class="chip8-grid-item">
    <h3>Program e20edb</h3>
    <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=e20edb.ch8" 
            frameborder="0">
    </iframe>
  </div>
  
  <div class="chip8-grid-item">
    <h3>Program 42d9ec</h3>
    <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=368cbd.ch8" 
            frameborder="0">
    </iframe>
  </div>
</div>

Program `a9c127` was the first interesting program I found because it kinda, sorta looked like a cellular automata. It's not, because of the biggest weakness of the CHIP-8 platform for this sort of research. Sprite draws in the CHIP-8 are `XOR`-ed with each other; if an existing pixel is 1, and another pixel is written to the same screen location, the result is a blank pixel. This is a double-edged sword because it does produce the interesting patterns found in other, later programs but it's not quite as cool as it could be. I could add a `NAND` or `NOR` instruction, though. Future research possibilities.

Program `e20edb` shows the `XOR` more clearly -- it's a diagnally looping sprite drawing routine with an offset. This is simply writing the same sprite over and over to slightly offset positions. The `XOR` pattern means these diagonal stripes change over time, eventually disappearing, at which point the cycle repeats.

Programs `368cbd` and `7d301` look extremely similar, but they're distinct ROMs from distinct runs (distinctness proven by the shortened SHA-1 name).




## Emulator Design and Algorithm Discovery
### Core Architecture
### Memory State Instrumentation
### Warp Divergence Solutions

## ROM Generation Strategy
### Random Program Generation
### Memory Pre-seeding for Algorithm Detection

## Algorithm Discovery Framework
### Pattern Recognition Pipeline
### Sorting Algorithm Detection



### Emergent Algorithm Catalog
### Comparison with Finite Atari Machine

## Future Directions
### Distributed Computing Possibilities

This was a project to build a _truly massive_ framework for emulating a lot of different virtual machines at the same time. Limiting myself to the CHIP-8 helped, as did moving the entire pipeline into my GPU. But this wasn't enough. The pace of discovery was glacial.

For finding cellular automata in code, emulating batches of 10,000 ROMs for 1,000,000 cycles, I was only processing around 250 ROMs per second. Sure, that's a lot of compute that pegged my graphics card at 100% for hours at a time. But it still isn't enough. It took _wee

If anyone were to do this right, and couldn't get their hands on a datacenter full of H200 GPUs, a distributed computing project is the only way to do this. Think of something like SETI@Home, where people would turn their GPUs onto various 'Babelscope-like' projects, like finding a new sorting algorithm, or looking for evidence of Rule 110 in random noise. It's niche, but there might be enough weird people out there that would be interested. And since Arecibo collapsed, we might as well look for something else other than mining shitcoins.

### Other Virtual Machine Targets

As discussed in the [Finite Atari Project](https://bbenchoff.github.io/pages/FiniteAtari.html), there are reasons I went with CHIP-8 over more interesting and social media-friendly architectures. The NES and Game Boy have memory mappers, bank switching, and memory protection. Rehashing the Atari involves complex emulation for video output, and 128 bytes of RAM doesn't allow for very much algorithmic complexity. The CHIP-8 is nearly ideal for this project with a flat memory model, programs that write to their own code area, and a limited number of instructions.

No, I'm not doing Brainfuck, but not for the reason you might imagine. The Babelscope operates on a fixed window of a ~4kB program. "Random Brainfuck" is completely unbounded. You can write anything a computer can do in Brainfuck, but I have no idea how long the program would be. I'm not searching for CHIP-8 programs larger than 4kB simply because of GPU limitations. Not wanting to search the Brainfuck space is a limit of the GPU; there's no effective way to search an unbounded Brainfuck space.

x86 and ARM are too complex and have variable instruction lengths. RISC-V is nearly perfect with a fixed instruction width and simple addressing. In fact, this project could have been written for RISC-V and would have been much more 'legitimate' in the eyes of CS researchers. If anyone is going to replicate this project, I would suggest RISC-V, with the caveat that it wouldn't necessarily have a display output. I needed that, so I went with CHIP-8.

Additionally, I'm extremely interested in applying this to embedded platforms. Think of it like this: a PIC12F has 1024 words (12-bits) of program memory. That gives you a search space of $2^12288$, or $10^3700$ programs. It's still an absurd number but compared to real, not-embedded computers it's significantly smaller and an entire PIC12F could easily be emulated in parallel on a GPU. Whether this will ever be useful to anyone is doubtful, but the methodology is solid.

### Theoretical Implications

## Conclusion

This is not a fuzzer, because instead of generating random input, I'm seeing if a random _program_ runs. It's not genetic programming, because there's no fitness function. It's not the [Superoptimizer](https://dl.acm.org/doi/pdf/10.1145/36177.36194), because I'm looking for _all_ programs that do _something_. There are CS papers going back to the 60s that touch on this, but until now we haven't had the compute to actually do this. This isn't computer science, because there's no real condition of success. This isn't machine learning, because I'm not training anything to get better. This isn't art, because it's random data without intent. It's more like astronomy. I'm pointing a telescope at $10^{10159}$ random 4 kilobyte binaries and cataloging whatever strange objects I happen to find.

You know the movie _Contact_? You know the book? In the last chapter of the book, the main character looks a trillion digits into pi, in base 11, and finds a perfect circle, rendered in ones and zeros. In the book, that’s a sign of something greater. That's not what I'm doing here. I just built the telescope, and I'm looking for anything interesting.

### Comparison to Related Works

The Babelscope is not without historical precedent. 

The closest thing to Babelscope is [stoke](https://github.com/StanfordPL/stoke) from the Stanford Programming Languages Group. This uses random search to explore program transformations, but not a program _space_. It's a bounded search, looking for novel or interesting permutations of interesting algorithms, but it's not really for discovering algorithms _in_ random data. Although, I'm using Babelscope to find sorting algorithms, so the comparison between it an Stoke is really six of one, half a dozen of the other.

In literature, there are a few analogs to what I'm doing here. [Borges' _The Library of Babel_](https://en.wikipedia.org/wiki/The_Library_of_Babel) is the most obvious and where this project steals its name. It's a short story, just go read it now, but the basic premise is that the universe is a library filled with random books. There's a cult searching for the library index, and another cult destroying books that don't make sense. Just go read it.

There's also Victor Pelevin's _iPhuck 10_, Russian fiction that [cannot be easily translated into English](https://rustrans.exeter.ac.uk/2020/10/23/translating-the-uncanny-valley-victor-pelevins-iphuck-10/) because the main character is an LLM trained on the entire corpus of Russian literature. [The summaries and commentary](https://r0l.livejournal.com/921339.html) around this work talk about "Random Code Programming", which is exactly what I'm doing here. _iPhuck 10_ uses quantum computers, but the idea is the same -- look at the space of random programs and see what pops out. I'd like to mention that I have not read _iPhuck 10_ because I can't; I don't speak Russian and I'm certainly not well-versed in Russian literature. But I like _Star Trek VI_ because it's a Shakespearean space opera, so I'd be interested in a translation.

### Finally...

<div class="side-image">
  <div class="side-text">
    <p>
      The purpose of this exercise wasn't to find ROMs that could have been Atari games released in 1980. It wasn't to find <em>Adventure II</em>, <em>Pitfall III</em>, or the Atari 2600 version of <em>Koyaanisqatsi</em>, with chiptunes by Philip Glass.
    </p>
  </div>
  <div class="side-image-container">
    <img src="/images/Koyaanisqatsi.jpg" alt="Koyaanisqatsi, the video game">
  </div>
</div>




<style>
.side-image {
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.side-text {
  font-size: 1rem;
  line-height: 1.6;
}

.side-image-container {
  width: 100%;
}

.side-image-container img {
  width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0,0,0,0.2);
}

@media (min-width: 768px) {
  .side-image {
    flex-direction: row;
  }

  .side-text {
    flex: 2 1 400px;
    min-width: 250px;
  }

  .side-image-container {
    flex: 1 1 400px;
    max-width: 400px;
  }
}
</style>


[back](../)
