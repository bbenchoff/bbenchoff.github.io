---
layout: default
title: "OrthoRoute"
description: "OrthoRoute: GPU-Accelerated PCB Autorouter"
keywords: ["hardware engineering", "PCB design", "electronics""]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2022-06-04
image: "/images/default.jpg"
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

## Project Overview

**OrthoRoute** is a GPU-accelerated PCB autorouter, designed for massively parallel routing of complex circuit boards. Unlike traditional CPU-based autorouters that process nets sequentially, OrthoRoute leverages thousands of CUDA cores to route all nets simultaneously.

**Key Features:**
- True parallel routing using GPU compute
- Real-time visualization of routing process
- Orthogonal grid-based routing strategy
- Open source and KiCad integration
- Optimized for high-density, complex boards

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
