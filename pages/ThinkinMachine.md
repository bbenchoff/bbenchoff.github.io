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
</style>

![Render of the machine](/images/ConnM/CMSocialCard.png)

# Thinkin' Machine Supercomputer

#### Or: I made a supercomputer out of a bunch of smartphone connectors, a chip from RGB mechanical keyboards, and four thousand tiny microcontrollers.

This project is a reproduction and modern recreation of the Thinking Machines [Connection Machine CM-1](https://en.wikipedia.org/wiki/Connection_Machine). The Connection Machine was a massively parallel computer from 1985, containing 65,536 individual processors arranged at the vertexes of a 16-dimension hypercube. This means each processor in the machine is connected to 16 adjacent processors.

This project is effectively identical to the lowest-spec Connection Machine built. It contains 4,096 individual RISC-V processors, each connected to 12 neighbors in a 12-dimensional hypercube.

The Connection Machine was an early experiment in massive parallelism. The individual processors in the CM-1 couldn't do much -- they could only operate on a single bit at a time, and their computational capability isn't much more than an ALU. This project leverages 40 years of Moore's law to put small, cheap computers into a parallel array. Not only does this allow me to emulate the ALU-like processors in the original CM-1, but I can also run actual programs at the corners of a 12-dimensional hypercube.

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

[[[[[VIDEO OF BLINKY GOES HERE]]]]]

# Connection Machine, High-Level Design

![Unfolding a 4-dimensional tesseract](/images/ConnM/UnfoldingHoriz.png)

This post has already gone on far too long without a proper explanation of what I'm building. 

__Very very simply__, this is a very, very large cluster of very, very small computers. The Connection Machine was designed as a massively parallel computer first. The entire idea was to stuff as many computers into a box, and connect those computers together. The problem then becomes how to connect these computers. If you <a href="https://dspace.mit.edu/bitstream/handle/1721.1/14719/18524280-MIT.pdf">read Danny Hillis' dissertation</a>, there were several network topologies to choose from.

These small computers could have been arranged as a (binary) tree, but this would have the downside of a communications bottleneck at the root of the tree. They could have been connected with a crossbar -- effectively connecting every node to every other node. A full crossbar requires N², where N is the number of nodes. While this might work with ~256 nodes, it does not scale to thousands of nodes in silicon or hardware. Hashnets were also considered, where everything was connected randomly. This is too much of a mind trip to do anything useful.

The Connection Machine settled on a hypercube layout, where in a network of 8 nodes (a 3D cube), each node would be connected to 3 adjacent nodes. In a network of 16 nodes (4D, a tesseract), each node would have 4 connections. A network of 4,096 nodes would have 12 connections per node, and a network of 65,536 nodes would have 16 connections per node.

The advantages to this layout are that routing algorithms for passing messages between nodes are simple, and there are redundant paths between nodes. If you want to build a hypercluster of tiny computers, you build it as a hypercube.

## My Machine

Disregarding the architecture of a 12-dimensional hypercube, the layout of this machine is shockingly simple:

![Block diagram of the Connection Machine](/images/ConnM/BlockDiagram.png)

As discussed above, the LED array is controlled by an RP2040 microcontroller over I2C. Data for the LEDs is received from the 'master' controller over a serial link. The hypercube of RISC-V chips are not directly connected to the LEDs, so fidelity and accuracy of what is actually happening in the computer suffers _somewhat_, but not really enough to notice.

The 4096 nodes in the Connection Machine are connected to the 'local coordinators' of the hypercube array. 16 of these controllers handle Single Wire Debug for 256 RISC-V chips, allowing for programming each individual node in the hypercube, as well as providing input and output to each individual node. Each of these coordinators handle a single 8-dimensional hypercube, sixteen of these 8-dimension cubes comprise the entire 12-dimensional hypercube array. 

These coordinators communicate with the main controller over a bidirectional serial link. The main controller is responsible for communicating with the local coordinators, both to write software to the RISC-V nodes, and to read the state of the RISC-V nodes. Input and output to the rest of the universe is through the main controller over an Ethernet connection provided by a WIZnet W5500 controller.

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

Incidentally, this would be an _excellent_ application of wire-wrap technology. Wire-wrap uses thin wire and a special tool to spiral the bare wire around square posts of a connector. It’s mechanically solid, electrically excellent, and looks like absolute madness in practice. This is how the first computers were made (like the PDP-8), and was how the back plane in the Connection Machine was made.

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

With an array of 22 connectors per card -- 11 on both top and bottom -- I have 1100 electrical connections between the cards and backplane, enough for the 1024 hypercube connections, and enough left over for power, ground, and some sparse signalling. That's the _electrical_ connections sorted, but there's still a  slight mechanical issue. For interfacing and mating with the backplane, I'll be using Samtec's [GPSK guide post sockets](https://www.samtec.com/products/gpsk) and [GPPK guide posts](https://www.samtec.com/products/gppk). With that, I've effectively solved making the biggest backplane one person has ever produced. 

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

Yeah, it's the most complex PCB I've ever designed. Doing this by hand would take weeks. It's also a perfect stress test for the autorouter. Using the [FreeRouting plugin for KiCad](https://freerouting.org/freerouting/using-with-kicad), I loaded the board and set it to the task of routing 16,000 air wires with a 12-layer board. Here's the result of four hours of work, with 712 of those 16k traces routed:

![result of the FreeRouting plugin. It looks like shit.](/images/ConnM/freerouting.png)

After four hours, the FreeRouting autorouter managed about 4% of the total number of nets. _These were the easy traces, too_. It would have taken hundreds or thousands of hours for the autorouter to do everything, and it would still look like shit.

The obvious solution, therefore, is to build my own autorouter. Or at least spend a week or two on writing an autorouter. Building an autorouter for circuit boards is _the_ hardest problem in computer science; the smartest people on the planet have been working on this problem for sixty years and all autorouters still suck. 

Routing this backplane, however, does not require a general solution to the problem of writing a good autorouter. I need an extremely domain-specific autorouter; I can constrain all of the traces coming off the connector pads to something very specific, and come up with extremely orthogonal routing solution to this problem. That's what I would do if I were routing by hand, anyway.

## A Quick Aside - A GPU-Accelerated Autorouter

**[This is OrthoRoute](https://github.com/bbenchoff/OrthoRoute)**, a GPU-accelerated autorouter for KiCad. There's very little that's actually _new_ here; I'm just leafing through some of the VLSI books in my basement and stealing some ideas that look like they might work. But if you throw enough compute at a problem, you might get something that works.

**[HEY CHRIS CAN YOU PRINT SOME MORE OF THESE SHIRTS?](https://contextualelectronics.com/product/never-trust-the-autorouter-t-shirt/)**

OrthoRoute is written for the new IPC plugin system for KiCad 9.0. This has several advantages over the old SWIG-based plugin system that allows me to run code outside of KiCad's Python environment. That's important, since I'll be using CuPy for CUDA acceleration and Qt to make the plugin look good. The basic structure of the OrthoRoute plugin looks something like this:

![Block diagram of the OrthoRoute plugin](/images/ConnM/OrthorouteArch.png)

The OrthoRoute plugin communicates with KiCad via the IPC API over a Unix socket. This API is basically a bunch of C++ classes that gives me access to board data -- nets, pads, copper pour geometry, airwires, and everything else. This allows me to build a second model of a PCB inside a Python script and model it however I want.

From there, OrthoRoute reads the airwires and nets and figures out what pads are connected together. This is the basis of any autorouter. From there, OrthoRoute runs another Python script written with [CuPy](https://cupy.dev/), that performs routing algorithms on a GPU.

I'm using [Lee's Algorithm](https://en.wikipedia.org/wiki/Lee_algorithm) and [Wavefront expansion](https://en.wikipedia.org/wiki/Wavefront_expansion_algorithm) for the 'standard' autorouting algorithms, but I'm also doing a domain-specific algorithm specifically for this backplane. Basically, this algorithm writes a fine-pitch grid of traces to the board underneath the backplane connectors, on layers 2 through 12, leaving the top layer blank. From there, the algorithm grabs an airwire from a pad and connects to the closest unused trace on another layer, connecting with a via. This net is the routed through this orthogonal grid of traces until it connects all the pads on this net together.

I'm basically automating [Manhattan routing](https://resources.pcb.cadence.com/blog/2020-pcb-manhattan-routing-techniques), where one layer is _only_ vertical, and another layer is _only_ horizontal. It's a common technique if you've seen enough old computer motherboards, but for the life of me I couldn't find an autorouter that actually did Manhattan routing. So I built one. It's called OrthoRoute.

Yes, it's a GPU-accelerated autorouting plugin for KiCad, the first of its kind. But this isn't smart. I probably could have put this board up on Fiverr and gotten results in a week or two. This yak is fuckin bald now. But I think the screencaps speak for themselves:

![OrthoRoute screencap 1](/images/ConnM/Orthoroute/1.png)

![OrthoRoute screencap 2](/images/ConnM/Orthoroute/2.png)

![OrthoRoute screencap 3](/images/ConnM/Orthoroute/3.png)

You can run OrthoRoute yourself ![by downloading it from the repo](https://github.com/bbenchoff/OrthoRoute). Install the .zip file via the package manager. A somewhat beefy Nvidia GPU is highly suggested but not required; there's CPU fallback. If you want a deeper dive on how I built OrthoRoute, [there's also a page in my portfolio about it](http://bbenchoff.github.io/pages/OrthoRoute.html).







# This is the intro i cut:

A while back, I had a contract with a company making tamper-evident enclosures for computer hardware. The idea was to wrap the entire system in a cage of printed circuit boards, each layered with a dense grid of traces. One layer on top, a few in the middle, one on the bottom. Enough to ensure that even the smallest drill bit couldn't pass through undetected.

The layout of these traces was exceptionally hard to visualize. If you've ever seen a drawing of a four-dimensional cube, it's that. A tesseract. Each node in the graph was connected to four others. At first, it was mind-bending. But after a week or two, I began to get a handle on it.

Conventional wisdom says you can't really comprehend structures beyond three dimensions. You're a three-dimensional being; your mind simply can't handle it. That's a lie. I know it. You just need practice. After working with that circuit-board tesseract, you begin to get a _feel_ for it.

With the idea that visualizing and working with higher-dimension objects can be learned, I wondered what else I could do. This is that object. It's a portfolio piece, really. But it does have a lot of blinkenlights.

# Conclusion


[back](../)

