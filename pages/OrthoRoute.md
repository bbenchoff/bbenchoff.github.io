---
layout: default
title: "OrthoRoute"
description: "OrthoRoute: GPU-Accelerated PCB Autorouter"
keywords: ["hardware engineering", "PCB design", "autorouting", "autorouter", "CUDA", "CuPy", "electronics"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2022-06-04
image: "/images/ConnM/OrthorouteCard.png"
---


<table width="100%">
  <tr>
    <td align="center" width="300">
      <img src="/images/icon200.png" alt="OrthoRoute Logo" width="200" />
    </td>
    <td align="left">
      <h2>OrthoRoute - GPU Accelerated Autorouting for KiCad</h2>
      <p><em>You shouldn't trust the autorouter, but at least this one is faster</em></p>
    </td>
  </tr>
</table>

This is a project born out of necessity. [Another thing I was working on](https://bbenchoff.github.io/pages/ThinkinMachine.html) needed an _enormous_ backplane. A PCB with sixteen connectors, with 1100 pins on each connector. That's 17,600 individual pads. Here, just take a look:

![a view of the backplane, before routing the PCB](/images/ConnM/unroutedbackplane.png)

Look at that shit. Hand routing this would take a month. I tried [FreeRouting](https://freerouting.org/), the KiCad autorouter plugin, for a laugh and it routed 4% of the traces in seven hours. If that trend held, which it wouldn't, that would be a month of autorouting. I had a few options, all of which would take weeks.

- I could route the board by hand. This would be painful and take weeks, but I would get a good-looking board at the end.
- I could yolo everything and just let the autorouter handle it. It would take weeks, because the first traces are easy, the last traces take the longest. This would result in an ugly board.
- I could spend a few weeks building my own autorouter plugin for KiCad. I have a fairly powerful GPU and routing a PCB is a very parallel problem. I could also implement my own routing algorithms to make the finished product look good.

When confronted with a task that will take months, always choose the more interesting path.

## Project Overview

**OrthoRoute** is a GPU-accelerated PCB autorouter, designed for parallel routing of massive circuit boards. Autorouting is a parallel problem, and nearly everyone doing serious work has a few spare CUDA cores sitting around. Unlike most autorouters such as [Altium Situs](https://www.altium.com/documentation/altium-designer/automated-board-layout-situs-topological-autorouter), [FreeRouting](https://freerouting.org/), and a dozen EE-focused B2B SaaS startups, OrthoRoute uses GPUs for parallelizing the task of connecting pads with traces.

I don't know why no one has thought to put wavefront expansion in a GPU before. I seriously feel like I'm taking crazy pills. Autorouting algorithms are _ideal_ for parallel operation. I'm not going to say this is the best software ever, but I can say I have a better imagination than other people making autorouters.

**Key Features:**
- **Real-time Visualization**: Interactive 2D board view with zoom, pan, and layer controls
- **Professional Interface**: Clean PyQt6-based interface with KiCad color themes
- **Multi-layer Support**: Handle complex multi-layer PCB designs with front/back copper visualization
- **GPU-Accelerated Routing**: Routing algorithms in CUDA
- **Manhattan Routing**: Where OrthoRoute gets its name. It's a grid of traces, vertical on one layer, horizontal on the other


## Screenshots

![Screenshot 1, showing an Arduino clone](/images/ConnM/OrthorouteScreenshot1.png)

OrthoRoute is designed as a KiCad plugin, and heavily leverages the new-ish [KiCad IPC API](https://dev-docs.kicad.org/en/apis-and-binding/ipc-api/) and [kicad-python](https://docs.kicad.org/kicad-python-main/index.html) bindings for the IPC API.


## Performance

Unsurprisingly, doing extremely parallel operations in a GPU is _fast_. But how does it compare to other Autorouters?

SOMETHING ABOUT PERFORMANCE WHEN I GET THE AUTOROUTING DONE

## Implementation

The following are the implementation details of OrthoRoute. How I built it, and why I made the decisions I did. If you want to never write a plugin for KiCad, skip this section.

Pre-KiCad 9.0 had a SWIG-based plugin system. Compared to the new IPC plugin system released with KiCad 9, there are serious deficits. The SWIG-based system was locked to the Python environment bundled with KiCad. Process isolation, threading, and performance constraints abound. Doing GPU programming with CuPy, while not impossible, is difficult.

The new IPC plugin system for KiCad is a godsend. The basic structure of the OrthoRoute plugin looks something like this:

![Orthoroute architecture](/images/ConnM/OrthorouteArch.png)

The OrthoRoute plugin communicates with KiCad via the IPC API over a Unix socket. This API is basically a bunch of C++ classes that gives me access to board data – nets, pads, copper pour geometry, airwires, and everything else. This allows me to build a second model of a PCB inside a Python script and model it however I want.

### Bug-finding and Path-finding.

After using the IPC API to extract the board, I had everything. Drills, pads, and copper pours. The next step was to implement path finding. This is the process of selecting an airwire, and finding a path between its beginning and end. This is what autorouters _do_, so it's not exactly hard. I'm using standard algorithms like Wavefront expansion, and a few other things I picked up from a VLSI textbook. The problem with this is I needed a map of all the obstacles on the board. I can't route through pads, traces, holes or keepouts on the board, so I need a map of obstacles to use with whatever pathfinding algorithm I use.

The key insight here, and I think this is pretty damn smart, is that a copper pour _is_ the map of where traces can go. If I create a board with a few parts on it and put down a ground plane, this ground plane will be a large polygon with holes representing the pads, vias, traces, and keepout areas. If I lay down traces where the copper pour is, I can guarantee the pathfinding algorithm will not route into those traces and holes.

While the [kicad-python library](https://docs.kicad.org/kicad-python-main/board.html) has functions that will return the polygon of a copper pour, I can't use that. Not all boards will have a copper pour. What I really need to do is reverse engineer the process of making these copper pours myself. I need a way to extract the pads, traces, and keepouts and applying DRC constraints to them. 

That's exactly what I did. By using a board that already had a copper pour, I figured out a way to extract the footprints on the board, apply the DRC, and make a polygon out of what remained. By comparing this to the ground truth of the copper pour polygon extracted from the board, I could validate that my 'virtual' copper pour was correct, and could use this with boards without a copper pour.

<figure>
  <img src="/images/ConnM/OrthorouteCopper.png" alt="Development of the virtual copper pour extraction showing real thermal relief vs virtual algorithm vs difference map" />
  <figcaption>
    Development of the 'virtual' copper pour extraction. Left: Real copper pour from KiCad (58.8% routable). Middle: Virtual algorithm recreation (68.9% routable). Right: Difference map showing 73.7% accuracy between real and virtual methods. This was from early in the development of my 'virtual' copper pour solution.
  </figcaption>
</figure>

Pathfinding wasn't the issue. That's easy because there are published algorithms. What really gave me a lot of trouble is figuring out where the pathfinding was valid. I'm sure someone else would have spent months going through IPC specifications to figure out where an autorouter _should_ route traces. But I leveraged the simple fact that this data is already generated by KiCad -- the copper pour itself -- and just replicated it.



## Technical Architecture

### Core Innovation: Parallel Pathfinding
- **One CUDA thread per net** - simultaneous routing of thousands of connections
- **Shared grid state** - dynamic congestion management across all threads
- **Conflict resolution** - real-time negotiation between competing routes

### Grid-Based Routing Strategy
- **Orthogonal grid** on multiple PCB layers
- **Via sites** at grid intersections for layer changes
- **Capacity management** - multiple traces per grid segment
- **Adaptive fragmentation** - reuse partial grid segments

## Project Structure

```plaintext
OrthoRoute/
├── src/
│   ├── core/
│   │   ├── grid_generator.py       # Grid infrastructure
│   │   ├── netlist_parser.py       # KiCad integration
│   │   └── route_optimizer.py      # Quality metrics
│   ├── cuda/
│   │   ├── routing_kernels.cu      # Parallel A* pathfinding
│   │   ├── conflict_resolution.cu  # Grid conflict handling
│   │   └── memory_manager.cu       # GPU memory optimization
│   ├── visualization/
│   │   ├── realtime_display.py     # OpenGL rendering
│   │   ├── route_animator.py       # Routing visualization
│   │   └── performance_monitor.py  # Statistics dashboard
│   └── kicad_plugin/
│       ├── orthoroute_plugin.py    # KiCad Action Plugin
│       └── ui_controls.py          # GUI integration
├── tests/
│   ├── unit_tests/
│   ├── benchmark_boards/           # Test PCBs
│   └── performance_tests/
├── docs/
│   ├── algorithm_design.md
│   ├── cuda_optimization.md
│   └── user_guide.md
└── examples/
    ├── simple_board/
    ├── high_density_board/
    └── hypercube_backplane/        # Original use case
```

## Development Phases

### Phase 1: Proof of Concept (Week 1)
**Goal:** Route simple boards with basic parallel algorithm

- **Core grid generation** and CUDA data structures
- **Basic A* pathfinding** kernel (single layer)
- **KiCad netlist import** and board geometry extraction  
- **Simple visualization** with matplotlib
- **Unit tests** for small boards (10-100 nets)

**Deliverable:** Working prototype that can route simple boards faster than traditional tools

### Phase 2: Scaling & Optimization (Week 2)  
**Goal:** Handle complex boards with thousands of nets

- **Multi-layer routing** with via placement
- **Conflict resolution** algorithms for competing nets
- **Memory optimization** for large datasets
- **Real-time OpenGL visualization** 
- **Performance benchmarking** vs existing tools

**Deliverable:** Production-ready autorouter for complex boards

### Phase 3: Integration & Polish (Week 3)
**Goal:** Professional KiCad integration and documentation

- **KiCad Action Plugin** with GUI controls
- **Route quality optimization** (wire length, via count)
- **Comprehensive documentation** and examples
- **Performance tuning** and edge case handling
- **Community release** preparation

**Deliverable:** Public release of OrthoRoute as open source project

## Target Performance

### Benchmark Comparisons
| Metric | Traditional Tools | OrthoRoute Target |
|--------|------------------|-------------------|
| 1K nets | 30 minutes | 30 seconds |
| 8K nets | Hours/impossible | 5 minutes |
| Real-time viz | No | Yes |
| Parallel routing | No | Full parallel |

### Hardware Requirements
- **Minimum:** RTX 3060 (3,584 CUDA cores)
- **Recommended:** RTX 4080+ (9,728+ CUDA cores)  
- **Optimal:** RTX 5090 (16,384+ CUDA cores)
- **RAM:** 16GB+ for large boards
- **KiCad:** Version 7.0+

## Use Cases

### Primary Applications
- **High-density backplanes** (servers, networking equipment)
- **GPU/CPU boards** with thousands of nets
- **Multi-board systems** with complex interconnects
- **Rapid prototyping** where routing speed matters

### Research Applications  
- **Algorithm research** - novel routing strategies
- **Academic projects** - teaching parallel algorithms
- **Industry R&D** - next-generation EDA tools

## Community Impact

### Open Source Strategy
- **MIT License** - maximum compatibility and adoption
- **Modular design** - easy to extend and modify
- **Comprehensive docs** - lower barrier to contribution
- **Example projects** - demonstrate capabilities

### Industry Disruption Potential
- **Proof of concept** for GPU-accelerated EDA tools
- **Performance baseline** for commercial tool comparison  
- **Research platform** for next-generation routing algorithms
- **Democratization** of advanced PCB routing capabilities

## Long-term Vision

### OrthoRoute 2.0 Features
- **Machine learning** optimization of routing strategies
- **Multi-GPU** support for massive boards
- **Cloud routing** services for distributed teams
- **Advanced constraints** (impedance control, crosstalk)

### Ecosystem Development
- **Plugin marketplace** for specialized routing algorithms
- **Integration APIs** for other EDA tools (Altium, Eagle)
- **Educational materials** for universities and training
- **Commercial licensing** for enterprise features

## Getting Started

### Quick Start
```bash
git clone https://github.com/username/OrthoRoute
cd OrthoRoute
pip install -r requirements.txt
python -m orthoroute examples/simple_board/test.kicad_pcb

[back](../)
