---
layout: default
title: "Recreating the Connection Machine: 4,096 RISC-V Cores in a Hypercube"
description: "A modern recreation of the Connection Machines CM-1"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2022-06-04
last_modified_at: 2022-06-04
image: "/images/ConnM/CMSocialCard.png"
---

<style>
/* =========================
   General / existing styles
   ========================= */

/* Center the button row */
.btn-row{
  display:flex;
  justify-content:center;
  margin:1rem 0;
}

/* High-contrast button */
a.btn-download{
  display:inline-flex;
  align-items:center;
  gap:.5rem;
  padding:.85rem 1.2rem;
  border-radius:.75rem;
  border:1px solid rgba(0,0,0,.15);
  background:#2563eb;
  color:#fff !important;
  font-weight:700;
  text-decoration:none;
  line-height:1.1;
  box-shadow:0 2px 8px rgba(0,0,0,.2);
}

a.btn-download:hover{
  filter:brightness(1.05);
  transform:translateY(-1px);
  box-shadow:0 6px 16px rgba(0,0,0,.25);
}

a.btn-download:focus-visible{
  outline:2px solid #fff;
  outline-offset:2px;
}

.matrix-table {
  border-collapse: collapse;
  font-family: monospace;
  font-size: 14px;
  margin: 0 auto;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: center;
}

.matrix-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.matrix-table td.connected {
  background-color: #ffebee;
  font-weight: bold;
}

.matrix-table td.empty {
  color: #666;
}

.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 1rem 0;
}

.side-image {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.side-text {
  flex: 1 1 auto;
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
    align-items: flex-start;
  }
  .side-text {
    flex: 1 1 0;
  }
  .side-image-container {
    flex: 0 0 300px;
    max-width: 300px;
    margin-left: 1rem;
  }
}

/* Media in article: never overflow */
.tm-article img,
.tm-article video,
.tm-article svg,
.tm-article iframe {
  max-width: 100%;
  height: auto;
}

/* Code blocks: scroll instead of blowing layout wide */
.tm-article pre {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* =========================
   Bulletproof-ish layout
   ========================= */

:root {
  /* “Tunable but not brittle”: these are typographic constraints, not screen-size hacks */
  --tm-gap: 16px;              /* JS can read this, so keep it in px */
  --tm-article-max: 94ch;      /* comfy line length */
  --tm-article-min-ch: 52;     /* if we must go narrower than this, stack ToC */

  /* JS sets these dynamically */
  --tm-nav-h: 64px;
  --tm-scroll-offset: 90px;
  --tm-toc-max-px: 420px;
  --tm-article-fit-px: 100000px;
}

/* Base: ToC is just normal flow (mobile + fallback) */
.tm-layout {
  position: relative;
}

/* The article stays centered like a normal blog page */
.tm-article {
  margin-left: auto;
  margin-right: auto;
  min-width: 0;
  max-width: min(var(--tm-article-max), var(--tm-article-fit-px));
}

/* ToC visual styling */
.tm-toc-inner {
  padding: 0.75rem 0.9rem 0.9rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.12);
  background: rgba(0,0,0,0.04);
}

