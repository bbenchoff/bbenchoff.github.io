---
layout: default
title: "Thinkin Machine Supercomputer"
description: "Hardware engineering and PCB design documentation by Brian Benchoff"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2022-06-04
last_modified_at: 2022-06-04
image: "/images/ConnM/CMSocialCard.png"
---

<style>
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

A while back, I had a contract with a company making tamper-evident enclosures for computer hardware. The idea was to wrap the entire system in a cage of printed circuit boards, each layered with a dense grid of traces. One layer on top, a few in the middle, one on the bottom. Enough to ensure that even the smallest drill bit couldn't pass through undetected.

The layout of these traces was exceptionally hard to visualize. If you've ever seen a drawing of a four-dimensional cube, it's that. A tesseract. Each node was connected to four others. At first, it was mind-bending. But after a week or two, I began to internalize it.

Conventional wisdom says you can't really comprehend structures beyond three dimensions. You're a three-dimensional being; your mind simply can't handle it. That's a lie. I know it. You just need practice. After working with that circuit-board tesseract, you begin to get a _feel_ for it.

With the idea that visualizing and working with higher-dimension objects can be learned, I wondered what else I could do. This is that object. It's a portfolio piece, really. But it does have a lot of blinkenlights.

![Render of the machine](/images/ConnM/CMSocialCard.png)

# Thinkin Machine Supercomputer

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

![Unfolding a 4-dimensional tesserect](/images/ConnM/UnfoldingHoriz.png)

This post has already gone on far too long without a proper explanation of what I'm building. 

This is _simply_ a very, very large cluster of very, very small computers. The Connection Machine was designed as a massively parallel computer first. The entire idea was to stuff as many computers into a box, and connect those computers together. But then the problem became how to connect these computers. If you <a href="https://dspace.mit.edu/bitstream/handle/1721.1/14719/18524280-MIT.pdf">read Danny Hillis' dissertation</a>, there were several network topologies to choose from.

These small computers could have been arranged as a (binary) tree, but this would have the downside of a communications bottleneck at the root of the tree. They could have been connected with a crossbar -- effectively connecting every node to every other node. A full crossbar requires N², where N is the number of nodes. While this might work with ~256 nodes, it does not scale to thousands of nodes in silicon or hardware. Hashnets were also considered, where everything was connected randomly. This is too much of a mind trip to do anything useful.

The Connection Machine settled on a hypercube layout, where in a network of 8 nodes (a 3D cube), each node would be connected to 3 adjacent nodes. In a network of 16 nodes (4D, a tesseract), each node would have 4 connections. A network of 4,096 nodes would have 12 connections per node, and a network of 65,536 nodes would have 16 connections per node.

The advantages to this layout is that routing algorithms for passing messages between nodes are simple, and there are redundant paths between nodes. If you want to build a hypercluster of tiny computers, you build it as a hypercube.

## My Machine

Disregarding the architecture of a 12-dimensional hypercube, the layout of this machine is shockingly simple:

![Block diagram of the Connection Machine](/images/ConnM/BlockDiagram.png)

As discussed above, the LED array is controlled by an RP2040 microcontroller over I2C. Data for the LEDs is received from the 'master' controller over a serial link. The hypercube of RISC-V chips are not directly connected to the LEDs, so fidelity and accuracy of what is actually happening in the computer suffers _somewhat_, but not really enough to notice.

The 4096 nodes in the Connection Machine are connected to the 'local coordinators' of the hypercube array. 16 of these controllers handle Single Wire Debug for 256 RISC-V chips, allowing for programming each individual node in the hypercube, as well as providing input and output to each individual node. Each of these coordinators handle a single 8-dimensional hypercube, sixteen of these 8-dimension cubes comprise the entire 12-dimensional hypercube array. 

These coordinators communicate with the main controller over a bidirectional serial link. The main controller is responsible for communicating with the local coordinators, both to write software to the RISC-V nodes, and to read the state of the RISC-V nodes. Input and output to the rest of the universe is through the main controller over an Ethernet connection provided by a WIZnet W5500 controller.

