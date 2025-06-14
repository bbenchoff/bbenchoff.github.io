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


## Conclusion

<div style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem;">
  <div style="flex: 2 1 400px; min-width: 250px; font-size: 1rem; line-height: 1.6;">
    <p>
      The purpose of this exercise wasn’t to find ROMs that could have been Atari games released in 1980. It wasn’t to find <em>Adventure II</em>, <em>Pitfall III</em>, or the Atari 2600 version of <em>Koyaanisqatsi</em>, with chiptunes by Philip Glass.
    </p>
  </div>
  <div style="flex: 1 1 300px; max-width: 300px;">
    <img src="/images/Koyaanisqatsi.jpg" alt="koyaanisqatsi, the video game" style="width: 100%; height: auto; border-radius: 4px; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
  </div>
</div>

[back](../)
