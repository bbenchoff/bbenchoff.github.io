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

#### This document is a compliment to the README in [the Github repository](https://github.com/bbenchoff/OrthoRoute). The README provides information about performance, capabilities, and tests. This document reflects more on the why and how. The README describes what it does, this document describes how and why it does it.

This is a project born out of necessity. Another thing I was working on needed an _enormous_ backplane. A PCB with sixteen connectors, with 1,100 pins on each connector. That's 17,600 individual pads, and 8,192 airwires that need to be routed  Here, just take a look:

![a view of the backplane, before routing the PCB](/images/ConnM/unroutedbackplane.png)

Look at that shit. Hand routing this would take months. For a laugh, I tried [FreeRouting](https://freerouting.org/), the KiCad autorouter plugin, and it routed 4% of the traces in seven hours. If that trend held, which it wouldn't, that would be a month of autorouting. And it probably wouldn't work in the end. I had a few options, all of which would take far too long

- I could route the board by hand. This would be painful and take months, but I would get a good-looking board at the end.
- I could YOLO everything and just let the FreeRouting autorouter handle it. It would take weeks, because the first traces are easy, the last traces take the longest. This would result in an ugly board.
- I could spend a month or two building my own autorouter plugin for KiCad. I have a fairly powerful GPU and routing a PCB is a very parallel problem. I could also implement my own routing algorithms to make the finished product look good.

When confronted with a task that will take months, always choose the more interesting path.

## Project Overview

**OrthoRoute** is a GPU-accelerated PCB autorouter, designed for parallel routing of massive circuit boards. Unlike most autorouters such as [Altium Situs](https://www.altium.com/documentation/altium-designer/automated-board-layout-situs-topological-autorouter), [FreeRouting](https://freerouting.org/), and a dozen EE-focused B2B SaaS startups, OrthoRoute uses GPUs for parallelizing the task of connecting pads with traces.

OrthoRoute is designed as a KiCad plugin, and heavily leverages the new [KiCad IPC API](https://dev-docs.kicad.org/en/apis-and-binding/ipc-api/) and [kicad-python](https://docs.kicad.org/kicad-python-main/index.html) bindings for the IPC API.

**Key Features:**
- **Real-time Visualization**: Interactive 2D board view with zoom, pan, and layer controls
- **Professional Interface**: Clean PyQt6-based interface with KiCad color themes
- **Multi-layer Support**: Handle complex multi-layer PCB designs with front/back copper visualization
- **GPU-Accelerated Routing**: Routing algorithms in CUDA
- **Multi-algorithm routing**: Some boards are better suited to different algorithms
- **Manhattan Routing**: Where OrthoRoute gets its name. It's a grid of traces, vertical on one layer, horizontal on the other
- **Lee's Algorithm**: The most 'traditional' autorouting algorithm. 
- **It's a KiCad Plugin**: Just download and install with the Plugin Manager


## Screenshots

![Screenshot 1, showing an Arduino clone](/images/ConnM/OrthorouteScreenshot1.png)

## More on the GitHub

This document is a compliment to the README in [the Github repository](https://github.com/bbenchoff/OrthoRoute). The README provides information about 


## Performance

Unsurprisingly, doing extremely parallel operations in a GPU is _fast_. But how does it compare to other Autorouters? Before I get into this, I must say I've come to the conclusion that assessing PCB routing is not objective. Board layout is a qualia. Yes, there's RF considerations, impedance, stackup, and manufacturability concerns, but a 'good' board layout is a subjective criterion.

It's like airplanes. Aesthetics correlates with good engineering. If it looks good, it'll probably fly. Even if it looks _weird_, but good, it'll probably fly. You develop a sense of this after looking at tens of thousands of circuit boards or reading _Jane’s All the World’s Aircraft_ cover to cover, you start to get a sense of these things.

That being said, this autorouter doesn't quite produce _good_ boards. Like all autorouters, I suppose. But it will produce a _valid_ circuit board. And it does it fast.

SOMETHING ABOUT PERFORMANCE WHEN I GET THE AUTOROUTING DONE This paragraph is going to compare Orthoroute vs other autorouters in speed, and what they look like

## Why A GPU-Accelerated Autorouter Is Dumb

GPUs are really good at parallel problems. And you would think autorouting is a very parallel problem. It's just finding a path between two points on a graph. There are algorithms that are embarrassingly parallel that just do this. This is true, but there's a lot you're not considering. 

Instead of mapping an entire (blank) PCB into a GPU's memory and drawing traces around obstacles, an autorouter is about finding a path _under constraints that are always changing_.

If you have three nets, route(A→B), route(C→D), and route(E→F), you start out by routing the direct path (A→B). But (C→D) can't take the direct path between those points, because it's blocked by (A→B). Now (E→F) is blocked by both previous routes, so it takes a worse path. 

It's _like_ the traveling salesman problem, but all the salesmen can't take the same road. Also there are thousands of salesmen.

There's a reason this is the hardest problem in computer science. This is why people have been working on autorouters for sixty years, and they all suck.

GPUs are mostly terrible for autorouting. Should net (A→B) be higher priority than (C→D)? GPUs hate branching logic. You can't route (C→D) until you've routed (A→B), so that embarrassingly parallel problem is actually pretty small. Now deal with Design Rules. If you don't want a trace to intersect another trace of a different net, you apply the design rules. But this changes when you go to the next net! You're constantly redefining Design Rules, which kills any GPU efficiency.

But all is not lost. There's exactly one part of autorouting that's actually parallel, and a useful case to deploy a GPU. Lee's Wavefront expansion. You route your traces on a fine-pitch grid, and propagate a 'wave' through the grid. Each cell in the wave can be processed independently. Shortest path wins, put your trace there. That's what I'm using the GPU for, and the CPU for everything else. Yeah, it's faster, but it's not _great_. Don't trust the autorouter, but at least this one is fast.

![Animated GIF of Wavefront Expansion](/images/WavefrontExpansion.gif)

## Why OrthoRoute is Great on a GPU.

But the entire point of this project isn't to build a general autorouter. I built this to route _one_ board. And I'm doing it with 'Manhattan routing'. Manhattan routing is embarrassingly parallel because it's geometrically constrained. I have 16 identical parts, each with 1100 SMD pads, arranged in a regular grid. That's 17,600 pads that need to connect to each other in very predictable patterns.

PUT A PICTURE OF ORTHOGINAL ROUTING HERE

Instead of the "route anything anywhere" problem of general autorouting, I have layers with dedicated directions: horizontal traces on one layer, vertical on the next, horizontal again, and so on. When a net needs to change direction, it drops a via and moves to the appropriate layer. No complex pathfinding required, just geometric moves on a regular grid.

_This_ is why it's called OrthoRoute. It's just routing through a grid of traces. There's no DRC needed, because drawing the grid of traces is defined by DRC.

## Implementation

The following are the implementation details of OrthoRoute. How I built it, and why I made the decisions I did. If you want to never write a plugin for KiCad, skip this section.

Pre-KiCad 9.0 had a SWIG-based plugin system. There are serious deficits with this SWIG-based system compared to the new IPC plugin system released with KiCad 9. The SWIG-based system was locked to the Python environment bundled with KiCad. Process isolation, threading, and performance constraints abound. Doing GPU programming with CuPy, while not impossible, is difficult.

The new IPC plugin system for KiCad is a godsend. The basic structure of the OrthoRoute plugin looks something like this:

![Orthoroute architecture](/images/ConnM/OrthorouteArch.png)

The OrthoRoute plugin communicates with KiCad via the IPC API over a Unix socket. This API is basically a bunch of C++ classes that gives me access to board data – nets, pads, copper pour geometry, airwires, and everything else. This allows me to build a second model of a PCB inside a Python script and model it however I want.

### Bug-finding and Path-finding.

After using the IPC API to extract the board, I had everything. Drills, pads, and copper pours. The next step was to implement path finding. This is the process of selecting an airwire, and finding a path between its beginning and end. This is what autorouters _do_, so I'm using standard algorithms like Wavefront expansion, and a few other things I picked up from a VLSI textbook. All I needed to do was convert that list of pads and traces and keepouts to a map of where the autorouter could draw traces.

The key insight here, and I think this is pretty damn smart, is that a copper ground plane _is_ the map of where traces can go. If I create a board with a few parts on it and put down a ground plane, that ground plane defines where the autorouter can draw traces.

While the [kicad-python library](https://docs.kicad.org/kicad-python-main/board.html) has functions that will return the polygon of a copper pour, I can't use that. Not all boards will have a copper pour. What I really need to do is reverse engineer the process of making these copper pours myself. I need a way to extract the pads, traces, and keepouts and applying DRC constraints to them. 

That's exactly what I did. First I learned how to extract the copper pour from a board, giving me a 5000-point polygon of copper with holes representing pads, traces, and clearances. Then, I reverse engineered this to create a 'virtual' copper pour -- one that could be generated even if the KiCad board file doesn't have a copper pour. By comparing this 'virtual' copper pour to the ground truth of the copper pour polygon extracted from the board, I could validate that my 'virtual' copper pour was correct. This gives me an exact map of where the autorouter can lay down copper.

<figure>
  <img src="/images/OrthorouteCopper.png" alt="Development of the virtual copper pour extraction showing real thermal relief vs virtual algorithm vs difference map" />
</figure>

Pathfinding wasn't the issue. There are standard algorithms for that. What really gave me a lot of trouble is figuring out where the pathfinding was valid. I'm sure someone else would have spent months going through IPC specifications to figure out where an autorouter _should_ route traces. But I leveraged the simple fact that this data is already generated by KiCad -- the copper pour itself -- and just replicated it.

If there are any KiCad devs out there reading this, _this_ is what you should implement in the next iteration kicad-python. A `get_free_routing_space(int copper_layer)` function. Something that returns the polygon of a copper pour on boards that don't have a copper pour, for each layer of copper.

### The Non-Orthogonal Router

Until now this entire project was an exercise. I had to get my head around the KiCad IPC API.

The entire point of this project wasn't to build a general-purpose autorouter. I needed something that would route a truly insane backplane with 16 connectors, each with 1100 pads, and 8195 unrouted nets. But to even start that project, I chose to build a general purpose autorouter. Nothing fancy; just something that would route a few microcontroller breakout boards and a mechanical keyboard PCB.

That's exactly what I did. I built an autorouter that only uses wavefront expansion. And I quickly hit the fundamental limit of how useful this autorouter could be:

![A poorly routed RP2040 board](/images/ConnM/OrthorouteScreenshot2.png)

Above is a screenshot of the OrthoRoute plugin, attempting to route a board with an RP2040 microcontroller. This is the standard RP2040 breakout taken off of Raspberry Pi's FTP server. I deleted the traces that put the GPIOs onto pin headers and pressed 'Route Now'. The results were terrible.

This is routing with DRC awareness if you look really close. The routed traces aren't interfering with each other, but not many traces are routed. Airwires are still there, and the routing isn't quite as good as it could be.

For a single pass, this is fine! But autorouters don't do a single pass. There are other techniques not implemented in this plugin like:

- Push-and-Shove routing. This technique moves existing traces to make room for new ones. It's found in all real autorouters, but not implemented here
- Rip-up and retry. Right now we have single-pass routing. If a route fails, it's done. Rip-up is the ability to remove 'blocking' or conflicting routes and try alternate paths.
- A global routing plan. When a person looks at a circuit board full of airwires, they might see 'busses' -- a bunch of traces that all go from one component to another. It would be really smart to route these together, and route these first. I'm not doing that with my OrthoRoute. I'm just grabbing the first net from a list of unrouted nets and routing that.

The problems faced with my wavefront expansion algorithm require solutions that are also needed in my orthogonal grid routing algorithm. So I pivoted to that. I had the bare bones of an autorouter plugin, but I wanted to get this _done_. This project was already taking a few weeks, time to get something done.

### Development of the Manhattan Routing Engine

A non-orthogonal autorouter is a good starting point, but I simply used that as an exercise to wrap my head around the KiCad IPC API. The real build is a 'Manhattan Orthoginal Routing Engine', the tool needed to route my mess of a backplane. 

The 'Manhattan Routing Engine' is based on a simple idea. Instead of drawing traces from pad to pad, instead you first create a multilayer grid. The top copper layer remains free of traces, but the In1.Cu, In2.Cu, In3.Cu... B.Cu layers have an array of parallel traces on them. In1.Cu has horizontal traces on them, In2.Cu has vertical traces, and continuing until you have all but one of the layers on the PCB filled with traces. This is the _fabric_, a useful term because I'm effectively using FPGA routing techniques on a PCB.

Next, allow blind and buried vias at the intersection of these grid points. The F.Cu layer can connect to In1.Cu, In2.Cu... all the way to B.Cu. These are blind and buried vias, so a via from In3.Cu to In4.Cu means traces on F.Cu...In2.Cu and In5.Cu...B.Cu can occupy the same node in this graph without interfering. We've now turned the fabric into a 3-dimensional lattice.

To connect the pads on the PCB together, first bring a small trace off a pad. Use a via to 'punch down' into the fabric. From there, you can route through this grid of traces. To go left, take the trace you punched down into. To go down, punch a via up or down into a vertical layer. Finally, come back up to the F.Cu layer and make a short trace over to the pad.

<<<Image of the traces>>>

### Actually Routing Nets

 I either need to spend a lot of cycles on ripup and restore, or find a better algorithm The path finding algorithm I'm using for this is called the equally ungooglable [PathFinder](https://ieeexplore.ieee.org/document/1377269), a routing algorithm developed for FPGAs in 1995. The core idea of PathFinder is to iteratively negotiate paths through this grid until congestion is resolved. It first puts all traces into the grid, letting chaos ensue. Then congestion costs are applied. This applies costs to the edges of the graph for the next iteration. After enough iterations, the traces spread out and you get a stable routing solution.



<<< Image of PathFinder routed board>>>

It's also _stupidly parallel_

IT'S A 3D LATTICE NOT A BUNCH OF GRIDS JESUS FUCK



<code>
I started this project thinking I would just take PathFinder, the old FPGA routing algorithm, and brute force it onto a GPU. PathFinder works like this: you run shortest-path expansion (Dijkstra or Δ-stepping) across every net, you adjust costs, you do it again, and eventually congestion sorts itself out. It’s iterative, it’s predictable, and it’s been around for thirty years. In theory, it should map well to CUDA. In practice, it was a disaster. My naïve GPU implementation took a full minute per net. That wasn’t a batching problem or a memory problem or a penalty-calculation problem — it was the kernel itself. The GPU was choking on irregular buckets, sparse memory access, and watchdog stalls. That’s the first real insight: the bottleneck wasn’t where you’d expect, it was the shortest-path kernel itself. That’s not an “optimize the loop” moment, that’s an algorithmic diagnosis.

The second breakthrough was realizing I didn’t need to run Δ-stepping over the entire ~600,000-node, ~2 million-edge lattice for every single net. That’s absurd. Each net only cares about a narrow corridor of the board. So I built ROI-restricted graphs: dynamically carving out small regions of interest around source and sink, a tight bounding box with some margin. That shrinks the search space by 94–99% — from hundreds of thousands of nodes down to a few hundred. Suddenly, the GPU kernel is feasible. This wasn’t a micro-optimization, it was a re-formulation of the problem. Instead of treating routing as “global graph SSSP,” I treated it as “localized subgraph exploration.” That’s exactly the kind of domain restriction you see in HPC papers: change the problem to fit the machine.

The third step was replacing Δ-stepping itself. Δ-stepping is fine on CPU, where you can pointer-chase through buckets all day. On a GPU, pointer-chasing kills you. Warps need dense, predictable memory access. So I replaced it with a Near–Far worklist. It looks simple, but the effect is huge: instead of scatter-shot buckets, you compress frontier nodes into dense arrays. Now when a warp touches memory, it touches consecutive addresses. That means coalesced loads, fewer stalls, and a kernel that actually behaves like a GPU kernel. This is algorithm–hardware co-design: don’t just port the algorithm, reshape its data structures for the memory hierarchy you’re actually running on.

The next step — the one I’m sprinting toward right now — is parallelizing ROIs themselves. Today I can run one ROI per kernel launch. But GPUs want saturation, not dribs and drabs. The obvious play is to pack multiple ROIs into one launch: blockIdx.x = ROI_ID, each block solves a different ROI. That means building buffer-packing logic (CSR arrays with offsets), per-block queue management, and proper offset arithmetic in the kernel. It’s the same pattern you see in high-performance graph frameworks: don’t run one small problem at a time, run a hundred of them at once. That’s when you start chewing through nets at under a second each instead of ten or twenty.

And this all isn’t static. The plan is dynamic adaptation. The system will query device properties, budget memory per ROI, pick K automatically based on SM count and VRAM, and sort ROIs by size so the big ones don’t starve the machine. It’ll self-tune: track milliseconds per net, occupancy, memory use, then push K up or down based on how the device responds. That’s the kind of feedback-driven optimization you only see in cutting-edge GPU compilers and frameworks like Gunrock or Groute.

So the arc looks like this: I started with PathFinder, then I found the kernel bottleneck, then I shrank the graph with ROIs, then I replaced Δ-stepping with Near–Far, then I planned multi-ROI kernels, and now I’m building an adaptive system that configures itself to the hardware. That’s not “just write an autorouter.” That’s re-architecting an algorithm at every level — theory, data structure, kernel, and runtime.
</code>



### This is _extremely_ memory intensive

The gold standard for the orthogonal autorouter is the board that forced me to make this: a 200x160mm board with 17,000 pads, and 8192 different nets to route. If it routes _this_, it'll probably route anything. But this needed a lot of compute and a lot of memory.

The 

🧮 Memory Calculation Algorithm:

  def calculate_total_memory(board_width_mm, board_height_mm, num_nets, num_pads,
                            grid_pitch_mm=0.2, num_layers=12):
      """
      Calculate total CPU and GPU memory requirements for OrthoRoute
      """

      # 1. GRID DIMENSIONS
      grid_cols = int(board_width_mm / grid_pitch_mm)
      grid_rows = int(board_height_mm / grid_pitch_mm)
      grid_cells = grid_cols * grid_rows * num_layers

      # 2. RRG NODES
      base_nodes = grid_cells * 3  # rail + bus + switch nodes per cell
      tap_nodes = num_pads * 8     # ~8 tap candidates per pad (avg from your data)
      total_nodes = base_nodes + tap_nodes

      # 3. RRG EDGES
      # From your data: edge/node ratio ≈ 1.42 (5.8M edges / 4.1M nodes)
      total_edges = int(total_nodes * 1.42)

      # 4. ADJACENCY MATRIX
      adjacency_connections = total_edges * 2  # directed graph, 2x edges

      # 5. CPU MEMORY (Python objects)
      cpu_node_memory = total_nodes * 200      # ~200 bytes per RRGNode object
      cpu_edge_memory = total_edges * 300      # ~300 bytes per RRGEdge object
      cpu_total_mb = (cpu_node_memory + cpu_edge_memory) / (1024**2)

      # 6. GPU MEMORY (numpy/cupy arrays)
      # Node arrays: positions(2×f32) + layers(i32) + types(i32) + capacity(i32) + cost(f32)
      gpu_node_memory = total_nodes * (2*4 + 4 + 4 + 4 + 4)  # 22 bytes per node

      # Edge arrays: lengths(f32) + types(i32) + capacity(i32) + cost(f32)
      gpu_edge_memory = total_edges * (4 + 4 + 4 + 4)         # 16 bytes per edge

      # PathFinder state: 8 arrays for nodes + 8 arrays for edges
      pathfinder_memory = (total_nodes + total_edges) * 4 * 8 # 32 bytes per node+edge

      # Adjacency matrix (sparse): data + indices + indptr
      adjacency_memory = adjacency_connections * 4 * 3        # 12 bytes per connection

      gpu_total_mb = (gpu_node_memory + gpu_edge_memory + pathfinder_memory + adjacency_memory) / (1024**2)

      # 7. PADTAP MEMORY
      padtap_memory_mb = (num_pads * 8 * 6 * 4) / (1024**2)  # 8 taps × 6 fields × 4 bytes

      return {
          'grid_dimensions': f"{grid_cols}×{grid_rows}×{num_layers}",
          'grid_cells': grid_cells,
          'total_nodes': total_nodes,
          'total_edges': total_edges,
          'adjacency_connections': adjacency_connections,
          'cpu_memory_mb': cpu_total_mb,
          'gpu_memory_mb': gpu_total_mb,
          'padtap_memory_mb': padtap_memory_mb,
          'total_memory_mb': cpu_total_mb + gpu_total_mb + padtap_memory_mb
      }

  📈 Memory Requirements for Your Board:

  For 10 nets (your current test):
  result = calculate_total_memory(125.2, 115.9, 10, 16384, 0.2, 12)
  # Predicted: 592MB GPU + 2427MB CPU ≈ 3GB total
  # Actual: 592.3MB GPU + 2427.3MB CPU ≈ 3GB total ✅ MATCHES!

  For full 8,192 nets:
  result = calculate_total_memory(161.0, 204.9, 8192, 16384, 0.2, 12)

  Results:
  - Grid: 806×1,025×12 = 9.9M cells
  - Nodes: ~30M nodes (base) + 131K taps = ~30.1M
  - Edges: ~42.7M edges
  - CPU Memory: ~21.4GB (Python objects)
  - GPU Memory: ~6.8GB (arrays)
  - Total Memory: ~28.2GB



[back](../)
