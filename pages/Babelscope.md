---
layout: default
title: "Babelscope"
description: "Massively parallel emulator framework for computational space exploration"
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

The first goal of this project is to build an emulator or interpreter that can be run at a massively parallel scale. For this, the choice of the CHIP-8 architecture becomes obvious in retrospect. The CHIP-8 has a number of advantages for this project over the Atari 2600. Of those:

* The CHIP-8 has a uniform instruction width. Every instruction is exactly two bytes. The Atari uses variable-length instructions, where each line of assembly can be one, two, or three bytes long. This simplifies decoding and when to increase the Program Counter.
* The CHIP-8 is a virtual machine. This is getting into the weeds a bit, but the Atari is hell for parallelization. Yes, it's been done with [CuLE](https://github.com/NVlabs/cule), but the Atari has instructions that run in two clock cycles, or four, or seven cycles, or something else. This is hell for running multiple instances on a GPU. The CHIP-8, on the other hand, can just... run. One instruction per tick. It's easy.
* The Atari races the beam. It is a device that generates NTSC (or PAL, or SEACAM) video. I _could_ do this, but I really don't want to. The CHIP-8, on the other hand, is just a 64x32 pixel array that is much simpler to write to and decode.

So I had to write a CHIP-8 emulator following [Cowgod's Technical Reference](http://devernay.free.fr/hacks/chip8/C8TECH10.HTM). I want this to be portable so anyone can run it, on Nvidia or AMD hardware. That's [CuPy](https://cupy.dev/). Easy enough:

<<Python Code goes here>>

## Conclusion

<div class="conclusion-flex">
  <div class="conclusion-text">
    <p>
      The purpose of this exercise wasn't to find ROMs that could have been Atari games released in 1980. It wasn't to find <em>Adventure II</em>, <em>Pitfall III</em>, or the Atari 2600 version of <em>Koyaanisqatsi</em>, with chiptunes by Philip Glass.
    </p>
  </div>
  <div class="conclusion-image">
    <img src="/images/Koyaanisqatsi.jpg" alt="Koyaanisqatsi, the video game">
  </div>
</div>

<style>
.conclusion-flex {
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.conclusion-text {
  font-size: 1rem;
  line-height: 1.6;
}

.conclusion-image {
  width: 100%;
}

.conclusion-image img {
  width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0,0,0,0.2);
}

@media (min-width: 768px) {
  .conclusion-flex {
    flex-direction: row;
  }
  
  .conclusion-text {
    flex: 2 1 400px;
    min-width: 250px;
  }
  
  .conclusion-image {
    flex: 1 1 400px;
    max-width: 400px;
  }
}
</style>

[back](../)
