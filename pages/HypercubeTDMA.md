---
layout: default
title: "TDMA Routing for Hypercubes"
description: "Hardware engineering and PCB design documentation by Brian Benchoff"
keywords: ["Hypercube", "TDMA"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2022-06-04
image: "/images/default.jpg"
---


# TDMA Routing on a 12-Dimensional Hypercube

Somehow, I invented a better connection machine.

My Thinkin' Machine has 4,096 processors arranged at the vertices of a 12-dimensional hypercube. Each processor connects to 12 neighbors. There are no dedicated routers. Messages traverse the network using a time-division multiple access (TDMA) scheme that gives us the proverbial holy grail of passing messages through a cluster of compute:

- Deterministic link ownership (no collisions on a link, ever)

- Dimension-ordered routing baked into time (deadlock-avoidance and routing simplicity fall out)

- Bounded latency that’s a function of the superframe length (24 phases) and phase duration (the entire machine is synchronous)

This page explains how.

## The Problem

Consider the constraints:

- **4,096 nodes**, each with 12 single-wire, half-duplex links to neighbors
- **No dedicated router hardware** — routing logic runs on the node processors themselves
- **Single hardware UART per node** — must be remapped to different pins for different dimensions
- **No collision detection or backoff** — the links can't do CSMA elegantly

The original Connection Machine CM-1 solved this with dedicated routing silicon: buffers, arbitration logic, and deadlock avoidance built into custom ASICs. That's not an option when you're building from thirty-cent microcontrollers.

## The Insight

In a hypercube, each node's address is a binary number. Node `0x2A3` is connected to every node that differs by exactly one bit: `0x2A2` (bit 0), `0x2A1` (bit 1), `0x2AB` (bit 3), and so on.

To route a message from source $S$ to destination $D$, XOR the addresses:

$$\Delta = S \oplus D$$

The set bits in $\Delta$ tell you which dimensions to traverse. If bit 7 is set, the message must cross dimension 7 at some point. The number of set bits equals the number of hops.

Here's the key: if you traverse dimensions in a fixed order — always dimension 0 before dimension 1 before dimension 2, and so on — you get deadlock-free routing for free. This is dimension-ordered routing, and it's a known result in the literature (see Bertsekas 1991).

The second insight is that you can embed this ordering into *time*. If link ownership is scheduled by dimension and direction, the routing algorithm collapses to: "wait for the right phase, then send."

## The Phase Schedule

A single communication cycle consists of 24 phases:

| Phase | Dimension | Direction | Transmitting Nodes |
|-------|-----------|-----------|-------------------|
| 0 | 0 | 0→1 | Nodes where bit 0 = 0 |
| 1 | 0 | 1→0 | Nodes where bit 0 = 1 |
| 2 | 1 | 0→1 | Nodes where bit 1 = 0 |
| 3 | 1 | 1→0 | Nodes where bit 1 = 1 |
| 4 | 2 | 0→1 | Nodes where bit 2 = 0 |
| 5 | 2 | 1→0 | Nodes where bit 2 = 1 |
| ... | ... | ... | ... |
| 22 | 11 | 0→1 | Nodes where bit 11 = 0 |
| 23 | 11 | 1→0 | Nodes where bit 11 = 1 |

In phase $2d$, nodes with address bit $d = 0$ transmit to their neighbor in dimension $d$. In phase $2d + 1$, nodes with address bit $d = 1$ transmit. Every link is active exactly twice per cycle — once in each direction — and there is never contention for a link.

## Dimension-Ordered Routing

Given source $S$ and destination $D$, compute $\Delta = S \oplus D$. The message traverses dimensions in order, using the appropriate phase for each hop.

For each dimension $d$ from 0 to 11:
- If bit $d$ of $\Delta$ is not set, skip this dimension
- If bit $d$ of the *current* address is 0, transmit in phase $2d$
- If bit $d$ of the *current* address is 1, transmit in phase $2d + 1$

Because dimensions are traversed in order and phases are ordered by dimension, the sequence of phases used is always monotonically increasing. A message never waits for a phase to "come around again."

### Worked Example

Route a message from node `0x2A3` (binary `0010 1010 0011`) to node `0x91C` (binary `1001 0001 1100`).

$$\Delta = \texttt{0x2A3} \oplus \texttt{0x91C} = \texttt{0xB3F} = \texttt{1011 0011 1111}_2$$

The set bits are: 0, 1, 2, 3, 4, 5, 8, 9, 11. That's 9 hops.

| Hop | Current Node | Dimension | Current Bit | Phase | Next Node |
|-----|--------------|-----------|-------------|-------|-----------|
| 1 | 0x2A3 | 0 | 1 | 1 | 0x2A2 |
| 2 | 0x2A2 | 1 | 1 | 3 | 0x2A0 |
| 3 | 0x2A0 | 2 | 0 | 4 | 0x2A4 |
| 4 | 0x2A4 | 3 | 0 | 6 | 0x2AC |
| 5 | 0x2AC | 4 | 0 | 8 | 0x2BC |
| 6 | 0x2BC | 5 | 1 | 11 | 0x29C |
| 7 | 0x29C | 8 | 0 | 16 | 0x19C |
| 8 | 0x19C | 9 | 1 | 19 | 0x11C |
| 9 | 0x11C | 11 | 0 | 22 | 0x91C |

Phase sequence: 1, 3, 4, 6, 8, 11, 16, 19, 22. Strictly increasing. Message delivered in one cycle.

## Bounded Latency

The maximum number of hops in a 12-dimensional hypercube is 12 (all bits differ). The maximum number of phases is 24. Every message — regardless of source, destination, or network load — completes within one 24-phase cycle.

This isn't worst-case latency. This is *every-case* latency. The entire machine breathes together.

Wall-clock latency depends on phase duration:

| Phase Rate | Phase Duration | Cycle Duration | 12-Hop Latency |
|------------|----------------|----------------|----------------|
| 1 kHz | 1 ms | 24 ms | 24 ms |
| 10 kHz | 100 µs | 2.4 ms | 2.4 ms |
| 100 kHz | 10 µs | 240 µs | 240 µs |

At 10 kHz phase rate with 1 Mbps baud, each phase carries ~100 bits — enough for a 10-byte payload plus header. The entire machine can exchange data at 2+ Gbps aggregate bandwidth with deterministic 2.4 ms latency.

## What Falls Out

The TDMA scheme eliminates entire categories of complexity:

**No collision detection.** Link ownership is determined by the schedule. Two nodes never try to transmit on the same link simultaneously.

**No backoff or retries.** Collisions don't happen, so recovery logic doesn't exist.

**No buffering beyond one message.** A node receives at most one message per link per phase. The "buffer" is a single register.

**No deadlock.** Dimension-ordered routing is provably deadlock-free, and the phase schedule enforces dimension ordering automatically.

**Trivial routing logic.** The algorithm at each node:

```
void route_message(uint16_t dest, uint8_t *payload) {
    uint16_t delta = my_addr ^ dest;
    for (int dim = 0; dim < 12; dim++) {
        if (delta & (1 << dim)) {
            int phase = 2 * dim + ((my_addr >> dim) & 1);
            wait_for_phase(phase);
            transmit(dim, payload);
            return; // next hop handles remaining dimensions
        }
    }
}
```

That's it. The complexity is in the schedule, not the silicon.

## Why This Works Here

This scheme exists because of constraints. The project couldn't afford dedicated router ASICs. I couldn't find a microcontroller with 12 hardware UARTs. The one UART I had could be remapped to different pins at runtime.

TDMA solves all of these problems simultaneously:

- One UART handles all 12 dimensions because only one dimension is active per phase
- No router hardware because the schedule *is* the arbitration
- Remapping pins between phases is cheap — reconfigure the UART peripheral, wait for the next phase

The original Connection Machine CM-1 used dedicated routing hardware because the constraints were different: custom silicon, DARPA budget, and a goal of supporting arbitrary asynchronous communication patterns. The routers were complex because they were solving the general case.

My workloads are synchronous. Compute, exchange, compute, exchange. For that pattern, the general case is unnecessary overhead. Lockstep TDMA is a feature, not a limitation.

Different constraints yield different solutions. This one happens to be elegant.

## References

- D. P. Bertsekas et al., "Optimal Communication Algorithms for Hypercubes," *Journal of Parallel and Distributed Computing*, 1991. [PDF](https://web.mit.edu/dimitrib/www/OptimalCA.pdf)

- Q. F. Stout, "Intensive Hypercube Communication: Prearranged Communication in Link-Bound Machines," *Journal of Parallel and Distributed Computing*, 1990. [Abstract](https://web.eecs.umich.edu/~qstout/abs/JPDC90.html)

- W. Zierhoff et al., "Time Triggered Communication on CAN (TTCAN)," CAN in Automation, 1999. [PDF](https://www.can-cia.org/fileadmin/resources/documents/proceedings/1999_zierhoff.pdf)

- M. Boyer, "A TSN Introduction," ONERA, 2025. [PDF](https://wp.laas.fr/store/wp-content/uploads/sites/8/2025/04/TSN-STORE-compression.pdf)

[back to main project page](ThinkinMachine.html)

[main](../)