### The Mechanical Bits

Mechanically, this device is very simple. The LED panel is screwed into a frame that also holds the back plane on the opposite side. The back plane has USB-C and Ethernet connections to the outside world, handled by a breakout board screwed to the back face of the box and attached to the back plane with a ribbon cable.

Internally, there's a bunch of crap. A Mean Well power supply provides the box with 350 Watts of 12V power. Since 4096 RISC-V chips will draw _hundreds_ of Amps, cooling is also a necessity. This is handled by a 200mm fan. There's a lot of stuff in this box, and not a lot of places to put 16 boards, each with 256 RISC-V chips, along with handling 1024 connections between each of these boards and the back plane. Here's a graphic showing the internals of the device, with the area for the RISC-V boards highlighted in pink:

![An internal view of the device, showing where the RISC-V boards will go](/images/ConnM/HighlightedBoardArea.png)

Even though the entire device is $262mm^3$, the area allowed for the 16 RISC-V boards is only about $190mm^3$. This means for each of the 16 boards in this device, I need to fit at least 1024 connections onto the backplane, where the connectors can only take up 190mm, in a height of about 10mm. _This is hard_. There are no edge connectors that do this. There's nothing in the Samtec or Amphenol catalogs that allow me to put over a thousand board-to-board connections in just 190mm of length and 10mm in height.

So how do you physically connect 1024 signals per board, in 190mm, with 10mm of height to work with? You don’t, because the connector you need doesn’t exist. After an evening spent crawling Samtec, Amphenol, Hirose, and Molex catalogs, I landed on this solution:

![Three views of the chosen connector, cutaway to show how the attach to the boards](/images/ConnM/ConnectorCutaway.png)

For the card-to-backplane connections, I'm using Molex SlimStack connectors, 0.4mm pitch, dual row, with 50 circuits per connector. They are Part Number 5033765020 for the right angle connectors on each card, and Part Number 545525010 for the connectors on the backplane. Instead of using a single connector on one side of the cards, I'm doubling it up, with connectors on both the top and the bottom. Effectively, I'm creating my own 4-row right angle SMT connector. Obviously, the connectors are also doubled on the backplane. This gives me 100 circuits in just 15mm of width along the 'active' edge of each card, and a card 'pitch' of 8mm. This is well within the requirements of this project. It's _insane_, but everything about this project is.