.tm-toc-inner h3 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Contents list */
.tm-toc-nav {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tm-toc-nav a {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}


.tm-toc-nav li {
  margin: 0.15rem 0;
  padding-left: 1.2rem;
  position: relative;
}

.tm-toc-nav li.tm-toc-level-2::before {
  content: "•";
  position: absolute;
  left: 0;
}

.tm-toc-nav li.tm-toc-level-3 {
  margin-left: 1.5rem;
}
.tm-toc-nav li.tm-toc-level-3::before {
  content: "◦";
  position: absolute;
  left: 0;
}

.tm-toc-nav li.tm-toc-level-4 {
  margin-left: 3rem;
}
.tm-toc-nav li.tm-toc-level-4::before {
  content: "◦";
  position: absolute;
  left: 0;
  opacity: 0.8;
}

.tm-toc-nav a {
  text-decoration: none;
  font-size: 0.9rem;
}
.tm-toc-nav a:hover {
  text-decoration: underline;
}

/* Related pages */
.tm-toc-sep {
  margin: 0.75rem 0;
  border: 0;
  border-top: 1px solid rgba(0,0,0,0.12);
}

.tm-related-nav {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tm-related-nav li {
  margin: 0.15rem 0;
  padding-left: 1.2rem;
  position: relative;
}

.tm-related-nav li::before {
  content: "•";
  position: absolute;
  left: 0;
}

.tm-related-nav a {
  text-decoration: none;
  font-size: 0.9rem;
}
.tm-related-nav a:hover {
  text-decoration: underline;
}

/* Anchor jumps land below the fixed navbar */
.tm-article h2,
.tm-article h3,
.tm-article h4 {
  scroll-margin-top: calc(var(--tm-nav-h) + 12px);
}

/* Desktop behavior:
   - ToC fixed to the right edge of the viewport
   - Article remains centered
   - JS sets --tm-article-fit-px to avoid overlap */
@media (min-width: 900px) {
  .tm-layout:not(.tm-stack) .tm-toc {
    position: fixed;
    right: 0; /* right edge flush to browser edge */
    top: calc(var(--tm-nav-h) + 12px);
    z-index: 50;

    width: max-content;
    max-width: min(var(--tm-toc-max-px), calc(100vw - 12px));
    max-height: calc(100dvh - (var(--tm-nav-h) + 24px));
    overflow: auto;
    overscroll-behavior: contain;

    /* Prevent a single long token from forcing insane width */
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

/* “Stack mode” (auto-triggered by JS when space is too tight) */
.tm-layout.tm-stack .tm-toc {
  position: static;
  width: auto;
  max-width: 100%;
  max-height: none;
  overflow: visible;
}

/* Reduce the chance of accidental horizontal scrollbars */
@supports (overflow: clip) {
  .tm-layout { overflow-x: clip; }
}
@supports not (overflow: clip) {
  .tm-layout { overflow-x: hidden; }
}

/* Lightbox */
.tm-article img {
  cursor: zoom-in;
}

/* Optional: don't zoom-in cursor on tiny inline icons */
.tm-article img.tm-no-lightbox,
.tm-article a img {
  cursor: default;
}

.tm-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(0,0,0,0.85);
}

.tm-lightbox.is-open {
  display: flex;
}

.tm-lightbox img {
  max-width: min(96vw, 1600px);
  max-height: 92vh;
  width: auto;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  cursor: zoom-out;
}

.tm-lightbox-close {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 28px;
  line-height: 1;
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  background: rgba(255,255,255,0.15);
  color: white;
}

.tm-lightbox-close:hover {
  background: rgba(255,255,255,0.25);
}

body.tm-lightbox-open {
  overflow: hidden;
}

/* Active section highlighting */
.tm-toc-nav a.is-active {
  font-weight: 700;
  text-decoration: underline;
}

.tm-toc-nav li.is-active::before {
  /* make the bullet feel “selected” without hardcoding colors */
  opacity: 1;
}

.tm-toc-nav li::before {
  opacity: 0.55;
}

.tm-toc-nav li.is-active {
  background: rgba(0,0,0,0.08);
  border-radius: 6px;
  padding-top: 2px;
  padding-bottom: 2px;
}

/* optional: if your ToC is scrollable, keep some breathing room */
.tm-toc {
  scroll-padding-top: 0.5rem;
}

</style>



<div class="tm-layout">
  <aside class="tm-toc">
  <div class="tm-toc-inner">
    <h3>Contents</h3>
    <ul class="tm-toc-nav" id="tm-toc"></ul>
    <hr class="tm-toc-sep" />
    <h3>Related pages</h3>
    <ul class="tm-related-nav">
      <li><a href="16NodeMachine.html">16 Node Prototypes</a></li>
      <li><a href="HypercubeTDMA.html">Hypercube TDMA</a></li>
      <li><a href="OrthoRoute.html">OrthoRoute</a></li>
      <li><a href="AG32SDK.html">AG32 SDK</a></li>
      <li><a href="StarC.html">StarC</a></li>
      <li><a href="CM1Implementation.html">CM-1 Implementation</a></li>
    </ul>
  </div>
</aside>

<div class="tm-article" markdown="1">

![Render of the machine](/images/ConnM/CMSocialCard.png)

# Recreating the Connection Machine: 4,096 RISC-V Cores in a Hypercube 

<b>I made a supercomputer out of a bunch of smartphone connectors, chips from RGB mechanical keyboards, and four thousand RISC-V microcontrollers.</b> On paper, it has a combined clock rate over one Terahertz. The memory bandwidth is several Gigabits per second. These are real numbers, because I remember old issues of PC Gamer and their ilk doing the same thing. It's faster than your laptop on some matrix operations. But that's on paper. In reality, it can't run Doom. But it _will_ do beautiful and cursed parallel math behind a smoked acrylic panel studded with blinkenlights.

## Introduction

In 1985, Thinking Machines built the [Connection Machine CM-1](https://en.wikipedia.org/wiki/Connection_Machine). This was a parallel computer with 65,536 individual processors arranged at the vertexes of a 16-dimension hypercube. This means each processor in the machine is connected to 16 adjacent processors. 

The Connection Machine was the fastest computer on the planet in the late 1980s (The [Top500](https://top500.org/) list of supercomputers only goes back to 1993), and was purchased by various three-letter agencies, NASA, and a few well-funded universities.

Like most tech companies, Thinking Machines was a defense contractor pretending to be a cool and exciting business. When the Cold War ended, DARPA cut their funding and the company officially died in 1994. By this time, Moore's Law had kicked in and workstations from Sun (and others) made the idea of a five million dollar machine that only spoke Lisp untenable for most companies. 

Blame Gorbachev or the second AI winter, by the mid 1990s Thinking Machines was dead. By the turn of the millenium, all of the Connection Machines were out of service. There's one in the New York MoMA, but it's not on display. Same with the Smithsonian. There's one at the Computer History Museum, but the lights don't work. The Living Computers museum had one, but it has since disappeared.

The machines that remain don't work, and there's zero code available for these machines. So I built one.

This project is a modern recreation or reinterpretation of the lowest-spec Connection Machine built. It contains 4,096 individual RISC-V processors, each connected to 12 neighbors in a 12-dimensional hypercube.

The Connection Machine was an early experiment in massive parallelism. Today, a 'massively parallel computer' means wiring up a bunch of machines running Linux to an Ethernet switch. The Connection Machine is different. In a machine with 65,536 processor, every processor is connected to 16 other processors. In my machine, there are 4,096 processors, with each one connected to 12 others. For _n_ total processors, each node connects to exactly $\log_2(n)$ neighbors. This topology makes the machine extremely interesting with regard to what it can calculate efficiently, namely matrix operations, which is the basis of the third AI boom.

The individual processors in the original CM-1 couldn't do much. These processors could only operate on a single bit at a time. This project leverages 40 years of Moore's law to put small, cheap microcontrollers into a parallel array.

If I wanted this thing on the front page of Hacker News for twelve hours I'd call this, 'a distraction-free computational platform' and stuff a box full of Raspberry Pis. But I'm not doing that. This is a reproduction, or a recreation, or an 'inspired by' build of the 1986-era Connection Machine, plus 40 years of Moore's law and very poor impulse control.

In 1986, this was the cutting edge of parallel computing and AI. In 2006, NASA would have used this machine for hypersonic computational fluid dynamics for the rocket that would put humans on the moon by the year 2020. In 2026, it's a weird art project with a lot of LEDs.

## The LED Panel

Listen, we all know why you're reading this, so I'm going to start off with the LED array before digging into massively parallel hypercube supercomputer. A million people will read this page, and all but a thousand will think _this_ is the coolest part. Such is life.

The Connection Machine was _defined_ by a giant array of LEDs. It's the reason there's one of these in the MoMA, so I need 4,096 LEDs showing the state of every parallel processor in this machine. Also, blinky equals cool equals eyeballs, so there's that.

![Schematic and PCB of the LED array](/images/ConnM/LEDSchBoard.png)

The LED board is built around the **IS31FL3741**, an I2C LED matrix driver ostensibly designed for mechanical keyboard backlighting. I've built [several project](https://bbenchoff.github.io/pages/IS31FL3741.html) around [this chip](https://github.com/bbenchoff/MrRobotBadge), and have a few of these now-discontinued chips in storage.

Each IS31FL3741 is controlling a **8x32** matrix of LEDs over I2C. These chips have an I2C address pin with four possible values, allowing me to control a **32x32 array** over a single I2C bus. Four of these arrays are combined onto a single PCB, along with an RP2040 (a Raspberry Pi Pico) microcontroller to run the whole thing.

### LED Hardware

- The **RP2040 drives 16 IS31FL3741 chips** over **four I²C buses**.  
- It uses **PIO-based I²C with DMA transfers** to blast out pixel data fast enough for real-time updates.  
- The data input is flexible:  
   - Stream pixel data over serial from another microcontroller  
   - Or run over USB, treating the RP2040 as a standalone LED controller

Why did I build my own 64x64 LED array, instead of using an off-the-shelf HUB75 LED panel? It would have certainly been cheaper -- a 64x64 LED panel can be bought on Amazon for under $50. Basically, I wanted some practice with high-density design before diving into routing a 12-dimension hypercube. It's also a quick win, giving me something to look at while routing hundreds of thousands of connections.

<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;box-shadow:0 0 8px rgba(0,0,0,0.2);margin:0 0 1rem 0;">
  <iframe
    src="https://www.youtube-nocookie.com/embed/oIQOIeG_9m4?rel=0"
    title="Random and Pleasing pattern"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
  </iframe>
</div>

Mechanically, the LED panel is a piece of FR4 screwed to the chassis of the machine. The front acrylic is [Chemcast Black LED plastic sheet](https://www.tapplastics.com/product/plastics/cut_to_size_plastic/black_led_sheet/668) from TAP Plastics, secured to the PCB with magnets epoxied to the back side of the acrylic into milled slots. These magnets attach to magnets epoxied to the frame, behind the PCB. This Chemcast plastic is apparently the same material as the [Adafruit Black LED Diffusion Acrylic](https://www.adafruit.com/product/4594), and it works exactly as advertised. _Somehow_, the Chemcast plastic turns the point source of an LED into a square at the surface of the machine. You can't photograph it, but in person it's _spectacular_.

### LED Software

There are a few pre-programmed modes for this panel. Of course I had to implement Conway's Game of Life, but the real showstopper is the "Random and Pleasing" mode. This is the mode shown in Jurassic Park, and it's what MoMA turns on when they light up their machine.

There are several sources _describing_ this mode, but only sparse details on how it's _implemented_. Trammell Hudson [dug into this](https://trmm.net/CM-2_references/) and the basic idea is, "each processor steps through memory, and sends the bitwise OR of the memory for each processor to one LED." That's the CM-1. For the CM-2, it's basically stepping through random memory. However, every single 'reverse engineering by looking at it' attempt implements an LFSR to generate the pixels on the grid. This is (pseudo)random, and also has the effect that the LEDs scroll left or right instead of just blinking like random static.

I went for a 4094-bit LFSR (256 taps), and divided the display up into four columns of 1x16 'cells'. These cells are randomly assigned to shift left or shift right, and 256 unique taps are assigned to a particular 1x16 cell. This is _so much better_ than what you see whenever MoMA pulls their machine out of storage. It's a digital shimmer. It's an oil stain in a puddle in a parking lot. It's _beautiful_.

## My Machine, Overview

This post has already gone on far too long without a proper explanation of what I'm building. 

__Very very simply__, this is a very, very large cluster of very, very small computers. The Connection Machine was designed as a massively parallel computer first. The entire idea was to stuff as many computers into a box, and connect those computers together. The problem then becomes how to connect these computers. If you <a href="https://dspace.mit.edu/bitstream/handle/1721.1/14719/18524280-MIT.pdf">read Danny Hillis' dissertation</a>, there were several network topologies to choose from.

The nodes -- the tiny processors that make up the cluster -- could have been arranged as a (binary) tree, but this would have the downside of a communications bottleneck at the root of the tree. They could have been connected with a crossbar -- effectively connecting every node to every other node. A full crossbar requires N², where N is the number of nodes. While this might work with ~256 nodes, it does not scale to thousands of nodes in silicon or hardware. Hashnets were also considered, where everything was connected randomly. This is too much of a mind trip to do anything useful.

The Connection Machine settled on a hypercube layout, where in a network of 8 nodes (a 3D cube), each node would be connected to 3 adjacent nodes. In a network of 16 nodes (4D, a tesseract), each node would have 4 connections. A network of 4,096 nodes would have 12 connections per node, and a network of 65,536 nodes would have 16 connections per node.

![Unfolding a 4-dimensional tesseract](/images/ConnM/UnfoldingHoriz.png)

The advantages to this layout are that routing algorithms for passing messages between nodes are simple, and there are redundant paths between nodes. If you want to build a hypercluster of tiny computers, you build it as a hypercube.

## Hardware Architecture

This machine is split up into segments of various sizes. Each segment is 16× bigger than the previous. These are:

- **The Node** This is just a small RISC-V microcontroller, controlled by _another_ microcontroller.
- **The Slice** This is 16 individual nodes, connected as a 4-dimension hypercube. In the Slice, a seventeenth microcontroller handles the initialization and control of each individual node. This means providing the means to program and read out memory from each node individually.
- **The Plane**  16 Slices. The Plane is 256 microcontrollers are connected as an 8-dimension hypercube. There are sixteen 'slice controller' microcontrollers, plus one additional 'plane controller'. This means each plane consists of 273 individual chips.
- **The Machine** Sixteen Planes make a Machine. The architecture follows the growth we've seen up to now, with 4096 'node' microcontrollers connected as a 12-dimensional hypercube. There are 4368 chips in The Machine, all controlled with a rather large SoC.

Like the original Connection Machine, there are two 'modes' of connection between the nodes in the array. The first is the hypercube connection, where each node connects to other nodes. The second is a tree. Each node in the machine is connected to the 'Slice controller' via UART. This Slice controller handles reset, boot, programming, and loading data into each node. Above the Slice is the Plane and a single 'plane controller' for each group of 256 nodes. And above that is the master controller.

This "hypercube and tree" is seen in other massively parallel machines of the 1980s. The [Cosmic Cube](https://en.wikipedia.org/wiki/Caltech_Cosmic_Cube) at Caltech split the connections with individual links between nodes and a tree structure to a 'master' unit. The [Intel iPSC](https://en.wikipedia.org/wiki/Intel_iPSC) used a similar layout, but routing subsets of the hypercube through MUXes and Ethernet, with a separate connection to a 'cube manager'. Likewise, the Connection Machine could only function when connected to a VAX that handled the program loading and getting data out of the hypercube.

### Which Microcontroller To Use

The original inspiration for this build is bitluni's [CH32V003-based Cheap RISC-V Supercluster for $2](https://www.youtube.com/watch?v=lh93FayWHqw), and it would make sense to focus on something in the CH32V family. They're cheap, they're available on [LCSC](https://www.lcsc.com/), and they're reasonably well supported. The CH32V003 is _weird_ though; it only has one UART interface, and the 'hypercube and tree' architecture really needs at least two UARTs. Programming the '003 chip is just slightly more difficult than I would want.

An alternative to the CH32V003 is the CH32V<b>203</b>. This is a faster, more capable chip based on a RISC-V4B core. It has one-cycle hardware multiply. It's easier to program. The CH32V003 is thirteen cents in quantity, the CH32V203 is thirty-seven cents in quantity. If I'm going this far, I'll spend the extra thousand dollars to get a machine that's a hundred times better.

However, the CH32V203 is not the ideal choice for this machine. A key consideration to chip selection is that the second (hypercube) UART must be capable of being assigned to any pin. The CH32V203 does not have this capability; the `USART1_TX` can only be mapped to pins `PA9` or `PB6`. The reason we need UART pins fully remapable [are covered below](https://bbenchoff.github.io/pages/ThinkinMachine.html#csma-vs-tdma), but it is a requirement for the full machine.

Most other microcontrollers have this limitation of peripherals that can only be assigned to specific pins. The [PY32 series](https://py32.org/en/mcu/PY32F403xx.html) of ARM Cortex chips support up to five UARTs, but the TX and RX of these UARTs are limited to specific pairs of pins. This is a _big_ limitation for my machine, and I wonder why fully remappable peripherals aren't as common as I would like. Is there a patent or some shit?

There are several microcontrollers that do have fully remappable peripherals, where a UART can be attached to any pin. The [NXP LPC800 series](https://www.nxp.com/products/processors-and-microcontrollers/arm-microcontrollers/general-purpose-mcus/lpc800-arm-cortex-m0-plus-/lpc800-32-bit-arm-cortex-m0-plus-based-low-cost-mcu:LPC80X) has fully remappable pins, but it's a slightly expensive part and limited to a CPU frequency of 15MHz. The LPC800 is also an Arm Cortex-M0+ microcontroller, not a RISC-V part. This different architecture is a critical shortcoming if I want to target the Twitter, Reddit, and Hacker News crowds for this project. I gotta get eyeballs on this, after all. 

The [Cypress / Infineon PSOC](https://www.infineon.com/products/microcontroller/32-bit-psoc-arm-cortex) has remappable peripherals, but these parts are even more expensive than the LPC800. The [Microchip PIC32MM](https://www.microchip.com/en-us/products/microcontrollers/32-bit-mcus/pic32m/pic32mm) has a crossbar called a 'peripheral pin select', but it's 2026 and I'm not using a PIC. The [Raspberry Pi Pico RP2350](https://www.raspberrypi.com/products/rp2350/) has PIOs, or small state machines that can assign functions to any pin. The RP2350 also has (optional) RISC-V cores, perfect for the people who appreciate tech YouTubers telling them what to think. The Pico is an expensive part, though. On paper, the RP2354A -- the part with an integrated 2MB NOR Flash -- could work. But having _exactly_ as many PIOs as the number of hypercube dimensions is clunky. The Pico is right on the cusp of being workable for this machine, but not enough so that it would be easy to make it work.

There is a better option: The [AG32 SoC family](https://www.agm-micro.com/products.aspx?lang=&id=3118&p=37) from AGM Micro. This family combines a RISC-V microcontroller core with a small (2000 LUT) FPGA fabric. The chip is essentially a RISC-V core, with all pins broken out to an FPGA fabric. With this, I can remap UARTS dynamically and talk to the hypercube nodes without bogging down the RISC-V core. The smallest AG32 is available [for eighty cents in quantity](https://www.lcsc.com/product-detail/C41397171.html) from LCSC in a QFN32 package. This is almost the ideal chip.

The AG32 has one significant shortcoming: there is zero documentation in English. The plan is to build up as much of the machine as I can using the CH32V203. In parallel, I'll work on getting a build system working for the AG32-series microcontrollers. Eventually, hopefully, the full machine will use thousands of these _really cool_ RISC-V + FPGA microcontrollers.

### 1 Node

The goal of the 1-node prototype is to program a cheap RISC-V microcontroller with another microcontroller. This can be done with a dev/breakout board for any of the cheap RISC-V chips, so I found the WeAct Studio CH32V203C8T6. After receiving the CH32V203 dev board, I wired it up to the closest Raspberry Pi Pico-shaped object within reach:

![Two dev boards on a desk](/images/ConnM/1NodePrototype.png)

It's just serial lines between two chips. The code is where things get fun.

The CH32V203 can be programmed over a UART presented on pins `PA9` and `PA10`. This is easy enough to wire up, the problem comes when trying to _talk_ to the bootloader in the CH32V203.

There's an [WCH RISC-V Microcontroller Web Serial ISP](https://www.stasisleak.uk/wchisp/) that will program these chips for you, provided you have a USB to UART converter and a firmware file for the program you want to run on this chip. For a user, the process is pretty simple, you just hold down the `Boot0` pin and click upload. Underneath the hood things fall off the rails. Programming the chip works like this:

- **Listen to the chip in bootloader mode** - the CH32 will send data over the serial connection, and this requires a "password", a fixed ASCII string that's `MCU ISP & WCH.CN`. The bootloader rejects everything if you don't send that exact string.
- **Read the chip config** - the programmer sends a bitmask to read everything, and the CH32 sends back option bytes (can the Flash memory be programmed?), the bootloader version, and an 8-byte unique ID (UID)
- **Generate a Key** - creates a random seed length of 30 bytes, computes a 'seed' with the UID and random seed, computes an 8-byte key using specific indexes from that seed and XORs it with the UID checksum. This is sent to the bootloader, and the bootloader replies with a key checksum byte, that _should_ match what the programmer has. Why the hell it does this I have no idea. You already have physical access to the chip, what's the threat model here?
- **Erases all the flash**
- **Writes the new program** in chunks of 56 bytes, XORed with the key
- **Generates a key** <b><i>again</i></b>
- **Verifies the flash with the new key**
- **Resets the CH32**, letting it start up with the firmware you just wrote.

Yes, this was a massive pain to figure out what was actually happening. The good news is I didn't have to do all the work. The [WCH-web-ISP code](https://github.com/basilhussain/wch-web-isp) is _right there_, so I just told the RP2040 to do whatever the Javascript on that page was doing.

The actual payload can be anything I want. I whipped up a slightly more sophisticated 'Hello World' and 'Blink a LED' program for the CH32, compiled it, and created a `firmware.h` file for the Pico uploader. The contents of this `.h` file is just a hex dump of the `.bin` file built by the compiler.

The full code listing of the Pico uploader is available here:

```c
#include <Arduino.h>

// ---------- Embedded firmware ----------
#include "firmware.h"   

static const uint32_t HOST_BAUD   = 115200;
static const uint32_t TARGET_BAUD = 115200;

// Pico GPIOs -> CH32 pins
static const int PIN_BOOT0   = -1;  // -> CH32 BOOT0 (active high)
static const int PIN_NRST    = -1;  // -> CH32 NRST  (active low)
static const int PIN_UART_TX = 4;  // Pico TX -> CH32 RX (PA10)
static const int PIN_UART_RX = 5;  // Pico RX <- CH32 TX (PA9)


static const uint8_t DEV_VARIANT_REQ = 0x31;
static const uint8_t DEV_TYPE_REQ    = 0x19;


static uint8_t g_dev_variant = DEV_VARIANT_REQ;
static uint8_t g_dev_type    = DEV_TYPE_REQ;

// Packet headers (packet.js)
static const uint8_t HDR_CMD0 = 0x57, HDR_CMD1 = 0xAB;
static const uint8_t HDR_RSP0 = 0x55, HDR_RSP1 = 0xAA;

// Command codes (command.js)
static const uint8_t CMD_IDENTIFY     = 0xA1;
static const uint8_t CMD_END          = 0xA2;
static const uint8_t CMD_KEY          = 0xA3;
static const uint8_t CMD_FLASH_ERASE  = 0xA4;
static const uint8_t CMD_FLASH_WRITE  = 0xA5;
static const uint8_t CMD_FLASH_VERIFY = 0xA6;
static const uint8_t CMD_CFG_READ     = 0xA7;

static const size_t CHUNK_SIZE = 56;

static bool readByteTimeout(Stream &s, uint8_t &out, uint32_t timeoutMs) {
  uint32_t t0 = millis();
  while (millis() - t0 < timeoutMs) {
    int c = s.read();
    if (c >= 0) { out = (uint8_t)c; return true; }
    delay(1);
  }
  return false;
}

static bool readExactTimeout(Stream &s, uint8_t *dst, size_t n, uint32_t timeoutMs) {
  for (size_t i = 0; i < n; i++) {
    if (!readByteTimeout(s, dst[i], timeoutMs)) return false;
  }
  return true;
}

static uint8_t sum8(const uint8_t *p, size_t n) {
  uint32_t s = 0;
  for (size_t i = 0; i < n; i++) s += p[i];
  return (uint8_t)(s & 0xFF);
}

static void hexDump(const uint8_t *p, size_t n) {
  for (size_t i = 0; i < n; i++) {
    if (p[i] < 16) Serial.print('0');
    Serial.print(p[i], HEX);
  }
}

static void enterBootloader() {
  Serial.println("MANUAL STEP: Put CH32 into bootloader now (BOOT0=1, reset/power-cycle), then send command again.");
}

static void runUserApp() {
  Serial.println("MANUAL STEP: Set BOOT0=0 and reset/power-cycle CH32 to run user app.");
}

// ---------- Packet TX/RX ----------
struct Resp {
  uint8_t  code = 0;
  uint8_t  b1   = 0;
  uint16_t len  = 0;
  uint8_t  data[64];
};

static bool sendCommand(uint8_t cmd, const uint8_t *data, uint16_t len) {
  const uint16_t payloadLen = (uint16_t)(3 + len);
  uint8_t payload[3 + 256];
  if (len > 256) return false;

  payload[0] = cmd;
  payload[1] = (uint8_t)(len & 0xFF);
  payload[2] = (uint8_t)(len >> 8);
  if (len) memcpy(&payload[3], data, len);

  uint8_t chk = sum8(payload, payloadLen);

  Serial1.write(HDR_CMD0);
  Serial1.write(HDR_CMD1);
  Serial1.write(payload, payloadLen);
  Serial1.write(chk);
  Serial1.flush();
  return true;
}

static bool recvResponse(Resp &r, uint32_t timeoutMs = 3000) {
  uint8_t b = 0;

  // Hunt header 55 AA
  while (true) {
    if (!readByteTimeout(Serial1, b, timeoutMs)) return false;
    if (b != HDR_RSP0) continue;
    if (!readByteTimeout(Serial1, b, timeoutMs)) return false;
    if (b == HDR_RSP1) break;
  }

  uint8_t p0, p1, lenLo, lenHi;
  if (!readByteTimeout(Serial1, p0, timeoutMs)) return false;
  if (!readByteTimeout(Serial1, p1, timeoutMs)) return false;
  if (!readByteTimeout(Serial1, lenLo, timeoutMs)) return false;
  if (!readByteTimeout(Serial1, lenHi, timeoutMs)) return false;

  uint16_t len = (uint16_t)(lenLo | (lenHi << 8));
  if (len > sizeof(r.data)) return false;

  if (!readExactTimeout(Serial1, r.data, len, timeoutMs)) return false;

  uint8_t chk = 0;
  if (!readByteTimeout(Serial1, chk, timeoutMs)) return false;

  // checksum over payload bytes only
  uint8_t hdr[4] = { p0, p1, lenLo, lenHi };
  uint32_t s = sum8(hdr, 4);
  for (uint16_t i = 0; i < len; i++) s += r.data[i];
  if (((uint8_t)s) != chk) return false;

  r.code = p0;
  r.b1   = p1;
  r.len  = len;
  return true;
}

static bool request(uint8_t cmd, const uint8_t *data, uint16_t len, Resp &r, uint32_t timeoutMs = 3000) {
  if (!sendCommand(cmd, data, len)) return false;
  if (!recvResponse(r, timeoutMs)) return false;
  return (r.code == cmd);
}

// ---------- Device state ----------
static uint8_t optBytes[8];
static uint8_t chipUID[8];
static uint8_t keyBytes[8];

// ---------- Commands ----------
static bool cmdIdentify() {
  const char passwd[] = "MCU ISP & WCH.CN"; // 16 bytes
  uint8_t data[2 + 16];
  data[0] = DEV_VARIANT_REQ;
  data[1] = DEV_TYPE_REQ;
  memcpy(&data[2], passwd, 16);

  Resp r;
  if (!request(CMD_IDENTIFY, data, sizeof(data), r)) return false;
  if (r.len != 2) return false;
  if (r.data[0] >= 0xF0) return false; // bad password etc.

  // IMPORTANT: save what it *reported*
  g_dev_variant = r.data[0];
  g_dev_type    = r.data[1];

  Serial.print("IDENT OK. variant=0x"); Serial.print(g_dev_variant, HEX);
  Serial.print(" type=0x");             Serial.println(g_dev_type, HEX);
  return true;
}

static bool cmdConfigRead() {
  uint8_t data[2] = { 0x1F, 0x00 };
  Resp r;
  if (!request(CMD_CFG_READ, data, sizeof(data), r)) return false;

  if (r.len != 26) return false;
  if (r.data[0] == 0x00) return false;

  optBytes[0] = r.data[2];
  optBytes[1] = r.data[4];
  optBytes[2] = r.data[6];
  optBytes[3] = r.data[8];
  optBytes[4] = r.data[10];
  optBytes[5] = r.data[11];
  optBytes[6] = r.data[12];
  optBytes[7] = r.data[13];

  memcpy(chipUID, &r.data[18], 8);

  Serial.print("CFG RDPR=0x"); Serial.print(optBytes[0], HEX);
  Serial.print(" USER=0x");    Serial.print(optBytes[1], HEX);
  Serial.print(" UID=");       hexDump(chipUID, 8);
  Serial.println();
  return true;
}

static uint32_t rngState = 0xA5A5A5A5;
static uint8_t prng8() {
  rngState ^= rngState << 13;
  rngState ^= rngState >> 17;
  rngState ^= rngState << 5;
  return (uint8_t)(rngState & 0xFF);
}

static bool cmdKeyGenerate(uint8_t seedLen = 60) {
  if (seedLen < 30) seedLen = 30;
  if (seedLen > 60) seedLen = 60;

  uint8_t seed[60];
  for (uint8_t i = 0; i < seedLen; i++) seed[i] = prng8();

  uint8_t uidChk = 0;
  for (int i = 0; i < 8; i++) uidChk = (uint8_t)((uidChk + chipUID[i]) & 0xFF);

  const uint8_t a = (uint8_t)(seedLen / 5);
  const uint8_t b = (uint8_t)(seedLen / 7);

  keyBytes[0] = uidChk ^ seed[b * 4];
  keyBytes[1] = uidChk ^ seed[a];
  keyBytes[2] = uidChk ^ seed[b];
  keyBytes[3] = uidChk ^ seed[b * 6];
  keyBytes[4] = uidChk ^ seed[b * 3];
  keyBytes[5] = uidChk ^ seed[a * 3];
  keyBytes[6] = uidChk ^ seed[b * 5];

  keyBytes[7] = (uint8_t)((keyBytes[0] + g_dev_variant) & 0xFF);

  uint8_t keyChk = 0;
  for (int i = 0; i < 8; i++) keyChk = (uint8_t)((keyChk + keyBytes[i]) & 0xFF);

  Resp r;
  if (!request(CMD_KEY, seed, seedLen, r)) return false;
  if (r.len != 2) return false;
  if (r.data[0] == 0x00) return false;

  if (r.data[0] != keyChk) {
    Serial.print("KEYCHK mismatch: host=0x"); Serial.print(keyChk, HEX);
    Serial.print(" boot=0x");                 Serial.println(r.data[0], HEX);
    return false;
  }

  Serial.print("KEY OK key="); hexDump(keyBytes, 8); Serial.println();
  return true;
}

static bool cmdFlashErase(uint32_t sectors1k) {
  uint8_t data[4] = {
    (uint8_t)(sectors1k & 0xFF),
    (uint8_t)((sectors1k >> 8) & 0xFF),
    (uint8_t)((sectors1k >> 16) & 0xFF),
    (uint8_t)((sectors1k >> 24) & 0xFF),
  };

  Resp r;
  if (!request(CMD_FLASH_ERASE, data, sizeof(data), r, 5000)) return false;
  return (r.len == 2 && r.data[0] == 0x00);
}

static void xorEncrypt(uint8_t *dst, const uint8_t *src, size_t n) {
  for (size_t i = 0; i < n; i++) dst[i] = (uint8_t)(src[i] ^ keyBytes[i % 8]);
}

static bool cmdFlashWriteChunk(uint32_t addr, const uint8_t *plain, uint16_t n) {
  uint8_t data[5 + CHUNK_SIZE];
  data[0] = (uint8_t)(addr & 0xFF);
  data[1] = (uint8_t)((addr >> 8) & 0xFF);
  data[2] = (uint8_t)((addr >> 16) & 0xFF);
  data[3] = (uint8_t)((addr >> 24) & 0xFF);
  data[4] = 0x00;

  if (n > 0) xorEncrypt(&data[5], plain, n);

  Resp r;
  if (!request(CMD_FLASH_WRITE, data, (uint16_t)(5 + n), r, 3000)) return false;
  return (r.len == 2 && r.data[0] == 0x00);
}

static bool cmdFlashWriteFinalize(uint32_t endAddr) {
  return cmdFlashWriteChunk(endAddr, nullptr, 0);
}

static bool cmdFlashVerifyChunk(uint32_t addr, const uint8_t *plain, uint16_t n) {
  uint8_t data[5 + CHUNK_SIZE];
  data[0] = (uint8_t)(addr & 0xFF);
  data[1] = (uint8_t)((addr >> 8) & 0xFF);
  data[2] = (uint8_t)((addr >> 16) & 0xFF);
  data[3] = (uint8_t)((addr >> 24) & 0xFF);
  data[4] = 0x00;

  if (n > 0) xorEncrypt(&data[5], plain, n);

  Resp r;
  if (!request(CMD_FLASH_VERIFY, data, (uint16_t)(5 + n), r, 3000)) return false;
  return (r.len == 2 && r.data[0] == 0x00);
}

static bool cmdEnd(bool doReset) {
  uint8_t data[1] = { (uint8_t)(doReset ? 0x01 : 0x00) };
  Resp r;
  if (!request(CMD_END, data, sizeof(data), r, 3000)) return false;
  return (r.len == 2 && r.data[0] == 0x00);
}

static bool programEmbedded(bool verify) {
  const uint8_t *fw = firmware_bin;
  const uint32_t fwLen = (uint32_t)firmware_bin_len;

  Serial.print("FW size: "); Serial.println(fwLen);

  enterBootloader();

  if (!cmdIdentify())   { Serial.println("FAIL identify"); return false; }
  if (!cmdConfigRead()) { Serial.println("FAIL configRead"); return false; }

  if (!cmdKeyGenerate(60)) { Serial.println("FAIL keygen"); return false; }

  const uint32_t sectors = (fwLen + 1023u) / 1024u;
  Serial.print("Erasing "); Serial.print(sectors); Serial.println(" sectors (1K)...");
  if (!cmdFlashErase(sectors)) { Serial.println("FAIL erase"); return false; }

  Serial.println("Writing...");
  for (uint32_t off = 0; off < fwLen; off += (uint32_t)CHUNK_SIZE) {
    uint16_t n = (uint16_t)min((uint32_t)CHUNK_SIZE, fwLen - off);
    if (!cmdFlashWriteChunk(off, &fw[off], n)) {
      Serial.print("FAIL write @"); Serial.println(off);
      return false;
    }
  }
  if (!cmdFlashWriteFinalize(fwLen)) { Serial.println("FAIL write finalize"); return false; }

  if (verify) {
    if (!cmdKeyGenerate(60)) { Serial.println("FAIL keygen2"); return false; }
    Serial.println("Verifying...");
    for (uint32_t off = 0; off < fwLen; off += (uint32_t)CHUNK_SIZE) {
      uint16_t n = (uint16_t)min((uint32_t)CHUNK_SIZE, fwLen - off);
      if (!cmdFlashVerifyChunk(off, &fw[off], n)) {
        Serial.print("FAIL verify @"); Serial.println(off);
        return false;
      }
    }
  }

  if (!cmdEnd(true)) { Serial.println("WARN end/reset failed"); }
  Serial.println("DONE (resetting into user app)");
  return true;
}

void setup() {
  Serial.begin(HOST_BAUD);
  delay(200);

  pinMode(PIN_BOOT0, OUTPUT);
  pinMode(PIN_NRST, OUTPUT);
  digitalWrite(PIN_BOOT0, LOW);
  digitalWrite(PIN_NRST, HIGH);

  Serial1.setTX(PIN_UART_TX);
  Serial1.setRX(PIN_UART_RX);
  Serial1.begin(TARGET_BAUD);

  rngState ^= micros();

  Serial.println("Pico CH32 ISP ready.");
  Serial.println("Commands: I=identify, C=config, F=flash+verify, f=flash, R=reset app");
}

void loop() {
  if (!Serial.available()) return;
  char c = (char)Serial.read();

  if (c == 'I') {
    Serial.println(cmdIdentify() ? "OK" : "FAIL");
  } else if (c == 'C') {
    bool ok = cmdIdentify() && cmdConfigRead();
    Serial.println(ok ? "OK" : "FAIL");
  } else if (c == 'F') {
    (void)programEmbedded(true);
  } else if (c == 'f') {
    (void)programEmbedded(false);
  } else if (c == 'R') {
    runUserApp();
    Serial.println("Reset into user app.");
  }
}

```

After uploading the new firmware for the CH32 with a Pico, I have verification that _this just might work_. I can program the microcontrollers of a hypercube, so it's time to build a hypercube.

### 16 Nodes, The Slice

**A more complete build log for the 16 node prototype is [available here](16NodeMachine.html)**

This is where the build starts getting serious. The purpose of the 16-node prototype is to verify the previous work of the 1-node build (programming via UART, external clocking) as well as defining the links between nodes, synchronization, and message passing between nodes. This is _hard_, and it's a good idea to do this on a prototype board before scaling up to larger builds.

The Slice is a 4-dimensional hypercube, or 16 microcontrollers, each connected to 4 others. These 16 nodes are controlled by a dedicated microcontroller, programming each node over serial, toggling the reset circuit, and loading data into and out of each node.

![Block diagram of 16 nodes, showing a 16-node hypercube controlled via UART](/images/ConnM/SliceControl.png)

The dedicated microcontroller used for this board is the RP2040. I'm using this chip for a few reasons. First, the PIOs. The PIOs in the RP2040 are small state machines that have access to GPIOs and memory via DMA that run independently of the core. [I have used this functionality before](https://bbenchoff.github.io/pages/IsoTherm.html) to generate clock signals and read data directly into memory, as well as controlling the I2C lines in the LED panel. The PIOs are fantastic little peripherals that enable me to program a clock sent to all of the 'Slice' microcontrollers and read serial output. It's a lot easier and cheaper than finding a microcontroller with 16 independent UARTs, too.

![Render of the 16-node board](/images/ConnM/SlicePrototype.png)

#### Hypercube Communication

The 16-node board is also the first experiment with the hypercube links between nodes. Simply because I don't want double the work and density of wires in the full machine, I'm using a single wire communication between the nodes, just connecting one GPIO pin of a node to another GPIO pin of another node. These are single-wire half-duplex links, not a TX/RX pair. The CH32V203 only has two hardware UARTs, and one is dedicated to the Slice controller. If I need twelve UARTs for the hypercube connections, I'll have to bitbang them in software.

The astute reader will notice many problems with twelve bit-banged UARTs over a single-wire open-drain connection between microcontrollers. Those are electrical engineering terms, so here's automotive terms: it's like doing the Baja 1000 in a stock 1993 Ford Taurus. Yeah, you can finish it, but you're not making it easy on yourself. Back to electrical terms, you should _really_ have two wires between chips, either as a Tx/Rx pair, or a data clock line pair. It would be really cool if you could use hardware UARTs if only to make programming simpler. But this is a hypercube computer, a single-wire link between nodes already means there are too many wires on the PCB, and I can't find a single microcontroller with twelve UARTs.

To actually pass messages back and forth between nodes through the hypercube array, we need a way to arbitrate the connections -- which node actually gets to use the connection. There are several ways to do this.

#### CSMA vs TDMA

<b>CSMA:</b>

The naive way to arbitrate message passing between nodes is carrier-sense multiple access, or [CSMA](https://en.wikipedia.org/wiki/Carrier-sense_multiple_access). Consider two nodes. At rest, the line is pulled high, because of the pullup. For node Alice to talk to node Bob, Alice first pulls the line low for some number of microseconds. Bob detects the line is low, and starts listening. Then Alice starts sending data. If Bob wants to talk to Alice, Bob pulls the line low, waits, then sends data. Alice listens.

![CSMA timing diagram and explination](/images/ConnM/CSMA.png)

This has significant drawbacks. There _will_ be collisions, where both nodes want to talk at the same time. I would have to add backoff timers and retries, and god forbid acknowledgements. The code to do this is gnarly, and I simply don't want to do it. Because there's a better way.

<b>TDMA:</b>

**A more thorough explanation of the TDMA messaging scheme is [available here](HypercubeTDMA.html)**

Consider the actual topology of what's communicating here. All nodes are assigned a 12-bit number. Each connection is to a processor that is a _single_ bit flip away. Node 0x2A3 is connected to node 0x2A2 (bit 0 flipped), node 0x2A1 (bit 1 flipped), node 0x2AB (bit 3 flipped), and so on.

Now define a global tick counter, synchronized across all nodes via the shared clock from the slice controllers. The phase is just tick mod 24 - twelve dimensions, two directions each. In phase d, only dimension d links are active. All other links stay idle. Within that phase, the node with addr[d] == 0 transmits first, then the node with addr[d] == 1 transmits in the second half. This is time-division multiple access, or [TDMA](https://en.wikipedia.org/wiki/Time-division_multiple_access).

![TDMA timing diagram and explination](/images/ConnM/TDMA.png)

Or, if you prefer text form:

- **Phase 0**: Nodes with address `xxxx xxxx xxx0` sends → Nodes `xxxx xxxx xxx1` receives
- **Phase 1**: Nodes with address `xxxx xxxx xxx1` sends → Nodes `xxxx xxxx xxx0` receives
- **Phase 2**: Nodes with address `xxxx xxxx xx0x` sends → Nodes `xxxx xxxx xx1x` receives
- **Phase 3**: Nodes with address `xxxx xxxx xx1x` sends → Nodes `xxxx xxxx xx0x` receives
- **Phase 4**: Nodes with address `xxxx xxxx x0xx` sends → Nodes `xxxx xxxx x1xx` receives
- **Phase 5**: Nodes with address `xxxx xxxx x1xx` sends → Nodes `xxxx xxxx x0xx` receives
- And so on for 24 phases...

The brilliant part about this is that no node ever talks to its neighbor at the same time. Collisions are impossible, _and_ this scheme vastly simplifies the UART code for each node. In fact, because only dimension connection is active at any one time, **I ONLY NEED ONE UART FOR THE HYPERCUBE**, reconfigured for different pins for each phase.

Since only one dimension is active per phase, each node only needs to speak on one physical link at a time. If the UART can be remapped fast enough, one hardware UART can time-multiplex across all 12 links. The hypercube unfolds into time. Twelve dimensions become twenty-four phases, and the topology is temporal as much as spatial. Now we have a counter to the redditor who will say, "well acktually it's not a true hypercube because we live in four dimensions, three spacial dimension plus time." We can now tell that loser to stuff it.

It's also _fast_:

<b>Throughput at various baud rates:</b>
<div class="table-wrap">
<table class="matrix-table">
<tr>
  <th>Baud Rate</th>
  <th>Per-Link BW</th>
  <th>Per-Node BW</th>
  <th>Machine Aggregate</th>
</tr>
<tr>
  <td>115.2 kbps</td>
  <td>4.8 kbps</td>
  <td>115.2 kbps</td>
  <td>236 Mbps</td>
</tr>
<tr>
  <td>500 kbps</td>
  <td>20.8 kbps</td>
  <td>500 kbps</td>
  <td>1.02 Gbps</td>
</tr>
<tr>
  <td>1 Mbps</td>
  <td>41.7 kbps</td>
  <td>1 Mbps</td>
  <td>2.05 Gbps</td>
</tr>
<tr>
  <td>2 Mbps</td>
  <td>83.3 kbps</td>
  <td>2 Mbps</td>
  <td><b>4.1 Gbps</b></td>
</tr>
</table>
</div>

<b>Latency at various phase rates:</b>
<div class="table-wrap">
<table class="matrix-table">
<tr>
  <th>Phase Rate</th>
  <th>Phase Duration</th>
  <th>Bits per Phase @ 1Mbps</th>
  <th>12-Hop Latency</th>
</tr>
<tr>
  <td>1 kHz</td>
  <td>1 ms</td>
  <td>1000 bits</td>
  <td>144 ms</td>
</tr>
<tr>
  <td>10 kHz</td>
  <td>100 µs</td>
  <td>100 bits</td>
  <td>14.4 ms</td>
</tr>
<tr>
  <td>100 kHz</td>
  <td>10 µs</td>
  <td>10 bits</td>
  <td>1.44 ms</td>
</tr>
<tr>
  <td>1 MHz</td>
  <td>1 µs</td>
  <td>1 bit</td>
  <td>144 µs</td>
</tr>
</table>
</div>

<b>There's a catch with this plan</b>

As discussed above, most chips, including the CH32V203, can not assign UART functions to any pin. The CH32V203 does not have this pin remapping function. The [AG32VF-ASIC](https://www.agm-micro.com/products.aspx?lang=&id=3118&p=37) from AGM Micro can do this. This chip is a RISC-V RV32IMAFC microcontroller bolted onto a CPLD with 2K LUTs. All peripheral functions can be mapped onto any pin, and this can be done dynamically. It's eighty cents a piece [on LCSC](https://www.lcsc.com/product-detail/C41397171.html?).

<b>This is actually going to work</b> And with TDMA, 16-node prototype verifies everything needed for the full 4096-node machine. If TDMA works with 16 nodes, it'll work with 4096.

I want to take a step back here and just point out I'm designing a machine that can move a gigabit or more per second around its memory, does this with a single hardware UART, and is built out of thirty cent RISC-V microcontrollers. All of this _just falls out of the topology of the machine_. Instead of a furball of code trying to get rid of problems with carrier sense, TDMA based on the address of the node solves the problem elegantly.

This should be your first realization that the hypercube architecture is recursively elegant. If you construct a parallel computer with a hypercube architecture, cool stuff just appears.

Two documents were created to explain the 16 node prototype, linked here:

**Related pages:**
- **[TDMA Routing on a Hypercube](HypercubeTDMA.html)**
- **[16 Node Hypercube Microcontroller Cluster](16NodeMachine.html)**

### 256 Nodes, The Plane

The 256 node prototype builds on the progress made with the 1-node and 16-node boards. It is effectively sixteen copies of the 16-node board, with an additional Plane controller chip talking to each of the 16 Slice controllers. This prototype is effectively also the first 'production' circuit; in the full machine, I'm splitting up 4096 nodes over 16 individual boards of 256 nodes. This means the 256 node prototype is also the first revision of the main processor boards that will go into the machine.

![Block diagram of 16 Slices, showing the architecture of a Plane](/images/ConnM/PanelControl.png)

The 256 node board is also the first one prototype where things get really hairy and interesting. Each chip is connected to eight other chips in the hypercube array. For 256 chips, this means there are 2048 inter-node links. If the chips can handle this, they're _probably_ good for the entire 4096-node full machine.

### 4096 Nodes

This is where the magic happens. The original CM-1 was controlled via a DEC VAX or Lisp machine that acted as a front-end processor. The front-end would broadcast instructions to the array, collect results, and handle I/O with the outside world. My machine needs something similar. At the top of the hierarchy sits a Zynq SoC - an FPGA with ARM cores bolted on. This is the easiest way to get 

This handles:

- **Instruction broadcast**: In SIMD mode, the Zynq sends opcodes down the tree to all 4,096 nodes simultaneously
- **Result aggregation**: Data flows up through the Planes, gets collected, and presents to the outside world
- **Network interface**: Ethernet to everything else, USB, and HDMI simply because the Zynq support it. It's a Linux machine, after all.
- **LED coordination**: Someone has to tell that 64x64 array what to display

The Zynq talks to 16 Plane controllers. Each Plane controller talks to 16 Slice controllers. Each Slice controller talks to 16 nodes. It's trees all the way down.

## The Backplane

The backplane is the key to the entire machine. This is historically true for big, old machines. I've been inside a PDP Straight-8, and the entire computer is composed of small cards containing just a few circuits. Plug them into the backplane -- a gigantic wire-wrapped monstrosity -- and the computer _appears_ out of these simple single-circuit cards. The Cray Couch, despite vastly more complicated modules, _appears_ when you add miles of wire in between these modules. This machine is no exception.

The modular nature of my machine means I only have to design one processor board and manufacture it 16 times. Each board handles 2,048 internal connections between its 256 chips, and exposes 1,024 connections to the backplane. The backplane does all the heavy lifting. It's where the real routing complexity lives, implementing the inter-board connections that make 16 separate 8D cubes behave like one unified 12D hypercube. The boards are segmented like this:

<b>Board-to-Board Connection Matrix</b>
<p><em>Rows = Source Board, Columns = Destination Board, Values = Number of connections</em></p>
<div class="table-wrap">
<table class="matrix-table">
<tr>
  <th>Board</th>
  <th>B00</th><th>B01</th><th>B02</th><th>B03</th><th>B04</th><th>B05</th><th>B06</th><th>B07</th>
  <th>B08</th><th>B09</th><th>B10</th><th>B11</th><th>B12</th><th>B13</th><th>B14</th><th>B15</th>
</tr>
<tr><th>B00</th><td class="empty">0</td><td class="connected">256</td><td class="connected">256</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td></tr>
<tr><th>B01</th><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td></tr>
<tr><th>B02</th><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td></tr>
<tr><th>B03</th><td class="empty">0</td><td class="connected">256</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td></tr>
<tr><th>B04</th><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td></tr>
<tr><th>B05</th><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td></tr>
<tr><th>B06</th><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td></tr>
<tr><th>B07</th><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="connected">256</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td></tr>
<tr><th>B08</th><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="connected">256</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td></tr>
<tr><th>B09</th><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td></tr>
<tr><th>B10</th><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td></tr>
<tr><th>B11</th><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td></tr>
<tr><th>B12</th><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="connected">256</td><td class="empty">0</td></tr>
<tr><th>B13</th><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td></tr>
<tr><th>B14</th><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td></tr>
<tr><th>B15</th><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="empty">0</td><td class="empty">0</td><td class="connected">256</td><td class="empty">0</td><td class="connected">256</td><td class="connected">256</td><td class="empty">0</td></tr>
</table>
</div>

### The Backplane Connectors

Mechanically, this device is _tight_. The LED panel is screwed into a frame that also holds the back plane on the opposite side. The back side has USB-C and Ethernet connections to the outside world. Internally, there's a bunch of crap. A Mean Well power supply provides the box with 12V power. Since 4096 RISC-V chips will draw _hundreds_ of Watts, cooling is also a necessity. A quartet of fans are bolted to the back panel of the device. Noctua on that thang.

There's a lot of stuff in this box, and not a lot of places to put 16 boards. Here's a graphic showing the internals of the device, with the area for the RISC-V boards highlighted in pink:

![An internal view of the device, showing where the RISC-V boards will go](/images/ConnM/HighlightedBoardArea.png)

There isn't much space to put the connectors for sixteen boards, especially connectors with 1100 pins. Dividing 1100 pins by the available length of 200mm gives us a pin pitch of 0.2mm. The pins for the connectors would have to be 0.2mm apart. This just doesn't exist.

So how do you physically connect 1024 signals per board, in 200mm, with 10mm of height to work with? You don’t, because the connector you need doesn’t exist. After an evening spent crawling Samtec, Amphenol, Hirose, and Molex catalogs, I landed on this solution:

![Three views of the chosen connector, cutaway to show how the attach to the boards](/images/ConnM/ConnectorCutaway.png)

For the card-to-backplane connections, I'm using Molex SlimStack connectors, 0.4mm pitch, dual row, with 50 circuits per connector. They are Part Number 5033765020 for the right angle connectors on each card, and Part Number 545525010 for the connectors on the backplane. Instead of using a single connector on one side of the cards, I'm doubling it up, with connectors on both the top and the bottom. Effectively, I'm creating my own 4-row right angle SMT connector. Obviously, the connectors are also doubled on the backplane. This gives me 100 circuits in just 15mm of width along the 'active' edge of each card, and a card 'pitch' of 8mm. This is well within the requirements of this project. It's _insane_, but everything about this project is.

With an array of 22 connectors per card -- 11 on both top and bottom -- I have 1100 electrical connections between the cards and backplane, enough for the 1024 hypercube connections, and enough left over for power, ground, and some sparse signalling. That's the _electrical_ connections sorted, but there's still a  slight mechanical issue. For interfacing and mating with the backplane, I'll be using Samtec's [GPSK guide post sockets](https://www.samtec.com/products/gpsk) and [GPPK guide posts](https://www.samtec.com/products/gppk). With that, I've effectively solved making the biggest backplane any one person has ever produced. 

![Renders of the computer with the backplane unloaded, left, and loaded with 16 compute cards, right](/images/ConnM/ChassisUnloadedLoaded.png)

Above is a render of the machine showing the scale and density of what's going on. Most of the front of the computer is the backplane, with the 'compute cards' -- sixteen of the 8-dimensional hypercube boards -- filling all the space. The cards, conveniently, are on a half-inch pitch, or 0.5 inches from card to card.

It's _tight_, but it's possible. The rest is only a routing problem.

### The Backplane Schematic

This script defines the links between nodes in a 12D hypercube, broken up into 16 8D cubes:

```python
import sys
import random
import math
import copy

def generate_board_routing(num_boards, output_file="hypercube_routing.txt"):
    nodes_per_board = 256  # 8D cube per board
    total_nodes = num_boards * nodes_per_board
    total_dimensions = 12  # 12D hypercube
    
    # Define which dimensions are on-board vs off-board
    onboard_dims = list(range(8))      # Dimensions 0-7 are within each board
    offboard_dims = list(range(8, 12)) # Dimensions 8-11 connect between boards

    if num_boards != 2 ** (total_dimensions - 8):
        print(f"Warning: For a full 12D cube with 8D boards, you need {2 ** (total_dimensions - 8)} boards.")

    # Initialize data structures
    boards = {board_id: {"local": [], "offboard": [], "local_count": 0, "offboard_count": 0} for board_id in range(num_boards)}
    connection_matrix = [[0 for _ in range(num_boards)] for _ in range(num_boards)]

    for node in range(total_nodes):
        board_id = node // nodes_per_board
        local_conns = []
        offboard_conns = []

        # Handle on-board connections (dimensions 0-7)
        for d in onboard_dims:
            neighbor = node ^ (1 << d)
            if neighbor < total_nodes:
                neighbor_board = neighbor // nodes_per_board
                if neighbor_board == board_id:  # Should always be true for dims 0-7
                    local_conns.append(neighbor)
                    boards[board_id]["local_count"] += 1

        # Handle off-board connections (dimensions 8-11)
        for d in offboard_dims:
            neighbor = node ^ (1 << d)
            if neighbor < total_nodes:
                neighbor_board = neighbor // nodes_per_board
                if neighbor_board != board_id:  # Should always be true for dims 8-11
                    offboard_conns.append((neighbor, d))
                    boards[board_id]["offboard_count"] += 1
                    connection_matrix[board_id][neighbor_board] += 1

        boards[board_id]["local"].append((node, local_conns))
        boards[board_id]["offboard"].append((node, offboard_conns))

    # Perform placement optimization
    grid_size = num_boards
    original_mapping = list(range(num_boards))  # Board ID to grid position

    optimized_mapping = simulated_annealing(connection_matrix, grid_size)

    inverse_mapping = {new_id: old_id for new_id, old_id in enumerate(optimized_mapping)}

    # Output routing
    with open(output_file, "w") as f:
        f.write(f"=== Hypercube Routing Analysis ===\n")
        f.write(f"Total nodes: {total_nodes}\n")
        f.write(f"Nodes per board: {nodes_per_board}\n")
        f.write(f"Number of boards: {num_boards}\n")
        f.write(f"On-board dimensions: {onboard_dims}\n")
        f.write(f"Off-board dimensions: {offboard_dims}\n\n")
        
        for board_id in range(num_boards):
            f.write(f"\n=== Board {board_id} ===\n")
            f.write("Local connections (dimensions 0-7):\n")
            for node, local in boards[board_id]["local"]:
                if local:  # Only show nodes that have local connections
                    f.write(f"Node {node:04d}: {', '.join(str(n) for n in local)}\n")

            f.write("\nOff-board connections (dimensions 8-11):\n")
            for node, offboard in boards[board_id]["offboard"]:
                if offboard:
                    # Show which boards each node connects to, not the dimension
                    conns = []
                    for neighbor_node, d in offboard:
                        neighbor_board = neighbor_node // nodes_per_board
                        conns.append(f"(Node {neighbor_node} -> Board {neighbor_board:02d})")
                    conns_str = ', '.join(conns)
                    f.write(f"Node {node:04d}: {conns_str}\n")

            f.write("\nSummary:\n")
            f.write(f"Total local connections (on-board): {boards[board_id]['local_count']}\n")
            f.write(f"Total off-board connections: {boards[board_id]['offboard_count']}\n")

        # Output original board-to-board connection matrix
        f.write("\n=== Original Board-to-Board Connection Matrix ===\n")
        f.write("Rows = Source Board, Columns = Destination Board\n\n")

        header = "     " + "".join([f"B{b:02d} " for b in range(num_boards)]) + "\n"
        f.write(header)
        for i in range(num_boards):
            row = f"B{i:02d}: " + " ".join(f"{connection_matrix[i][j]:3d}" for j in range(num_boards)) + "\n"
            f.write(row)

        # Verify the matrix matches expected pattern
        f.write("\n=== Connection Matrix Verification ===\n")
        for i in range(num_boards):
            connected_boards = [j for j in range(num_boards) if connection_matrix[i][j] > 0]
            f.write(f"Board {i} connects to boards: {connected_boards}\n")
            # Each board should connect to exactly 4 other boards (for dims 8,9,10,11)
            if len(connected_boards) != 4:
                f.write(f"  WARNING: Expected 4 connections, got {len(connected_boards)}\n")

        # Output optimized board-to-board connection matrix
        f.write("\n=== Optimized Board-to-Board Connection Matrix (Reordered Boards) ===\n")
        f.write("Rows = New Source Board (Grid Order), Columns = New Destination Board\n\n")

        f.write(header)
        for i in range(num_boards):
            real_i = optimized_mapping[i]
            row = f"B{i:02d}: " + " ".join(f"{connection_matrix[real_i][optimized_mapping[j]]:3d}" for j in range(num_boards)) + "\n"
            f.write(row)

        # Output board-to-grid mapping
        f.write("\n=== Board to Grid Mapping ===\n")
        for idx, board_id in enumerate(optimized_mapping):
            x, y = idx % grid_size, idx // grid_size
            f.write(f"Grid Pos ({x}, {y}): Board {board_id}\n")

    print(f"Board routing and connection matrix (optimized) written to {output_file}")

    
def compute_total_cost(mapping, connection_matrix, grid_size):
    num_boards = len(mapping)
    pos = {mapping[i]: i for i in range(num_boards)}  # slot positions in 1D
    cost = 0
    for i in range(num_boards):
        for j in range(num_boards):
            if i != j:
                distance = abs(pos[i] - pos[j])
                cost += connection_matrix[i][j] * distance
    return cost

def simulated_annealing(connection_matrix, grid_size, initial_temp=10000.0, final_temp=1.0, alpha=0.95, iterations=5000):
    num_boards = len(connection_matrix)
    current = list(range(num_boards))
    best = current[:]
    best_cost = compute_total_cost(best, connection_matrix, grid_size)

    temp = initial_temp
    for it in range(iterations):
        # Random swap
        i, j = random.sample(range(num_boards), 2)
        new = current[:]
        new[i], new[j] = new[j], new[i]

        new_cost = compute_total_cost(new, connection_matrix, grid_size)
        delta = new_cost - best_cost

        if delta < 0 or random.random() < math.exp(-delta / temp):
            current = new
            if new_cost < best_cost:
                best = new[:]
                best_cost = new_cost

        temp *= alpha
        if temp < final_temp:
            break

    return best

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_hypercube_routing.py <num_boards>")
        sys.exit(1)

    num_boards = int(sys.argv[1])
    generate_board_routing(num_boards)

```

This script will spit out an 8000+ line text file, defining all 4096 nodes and all of the connections between nodes. For each of the 16 CPU boards, there are 2048 local connections to other chips on the same board, and 1024 off-board connections. The output of the above script looks like `Node 2819: 2818, 2817, 2823, 2827, 2835, 2851, 2883, 2947`, meaning Node 2819 connects to 8 other nodes locally. I also get the off-board connections with `Node 2819: (Node 2563 -> Board 10), (Node 2307 -> Board 09), (Node 3843 -> Board 15), (Node 771 -> Board 03)`. Add these up, and you can get a complete list of what's connected to this single node:

**Node 2819 (on Board 11):**
- Connected to **2818, 2817, 2823, 2827, 2835, 2851, 2883, 2947** locally
- Connected to **2563** on Board 10
- Connected to **2307** on Board 9
- Connected to **3843** on Board 15
- Connected to **771** on Board 3

That's the _complete_ routing. But I'm not doing a complete routing; this is going to be broken up over multiple boards and connected through a very very large backplane. This means even more scripting. For creating the backplane routing, I came up with this short script that generates a .CSV file laying out the board-to-board connections:

```python
import csv
from collections import defaultdict

NUM_BOARDS = 16
NODES_PER_BOARD = 256
TOTAL_NODES = NUM_BOARDS * NODES_PER_BOARD
DIMENSIONS = 12
OFFBOARD_DIMS = [8, 9, 10, 11]
MAX_PINS_PER_CONNECTOR = 1024

def get_board(node_id):
    return node_id // NODES_PER_BOARD

def get_node_on_board(node_id):
    return node_id % NODES_PER_BOARD

def generate_offboard_connections():
    # (board -> list of (local_node_id, dimension, neighbor_board, neighbor_node_id))
    offboard_edges = []

    for node in range(TOTAL_NODES):
        for d in OFFBOARD_DIMS:
            neighbor = node ^ (1 << d)
            if neighbor >= TOTAL_NODES:
                continue

            b1 = get_board(node)
            b2 = get_board(neighbor)
            if b1 != b2:
                offboard_edges.append((
                    (b1, get_node_on_board(node)),
                    d,
                    (b2, get_node_on_board(neighbor))
                ))

    # De-duplicate (undirected)
    seen = set()
    deduped = []
    for src, d, dst in offboard_edges:
        net_id = tuple(sorted([src, dst]) + [d])
        if net_id not in seen:
            seen.add(net_id)
            deduped.append((src, d, dst))
    return deduped

def assign_pins(routing):
    pin_usage = defaultdict(int)  # board_id -> next free pin
    pin_assignments = []
    
    # Track connections per board pair for numbering
    board_pair_signals = defaultdict(int)

    for src, d, dst in routing:
        b1, n1 = src
        b2, n2 = dst

        pin1 = pin_usage[b1] + 1
        pin2 = pin_usage[b2] + 1

        if pin1 > MAX_PINS_PER_CONNECTOR or pin2 > MAX_PINS_PER_CONNECTOR:
            raise Exception(f"Ran out of pins on board {b1} or {b2}")

        pin_usage[b1] += 1
        pin_usage[b2] += 1

        # Create short, meaningful net name
        # Sort board numbers for consistent naming
        if b1 < b2:
            board_pair = (b1, b2)
            signal_num = board_pair_signals[board_pair]
        else:
            board_pair = (b2, b1)
            signal_num = board_pair_signals[board_pair]
        
        board_pair_signals[board_pair] += 1
        
        # Generate short net name: B00B01_042
        net_name = f"B{board_pair[0]:02d}B{board_pair[1]:02d}_{signal_num:03d}"
        
        pin_assignments.append((
            net_name,
            f"J{b1+1}", pin1,
            f"J{b2+1}", pin2
        ))

    return pin_assignments

def write_csv(pin_assignments, filename="backplane_routing.csv"):
    with open(filename, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["NetName", "ConnectorA", "PinA", "ConnectorB", "PinB"])
        for row in pin_assignments:
            writer.writerow(row)
    print(f"Wrote routing to {filename}")

if __name__ == "__main__":
    print("Generating hypercube routing...")
    routing = generate_offboard_connections()
    print(f"Found {len(routing)} off-board connections.")

    print("Assigning pins...")
    pin_assignments = assign_pins(routing)

    print("Writing CSV...")
    write_csv(pin_assignments)
```

The output is just a netlist, and is an 8000-line file with lines that look like `B10B11_246,J11,1005,J12,759`. Here, the connection between Board 10 and Board 11, net 246, is defined as a connection between J11 (backplane connection number 11),  pin 1005 and J12, pin 759. This was imported into the KiCad schematic with the [kicad-skip library](https://github.com/psychogenic/kicad-skip). The resulting schematic is just a little bit insane. It's 16 connectors with 1100 pins each, and there are 8192 unrouted connections after importing the netlist.

![a view of the backplane, before routing the PCB](/images/ConnM/unroutedbackplane.png)

Yeah, it's the most complex PCB I've ever designed. Doing this by hand would take weeks. It's also a perfect stress test for the autorouter. Using the [FreeRouting plugin for KiCad](https://freerouting.org/freerouting/using-with-kicad), I loaded the board and set it to the task of routing 16,000 airwires with a 12-layer board. Here's the result of seven hours of work, with 712 of those 16k traces routed:

![result of the FreeRouting plugin. It looks like shit.](/images/ConnM/freerouting.png)

_These were the easy traces, too_. It would have taken hundreds or thousands of hours for the autorouter to do everything, and it would still look like shit.

The obvious solution, therefore, is to build my own autorouter. Or at least spend a week or two on writing an autorouter.

### OrthoRoute

**[This is OrthoRoute](https://github.com/bbenchoff/OrthoRoute)**, a GPU-accelerated autorouter for KiCad. There's very little that's actually _new_ here; I'm just leafing through some of the VLSI books in my basement and stealing some ideas that look like they might work. If you throw enough compute at a problem, you might get something that works.

<div class="btn-row">
  <a class="btn-download" href="https://github.com/bbenchoff/OrthoRoute" target="_blank" rel="noopener">
    Download OrthoRoute (GitHub)
  </a>
</div>

OrthoRoute is written for the new IPC plugin system for KiCad 9.0. This has several advantages over the old SWIG-based plugin system. IPC allows me to run code outside of KiCad's Python environment. That's important, since I'll be using CuPy for CUDA acceleration and Qt to make the plugin look good. The basic structure of the OrthoRoute plugin looks something like this:

![Block diagram of the OrthoRoute plugin](/images/ConnM/OrthorouteArch.png)

The OrthoRoute plugin communicates with KiCad via the IPC API over a Unix socket. This API is basically a bunch of C++ classes that gives me access to board data -- nets, pads, copper pour geometry, airwires, and everything else. This allows me to build a second model of a PCB inside a Python script and model it however I want.

From there, OrthoRoute reads the airwires and nets and figures out what pads are connected together. This is the basis of any autorouter. OrthoRoute then uses [CuPy](https://cupy.dev/) and interesting algorithms ripped from the world of FPGA routing to turn a mess of airwires into a routed board.

The algorithm used for this autorouter is [PathFinder: a negotiation-based performance-driven router for FPGAs](https://dl.acm.org/doi/10.1145/201310.201328). My implementation of PathFinder treats the PCB as a graph: nodes are intersections on an x–y grid where vias can go, and edges are the segments between intersections where copper traces can run. Each edge and node is treated as a shared resource.

PathFinder is iterative. In the first iteration, all nets (airwires) are routed _greedily_, without accounting for overuse of nodes or edges. Subsequent iterations account for congestion, increasing the “cost” of overused edges and ripping up the worst offenders to re-route them. Over time, the algorithm _converges_ to a PCB layout where no edge or node is over-subscribed by multiple nets.

With this architecture -- the PathFinder algorithm on a very large graph, within the same order of magnitude of the largest FPGAs -- it makes sense to run the algorithm with GPU acceleration. There are a few factors that went into this decision:

- Everyone who's routing giant backplanes probably has a gaming PC. Or you can rent a GPU from whatever company is advertising on MUNI bus stops this month.
- The PathFinder algorithm requires hundreds of billions of calculations for every iteration, making single-core CPU computation glacially slow. 
- With CUDA, I can implement a SSSP (parallel Dijkstra) to find a path through a weighted graph very fast. 

Note this is _not_ a fully parallel autorouter; in OrthoRoute, nets are still routed in sequence on a shared congestion map. The parallelism lives inside the shortest-path search: a CUDA SSSP (“parallel Dijkstra”) kernel makes each individual net’s pathfinding fast, but it doesn’t route many nets simultaneously.

This yak is fuckin bald now. But I think the screencaps speak for themselves:

<figure style="margin: 2rem 0; text-align: center;">
  <img src="/images/ConnM/OrthoRouteLarge.png" 
       alt="Full backplane view showing completed routing" 
       style="width: 100%; max-width: 1000px; height: auto; border-radius: 4px; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
  <figcaption style="margin-top: 0.5rem; font-style: italic; color: #666; font-size: 0.95rem;">
    The full backplane view: 8,192 nets routed through 32 layers, in OrthoRoute
  </figcaption>
</figure>

<figure style="margin: 2rem 0; text-align: center;">
  <img src="/images/ConnM/OrthorouteRouted.png" 
       alt="Zoomed detail of Manhattan lattice routing" 
       style="width: 100%; max-width: 1000px; height: auto; border-radius: 4px; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
  <figcaption style="margin-top: 0.5rem; font-style: italic; color: #666; font-size: 0.95rem;">
    Zoomed detail showing Manhattan lattice routing density
  </figcaption>
</figure>

<figure style="margin: 2rem 0; text-align: center;">
  <img src="/images/ConnM/OrthoRouteKiCad.png" 
       alt="Routed board imported into KiCad" 
       style="width: 100%; max-width: 1000px; height: auto; border-radius: 4px; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
  <figcaption style="margin-top: 0.5rem; font-style: italic; color: #666; font-size: 0.95rem;">
    The routed board imported back into KiCad for final cleanup
  </figcaption>
</figure>

This board feels pain. You get mental damage from just looking at it. Every other board you've ever seen comes with the assumption that a human played some part in it. This does not; it's purely an algorithm grinding away. It's the worst board that you've ever seen.

![This computer is actually AM from I Have No Mouth But I must Scream](/images/ConnM/nomouth.png)

You can run OrthoRoute yourself [by downloading it from the repo](https://github.com/bbenchoff/OrthoRoute). Install the .zip file via the package manager. A somewhat beefy Nvidia GPU is highly suggested but not required; there's CPU fallback. If you want a deeper dive on how I built OrthoRoute, [there's also a page in my portfolio about it](http://bbenchoff.github.io/pages/OrthoRoute.html).

<div class="btn-row">
  <a class="btn-download" href="https://github.com/bbenchoff/OrthoRoute" target="_blank" rel="noopener">
    Download OrthoRoute (GitHub)
  </a>
</div>

## Mechanical Design

The entire thing is made out of machined aluminum plate. The largest and most complex single piece is the front -- this holds the LED array, diffuser, and backplane. It attaches to the outer enclosure on all four sides with twelve screws. Attached to the front frame is the 'base plate' and the back side of the machine, forming one U-shaped enclosure. On the sides of the base plate are Delrin runners which slide into rabbets in the outer enclosure. This forms the machine's chassis. This chassis slides into the outer enclosure.

![2-view of the chassis, showing the LED panel, ports, and backplane](/images/ConnM/Chassis.png)
![2-view of the chassis, loaded with boards and fans](/images/ConnM/ChassisLoaded.png)

The outer enclosure is composed of four aluminum plates, open on the front and back. The top panel is just a plate, and the bottom panel has a circular plinth to slightly levitate the entire machine a few millimeters above the surface it's sitting on. The left and right panels have a grid pattern machined into them that is reminiscent of the original Connection Machine. These panels are made of 8mm plate, and were first screwed together, welded, then the screw holes plug welded. Finally, the enclosure was bead blasted and anodized matte black.

![3-view of the enclosure, showing the structure, purposeful flaw, and the plinth on the bottom panel](/images/ConnM/Enclosure.png)

There is a small error in the grid pattern of one of the side pieces. Where most of the grid is 4mm squares, there is one opening that is irregular, offset by a few millimeters up and to the right. Somebody influential in the building of the Connection Machine once looked at the Yomeimon gate at Nikkō, noting that of all the figures carved in the gate, there was one tiny figure carved upside-down. The local mythology around this says it was done this way, 'so the gods would not be jealous of the perfection of man'.

While my machine is _really good_, and even my guilt-addled upbringing doesn't prevent me from taking some pride in it, I have to point out that I didn't add this flaw to keep gods from being offended. I know this is not perfect. There is documentation on the original Connection Machine that I would have loved to reference, and there are implementations I would have loved to explore were time, space, and money not a consideration. The purposeful and obvious defect in my machine is simply saying that I know it's not perfect. And this isn't a one-to-one clone of the Connection Machine, anyway. It's a little wabi-sabi saying forty years and Moore's Law result in something that's different, even if the influence is obvious.

## Software Architecture

After building the hardware, with LED panels wrapped in Chemcast acrylic, plug welded aluminum frame, and a backplane that actually feels pain, you may wonder what this machine _actually does_. That's a fair question. It’s elegant, beautiful, but it doesn’t really do anything useful. For many of us, that was an ex in our 20s. Now it’s a computer.

This machine is fundamentally incompatable with any programming language. The only way I have to program the 4,096 chips in the machine is through C, because that's the toolchain I have. The real Connection Machine had a variety of languages like `*Lisp`, a parallel verison of Lisp, and `C*`, a parallel version of C. These languages don't exist any more, insofar as I can find _actual code_. I can, however, look at sources and figure out how they were programmed in these languages.

`C*` and `*Lisp` and the parallel Fortran mentioned in an old NASA Ames publication all share the same basic ideas. The Connection Machine used _parallel variables_, where there's one value per processor, _scalar variables_, which are the same value repeated on all the processors, and _communication primitives_ like neighbor exchange, reduction, and broadcast. The languages are data-parallel, not message passing.

The problem is, there's no existing language that does this. I can contort the C-based toolchain available for any microcontroller to _do_ all this, but this is the sort of thing that should really be its own language, if only for error and type checking.

So I guess I have to create my own language for this computer.

### StarC - Parallel C

<p style="text-align: center;">
  <img src="/images/StarC/logo2.svg" alt="StarC Logo" style="width: 300px; height: auto;">
</p>

<div class="btn-row">
  <a class="btn-download" href="https://starc-lang.org/" target="_blank" rel="noopener">
    Get StarC
  </a>
</div>

[This is StarC](https://starc-lang.org/). It's the language I had to write to make this machine programmable. There are three basic ideas that I'm adding to C:

**Parallel variables.** `pvar<int> x` means "every processor has its own x." When you write `x = x + 1`, all 4,096 processors increment their local copy simultaneously.

**Masked execution.** `where (x > 0) { ... }` means "only processors where the condition is true execute this block." The others skip it. This is how you express "some processors do this, others don't" without breaking the single-program model.

**Communication blocks.** `exchange { n = nbr(0, x); }` means "every processor swaps its x with its dimension-0 neighbor." All communication—neighbor exchange, grid neighbors, reductions, scans—happens inside exchange blocks. The runtime schedules it onto the TDMA phases. You declare what you need; the machine figures out when.

Here's what StarC looks like in practice—a simple program that lights up processors based on their neighbors:

```c
void main() {
    pvar alive = (pid() % 7 == 0) ? 1 : 0;  // Seed some processors
    pvar neighbor;

    for (int i = 0; i < 100; i++) {
        exchange {
            neighbor = nbr(0, alive);  // Get dimension-0 neighbor's state
        }

        where (alive == 0 && neighbor == 1) {
            alive = 1;  // Dead processors with live neighbors come alive
        }

        led_set(alive * 255);
        barrier();
    }
}
```

Every processor runs this same code. Each has its own `alive` and `neighbor`. The `exchange` block swaps values with neighbors; the `where` block filters which processors update. The LED panel shows the result—a pattern spreading across the hypercube, one dimension at a time.

#### StarC Design

StarC is deliberately minimal. The language adds exactly three constructs to C: parallel variables, masked execution, and exchange blocks. StarC is a way to make illegal programs unrepresentable on a TDMA-scheduled hypercube. That's what the hardware requires, and what C doesn't natively provide. Everything else is still C.

Because we're using a TDMA schedule to program this thing, costs should be visible. This is why exchange blocks exist as explicit syntax. The hardware batches all communication into TDMA phases—you can't scatter `nbr()` calls throughout your code like function calls. Making exchange blocks syntactically distinct forces you to think about communication as a discrete step: compute, exchange, compute, exchange. The code structure mirrors the hardware's rhythm.

The `where`/`if` distinction exists for the same reason. `if` with a scalar condition means all processors take the same branch. `where` with a parallel condition means processors diverge. Exchange blocks inside `where` are illegal; if half the processors skip an exchange, the TDMA schedule breaks. The preprocessor catches this at compile time rather than letting it fail mysteriously at runtime.

What StarC *doesn't* have is equally deliberate. There's no `send(dest, msg)` even though the TDMA scheme could support multi-hop routing. The interesting hypercube algorithms—bitonic sort, parallel prefix, stencils—don't need it. Adding arbitrary routing would invite people to write programs the hardware executes poorly. StarC restricts you to what the hypercube does well.

You might be asking yourself, "wait, I'm smart and attractive and eminently capable and wealthy, why can't I just implement these with macros?" You could, but StarC has rules that interact in ways macros can't check. Exchange blocks can't go inside `where` blocks, exchange results can't be used as inputs in the same block, and `if` with a `pvar` is almost always a mistake. The preprocessor catches them at compile time instead.

#### StarC Infrastructure

For 'production code', StarC compiles to C via a Python preprocessor, which then gets shoved into whatever toolchain you're using for whatever microcontroller. There's no VM, and no crazy shit. This is the minimum possible tooling required to program a hypercube of microcontrollers.

However, I had to design this language in parallel with building the machine. I needed a simulator, which means you also now have a simulator. [Here's the StarC Playground](https://starc-lang.org/playground/). It's a React app with a tree-sitter parser using the C grammar, a JavaScript interpreter that runs 4,096 virtual processors, and a Canvas renderer for the LED panel. It's not cycle-accurate, but it is logically equivalent to what you would see when running the same code on the real machine.

![The StarC playground running the Gaussian Blur demo](/images/StarC/blurdemo.png)

![The StarC Playground running the Random and Pleasing demo](/images/StarC/pleasingdemo.png)

The playground has a dozen examples preloaded. There's Conway's Game of Life, dimension walks, LFSR scrolling columns, parallel Gaussian blurs, and examples of hypercube communications. Load one, hit run, and you'll understand what StarC does faster than reading any specification.

#### StarC Identity

The name StarC is obviously inspired by the Connection Machine's `C*` language. I got the [starc-lang.org](https://starc-lang.org/) domain for cheap, and as a name for a language it's _good enough_. The _real_ inspiration was me going to a yakitori place on 8th and Clement in SF, right across the street from the Star of the Sea church. Stella Maris, the patron of sailors. Inside, there's a [shrine to the first millennial saint](https://starparish.com/getting-to-know-carlo-acutis/), the patron saint of programmers. I have 'programmers' and a concept of 'sailors navigating the sea of a hypercube matrix' all in one concept. You can't turn down that kind of associative relationship. Cray has Chapel, I have a church.

But the StarC / Catholic iconography / sailor stuff is too good to ignore. I can do some cool Catholic iconography, _or_ nautical imagery for the visual design of this language. I settled on a nautical star for the logo because of the relationship between sailors and the Star of the Sea church. With extra gradients in the art because I'm going for early 90s maximalism. The O'Reilly book should have a seahorse on the cover, because that's how this specific Catholic iconography extends to the Animalia.

#### Get StarC

<div class="btn-row">
  <a class="btn-download" href="https://starc-lang.org/" target="_blank" rel="noopener">
    Get StarC
  </a>
</div>

The full specification, with worked examples, the StarC Playground where you can run your own StarC programs on a virtual Thinkin Machine, and the links to the Python preprocessor with instruction on how to generate real C code can be found [through the StarC website](https://starc-lang.org/). 

## Calculating & Performance


### Quantum Chromodynamics

G. Peter Lepage, "[Lattice QCD for Novices](https://arxiv.org/abs/hep-lat/0506036),

### Bitonic Sort

### Neeural Network

### Performance Vs. i7-12700K | RTX 5080

## One More Thing

When I began this project, I imagined I'd be building an array of four thousand tiny ten-cent microcontrollers. These plans changed slightly as I worked through the architecture of the machine, and I eventually landed on a RISC-V and FPGA combo as the nodes in this massive machine. There are definite benefits to using these chips. They're faster, they can _do_ floating point arithmetic, they have more memory, and they're the key to the [TDMA messaging scheme](https://bbenchoff.github.io/pages/ThinkinMachine.html#csma-vs-tdma) I came up with.

But I'm really only using that FPGA portion of the chip as the communications interface for each chip. An FPGA can be _anything_. What if I used it to implement more processors?

The original Connection Machine CM-1 used 65,536 individual processors, and my machine uses 4,096. That's a 16x difference. By implementing sixteen small cores in the FPGA of each node, I could extend my machine to match the number of processors in the original Connection Machine.

It's a great idea. Because of how hypercubes partition, the sixteen new processors in each FPGA only need to talk to each other. The existing backplane handles everything between physical chips. And the original Connection Machine used very, very simple processors as the nodes -- they could only process one bit at a time, and not many instructions were supported. It's brilliant. Doing this, I'd have an _exact reproduction_ of the original Connection Machine. It could have the original specification for each processor, and it could run the same code as the original. I could have the only working Connection Machine on the planet.

So that's what I did.

### Emulating the CM-1 on 4096 FPGAs

After reading [Hillis' thesis](https://dspace.mit.edu/bitstream/handle/1721.1/14719/18524280-MIT.pdf), we get a pretty clear picture of what the individual nodes in the CM-1 actually are:

- 1-bit datapath (bit-serial)
- 8 general-purpose flags + 8 special-purpose flags
- 4K bits of external memory (12-bit address)
- One instruction: read 2 memory bits + 1 flag, apply arbitrary 3-input boolean function (specified by 8-bit truth table), write 1 bit to memory + 1 bit to flag
- Conditionalization: execute or skip based on any flag

The 16 processors per chip in the original CM-1 were connected in a 4×4 NEWS grid AND via a daisy-chain. The 16 soft-cores per AG32 should form a 4D sub-hypercube (dimensions 0-3), with the physical AG32-to-AG32 connections handling dimensions 4-11.

**All of this is covered in [the CM-1 implementation page](CM1Implementation.md).**

My "emulation" or "reimplementation" of the CM-1 -- I'm not sure exactly what this is -- has 65,536 1-bit processors all connected as a hypercube. The architecture is a bit different because the CM-1 used routers to pass messages around to the nodes, and I'm using a weird TDMA scheme so that each node is its own router. But still, this is the closest thing to a _working_ connection machine that's existed in the past two decades.

Theoretically, this machine could run original code for the Connection Machine. Maybe it could. I don't actually know, because I can't find any original CM-1 code. But if Danny wants to meet me for a beer at Interval, I would love to talk to him about this.

## Contextualizing the build

This project was insane, probably due to the mental space I was in while building it. Desperate soil yields desperate fruit, or something like that. This project began on month five of a 2-year long streak of unemployment, and if you've never been in that situation, I can't convey how mentally taxing it is. Every day, for a few hours in the morning, I'd cruise LinkedIn, put in a few applications, and then spend the rest of my time working on this machine.

I got a few callbacks. Once every two months I'd have a company interested in me, have a second call, a third call, an interview with the team, and everything seems to go well. They like me. They call my references. My references say they like me. Then nothing. I thought about getting a Ouija board just so I can get some feedback.

Months of that - years of that - will tear you down. You become nothing. You are not useful. You are a burden to everyone else.

This project was my escape. Here, at least, I had some control. I could write some firmware for passing messages along the edges of a hypercube and at least I had some feedback because I have a logic analyzer on my desk. I'm serious when I say that were it not for this machine, I would not be here.

In previous roles that were heavily dependent on the engineering output of rogue garage tinkerers, I came up with the Bob Vila hypothesis. The idea goes something like this: In the mid-90s, someone asked Bob Vila why _This Old House_ became a mainstay of public television. His answer? It was a recession. During the recession of the late 70s, people simply couldn't afford to fix up old Victorians in Boston, so they did it themselves. They needed someone to show them how to remodel a kitchen, and which walls not to take out when renovating a room.

This theory can be extended to the incredible rise of amateur EE and MechE, with Arduinos and 3D printers and Maker Faires that coincided with the 2008 financial crisis. The dot com bubble had some really great software work despite Java. Going even further back Hewlett Packard was founded at the tail end of the depression.

So that's the material conditions that led to me building this. It exists because of the environment that surrounds it. Not to distance myself too much from the work, but I really didn't build this, I was just the conduit through which it was created. This is true for a lot of things; everything is a product of the environment it was created in.

This is how everything gets made. Take, for example, mid-century modern furniture. Eames chairs and molded plywood end tables were only possible after the development of phenolic resins during World War II. Without those, the plywood would delaminate. Technology enabled bending plywood, which enabled mid-century modern furniture. This was even noticed in the New York Times during one of the first Eames' exhibitions, with the headline, "War-Time Developed Techniques of Construction Demonstrated at Modern Museum".

In fashion, there was an explosion of colors in the 1860s, brought about purely from the development of aniline dyes in 1856. Now you could have purple without tens of thousands of sea snails. McMansions, with their disastrous roof lines, came about only a few years after the nail plates and pre-fabbed roof trusses; those roofs would be uneconomical with hand-cut rafters and skilled carpenters. Raymond Loewy created Streamline Moderne because modern welding processes became practically possible in the 1920s and 30s. The Mannesmann seamless tube process was invented in 1885, leading to steel framed bicycles very quickly and once the process was inexpensive enough, applied to the Wassily chair, a Bauhaus masterpiece, in 1925.

_The Great Wave off Kanagawa_ was printed in 1831, and it couldn't have been created much earlier. The blue of _The Great Wave_ is Prussian blue, a synthetic pigment that didn't exist before 1704. A shipment of Prussian Blue arrived in Japan in 1747, but it was sent back for some reason. Prussian Blue wasn't used in Japan until 1752. By the time Prussian blue was readily available to Japanese printmakers in large quantities, Hokusai was carving the Great Wave. Two decades before the black ships arrived and Japan opened its ports to the world. The most famous piece of Japanese art exists because of European imports.

The point is, things exist because of the environment they were created in. And this Thinking Machine could not have been built any earlier.

The original Connection Machine CM-1 was built in 1985 thanks to advances in VLSI design, peeling a few guys off from the DEC mill, and a need for three-letter agencies to have a terrifically fast computer. It could only have been built in the 1980s, when VLSI fabs had spare capacity, DARPA had a budget to turn Moscow into glass, and the second AI boom made massively parallel anything look fundable. My machine had different factors that led to its existence.

The ten-cent microcontrollers that enabled this build were only available for about a year before I began the design. The backplane itself is a realization of two technologies -- the CUDA pipeline that would make generating the backplane (and testing the code that created the backplane) take hours instead of months. Routing the backplane with a KiCad plugin would have been impossible without the IPC API, released only months before I began this project. The LED driver could have only been created because of my earlier work with the RP2040 PIOs and the IS31FL3741 LED drivers saved from an earlier project. And of course fabbing the PCBs would have cost a hundred times more if I ordered them in 2005 instead of 2025.

I couldn't have built this in 2020, because I would be looking at four thousand dollars in microcontrollers instead of four hundred. I couldn't have made this in 2015 because I bought the first reel of IS31FL3741s from Mouser in 2017. In 2010, the PCB costs alone would have been prohibitive.

The earliest this Thinking Machine could have been built is the end of 2025 or the beginning of 2026. I think I did alright. The trick wasn't knowing _how_ to build it, it's knowing that it _could_ be built. This is probably the best thing I'll ever build, but it certainly won't be the most advanced. For those builds, the technology hasn't even been invented yet and the parts are, as of yet, unavailable.

## Related Works And Suggested Reading

- **bitluni, “[CH32V003-based Cheap RISC-V Supercluster for $2](https://www.youtube.com/watch?v=lh93FayWHqw)” (2024).**  
  A 256-node RISC-V “supercluster” built from CH32V003 microcontrollers. This was _it_, the project that pulled me down the path of building a Connection Machine. Bitluni’s project uses an 8-bit bus across segments of 16 nodes and ties everything together with a tree structure. Being historically aware, I spent most of the time watching this video yelling, “you’re so close!” at YouTube. And now we’re here.

- **W. Daniel Hillis, “The Connection Machine” (Ph.D. dissertation, MIT, 1985; MIT Press, 1985).**  
  Hillis’ thesis lays out the philosophy, architecture, and programming model of the original CM-1: 65,536 1-bit processors arranged in a hypercube, with routing, memory, and SIMD control all treated as one unified machine design. My machine is basically that document filtered through 40 years of Moore’s law and PCB fab: the overall hypercube topology, the idea of a separate “front-end” host, and the notion that the interconnect *is* the computer all trace back directly here.

- **Trammell Hudson, "[CM-2 References](https://trmm.net/CM-2_references/)" (2017).**
  Bro got to pull cards out of cages, damn. Clarification on Random and Pleasing.

- **Thinking Machines Corporation, *Connection Machine Model CM-2 Technical Summary*, Version 6.0 (November 1990).**  
  The official technical reference for the CM-2, covering everything from the virtual processor model to the function of the routers. The CM-2 was the production version of Hillis's thesis; this manual is how they shipped it.

- **Charles L. Seitz, “The Cosmic Cube,” *Communications of the ACM*, 28(1), 22–33, 1985.**  
  Seitz describes the Caltech Cosmic Cube, a message-passing multicomputer built from off-the-shelf microprocessors wired into a hypercube network. Where Hillis pushes toward a purpose-built SIMD supercomputer, Seitz shows how far you can get by wiring lots of small nodes together with careful routing and deadlock-free message channels. This project sits very much in that Cosmic Cube lineage: commodity microcontrollers, hypercube links, and a big bet that the network fabric is the interesting part.

- **W. Daniel Hillis, “Richard Feynman and The Connection Machine,” _Physics Today_ 42(2), 78–84 (February 1989).**  
  Hillis’ account of working with Feynman on the CM-1, including Feynman’s back-of-the-envelope router analysis, his lattice QCD prototype code, and his conclusion that the CM-1 would beat the Cosmic Cube in QCD calculations.

- **Robert Schreiber, “An Assessment of the Connection Machine,” RIACS Technical Report 90.40 (June 1990)**
  A clear-eyed, practitioner-y critique of the Connection Machine concept (specifically CM-2 as “a connection machine”): what it’s good at, where it hurts, and how its architectural/programming tradeoffs compare to contemporary MIMD multicomputers.

- **C. Y. Lee, “An Algorithm for Path Connections and Its Applications,” *IRE Transactions on Electronic Computers*, 1961.**  
  The original maze-routing / wavefront paper: grid-based shortest paths around obstacles. Every “flood the board and backtrack” router is spiritually doing Lee; OrthoRoute is that idea scaled up and fired through a GPU.

- **Larry McMurchie and Carl Ebeling, “PathFinder: A Negotiation-Based Performance-Driven Router for FPGAs,” in *Proceedings of the Third International ACM Symposium on Field-Programmable Gate Arrays (FPGA ’95)*.**  
  PathFinder introduces the negotiated-congestion routing scheme that basically every serious FPGA router still builds on. The OrthoRoute autorouter used to design the backplane borrows this idea wholesale: routes compete for overused resources, costs get updated, and the system iterates toward a legal routing. The difference is that PathFinder works on configurable switch matrices inside an FPGA; here, the same logic is being applied to a 32-layer Manhattan lattice on a 17,000-pad PCB and run on a GPU.

- **G. Peter Lepage, "[Lattice QCD for Novices](https://arxiv.org/abs/hep-lat/0506036)," *Proceedings of HUGS 98*, edited by J.L. Goity, World Scientific (2000); arXiv:hep-lat/0506036.**  
  A practical introduction to lattice QCD with working code. Feynman's original Connection Machine QCD program—written in a parallel Basic dialect he invented and hand-simulated—doesn't survive, but the algorithm is standard Wilson action lattice gauge theory. Lepage's paper provides the actual implementation. This is the benchmark: if my machine can run a simplified version of what Feynman was trying to do in 1985, it's not just a replica.

- **Hermann Kopetz and Günther Grünsteidl, "TTP—A Protocol for Fault-Tolerant Real-Time Systems," IEEE Computer, 27(1), 14–23 (January 1994); first presented at FTCS-23, 1993.**
  The foundational paper on the Time-Triggered Protocol. Kopetz's insight—that a global time base and predetermined schedule can eliminate arbitration entirely—is the intellectual ancestor of the TDMA scheme used here. TTP/C now flies on the Orion spacecraft; the same core idea (the schedule is the coordination mechanism) makes a routerless hypercube possible.

- **Dimitri P. Bertsekas, Constantino Özveren, George D. Stamoulis, Paul Tseng, and John N. Tsitsiklis, "Optimal Communication Algorithms for Hypercubes," Journal of Parallel and Distributed Computing, 11(4), 263–275 (1991).**
  Formalizes dimension-ordered routing for hypercubes: always traverse dimensions in a fixed order and you get deadlock-free routing for free. Combined with time-triggered scheduling, this is how a 12-dimensional hypercube can operate without routers or arbitration logic.

- **Quentin F. Stout and Bruce Wagar, "Intensive Hypercube Communication: Prearranged Communication in Link-Bound Machines," Journal of Parallel and Distributed Computing, 10(2), 167–181 (1990).**
  Develops optimal algorithms for broadcast, permutation, and matrix transpose on link-bound hypercubes where all communication links can operate simultaneously. Stout assumes a working network and optimizes message patterns; the TDMA scheme here operates one layer down, using scheduling to create the collision-free network his algorithms assume.

TDMA STUFF:
Stout 1990 - "Intensive hypercube communication: Prearranged communication in link-bound machines"

ScienceDirect: https://www.sciencedirect.com/science/article/abs/pii/074373159090026L
Abstract page: https://web.eecs.umich.edu/~qstout/abs/JPDC90.html

Bertsekas et al. 1991 - "Optimal Communication Algorithms for Hypercubes"

Full PDF from MIT: https://web.mit.edu/dimitrib/www/OptimalCA.pdf

Willem Zierhoff et al., “Time Triggered Communication on CAN (TTCAN)” — TTCAN is literally “put a TDMA schedule on top of CAN.”
Link: https://www.can-cia.org/fileadmin/resources/documents/proceedings/1999_zierhoff.pdf 
can-cia.org

Meng Dong et al., “Dual-Plane Switch Architecture for Time-Triggered Ethernet” (GLSVLSI 2020) — time-triggered Ethernet framing + deterministic forwarding (the Ethernet-world cousin of what you’re doing).
Link: https://www.ci-lab.net/uploads/paper/gvlsi20_tte.pdf 
ci-lab.net

Marc Boyer (ONERA), “A TSN Introduction” (2025) — TSN (Time-Sensitive Networking) is the “schedule traffic / bounded latency” umbrella in Ethernet land; this deck is a surprisingly useful map of the ecosystem and mechanisms (TAS, CBS, etc.).
Link: https://wp.laas.fr/store/wp-content/uploads/sites/8/2025/04/TSN-STORE-compression.pdf 
wp.laas.fr

[back](../)

  </div><!-- /.tm-article -->
</div><!-- /.tm-layout -->

<script>
document.addEventListener("DOMContentLoaded", () => {
  const root     = document.documentElement;
  const layoutEl = document.querySelector(".tm-layout") || document.body;
  const articleEl= document.querySelector(".tm-article") || layoutEl;
  const tocEl    = document.querySelector(".tm-toc");
  const tocList  = document.getElementById("tm-toc");     // the <ul> (or <ol>) that holds links
  const navEl    = document.querySelector(".navbar");

  if (!tocList || !tocEl) return;

  // ---------- Build ToC ----------
  tocList.innerHTML = "";

  const headings = Array.from(articleEl.querySelectorAll("h2, h3, h4"))
    .filter(h => !h.closest(".tm-toc"));

  if (!headings.length) {
    tocEl.style.display = "none";
    return;
  } else {
    tocEl.style.display = "";
  }

  const slugify = (s) => (s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");

  const used = new Set();

  headings.forEach(h => {
    if (!h.id) {
      let base = slugify(h.textContent) || "section";
      let id = base, n = 2;
      while (used.has(id) || document.getElementById(id)) id = `${base}-${n++}`;
      h.id = id;
    }
    used.add(h.id);

    const li = document.createElement("li");
    const tag = h.tagName.toLowerCase();
    li.classList.add(
      tag === "h2" ? "tm-toc-level-2" :
      tag === "h3" ? "tm-toc-level-3" : "tm-toc-level-4"
    );

    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.textContent;

    li.appendChild(a);
    tocList.appendChild(li);
  });

  // ---------- Layout sync (fixed ToC + centered article; auto-stack if too tight) ----------
  const px = (n) => `${Math.max(0, Math.round(n))}px`;

  function measureChPx(el) {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    el.appendChild(probe);
    const w = probe.getBoundingClientRect().width || 8;
    probe.remove();
    return w;
  }

  function getOffsetPx() {
    const v = parseFloat(getComputedStyle(root).getPropertyValue("--tm-scroll-offset"));
    if (Number.isFinite(v)) return v;
    // fallback if vars aren’t set yet
    const navH = navEl ? navEl.getBoundingClientRect().height : 0;
    return navH ? (navH + 12) : 90;
  }

  function syncLayout() {
    // navbar height drives both ToC top and scroll offset
    const navH = navEl ? navEl.getBoundingClientRect().height : 0;
    root.style.setProperty("--tm-nav-h", px(navH));
    root.style.setProperty("--tm-scroll-offset", px(navH + 12));

    const desktop = window.matchMedia("(min-width: 900px)").matches;
    if (!desktop) {
      layoutEl.classList.add("tm-stack");
      root.style.setProperty("--tm-article-fit-px", "100000px");
      return;
    }

    layoutEl.classList.remove("tm-stack");

    // -20% ToC width budget
    const vw = document.documentElement.clientWidth;
    const tocMax = Math.min(Math.max(176, Math.floor(vw * 0.256)), 416);
    root.style.setProperty("--tm-toc-max-px", px(tocMax));

    // Measure geometry
    const tocRect = tocEl.getBoundingClientRect();
    const articleRect = articleEl.getBoundingClientRect();

    const gap = parseFloat(getComputedStyle(root).getPropertyValue("--tm-gap")) || 16;
    const centerX = (articleRect.left + articleRect.right) / 2;
    const fitPx = 2 * (tocRect.left - gap - centerX);

    // Minimum readable article width (in ch)
    const minCh = parseFloat(getComputedStyle(root).getPropertyValue("--tm-article-min-ch")) || 52;
    const chPx = measureChPx(articleEl);
    const minArticlePx = minCh * chPx;

    if (!Number.isFinite(fitPx) || fitPx < minArticlePx) {
      layoutEl.classList.add("tm-stack");
      root.style.setProperty("--tm-article-fit-px", "100000px");
    } else {
      root.style.setProperty("--tm-article-fit-px", px(fitPx));
    }
  }

  const scheduleSync = () => requestAnimationFrame(() => {
    syncLayout();
    // rootMargin depends on offset; if it changes, rebuild observer
    maybeRebuildActiveObserver();
  });

  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("orientationchange", scheduleSync, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleSync);

  // Recompute when ToC or navbar size changes (wrapping, responsive nav, etc.)
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => scheduleSync());
    ro.observe(tocEl);
    if (navEl) ro.observe(navEl);
  }

  // ---------- Smooth scrolling ----------
  tocList.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    const id = decodeURIComponent(link.getAttribute("href").slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();

    const rect = target.getBoundingClientRect();
    const absoluteTop = rect.top + window.pageYOffset;

    window.scrollTo({
      top: absoluteTop - getOffsetPx(),
      behavior: "smooth"
    });

    if (history.replaceState) history.replaceState(null, "", `#${id}`);
  });

  // ---------- Active section highlight (IntersectionObserver) ----------
  const tocLinks = Array.from(tocList.querySelectorAll("a"));
  const linkById = new Map(
    tocLinks.map(a => [decodeURIComponent(a.getAttribute("href").slice(1)), a])
  );

  function setActive(id) {
    tocLinks.forEach(a => {
      a.classList.toggle("is-active", false);
      const li = a.closest("li");
      if (li) li.classList.toggle("is-active", false);
    });

    const a = linkById.get(id);
    if (!a) return;

    a.classList.add("is-active");
    const li = a.closest("li");
    if (li) li.classList.add("is-active");

    // Keep active item visible if ToC is scrollable
    a.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  let activeObserver = null;
  let lastRootMargin = "";

  const visible = new Map(); // id -> top

  function buildActiveObserver() {
    if (activeObserver) activeObserver.disconnect();
    visible.clear();

    const rm = `-${Math.round(getOffsetPx())}px 0px -70% 0px`;
    lastRootMargin = rm;

    activeObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.id;
        if (!id) continue;
        if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
        else visible.delete(id);
      }
      if (!visible.size) return;

      // Choose heading closest to the nav line
      const navLine = getOffsetPx() + 8;
      let bestId = null;
      let bestScore = -Infinity;

      for (const [id, top] of visible.entries()) {
        const score = (top <= navLine) ? (100000 + top) : (-top);
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
      if (bestId) setActive(bestId);
    }, { root: null, rootMargin: rm, threshold: [0, 1.0] });

    headings.forEach(h => activeObserver.observe(h));
  }

  function maybeRebuildActiveObserver() {
    const rm = `-${Math.round(getOffsetPx())}px 0px -70% 0px`;
    if (!activeObserver || rm !== lastRootMargin) buildActiveObserver();
  }

  // init highlight
  buildActiveObserver();
  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    if (document.getElementById(id)) setActive(id);
  } else {
    const first = headings.find(h => h.id);
    if (first) setActive(first.id);
  }

  // ---------- Lightbox ----------
  // Prevent double overlays if something re-runs
  let overlay = document.querySelector(".tm-lightbox");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "tm-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <button class="tm-lightbox-close" aria-label="Close image">×</button>
      <img alt="">
    `;
    document.body.appendChild(overlay);
  }

  const overlayImg = overlay.querySelector("img");
  const closeBtn = overlay.querySelector(".tm-lightbox-close");

  function openLightbox(src, alt) {
    overlayImg.src = src;
    overlayImg.alt = alt || "";
    overlay.classList.add("is-open");
    document.body.classList.add("tm-lightbox-open");
  }

  function closeLightbox() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("tm-lightbox-open");
    overlayImg.src = "";
  }

  articleEl.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    if (img.classList.contains("tm-no-lightbox")) return;
    if (img.closest("a")) return;

    const src = img.currentSrc || img.src;
    if (!src) return;
    openLightbox(src, img.alt);
  });

  closeBtn.addEventListener("click", closeLightbox);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeLightbox();
  });

  // Final kick
  scheduleSync();
});
</script>



