---
layout: default
title: "Thinkin Machine Supercomputer"
description: "A modern recreation of the Connection Machines CM-1"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2022-06-04
last_modified_at: 2022-06-04
image: "/images/ConnM/CMSocialCard.png"
---

<style>
.matrix-table {
    border-collapse: collapse;
    font-family: monospace;
    font-size: 14px;
    margin: 0 auto;
}

.matrix-table th, .matrix-table td {
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
    color: #999;
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

.table-wrap { overflow-x:auto; -webkit-overflow-scrolling: touch; margin: 1rem 0; }
.matrix-table td.empty { color:#666; } /* #999 is low-contrast on light BG */
.matrix-table caption { caption-side: top; font-weight:600; padding: .5rem 0; }
@media (prefers-color-scheme: dark) {
  .matrix-table th { background:#1e1e1e; }
  .matrix-table td { border-color:#333; }
}

@media (min-width: 768px) {
  .side-image {
    flex-direction: row;
    align-items: flex-start; /* Aligns tops of text and image */
  }

  .side-text {
    flex: 1 1 0; /* Text takes up remaining space */
  }

  .side-image-container {
    flex: 0 0 300px; /* Image is fixed at 300px wide */
    max-width: 300px;
    margin-left: 1rem;
  }
}


.tm-layout {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
}

/* Main article column */
.tm-article {
  flex: 1 1 auto;
  min-width: 0;
  order: 1;  /* article on the left */
}

/* ToC sidebar */
.tm-toc {
  flex: 0 0 240px;
  font-size: 0.9rem;
  line-height: 1.4;
  position: sticky;
  top: 4rem; /* adjust if your header is taller */
  max-height: calc(100vh - 5rem);
  overflow-y: auto;
  order: 2;  /* ToC on the right */
}


.tm-toc-inner {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(0,0,0,0.15);
}

.tm-toc-inner h3 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tm-toc-nav {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tm-toc-nav li {
  margin: 0.15rem 0;
}

.tm-toc-nav li.tm-toc-indent {
  margin-left: 1rem;
}

.tm-toc-nav a {
  text-decoration: none;
  font-size: 0.9rem;
}

.tm-toc-nav a:hover {
  text-decoration: underline;
}

/* Mobile: stack ToC above article, no sticky */
@media (max-width: 900px) {
  .tm-layout {
    flex-direction: column;
  }
  .tm-toc {
    position: static;
    max-height: none;
    order: -1; /* ToC appears above content on mobile */
  }
}

/* On wide screens, keep the main column full-width
   and float the ToC out in the right margin */
@media (min-width: 1024px) {
  .tm-layout {
    display: block;        /* stop sharing width with the ToC */
    position: relative;    /* anchor for absolute children if needed */
  }

  .tm-toc {
    position: fixed;       /* detach from document flow */
    right: 2rem;           /* nudge into the page's right margin */
    top: 5rem;             /* adjust so it clears your top nav */
    width: 260px;          /* same-ish as before */
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
    /* flex/order no longer matter once it’s fixed */
  }
}


</style>

<div class="tm-layout">
  <aside class="tm-toc">
    <div class="tm-toc-inner">
      <h3>Contents</h3>
      <ul class="tm-toc-nav" id="tm-toc"></ul>
    </div>
  </aside>

  <div class="tm-article" markdown="1">



![Render of the machine](/images/ConnM/CMSocialCard.png)

# Thinkin' Machine Supercomputer

#### Or: I made a supercomputer out of a bunch of smartphone connectors, a chip from RGB mechanical keyboards, and four thousand RISC-V microcontrollers.

This project is a reproduction and modern recreation of the Thinking Machines [Connection Machine CM-1](https://en.wikipedia.org/wiki/Connection_Machine). The Connection Machine was a massively parallel computer from 1985, containing 65,536 individual processors arranged at the vertexes of a 16-dimension hypercube. This means each processor in the machine is connected to 16 adjacent processors. While the Connection Machine was the fastest computer on the planet in the late 1980s ([Top500](https://top500.org/) only goes back to 1993), the company died during the second AI winter.

This project is effectively identical to the lowest-spec Connection Machine built. It contains 4,096 individual RISC-V processors, each connected to 12 neighbors in a 12-dimensional hypercube.

The Connection Machine was an early experiment in massive parallelism. Today, a 'massively parallel computer' means wiring up a bunch of machines running Linux to an Ethernet switch. The topology of this network is whatever the switch is. The Connection Machine is different. Every node is connected to 16 other nodes in a machine with 65,536 processors. In my machine, every node is connected to 12 of the 4,096 processors. For _n_ total processors, each node connects to exactly $\log_2(n)$ neighbors. This topology makes the machine extremely interesting with regard to what it can calculate efficiently, namely matrix operations, which is the basis of the third AI boom.

The individual processors in the CM-1 couldn't do much -- they could only operate on a single bit at a time, and their computational capability isn't much more than an ALU. This project leverages 40 years of Moore's law to put small, cheap computers into a parallel array. Not only does this allow me to emulate the ALU-like processors in the original CM-1, but I can also run actual programs at the corners of a 12-dimensional hypercube.

This is a faithful reproduction of the original, 1985-era Connection Machine, plus 40 years of Moore's law and very poor impulse control. In 1985, this was the cutting edge of parallel computing. In 2025, it's a weird art project with better chips.

# The LED Panel

Listen, we all know why you're reading this, so I'm going to start off with the LED array before digging into massively parallel hypercube supercomputer. 

The Connection Machine was _defined_ by a giant array of LEDs. It's the reason there's one of these in the MoMA, so I need 4,096 LEDs showing the state of every parallel processor in this machine. Also, blinky equals cool equals eyeballs, so there's that.

![Schematic and PCB of the LED array](/images/ConnM/LEDSchBoard.png)

The LED board is built around the **IS31FL3741**, an I2C LED matrix driver ostensibly designed for mechanical keyboard backlighting. I've built [several project](https://bbenchoff.github.io/pages/IS31FL3741.html) around [this chip](https://github.com/bbenchoff/MrRobotBadge), and have a few of these now-discontinued chips in storage.

Each IS31FL3741 is controlling a **32x8** matrix of LEDs over I2C. These chips have an I2C address pin with four possible values, allowing me to control a **32x32 array** over a single I2C bus. Four of these arrays are combined onto a single PCB, along with an RP2040 (a Raspberry Pi Pico) microcontroller to run the whole thing.

### **Architecture:**

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

There are a few pre-programmed modes for this panel. Of course I had to implement Conway's Game of Life, but the real showstopper is the "Random and Pleasing" mode. This is the mode shown in Jurassic Park, and it's what MoMA turns on when they light up their machine.

There are several sources _describing_ this mode, but no actual details on how it's _implemented_. I went for a 4094-bit LFSR (256 taps), and divided the display up into four columns of 1x16 'cells'. These cells are randomly assigned to shift left or shift right, and 256 unique taps are assigned to a particular 1x16 cell.

Mechanically, the LED panel is a piece of FR4 screwed to the chassis of the machine. The front acrylic is [Chemcast Black LED plastic sheet](https://www.tapplastics.com/product/plastics/cut_to_size_plastic/black_led_sheet/668) from TAP Plastics, secured to the PCB with magnets epoxied to the back side of the acrylic into milled slots. These magnets attach to magnets epoxied to the frame, behind the PCB. This Chemcast plastic is apparently the same material as the [Adafruit Black LED Diffusion Acrylic](https://www.adafruit.com/product/4594), and it works exactly as advertised. _Somehow_, the Chemcast plastic turns the point source of an LED into a square at the surface of the machine. You can't photograph it, but in person it's _spectacular_.

# Connection Machine, High-Level Design

![Unfolding a 4-dimensional tesseract](/images/ConnM/UnfoldingHoriz.png)

This post has already gone on far too long without a proper explanation of what I'm building. 

__Very very simply__, this is a very, very large cluster of very, very small computers. The Connection Machine was designed as a massively parallel computer first. The entire idea was to stuff as many computers into a box, and connect those computers together. The problem then becomes how to connect these computers. If you <a href="https://dspace.mit.edu/bitstream/handle/1721.1/14719/18524280-MIT.pdf">read Danny Hillis' dissertation</a>, there were several network topologies to choose from.

The nodes -- the tiny processors that make up the cluster -- could have been arranged as a (binary) tree, but this would have the downside of a communications bottleneck at the root of the tree. They could have been connected with a crossbar -- effectively connecting every node to every other node. A full crossbar requires N², where N is the number of nodes. While this might work with ~256 nodes, it does not scale to thousands of nodes in silicon or hardware. Hashnets were also considered, where everything was connected randomly. This is too much of a mind trip to do anything useful.

The Connection Machine settled on a hypercube layout, where in a network of 8 nodes (a 3D cube), each node would be connected to 3 adjacent nodes. In a network of 16 nodes (4D, a tesseract), each node would have 4 connections. A network of 4,096 nodes would have 12 connections per node, and a network of 65,536 nodes would have 16 connections per node.

The advantages to this layout are that routing algorithms for passing messages between nodes are simple, and there are redundant paths between nodes. If you want to build a hypercluster of tiny computers, you build it as a hypercube.

# My Machine

This machine is split up into segments of various sizes. Each segment is 1/16th as large as the next. These are:

- **The Node** This is simply a CH32V203 RISC-V microcontroller. Specifically, I am using the CH32V203G6U6, a QFN28 part with around 20 GPIOs. In the machine, 12 of these pins will be used for hypercube connections, with other pins reserved for UART connections to a local microcontroller, the `/BOOT` pin, and `NRST` pin.
- **The Slice** This is 16 individual nodes, connected as a 4-dimension hypercube. In the Slice, a seventeenth microcontroller the initialization and control of each individual node. This means providing the means to program and read out memory from each node individually. I'm doing this through the UART bootloader for the CH32V203. Controlling the `/BOOT` and `NRST` pins of each node allows me to restart each node either collectively or individually
- **The Plane**  This is 16 Slices. In this segment, 256 CH32V203 microcontrollers are connected via an 8-dimension hypercube. With 16 CH32V203 microcontrollers per Slice plus one additional microcontroller, this means each plane consists of 272 microcontrollers, _plus an additional control layer_ for summing UARTs and routing messages to each Slice. In total there are 273 microcontrollers in each Plane.
- **The Machine** Sixteen Planes make a Machine. The architecture follows the growth we've seen up to now, with 4096 CH32V203 microcontrollers connected as a 12-dimensional hypercube. There are 4368 microcontrollers in The Machine, all controlled with a rather large SoC.

Like the original Connection Machine, there are two 'modes' of connection between the nodes in the array. The first is the hypercube connection, where each node connects to other nodes. The second is a tree. Each node in the machine is connected to a 'Slice' microcontroller via UART. This Slice microcontroller handles reset, boot, programming, and loading data into each node. Above the Slice is the Plane, a master controller for each group of 256 nodes. And above that is the master controller.

This "hypercube and tree" is identical to the original hypercube machines of the 1980s. The [Cosmic Cube](https://en.wikipedia.org/wiki/Caltech_Cosmic_Cube) at Caltech split the connections with individual links between nodes and a tree structure to a 'master' unit. The [Intel iPSC](https://en.wikipedia.org/wiki/Intel_iPSC) used a similar layout, but routing subsets of the hypercube through MUXes and Ethernet, with a separate connection to a 'cube manager'. Likewise, the Connection Machine could only function when connected to a VAX that handled the program loading and getting data out of the hypercube.

## 1 Node, or 'The Node'

As stated above, the node is a CH32V203 RISC-V microcontroller. Although not the cheapest microcontroller available -- that would be the \$0.13 CH32V003 -- The '203 has significant benefits that make construction simpler and more performant:

- The CH32V003 is programmed over a _strange_ one-wire serial connection that cannot be repurposed for local control. The CH32V203 can be programmed over serial, and this connection can be repurposed to get data into and out of a specific node.
- The CH32V003 is based on a QingKe RISC-V2A core, without hardware multiply and divide. The CH32V203 is based on a RISC-V4B core, that has one-cycle hardware multiply.
- The CH32V003 is \$0.13 in quantity, the CH32V203 is \$0.37 in quantity. If I'm going this far, I'll spend the extra thousand dollars to get a machine that's a hundred times better.

## 16 Nodes, or, 'The Slice'

The Slice is a 4-dimensional hypercube, or 16 CH32V203 microcontrollers, each connected to 4 others. These 16 nodes are controlled by a dedicated microcontroller, programming each node over serial, toggling the reset circuit, and loading data into and out of each node.

![Block diagram of 16 nodes, showing a 16-node hypercube controlled via UART](/images/ConnM/SliceControl.png)

## 256 Nodes, or, 'The Plane'

![Block diagram of 16 Slices, showing the architecture of a Plane](/images/ConnM/PanelControl.png)

## 4096 Nodes, or, 'The Machine'

This is where the magic happens. The original CM-1 was controlled via a DEC VAX or Lisp machine that acted as a front-end processor. The front-end would broadcast instructions to the array, collect results, and handle I/O with the outside world. My machine needs something similar. At the top of the hierarchy sits a Zynq SoC - an FPGA with ARM cores bolted on. This is the easiest way to get 

This handles:

- **Instruction broadcast**: In SIMD mode, the Zynq sends opcodes down the tree to all 4,096 nodes simultaneously
- **Result aggregation**: Data flows up through the Planes, gets collected, and presents to the outside world
- **Network interface**: Ethernet to everything else, USB, and HDMI simply because the Zynq support it. It's a Lin
- **LED coordination**: Someone has to tell that 64x64 array what to display

The Zynq talks to 16 Plane controllers. Each Plane controller talks to 16 Slice controllers. Each Slice controller talks to 16 nodes. It's trees all the way down.


## Two Networks, One Machine



/*
Disregarding the architecture of a 12-dimensional hypercube, the high-level layout of this machine is shockingly simple:

![Block diagram of the Connection Machine](/images/ConnM/BlockDiagram.png)

As discussed above, the LED array is controlled by an RP2040 microcontroller over I2C. Data for the LEDs is received from the 'master' controller over a serial link. The hypercube of RISC-V chips are not directly connected to the LEDs, so fidelity and accuracy of what is actually happening in the computer suffers _somewhat_, but not really enough to notice.

The 4096 nodes in the Connection Machine are connected to the 'local coordinators' of the hypercube array. 16 of these controllers handle Single Wire Debug for 256 RISC-V chips, allowing for programming each individual node in the hypercube, as well as providing input and output to each individual node. Each of these coordinators handle a single 8-dimensional hypercube, sixteen of these 8-dimension cubes comprise the entire 12-dimensional hypercube array. 

These coordinators communicate with the main controller over a bidirectional serial link. The main controller is responsible for communicating with the local coordinators, both to write software to the RISC-V nodes, and to read the state of the RISC-V nodes. Input and output to the rest of the universe is through the main controller over an Ethernet connection provided by a WIZnet W5500 controller.
*/

### The Backplane -- Theory

First off, I'd like to mention that the Connection Machine isn't best visualized as a multidimensional tesseract, or something Nolan consulted Kip Thorne to get _just right_. It's not a hypercube. Because it exists in three dimensions. Like you. It's actually a 12-bit Hamming-distance-1 graph. Or a bit-flip adjacency graph. Or it's a bunch of processors, each connected to 12 other processors. Each processor has a 12-bit address, and by changing one bit I can go to an adjacent processor. But sure, we'll call it a hypercube if it makes you feel wicked smaht or whatever. 

That being said, Danny had some good ideas in his thesis about why it's better to refer to this computer as a hypercube. The key insight that makes this buildable is exploiting a really cool property of hypercubes: __you can divide them up into identical segments.__

Instead of trying to route a 12-dimensional hypercube as one massive board, I'm breaking the 4,096 processors into 16 completely identical processor boards, each containing exactly 256 RISC-V chips. Think of it like this: each board is its own 8-dimensional hypercube (since 256 = 2⁸), and the backplane connects those 16 sub-cubes into a full 12-dimensional hypercube (because 16 = 2⁴, and 8 + 4 = 12).

This means I only have to design one processor board and manufacture it 16 times. Each board handles 2,048 internal connections between its 256 chips, and exposes 1,024 connections to the backplane. The backplane does all the heavy lifting. It's where the real routing complexity lives, implementing the inter-board connections that make 16 separate 8D cubes behave like one unified 12D hypercube. The boards are segmented like this:

<h3>Board-to-Board Connection Matrix</h3>
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

Incidentally, this would be an _excellent_ application of wire-wrap technology. Wire-wrap uses thin wire and a special tool to spiral the bare wire around square posts of a connector. It’s mechanically solid, electrically excellent, and looks like spaghetti in practice. This is how the first computers were made (like the Straight Eight PDP-8), and was how the back plane in the Connection Machine was made.

This is not how the Connection Machine solved the massive interconnect problem. The OG CM used multiple back planes and twisted-pair connections between these back planes. I'm solving this simply with modern high-density interconnects and a very, very expensive circuit board.

### The Backplane -- Implementation

Mechanically, this device is very simple. The LED panel is screwed into a frame that also holds the back plane on the opposite side. The back side has USB-C and Ethernet connections to the outside world. This is attached to the backplane through a ribbon cable.

Internally, there's a bunch of crap. A Mean Well power supply provides the box with 350 Watts of 12V power. Since 4096 RISC-V chips will draw _hundreds_ of Watts, cooling is also a necessity. This is handled by a 200mm fan. 

There's a lot of stuff in this box, and not a lot of places to put 16 boards. Here's a graphic showing the internals of the device, with the area for the RISC-V boards highlighted in pink:

![An internal view of the device, showing where the RISC-V boards will go](/images/ConnM/HighlightedBoardArea.png)

Even though the full enclosure is 262 mm cubed, only about 190 mm cubed is allocated to the 16 RISC-V boards. This means for each of the 16 boards in this device, I need to fit at least 1024 connections onto the backplane, where the connectors can only take up 190mm, in a height of about 10mm. _This is hard_. There are no edge connectors that do this. There's nothing in the Samtec or Amphenol catalogs that allow me to put over a thousand board-to-board connections in just 190mm of length and 10mm in height.

So how do you physically connect 1024 signals per board, in 190mm, with 10mm of height to work with? You don’t, because the connector you need doesn’t exist. After an evening spent crawling Samtec, Amphenol, Hirose, and Molex catalogs, I landed on this solution:

![Three views of the chosen connector, cutaway to show how the attach to the boards](/images/ConnM/ConnectorCutaway.png)

For the card-to-backplane connections, I'm using Molex SlimStack connectors, 0.4mm pitch, dual row, with 50 circuits per connector. They are Part Number 5033765020 for the right angle connectors on each card, and Part Number 545525010 for the connectors on the backplane. Instead of using a single connector on one side of the cards, I'm doubling it up, with connectors on both the top and the bottom. Effectively, I'm creating my own 4-row right angle SMT connector. Obviously, the connectors are also doubled on the backplane. This gives me 100 circuits in just 15mm of width along the 'active' edge of each card, and a card 'pitch' of 8mm. This is well within the requirements of this project. It's _insane_, but everything about this project is.

With an array of 22 connectors per card -- 11 on both top and bottom -- I have 1100 electrical connections between the cards and backplane, enough for the 1024 hypercube connections, and enough left over for power, ground, and some sparse signalling. That's the _electrical_ connections sorted, but there's still a  slight mechanical issue. For interfacing and mating with the backplane, I'll be using Samtec's [GPSK guide post sockets](https://www.samtec.com/products/gpsk) and [GPPK guide posts](https://www.samtec.com/products/gppk). With that, I've effectively solved making the biggest backplane any one person has ever produced. 

![Renders of the computer with the backplane unloaded, left, and loaded with 16 compute cards, right](/images/ConnM/BackplaneUnloadedLoaded.png)

Above is a render of the machine showing the scale and density of what's going on. Most of the front of the computer is the backplane, with the 'compute cards' -- sixteen of the 8-dimensional hypercube boards -- filling all the space. The cards, conveniently, are on a half-inch pitch, or 0.5 inches from card to card.

It's _tight_, but it's possible. The rest is only a routing problem.

### The Backplane -- Routing, And Why I Had To Write An Autorouter

And oh what a routing problem it is! 

A human mind cannot route a 12-dimensional hypercube, but getting back to the interesting properties of hypercube network topology, every node on the graph can be defined as a binary number and importantly, when defined as a binary number _every neighbor is a single bit flip away_. Defining the network of nodes and links is then pretty easy. It can be done in a few dozen lines of Python. This script defines the links between nodes in a 12D hypercube, broken up into 16 8D cubes:

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

The obvious solution, therefore, is to build my own autorouter. Or at least spend a week or two on writing an autorouter. Building an autorouter for circuit boards is _the_ hardest problem in computer science; the smartest people on the planet have been working on this problem for sixty years and all autorouters still suck. 

## A Quick Aside - A GPU-Accelerated Autorouter

**[This is OrthoRoute](https://github.com/bbenchoff/OrthoRoute)**, a GPU-accelerated autorouter for KiCad. There's very little that's actually _new_ here; I'm just leafing through some of the VLSI books in my basement and stealing some ideas that look like they might work. If you throw enough compute at a problem, you might get something that works.

**[HEY CHRIS CAN YOU PRINT SOME MORE OF THESE SHIRTS?](https://contextualelectronics.com/product/never-trust-the-autorouter-t-shirt/)**

OrthoRoute is written for the new IPC plugin system for KiCad 9.0. This has several advantages over the old SWIG-based plugin system. IPC allows me to run code outside of KiCad's Python environment. That's important, since I'll be using CuPy for CUDA acceleration and Qt to make the plugin look good. The basic structure of the OrthoRoute plugin looks something like this:

![Block diagram of the OrthoRoute plugin](/images/ConnM/OrthorouteArch.png)

The OrthoRoute plugin communicates with KiCad via the IPC API over a Unix socket. This API is basically a bunch of C++ classes that gives me access to board data -- nets, pads, copper pour geometry, airwires, and everything else. This allows me to build a second model of a PCB inside a Python script and model it however I want.

From there, OrthoRoute reads the airwires and nets and figures out what pads are connected together. This is the basis of any autorouter. OrthoRoute then runs another Python script written with [CuPy](https://cupy.dev/), that performs routing algorithms on a GPU. I'm using [Lee's Algorithm](https://en.wikipedia.org/wiki/Lee_algorithm) and [Wavefront expansion](https://en.wikipedia.org/wiki/Wavefront_expansion_algorithm) -- the 'standard' autorouting algorithms, all done on a GPU. _But that's not all..._

### A Manhattan Router

The domain-specific algorithm for this backplane is [Manhattan routing](https://resources.pcb.cadence.com/blog/2020-pcb-manhattan-routing-techniques), where one layer is _only_ vertical, and another layer is _only_ horizontal. It's a common technique if you've seen enough old computer motherboards, but for the life of me I couldn't find an autorouter that actually did Manhattan routing. So I built one. It's called OrthoRoute.

It's a GPU-accelerated autorouting plugin for KiCad, probably the first of its kind. But this isn't smart. I probably could have put this board up on Fiverr and gotten results in a week or two. This yak is fuckin bald now. But I think the screencaps speak for themselves:

![OrthoRoute screencap 1](/images/ConnM/Orthoroute/1.png)

![OrthoRoute screencap 2](/images/ConnM/Orthoroute/2.png)

![OrthoRoute screencap 3](/images/ConnM/Orthoroute/3.png)

You can run OrthoRoute yourself [by downloading it from the repo](https://github.com/bbenchoff/OrthoRoute). Install the .zip file via the package manager. A somewhat beefy Nvidia GPU is highly suggested but not required; there's CPU fallback. If you want a deeper dive on how I built OrthoRoute, [there's also a page in my portfolio about it](http://bbenchoff.github.io/pages/OrthoRoute.html). There's also benchmarks of different pathfinding algorithms there.


## The RISC-V Boards



## Mechanics - Chassis & Enclosure

The entire thing is made out of machined aluminum plate. The largest and most complex single piece is the front -- this holds the LED array, diffuser, and backplane. It attaches to the outer enclosure on all four sides with twelve screws. Attached to the front frame is the 'base plate' and the back side of the machine, forming one U-shaped enclosure. On the sides of the base plate are Delrin runners which slide into rabbets in the outer enclosure. This forms the machine's chassis. This chassis slides into the outer enclosure.

![2-view of the chassis, showing the LED panel, ports, and backplane](/images/ConnM/Chassis.png)
![2-view of the chassis, loaded with boards and fans](/images/ConnM/ChassisLoaded.png)

The outer enclosure is composed of four aluminum plates, open on the front and back. The top panel is just a plate, and the bottom panel has a circular plinth to slightly levitate the entire machine a few millimeters above the surface it's sitting on. The left and right panels have a grid pattern machined into them that is reminiscent of the original Connection Machine. These panels are made of 8mm plate, and were first screwed together, welded, then the screw holes plug welded. Finally, the enclosure was bead blasted and anodized matte black.

![3-view of the enclosure, showing the structure, purposeful flaw, and the plinth on the bottom panel](/images/ConnM/Enclosure.png)

There is a small error in the grid pattern of one of the side pieces. Where most of the grid is 4mm squares, there is one opening that is irregular, offset by a few millimeters up and to the right. Somebody influential in the building of the Connection Machine once looked at the Yomeimon gate at Nikkō, noting that of all the figures carved in the gate, there was one tiny figure carved upside-down. The local mythology around this says it was done this way, 'so the gods would not be jealous of the perfection of man'.

While my machine is _really good_, and even my guilt-addled upbringing doesn't prevent me from taking some pride in it, I have to point out that I didn't add this flaw to keep gods from being offended. I know this is not perfect. There is documentation on the original Connection Machine that I would have loved to reference, and there are implementations I would have loved to explore were time, space, and money not a consideration. The purposeful and obvious defect in my machine is simply saying that I know it's not perfect. And this isn't a one-to-one clone of the Connection Machine, anyway. It's a little wabi-sabi saying forty years and Moore's Law result in something that's different, even if the influence is obvious.

## Parallel C (StarC)

## Contextualizing the build

There's a few thoughts I've been ruminating about for a while with regards to design and technological progress. The thesis of this idea is that design is a product of technological capability.

Take, for example, mid-century modern furniture. Eames chairs and molded plywood end tables were only possible after the development of phenolic resins during World War II. Without those, the plywood would delaminate. Technology enabled bending plywood, which enabled mid-century modern furniture. This was even noticed in the New York Times during one of the first Eames' exhibitions, with the headline, "War-Time Developed Techniques of Construction Demonstrated at Modern Museum".

In fashion, there was an explosion of colors in the 1860s, brought about purely from the development of aniline dyes in 1856. Now you could have purple without tens of thousands of sea snails. The dutch masters painted in a flax-growing region, giving them high-quality linseed oil for their paints. McMansions, with their disastrous roof lines came about only a few years after the nail plates and pre-fabbed roof trusses; those roofs would be uneconomical with hand-cut rafters and skilled carpenters. Raymond Loewy created Streamline Moderne because modern welding processes became practically possible in the 1920s and 30s. The Mannesmann seamless tube process was invented in 1885, leading to steel framed bicycles very quickly and once the process was inexpensive enough, applied the Wassily chair, a Bauhaus masterpiece, in 1925. 

The point is, technology enables design. And this Thinking Machine could not have been built any earlier.

The original Connection Machine CM-1 was built in 1985 thanks to advances in VLSI design, peeling a few guys off from the DEC mill, and a need for three-letter agencies to have a terrifically fast computer. My machine had different factors that led to its existence.

The ten-cent microcontrollers that enabled this build were only available for about a year before I began the design. The backplane itself is a realization of two technologies -- the CUDA pipeline that would make generating the backplane (and testing the code that created the backplane) take only minutes. Routing the backplane with a KiCad plugin would have been impossible without the IPC API, released only months before I began this project. The LED driver could have only been created because of my earlier work with the RP2040 PIOs and the IS31FL3741 LED drivers saved from an earlier project. And of course fabbing the PCBs would have cost a hundred times more if I ordered them in 2005 instead of 2025.

I couldn't have built this in 2020, because I would be looking at four thousand dollars in microcontrollers instead of four hundred. I couldn't have made this in 2015 because I bought the first reel of IS31FL3741s from Mouser in 2017. In 2010, the PCB costs alone would have been prohibitive.

The earliest this Thinking Machine could have been built is the end of 2025 or the beginning of 2026, and I think I did alright. The trick wasn't knowing _how_ to build it, it's knowing that it _could_ be built. This is probably the best thing I'll ever build, but it certainly won't be the most advanced. For those builds, the technology hasn't even been invented yet and the parts are, as of yet, unavailable.


### Related Works And Suggested Reading

- **bitluni, “[CH32V003-based Cheap RISC-V Supercluster for $2](https://www.youtube.com/watch?v=lh93FayWHqw)” (2024).**  
  A 256-node RISC-V “supercluster” built from CH32V003 microcontrollers. This was _it_, the project that pulled me down the path of building a Connection Machine. Bitluni’s project uses an 8-bit bus across segments of 16 nodes and ties everything together with a tree structure. Being historically aware, I spent most of the time watching this video yelling, “you’re so close!” at YouTube. And now we’re here.

- **W. Daniel Hillis, “The Connection Machine” (Ph.D. dissertation, MIT, 1985; MIT Press, 1985).**  
  Hillis’ thesis lays out the philosophy, architecture, and programming model of the original CM-1: 65,536 1-bit processors arranged in a hypercube, with routing, memory, and SIMD control all treated as one unified machine design. My machine is basically that document filtered through 40 years of Moore’s law and PCB fab: the overall hypercube topology, the idea of a separate “front-end” host, and the notion that the interconnect *is* the computer all trace back directly here.

- **Charles L. Seitz, “The Cosmic Cube,” *Communications of the ACM*, 28(1), 22–33, 1985.**  
  Seitz describes the Caltech Cosmic Cube, a message-passing multicomputer built from off-the-shelf microprocessors wired into a hypercube network. Where Hillis pushes toward a purpose-built SIMD supercomputer, Seitz shows how far you can get by wiring lots of small nodes together with careful routing and deadlock-free message channels. This project sits very much in that Cosmic Cube lineage: commodity microcontrollers, hypercube links, and a big bet that the network fabric is the interesting part.

- **W. Daniel Hillis, “Richard Feynman and The Connection Machine,” _Physics Today_ 42(2), 78–84 (February 1989).**  
  Hillis’ account of working with Feynman on the CM-1, including Feynman’s back-of-the-envelope router analysis, his lattice QCD prototype code, and his conclusion that the CM-1 would beat the Cosmic Cube in QCD calculations.

- **C. Y. Lee, “An Algorithm for Path Connections and Its Applications,” *IRE Transactions on Electronic Computers*, 1961.**  
  The original maze-routing / wavefront paper: grid-based shortest paths around obstacles. Every “flood the board and backtrack” router is spiritually doing Lee; OrthoRoute is that idea scaled up and fired through a GPU.

- **Larry McMurchie and Carl Ebeling, “PathFinder: A Negotiation-Based Performance-Driven Router for FPGAs,” in *Proceedings of the Third International ACM Symposium on Field-Programmable Gate Arrays (FPGA ’95)*.**  
  PathFinder introduces the negotiated-congestion routing scheme that basically every serious FPGA router still builds on. The OrthoRoute autorouter used to design the backplane borrows this idea wholesale: routes compete for overused resources, costs get updated, and the system iterates toward a legal routing. The difference is that PathFinder works on configurable switch matrices inside an FPGA; here, the same logic is being applied to a 32-layer Manhattan lattice on a 17,000-pad PCB and run on a GPU.
  
- **The Associated Press. _The Associated Press Stylebook._ New York: The Associated Press.**
    Fuck you, Associated Press. Your entire style guide is predicated on conservation of text length. That was great when we were etaoin shrdluing all over the place but now we have a means of distribution where text length does not matter, you do not control how text is formatted, and distribution is free. I dedicate this to your unrelenting mediocrity, your destruction, and the Oxford comma. I have 200-line Python scripts inline with the text in this page. That's what CSS is for, you fucks.

[back](../)

  </div><!-- /.tm-article -->
</div><!-- /.tm-layout -->

<script>
document.addEventListener("DOMContentLoaded", function () {
  const article = document.querySelector(".tm-article");
  const tocList = document.getElementById("tm-toc");
  if (!article || !tocList) return;

  // Use H2 and H3 as ToC entries
  const headings = article.querySelectorAll("h2, h3");
  if (!headings.length) {
    const toc = document.querySelector(".tm-toc");
    if (toc) toc.style.display = "none";
    return;
  }

  headings.forEach(function (h) {
    // Ensure each heading has an id
    if (!h.id) {
      h.id = h.textContent
        .trim()
        .toLowerCase()
        .replace(/[^\w\- ]+/g, "")
        .replace(/\s+/g, "-");
    }

    const li = document.createElement("li");
    if (h.tagName.toLowerCase() === "h3") {
      li.classList.add("tm-toc-indent");
    }

    const a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    tocList.appendChild(li);
  });

  // --- custom scrolling with offset ---
  const OFFSET = 32; // pixels from top of viewport; tweak (20–30ish) to taste

  tocList.addEventListener("click", function (event) {
    const link = event.target.closest("a");
    if (!link) return;

    const id = link.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault(); // stop the browser's default jump

    const rect = target.getBoundingClientRect();
    const absoluteTop = rect.top + window.pageYOffset;

    window.scrollTo({
      top: absoluteTop - OFFSET,
      behavior: "smooth"
    });

    // Update URL hash without re-scrolling
    if (history.replaceState) {
      history.replaceState(null, "", "#" + id);
    }
  });
});
</script>

