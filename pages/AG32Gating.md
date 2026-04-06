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
inter-node communication. Each dimension link is a single wire — TDMA
separates TX and RX in time, so one wire carries traffic in both
directions. The FPGA fabric in the AG32 (the AGRV2K, roughly 2K LEs)
implements a 4-way mux that routes UART1 TX/RX to whichever dimension
pin is currently active. At phase 0 it connects the dimension 0 pin.
At phase 2 it connects the dimension 1 pin. And so on.

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
AG32VF407 family, using `agrv_sdk` as the framework. The dev board
(LQFP-48, AG32VF303CCT6) needs a board definition — start from the
existing `agrv2k_303` (LQFP-100) and adjust for the 48-pin package. For
the final 16-node board (KCU6 / QFN-32), you'll add another board
definition JSON. This produces `code.bin`.

```ini
[env:ag32vf303]
platform = https://github.com/os-q/platform-agm32.git
board = agrv2k_303
framework = agrv_sdk
```

**FPGA side — Supra**
AGM's proprietary synthesis and place-and-route tool for the AGRV2K fabric.
Windows-only (XP through 11). Free download from agmsemi.com, actual
download is Baidu Pan (link password: `1234`; standalone download password:
`q59e`). Install path must not contain Chinese characters or spaces.
License file (`licence.txt`) imported via File → Import License. Three
synthesis modes: **Native** (AGM's own EDA, Verilog only), **Synplicity**
(third-party), **Compatible** (Altera Quartus II 8.0–13.0, needs Cyclone IV
libraries). Use Native mode — it avoids the Quartus dependency entirely.

Takes Verilog + a `.ve` pin constraint file, produces `design.bin` +
`design_batch.bin`. The `.ve` syntax is simple — one line per signal:

```
clk       PIN_OSC    # internal 8MHz oscillator
led[0]    PIN_29
led[1]    PIN_30
sel       PIN_31
```

Special keywords: `PIN_OSC` (internal 8 MHz oscillator), `PIN_HSE`
(external crystal on OSC_IN/OSC_OUT pins). Clock/PLL inputs must use
`IO_GB` global buffer pins. IO properties (pull-up, drive current 2–30mA)
are set in a separate `.asf` file.

Compilation options worth noting: Fit flow `timing_more`, Effort level
`highest`, Fit target `hybrid`. Supra also has a **Probe mode** (Tools →
Compile → Probe flow) that routes internal signals to spare IO pins for
logic analyzer debug — useful for Step 8.

Ref: `MANUAL_AGRV2K_4.2_Native.pdf`, `MANUAL_Supra_6.2.pdf` in the Supra
installation's `Supra开发文档` folder. Both are in Chinese.

**Flasher — AGM DAP-LINK + Downloader.exe**
The AGM DAP-LINK (also called "AGM Blaster") is a dual-mode programmer
built on an AG32VF407RGT6 with 32 Mbit SPI Flash for offline storage.
Jumper **J4** selects the mode:

- **CMSIS-DAP mode** (J4 open, default): Enumerates as USB mass-storage
  device + USB COM serial port. No drivers needed on Win10+. Used for
  AG32 MCU programming via JTAG or C-JTAG (2-wire TCK/TMS). LED D4
  flashes fast, LED D3 stays on. Device ID: `0x40200001`.
- **USB Blaster mode** (J4 connected, grounds nRESET): Behaves as an
  Altera USB Blaster clone. Requires the Quartus USB Blaster driver.
  Used for FPGA/CPLD programming via Supra. **Not used for AGRV2K work.**
- **Serial mode** (via Downloader.exe): Uses UART_Tx/Rx pins on the
  10-pin header. Target MCU must have **BOOT0 pulled high** to enter
  boot ROM. Default baud: **460800**. LED D3 blinks during transfer.

Other jumpers: **J3V** = output 3.3V to target, **J5V** = output 5V
(AS mode only), **JBOOT0** = connect to update DAP-LINK firmware itself.
Buttons: **SW_NRST** = MCU reset, **SW_IO** = start offline programming.

`Downloader.exe` ships inside the Supra installation `bin` directory
(also available standalone, also works from PlatformIO). Point it at
`XXXX_batch.bin` — a combined MCU+FPGA image — and it programs the chip.
The DAP-LINK also supports offline burning: select `CMSIS-DAP Offline`
adapter in Downloader.exe, load `batch.bin` into the probe's 32 Mbit
flash via "Update Offline File", then disconnect from PC and press
SW_IO to program a target standalone. LED D1 = success, D2 = fail.

The 10-pin header follows the Altera USB Blaster pinout:

```
TCK/DCLK        GND
TDO/CONF_DONE   VCC3V
TMS/nCONFIG     nCE/UART_Tx
DATA/UART_Rx    nCS/5V
TDI/ASDI         nRESET
```

Ref: `AGM_DAP_LINK_Rev2.5.pdf` in the Supra `Supra开发文档` folder.

---

## Hardware On Hand

**AGM TCX Dev Board (AG32VF303CCT6, LQFP-48)**
Purchased from TCX-micro (AGM's official distributor) via Taobao. "AGM TCX"
on the listing refers to the distributor (Shanghai Tianchen Xinke /
遨格芯), not a board model number. TCX-micro operates agmsemi.com and
agmfpga.com.

- **Chip:** AG32VF303CCT6 in **LQFP-48** package. 248 MHz max, 256K Flash,
  128KB SRAM, 2K LEs FPGA fabric, 4 M9K RAM blocks, 1 PLL. 5 UARTs,
  2 SPI/I2C, 1 CAN, 10 ADC channels, 2 DACs, 2 comparators, USB FS.
- **UART0 (control):** PIN_42 (TX), PIN_43 (RX). 115200 baud default.
- **JTAG:** PIN_46 (JTMS), PIN_49 (JTCK), PIN_50 (JTDI), PIN_55 (JTDO),
  PIN_56 (JNTRST). Standard 10-pin header for the AGM DAP-LINK.
- **NRST:** Pin 7. **BOOT0:** Pin 60. **BOOT1:** PIN_28.
- **USB:** PIN_44 (USBDM), PIN_45 (USBDP).
- **Crystal:** OSC_IN (pin 5), OSC_OUT (pin 6) for HSE; OSC32_IN (pin 3),
  OSC32_OUT (pin 4) for 32.768 kHz LSE/RTC.
- **Free I/O for mux experiments:** PIN_29 through PIN_41, PIN_47,
  PIN_51–54, PIN_57–59, PIN_61, PIN_62 — roughly 20+ general-purpose
  pins. More than enough for 4 dimension links (4 pins) + 2-bit phase
  select (2 pins) + LEDs and debug signals.

The LQFP-48 board is the validation platform for Steps 1–8. It has more
pins than the final QFN-32 target but fewer than LQFP-100, which makes it
a realistic test of pin budgets. Everything validated on this board
transfers directly to the KCU6 (QFN-32) for the 16-node board — same
AGRV2K fabric, same MCU core, same toolchain. Only the `.ve` pin
constraint file changes.

**AGM DAP-LINK / USB Blaster**
Dual-mode programmer, described in the Toolchain Stack section above.
Connect to the dev board's 10-pin JTAG header with the included ribbon
cable. Use CMSIS-DAP mode (J4 jumper open) for all AG32 MCU work.

**AGM Supra + documentation folder**
The full Supra installation includes a `Supra开发文档` subfolder with
13 PDFs. All are in Chinese. The critical ones for this project:

- `MANUAL_AGRV2K_4.2_Native.pdf` — 17 pages. AGRV2K application guide
  for Native (non-Quartus) synthesis mode. Documents the `.ve` pin
  constraint syntax, `.asf` IO properties, PLL instantiation, M9K RAM
  usage, internal oscillator config, and the full build/program flow.
  Treats the chip as a standalone CPLD only — no MCU peripheral routing
  info. Confirms AGRV2K is the same silicon as AG32.
- `MANUAL_AGRV2K_3.2.pdf` — 17 pages. Same content but for Quartus II
  compatible synthesis flow. Includes the `af_quartus.tcl` export step.
- `MANUAL_Supra_6.2.pdf` — 16 pages. Full Supra IDE manual. Covers
  project migration from Quartus II, compilation parameters and timing
  optimization, Probe mode for routing internal signals to spare pins,
  batch compilation with random seeds, the Generate tool for combining
  bin files, and JTAG programming.
- `AGM_DAP_LINK_Rev2.5.pdf` — 7 pages. DAP-LINK programmer manual.
  Documents CMSIS-DAP mode, USB Blaster mode, Serial/UART programming
  at 460800 baud, offline programming, firmware update procedure,
  jumper and LED descriptions, encryption and download count limiting.
- `Manual_MCU.pdf` — 6 pages. **AG11KMCU** datasheet (ARM Cortex-M3 +
  11K LE FPGA SoC). Different chip, but reveals AGM's MCU+FPGA
  integration architecture: the MCU is an IP block (`alta_mcu`)
  instantiated in Verilog, with all peripheral signals (UART, SPI,
  GPIO, JTAG) exposed as Verilog ports that you wire to physical pins
  through the fabric. Shared RAM interface, AHB bus, and combined
  binary format (FPGA bitstream + 16-byte header + MCU firmware) are
  documented. **This is the architectural proof that runtime muxing of
  MCU UART signals through the fabric will work** — the UART TX/RX are
  just Verilog wires inside the fabric, not hardwired to pins.
- `MANUAL_boot_2.0.pdf` — 2 pages. Dual-boot for AG10K, `alta_boot`
  Verilog module. Flash header format: `FF 55` magic bytes + boot
  address pointers.

**Reference documents** (download from agm-micro.com products page):
- `AG32 MCU Reference Manual (20260224修订版)` — 318-page peripheral
  reference, v1.2. Pin tables for all four packages (LQFP-100, LQFP-64,
  LQFP-48, QFN-32) starting at Chapter 2, page 23. Memory map on page 14.
  Boot mode (BOOT0/BOOT1) on page 14. UART chapter pages 230–253 (5
  UARTs, 16C550-compatible, 16-byte FIFOs, max 460.8 kbit/s). **No FPGA
  fabric chapter exists in this manual.** On hand.
- `AG32_pinout_100_64_48_32_2K.xlsx` — pinout spreadsheet for all packages
- `AG32_DATASHEET_202303.pdf` — chip datasheet
- TCX-micro getting-started guide: `tcx-micro.com/doc_26999806.html`

---

## Twelve Steps

### Step 1 — First Flash via Vendor Tooling

Connect the AGM DAP-LINK to the dev board's 10-pin JTAG header with the
ribbon cable. Ensure the JGND jumper on the DAP-LINK is **open** (CMSIS-DAP
mode). Power the dev board. The DAP-LINK should enumerate as a USB drive
and a COM port — no drivers needed. Use the vendor example project from the
`OS-Q/platform-agm32` examples directory. Flash it with Downloader.exe
pointing at the `_batch.bin`. An LED blinks.

This step does not involve writing any code. The only goal is confirming
the chip is alive, the board has correct power delivery, and the
Downloader.exe + DAP-LINK pipeline works end to end.

**Gate:** LED blinks from vendor example binary.

---

### Step 2 — Blinky From Your Own GCC Toolchain

Write a minimal blinky using PlatformIO + agrv_sdk — not the vendor example,
your own `main.c` that enables a GPIO port and toggles a pin connected to
an LED on the dev board. You'll need to identify which GPIO pin drives the
LED — check the board schematic or probe it. Build and flash it.

This confirms the toolchain produces correct binaries, the linker script
memory map is right (Flash at `0x80000000`, RAM at `0x20000000` — note:
**not** the STM32 convention; Flash is at `0x80000000` not `0x08000000`
per the AG32 MCU Reference Manual page 14), and the startup code
initializes correctly.

If the chip does nothing, the memory map is the first thing to check.
The AG32 FLASH (XIP) region is `0x8000_0000 – 0x80FF_FFFF`, SRAM is
`0x2000_0000 – 0x2001_FFFF`.

**Gate:** LED blinks from your own code.

---

### Step 3 — UART Echo

Configure UART0 at 115200 8N1 on the LQFP-48 default pins (PIN_42 TX,
PIN_43 RX). Polled TX/RX. Echo characters back to a terminal. Connect a
USB-UART adapter to these pins, or use the DAP-LINK's built-in COM port
if it's wired through.

UART0 on its default pins is the permanent control interface for every node
in the 16-node board. This needs to be proven solid before you build sixteen
of them. Run it for a few minutes and confirm no framing errors.

Note: on the final KCU6 (QFN-32) board, UART0 is on PIN_20 (TX) and
PIN_21 (RX) — different physical pins, same peripheral. Only the `.ve`
constraint changes.

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

The `.ve` file syntax is confirmed (from `MANUAL_AGRV2K_4.2_Native.pdf`):

```
clk    PIN_OSC    # internal 8MHz oscillator
led    PIN_29     # pick any free IO pin
```

To use the internal oscillator, also add to the `.asf` file:
`set_config -loc 18 0 0 CFG_RCOSC_EN 1'b1`
and select "Full chip erase before program" when flashing. The programming
log should show "Oscillator calibrated with value xx" confirming it works.

This step has friction, but the `.ve` syntax is now documented. The main
unknowns are Supra installation issues and Chinese error messages. Use
Native mode (not Compatible) to avoid the Quartus II dependency.

**Gate:** LED blinks from fabric logic alone, MCU flash uninvolved.

---

### Step 5 — UART1 Routed to Non-Default Pins

UART1 has no default pin assignment on the LQFP-48 — it must be routed
via the FPGA fabric. Based on the AG11KMCU architecture documentation
(`Manual_MCU.pdf`), AGM's MCU+FPGA SoCs expose MCU peripheral signals as
Verilog ports on an internal IP block (called `alta_mcu` on the Cortex-M3
parts). The RISC-V equivalent in the AG32 works the same way: UART1 TX/RX
are internal Verilog wires that you route to physical pins in your
top-level design.

The Verilog wrapper will look something like:

```verilog
module top (
    output wire uart1_tx_pin,
    input  wire uart1_rx_pin
);
    // uart1_txd and uart1_rxd are internal MCU signals
    // connected through the fabric IP block
    assign uart1_tx_pin = uart1_txd;   // MCU TX → physical pin
    assign uart1_rxd = uart1_rx_pin;   // physical pin → MCU RX
endmodule
```

And the `.ve` file simply maps the top-level ports:

```
uart1_tx_pin    PIN_33
uart1_rx_pin    PIN_34
```

The exact signal naming for the AG32's RISC-V MCU IP block must be
discovered from the SDK examples in `OS-Q/platform-agm32` or from the
board `.ve` files. The AG11KMCU uses `UART_TXD` and `UART_RXD` as port
names on `alta_mcu`.

Keep the UART echo firmware from Step 3 running on UART0. Flash the new
`logic.bin` with the UART1 pin routing. Connect a USB-UART adapter to
the chosen pins. Confirm you can send and receive on UART1.

This is the primary value proposition of the AG32 for this project.

**Gate:** UART1 TX/RX confirmed working on non-default pins.

---

### Step 6 — Two-Way UART Mux From External GPIO (THE GATE)

*Software parallel track: S1 should be complete before leaving this step.*

This is the architectural gate for the entire machine. Everything after
this step is execution of a proven concept. Everything before was
preparation.

**Risk update:** The AG11KMCU documentation (`Manual_MCU.pdf`) proves that
AGM's MCU+FPGA architecture exposes all MCU peripheral signals as Verilog
wires inside the fabric. This means the mux is architecturally sound — UART
TX/RX are just wires you can mux with combinational logic. The risk has
shifted from "can the fabric do this?" (architectural) to "can you get
Supra to synthesize this correctly?" (toolchain). This is a significant
de-risking — toolchain friction is solvable, architectural limitations
are not.

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

Put a logic analyzer on all four dimension TX pins simultaneously. Supra's
**Probe mode** (Tools → Compile, select Probe flow) can route internal
fabric signals to spare IO pins — useful for observing the mux select
and UART signals without extra test logic. Drive the phase counter through
a full 4-phase cycle while UART1 is transmitting continuously. Look for:

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

Wire two AG32 nodes together on dimension 0: a single wire between the
two nodes' dimension-0 pins. TDMA phases separate direction — in one phase
Node 0 drives and Node 1 listens, in the next phase the roles reverse.
Push-pull, standard CMOS levels.

Slice controller drives the phase clock. In phase 0 (dimension 0, 0→1
direction): Node 0 transmits a packet, Node 1 receives it. In phase 1
(dimension 0, 1→0 direction): Node 1 transmits an acknowledgment, Node 0
receives it.

Run 10,000 round trips. Count errors. If error rate is zero or near-zero,
the physical layer is solid. If errors appear, check:

- Phase duration vs. packet size: does the packet fit in the phase window?
- Clock skew between nodes: are both nodes counting phases identically?
- Signal integrity: ringing or reflections on push-pull lines at target baud rate?

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

The `batch.bin` format is now partially understood from the AG11KMCU
documentation (`Manual_MCU.pdf`). The combined image is:

```
[FPGA bitstream (logic.bin)]
[16-byte header: MCU firmware length (4 bytes) + 0xFFFFFFFF × 3]
[MCU firmware (code.bin)]
```

The header sits at the boundary between the FPGA bitstream and the MCU
firmware. The MCU's `FLASH_BIAS` / `BOOT_ADDR` parameter points to this
header's address. On the AG11K, the default FPGA bitstream is ~0x51CE6
bytes; the AG32/AGRV2K bitstream will be smaller (2K LEs vs 11K LEs).
The Supra Generate tool (Tools → Generate → "Generate boot programming
files") builds the combined image automatically, but understanding the
format is needed for `ag32boot.py`.

Still confirm this by hex-dumping a known-good `_batch.bin` from the
SDK — the AGRV2K format may differ slightly from the AG11K format.

The serial bootloader runs at **460800 baud** (confirmed in
`AGM_DAP_LINK_Rev2.5.pdf`), not 115200 as might be assumed. The MCU
enters boot ROM when BOOT0 is high and BOOT1 is low at reset. BOOT0
and BOOT1 values are latched on the 4th rising edge of SYSCLK after
reset (AG32 MCU Reference Manual, page 14).

`ag32boot.py` does the following for each node 0–15:

1. Assert NRST low via MCP23017
2. Assert Boot0 high via MCP23017
3. Release NRST (BOOT0/BOOT1 latched on 4th SYSCLK edge)
4. Select node RX via 74HC4067
5. Speak the AG32 serial bootloader protocol at **460800 baud**,
   flash `_batch.bin`
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
| 4–5 | Medium | Supra tooling friction, Chinese error messages | Budget a week; use Native mode |
| **6** | **Medium** | **Toolchain issues synthesizing the mux** | **AG11KMCU docs prove architecture is sound; push through Supra** |
| 7–8 | Medium | Glitches at high phase rate | Reduce phase rate, add dead-time; use Supra Probe mode |
| 9–10 | Low | Line termination, clock skew | Tune pullup, verify clock tree |
| 11 | Low | Board-level issues | Fix the board |
| 12 | Low | `_batch.bin` format now partially documented | Confirm via hex dump; format in `Manual_MCU.pdf` |

**Risk update (post-documentation review):** Step 6 was originally rated
High because it was unknown whether the FPGA fabric could do runtime
combinational muxing of MCU peripheral signals. The AG11KMCU documentation
(`Manual_MCU.pdf`) proves that AGM's MCU+FPGA architecture exposes all
MCU peripheral signals (including UART TX/RX) as Verilog wires inside
the fabric. The mux is just combinational logic on those wires. The risk
has shifted from *architectural* (can the fabric do this?) to *toolchain*
(can you get Supra to synthesize it?). Toolchain friction is solvable.
Step 12's `_batch.bin` format risk is also reduced — the combined binary
format is documented for the AG11KMCU and likely identical or very similar
for the AGRV2K.

Step 6 is still the gate — but it's now a toolchain gate, not an
architecture gate. If Step 6 passes, the machine gets built.

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