With an array of 22 connectors per card -- 11 on both top and bottom -- I have 1100 electrical connections between the cards and backplane, enough for the 1024 hypercube connections, and enough left over for power, ground, and some sparse signalling. That's the _electrical_ connections sorted, but there's still a  slight mechanical issue. For interfacing and mating with the backplane, I'll be using Samtec's [GPSK guide post sockets](https://www.samtec.com/products/gpsk) and [GPPK guide posts](https://www.samtec.com/products/gppk). With that, I've effectively solved making the biggest backplane one person has ever produced. The rest is only a routing problem.

## The Routing -- Back plane

This would be an easy project if I was building a parallel computer with only eight nodes -- that would be a cube. This would be easy if it was just sixteen nodes, because that's only a tesserect. But I'm not building a machine with just eight or sixteen nodes. I'm building a machine with 4,096. This was _hard_.

A _really cool_ property of hypercubes is that you can divide them up into segments. For this build, I'm dividing 4,096 individual chips and placing them onto 16 identical boards containing 256 individual RISC-V chips. Every board will have 2048 connections between chips, and 1024 connections to to other boards through a back plane. The boards are segmented like this:

### Board-to-Board Connection Matrix

Rows = Source Board, Columns = Destination Board, Digits indicate number of connections

| Board | B00 | B01 | B02 | B03 | B04 | B05 | B06 | B07 | B08 | B09 | B10 | B11 | B12 | B13 | B14 | B15 |
|---------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| B00   |  0  | 256 | 256 |  0  | 256 |  0  |  0  |  0  | 256 |  0  |  0  |  0  |  0  |  0  |  0  |  0  |
| B01   | 256 |  0  |  0  | 256 |  0  | 256 |  0  |  0  |  0  | 256 |  0  |  0  |  0  |  0  |  0  |  0  |
| B02   | 256 |  0  |  0  | 256 |  0  |  0  | 256 |  0  |  0  |  0  | 256 |  0  |  0  |  0  |  0  |  0  |
| B03   |  0  | 256 | 256 |  0  |  0  |  0  |  0  | 256 |  0  |  0  |  0  | 256 |  0  |  0  |  0  |  0  |
| B04   | 256 |  0  |  0  |  0  |  0  | 256 | 256 |  0  |  0  |  0  |  0  |  0  | 256 |  0  |  0  |  0  |
| B05   |  0  | 256 |  0  |  0  | 256 |  0  |  0  | 256 |  0  |  0  |  0  |  0  |  0  | 256 |  0  |  0  |
| B06   |  0  |  0  | 256 |  0  | 256 |  0  |  0  | 256 |  0  |  0  |  0  |  0  |  0  |  0  | 256 |  0  |
| B07   |  0  |  0  |  0  | 256 |  0  | 256 | 256 |  0  |  0  |  0  |  0  |  0  |  0  |  0  |  0  | 256 |
| B08   | 256 |  0  |  0  |  0  |  0  |  0  |  0  |  0  |  0  | 256 | 256 |  0  | 256 |  0  |  0  |  0  |
| B09   |  0  | 256 |  0  |  0  |  0  |  0  |  0  |  0  | 256 |  0  |  0  | 256 |  0  | 256 |  0  |  0  |
| B10   |  0  |  0  | 256 |  0  |  0  |  0  |  0  |  0  | 256 |  0  |  0  | 256 |  0  |  0  | 256 |  0  |
| B11   |  0  |  0  |  0  | 256 |  0  |  0  |  0  |  0  |  0  | 256 | 256 |  0  |  0  |  0  |  0  | 256 |
| B12   |  0  |  0  |  0  |  0  | 256 |  0  |  0  |  0  | 256 |  0  |  0  |  0  |  0  | 256 | 256 |  0  |
| B13   |  0  |  0  |  0  |  0  |  0  | 256 |  0  |  0  |  0  | 256 |  0  |  0  | 256 |  0  |  0  | 256 |
| B14   |  0  |  0  |  0  |  0  |  0  |  0  | 256 |  0  |  0  |  0  | 256 |  0  | 256 |  0  |  0  | 256 |
| B15   |  0  |  0  |  0  |  0  |  0  |  0  |  0  | 256 |  0  |  0  |  0  | 256 |  0  | 256 | 256 |  0  |

If you’re wondering what this looks like physically, imagine 8,192 wires crisscrossing between 16 boards. Now imagine soldering them. Incidentally, this would be an _excellent_ application of wire-wrap technology. Wire-wrap uses thin wire and a special tool to spiral the bare wire around square posts of a connector. It’s mechanically solid, electrically excellent, and looks like absolute madness in practice. This is how the first computers were made (like the PDP-8), and was how the back plane in the Connection Machine was made.

This is not how the Connection Machine solved the massive interconnect problem. The OG CM used multiple back planes and twisted-pair connections between these back planes. I'm solving this simply with high density interconnects and a very, very expensive circuit board.


















<<Everything below this is fucked ignore it it's just for reference>>

## Overview
Modern reproduction of 1985 CM-1 supercomputer using contemporary components. 4,096-processor distributed computer in 12D hypercube topology with real-time LED visualization.

## Core Architecture
**Processing:** 4,096 × CH32V003 RISC-V MCUs ($0.10 each)  
**Visualization:** 64×64 LED matrix (4,096 LEDs)  
**Control:** Pi Pico orchestrator with USB interface  

## Key Challenges
**Interconnect:** 49,152 bidirectional hypercube links  
*Solution:* Software multiplexing over 2-4 physical wires  

**Programming:** Individual control of 4,096 processors  
*Solution:* 64×64 matrix addressing via SDI  

**PCB Complexity:** 250mm boards with thousands of components  
*Solution:* Hierarchical design with replication tools  

## Progress
✅ LED matrix PCB designed (250mm × 250mm)  
✅ Component selection validated  
✅ Hypercube topology mapped  
✅ Power analysis completed (~257W total)  
⏳ 5D prototype planned (32 processors)  

## Innovation
- **Cost:** $2K vs millions for equivalent power
- **Size:** Desktop vs room-scale  
- **Flexibility:** Reconfigurable operation modes
- **Visualization:** Real-time computational display

## Significance
Building the only functional Connection Machine in 2025. Professional systems engineering applied to make massively parallel computing accessible and visible.






# 5D Connection Machine - Design Document

**Document Version:** 1.0  
**Date:** January 2025  
**Project:** Connection Machine CM-1 Reproduction - 5D Prototype

## Executive Summary

The 5D Connection Machine is a prototype implementation of a massively parallel computer based on the 1985 Connection Machine CM-1 architecture. This system features 32 RISC-V microcontrollers arranged in a 5-dimensional hypercube topology with real-time LED visualization. The project serves as both a proof-of-concept for parallel computing education and a stepping stone toward a full 4,096-processor (12D) system.

## System Architecture

### Processing Architecture
- **Processor Count:** 32 × CH32V003 RISC-V microcontrollers
- **Topology:** 5-dimensional hypercube (each processor connects to 5 neighbors)
- **Addressing:** 5-bit binary addresses (00000 to 11111)
- **Processing Model:** SIMD with distributed computation capability

### Physical Architecture
- **Form Factor:** Two-board system connected via ribbon cable
- **Board 1:** 4D hypercube (processors 00000-01111)
- **Board 2:** 4D hypercube (processors 10000-11111)
- **Inter-board Connection:** 16-wire ribbon cable for 5th dimension
- **Overall Dimensions:** Approximately 120mm × 80mm per board

### Control System
- **Host Controller:** Raspberry Pi Pico
- **Programming Interface:** Matrix-addressed SDI (4×4 matrix per board)
- **Communication:** UART-based packet switching over hypercube
- **External Interface:** USB for host computer communication

## Hardware Design

### Processor Nodes (CH32V003)
**Specifications:**
- 32-bit RISC-V core @ 48MHz
- 2KB SRAM, 16KB Flash
- 18 GPIO pins available
- Operating voltage: 3.3V
- Cost: $0.10 per unit

**Pin Allocation:**
- 5 pins: Hypercube connections (UART TX/RX pairs + shared enable)
- 2 pins: Matrix addressing (row/column select)
- 1 pin: SDI programming interface
- 10 pins: Available for expansion/debugging

### Hypercube Interconnect
**Topology Implementation:**
```
5D Hypercube Connections:
- Bit 0: Connect to neighbor differing in bit 0
- Bit 1: Connect to neighbor differing in bit 1
- Bit 2: Connect to neighbor differing in bit 2
- Bit 3: Connect to neighbor differing in bit 3
- Bit 4: Connect to neighbor differing in bit 4
```

**Physical Routing:**
- **Intra-board (4D):** PCB traces for local hypercube connections
- **Inter-board (5th D):** 16-conductor ribbon cable
- **Communication Protocol:** Software-multiplexed UART at 115.2kbps

### LED Visualization System
**Hardware:**
- 8×8 LED matrix (64 LEDs total)
- IS31FL3741 LED driver
- I2C connection to Pi Pico
- 3.3V operation

**Visualization Modes:**
1. **Processor Status:** Show active/idle state of all 32 processors
2. **Algorithm Progress:** Display computation state and results
3. **Message Flow:** Visualize data movement through hypercube
4. **Debug Mode:** Show individual processor states and connections

### Power System
**Power Requirements:**
- 32 × CH32V003: 32 × 15mA = 480mA (1.6W)
- LED Matrix: 64 × 3.7mA = 237mA (0.8W)
- Pi Pico + Support: ~100mA (0.3W)
- **Total System Power:** ~2.7W @ 3.3V

**Power Distribution:**
- USB-powered via Pi Pico
- 3.3V rail distribution to all components
- Dedicated LED driver power with current limiting

## Board Layout Design

### Board 1: Processors 00000-01111
```
[P00] [P01] [P02] [P03]
[P04] [P05] [P06] [P07]  
[P08] [P09] [P10] [P11]
[P12] [P13] [P14] [P15]

Edge Connector: 16 pins for 5th dimension
Matrix Control: 4×4 addressing
Local 4D Routing: On-board traces
```

### Board 2: Processors 10000-11111
```
[P16] [P17] [P18] [P19]
[P20] [P21] [P22] [P23]
[P24] [P25] [P26] [P27]
[P28] [P29] [P30] [P31]

Edge Connector: 16 pins for 5th dimension
Matrix Control: 4×4 addressing  
Local 4D Routing: On-board traces
```

### Control Board
```
[Pi Pico]    [LED Matrix]
[USB Conn]   [8×8 Display]
[Power Reg]  [Debug LEDs]

Connectors:
- 2× Ribbon cables to processor boards
- USB-C for power and programming
- I2C to LED matrix
```

## Firmware Architecture

### Pi Pico Controller Firmware
**Core Functions:**
- USB communication with host computer
- Matrix addressing for processor selection
- SIMD instruction broadcast
- Result collection and aggregation
- LED visualization control

**Software Modules:**
```c
// Main controller interface
int main(void);
void usb_task(void);
void processor_control_task(void);
void led_display_task(void);

// Processor communication
void program_processor(uint8_t addr, uint8_t* firmware);
void send_command(uint8_t addr, uint8_t cmd, uint32_t data);
uint32_t read_result(uint8_t addr);
void broadcast_simd(uint8_t cmd, uint32_t data);

// Matrix addressing  
void select_processor(uint8_t processor_id);
void deselect_all_processors(void);

// LED control
void update_display(uint8_t* frame_buffer);
void show_processor_status(uint32_t status_mask);
void show_algorithm_state(algorithm_state_t* state);
```

### CH32V003 Node Firmware
**Core Functions:**
- Hypercube routing protocol
- Local computation engine
- Neighbor communication
- SDI command processing

**Software Modules:**
```c
// Main node program
int main(void);
void hypercube_router_task(void);
void computation_task(void);
void communication_task(void);

// Hypercube communication
void send_to_neighbor(uint8_t dimension, uint32_t data);
uint32_t receive_from_neighbor(uint8_t dimension);
void route_packet(packet_t* packet);

// Local computation
void execute_simd_instruction(uint8_t opcode, uint32_t operand);
void local_algorithm_step(void);
uint32_t get_local_result(void);

// Control interface
void process_sdi_command(uint8_t cmd, uint32_t data);
void send_status_to_controller(void);
```

## Communication Protocols

### SDI Programming Protocol
**Matrix Addressing:**
- 4×4 matrix per board (8 control lines total)
- Pi Pico selects row and column to address specific processor
- SDI protocol for programming and runtime communication

**Command Structure:**
```c
typedef struct {
    uint8_t command;     // Command type
    uint8_t processor;   // Target processor ID
    uint32_t data;       // Command data
    uint16_t checksum;   // Error detection
} sdi_command_t;

// Command types
#define CMD_PROGRAM_FLASH   0x01
#define CMD_READ_MEMORY     0x02  
#define CMD_WRITE_MEMORY    0x03
#define CMD_EXECUTE         0x04
#define CMD_GET_STATUS      0x05
#define CMD_RESET           0x06
```

### Hypercube Routing Protocol
**Packet Format:**
```c
typedef struct {
    uint8_t source;      // Source processor ID
    uint8_t destination; // Destination processor ID
    uint8_t ttl;         // Time to live
    uint8_t payload_len; // Payload length
    uint8_t payload[28]; // Data payload
    uint16_t checksum;   // Error detection
} hypercube_packet_t;
```

**Routing Algorithm:**
```c
void route_packet(hypercube_packet_t* packet) {
    uint8_t my_addr = get_processor_id();
    uint8_t target = packet->destination;
    uint8_t diff = my_addr ^ target;
    
    if (diff == 0) {
        // Packet arrived at destination
        handle_local_packet(packet);
        return;
    }
    
    // Find highest bit difference
    uint8_t next_dimension = find_highest_bit(diff);
    uint8_t next_neighbor = my_addr ^ (1 << next_dimension);
    
    // Forward to neighbor in that dimension
    send_to_neighbor(next_dimension, packet);
}
```

## Software Applications

### Demonstration Algorithms

**1. Parallel Sorting**
```c
// Bitonic sort implementation across hypercube
void bitonic_sort(uint32_t* local_data, uint8_t data_size) {
    for (int stage = 0; stage < 5; stage++) {
        for (int substage = stage; substage >= 0; substage--) {
            uint8_t partner = get_processor_id() ^ (1 << substage);
            uint32_t remote_data = exchange_with_neighbor(partner, *local_data);
            
            bool ascending = (get_processor_id() & (1 << stage)) == 0;
            if ((ascending && *local_data > remote_data) || 
                (!ascending && *local_data < remote_data)) {
                *local_data = remote_data;
            }
        }
    }
}
```

**2. Conway's Game of Life**
```c
// Distributed cellular automata
void game_of_life_step(uint8_t* local_cells) {
    // Get neighbor states through hypercube
    uint8_t neighbor_states[5];
    for (int dim = 0; dim < 5; dim++) {
        uint8_t neighbor_id = get_processor_id() ^ (1 << dim);
        neighbor_states[dim] = request_state_from_neighbor(neighbor_id);
    }
    
    // Apply Conway's rules
    uint8_t live_neighbors = count_live_neighbors(neighbor_states);
    update_local_cells(local_cells, live_neighbors);
}
```

**3. Distributed Search**
```c
// Parallel breadth-first search
bool parallel_bfs(graph_node_t* local_graph, uint32_t target) {
    queue_t local_queue;
    bool found = false;
    
    while (!queue_empty(&local_queue) && !found) {
        graph_node_t current = queue_dequeue(&local_queue);
        
        if (current.value == target) {
            broadcast_result(true);
            found = true;
        }
        
        // Distribute children to other processors
        for (int i = 0; i < current.child_count; i++) {
            uint8_t target_processor = hash_node(current.children[i]) % 32;
            send_node_to_processor(target_processor, current.children[i]);
        }
    }
    
    return found;
}
```

## Testing and Validation

### Unit Testing
**Hardware Tests:**
- Individual processor programming and communication
- Matrix addressing functionality
- Hypercube connectivity verification
- LED matrix display operation
- Power consumption measurement

**Software Tests:**
- SDI protocol reliability
- Hypercube routing algorithm verification
- SIMD instruction broadcast
- Packet loss and error recovery

### Integration Testing
**System-Level Tests:**
- 32-processor coordinated operation
- Algorithm execution across full hypercube
- Real-time visualization accuracy
- Performance benchmarking
- Thermal characterization

### Performance Metrics
**Latency Measurements:**
- SDI command response time: < 1ms
- Hypercube message latency: < 5ms (5 hops max)
- SIMD instruction propagation: < 2ms
- LED update rate: 60 FPS

**Throughput Measurements:**
- SDI bandwidth: 115.2 kbps per processor
- Hypercube bandwidth: 115.2 kbps per link
- Aggregate computation rate: 32 × 48 MIPS = 1.54 GIPS
- Algorithm completion time: Application-dependent

## Bill of Materials

### Electronic Components
| Component | Quantity | Unit Cost | Total Cost |
|-----------|----------|-----------|------------|
| CH32V003 RISC-V MCU | 32 | $0.10 | $3.20 |
| Raspberry Pi Pico | 1 | $4.00 | $4.00 |
| IS31FL3741 LED Driver | 1 | $2.50 | $2.50 |
| 3mm LEDs (Red) | 64 | $0.05 | $3.20 |
| PCB Fabrication (2-layer) | 3 | $15.00 | $45.00 |
| Connectors & Passives | - | - | $12.00 |
| **Total Electronics** | | | **$69.90** |

### Mechanical Components
| Component | Quantity | Unit Cost | Total Cost |
|-----------|----------|-----------|------------|
| Acrylic Enclosure | 1 | $25.00 | $25.00 |
| Hardware & Standoffs | 1 | $8.00 | $8.00 |
| **Total Mechanical** | | | **$33.00** |

### **Total Project Cost: $102.90**

## Development Timeline

### Phase 1: Hardware Design (3 weeks)
- **Week 1:** Schematic design and component selection
- **Week 2:** PCB layout and routing
- **Week 3:** PCB fabrication and component procurement

### Phase 2: Firmware Development (4 weeks)
- **Week 1:** Pi Pico controller firmware
- **Week 2:** CH32V003 node firmware
- **Week 3:** Communication protocol implementation
- **Week 4:** Algorithm development and testing

### Phase 3: Integration and Testing (2 weeks)
- **Week 1:** Hardware assembly and basic functionality
- **Week 2:** Full system testing and optimization

### Phase 4: Documentation and Demo (1 week)
- Algorithm demonstrations
- Performance characterization
- User documentation
- Video demonstration

**Total Development Time: 10 weeks**

## Risk Assessment

### Technical Risks
**High Risk:**
- Hypercube routing complexity may exceed CH32V003 capabilities
- SDI matrix addressing may have timing issues
- PCB routing density may require 4-layer boards

**Medium Risk:**
- Power consumption may exceed USB limits
- LED visualization may have refresh rate issues
- Software debugging across 32 processors

**Low Risk:**
- Component availability and cost
- Mechanical enclosure fit and finish
- USB communication reliability

### Mitigation Strategies
- Implement software multiplexing to reduce pin requirements
- Design with generous timing margins for SDI protocol
- Include current limiting and power monitoring
- Develop comprehensive debugging infrastructure
- Order backup components and PCBs

## Future Expansion

### 8D Version (256 Processors)
- Single board with 256 CH32V003 processors
- 16×16 LED matrix for visualization
- Proves single-board hypercube routing
- Stepping stone to full 12D system

### 12D Version (4,096 Processors)
- 16 boards × 256 processors each
- 64×64 LED matrix for full visualization
- Backplane interconnect system
- Production-ready Connection Machine reproduction

### Educational Applications
- University parallel computing courses
- Maker community workshops
- Algorithm visualization demonstrations
- Research platform for distributed computing

## Conclusion

The 5D Connection Machine represents a practical implementation of massively parallel computing principles using modern, affordable components. This prototype validates the core architectural concepts required for the full 12D system while providing an educational platform for parallel computing research and demonstration.

The project demonstrates that historical supercomputer architectures can be reproduced using contemporary microcontrollers, making advanced parallel computing concepts accessible to students, researchers, and hobbyists. The real-time LED visualization provides unprecedented insight into the operation of parallel algorithms, bridging the gap between theoretical computer science and physical reality.

Success of this prototype will provide the foundation for scaling to the full 4,096-processor Connection Machine, representing the only functional CM-1 reproduction in existence and a significant contribution to both computer science education and parallel computing research.



[back](../)

