# AG32 Bring-Up and 16-Node Hypercube

This document is the 'todo' or gating document for the bringup of the Thinkin'
Machine. It's the steps I need to take to buy AG32 chips from LCSC and turn
them into a hypercube computer. This document goes through each step I need
to take, and I will add my progress/takeaways below each step. Think of this
as a lab notebook for getting AG32s working, but the first half of all the
pages are pre-filled with what I need to do.

This document covers everything needed to verify the AG32 works for the
Thinkin' Machine, and get a validated 16-node 4D hypercube running. There
are twelve hardware steps and four software milestones. Hardware steps 1–3
are a weekend. Steps 4–5 are the first real unknown. Step 6 is the
architectural gate — if it passes, the machine works. Software work begins
in parallel with hardware Step 4 and gates hardware from Step 9 onward.

Each section below is laid out like a lab notebook page — the first half
is pre-filled with what needs to happen, and the second half is blank,
waiting for results and observations as the work gets done.

---

**Contents**

- [ ] [Step 1 — First Flash via Vendor Tooling](#step-1--first-flash-via-vendor-tooling)
- [ ] [Step 2 — Blinky From Your Own GCC Toolchain](#step-2--blinky-from-your-own-gcc-toolchain)
- [ ] [Step 3 — UART Echo](#step-3--uart-echo)
- [ ] [Step 4 — Pure FPGA Blinky via Supra](#step-4--pure-fpga-blinky-via-supra)
- [ ] [Step 5 — UART1 Routed to Non-Default Pins](#step-5--uart1-routed-to-non-default-pins)
- [ ] [Step 6 — Two-Way UART Mux From External GPIO (THE GATE)](#step-6--two-way-uart-mux-from-external-gpio-the-gate)
- [ ] [Step 7 — Four-Way Mux Driven by 2-Bit Counter](#step-7--four-way-mux-driven-by-2-bit-counter)
- [ ] [Step 8 — Characterize Switching Behavior](#step-8--characterize-switching-behavior)
- [ ] [Step 9 — Single Dimension Link Round Trip](#step-9--single-dimension-link-round-trip)
- [ ] [Step 10 — Four-Node 2D Hypercube With Routing](#step-10--four-node-2d-hypercube-with-routing)
- [ ] [Step 11 — Sixteen-Node 4D Hypercube](#step-11--sixteen-node-4d-hypercube)
- [ ] [Step 12 — Automated Flash Pipeline](#step-12--automated-flash-pipeline)
- [ ] [S1 — Canonical Mux Verilog Project](#s1--canonical-mux-verilog-project)
- [ ] [S2 — Node Runtime](#s2--node-runtime)
- [ ] [S3 — Host Interface Library](#s3--host-interface-library)
- [ ] [S4 — First StarC Program End-to-End](#s4--first-starc-program-end-to-end)

---

## Background: Why The AG32

Each node in the hypercube needs two hardware UARTs. One (UART0) is a fixed
control interface to the slice controller host. The other (UART1) handles
all four hypercube dimension links — not simultaneously, but one at a time,
muxed through time by the TDMA phase clock.

Because only one dimension is active per phase, a single UART handles all
inter-node communication. The FPGA fabric in the AG32 (the AGRV2K, roughly
2K LEs) implements a 4-way mux that routes UART1 TX/RX to whichever
dimension pin pair is currently active. At phase 0 it connects dimension 0
pins. At phase 2 it connects dimension 1 pins. And so on.

The mux select is driven by the external TDMA phase clock from the slice
controller, which may be an RP2040, or a larger AG32. The mux logic is
maybe 30 LEs. The 2K fabric is otherwise almost entirely unused.

This means each AG32 node needs exactly two UARTs and the FPGA fabric for
the mux. That's it. No bitbanging, no dedicated per-dimension UART cores,
no routing silicon. The TDMA schedule is the router.

---

## The Toolchain Stack

Three separate pieces, from three different places:

**MCU side — PlatformIO + agrv_sdk**
The `OS-Q/platform-agm32` repo on GitHub is a PlatformIO platform for the
AG32VF407 family, using `agrv_sdk` as the framework. The VF303 is close
enough to use as a starting point; you'll add a board definition JSON for
the KCU6 package. This produces `code.bin`.

```ini
[env:ag32vf303kcu6]
platform = https://github.com/os-q/platform-agm32.git
board = agrv2k_303
framework = agrv_sdk
```

**FPGA side — Supra**
AGM's proprietary synthesis and place-and-route tool for the AGRV2K fabric.
Windows-only. Free download from agmsemi.com, actual download is Baidu Pan
(link password: `1234`). Takes Verilog + a `.ve` pin constraint file,
produces `logic.bin`. There is no open-source alternative. If you're on
Mac or Linux, you need a Windows VM for this step only.

**Flasher — AGM Blaster + Downloader.exe**
The AGM Blaster is a ~$15 CMSIS-DAP probe from AGM. It exposes as a USB
drive + serial port on Windows with no drivers. `Downloader.exe` ships
inside the Supra installation directory (also available standalone). You
point it at `XXXX_batch.bin` — a combined MCU+FPGA image the SDK produces
— and it programs the chip.

Key wiring for the AGM Blaster in CMSIS-DAP mode: GND, TCK, TMS (required);
TDI, TDO, NRST (optional but recommended). No Boot0 toggling needed; the
Blaster handles entry into programming mode via JTAG.

---

## Twelve Steps

### Step 1 — First Flash via Vendor Tooling

Wire up the dev board: AGM Blaster to JTAG header, power, done. Use the
vendor example project from the `OS-Q/platform-agm32` examples directory.
Flash it with Downloader.exe. LED blinks.

This step does not involve writing any code. The only goal is confirming
the chip is alive, the board has correct power delivery, and the
Downloader.exe + AGM Blaster pipeline works end to end.

**Gate:** LED blinks from vendor example binary.

---

### Step 2 — Blinky From Your Own GCC Toolchain

Write a minimal blinky using PlatformIO + agrv_sdk — not the vendor example,
your own `main.c` that enables a GPIO port and toggles a pin in a loop.
Build and flash it.

This confirms the toolchain produces correct binaries, the linker script
memory map is right (Flash at `0x08000000`, RAM at `0x20000000`, same
convention as STM32), and the startup code initializes correctly.

If the chip does nothing, the memory map assumptions are wrong. Check the
AG32 MCU Reference Manual for the VF303 flash base address before assuming
anything else is broken.

**Gate:** LED blinks from your own code.

---

### Step 3 — UART Echo

Configure UART0 at 115200 8N1 on the default pins (Pin 20 TX, Pin 21 RX).
Polled TX/RX. Echo characters back to a terminal.

UART0 on its default pins is the permanent control interface for every node
in the 16-node board. This needs to be proven solid before you build sixteen
of them. Run it for a few minutes and confirm no framing errors.

**Gate:** Characters echo reliably at 115200.

---

### Step 4 — Pure FPGA Blinky via Supra

*Software parallel track: begin S1 (canonical mux Verilog project) here.*

No MCU involvement. Write a Verilog free-running counter, drive an LED from
bit 22 or so of the counter. Create the `.ve` pin constraint file mapping
the LED output to the correct physical pin. Compile in Supra. Flash only
`logic.bin` — leave MCU flash untouched.

```verilog
module blinky (
    input  wire clk,
    output wire led
);
    reg [23:0] counter;
    always @(posedge clk) counter <= counter + 1;
    assign led = counter[22];
endmodule
```

The `.ve` file maps `clk` to the internal oscillator and `led` to your
chosen pin. The exact syntax requires the Supra quickstart guide from
`agmsemi.com/quickstart-guide-for-agrv2k/` — archive this before it
disappears.

This step has the most unknown friction. Supra may be straightforward or
it may be a week of fighting Windows tooling, undocumented `.ve` syntax,
and confusing error messages in Chinese. Budget time accordingly.

**Gate:** LED blinks from fabric logic alone, MCU flash uninvolved.

---

### Step 5 — UART1 Routed to Non-Default Pins

Write a Verilog pin assignment that routes UART1 TX/RX to pins of your
choosing. Keep the UART echo firmware from Step 3 running on UART0. Flash
only `logic.bin`.

Connect a USB-UART adapter to the new UART1 pins. Confirm you can send
and receive characters on UART1 at the remapped location.

This is the primary value proposition of the AG32 for this project. If
UART1 routing works, the hardest part of the architecture is proven. The
`.ve` constraint for a UART peripheral looks something like:

```
set_pin_assignment { uart1_txd } { LOCATION = P12; IOSTANDARD = LVCMOS33; }
set_pin_assignment { uart1_rxd } { LOCATION = P13; IOSTANDARD = LVCMOS33; }
```

Exact syntax: verify against the Supra quickstart and the EEWorld tutorial
at `en.eeworld.com.cn/bbs/thread-1309074-1-1.html`.

**Gate:** UART1 TX/RX confirmed working on non-default pins.

---

### Step 6 — Two-Way UART Mux From External GPIO (THE GATE)

*Software parallel track: S1 should be complete before leaving this step.*

This is the architectural gate for the entire machine. Everything after
this step is execution of a proven concept. Everything before was
preparation.

Write Verilog that routes UART1 TX/RX to one of two pin pairs based on
the state of an input GPIO. Force inactive outputs explicitly to `1'b1`
to prevent spurious start bits on the idle dimension link.

```verilog
module tdma_mux (
    input  wire uart1_tx,
    output wire uart1_rx,
    input  wire sel,          // driven by external phase clock GPIO
    output wire dim0_tx,
    input  wire dim0_rx,
    output wire dim1_tx,
    input  wire dim1_rx
);
    // Force idle lines HIGH — critical to prevent spurious start bits
    assign dim0_tx = (sel == 1'b0) ? uart1_tx : 1'b1;
    assign dim1_tx = (sel == 1'b1) ? uart1_tx : 1'b1;
    assign uart1_rx = (sel == 1'b0) ? dim0_rx : dim1_rx;
endmodule
```

Toggle `sel` manually with a jumper. Connect a UART adapter to each
dimension pin pair. Confirm UART1 traffic appears only on the active pair.
Then toggle the jumper and confirm it switches cleanly.

**Gate:** UART1 mux switches correctly between two pin pairs based on
external GPIO. No traffic on inactive pair.

If this step fails due to a fabric limitation — minimum hold time on
the select input, unexpected glitch behavior, anything that causes
framing errors at the target baud rate — the fallback is not the CH32V203
with bitbanged links. Find another chip. Candidates include anything with
PIO-like programmable IO state machines (RP2040, RP2350, or Chinese
equivalents such as the CH32V305 which has enhanced IO capabilities worth
investigating).

---

### Step 7 — Four-Way Mux Driven by 2-Bit Counter

Extend the mux to four dimension pin pairs. The select input is now 2
bits, driven by two GPIO pins from the slice controller toggling through
00→01→10→11.

```verilog
module tdma_mux_4d (
    input  wire        uart1_tx,
    output wire        uart1_rx,
    input  wire [1:0]  phase_sel,
    output wire [3:0]  dim_tx,
    input  wire [3:0]  dim_rx
);
    assign dim_tx[0] = (phase_sel == 2'd0) ? uart1_tx : 1'b1;
    assign dim_tx[1] = (phase_sel == 2'd1) ? uart1_tx : 1'b1;
    assign dim_tx[2] = (phase_sel == 2'd2) ? uart1_tx : 1'b1;
    assign dim_tx[3] = (phase_sel == 2'd3) ? uart1_tx : 1'b1;

    assign uart1_rx = (phase_sel == 2'd0) ? dim_rx[0] :
                      (phase_sel == 2'd1) ? dim_rx[1] :
                      (phase_sel == 2'd2) ? dim_rx[2] : dim_rx[3];
endmodule
```

The slice controller drives `phase_sel` via two GPIO pins, cycling through
all four states at the target TDMA phase rate. Confirm UART1 appears on
the correct pin pair for each phase.

**Gate:** Four-way mux confirmed at slice controller-driven phase rate.

---

### Step 8 — Characterize Switching Behavior

Put a logic analyzer on all four dimension TX pins simultaneously. Drive
the phase counter through a full 4-phase cycle while UART1 is transmitting
continuously. Look for:

- Glitches on inactive pins during mux switch transitions
- Spurious start bits (brief low pulse on an idle line)
- Any correlation between switch timing and framing errors

This is where silicon surprises live. If the AGRV2K mux has propagation
delay long enough to clip a UART start bit at your target baud rate, you'll
see it here. The fix is either to add a brief dead-time between phases in
the slice controller firmware (extend phase duration slightly around
transitions), or to gate UART1 TX during the transition window.

Document the minimum safe phase duration at each baud rate. This number
defines the throughput ceiling of the machine.

**Gate:** No framing errors observed across 10,000+ UART frames during
continuous phase cycling. Minimum phase duration characterized.

---

### Step 9 — Single Dimension Link Round Trip

*Requires S2 (node runtime) to be complete before this step.*

Wire two AG32 nodes together: Node 0 dimension-0 TX to Node 1 dimension-0
RX, and Node 1 dimension-0 TX to Node 0 dimension-0 RX. Single wire each
direction, open-drain with pullup.

Slice controller drives the phase clock. In phase 0 (dimension 0, 0→1
direction): Node 0 transmits a packet, Node 1 receives it. In phase 1
(dimension 0, 1→0 direction): Node 1 transmits an acknowledgment, Node 0
receives it.

Run 10,000 round trips. Count errors. If error rate is zero or near-zero,
the physical layer is solid. If errors appear, check:

- Phase duration vs. packet size: does the packet fit in the phase window?
- Clock skew between nodes: are both nodes counting phases identically?
- Line termination: does the open-drain pullup need a different value?

**Gate:** 10,000 round trips, zero framing errors.

---

### Step 10 — Four-Node 2D Hypercube With Routing

*Requires S2 (node runtime) and S3 (host interface library) to be
substantially complete before this step.*

Four nodes (addresses 00, 01, 10, 11), four dimension links, 4-phase TDMA
cycle. Send a message from Node 00 to Node 11 — this requires two hops,
through either Node 01 or Node 10, depending on dimension ordering.

Using dimension-ordered routing, the path is always 00 → 01 → 11 (flip
bit 0 first, then bit 1). The routing logic at each node:

```c
void route(uint8_t dest, uint8_t *payload) {
    uint8_t delta = my_addr ^ dest;
    for (int dim = 0; dim < 2; dim++) {
        if (delta & (1 << dim)) {
            int phase = 2 * dim + ((my_addr >> dim) & 1);
            wait_for_phase(phase);
            transmit(dim, payload);
            return;
        }
    }
}
```

Confirm the message arrives at Node 11 with the correct payload. Confirm
Node 01 correctly forwarded it without dropping or corrupting.

**Gate:** Multi-hop routing confirmed on four-node hardware.

---

### Step 11 — Sixteen-Node 4D Hypercube

Full 16-node board. All nodes running, all dimension links wired per the
hypercube connectivity table (each node connects to four neighbors,
differing by one bit in each dimension). Full 8-phase TDMA cycle.

Run the worst-case routing test: message from Node 0 (0000) to Node 15
(1111). This requires four hops through Nodes 1, 3, 7, and 15. Every
dimension link is exercised. The phase sequence is 0, 2, 4, 6 — strictly
increasing, completes in one cycle.

Measure:

- Round-trip latency at various phase clock rates (1 kHz, 5 kHz, 10 kHz)
- Error rate under sustained load
- Phase clock ceiling: what is the maximum phase rate before framing errors appear?

This milestone gates the layout of the full production backplane card.

**Gate:** Worst-case 4-hop routing confirmed. Latency and error rate
characterized across phase clock range.

---

### Step 12 — Automated Flash Pipeline

*Requires S3 (host interface library) to be complete. `ag32boot.py` is
part of that library, not a standalone script.*

The 16-node board programs 16 chips sequentially. The slice controller
drives Boot0 and NRST for each node via MCP23017 GPIO expanders (one for
Boot0, one for NRST). UART0 TX is broadcast to all nodes; UART0 RX is
muxed back via 74HC4067, selectable per node.

Before writing `ag32boot.py`, figure out the `_batch.bin` format. Open a
known-good batch.bin in a hex editor. Look for a header that identifies
the MCU section vs the FPGA section, their offsets, and their sizes. The
format is almost certainly a simple concatenation with a small header — the
AGM Blaster documentation refers to it as a combined image but doesn't
publish the format.

Once the format is understood, `ag32boot.py` does the following for each
node 0–15:

1. Assert NRST low via MCP23017
2. Assert Boot0 high via MCP23017
3. Release NRST
4. Select node RX via 74HC4067
5. Speak the AG32 serial bootloader protocol, flash `_batch.bin`
6. Assert Boot0 low
7. Pulse NRST to start normal execution
8. Verify the node responds on UART0

Run against all 16 nodes in sequence. Total flash time should be under
two minutes for a full board reflash.

**Gate:** All 16 nodes programmable sequentially without manual
intervention.

---

## Risk Summary

| Step | Risk Level | Likely Failure Mode | Fallback |
|------|-----------|---------------------|----------|
| 1–3 | Low | Board bring-up issues | Fix the board |
| 4–5 | Medium | Supra tooling friction, `.ve` format | Budget a week |
| **6** | **High** | **AGRV2K mux has timing limitations** | **Find another chip with PIO** |
| 7–8 | Medium | Glitches at high phase rate | Reduce phase rate, add dead-time |
| 9–10 | Low | Line termination, clock skew | Tune pullup, verify clock tree |
| 11 | Low | Board-level issues | Fix the board |
| 12 | Medium | `_batch.bin` format undocumented | Reverse-engineer from hex dump |

Step 6 is the only step that can invalidate the architecture. Everything
else is solvable engineering. If Step 6 passes, the machine gets built.

---

## Software Milestones

The hardware steps above assume firmware and host software materialize when
needed. They don't — they need to be built in parallel with the hardware
validation sequence. The four software milestones below are the full
software stack for the Thinkin' Machine, from bare fabric through the first
StarC program.

Software is not a separate workstream that happens after hardware. S1 and
S2 gate hardware steps 6 and 9 respectively. S3 gates Step 10 and Step 12.
Nothing in the hardware sequence from Step 9 onward can be completed
without the corresponding software.

---

### S1 — Canonical Mux Verilog Project

*Begin during hardware Step 4. Complete before leaving hardware Step 6.*

The TDMA mux Verilog that emerges from Steps 4–6 needs to be a proper
version-controlled project, not a one-off test. This is the canonical
`logic.bin` source for every AG32 node in the machine.

The repository structure:

```
thinkin-node-fpga/
  rtl/
    tdma_mux.v          # the 4-way mux, parameterized by dimensions
    tdma_mux_tb.v       # testbench
  constraints/
    ag32vf303kcu6.ve    # pin constraints for QFN-32
  synth/
    Makefile            # invoke Supra, produce logic.bin
  README.md
```

The mux should be parameterized on number of dimensions so it can be
reused for the 4D prototype (4 dimensions, 2-bit select) and the full
12D machine (12 dimensions, 4-bit select) without rewriting.

The testbench needs to verify the idle-line behavior explicitly — a
simulation that confirms inactive dimension TX outputs are held high during
and after mux switching. This is the failure mode most likely to cause
silent data corruption on hardware.

**Milestone:** Parameterized mux Verilog, testbench passing, building
cleanly from Makefile to `logic.bin`.

---

### S2 — Node Runtime

*Begin during hardware Step 6. Required before hardware Step 9.*

The node runtime is the bare-metal C library that runs on every AG32 in
the machine. It is small by design — target under 2KB of Flash and under
512 bytes of RAM overhead — so node applications have maximum working
memory. The AG32VF303KCU6 has 128KB SRAM.

The public API:

```c
// Initialization — call once at startup with this node's address
void tdma_init(uint16_t my_address, uint8_t num_dimensions);

// Phase synchronization — interrupt-driven on the phase clock input.
// NOT a busy-wait. The phase clock GPIO triggers an interrupt that
// increments the phase counter. tdma_wait_for_phase() sleeps until
// the target phase arrives, freeing the CPU for useful work between
// phase events.
uint8_t tdma_current_phase(void);
void    tdma_wait_for_phase(uint8_t phase);

// Primitive send/receive on a single dimension link.
// Called within the correct phase window; the fabric mux is already
// pointing at the right pins.
int tdma_send(uint8_t dimension, const void *payload, size_t len);
int tdma_recv(uint8_t dimension,       void *buf,     size_t max_len);

// Dimension-ordered routing — sends a message toward dest one hop
// at a time, using the phase schedule to determine when to transmit.
int tdma_route(uint16_t dest, const void *payload, size_t len);

// Control interface to slice controller (UART0)
void ctrl_send(const void *buf, size_t len);
int  ctrl_recv(      void *buf, size_t max_len);
```

The `tdma_wait_for_phase()` implementation is the subtle one. It must be
interrupt-driven on the phase clock GPIO — an edge interrupt that
increments a global phase counter. Busy-waiting burns the entire compute
window. The node should be doing useful work between phase events, sleeping
in WFI, and waking only when the next relevant phase arrives.

The runtime lives in its own repository:

```
thinkin-node-sdk/
  include/
    tdma.h
    ctrl.h
  src/
    tdma.c          # phase sync, send/recv, routing
    ctrl.c          # UART0 host interface
    startup.S       # AG32 startup, vector table
  ld/
    ag32vf303kcu6.ld
  examples/
    blinky/         # hello world
    echo/           # round-trip UART test (used in hardware Step 9)
    route/          # 2-node routing test (used in hardware Step 10)
  README.md
```

**Milestone:** `tdma_route()` working on two-node hardware (hardware
Step 9 passes using this library).

---

### S3 — Host Interface Library

*Begin during hardware Step 9. Required before hardware Step 10 and Step 12.*

The Linux host (initially the slice controller, eventually the Zynq) talks
to the hypercube via serial ports — one per node on the RP2040 prototype,
16 AXI-mapped UARTs on the Zynq. The host library abstracts this:

```python
# thinkin/machine.py

class ThinkinMachine:
    def __init__(self, ports, num_nodes):
        # ports: list of serial port paths, one per node
        # or a single Zynq device path for the production machine

    def flash(self, batch_bin_path):
        # Programs all nodes sequentially via ag32boot protocol.
        # Handles Boot0/NRST sequencing via MCP23017.

    def load(self, node_binary_path):
        # Sends compiled node firmware to all nodes over UART0.

    def run(self):
        # Signals all nodes to begin execution simultaneously.

    def send(self, node_addr, payload):
        # Sends a message to a specific node via UART0.

    def collect(self, timeout=5.0):
        # Drains result data from all nodes.
        # Returns dict keyed by node address.

    def collect_streaming(self):
        # Generator: yields (node_addr, data) as results arrive.
```

`ag32boot.py` is a module within this library, not a standalone script.
The `_batch.bin` format reverse-engineering from hardware Step 12 feeds
directly into `flash()`.

**Milestone:** `machine.load()`, `machine.run()`, and `machine.collect()`
working against the 16-node board (hardware Step 11 passes using this
library).

---

### S4 — First StarC Program End-to-End

*Requires S2 and S3. Begin after hardware Step 11.*

A StarC program compiles to node firmware that uses the S2 runtime API.
The compiler output is a binary that calls `tdma_route()`, uses
`tdma_wait_for_phase()` correctly, and fits within the SRAM budget.

The first end-to-end test should be the simplest possible program that
exercises inter-node communication: a parallel sum. Each node holds one
integer. Each node routes its value toward Node 0. Node 0 accumulates the
sum and reports it to the host via `ctrl_send()`.

This requires the StarC compiler to target the S2 runtime API explicitly.
The compiler and runtime need to be co-designed here — whatever StarC
generates needs to map directly onto `tdma_route()` and
`tdma_wait_for_phase()`. If StarC was previously generating conceptual
pseudocode, this is where it generates real binaries.

**Milestone:** Parallel sum of 16 integers across the 16-node board,
result correct, submitted and collected via the S3 host library.

---

## After Step 12 and S4

A validated 16-node 4D hypercube running a StarC program is the proof of
concept for the full 4,096-node machine. The backplane card (256 nodes
per card, 16 cards total) is a layout job that OrthoRoute was built to
handle. The Zynq controller board replaces the RP2040 slice controller,
adding a 64-bit Linux environment, 16 hardware UART MACs in PL fabric,
and the master TDMA clock generator.

The 16-node board is not a prototype that gets thrown away. It is the
validation fixture for every architectural decision in the full machine.
The S2 node runtime and S3 host library written for the prototype run
unchanged on the full machine — only the port count and node address
width change.