---
layout: default
title: "Babelscope"
description: "Massively parallel emulator framework for computational space exploration"
keywords: ["GPU", "Emulation", "Atari 2600", "ROM generation", "6502 emulator", "procedural generation", "computational phenomenology", "Brian Benchoff"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2022-06-04
image: "/images/default.jpg"
---

# Babelscope

This is the followup to my previous project, the [Finite Atari Machine](https://bbenchoff.github.io/pages/FiniteAtari.html). With the Finite Atari Machine, I used a GPU to generate billions and billions of Atari 2600 ROMs filled with random data that conformed to some heuristics gleaned from commercially released Atari games. I found some interesting stuff, including a 'protogame' that produced changing visual output dependent on player input.

This project is the next step. Instead of merely generating random ROMs in a GPU and checking results in an emulator, we build a massively parallel framework to generate billions of ROMs and test them all with emulation. [Thanks to a CUDA Atari emulator](https://github.com/NVlabs/cule), we can run billions of random ROMs and see what drops out. 

This is not a fuzzer, because instead of generating random input, I'm seeing if a random _program_ runs. It's not genetic programming, because there's no fitness function. It's not the [Superoptimizer](https://dl.acm.org/doi/pdf/10.1145/36177.36194), because I'm looking for _all_ programs that do _something_. There are CS papers going back to the 60s that touch on this, but until now we haven't had the compute to actually do this. This isn't computer science, because there's no real condition of success. This isn't machine learning, because I'm not training anything to get better. This isn't art, because it's random data without intent. It's more like astronomy. I'm pointing a telescope at $10^{10159}$ random Atari games and cataloging whatever strange objects I happen to find.

You know the movie _Contact_? You know the book? In the last chapter of the book, the main character looks a trillion digits into pi, in base 11, and finds a perfect circle, rendered in ones and zeros. In the book, that’s a sign of something greater. That's not what I'm doing here. I just built the telescope, and I'm looking for anything interesting.

## Technical Reasoning

The idea behind this project is to create a _massively parallel_ collection of Atari 2600 emulators. On a regular desktop computer, you could run a dozen, or maybe a few dozen Atari emulators at the same time. GPUs, on the other hand, have thousands of processing cores designed for parallel execution. Where your desktop might have 32 cores, an Nvidia 3090 has 10,496 CUDA cores, allowing me to run thousands of emulators simultaneously.

The key bit of code is an emulator designed to run in a CUDA core. This is [CuLE, a CUDA port of the Atari Learning Environment](https://github.com/NVlabs/cule). Originally designed for running Atari ROMs in parallel for reinforcement learning, I'm stripping out all of the ML stuff to simply see if a ROM will run in an emulator. This allows for independent execution of thousands of different ROMs, no performance penalty for different instruction paths, and scalable to millions of emulators at a time. With a single RTX4090, I can test half a million ROMs in under a minute, something that would take months on a CPU.

This massively parallel solution is necessary because there is no way to tell if a ROM will run without running it. This is the [halting problem](https://en.wikipedia.org/wiki/Halting_problem) in action. There is no way to determine if a program will access the video output or will stop dead after a few clock cycles without actually running the entire program.

This is the solution to the problem of the [Finite Atari Machine](https://bbenchoff.github.io/pages/FiniteAtari.html). In my previous work, I was using heuristics to determine if a ROM was promising. By counting the number of different opcodes used, counting the number of jumps in the code, and counting how often the video chip was accessed, I could generate ROMs that could be games but the only way to be sure is to check them in an emulator.

This approach is insufficient. A very minimal program can be constructed that would output interesting video -- it can be done in just 32 bytes, even -- but this program would not pass the heuristics test. For example, this program creates an animated color pattern on the screen but would fail all heuristic tests:

<pre class="no-collapse"><code>
; Program starts at $F000
LDA #$00   ; Start with color 0 / black 
STA $2C    ; Set background color
INC        ; Increment accumulator
JMP $F002  ; Jump to set background color
</code></pre>

To find the population of interesting ROMs, you need to run them all. By running millions of random ROMs through this parallel emulation system, I can finally map the complete behavior space of the Atari 2600 and answer the question: what fraction of all possible programs produce interesting output?

## Technical Implementation

This project is built off of [CuLE](https://github.com/NVlabs/cule), but CuLE is at least half a decade old at this point and encumbered with with a lot of PyTorch calls. I do not need machine learning for this -- I don't even need video output for this -- but I would like to instrument this emulator for some statistics of what happened in each emulator during runtime. This means major modifications to CuLE are needed.

## Conclusion

<div style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem;">
  <div style="flex: 2 1 400px; min-width: 250px; font-size: 1rem; line-height: 1.6;">
    <p>
      The purpose of this exercise wasn’t to find ROMs that could have been Atari games released in 1980. It wasn’t to find <em>Adventure II</em>, <em>Pitfall III</em>, or the Atari 2600 version of <em>Koyaanisqatsi</em>, with chiptunes by Philip Glass.
    </p>
  </div>
  <div style="flex: 1 1 400px; max-width: 400px;">
    <img src="/images/Koyaanisqatsi.jpg" alt="koyaanisqatsi, the video game" style="width: 100%; height: auto; border-radius: 4px; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
  </div>
</div>

[back](../)
