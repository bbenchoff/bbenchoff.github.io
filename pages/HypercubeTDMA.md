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

<style>
.tm-article table td,
.tm-article table th {
  text-align: center;
}
.tm-article table td:first-child,
.tm-article table th:first-child {
  text-align: left; /* first column is usually labels */
}

.tm-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.95rem;
}

.tm-article th,
.tm-article td {
  border: 1px solid rgba(0,0,0,0.15);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}

.tm-article th {
  background: rgba(0,0,0,0.05);
  font-weight: 700;
}

/* zebra stripes for readability */
.tm-article tbody tr:nth-child(even) td {
  background: rgba(0,0,0,0.03);
}

/* keep code-y columns from wrapping into soup */
.tm-article td code,
.tm-article th code {
  white-space: nowrap;
}

/* --- Horizontal scroll for wide tables (works without extra wrapper) --- */
.tm-article table {
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Optional: make the scroll feel less gross */
.tm-article table::-webkit-scrollbar {
  height: 10px;
}

</style>    
# TDMA Routing on a Hypercube

Somehow, I invented a better connection machine.

My Thinkin' Machine has 4,096 processors arranged at the vertices of a 12-dimensional hypercube. Each processor connects to 12 neighbors. There are no dedicated routers. Messages traverse the network using a time-division multiple access (TDMA) scheme. This message passing scheme has several interesting properties that turn my machine into something interesting:

- Deterministic link ownership (no collisions on a link, ever)

- Dimension-ordered routing baked into time (deadlock-avoidance and routing simplicity fall out)

- Bounded latency that’s a function of the superframe length (24 phases) and phase duration (the entire machine is synchronous)

This page explains how.

## The Problem

Nodes must pass messages to each other, but the naive way of doing this -- blasting out data and hoping everything works -- has significant drawbacks.

Consider the constraints:

- **4,096 nodes**, each with 12 single-wire, half-duplex links to neighbors
- **No dedicated router hardware** routing logic runs on the node processors themselves
- **Single wire connection** links between nodes are a single wire, open drain.
- **Single hardware UART per node** must be remapped to different pins for different dimensions
- **No collision detection or backoff** the links can't do CSMA elegantly

The original Connection Machine CM-1 solved this with dedicated routing silicon: buffers, arbitration logic, and deadlock avoidance built into custom ASICs. This is not an option when building a machine without routers, only using microcontrollers that cost under a dollar.

## The Insight

In a hypercube, each node's address is a binary number. Node `0x2A3` is connected to every node that differs by exactly one bit: `0x2A2` (bit 0), `0x2A1` (bit 1), `0x2AB` (bit 3), and so on.

To route a message from source $S$ to destination $D$, XOR the addresses:

$$\Delta = S \oplus D$$

The set bits in $\Delta$ tell you which dimensions to traverse. If bit 7 is set, the message must cross dimension 7 at some point. The number of set bits equals the number of hops.

If you traverse dimensions in a fixed order — always dimension 0 before dimension 1 before dimension 2, and so on — **you get deadlock-free routing for free**. This is dimension-ordered routing, and it's a known result in the literature (see Bertsekas 1991).

Divide that clock into $2n$ phases, where $n$ is the number of dimensions. Phase $2d$ activates dimension $d$ in the low→high direction; phase $2d+1$ activates the same dimension in the high→low direction. If link ownership is scheduled by dimension and direction, the routing algorithm collapses to: "wait for the right phase, then send."

![TDMA example waveforms](/images/ConnM/TDMA.png)

## The Phase Schedule

A single communication cycle consists of 24 phases:

<div class="table-wrap">
  <table class="matrix-table">
    <tr>
      <th>Phase</th>
      <th>Dimension</th>
      <th>Direction</th>
      <th>Transmitting Nodes</th>
    </tr>
    <tr><td>0</td><td>0</td><td>0→1</td><td>Nodes where bit 0 = 0</td></tr>
    <tr><td>1</td><td>0</td><td>1→0</td><td>Nodes where bit 0 = 1</td></tr>
    <tr><td>2</td><td>1</td><td>0→1</td><td>Nodes where bit 1 = 0</td></tr>
    <tr><td>3</td><td>1</td><td>1→0</td><td>Nodes where bit 1 = 1</td></tr>
    <tr><td>4</td><td>2</td><td>0→1</td><td>Nodes where bit 2 = 0</td></tr>
    <tr><td>5</td><td>2</td><td>1→0</td><td>Nodes where bit 2 = 1</td></tr>

    <tr>
      <td class="empty">…</td>
      <td class="empty">…</td>
      <td class="empty">…</td>
      <td class="empty">…</td>
    </tr>

    <tr><td>22</td><td>11</td><td>0→1</td><td>Nodes where bit 11 = 0</td></tr>
    <tr><td>23</td><td>11</td><td>1→0</td><td>Nodes where bit 11 = 1</td></tr>
  </table>
</div>

In phase $2d$, nodes with address bit $d = 0$ transmit to their neighbor in dimension $d$. In phase $2d + 1$, nodes with address bit $d = 1$ transmit. Every link is active exactly twice per cycle — once in each direction — and there is never contention for a link.

## Dimension-Ordered Routing

Given source $S$ and destination $D$, compute $\Delta = S \oplus D$. The message traverses dimensions in order, using the appropriate phase for each hop.

For each dimension $d$ from 0 to 11:
- If bit $d$ of $\Delta$ is not set, skip this dimension
- If bit $d$ of the *current* address is 0, transmit in phase $2d$
- If bit $d$ of the *current* address is 1, transmit in phase $2d + 1$

Because dimensions are traversed in order and phases are ordered by dimension, the sequence of phases used is always monotonically increasing. A message never waits for a phase to "come around again."

### Worked Example & Bounded Latency

**An Average-Case Routing Task**: Route a message from node `0x2A3` (binary `0010 1010 0011`) to node `0x91C` (binary `1001 0001 1100`).

$$\Delta = \texttt{0x2A3} \oplus \texttt{0x91C} = \texttt{0xB3F} = \texttt{1011 0011 1111}_2$$

The set bits are: 0, 1, 2, 3, 4, 5, 8, 9, 11. That's 9 hops.

<div class="table-wrap">
  <table class="matrix-table">
    <tr>
      <th>Hop</th>
      <th>Current Node</th>
      <th>Dimension</th>
      <th>Current Bit</th>
      <th>Phase</th>
      <th>Next Node</th>
    </tr>
    <tr><td>1</td><td>0x2A3</td><td>0</td><td>1</td><td>1</td><td>0x2A2</td></tr>
    <tr><td>2</td><td>0x2A2</td><td>1</td><td>1</td><td>3</td><td>0x2A0</td></tr>
    <tr><td>3</td><td>0x2A0</td><td>2</td><td>0</td><td>4</td><td>0x2A4</td></tr>
    <tr><td>4</td><td>0x2A4</td><td>3</td><td>0</td><td>6</td><td>0x2AC</td></tr>
    <tr><td>5</td><td>0x2AC</td><td>4</td><td>0</td><td>8</td><td>0x2BC</td></tr>
    <tr><td>6</td><td>0x2BC</td><td>5</td><td>1</td><td>11</td><td>0x29C</td></tr>
    <tr><td>7</td><td>0x29C</td><td>8</td><td>0</td><td>16</td><td>0x19C</td></tr>
    <tr><td>8</td><td>0x19C</td><td>9</td><td>1</td><td>19</td><td>0x11C</td></tr>
    <tr><td>9</td><td>0x11C</td><td>11</td><td>0</td><td>22</td><td>0x91C</td></tr>
  </table>
</div>

Phase sequence: 1, 3, 4, 6, 8, 11, 16, 19, 22. Strictly increasing. Message delivered in one cycle.

**Worst-Case Routing**: Route a message from node `0xFFF` (binary `1111 1111 1111`) to node `0x000` (binary `0000 0000 000`). This is the maximum possible Hammond distance on a 12-bit address space. Every bit differs.

$$\Delta = \texttt{0xFFF} \oplus \texttt{0x000} = \texttt{0xFFF} = = \texttt{1111 1111 1111}_2$$

Because the source starts with all bits = 1, every hop uses the **odd** phase for that dimension (the `1→0` direction): phase $2d+1$.

<div class="table-wrap">
  <table class="matrix-table">
    <tr>
      <th>Hop</th>
      <th>Current Node</th>
      <th>Dimension</th>
      <th>Current Bit</th>
      <th>Phase</th>
      <th>Next Node</th>
    </tr>
    <tr><td>1</td><td>0xFFF</td><td>0</td><td>1</td><td>1</td><td>0xFFE</td></tr>
    <tr><td>2</td><td>0xFFE</td><td>1</td><td>1</td><td>3</td><td>0xFFC</td></tr>
    <tr><td>3</td><td>0xFFC</td><td>2</td><td>1</td><td>5</td><td>0xFF8</td></tr>
    <tr><td>4</td><td>0xFF8</td><td>3</td><td>1</td><td>7</td><td>0xFF0</td></tr>
    <tr><td>5</td><td>0xFF0</td><td>4</td><td>1</td><td>9</td><td>0xFE0</td></tr>
    <tr><td>6</td><td>0xFE0</td><td>5</td><td>1</td><td>11</td><td>0xFC0</td></tr>
    <tr><td>7</td><td>0xFC0</td><td>6</td><td>1</td><td>13</td><td>0xF80</td></tr>
    <tr><td>8</td><td>0xF80</td><td>7</td><td>1</td><td>15</td><td>0xF00</td></tr>
    <tr><td>9</td><td>0xF00</td><td>8</td><td>1</td><td>17</td><td>0xE00</td></tr>
    <tr><td>10</td><td>0xE00</td><td>9</td><td>1</td><td>19</td><td>0xC00</td></tr>
    <tr><td>11</td><td>0xC00</td><td>10</td><td>1</td><td>21</td><td>0x800</td></tr>
    <tr><td>12</td><td>0x800</td><td>11</td><td>1</td><td>23</td><td>0x000</td></tr>
  </table>
</div>

Phase sequence: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23. Strictly increasing. Message delivered in one cycle.

Now route the opposite direction from node `0x000` (binary `0000 0000 000`) to node `0xFFF` (binary `1111 1111 1111`).

$$\Delta = \texttt{0xFFF} \oplus \texttt{0x000} = \texttt{0xFFF} = = \texttt{1111 1111 1111}_2$$

Because the source starts with all bits = 0, every hop uses the **even** phase for that dimension (the `0→1` direction): phase $2d$.

<div class="table-wrap">
  <table class="matrix-table">
    <tr>
      <th>Hop</th>
      <th>Current Node</th>
      <th>Dimension</th>
      <th>Current Bit</th>
      <th>Phase</th>
      <th>Next Node</th>
    </tr>
    <tr><td>1</td><td>0x000</td><td>0</td><td>0</td><td>0</td><td>0x001</td></tr>
    <tr><td>2</td><td>0x001</td><td>1</td><td>0</td><td>2</td><td>0x003</td></tr>
    <tr><td>3</td><td>0x003</td><td>2</td><td>0</td><td>4</td><td>0x007</td></tr>
    <tr><td>4</td><td>0x007</td><td>3</td><td>0</td><td>6</td><td>0x00F</td></tr>
    <tr><td>5</td><td>0x00F</td><td>4</td><td>0</td><td>8</td><td>0x01F</td></tr>
    <tr><td>6</td><td>0x01F</td><td>5</td><td>0</td><td>10</td><td>0x03F</td></tr>
    <tr><td>7</td><td>0x03F</td><td>6</td><td>0</td><td>12</td><td>0x07F</td></tr>
    <tr><td>8</td><td>0x07F</td><td>7</td><td>0</td><td>14</td><td>0x0FF</td></tr>
    <tr><td>9</td><td>0x0FF</td><td>8</td><td>0</td><td>16</td><td>0x1FF</td></tr>
    <tr><td>10</td><td>0x1FF</td><td>9</td><td>0</td><td>18</td><td>0x3FF</td></tr>
    <tr><td>11</td><td>0x3FF</td><td>10</td><td>0</td><td>20</td><td>0x7FF</td></tr>
    <tr><td>12</td><td>0x7FF</td><td>11</td><td>0</td><td>22</td><td>0xFFF</td></tr>
  </table>
</div>

Phase sequence: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22. Strictly increasing. Message delivered in one cycle.

### Bounded Latency

The maximum number of hops in a 12-dimensional hypercube is 12 (all bits differ). The maximum number of phases is 24. Every message — regardless of source, destination, or network load — completes within one 24-phase cycle.

**This isn't worst-case latency. This is every-case latency**. Not “usually fast, sometimes awful.” Not “fine until the network gets busy.” The schedule makes the network a metronome: every link gets a turn, every turn has an owner, and the longest possible route still fits inside a single superframe.

Latency stops being a statistical property and becomes a design constant. You can write software assuming, “a message sent now will be delivered by the end of this cycle,” the same way you assume a flip-flop will settle by the next clock edge. The whole system becomes synchronous at the network level. The machine isn’t just connected; it’s coordinated. It doesn’t chatter. It breathes.

Wall-clock latency depends on phase duration:

<div class="table-wrap">
  <table class="matrix-table">
    <tr>
      <th>Phase Rate</th>
      <th>Phase Duration</th>
      <th>Cycle Duration</th>
      <th>12-Hop Latency</th>
    </tr>
    <tr><td>1 kHz</td><td>1 ms</td><td>24 ms</td><td>24 ms</td></tr>
    <tr><td>10 kHz</td><td>100 µs</td><td>2.4 ms</td><td>2.4 ms</td></tr>
    <tr><td>100 kHz</td><td>10 µs</td><td>240 µs</td><td>240 µs</td></tr>
  </table>
</div>

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

The original Connection Machine CM-1 used dedicated routing hardware because the constraints were different: custom silicon, DARPA budget, and a goal of supporting arbitrary asynchronous communication patterns. The routers were complex because they were solving the general case. My workloads are synchronous. Compute, exchange, compute, exchange. For that pattern, the general case is unnecessary overhead. Lockstep TDMA is a feature, not a limitation.

## My Context

This _sounds_ smart, and it probably is, but I must admit I'm a bit out of my depth here. Not so much in that I couldn't _think of how to do this_, but my depth doesn't extend to _why this wasn't done before_. I've checked the literature, and the ideas are there. Bertsekas goes through the dimension ordering of message passing through a hypercube, and Stout sort of, kind of, applies this 'master scheduler clock scheme'. No one put these two ideas together to create a collision-free hypercube with bounded latency.

The original Connection Machine CM-1 solved a slightly different problem with its routers. The CM-1 solved general purposes communication under unpredictable traffic. This required buffers, arbitration, and deadlock avoidance. In the CM-1, there is _a lot_ of silicon dedicated to simply passing messages between nodes.

This TDMA scheme requires effectively zero silicon, and only needs a relatively slow global clock. I lose the idea that 'any node can talk to any dimension at any time', but if you zoom out to the superset of the phase clock that doesn't really matter at all. It's just a small implementation detail.

Am I the first person to think of this? I have no idea.

## References

- D. P. Bertsekas et al., "Optimal Communication Algorithms for Hypercubes," *Journal of Parallel and Distributed Computing*, 1991. [PDF](https://web.mit.edu/dimitrib/www/OptimalCA.pdf)

- Q. F. Stout, "Intensive Hypercube Communication: Prearranged Communication in Link-Bound Machines," *Journal of Parallel and Distributed Computing*, 1990. [Abstract](https://web.eecs.umich.edu/~qstout/abs/JPDC90.html)

- W. Zierhoff et al., "Time Triggered Communication on CAN (TTCAN)," CAN in Automation, 1999. [PDF](https://www.can-cia.org/fileadmin/resources/documents/proceedings/1999_zierhoff.pdf)

- M. Boyer, "A TSN Introduction," ONERA, 2025. [PDF](https://wp.laas.fr/store/wp-content/uploads/sites/8/2025/04/TSN-STORE-compression.pdf)

[back to main project page](ThinkinMachine.html)

[main](../)
