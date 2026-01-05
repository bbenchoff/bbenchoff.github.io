---
layout: default
title: "StarC: A Parallel C for Hypercube Computers"
description: "Language specification for StarC v1.0"
keywords: ["parallel programming", "hypercube", "Connection Machine", "TDMA"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-06-04
image: "/images/default.jpg"
---

<style>
/* Collapsible code blocks - OPT-IN via 'collapsible' class */
/* Default: all code blocks are visible */
/* To make a code block collapsible, wrap it in <div class="collapsible">...</div> */

.code-block-wrapper.collapsible {
  margin: 1.5em 0;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.code-block-wrapper.collapsible .code-block-header {
  background: var(--accent);
  color: white;
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.code-block-wrapper.collapsible .code-block-title {
  font-weight: 500;
  font-size: 0.9rem;
}

.code-block-wrapper.collapsible .code-block-toggle {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.code-block-wrapper.collapsible .code-block-content {
  display: none;
  max-height: 400px;
  overflow: auto;
}

.code-block-wrapper.collapsible .code-block-content.expanded {
  display: block;
}

.code-block-wrapper.collapsible .code-block-content pre[class*="language-"] {
  margin: 0;
  border-radius: 0;
  box-shadow: none;
}

/* Ensure code blocks are visible */
pre[class*="language-"] {
  display: block !important;
  max-height: none !important;
}

/* Fix extra space at beginning of code blocks */
.tm-article pre[class*="language-"] code {
  padding: 0;
  margin: 0;
  display: block;
  white-space: pre;
}

.tm-article pre[class*="language-"] {
  padding: 1rem !important;
  margin: 1.5em 0 !important;
}

/* Remove any extra indentation from code blocks */
.tm-article pre code {
  text-indent: 0;
  padding-left: 0;
}

/* Disable line numbers plugin if it's adding spacing */
.tm-article pre.line-numbers {
  padding-left: 1rem !important;
}

.tm-article pre.line-numbers code {
  padding-left: 0 !important;
}

/* Remove extra spacing from Prism */
.tm-article .token {
  padding: 0;
  margin: 0;
}

/* Logo and headline layout */
.starc-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin: 2rem 0 3rem 0;
  flex-wrap: wrap;
}

.starc-header img {
  max-width: 200px;
  height: auto;
  flex-shrink: 0;
}

.starc-header h1 {
  margin: 0;
  flex: 1;
  min-width: 300px;
}

/* Mobile: stack vertically */
@media (max-width: 768px) {
  .starc-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .starc-header img {
    max-width: 150px;
  }

  .starc-header h1 {
    font-size: 1.5rem;
  }
}

/* Very small screens */
@media (max-width: 480px) {
  .starc-header img {
    max-width: 120px;
  }

  .starc-header h1 {
    font-size: 1.3rem;
  }
}

/* Table styling - full width */
.tm-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.95rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
}

.tm-article table thead {
  background: #f5f5f5;
}

.tm-article table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #ddd;
  color: #333;
}

.tm-article table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: top;
}

.tm-article table tbody tr:hover {
  background: #f9f9f9;
}

.tm-article table tbody tr:last-child td {
  border-bottom: none;
}

