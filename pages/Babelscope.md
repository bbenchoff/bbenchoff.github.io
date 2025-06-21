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

<div class="abstract" style="margin: 2rem 3rem; padding: 1.5rem 2rem; font-style: italic; color: #666; background-color: #fafafa; font-size: 0.95rem; line-height: 1.7; border-radius: 4px;">
   The Babelscope is a massively parallel emulation framework designed to explore the computational space of random programs. Building on the <a href="https://bbenchoff.github.io/pages/FiniteAtari.html">Finite Atari Machine</a>, this project generates billions of random CHIP-8 ROMs and executes them simultaneously on GPU hardware to catalog emergent behaviors. Rather than training models or optimizing for specific outcomes, we conduct an exhaustive survey of the program space looking for anything that produces interesting visual output, responds to input, or exhibits complex computational patterns. The framework addresses fundamental questions about what algorithms might spontaneously emerge from randomness, from simple graphics routines to potentially sophisticated sorting or path finding behaviors.
</div>

## Introduction

This is the followup to my previous project, the [Finite Atari Machine](https://bbenchoff.github.io/pages/FiniteAtari.html). With the Finite Atari Machine, I used a GPU to generate billions and billions of Atari 2600 ROMs filled with random data that conformed to some heuristics gleaned from commercially released Atari games. I found some interesting stuff, including a 'protogame' that produced changing visual output dependent on player input.

This project is the next step. Instead of merely generating random ROMs in a GPU and checking results in an emulator, we build a massively parallel framework to generate billions of ROMs and test them all with emulation. 

This is not a fuzzer, because instead of generating random input, I'm seeing if a random _program_ runs. It's not genetic programming, because there's no fitness function. It's not the [Superoptimizer](https://dl.acm.org/doi/pdf/10.1145/36177.36194), because I'm looking for _all_ programs that do _something_. There are CS papers going back to the 60s that touch on this, but until now we haven't had the compute to actually do this. This isn't computer science, because there's no real condition of success. This isn't machine learning, because I'm not training anything to get better. This isn't art, because it's random data without intent. It's more like astronomy. I'm pointing a telescope at $10^{10159}$ random 4 kilobyte binaries and cataloging whatever strange objects I happen to find.

You know the movie _Contact_? You know the book? In the last chapter of the book, the main character looks a trillion digits into pi, in base 11, and finds a perfect circle, rendered in ones and zeros. In the book, that’s a sign of something greater. That's not what I'm doing here. I just built the telescope, and I'm looking for anything interesting.

## Technical Reasoning

While the Finite Atari Machine showed it was possible to find interesting objects in the enormous space of random programs, this technique had drawbacks. I was limited by heuristics, and there are trivial counterexamples for an 'interesting' program that would not pass these heuristics. A very minimal program can be constructed that outputs interesting video -- it can be done in just 32 bytes, even -- but this program would not pass the heuristics test. For example, this program creates an animated color pattern on the Atari, but would fail all heuristic tests:

<pre class="no-collapse"><code>; Program starts at $F000
LDA #$00   ; Start with color 0 / black 
STA $2C    ; Set background color
INC        ; Increment accumulator
JMP $F002  ; Jump to set background color
</code></pre>

To find the population of interesting ROMs, you need to run them all. This is the [halting problem](https://en.wikipedia.org/wiki/Halting_problem) in action. There is no way to determine if a program will access the video output or will stop dead after a few clock cycles without actually running the entire program.

The key to finding interesting bits of machine code in random data is simply to emulate everything, and there's no way around it. The solution to finding interesting bits of computation in random data would require a massively parallel emulation framework addressing two key limitations of the Atari 2600. The Atari is far too complex [even with a parallel emulation framework](https://github.com/NVlabs/cule), and the limited RAM of 128 bytes is much too small for memory pattern analysis. This led me to look for a better platform for this project.

The solution to this problem is the [CHIP-8](https://en.wikipedia.org/wiki/CHIP-8). The CHIP-8 provides a stable video interface instead of the Atari's complex TIA timing requirements, and also provides 4kB of directly addressable RAM compared to the Atari's 128 bytes. Most important for this project, the CHIP-8 is ideal for GPU parallelization and the architecture makes it straightforward to instrument the internal state of the system during emulation.

The goal of this project is to run billions of ROMs in parallel, just to see if something interesting happens. Because of my success with the Finite Atari Machine, this is somewhat of a foregone conclusion even if it might take a while. But the change to the CHIP-8 platform also allows me to ask a deeper question: If I pre-seed memory with structured data, will a random program ever sort it? Could something like quicksort be found in the program space? If I define a graph in memory -- a set of nodes and weighted edges -- will Dijkstra stumble out?

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

## Emulator Design
### Core Architecture
### Memory State Instrumentation
### Warp Divergence Solutions

## ROM Generation Strategy
### Random Program Generation
### Memory Pre-seeding for Algorithm Detection

## Algorithm Discovery Framework
### Pattern Recognition Pipeline
### Sorting Algorithm Detection

## Results and Discoveries

### Program a9c127
<div style="width: 100%; max-width: 800px; margin: 2rem auto;">
  <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=a9c127f68bd9850538dc8801aa8e58dcb7058246.ch8" 
          width="100%" 
          height="280" 
          frameborder="0" 
          style="border: none; border-radius: 4px;">
  </iframe>
</div>

### Program 168bc9
<div style="width: 100%; max-width: 800px; margin: 2rem auto;">
  <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=168bc90a024151297ee0d5dc12c4b40e3fad5e49.ch8" 
          width="100%" 
          height="280" 
          frameborder="0" 
          style="border: none; border-radius: 4px;">
  </iframe>
</div>

<div style="width: 100%; max-width: 800px; margin: 2rem auto;">
  <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=random_004210_inst1000000_pix1007_dens0.492.ch8" 
          width="100%" 
          height="280" 
          frameborder="0" 
          style="border: none; border-radius: 4px;">
  </iframe>
</div>

<div style="width: 100%; max-width: 800px; margin: 2rem auto;">
  <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=random_004751_inst1000000_pix731_dens0.357.ch8" 
          width="100%" 
          height="280" 
          frameborder="0" 
          style="border: none; border-radius: 4px;">
  </iframe>
</div>

<div style="width: 100%; max-width: 800px; margin: 2rem auto;">
  <iframe src="/assets/pages/babelscope/chip8-emulator.html?rom=random_006424_inst1000000_pix688_dens0.336.ch8" 
          width="100%" 
          height="280" 
          frameborder="0" 
          style="border: none; border-radius: 4px;">
  </iframe>
</div>


### Emergent Algorithm Catalog
### Comparison with Finite Atari Machine

## Future Directions
### Distributed Computing Possibilities
### Other Virtual Machine Targets

As discussed in the [Finite Atari Project](https://bbenchoff.github.io/pages/FiniteAtari.html), there are reasons I went with CHIP-8 over more interesting and social media-friendly architectures. The NES and Game Boy have memory mappers, bank switching, and memory protection. Rehashing the Atari involves complex emulation for video output, and 128 bytes of RAM doesn't allow for very much algorithmic complexity. The CHIP-8 is nearly ideal for this project with a flat memory model, programs that write to their own code area, and a limited number of instructions.

No, I'm not doing Brainfuck, but not for the reason you might imagine. The Babelscope operates on a fixed window of a ~4kB program. "Random Brainfuck" is completely unbounded. You can write anything a computer can do in Brainfuck, but I have no idea how long the program would be. I'm not searching for CHIP-8 programs larger than 4kB simply because of GPU limitations. Not wanting to search the Brainfuck space is a limit of the GPU; there's no effective way to search an unbounded Brainfuck space.

x86 and ARM are too complex and have variable instruction lengths. RISC-V is nearly perfect with a fixed instruction width and simple addressing. In fact, this project could have been written for RISC-V and would have been much more 'legitimate' in the eyes of CS researchers. If anyone is going to replicate this project, I would suggest RISC-V, with the caveat that it wouldn't necessarily have a display output. I needed that, so I went with CHIP-8.


### Theoretical Implications

## Conclusion

### Comparison to Related Works

The Babelscope is not without historical precedent. 

The closest thing to Babelscope is [stoke](https://github.com/StanfordPL/stoke) from the Stanford Programming Languages Group. This uses random search to explore program transformations, but not a program _space_. It's a bounded search, looking for novel or interesting permutations of interesting algorithms, but it's not really for discovering algorithms _in_ random data. Although, I'm using Bablescope to find sorting algorithms, so the comparison between it an Stoke is really six of one, half a dozen of the other.

In literature, there are a few analogs to what I'm doing here. [Borges' _The Library of Babel_](https://en.wikipedia.org/wiki/The_Library_of_Babel) is the most obvious and where this project steals its name. It's a short story, just go read it now, but the basic premise is that the universe is a library filled with random books. There's a cult searching for the library index, and another cult destroying books that don't make sense. Just go read it.

There's also Victor Pelevin's _iPhuck 10_, Russian fiction that [cannot be easily translated into English](https://rustrans.exeter.ac.uk/2020/10/23/translating-the-uncanny-valley-victor-pelevins-iphuck-10/) because the main character is an LLM trained on the entire corpus of Russian literature. [The summaries and commentatry](https://r0l.livejournal.com/921339.html) around this work talk about "Random Code Programming", which is exactly what I'm doing here. _iPhuck 10_ uses quantum computers, but the idea is the same -- look at the space of random programs and see what pops out. I'd like to mention that I have not read _iPhuck 10_ because I can't; I don't speak Russian and I'm certainly not well-versed in Russian literature. But I like _Star Trek VI_ because it's a Shakespearean space opera, so I'd be interested in a translation.

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
