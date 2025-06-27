---
layout: default
title: "Babelscope"
description: "Bablescope: Finding algorithms in random data with CUDA"
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

This project is the next step. Instead of merely generating random ROMs in a GPU and checking results in an emulator, we build a massively parallel framework to generate billions of ROMs and test them all with emulation. Like the Finite Atari Machine project, I found interesting visual output and 'protogames' that respond to user input. The parallel emulation framework makes this vastly more interesting; with this technique I was also able to find interesting random programs with applications.

This is the computer science equivalent of the [Miller-Urey experiment](https://en.wikipedia.org/wiki/Miller%E2%80%93Urey_experiment). This was an experiment in chemical synthesis by simulating the primordial Earth in a test tube. Add water, methane, ammonia, hydrogen, heat and electric sparks and you'll eventually get amino acids, the building blocks of life. I'm doing this with computer code. If you have a computer run random data as code, eventually you'll get algorithms that do something.

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

The current Python implementation is available [on Github](https://github.com/bbenchoff/Babelscope/blob/main/emulators/chip8.py)

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

The core of the parallel implementation is available [on Github](https://github.com/bbenchoff/Babelscope/blob/main/emulators/parallel_chip8.py)

## Results and Discoveries

This blog post is already too long and it's not even halfway done, so I'd like to share some discoveries I've made. I started this project by generating random CHIP-8 programs and viewing the output of whatever didn't crash. Here's some screencaps of the ouput after a million instructions:

<center>
![screencaps of emulators finished](/images/Bablescope/rom_mosaic.png)
</center>

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
    <h3>Program 368cbd</h3>
    <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=368cbd.ch8" 
            frameborder="0">
    </iframe>
  </div>
</div>

These are the best of the best of about 100 Terabytes of random data. 

Program `a9c127` was the first interesting program I found because it kinda, sorta looked like a cellular automata. It's not, because of the biggest weakness of the CHIP-8 platform for this sort of research. Sprite draws in the CHIP-8 are `XOR`-ed with each other; if an existing pixel is 1, and another pixel is written to the same screen location, the result is a blank pixel. This is a double-edged sword because it does produce the interesting patterns found in other, later programs but it's not quite as cool as it could be. I could add a `NAND` or `NOR` instruction, though. Future research possibilities.

Program `e20edb` shows the `XOR` more clearly -- it's a diagnally looping sprite drawing routine with an offset. This is simply writing the same sprite over and over to slightly offset positions. The `XOR` pattern means these diagonal stripes change over time, eventually disappearing, at which point the cycle repeats.

Programs `368cbd` and `7d301` look extremely similar, but they're distinct ROMs from distinct runs (distinctness proven by the shortened SHA-1 name). They are both simply writing random data as sprite data, `XOR`-ing the result on the screen. While these programs might not be much to look at, they're at least as complex as what I found with the [Finite Atari Machine](https://bbenchoff.github.io/pages/FiniteAtari.html). 

## Actual Experiments
### Sorting Algorithms

The entire point of this isn't to generate cool, broken QR codes. I've already proven that's possible with the Finite Atari Machine. The purpose of the CHIP-8 exploration is to __find__ something. How about sorting algorithms.

The structure of the search for sorting algorithms is fairly simple in concept. Instead of generating completely _random_ ROMs, I'm going to pre-seed the data with an array at memory location 0x300 to 0x307, and repeat that for the rest of the program. Here's what's actually going on in these 'random' ROMs:

<iframe src="/assets/pages/babelscope/memory-layout.html" 
        width="100%" 
        frameborder="0"
        id="memory-iframe"
        onload="resizeIframe(this)">
</iframe>

<script>
function resizeIframe(iframe) {
  iframe.height = iframe.contentWindow.document.body.scrollHeight + "px";
}
</script>


[20:53:31] 🔢 Starting Batch 15034
CUDA ROM Generator on NVIDIA GeForce GTX 1070 (8.0 GB)
ROM size: 3584 bytes
Generating 39,999 random ROMs on GPU...
✅ Generated 39,999 ROMs in 0.04s (893523 ROMs/sec)
[20:53:31] Generated 39,999 random ROMs on GPU
🚀 Loading 39999 ROMs with optimized GPU operations...
[20:53:33] 🛑 Search interrupted by user at batch 15034
[20:53:33]
[20:53:33] 🏁 SORTING ALGORITHM SEARCH COMPLETE
[20:53:33] ============================================================
[20:53:33] Session ID: 20250622_230319
[20:53:33] Total batches: 15034
[20:53:33] Total ROMs tested: 601,304,967
[20:53:33] Total execution time: 21.84 hours
[20:53:33] Average rate: 7649 ROMs/sec
[20:53:33] 🎯 TOTAL SORTING ALGORITHMS FOUND: 277
[20:53:33] 🔢 Final discovery rate: 1 per 2,170,776 ROMs
[20:53:33] 📁 ROMs saved to: output\sorting\session_20250622_230319\roms
[20:53:33] 📋 Debug log: output\sorting\session_20250622_230319\logs\debug.txt
[20:53:33] 📊 Summary: output\sorting\session_20250622_230319\logs\summary.json
🎉 Search completed successfully!
📁 Results saved to: output\sorting\session_20250622_230319
PS C:\Users\Benchoff\Documents\GitHub\Babelscope> 



SECOND RUN:

[16:14:02] ⚠️  Using unvalidated results - false positives possible
[16:14:02] Batch 10406 Results:
[16:14:02]   Execution time: 2.64s
[16:14:02]   Arrays accessed: 24
[16:14:02]   Sorting algorithms found: 0
[16:14:02]   Total array reads: 60
[16:14:02]   Total array writes: 100
[16:14:02]   Total comparisons: 10523405
[16:14:02]   Total swaps: 802419
[16:14:02]
[16:14:02] 📊 Session Progress:
[16:14:02]   Total ROMs tested: 208,120,000
[16:14:02]   Total batches: 10406
[16:14:02]   Total sorts found: 219
[16:14:02]   Processing rate: 7910 ROMs/sec
[16:14:02]   Session time: 7.31 hours
[16:14:02]   Discovery rate: 1 in 950,319 ROMs
[16:14:02] ============================================================
[16:14:02] 🔢 Starting Batch 10407
CUDA ROM Generator on NVIDIA GeForce GTX 1070 (8.0 GB)
ROM size: 3584 bytes
Generating 20,000 random ROMs on GPU...
✅ Generated 20,000 ROMs in 0.02s (1006673 ROMs/sec)
[16:14:02] Generated 20,000 random ROMs on GPU
🚀 Loading 20000 ROMs with optimized GPU operations...
[16:14:03] 🛑 Search interrupted by user at batch 10407
[16:14:03]
[16:14:03] 🏁 SORTING ALGORITHM SEARCH COMPLETE
[16:14:03] ============================================================
[16:14:03] Session ID: 20250624_085530
[16:14:03] Total batches: 10407
[16:14:03] Total ROMs tested: 208,120,000
[16:14:03] Total execution time: 7.31 hours
[16:14:03] Average rate: 7909 ROMs/sec
[16:14:03] 🎯 TOTAL SORTING ALGORITHMS FOUND: 219
[16:14:03] 🔢 Final discovery rate: 1 per 950,319 ROMs
[16:14:03] 📁 ROMs saved to: output\sorting\session_20250624_085530\roms
[16:14:03] 📋 Debug log: output\sorting\session_20250624_085530\logs\debug.txt
[16:14:03] 📊 Summary: output\sorting\session_20250624_085530\logs\summary.json
🎉 Search completed successfully!
📁 Results saved to: output\sorting\session_20250624_085530



TESTING NEW VERSION WITH 1070:

🎯 BATCH 4
------------------------------
🎲 Generating 200,000 random ROMs on GPU...
🎲 Generating 200,000 pure random ROMs on GPU (3584 bytes each)...
   ✅ Generated on GPU in 0.004s (50,195,117 ROMs/sec)
   ✅ Generated in 0.00s
📥 Loading ROMs with test pattern...
📥 Loading 200,000 random ROMs from GPU array...
   Test pattern: [8 3 6 1 7 2 5 4]
   ✅ Loaded ROMs with test pattern at 0x300
   ✅ Loaded in 0.00s
🔍 Running CHIP-8 emulation and sort detection...
🔍 Running Babelscope search: 100,000 cycles, check every 100

🛑 Received signal 2, shutting down gracefully...
⚡ Execution time: 11.446s
⚡ 17,473 ROMs/sec
🎯 Sorting algorithms found: 0
💥 Crashed instances: 194344
📊 Instances that accessed array: 81
   ✅ Search completed in 11.45s
   🎯 Discoveries: 0
📊 Batch 4 summary:
   ROMs tested: 200,000
   Discoveries: 0
   Batch time: 11.45s
   Rate: 17,463 ROMs/sec
🎯 Session totals:
   Total ROMs: 800,000
   Total discoveries: 0
   Session time: 0.01 hours
   Avg rate: 17,325 ROMs/sec


🏁 BABELSCOPE EXPLORATION COMPLETE
============================================================
Session ID: 20250624_171431
Batches completed: 4
Total ROMs tested: 800,000
Total time: 0.01 hours
Average rate: 17,319 ROMs/sec
🎯 SORTING ALGORITHMS DISCOVERED: 0
📋 Session data: babelscope_results\session_20250624_171431\logs
📁 All results: babelscope_results\session_20250624_171431
🎉 Exploration completed successfully!

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

This is not a fuzzer, because instead of generating random input, I'm seeing if a random _program_ runs. It's not genetic programming, because there's no fitness function. It's not the [Superoptimizer](https://dl.acm.org/doi/pdf/10.1145/36177.36194), because I'm looking for _all_ programs that do _something_. There are CS papers going back to the 60s that touch on this, but until now we haven't had the compute to actually do this. This isn't computer science, because there's no real condition of success. This isn't machine learning, because I'm not training anything to get better. This isn't art, because it's random data without intent. It's more like astronomy. I'm pointing a telescope at $10^{10159}$ random 4 kilobyte binaries and cataloging whatever strange objects I happen to find.

You know the movie _Contact_? You know the book? In the last chapter of the book, the main character looks a trillion digits into pi, in base 11, and finds a perfect circle, rendered in ones and zeros. In the book, that’s a sign of something greater. That's not what I'm doing here. I just built the telescope, and I'm looking for anything interesting.

## Conclusion

/* Image text wrapping for Howard Stark image */
.conclusion-image {
  float: right;
  margin: 0 0 1rem 1.5rem;
  max-width: 45%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .conclusion-image {
    float: none;
    display: block;
    margin: 1rem auto;
    max-width: 90%;
    width: 100%;
  }
}

/* Tablet adjustments */
@media (min-width: 769px) and (max-width: 1024px) {
  .conclusion-image {
    max-width: 40%;
    margin: 0 0 1rem 1rem;
  }
}

/* Clear float after conclusion section */
.conclusion-section::after {
  content: "";
  display: table;
  clear: both;
}

<img src="/images/Bablescope/limited.jpg" alt="Howard Stark, limited by the technology of his time" class="conclusion-image">

REDO THIS SECTION WITH PROPER MATH LATER

I am immensely pissed off at this project. Not because I did it, but because it would have been so much easier if I had access to resources. This is a compute-bound problem, solved by writing a little bit of CUDA, and it takes __weeks__ to find a single 8-element sorting algorithm. There are better ways to do this; it's a highly parallelizable problem and there are already data centers running hundreds of thousands of GPUs at full tilt.

Just imagine; instead of training a new LLM model, we could have novel sorting algorithms being spat out of a machine every few minutes. With enough compute, you could find novel algorithms for graph traversal, or new compression techniques. These things just fall out of random data if you have enough compute. Instead of mining the computational space of random programs, we're training a large language model to be really good at writing CSS, and really bad at limiting the use of em dashes.

Technology, man.

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