/* Code in tables */
.tm-article table code {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

/* Responsive tables */
@media (max-width: 768px) {
  .tm-article table {
    font-size: 0.85rem;
  }

  .tm-article table th,
  .tm-article table td {
    padding: 0.5rem 0.75rem;
  }
}

/* Table of Contents styling */
:root {
  --tm-gap: 16px;
  --tm-article-max: 94ch;
  --tm-article-min-ch: 52;
  --tm-nav-h: 64px;
  --tm-scroll-offset: 90px;
  --tm-toc-max-px: 420px;
  --tm-article-fit-px: 100000px;
}

.tm-layout {
  position: relative;
}

.tm-article {
  margin-left: auto;
  margin-right: auto;
  min-width: 0;
  max-width: min(var(--tm-article-max), var(--tm-article-fit-px));
}

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

.tm-toc-nav li.tm-toc-level-1 {
  padding-left: 0;
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
  font-weight: 600;
}

.tm-toc-nav li.tm-toc-level-1::before {
  content: none;
}

.tm-toc-nav li.tm-toc-level-1 a {
  font-size: 1rem;
  font-weight: 600;
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

.tm-article h2,
.tm-article h3,
.tm-article h4 {
  scroll-margin-top: calc(var(--tm-nav-h) + 12px);
}

@media (min-width: 900px) {
  .tm-layout:not(.tm-stack) .tm-toc {
    position: fixed;
    right: 0;
    top: calc(var(--tm-nav-h) + 12px);
    z-index: 50;
    width: max-content;
    max-width: min(var(--tm-toc-max-px), calc(100vw - 12px));
    max-height: calc(100dvh - (var(--tm-nav-h) + 24px));
    overflow: auto;
    overscroll-behavior: contain;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

.tm-layout.tm-stack .tm-toc {
  position: static;
  width: auto;
  max-width: 100%;
  max-height: none;
  overflow: visible;
}

@supports (overflow: clip) {
  .tm-layout { overflow-x: clip; }
}
@supports not (overflow: clip) {
  .tm-layout { overflow-x: hidden; }
}

.tm-toc-nav a.is-active {
  font-weight: 700;
  text-decoration: underline;
}

.tm-toc-nav li.is-active::before {
  font-weight: 700;
}

.tm-toc-nav li::before {
  font-weight: 400;
}

.tm-toc-nav li.is-active {
  font-weight: normal;
}

.tm-toc {
  margin-bottom: 2rem;
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
      <li><a href="ThinkinMachine.html">Connection Machine Recreation</a></li>
      <li><a href="HypercubeTDMA.html">Hypercube TDMA</a></li>
    </ul>
  </div>
</aside>

<div class="tm-article" markdown="1">

<div class="starc-header">
  <img src="/images/ConnM/StarCLogo.png" alt="StarC Logo">
  <h1>StarC: A Parallel C for Hypercube Computers</h1>
</div>

## Introduction

The C programming language is a product of the DEC PDP-11. C is the way it is because that's how the PDP-11 worked. `++` and `--` exist because the PDP-11 had auto-increment addressing modes. `*p++` isn't a trick; it's built into the hardware. Strings in C are `char` arrays with a 0 at the end, because that's what the PDP-11 did. C has no checks for array bounds because the PDP-11 didn't check array bounds in hardware. There's nothing wrong with what C does; like most things it is a product of the material conditions of its development.

StarC is what those material conditions look like for a hypercube.

This language was developed in parallel with a machine with 4,096 RISC-V microcontrollers arranged as a 12-dimensional hypercube. Each processor has 12 neighbors. Communication happens over a time-division multiplexed serial network with deterministic timing. This machine is obviously inspired by the Thinking Machines Connection Machine CM-1. There were two programming languages for the CM-1: C* and *Lisp. Both are dead. The machines that ran these languages are all powered down. If you want to program a hypercube machine in the 21st century, you're on your own. StarC was created to program this machine.

There are subtle but significant differences between the Connection Machine CM-1 and the machine this language was designed for. The CM-1 had dedicated router ASICs at each node for arbitrary point-to-point communication. This machine doesn't. It has a TDMA schedule and neighbor links, nothing more. The CM-1 had 1-bit processors with hardware masking for true SIMD execution. This machine has 32-bit RISC-V cores running SPMD, but each processor executes independently. The CM-1 could hide communication latency behind its router. This machine cannot. The network schedule is visible, and communication happens when the schedule says it happens.

These differences shape the language. No router means no `get(arbitrary_address)`. StarC only has neighbor exchange. TDMA means communication is batched into explicit `exchange` blocks, not scattered through code. SPMD means `where` is just syntax for `if`, not a hardware mask operation. The constraints of C* came from the CM-1's hardware. The constraints of StarC come from this machine's hardware.

### Implementation

In implementation, StarC compiles to C via a Python preprocessor. That's it. There is no virtual machine or garbage collector or runtime type system. The Python preprocessor rewrites `pvar<T>`, `where`, and `exchange` blocks into C with runtime calls. The runtime handles TDMA timing and communication. There's no magic, only just enough syntax to express hypercube algorithms without fighting the hardware. C was, and is, a thin wrapper over the PDP-11. StarC is a thin wrapper over a hypercube.

Calling StarC an overcomplication of what could be a bunch of macros is probably correct. However, GCC has no idea about the rules of a hypercube. With StarC, exchange blocks can be validated, there is no accidental dependence on ordering, and no weird multi-superframe behavior. StarC exists to enforce the rules of the machine and illustrate what is possible within the confines of the hardware. Like C did with a PDP-11.

**Recommended reading providing context to this specification**

- [TDMA Routing on a Hypercube](https://bbenchoff.github.io/pages/HypercubeTDMA.html)

---

# Part I: The Machine

---

## Chapter 1: Hardware Model

Before writing StarC code, you need to understand what the code runs on. This chapter describes the physical machine.

### Dual Networks

The machine has two independent networks:

**1. Hypercube Network (TDMA)**

The primary communication network. A 12-dimensional hypercube connecting all 4,096 processors. Each processor has 12 neighbors—one per dimension. Communication is time-division multiplexed over a single UART per processor. Deterministic latency: every operation completes in bounded time.

This network handles: neighbor exchange, reductions, scans, broadcasts.

**2. Control Tree Network**

A hierarchical network separate from the hypercube. The structure is:

- 16 nodes per slice controller
- 16 slice controllers per plane controller  
- 16 plane controllers per machine controller
- Machine controller connects to host PC

Physical connections are single-wire serial from slice controllers to nodes. Higher bandwidth than the hypercube for bulk transfers, but variable latency.

This network handles: programming nodes, LED updates, bulk data transfer, host I/O.

```
                    ┌──────────────┐
                    │    Host PC   │
                    └──────┬───────┘
                           │ USB
                    ┌──────┴───────┐
                    │   Machine    │
                    │  Controller  │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
    │    Plane    │ │    Plane    │ │    Plane    │  (×16)
    │  Controller │ │  Controller │ │  Controller │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
      ┌────┴────┐     ┌────┴────┐     ┌────┴────┐
      │  Slice  │     │  Slice  │     │  Slice  │     (×16 per plane)
      │Controller│    │Controller│    │Controller│
      └────┬────┘     └────┬────┘     └────┬────┘
           │               │               │
       ┌───┴───┐       ┌───┴───┐       ┌───┴───┐
       │ Nodes │       │ Nodes │       │ Nodes │      (×16 per slice)
       │ 0-15  │       │ 0-15  │       │ 0-15  │
       └───────┘       └───────┘       └───────┘
```

StarC communication primitives use the hypercube network. Host I/O functions use the control tree.

### TDMA Timing

The hypercube network operates on a fixed schedule. Time is divided into phases, and phases are grouped into superframes.

**Default timing configuration:**

| Parameter | Value |
|-----------|-------|
| Phase clock | 1 kHz |
| Phase duration | 1 ms |
| Phases per superframe | 24 |
| Superframe duration | 24 ms |
| Serial baud rate | 1 Mbps |
| Payload per phase | 80 bytes |

Each of the 12 dimensions gets two phases per superframe: one for each direction. In dimension *d*, processors with bit *d* = 0 transmit first, then processors with bit *d* = 1 transmit. Dimension 0 uses phases 0-1. Dimension 11 uses phases 22-23.

**TDMA properties:**

- **No collisions.** Each link has exactly one transmitter per phase. The schedule guarantees this.
- **No arbitrary routing.** There is no `get(address)` or `send(address, value)`. You cannot send a message to an arbitrary processor. You can only exchange with your 12 hypercube neighbors.
- **No adaptive forwarding.** Packets don't route around congestion. There is no congestion—the schedule determines everything.
- **Multi-hop collectives exist** but are implemented as structured tree algorithms over neighbor links, not general routing. A reduction traverses dimensions 0→11 in order, exchanging with neighbors at each step. The path is fixed, not computed per-packet.

### Message Framing

Each phase transmits one frame:

```
┌──────┬────────┬────────┬─────────────────┬───────┐
│ Sync │ Header │ Length │     Payload     │ CRC16 │
│  1B  │   1B   │   1B   │    0-80 B       │  2B   │
└──────┴────────┴────────┴─────────────────┴───────┘
```

| Field | Size | Description |
|-------|------|-------------|
| Sync | 1 byte | 0xAA — byte alignment |
| Header | 1 byte | Flags and metadata |
| Length | 1 byte | Payload length (0-80) |
| Payload | 0-80 bytes | User data |
| CRC-16 | 2 bytes | Error detection |

At 1 Mbps with 1 ms phases, approximately 100 bytes can transit per phase. After framing overhead and timing margins, 80 bytes of payload remain.

### Addressing

The 4,096 processors can be viewed two ways.

**Hypercube view:** Each processor has a 12-bit address (0-4095). Two processors are neighbors if their addresses differ by exactly one bit. Processor 0x2A3 has neighbors at 0x2A2 (bit 0 differs), 0x2A1 (bit 1 differs), 0x2A7 (bit 2 differs), and so on for all 12 bits.

**Grid view:** The processors form a 64×64 toroidal grid. Each processor has a row (0-63) and column (0-63). The grid wraps: row 0's north neighbor is row 63, column 63's east neighbor is column 0.

These views are equivalent through Gray code mapping:

```c
// Convert grid position to processor ID
int grid_to_pid(int row, int col) {
    int gray_row = row ^ (row >> 1);  // 6-bit Gray code
    int gray_col = col ^ (col >> 1);  // 6-bit Gray code
    return (gray_row << 6) | gray_col;
}
```

**Why Gray code?** In Gray code, adjacent values differ by exactly one bit. Moving one step in any cardinal direction—including wrapping at edges—changes exactly one bit of the address. Every NEWS direction is exactly one hypercube hop.

**Dimension mapping:**

- Bits 0-5 (dimensions 0-5): column position
- Bits 6-11 (dimensions 6-11): row position
- EAST/WEST movement: dimensions 0-5
- NORTH/SOUTH movement: dimensions 6-11

### The LED Array

Each processor has one LED. The 64×64 LED matrix maps directly to the 64×64 grid view. Position (row, col) shows the LED of the processor at that grid position.

LEDs are updated via the control tree, not the hypercube network. Setting an LED is a local operation that doesn't require an exchange block.

---

## Chapter 2: Design Constraints

The CM-1 and this machine are both hypercubes. But they're built differently, and those differences determine what the programming language can and cannot do.

### What the CM-1 Had

**Router ASICs.** Every CM-1 node had a dedicated routing chip that could accept messages at any time, buffer them, and forward them toward their destination. This enabled arbitrary point-to-point communication. Any processor could send a message to any other processor.

**1-bit processors with hardware masking.** The CM-1 processors were 1-bit wide and operated in true SIMD fashion. A global instruction stream controlled all processors simultaneously. Hardware masking disabled processors that shouldn't participate in an operation—they still executed the instruction, but results were discarded.

**Hidden latency.** The router buffered messages and handled delivery asynchronously. A program could issue a send and continue computing while the router worked.

### What This Machine Has Instead

**TDMA schedule and neighbor links.** No router. Each processor can only talk to its 12 hypercube neighbors, and only during the scheduled phases. There's no buffering, no forwarding, no arbitrary addressing.

**32-bit RISC-V cores running SPMD.** Each processor is a full 32-bit microcontroller executing independently. There's no global instruction stream. Processors run the same program but make independent control flow decisions. "Masking" is just `if` statements.

**Visible latency.** Communication happens when the schedule says it happens. If you miss a phase, you wait for the next superframe. The network timing is part of the programming model.

### How These Differences Shape the Language

**No router → no `get(arbitrary_address)`.**

C* and *Lisp had primitives to read from or write to any processor. This requires routing through intermediate nodes. We can't do that—we have no router. StarC only has neighbor exchange: `nbr(dimension, value)` swaps values with your neighbor in that dimension. Everything else is built on top of that.

**TDMA → explicit `exchange` blocks.**

In C*, you could scatter communication calls throughout your code. The router would handle them whenever. We can't do that—communication only works during the right phase. StarC batches all communication into explicit `exchange` blocks. Inside the block, you declare what exchanges you need. The runtime schedules them optimally within the TDMA superframe.

**SPMD → `where` is just `if`.**

In C*, `where` was a hardware operation that masked processors. Inactive processors still executed but discarded results. In StarC, `where` is syntactic sugar for `if`. Each processor independently decides whether to execute the body. There's no hardware masking—just conditional execution.

### Why No Arbitrary Routing?

Building a router is hard. The CM-1's router was a significant fraction of the machine's complexity and cost. We don't have the budget for custom ASICs.

But here's the thing: most parallel algorithms don't need arbitrary routing.

| Algorithm | Communication Pattern | Needs Routing? |
|-----------|----------------------|----------------|
| Bitonic sort | `pid XOR 2^k` — hypercube neighbor | No |
| Parallel prefix | Tree over dimensions | No |
| Reduction | Tree over dimensions | No |
| Stencils | NEWS neighbors | No |
| FFT | Dimension-ordered exchange | No |
| Matrix multiply | Broadcasts + local compute | No |
| Game of Life | 8 neighbors | No |

Bitonic sort is the canonical example. The inner loop exchanges with `pid XOR j` where j is a power of 2. That's a single-bit difference—always a hypercube neighbor. The algorithm is topology-aware.

Algorithms that genuinely need arbitrary routing—sparse matrix, irregular graph traversal, hash tables—should use a GPU or a machine with a real interconnect. The hypercube excels at structured, topology-aware communication. StarC supports what the hypercube does well.

### Design Principles

These constraints lead to clear design principles:

1. **Data is distributed.** Each processor has its own data. There's no shared memory.

2. **Operations happen everywhere.** When you write `x = x + 1`, all 4,096 processors increment their local `x`.

3. **Communication is batched.** All exchanges go in `exchange` blocks. The runtime schedules them.

4. **The topology is visible.** You know you're on a hypercube. You know what dimensions cost.

5. **Only hypercube-native operations.** Neighbor exchange, tree reductions, broadcasts. No arbitrary permutation.

---

# Part II: The Language

---

## Chapter 3: Data Model

This chapter covers how data is represented in StarC: parallel variables, scalars, and processor identity.

### Parallel Variables

A `pvar<T>` is a **type qualifier** meaning "this value exists once per processor." In generated code, it's just a local variable—there's no distributed shared memory, no magic synchronization. Each of the 4,096 processors has its own independent copy.

```c
pvar<int> x;              // 4,096 integers, one per processor
pvar<float> temperature;  // 4,096 floats
pvar<point_t> position;   // 4,096 structs
```

When you operate on a pvar, all processors execute the operation simultaneously:

```c
x = 42;           // All 4,096 processors store 42
x = pid();        // Each processor stores its own ID (0-4095)
x = x + 1;        // All processors increment their local x
```

**Initial values are undefined.** A freshly declared pvar contains garbage—whatever was in that memory location. Always initialize before use:

```c
pvar<int> x;      // Undefined—could be anything
x = 0;            // Now defined
```

### Scalars

Scalars are ordinary C variables. They have the same value on all processors:

```c
int iterations = 1000;    // Same on all processors
float threshold = 0.001f; // Same on all processors
```

Scalars are used for control flow (loop counters, convergence flags) and constants. They're replicated, not distributed.

**Mixing scalars and pvars:**

```c
pvar<int> x;
int scalar = 100;

x = scalar;          // Every processor stores 100
x = x + scalar;      // Every processor adds 100 to its x
x = x * 2;           // Every processor doubles its x
```

**You cannot assign a pvar to a scalar:**

```c
int scalar = x;      // ERROR: which processor's x?
```

To get a scalar from parallel data, use a reduction:

```c
int total = reduce_sum(x);   // Sum across all processors
int maximum = reduce_max(x); // Maximum across all processors
```

### Processor Identity

Every processor knows who it is:

```c
int pid()              // Hypercube address (0-4095)
int coord(int dim)     // Bit 'dim' of the address (0 or 1)
int grid_row()         // Grid row (0-63)  
int grid_col()         // Grid column (0-63)
```

These are how you write position-dependent code:

```c
pvar<int> x;
x = pid();            // Each processor stores its own ID

if (coord(0) == 1) {
    // Only processors with bit 0 set execute this
    // That's processors 1, 3, 5, 7, ... (odd addresses)
}

// Initialize based on grid position
pvar<int> distance_from_center;
int dr = grid_row() - 32;
int dc = grid_col() - 32;
distance_from_center = dr*dr + dc*dc;
```

### Type Limits

**Maximum pvar size for exchange: 80 bytes.**

This is the payload limit per phase at 1 kHz. If your struct exceeds this, you'll need to split exchanges or use a slower phase rate.

**No pointers in pvars:**

```c
pvar<int*> ptr;       // ERROR: pointers don't make sense
```

A pointer on processor 17 pointing to processor 42's memory is meaningless—there's no shared address space.

**No nested pvars:**

```c
pvar<pvar<int>> x;    // ERROR: doesn't make sense
```

### Struct Padding

When approaching the 80-byte limit, padding matters:

```c
// Bad: padding wastes space
typedef struct {
    char a;       // 1 byte
    int b;        // 4 bytes (3 bytes padding before)
    char c;       // 1 byte (3 bytes padding after)
} padded_t;       // 12 bytes!

// Good: ordered by size
typedef struct {
    int b;        // 4 bytes
    char a;       // 1 byte
    char c;       // 1 byte
} packed_t;       // 6 bytes (2 bytes trailing padding)

// Best: explicit packing
typedef struct __attribute__((packed)) {
    int b;
    char a;
    char c;
} tight_t;        // 6 bytes, no padding
```

Order struct members from largest to smallest, or use `__attribute__((packed))` when you need precise control.

### Arrays of Pvars

Arrays of pvars create multiple values per processor:

```c
pvar<int> buffer[256];    // Each processor has 256 integers
                          // Total: 4,096 × 256 = 1M integers
```

Indexing works as expected:

```c
pvar<int> A[100];
int i = 50;               // Scalar index

A[i] = pid();             // All processors write to their A[50]

pvar<int> j = pid() % 100;  // Parallel index
pvar<int> val = A[j];       // Each processor reads a different element
```

---

## Chapter 4: Control Flow

StarC distinguishes between uniform and divergent control flow. This distinction matters because exchange blocks require all processors to participate together.

### Two-Phase Execution

StarC programs alternate between two phases:

**Compute phase:** Local operations only. Arithmetic, memory access, control flow. No network communication.

```c
data = expensive_math(data);
if (data > threshold) data = threshold;
local_array[i] = data;
```

**Exchange phase:** Network communication. Batched into explicit `exchange` blocks.

```c
exchange {
    neighbor = nbr(0, data);
    total = reduce_sum(data);
}
```

The rhythm is: compute, exchange, compute, exchange. This matches the hardware: the MCU computes, then waits for the TDMA schedule to move data.

### Uniform Control Flow

Uniform control flow means all processors take the same path. The condition is a scalar—same value on all processors.

```c
int threshold = 100;          // Scalar—same everywhere

if (threshold > 50) {         // All processors take this branch
    data = data * 2;          // All processors execute this
}

for (int i = 0; i < 10; i++) { // Scalar loop counter
    // All processors execute this loop 10 times
}
```

Exchange blocks are allowed inside uniform control flow:

```c
for (int iter = 0; iter < 1000; iter++) {  // Scalar bound
    exchange {
        n = news(NORTH, temp);             // All processors participate
    }
    temp = update(temp, n);
}
```

### Divergent Control Flow

Divergent control flow means processors take different paths. The condition is a pvar—different value on each processor.

StarC uses `where` for divergent control flow:

```c
pvar<int> x;

where (x > 100) {             // Some processors execute, others don't
    x = 0;                    // Only where condition is true
}
```

Each processor independently evaluates `x > 100` and decides whether to execute the body.

**`if` vs `where`:**

- `if (scalar_condition)` — uniform, all processors same branch
- `where (pvar_condition)` — divergent, per-processor decision

This distinction is enforced. If you write `if (pvar_condition)`, the preprocessor warns you. Use `where` to signal divergent intent.

**Exchange blocks are NOT allowed inside `where`:**

```c
where (x > 0) {
    exchange {                // ERROR: divergent exchange
        y = nbr(0, x);
    }
}
```

This is illegal because some processors would skip the exchange. The TDMA schedule requires all processors to participate—if half the processors don't transmit during their phase, communication breaks.

**Solution: make data conditional, not exchange:**

```c
pvar<int> to_send = (x > 0) ? x : 0;  // Conditional data
exchange {
    y = nbr(0, to_send);              // All processors participate
}
```

### Nesting

Uniform inside uniform: fine.

```c
for (int i = 0; i < 10; i++) {
    if (i % 2 == 0) {
        // All processors, on even iterations
    }
}
```

Divergent inside divergent: fine.

```c
where (x > 0) {
    where (x > 100) {
        x = 100;              // Only where x > 100
    }
}
```

Divergent inside uniform: fine.

```c
for (int i = 0; i < 10; i++) {
    where (x > i) {
        x = x - 1;            // Per-processor conditional
    }
}
```

Uniform with exchange inside divergent: **not allowed**.

```c
where (x > 0) {
    for (int i = 0; i < 10; i++) {
        exchange { ... }      // ERROR: inside divergent
    }
}
```

### Functions

Functions can take pvar parameters and use `where`:

```c
pvar<float> clamp(pvar<float> x, float lo, float hi) {
    pvar<float> result = x;
    where (x < lo) { result = lo; }
    where (x > hi) { result = hi; }
    return result;
}

pvar<float> data;
data = clamp(data, 0.0f, 1.0f);  // All processors call simultaneously
```

**Rules for functions:**

- All processors call the function together (SPMD)
- `where` inside functions works normally
- No `exchange` blocks inside functions—move them to the caller

The no-exchange rule keeps function semantics simple. A function is pure local computation. Communication happens at the call site.

---

## Chapter 5: Communication

All communication happens inside `exchange` blocks. This chapter covers the exchange block mechanics and each communication primitive.

### Exchange Blocks

An `exchange` block declares what communications are needed. It's not sequential code—it's a **declaration** that the runtime executes optimally.

```c
exchange {
    a = nbr(0, x);
    b = nbr(5, y);
    total = reduce_sum(z);
}
```

**Snapshot semantics:** All input values are captured at block entry. You cannot use the result of one exchange as input to another within the same block.

```c
pvar<int> x = 5;
exchange {
    a = nbr(0, x);    // Captures x=5
    b = nbr(1, x);    // Also captures x=5, not 'a'
}
// Now a and b are valid
```

**Rules:**

1. Communication primitives may ONLY appear inside `exchange` blocks
2. No using results from the same block as inputs
3. No nested `exchange` blocks
4. No `exchange` inside `where` blocks
5. Scalar control flow (loops with scalar bounds) IS allowed

**Scalar loops in exchange blocks:**

```c
exchange {
    for (int d = 0; d < 12; d++) {
        neighbors[d] = nbr(d, data);
    }
}
```

This is allowed because the loop counter is scalar—it's just syntactic sugar for 12 declarations. The rule is: **scalar control flow that can be unrolled at compile time is allowed**.

**Capacity limit:** If declared exchanges exceed one superframe's capacity, the runtime aborts with an error. This is deliberate—automatic splitting would hide costs and make performance unpredictable. If you need more, use multiple exchange blocks.

### Neighbor Exchange: `nbr()`

```c
T nbr(int dim, T value)
```

Exchange `value` with your hypercube neighbor in dimension `dim` (0-11). Returns the neighbor's value.

```c
exchange {
    pvar<int> n0 = nbr(0, data);   // Dimension 0 neighbor
    pvar<int> n5 = nbr(5, data);   // Dimension 5 neighbor
}
```

Your neighbor in dimension `dim` is the processor whose address differs from yours in bit `dim`. If you're processor 0b101010, your dimension-0 neighbor is 0b101011, your dimension-1 neighbor is 0b101000, etc.

**Cost:** 2 phases per dimension (one each direction).

### Grid Neighbors: `news()`

```c
T news(direction_t dir, T value)
```

Exchange with your grid neighbor. Directions: `NORTH`, `EAST`, `SOUTH`, `WEST`.

```c
exchange {
    n = news(NORTH, temp);
    e = news(EAST, temp);
    s = news(SOUTH, temp);
    w = news(WEST, temp);
}
```

`news()` is `nbr()` with automatic dimension selection. The runtime computes which dimension corresponds to each direction based on your grid position and the Gray code mapping.

**Edge behavior:** The grid wraps toroidally. Row 0's NORTH neighbor is row 63. Column 63's EAST neighbor is column 0. Because of Gray code, edge wrapping is still a single-bit change—one hypercube hop.

**Cost:** NORTH and SOUTH use row dimensions (6-11). EAST and WEST use column dimensions (0-5). These don't overlap, so four cardinal directions use **8 phases** (4 dimensions × 2 phases each).

### Diagonal Neighbors

Diagonal neighbors (NE, NW, SE, SW) require two hops: one row dimension and one column dimension. Since exchange blocks can't use results as inputs within the same block, diagonals need **two exchange blocks**:

```c
pvar<int> n, e, s, w;
pvar<int> ne, nw, se, sw;

// First: get cardinal neighbors
exchange {
    n = news(NORTH, cell);
    e = news(EAST, cell);
    s = news(SOUTH, cell);
    w = news(WEST, cell);
}

// Second: get diagonals via cardinals
exchange {
    ne = news(NORTH, e);  // My N neighbor's E = my NE
    nw = news(NORTH, w);  // My N neighbor's W = my NW
    se = news(SOUTH, e);  // My S neighbor's E = my SE
    sw = news(SOUTH, w);  // My S neighbor's W = my SW
}
```

**How this works:** After the first exchange, I have my east neighbor's value in `e`. In the second exchange, `news(NORTH, e)` sends my `e` northward. I receive my north neighbor's `e`—which is their east neighbor's value. My north neighbor's east neighbor is my northeast neighbor.

**Cost:** Two superframes for 8-neighbor stencils.

### Reductions

```c
T reduce_sum(pvar<T> value)
T reduce_min(pvar<T> value)
T reduce_max(pvar<T> value)
T reduce_and(pvar<T> value)
T reduce_or(pvar<T> value)
```

Combine values from all 4,096 processors into a single scalar. Every processor receives the same result.

```c
exchange {
    int total = reduce_sum(local_count);
    int any_active = reduce_or(is_active);
}
// total and any_active are the same on all processors
```

**Implementation:** Tree reduction over 12 dimensions, **dimension 0 first, ascending**. Each step exchanges with the neighbor in that dimension and combines. After 12 steps, everyone has the global result.

This is a multi-hop operation, but the path is fixed: dimension 0, then 1, then 2, ... then 11. It's a structured tree algorithm, not arbitrary routing.

**Floating-point determinism:** The dimension ordering is guaranteed and the toolchain enforces `-fno-fast-math`. Identical inputs always produce identical outputs.

**Cost:** 24 phases (one full superframe).

**Multiple reductions pipeline:** Reductions in the same block share the same 24 phases, processing different data streams in parallel:

```c
exchange {
    sum = reduce_sum(x);    // ┐
    max = reduce_max(y);    // ├─ All share one superframe
    count = reduce_sum(1);  // ┘
}
```

**Conditional participation:** Processors that shouldn't contribute use identity values:

```c
// Sum only positive values
pvar<int> contrib = (x > 0) ? x : 0;  // Non-positive → 0
exchange {
    int sum = reduce_sum(contrib);    // Zeros don't affect sum
}
```

| Operation | Identity Value |
|-----------|----------------|
| sum | 0 |
| min | TYPE_MAX |
| max | TYPE_MIN |
| and | ~0 (all 1s) |
| or | 0 |

### Scans (Prefix Operations)

```c
pvar<T> scan_sum(pvar<T> value)           // Exclusive
pvar<T> scan_min(pvar<T> value)           // Exclusive
pvar<T> scan_max(pvar<T> value)           // Exclusive
pvar<T> scan_sum_inclusive(pvar<T> value) // Inclusive
pvar<T> scan_min_inclusive(pvar<T> value) // Inclusive
pvar<T> scan_max_inclusive(pvar<T> value) // Inclusive
```

Prefix operations across all processors.

**Exclusive scan:** Processor *i* receives combination of processors 0..*i*-1 (excluding self).

**Inclusive scan:** Processor *i* receives combination of processors 0..*i* (including self).

```c
pvar<int> x = 1;  // All processors have 1

exchange {
    pvar<int> excl = scan_sum(x);           // Exclusive
    pvar<int> incl = scan_sum_inclusive(x); // Inclusive
}

// Processor 0: excl=0, incl=1
// Processor 1: excl=1, incl=2
// Processor 2: excl=2, incl=3
// ...
// Processor 4095: excl=4095, incl=4096
```

Scans enable parallel compaction, load balancing, and many classic parallel algorithms.

**Cost:** 24 phases.

### Broadcast

```c
pvar<T> broadcast(int source_pid, T value)
```

Distribute one processor's value to all processors.

```c
pvar<float> result;
if (pid() == 0) {
    result = special_computation();
}
exchange {
    pvar<float> everyone = broadcast(0, result);
}
// All processors now have processor 0's result
```

**Semantics:** Only the source processor's `value` matters. Other processors' values are undefined—don't rely on them.

**Implementation:** Tree distribution over 12 dimensions.

**Cost:** 24 phases.

### Double Buffering

For high MCU utilization, overlap compute with communication:

```c
exchange_async {
    neighbor = nbr(0, data);
}
// MCU computes while FPGA exchanges
next_data = expensive_compute(data);

exchange_wait();  // Block until exchange completes
// Now 'neighbor' is valid
```

**Snapshot semantics:** Values are captured when `exchange_async` begins. Modifying `data` during compute doesn't affect what gets sent—the snapshot was already taken.

**Rules:**

- Cannot read exchange results before `exchange_wait()`
- Cannot start new `exchange_async` before previous `exchange_wait()`
- `exchange { }` is equivalent to `exchange_async { } exchange_wait();`

**Typical pattern:**

```c
// Prime the pipeline
exchange {
    neighbor = nbr(0, data);
}

for (int i = 0; i < 1000; i++) {
    exchange_async {
        neighbor = nbr(0, data);
    }
    
    // Compute using PREVIOUS neighbor (still valid from last iteration)
    next_data = compute(data, neighbor);
    
    exchange_wait();
    data = next_data;
}
```

---

## Chapter 6: Host I/O

Host communication uses the control tree, not the hypercube. This chapter covers loading data, storing results, and debugging output.

### Bulk Data Transfer

```c
void load_from_host(pvar<T> *dest, size_t count)
void store_to_host(pvar<T> *src, size_t count)
```

Load distributes data from the host to all processors. Store collects data from all processors to the host.

```c
pvar<float> input;
load_from_host(&input, 1);   // Each processor gets one float

// ... compute ...

pvar<float> result;
store_to_host(&result, 1);   // Each processor sends one float
```

Data flows through the control tree: Host → Machine Controller → Plane Controllers → Slice Controllers → Nodes (and reverse for store).

**No 80-byte limit.** The control tree is a separate network with different constraints. Large transfers are fine:

```c
pvar<float> big_array[1000];
load_from_host(big_array, 1000);  // 4KB per processor—no problem
```

**Latency:** Variable, depending on tree traversal and data size. Much slower than hypercube exchange for small data, but higher total bandwidth for bulk transfers.

### Console Output

```c
void host_printf(const char *fmt, ...)
```

Print to the host console. Only processor 0 should call this—other processors' output is discarded.

```c
if (pid() == 0) {
    host_printf("Starting computation\n");
}

// ... compute and exchange ...

if (pid() == 0) {
    int max = ...;  // result from reduction
    host_printf("Maximum value: %d\n", max);
}
```

### LED Control

```c
void led_set(uint8_t brightness)   // 0 = off, 255 = full
uint8_t led_get(void)              // Read current value
```

Set this processor's LED brightness. Updates flow through the control tree to the LED drivers.

```c
// Visualize temperature
led_set((uint8_t)(temperature * 255.0f));

// Binary visualization
led_set(active ? 255 : 0);
```

LED operations are local—no `exchange` block needed. All 4,096 processors can set their LEDs simultaneously.

The LED array is a debugging primitive. When something goes wrong, the pattern tells you which processors are affected, which dimensions failed, where data is stuck.

---

# Part III: Programming

---

## Chapter 7: Patterns

This chapter shows complete programs for common parallel algorithms, demonstrating how to use StarC effectively.

### 4-Neighbor Stencil: Heat Equation

The heat equation is the simplest stencil: each cell updates based on its four cardinal neighbors.

```c
pvar<float> temp;
pvar<float> n, s, e, w;
float alpha = 0.25f;

load_from_host(&temp, 1);

for (int iter = 0; iter < 1000; iter++) {
    exchange {
        n = news(NORTH, temp);
        s = news(SOUTH, temp);
        e = news(EAST, temp);
        w = news(WEST, temp);
    }
    
    temp = temp + alpha * (n + s + e + w - 4.0f * temp);
    led_set((uint8_t)(temp * 255.0f));
}

store_to_host(&temp, 1);
```

**Cost per iteration:** 8 phases exchange + compute ≈ 10 ms → ~100 iterations/second.

### 8-Neighbor Stencil: Game of Life

Game of Life needs all 8 neighbors, including diagonals. This requires two exchange blocks.

```c
pvar<int> cell = 0;
load_from_host(&cell, 1);

for (int gen = 0; gen < 10000; gen++) {
    pvar<int> n, e, s, w;
    pvar<int> ne, nw, se, sw;
    
    // Exchange 1: cardinal neighbors
    exchange {
        n = news(NORTH, cell);
        e = news(EAST, cell);
        s = news(SOUTH, cell);
        w = news(WEST, cell);
    }
    
    // Exchange 2: diagonal neighbors
    exchange {
        ne = news(NORTH, e);
        nw = news(NORTH, w);
        se = news(SOUTH, e);
        sw = news(SOUTH, w);
    }
    
    // Apply rules
    pvar<int> neighbors = n + e + s + w + ne + nw + se + sw;
    pvar<int> new_cell = cell;
    
    where (cell == 1 && (neighbors < 2 || neighbors > 3)) {
        new_cell = 0;  // Death: underpopulation or overpopulation
    }
    where (cell == 0 && neighbors == 3) {
        new_cell = 1;  // Birth: exactly 3 neighbors
    }
    
    cell = new_cell;
    led_set(cell * 255);
}
```

**Cost per generation:** ~48 ms (two superframes) → ~20 generations/second.

### Sorting: Bitonic Sort

Bitonic sort on a hypercube is beautiful: every compare-exchange is a neighbor exchange.

```c
pvar<int> key;
load_from_host(&key, 1);

for (int k = 2; k <= 4096; k *= 2) {
    for (int j = k / 2; j > 0; j /= 2) {
        int dim = __builtin_ctz(j);  // log2(j) — which dimension
        
        pvar<int> partner_key;
        exchange {
            partner_key = nbr(dim, key);
        }
        
        // Determine sort direction for this processor
        int ascending = ((pid() & k) == 0);
        int swap = (ascending && key > partner_key) || 
                   (!ascending && key < partner_key);
        
        where (swap) {
            key = partner_key;
        }
    }
}

store_to_host(&key, 1);
```

**Why it works:** `j` is always a power of 2, so `pid XOR j` differs in exactly one bit—dimension `log2(j)`. Every compare-exchange is with a hypercube neighbor. No routing needed.

**Cost:** O(log²N) compare-exchanges. For N=4096: 78 exchanges × 2 ms each ≈ 156 ms total.

### Global Statistics

Compute multiple statistics in one superframe using pipelined reductions:

```c
pvar<float> value = compute_something();

float sum, min, max;
int count;

exchange {
    sum = reduce_sum(value);
    min = reduce_min(value);
    max = reduce_max(value);
    count = reduce_sum(1);
}
// All four reductions share one superframe

if (pid() == 0) {
    float avg = sum / count;
    host_printf("Sum=%f Min=%f Max=%f Avg=%f\n", sum, min, max, avg);
}
```

### Parallel Prefix: Compaction Addresses

Use exclusive scan to compute destination addresses for compaction:

```c
pvar<int> data;
load_from_host(&data, 1);

// Mark elements to keep
pvar<int> keep = (data != 0) ? 1 : 0;

// Compute destination addresses
pvar<int> dest;
exchange {
    dest = scan_sum(keep);  // Exclusive prefix sum
}

// Processor i with keep=1 should go to position dest
// Processor 0: if keep=1, dest=0
// First keeper after gap: dest = count of previous keepers
```

The scan gives each element its destination address. Actual data movement would require routing (which we don't have), but the addresses enable many algorithms.

### Double-Buffered Stencil

Overlap compute and communication for better MCU utilization:

```c
pvar<float> temp;
pvar<float> n, s, e, w;

load_from_host(&temp, 1);

// Prime: get initial neighbors
exchange {
    n = news(NORTH, temp);
    s = news(SOUTH, temp);
    e = news(EAST, temp);
    w = news(WEST, temp);
}

for (int iter = 0; iter < 1000; iter++) {
    // Start next exchange asynchronously
    exchange_async {
        n = news(NORTH, temp);
        s = news(SOUTH, temp);
        e = news(EAST, temp);
        w = news(WEST, temp);
    }
    
    // Compute using PREVIOUS neighbors (snapshot from before async)
    pvar<float> new_temp = temp + 0.25f * (n + s + e + w - 4.0f * temp);
    
    // Wait for exchange to complete
    exchange_wait();
    
    temp = new_temp;
}

store_to_host(&temp, 1);
```

While the FPGA executes the current exchange, the MCU computes the next iteration. Utilization approaches 100% when compute time matches exchange time.

### LFSR Scrolling Columns

This example demonstrates **embarrassingly parallel computation**: 4,096 independent pseudo-random bit streams with zero communication. Each processor maintains a local scroll buffer fed by a replicated global LFSR state.

```c
// Global state: 4 Galois LFSRs (replicated on all processors)
uint64_t lfsr[4] = {
    0xACE1BEEFCAFEDEADU,
    0x123456789ABCDEF0U,
    0xFEDCBA9876543210U,
    0xDEADBEEFBADC0FFEU
};

// Per-processor state
pvar<uint16_t> scroll_buffer;  // 16-bit horizontal scroll
pvar<uint8_t> lfsr_idx;        // Which LFSR (0-3)
pvar<uint8_t> bit_pos;         // Which bit (0-63)
pvar<uint8_t> direction;       // Scroll direction (0=right, 1=left)

// Initialization: assign unique LFSR bits to each processor
void init_lfsr() {
    // Simple assignment: distribute 256 LFSR bits across 4096 processors
    // Multiple processors may share the same bit (creates visual patterns)
    int my_pid = pid();
    int segment = my_pid % 256;  // 256 unique assignments

    lfsr_idx = segment / 64;
    bit_pos = segment % 64;
    direction = (my_pid & 1);  // Alternate directions based on PID
    scroll_buffer = 0;
}

// Animation loop
init_lfsr();

for (int frame = 0; frame < 10000; frame++) {
    // Step 1: Advance all 4 LFSRs (scalar - same on all processors)
    for (int i = 0; i < 4; i++) {
        uint64_t lsb = lfsr[i] & 1;
        lfsr[i] >>= 1;
        if (lsb) lfsr[i] ^= 0xD800000000000000ULL;  // Taps at 63,62,60,59
    }

    // Step 2: Each processor extracts its assigned bit (parallel - no exchange!)
    pvar<int> new_bit = (lfsr[lfsr_idx] >> bit_pos) & 1;

    // Step 3: Shift bit into local scroll buffer
    where (direction == 0) {
        scroll_buffer = (scroll_buffer >> 1) | (new_bit << 15);  // Scroll right
    }
    where (direction == 1) {
        scroll_buffer = (scroll_buffer << 1) | new_bit;           // Scroll left
    }

    // Step 4: Display the middle bit of the scroll buffer
    pvar<int> display_bit = (scroll_buffer >> 8) & 1;
    led_set(display_bit ? 255 : 0);

    // No exchange needed - every processor operates independently!
}
```

**Why this works:**

- **LFSR state is replicated:** All 4,096 processors compute the same 4 LFSR values each frame
- **Extraction is parallel:** Each processor reads its assigned bit from its assigned LFSR
- **Scroll buffers are local:** 4,096 independent 16-bit shift registers
- **Zero communication:** No `exchange` blocks anywhere in the main loop

**Visual effect:** The 64×64 LED array shows horizontal strips of pseudo-random bits scrolling in alternating directions. The LFSR polynomial (taps at bits 63, 62, 60, 59) gives maximum period: 2^64 - 1 cycles before repeating.

**Cost per frame:** ~100 µs compute only (no network phases). Frame rate limited only by LED refresh, not communication. At 1 kHz phase clock, this runs **240× faster** than algorithms requiring full superframe exchanges.

**Enhancement with communication:**

Add neighbor blending for smoother visual transitions:

```c
// After extracting the bit, blend with neighbors
pvar<int> display_bit = (scroll_buffer >> 8) & 1;

pvar<int> n, e, s, w;
exchange {
    n = news(NORTH, display_bit);
    e = news(EAST, display_bit);
    s = news(SOUTH, display_bit);
    w = news(WEST, display_bit);
}

// Average with neighbors
pvar<int> blended = (display_bit * 2 + n + e + s + w) / 6;
led_set(blended * 255 / 6);
```

This adds spatial correlation while maintaining independent LFSR streams.

**Why Galois LFSR?** The right-shift form (`lfsr >>= 1`) is more efficient than Fibonacci LFSR because the XOR feedback only happens on half the cycles (when `lsb == 1`). The polynomial `0xD800000000000000` is maximal-length, ensuring all 2^64-1 non-zero states appear exactly once before cycling.

---

## Chapter 8: Performance

This chapter explains the cost model and how to reason about performance.

### Timing Model

At 1 kHz phase clock:

| Unit | Duration |
|------|----------|
| Phase | 1 ms |
| Superframe (24 phases) | 24 ms |

**Operation costs:**

| Operation | Phases | Time |
|-----------|--------|------|
| `nbr()` — one dimension | 2 | 2 ms |
| `nbr()` — all 12 dimensions | 24 | 24 ms |
| `news()` — 4 cardinal directions | 8 | 8 ms |
| `reduce_*()` — one or more | 24 | 24 ms |
| `scan_*()` | 24 | 24 ms |
| `broadcast()` | 24 | 24 ms |

### Exchange Scheduling

The runtime schedules exchanges to minimize superframe usage.

**What fits in one superframe:**

- Up to 12 `nbr()` calls on **different** dimensions
- AND/OR multiple pipelined reductions
- AND/OR one scan
- AND/OR one broadcast

**What exceeds capacity (runtime error):**

- More than ~160 bytes total on a single dimension
- Scan + reduction in same block (both need the full tree)
- Too many exchanges overall

**Examples:**

```c
// OK: 12 different dimensions
exchange {
    for (int d = 0; d < 12; d++) {
        neighbors[d] = nbr(d, data);
    }
}

// OK: multiple reductions (pipelined)
exchange {
    sum = reduce_sum(x);
    max = reduce_max(x);
    min = reduce_min(x);
}

// ERROR: reduction + scan both need full tree
exchange {
    total = reduce_sum(x);
    prefix = scan_sum(y);   // Can't share with reduction
}

// OK: separate blocks
exchange { total = reduce_sum(x); }
exchange { prefix = scan_sum(y); }
```

### Automatic Reordering

The runtime reorders `nbr()` calls by dimension for optimal phase usage:

```c
exchange {
    d11 = nbr(11, x);  // Declared first
    d0 = nbr(0, y);    // Declared second  
    d5 = nbr(5, z);    // Declared third
}
// Executes: d0 (phases 0-1), d5 (phases 10-11), d11 (phases 22-23)
```

You don't need to think about phase ordering—just declare what you need.

### Bandwidth

| Path | Payload | Bandwidth |
|------|---------|-----------|
| Hypercube (per dimension) | 80 B / 2 ms | 40 KB/s |
| Hypercube (all dimensions) | 960 B / 24 ms | 40 KB/s |
| Control tree (bulk) | Unlimited | ~1 MB/s |

The hypercube is latency-optimized: small payloads, fast phases, deterministic timing. Use it for algorithm communication.

The control tree is bandwidth-optimized: large transfers, variable latency. Use it for bulk I/O.

### MCU Utilization

**Without double buffering:**

During an exchange, the MCU waits. At 133 MHz, a 24 ms superframe wastes 3.2 million cycles.

**With double buffering:**

The MCU computes iteration N+1 while the FPGA exchanges iteration N. Utilization depends on the ratio:

- If compute > exchange: MCU-bound, utilization ≈ 100%
- If compute < exchange: exchange-bound, utilization ≈ compute/exchange
- If compute ≈ exchange: optimal overlap, utilization ≈ 100%

### Phase Rate Trade-offs

The phase rate is configurable:

| Rate | Superframe | Payload/Phase | Use Case |
|------|------------|---------------|----------|
| 100 Hz | 240 ms | 800 bytes | Debug, huge payloads |
| 1 kHz | 24 ms | 80 bytes | Default, balanced |
| 10 kHz | 2.4 ms | 8 bytes | Low latency, small data |

Slower rates give more payload per phase. Faster rates give lower latency but smaller payloads.

### Iteration Rates

Typical workloads at 1 kHz:

| Workload | Exchange Time | Iter/Sec |
|----------|---------------|----------|
| 4-neighbor stencil | ~8 ms | ~100 |
| 8-neighbor stencil | ~48 ms | ~20 |
| Stencil + reduction | ~32 ms | ~30 |
| Single bitonic step | ~2 ms | ~500 |


## Chapter 9: Worked Examples

### Dimension Walk
Pure hypercube. Uses `coord(dim)`, `nbr()` across all 12 dimensions.

### Bitonic Sort  
The canonical hypercube algorithm. `nbr(log₂(j), key)`. Proves topology = algorithm.

### Heat Equation
Stencil + convergence. `news()` for neighbors, `reduce_max()` for termination. Shows conditional participation with identity values.

### Global Statistics
Pipelined reductions. Multiple `reduce_*` in one exchange block. Shows they share the superframe.

### Parallel Prefix (Exclusive and Inclusive)
`scan_sum()` and `scan_sum_inclusive()`. Shows the difference.

### Stream Compaction
Application of prefix sum. `scan_sum()` → destination addresses.

### NEWS Blur
4-neighbor stencil. Clean `news()` usage.

<div class="collapsible">
```c
// 2D Gaussian blur using NEWS communication
// Each pixel averages with its 4 neighbors

void main() {
  pvar<int> x = pid() % 64;
  pvar<int> y = pid() / 64;

  // Initialize with a simple pattern
  pvar<int> value = 0;
  where (x > 20 && x < 44 && y > 20 && y < 44) {
    value = 255;
  }

  // Declare neighbor variables outside the loop
  pvar<int> north;
  pvar<int> south;
  pvar<int> east;
  pvar<int> west;

  for (;;) {
    // All communication must happen in an exchange block
    exchange {
      north = news(NORTH, value);
      south = news(SOUTH, value);
      east = news(EAST, value);
      west = news(WEST, value);
    }

    // 5-point stencil: average with 4 neighbors
    pvar<int> sum = value * 2 + north + south + east + west;
    value = sum / 6;

    led_set(value);

    barrier();
  }
}

```
</div>

### Conway's Game of Life
8-neighbor stencil. Two exchange blocks for diagonals.

<div class="collapsible">
```c
// Conway's Game of Life using NEWS communication
// Classic cellular automaton with multiple patterns

void main() {
  pvar<int> x = pid() % 64;
  pvar<int> y = pid() / 64;

  pvar<int> alive = 0;

  // Acorn pattern at (10, 10)
  where ((x == 11 && y == 10) ||
         (x == 13 && y == 11) ||
         (x == 10 && y == 12) || (x == 11 && y == 12) ||
         (x == 14 && y == 12) || (x == 15 && y == 12) || (x == 16 && y == 12)) {
    alive = 1;
  }

  // R-pentomino at (40, 20)
  where ((x == 41 && y == 20) || (x == 42 && y == 20) ||
         (x == 40 && y == 21) || (x == 41 && y == 21) ||
         (x == 41 && y == 22)) {
    alive = 1;
  }

  // Glider at (50, 50)
  where ((x == 50 && y == 50) ||
         (x == 51 && y == 51) ||
         (x == 49 && y == 52) || (x == 50 && y == 52) || (x == 51 && y == 52)) {
    alive = 1;
  }

  // Lightweight spaceship (LWSS) at (5, 40)
  where ((x == 6 && y == 40) || (x == 7 && y == 40) || (x == 8 && y == 40) || (x == 9 && y == 40) ||
         (x == 5 && y == 41) || (x == 10 && y == 41) ||
         (x == 10 && y == 42) ||
         (x == 5 && y == 43) || (x == 9 && y == 43)) {
    alive = 1;
  }

  // Pulsar (oscillator) at (30, 35) - period 3
  where ((x == 28 && y == 29) || (x == 29 && y == 29) || (x == 30 && y == 29) ||
         (x == 34 && y == 29) || (x == 35 && y == 29) || (x == 36 && y == 29)) {
    alive = 1;
  }
  where ((x == 26 && y == 31) || (x == 31 && y == 31) || (x == 33 && y == 31) || (x == 38 && y == 31)) {
    alive = 1;
  }
  where ((x == 26 && y == 32) || (x == 31 && y == 32) || (x == 33 && y == 32) || (x == 38 && y == 32)) {
    alive = 1;
  }
  where ((x == 26 && y == 33) || (x == 31 && y == 33) || (x == 33 && y == 33) || (x == 38 && y == 33)) {
    alive = 1;
  }
  where ((x == 28 && y == 34) || (x == 29 && y == 34) || (x == 30 && y == 34) ||
         (x == 34 && y == 34) || (x == 35 && y == 34) || (x == 36 && y == 34)) {
    alive = 1;
  }
  where ((x == 28 && y == 39) || (x == 29 && y == 39) || (x == 30 && y == 39) ||
         (x == 34 && y == 39) || (x == 35 && y == 39) || (x == 36 && y == 39)) {
    alive = 1;
  }
  where ((x == 26 && y == 40) || (x == 31 && y == 40) || (x == 33 && y == 40) || (x == 38 && y == 40)) {
    alive = 1;
  }
  where ((x == 26 && y == 41) || (x == 31 && y == 41) || (x == 33 && y == 41) || (x == 38 && y == 41)) {
    alive = 1;
  }
  where ((x == 26 && y == 42) || (x == 31 && y == 42) || (x == 33 && y == 42) || (x == 38 && y == 42)) {
    alive = 1;
  }
  where ((x == 28 && y == 44) || (x == 29 && y == 44) || (x == 30 && y == 44) ||
         (x == 34 && y == 44) || (x == 35 && y == 44) || (x == 36 && y == 44)) {
    alive = 1;
  }

  // Declare neighbor variables outside the loop
  pvar<int> n;
  pvar<int> s;
  pvar<int> e;
  pvar<int> w;
  pvar<int> ne;
  pvar<int> nw;
  pvar<int> se;
  pvar<int> sw;

  for (;;) {

    // Exchange 1: Get cardinal neighbors
    exchange {
      n = news(NORTH, alive);
      s = news(SOUTH, alive);
      e = news(EAST, alive);
      w = news(WEST, alive);
    }

    // Exchange 2: Get diagonal neighbors via cardinals
    // My north neighbor's east = my northeast
    exchange {
      ne = news(NORTH, e);
      nw = news(NORTH, w);
      se = news(SOUTH, e);
      sw = news(SOUTH, w);
    }

    pvar<int> neighbors = n + s + e + w + ne + nw + se + sw;

    // Conway's rules (optimized):
    // Live cell: survives if 2-3 neighbors
    // Dead cell: born if exactly 3 neighbors
    pvar<int> survive = (alive == 1) && (neighbors == 2 || neighbors == 3);
    pvar<int> born = (alive == 0) && (neighbors == 3);
    alive = survive || born;

    // Display: compute LED value directly (faster than where blocks)
    pvar<int> brightness = alive * 255;
    led_set(brightness);

    barrier();
  }
}

```
</div>

### Double-Buffered Stencil
`exchange_async` / `exchange_wait`. MCU utilization.

### Random and Pleasing
Embarrassingly parallel. Scalar LFSR state. Zero communication.

<div class="collapsible">
```c
// LFSR Scrolling Columns - Embarrassingly Parallel!
// 64 rows × 4 columns = 256 independent 16-pixel-wide windows
// Each window displays a 16-bit LFSR scroll buffer, scrolling left/right

void main() {
  // Global state: 8 simple 32-bit Galois LFSRs
  // Polynomial: x^32 + x^31 + x^29 + x^1 + 1 (primitive)
  // Taps: bits 31, 29, 1 → mask 0xA0000002
  int lfsr0 = 0xACE1BEEF;
  int lfsr1 = 0xCAFEDEAD;
  int lfsr2 = 0x12345678;
  int lfsr3 = 0x9ABCDEF0;
  int lfsr4 = 0xFEDCBA98;
  int lfsr5 = 0x76543210;
  int lfsr6 = 0xDEADBEEF;
  int lfsr7 = 0xBADC0FFE;

  // Calculate which segment (window) this processor belongs to
  pvar<int> x = pid() % 64;
  pvar<int> y = pid() / 64;
  pvar<int> col = x / 16;        // Which column (0-3)
  pvar<int> pixel_in_col = x % 16;  // Which pixel within the 16-pixel window

  // Each row-column pair is one segment with its own scroll buffer
  // Segment ID: row * 4 + col (256 total segments)
  pvar<int> segment_id = y * 4 + col;

  // Pseudo-random but unique LFSR bit assignment
  // 8 LFSRs × 32 bits = 256 unique bits (perfect!)
  pvar<int> permuted = (segment_id * 131 + 73) & 0xFF;  // Linear congruential permutation

  pvar<int> my_lfsr_idx = permuted / 32;   // Which LFSR (0-7)
  pvar<int> my_bit_pos = permuted % 32;    // Which bit (0-31)

  // Pseudo-random direction per segment (use different permutation)
  pvar<int> dir_hash = (segment_id * 179 + 41);
  pvar<int> my_direction = (dir_hash >> 3) & 1;  // Extract bit 3 for randomness

  // Each segment has its own 16-bit scroll buffer
  pvar<int> scroll_buffer = 0;

  for (;;) {
    // Step 1: Advance all 8 LFSRs (scalar - same on all processors)
    // 32-bit Galois LFSR: x^32 + x^31 + x^29 + x^1 + 1
    // Taps at bits 31, 29, 1 → XOR mask = 0xA0000002
    // Use negation trick for branch-free conditional: (-lsb) & mask

    // LFSR 0
    int lsb = lfsr0 & 1;
    lfsr0 = (lfsr0 >> 1) ^ ((-lsb) & 0xA0000002);

    // LFSR 1
    lsb = lfsr1 & 1;
    lfsr1 = (lfsr1 >> 1) ^ ((-lsb) & 0xA0000002);

    // LFSR 2
    lsb = lfsr2 & 1;
    lfsr2 = (lfsr2 >> 1) ^ ((-lsb) & 0xA0000002);

    // LFSR 3
    lsb = lfsr3 & 1;
    lfsr3 = (lfsr3 >> 1) ^ ((-lsb) & 0xA0000002);

    // LFSR 4
    lsb = lfsr4 & 1;
    lfsr4 = (lfsr4 >> 1) ^ ((-lsb) & 0xA0000002);

    // LFSR 5
    lsb = lfsr5 & 1;
    lfsr5 = (lfsr5 >> 1) ^ ((-lsb) & 0xA0000002);

    // LFSR 6
    lsb = lfsr6 & 1;
    lfsr6 = (lfsr6 >> 1) ^ ((-lsb) & 0xA0000002);

    // LFSR 7
    lsb = lfsr7 & 1;
    lfsr7 = (lfsr7 >> 1) ^ ((-lsb) & 0xA0000002);

    // Step 2: Each segment extracts its assigned bit from its assigned LFSR
    pvar<int> new_bit = 0;
    where (my_lfsr_idx == 0) {
      new_bit = (lfsr0 >> my_bit_pos) & 1;
    }
    where (my_lfsr_idx == 1) {
      new_bit = (lfsr1 >> my_bit_pos) & 1;
    }
    where (my_lfsr_idx == 2) {
      new_bit = (lfsr2 >> my_bit_pos) & 1;
    }
    where (my_lfsr_idx == 3) {
      new_bit = (lfsr3 >> my_bit_pos) & 1;
    }
    where (my_lfsr_idx == 4) {
      new_bit = (lfsr4 >> my_bit_pos) & 1;
    }
    where (my_lfsr_idx == 5) {
      new_bit = (lfsr5 >> my_bit_pos) & 1;
    }
    where (my_lfsr_idx == 6) {
      new_bit = (lfsr6 >> my_bit_pos) & 1;
    }
    where (my_lfsr_idx == 7) {
      new_bit = (lfsr7 >> my_bit_pos) & 1;
    }

    // Step 3: Shift bit into segment's 16-bit scroll buffer
    where (my_direction == 0) {
      scroll_buffer = (scroll_buffer >> 1) | (new_bit << 15);  // Scroll right
    }
    where (my_direction == 1) {
      scroll_buffer = (scroll_buffer << 1) | new_bit;          // Scroll left
    }

    // Step 4: Each processor displays its assigned bit from the scroll buffer
    pvar<int> display_bit = (scroll_buffer >> pixel_in_col) & 1;
    led_set(display_bit * 255);

    barrier();
  }
}

```
</div>

---

# Part IV: Implementation

---

## Chapter 10: Toolchain

This chapter describes how StarC source code becomes executable firmware.

### Build Pipeline

```
algorithm.starc
      ↓
  starc_pp.py (Python preprocessor)
      ↓
algorithm.c (plain C with runtime calls)
      ↓
  gcc / riscv-gcc
      ↓
algorithm.elf (executable)
```

StarC is not a compiler. It's a preprocessor that rewrites StarC syntax into C, then a standard C compiler produces the binary.

### Preprocessor Transformations

The preprocessor tokenizes the source (not regex—proper tokenization) and rewrites StarC constructs:

| StarC | Generated C |
|-------|-------------|
| `pvar<T> x;` | `T x;` |
| `where (c) { }` | `if (c) { }` |
| `if (c) { }` | `if (c) { }` (validated: c must be scalar) |
| `exchange { ... }` | `star_ex_begin(); ... star_ex_execute();` |
| `exchange_async { ... }` | `star_ex_begin(); ... star_ex_start();` |
| `exchange_wait()` | `star_ex_wait();` |
| `nbr(d, v)` | `star_ex_nbr(d, &r, &v, sizeof(v))` |
| `reduce_sum(v)` | `star_ex_reduce(SUM, &r, &v, sizeof(v))` |
| `scan_sum(v)` | `star_ex_scan(SUM, EXCL, &r, &v, sizeof(v))` |
| `news(NORTH, v)` | `star_ex_news(NORTH, &r, &v, sizeof(v))` |
| `pid()` | `star_pid()` |
| `grid_row()` | `star_grid_row()` |
| `grid_col()` | `star_grid_col()` |

### Preprocessor Diagnostics

The preprocessor validates StarC rules and emits warnings/errors:

- **Warning:** `if` condition appears to involve a pvar (should use `where`)
- **Error:** `exchange` block inside `where` block
- **Error:** Exchange result used as input within same block
- **Error:** Nested `exchange` blocks
- **Error:** Communication primitive outside `exchange` block

### Compiler Settings

The toolchain enforces specific compiler settings:

- `-fno-fast-math` — guarantees floating-point reproducibility in reductions/scans
- Standard optimization flags as appropriate for the target

### Backends

**Simulator backend:**

Compiles to run on desktop with N virtual processors (configurable, typically 16 or 64 for testing). Used for debugging and algorithm development.

```bash
./starc_pp.py src/algorithm.starc -o build/algorithm.c
gcc -DSTAR_SIM -Ilibstar build/algorithm.c libstar/sim_backend.c -o build/sim
./build/sim
```

**Hardware backend:**

Compiles for actual RISC-V nodes. Links against TDMA runtime.

```bash
./starc_pp.py src/algorithm.starc -o build/algorithm.c
riscv-gcc -DSTAR_HW -Ilibstar build/algorithm.c libstar/hw_backend.c -o build/firmware.elf
```

---

## Chapter 11: Runtime

This chapter describes the runtime library and hardware interface.

### Exchange Block Compilation

The preprocessor transforms an exchange block into runtime calls:

```c
exchange {
    a = nbr(0, x);
    b = nbr(5, y);
    total = reduce_sum(z);
}
```

Becomes:

```c
{
    star_ex_t __ex;
    star_ex_begin(&__ex);
    
    star_ex_nbr(&__ex, 0, &a, &x, sizeof(x));
    star_ex_nbr(&__ex, 5, &b, &y, sizeof(y));
    star_ex_reduce(&__ex, STAR_SUM, &total, &z, sizeof(z));
    
    star_ex_execute(&__ex);  // Blocks until complete
}
```

The `star_ex_t` structure collects exchange declarations. `star_ex_execute()` validates capacity, schedules phases, and executes.

### FPGA Interface

The MCU communicates with the FPGA via memory-mapped registers:

| Address | Register | Description |
|---------|----------|-------------|
| 0x4000_0000 | PHASE_COUNTER | Current phase (0-23) |
| 0x4000_0004 | PHASE_CONFIG | Phase clock divider |
| 0x4000_0008 | TX_DATA | Transmit FIFO |
| 0x4000_000C | RX_DATA | Receive FIFO |
| 0x4000_0010 | TX_STATUS | TX FIFO status |
| 0x4000_0014 | RX_STATUS | RX FIFO status |
| 0x4000_0018 | DIM_SELECT | Current dimension (pin mux) |
| 0x4000_001C | FRAME_COUNT | Superframes since reset |
| 0x4000_0020 | ERROR_COUNT | CRC errors per dimension |

### Phase Rate Configuration

```c
void star_set_phase_rate(int hz);
```

Sets the FPGA's phase clock divider. Valid values: 100, 1000, 10000.

| Rate | Superframe | Payload |
|------|------------|---------|
| 100 Hz | 240 ms | 800 B |
| 1 kHz | 24 ms | 80 B |
| 10 kHz | 2.4 ms | 8 B |

### Error Handling

**CRC errors:**

Each received frame is CRC-checked. On failure:
1. Error counter for that dimension increments
2. Payload is zeroed
3. Execution continues

Query errors:
```c
int star_crc_errors(int dim);  // Errors on dimension dim
void star_clear_errors(void);  // Reset all counters
```

**Capacity exceeded:**

If an exchange block declares more than fits in one superframe, the runtime aborts with an error message. This is deliberate—automatic splitting would hide costs.

**Desynchronization:**

If the TDMA clock drifts or a processor crashes, the watchdog timer triggers a hardware reset. There is no automatic recovery.

---

# Appendices

---

## Appendix A: Quick Reference

### Types and Identity

```c
pvar<T>              // Parallel variable (one per processor)
int pid()            // Processor ID (0-4095)
int coord(int dim)   // Bit 'dim' of address (0 or 1)
int grid_row()       // Grid row (0-63)
int grid_col()       // Grid column (0-63)
```

### Communication (exchange blocks only)

```c
// Neighbor exchange
T nbr(int dim, T val)              // Hypercube neighbor
T news(dir, T val)                 // Grid neighbor (N/E/S/W)

// Reductions → scalar
T reduce_sum(pvar<T>)
T reduce_min(pvar<T>)
T reduce_max(pvar<T>)
T reduce_and(pvar<T>)
T reduce_or(pvar<T>)

// Scans → pvar
pvar<T> scan_sum(pvar<T>)              // Exclusive
pvar<T> scan_min(pvar<T>)              // Exclusive
pvar<T> scan_max(pvar<T>)              // Exclusive
pvar<T> scan_sum_inclusive(pvar<T>)    // Inclusive
pvar<T> scan_min_inclusive(pvar<T>)    // Inclusive
pvar<T> scan_max_inclusive(pvar<T>)    // Inclusive

// Broadcast
pvar<T> broadcast(int source, T val)
```

### Control

```c
if (scalar_cond) { }     // Uniform (all same branch)
where (pvar_cond) { }    // Divergent (per-processor)
exchange { }             // Synchronous communication
exchange_async { }       // Asynchronous communication
exchange_wait()          // Wait for async
barrier()                // Global sync (rarely needed)
```

### I/O (control tree)

```c
void led_set(uint8_t brightness)
uint8_t led_get(void)
void load_from_host(pvar<T>*, size_t)
void store_to_host(pvar<T>*, size_t)
void host_printf(const char*, ...)
```

### Configuration

```c
void star_set_phase_rate(int hz)   // 100, 1000, or 10000
int star_crc_errors(int dim)
void star_clear_errors(void)
```

---

## Appendix B: What StarC Doesn't Have

**No `get(address)` or `send(address, value)`.**

Arbitrary point-to-point communication would require routing through intermediate nodes. We have no router—only neighbor links and a TDMA schedule. Algorithms requiring arbitrary permutation should use a GPU or other architecture.

**No virtual processors.**

The CM-1 could simulate more processors than physically existed. StarC has exactly 4,096 processors. Problem size must be 4,096 or adapted to fit.

**No variable payload sizes.**

80 bytes per phase at 1 kHz. Pack your structs accordingly, or use a slower phase rate for larger payloads.

**No automatic multi-superframe splitting.**

If your exchange block exceeds capacity, you get a runtime error. This is deliberate—hidden costs make performance unpredictable. Split your blocks explicitly.

**No automatic error recovery.**

CRC failures zero the payload and increment a counter. Desynchronization triggers hardware reset. The machine does not attempt to recover from errors automatically.

---

## Appendix C: Constants

```c
#define STAR_PROCESSORS      4096
#define STAR_DIMENSIONS      12
#define STAR_GRID_SIZE       64
#define STAR_MAX_PAYLOAD     80    // bytes, at 1 kHz
#define STAR_SUPERFRAME_MS   24    // at 1 kHz
#define STAR_PHASES          24
```

---

## Appendix D: Reduction and Scan Order

All tree operations proceed **dimension 0 first, ascending to dimension 11**.

**Reduction sequence:**

1. Exchange with dimension 0 neighbor, combine
2. Exchange with dimension 1 neighbor, combine
3. Exchange with dimension 2 neighbor, combine
4. ...
5. Exchange with dimension 11 neighbor, combine
6. All processors have global result

**Floating-point guarantee:**

This ordering is fixed and guaranteed. Combined with the toolchain's `-fno-fast-math` enforcement, identical inputs always produce bit-identical outputs. Reproducibility is not optional.

---

## Colophon

StarC exists because a hypercube exists. The language is shaped by the hardware: TDMA phases become exchange blocks, neighbor links become `nbr()` calls, the absence of routing becomes the absence of `get()`.

C was a thin wrapper over the PDP-11. StarC is a thin wrapper over a hypercube. Neither is an abstraction. Both are descriptions of what the machine does, expressed as syntax.

The Connection Machine made parallel computation visible. You could watch sorting algorithms ripple across the front panel. This machine does the same: 4,096 LEDs showing 4,096 processors, running algorithms you can see.

That's what StarC is for. Not to be a perfect language. To be the language that makes this machine programmable.

---

[back to main project page](ThinkinMachine.html)

[main](../)

</div><!-- /.tm-article -->
</div><!-- /.tm-layout -->

<script>
document.addEventListener("DOMContentLoaded", () => {
  // Handle collapsible code blocks
  const setupCollapsibleCodeBlocks = () => {
    // Remove all auto-generated wrappers that AREN'T marked collapsible
    document.querySelectorAll('.code-block-wrapper:not(.collapsible)').forEach(wrapper => {
      const content = wrapper.querySelector('.code-block-content');
      const pre = content ? content.querySelector('pre') : wrapper.querySelector('pre');
      if (pre && wrapper.parentNode) {
        wrapper.parentNode.insertBefore(pre, wrapper);
        wrapper.remove();
      }
    });

    // Setup collapsible functionality for marked code blocks
    document.querySelectorAll('.collapsible').forEach(container => {
      // Find code blocks within this collapsible container
      const codeBlocks = container.querySelectorAll('pre[class*="language-"]');

      codeBlocks.forEach((codeBlock, index) => {
        // Skip if already wrapped
        if (codeBlock.closest('.code-block-wrapper.collapsible')) return;

        // Get the language from the class
        const languageClass = Array.from(codeBlock.classList)
          .find(className => className.startsWith('language-'));
        const language = languageClass ? languageClass.replace('language-', '') : 'code';

        // Create wrapper structure
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper collapsible';

        const header = document.createElement('div');
        header.className = 'code-block-header';

        const title = document.createElement('div');
        title.className = 'code-block-title';
        title.textContent = language.charAt(0).toUpperCase() + language.slice(1);

        const toggle = document.createElement('div');
        toggle.className = 'code-block-toggle';
        toggle.textContent = 'Show code';

        const content = document.createElement('div');
        content.className = 'code-block-content';

        // Assemble structure
        header.appendChild(title);
        header.appendChild(toggle);
        wrapper.appendChild(header);

        // Move code block into wrapper
        codeBlock.parentNode.insertBefore(wrapper, codeBlock);
        content.appendChild(codeBlock);
        wrapper.appendChild(content);

        // Add click handler
        header.addEventListener('click', function() {
          content.classList.toggle('expanded');
          toggle.textContent = content.classList.contains('expanded') ? 'Hide code' : 'Show code';
        });
      });
    });
  };

  // Run immediately
  setupCollapsibleCodeBlocks();

  // Run again after a short delay to catch any late additions
  setTimeout(setupCollapsibleCodeBlocks, 100);

  // Also run when Prism finishes highlighting
  if (window.Prism) {
    Prism.hooks.add('after-highlight', setupCollapsibleCodeBlocks);
  }

  const root     = document.documentElement;
  const layoutEl = document.querySelector(".tm-layout") || document.body;
  const articleEl= document.querySelector(".tm-article") || layoutEl;
  const tocEl    = document.querySelector(".tm-toc");
  const tocList  = document.getElementById("tm-toc");
  const navEl    = document.querySelector(".navbar");

  if (!tocList || !tocEl) return;

  // ---------- Build ToC ----------
  tocList.innerHTML = "";

  const headings = Array.from(articleEl.querySelectorAll("h1, h2, h3, h4"))
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
      tag === "h1" ? "tm-toc-level-1" :
      tag === "h2" ? "tm-toc-level-2" :
      tag === "h3" ? "tm-toc-level-3" : "tm-toc-level-4"
    );

    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.textContent;

    li.appendChild(a);
    tocList.appendChild(li);
  });

  // ---------- Layout sync ----------
  const px = (n) => `${Math.max(0, Math.round(n))}px`;

  function syncLayout() {
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

    const vw = document.documentElement.clientWidth;
    const tocMax = Math.min(Math.max(176, Math.floor(vw * 0.256)), 416);
    root.style.setProperty("--tm-toc-max-px", px(tocMax));

    const tocW = tocEl ? tocEl.getBoundingClientRect().width : 0;
    const gap = 16;
    const articleFit = vw - tocW - gap;
    root.style.setProperty("--tm-article-fit-px", px(articleFit));
  }

  syncLayout();
  window.addEventListener("resize", syncLayout);

  // ---------- Active section highlight ----------
  const tocLinks = Array.from(tocList.querySelectorAll("a"));
  const linkById = new Map(
    tocLinks.map(a => [decodeURIComponent(a.getAttribute("href").slice(1)), a])
  );

  let activeLi = null;

  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const link = linkById.get(e.target.id);
          if (link) {
            if (activeLi) {
              activeLi.classList.remove("is-active");
              activeLi.querySelector("a")?.classList.remove("is-active");
            }
            activeLi = link.parentElement;
            activeLi.classList.add("is-active");
            link.classList.add("is-active");
          }
        }
      }
    },
    {
      rootMargin: "-10% 0px -85% 0px",
      threshold: 0
    }
  );

  headings.forEach(h => obs.observe(h));

  // Smooth scroll
  tocList.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      e.preventDefault();
      const id = e.target.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (target) {
        const offset = parseFloat(getComputedStyle(root).getPropertyValue("--tm-scroll-offset")) || 90;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  });
});
</script>