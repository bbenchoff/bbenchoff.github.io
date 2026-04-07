---
layout: default
title: "The Controller Board: A Custom Zynq Linux Host"
description: "Designing a bare-metal Zynq UltraScale+ front-end to orchestrate a 65,536-core hypercube."
keywords: ["hardware engineering", "PCB design", "Zynq", "UltraScale+", "DDR4", "FPGA"]
author: "Brian Benchoff"
date: 2024-03-29
last_modified_at: 2024-03-29
image: "/images/ConnM/CMSocialCard.png"
---

<style>
.matrix-table {
    border-collapse: collapse;
    font-family: monospace;
    font-size: 14px;
    margin: 0 auto;
    width: 100%;
}

.matrix-table th, .matrix-table td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
}

.matrix-table th {
    background-color: #f5f5f5;
    font-weight: bold;
}

.table-wrap { 
    overflow-x: auto; 
    -webkit-overflow-scrolling: touch; 
    margin: 1.5rem 0; 
}

@media (prefers-color-scheme: dark) {
  .matrix-table th, .matrix-table td { border-color: rgba(255,255,255,0.18); }
  .matrix-table th { background-color: rgba(255,255,255,0.06); }
}
</style>

# The Controller Board: A Custom Zynq Linux Host

This page documents the controller board for [my recreation of the Connection Machine](https://bbenchoff.github.io/pages/ThinkinMachine.html). This is the brains of the machine, the front end, and how you _control_ four thousand individual microcontrollers.

The original Connection Machine CM-1 didn't operate alone. It was really just a massive parallel accelerator attached to a front-end host, a Symbolics Lisp Machine if you were cool or a VAX if you weren't. This front-end machine was responsible for loading data in and out of the Connection Machine, dividing the machine up for some pseudo batch-processing, and running the main program to broadcast instructions into the massive black monolith. My machine is really no different, except instead of a Lisp Machine controlling everything, I'm stuffing a Linux SoC inside, and putting Ethernet, USB, and a DisplayPort output on the back of the machine. The front-end is integral here.

But this is not a job for a Raspberry Pi, an Allwinner chip, or anything 'normal'. The front-end of this machine needs dedicated serial channels to each of the sixteen individual cards in the hypercube. It needs to generate the [TDMA timing signals](https://bbenchoff.github.io/pages/HypercubeTDMA.html), and it runs the [StarC toolchain](https://bbenchoff.github.io/pages/StarC.html). Some of these can be accomplished with a simple Linux SoC, but multiple serial connections to each hypercube board (with some sort of DMA) and TDMA timing requires an FPGA.

So, I designed a custom supercomputer motherboard from scratch. 

## The Silicon Strategy: Designing for the Footprint

The heart of the controller board is an AMD/Xilinx Zynq UltraScale+ MPSoC. The specific part is the **XCZU2EG-2SFVC784I**.

Choosing this specific piece of silicon was a highly calculated exercise in balancing performance against the punishing physical constraints of my 1:1:1 aluminum cube enclosure.

* **The `EG` Architecture:** The `EG` designation means this chip includes the full Processing System: a **Dual-Core Cortex-A53** application processor, **Dual Cortex-R5F** real-time cores, and critically, the **Mali-400 MP2 GPU** for hardware-accelerated graphics. This gives me a smooth Linux desktop without burning FPGA fabric on a soft GPU.
* **The `-2` Speed Grade:** Speed grade 2 is the mid-tier bin, clocking the A53 cores at up to **1.5 GHz**. This runs at the standard 0.85V core voltage. Inside the sealed aluminum cube thermal management is still a concern, but the industrial-temperature rating (`I`, -40°C to +100°C) and the modest PL fabric of the ZU2 keep the total power envelope manageable.
* **The `SFVC784` Package:** This is the saving grace for the PCB layout. It is a 784-pin BGA, but critically, it has a **0.8mm ball pitch**. This kept me out of expensive High-Density Interconnect (HDI) microvia hell. I was able to route the fanout using standard 0.45mm/0.2mm "dog-bone" vias on a standard JLCPCB pool run.

### The Pin-Compatible Upgrade Path

The beauty of Xilinx’s UltraScale+ architecture is pin compatibility. Because I designed this entire motherboard around the 0.8mm `SFVC784` footprint, I could later drop in an **XCZU3EG** if I ever need quad-core A53 performance. Same package, same pinout, zero rerouting. For now, the dual-core ZU2EG with its integrated GPU is more than enough to run a Linux desktop while the real work happens in the FPGA fabric.

Because the Internet is going to compare this to a Raspberry Pi, let's do that now, instead. The XCZU2EG is a Dual-Core A53 with a Mali 400 GPU. These specs alone put it somewhere within spitting distance of a Raspberry Pi 3. However, the Pi 3 has LPDDR2 RAM, this board has 4GB of DDR4 RAM. The Pi 3 has 100 Mbit Ethernet, this board has Gigabit Ethernet. The Pi 3 has an SD card for storage, this board has has a 1TB NVMe drive connected over PCIe Gen2 x1, with about 500 MB/s of bandwidth. The Pi 3 has USB 2, this board has four ports of USB 3.0 with 5 Gbps of bandwidth. It also has an FPGA tacked onto it for talking to the "hypercube coprocessor". 

<div class="table-wrap">
<table class="matrix-table">
<tr>
  <th>Feature</th>
  <th>Raspberry Pi 4</th>
  <th>Zynq UltraScale+ (XCZU2EG)</th>
</tr>
<tr><td>CPU Architecture</td><td>Quad-core Cortex-A72</td><td>Dual-core Cortex-A53 + Mali-400 GPU</td></tr>
<tr><td>Hardware UARTs</td><td>6 (Max, shared with other I/O)</td><td>Effectively Infinite (FPGA Fabric)</td></tr>
<tr><td>Real-Time Processing</td><td>None (Linux Kernel overhead)</td><td>Dual Cortex-R5 Cores + FPGA Logic</td></tr>
<tr><td>Custom I/O Routing</td><td>Fixed to specific GPIO pins</td><td>Any signal to any of the 200+ PL pins</td></tr>
</table>
</div>

## System Memory: 4 Gigabytes of DDR4

There are two distinct memory domains in this machine. The entire 4,096-node hypercube possesses a grand total of **32 Megabytes** of distributed SRAM—a mathematically perfect match to the original 1985 CM-1. 

However, the Linux host needs real breathing room. I gave the Zynq 4 Gigabytes of system RAM using two **Micron MT40A1G16TB-062E** DDR4 chips. 

### Routing the Fly-By Topology
Because the Zynq requires a 32-bit memory bus to run the OS efficiently, and each Micron chip is 16-bits wide (x16), I had to place two chips side-by-side. 

Routing this was a *pain*. 

The lower 16 data bits (DQ0-DQ15) go point-to-point to Chip 1. The upper 16 data bits (DQ16-DQ31) go point-to-point to Chip 2. However, the address, command, and clock lines have to be routed in a **Fly-By Topology**. They exit the Zynq, hit the pads on the first RAM chip, continue along the same layer to the second RAM chip, and then terminate into 39.2-ohm resistors tied to a 0.6V VTT tracking regulator. Length-matching this on a custom 8-layer board to picosecond tolerances is exactly as stressful as it sounds.

## The Display Interface

The Zynq Processing System's hardened video controller outputs native DisplayPort. Rather than adding an expensive, hard-to-source active converter chip to translate to HDMI, I put a standard full-size **DisplayPort receptacle** (Foxconn 3VD51203-3D6A-7H) directly on the rear I/O panel. Two high-speed GTR lanes from Bank 505 drive the DisplayPort signal directly to the connector—no protocol conversion, no converter IC, no wasted board space. Users who need HDMI can use a standard $10 active DP-to-HDMI dongle.

The DisplayPort AUX channel (a bidirectional sideband for EDID and link training) is routed through MIO pins 27, 28, 29, and 30. MIO27 drives AUX data out through a 100Ω series resistor, MIO30 reads the return signal tapped from the same net, MIO29 controls the output enable, and MIO28 reads the Hot Plug Detect signal from the connector.

## The Operator Console: A Fabric-Owned Display Sidebar

The DisplayPort output is not just for running Ubuntu. Modern single-board computers hand the entire display to the operating system and call it a day — on this machine, the fabric claims part of the screen for itself, permanently, and Linux isn't even told it exists. The result is a hardware operator console that runs at all times and survives any software state, including complete kernel panics.

### The Partition

The physical DisplayPort link runs at **1920×1080 @ 60Hz**. Rather than handing all 2,073,600 pixels to Linux, the framebuffer is split into two vertical regions:

```
┌────────────────────────────────────────────────────┐
│  DisplayPort output: 1920×1080 @ 60Hz              │
│  ┌─────────────────────────────┬──────────────────┐│
│  │                             │ ┌──────────────┐ ││
│  │                             │ │              │ ││
│  │                             │ │  448×448     │ ││
│  │                             │ │  LED PANEL   │ ││
│  │   1440×1080 Ubuntu          │ │  MIRROR      │ ││
│  │   (4:3, Mali-400 GPU,       │ │  (7× exact)  │ ││
│  │    Xorg / Wayland)          │ │              │ ││
│  │                             │ └──────────────┘ ││
│  │                             │ ──────────────── ││
│  │                             │  TELEMETRY HUD   ││
│  │                             │  (fabric text    ││
│  │                             │   480×600)       ││
│  │                             │                  ││
│  └─────────────────────────────┴──────────────────┘│
│            Linux side                sidebar       │
│            (PS owns)              (fabric owns)    │
└────────────────────────────────────────────────────┘
```

- **Left region: 1440×1080** — exact 4:3 aspect ratio, the same aspect every 1980s workstation monitor had (VGA, Sun 3, NeXTstation, SPARCstation). This is what Linux/Xorg/Wayland sees as its entire display. The Mali-400 GPU renders the Ubuntu desktop into this region exactly as it would on any other machine. Applications, window managers, and the kernel framebuffer console believe the screen is 1440×1080 and nothing more.
- **Right region: 480×1080** — owned exclusively by the Programmable Logic. Split into two sub-regions: a **448×448 LED panel mirror** at the top (centered with a 16-pixel decorative border on each side) and a **480×600 telemetry HUD** below it. Linux has no knowledge of these pixels and no way to draw on them.

### How the Partition Works

The PS DisplayPort controller is configured for 1920×1080 and scans out a single contiguous framebuffer from DDR4. Linux is then told via the framebuffer driver that the screen is **1440×1080** but that the scanline stride is **1920 × 4 bytes = 7680 bytes** instead of the expected 5760. This is a standard trick: Xorg writes 1440 pixels per line, leaves the remaining 480 pixels of each scanline untouched, and the DP hardware happily pulls all 1920 pixels per line anyway. Linux has no idea the extra 480 pixels exist because they're outside the framebuffer size it was configured with.

A PL AXI master on one of the Zynq's High-Performance (HP) AXI ports writes directly into those otherwise-untouched 480 pixels per line. The DP controller, reading the same DDR4 region, scans the fabric-written pixels out on the right side of the display. Both writers (PS GPU on the left, PL DMA on the right) share the DDR4 memory controller but never touch each other's regions. Zero conflict, zero coordination, zero software involvement.

**This is the key architectural property:** the sidebar is not a Linux feature, not a kernel module, not an Xorg driver, not a userspace process. It is a hardware DMA master writing to a fixed memory region that the display controller happens to scan out. Nothing in the Linux software stack is aware it exists.

### The Out-of-Band Console Property

Because the sidebar is painted by a processor that shares nothing with the Linux side except the DDR4 memory controller, it **keeps running when Linux is dead**. When Ubuntu panics, when Xorg hangs, when the A53 cores livelock inside a kernel bug — none of it matters to the sidebar. The R5F core keeps reading telemetry and writing pixels, the DMA path keeps moving bytes to the framebuffer, and the DP controller keeps scanning it all out at 60Hz.

The user experience of a crashed system becomes:

- **Left side:** frozen desktop, last image before the crash
- **Right side:** **still updating.** Still mirroring the LED panel in real time. Still showing live temperatures, TDMA state, card health. Still posting event messages ("14:47:12 KERNEL PANIC — general protection fault").

This is exactly what enterprise servers call an **out-of-band management console**. IBM RSA, Dell iDRAC, HP iLO, Sun LOM — every major server vendor ships dedicated BMC silicon just to provide this feature, because the ability to see what's wrong *when the main OS can't tell you* is the difference between "five-hour remote debug session" and "oh, node 7 is on fire." Commercial servers pay hundreds of dollars of BOM cost for a dedicated BMC chip to get this.

This board gets it for free because the PL is already on the other side of the DP controller's DMA port. The BMC functionality is a side effect of where the fabric happens to sit in the memory hierarchy.

### The 448×448 LED Mirror

The top of the sidebar is a live mirror of the 64×64 front-panel LED display, scaled **7× exactly** to 448×448, centered in the 480-wide sidebar with a 16-pixel dark border on each horizontal edge. The integer scaling factor is deliberate: it's pixel-perfect with no interpolation artifacts, and the visible grid between upscaled pixels gives each LED a chunky, deliberate look. The 16-pixel border reads as a bezel around the mirrored display.

**The critical detail is where the mirror source comes from.** It is not the "intended framebuffer" the host library last pushed — because the RP2040 on the front panel is not a dumb slave. It runs its own animations, plays local video (Bad Apple, a Doom demo, boot splashes, idle screensavers), and composites host overlays on top of local content. At any moment, the RP2040 might be lighting up pixels the host never pushed. The only way to know what is *actually* on the physical panel is to ask the RP2040 directly.

So the mirror source is the **SPI MISO readback buffer**: every frame, the RP2040 streams its current framebuffer back to the Zynq over the LED SPI link's MISO line, along with a small status header (current mode, frame counter, underrun flag). The R5 reads that RX buffer in DDR4 every frame, applies the colormap LUT, and writes the scaled 7× mirror into the sidebar region of the DP framebuffer. The mirror is always showing what the RP2040 *reports it is actually displaying*, which is ground truth by construction.

See the "LED Display Pipeline" section below for the full bidirectional protocol. The short version: the SPI link is full-duplex, MOSI carries Zynq commands and optional push-framebuffers, MISO carries the RP2040's authoritative current framebuffer, and the mirror reads from MISO.

This matters because it means the mirror is *always correct in every mode*:

- When a StarC job is running and the panel shows the thermal map, the mirror shows the thermal map → a live portrait of the 4,096 compute nodes
- When the machine is idle and the RP2040 is playing Bad Apple, the mirror shows Bad Apple → your operator console literally has a music video on it
- When a job starts, the R5 sends a mode-change command, the panel snaps to thermal mode, and the mirror snaps with it in the same frame
- When the RP2040 composites a host overlay on top of local content (e.g., "JOB DONE" banner over the idle animation), the mirror shows the composite → whatever the LEDs are showing, the mirror is showing

The "portrait of the hypercube" property is now correctly framed as **a mode the machine can be in**, not a permanent guarantee. When the panel is in thermal mode, the sidebar is a portrait of the machine. When the panel is in Bad Apple mode, the sidebar is Bad Apple. Both are correct reflections of physical reality. The HUD text *below* the mirror is independent and always shows the live machine state regardless of what the LED panel is doing, so the "telemetry about the machine" property is preserved in the HUD even when the LED mirror is showing a music video.

Implementation is cheap. The R5 already has AXI access to DDR4, so it reads the SPI RX buffer in place. A colormap LUT lives in R5 TCM (256 entries × 3 bytes = 768 bytes, negligible). The R5 applies the LUT to each of 4,096 bytes and writes 49 pixels per LED (7×7 nearest-neighbor expansion) into the sidebar region of the DP framebuffer. Total fabric cost for this block: **zero** — it all happens on the R5. The fabric only needs to provide the SPI slave peripheral (which it already does) and the DMA master writing into the framebuffer region (shared with the HUD renderer).

Update rate: match the LED panel at 60 fps, frame-locked to the RP2040's refresh clock. Because the RP2040 drives the SPI transaction on its own v-sync and the Zynq's SPI slave latches the frame immediately, and because the R5 is running a tight loop waiting for that data, there is **sub-frame latency** between the physical front panel and its mirror — typically one 16.6 ms frame in the worst case, often less. Wave your hand in front of the cube, the LEDs update, the mirror updates on the very next monitor refresh.

This is what gives you the canonical demo: you run a Mandelbrot render, and on the same monitor you see your terminal on the left and a live thermal portrait of the hypercube computing it on the right, updating in lockstep with the physical panel you can also see on the front of the machine. And when the machine is idle, you glance up at the operator console and it's playing Bad Apple on the right side while your desktop is on the left, and that is somehow *even better*.

### The 480×600 Telemetry HUD

Below the mirror sits a text-mode operator console. At an 8×16 VGA font, that's **60 columns × 37 rows** of monospace text — enough for a serious telemetry display. A sample layout:

```
════════════════════════════════════════════════════════════
  ████████ ██   ██ ██ ███    ██ ██  ██ ██ ███    ██
     ██    ██   ██ ██ ████   ██ ██ ██  ██ ████   ██
     ██    ███████ ██ ██ ██  ██ ████   ██ ██ ██  ██
     ██    ██   ██ ██ ██  ██ ██ ██ ██  ██ ██  ██ ██
     ██    ██   ██ ██ ██   ████ ██  ██ ██ ██   ████
                    C O N N E C T I O N
                     M A C H I N E  II
  S/N 0001                              FW 0.4.2-alpha
════════════════════════════════════════════════════════════
 SYSTEM
   uptime         04d 17h 23m 41s
   load avg       0.42  0.38  0.35
   zynq psu       52°C    pl fabric   67°C
   ddr4           41°C    nvme        44°C
   hostname       thinkin.local       ip  192.168.1.217
════════════════════════════════════════════════════════════
 HYPERCUBE
   cards          16 / 16  ALIVE
   nodes          4096 / 4096  ALIVE
   tdma           RUNNING    1 kHz    phase  7 / 12
   backplane      OK   0 errors / hour
════════════════════════════════════════════════════════════
 CURRENT JOB   mandelbrot_4k
   progress     ████████████████▒▒▒▒   82.4%
   started      14:32:17    elapsed  00:04:18
   nodes busy   4096        phase    collect
════════════════════════════════════════════════════════════
 THERMAL
   hottest      card 07 node 243    78°C
   coolest      card 11 node 001    49°C
   fan rpm      2400  2380  2410  2390
════════════════════════════════════════════════════════════
 INTEGRITY
   cosmic rays  12 hits / 24h   (sipm cpm: 0.14)
   sem scrub    0 errors corrected
   uart frames  0 errors / hour
════════════════════════════════════════════════════════════
 LAST EVENT
   14:36:35  job mandelbrot_4k dispatched to all 16 cards
════════════════════════════════════════════════════════════
```

Every value on that HUD comes from a different part of the system, and every source is already memory-mapped on the AXI bus:

| HUD Field | Source | AXI Slave |
| :--- | :--- | :--- |
| Uptime, load, hostname, IP | Linux → shared mailbox in DDR4 | Mailbox region |
| Zynq PS temp | Zynq System Monitor (SYSMON) | PS peripheral |
| PL fabric temp | XADC in PL | XADC block |
| DDR4 and NVMe temps | I2C temperature sensors | I2C controller |
| Card/node alive counts | Per-UART stats counters in PL | Stats block |
| TDMA state, phase, frame | TDMA controller | TDMA UIO block |
| Backplane error counts | Per-UART error counters | Stats block |
| Current job info | thinkin-daemon → mailbox | Mailbox region |
| Hottest/coolest nodes | Per-node temperature readings, gathered via AG32 telemetry through the UART control tree and cached in a thermal table | Thermal table in DDR4 |
| RP2040 display mode & frame counter | LED SPI MISO status header, updated every frame | LED SPI slave RX buffer |
| Fan RPM | Fan PWM/tach controller | Fan UIO block |
| Cosmic ray counter | SiPM counter (if cosmic ray detector is fitted) | Counter block |
| SEM scrub errors | Xilinx Soft Error Mitigation IP | SEM IP block |
| UART frame errors | Per-UART error counters | Stats block |
| Event log | thinkin-daemon → ring buffer in DDR4 | Event ring |

**Not a single one of these readings goes through the Linux kernel.** The HUD renderer reads straight from the AXI slaves and writes pixels straight into the DP framebuffer. The Linux side only contributes to fields that are *only* knowable from userspace (uptime, hostname, current job) and it writes those into a mailbox region that the HUD polls. Everything else is pure fabric.

### The HUD Renderer: The Cortex-R5F

The telemetry HUD is rendered by **one of the Zynq's Cortex-R5F real-time cores**, not by a soft processor in fabric. This is free silicon: the R5F cores are part of the XCZU2EG's Processing System, they've been sitting in the chip the whole time, and until now nothing on the board was using them. They run at up to 600 MHz, have their own TCM (tightly-coupled memory), their own caches, their own interrupt controller, and their own power domain separate from the A53 cluster — meaning the R5 survives A53 crashes by design.

The R5 runs a FreeRTOS image that does nothing except:

1. Read the telemetry values from memory-mapped AXI slaves and PS peripherals (SYSMON, XADC, fan controller, stats counters)
2. Read the LED SPI slave's **MISO RX buffer** — the authoritative current framebuffer streamed back from the RP2040 every refresh
3. Format telemetry into strings with `sprintf`-style code
4. Blit characters from a font ROM into the sidebar region of the DP framebuffer in DDR4
5. Upscale the RP2040's reported 64×64 framebuffer 7× into the top 448×448 of the sidebar
6. Sleep for ~16ms (for a 60Hz update rate) and repeat

Because the R5 has direct AXI access to DDR4 and to the LED SPI slave peripheral, it reads the MISO RX buffer in place. This is the **actual, authoritative** current panel content (see the "LED Display Pipeline" section later in the document for why this has to come from the RP2040's readback rather than from a host-written framebuffer). The R5 applies the colormap LUT and writes the scaled mirror into the sidebar region of the DP framebuffer. Zero copies, minimal fabric logic.

The R5 is used instead of a soft core because it is flatly better for this job in every dimension: it's already in the silicon (no fabric cost), it runs ~12× faster than a PicoRV32 at fabric clock rates, it has a hard FPU, it has a full Xilinx BSP with FreeRTOS and lwIP support, and Xilinx explicitly supports "A53 runs Linux + R5 runs FreeRTOS" as a first-class AMP (Asymmetric Multiprocessing) configuration with published reference designs.

The sidebar becomes, in effect, **a completely self-contained embedded system running inside the Zynq PS**, with its own CPU, its own firmware, its own memory, and its own display output. Its sole function is to render the operator console and run the BMC services described in the next section, and it does so independently of anything the A53 cluster is doing. When Linux crashes, the R5 doesn't notice and doesn't care. It just keeps drawing pixels and answering network requests.

### The Killer Demo

The demo that sells this feature:

> Power on the machine. The DisplayPort output shows a boot progress HUD on the right side while U-Boot text scrolls up the left. Ubuntu boots, the desktop appears on the left at 1440×1080 — and the right sidebar has been live the whole time, showing the fabric coming up, cards enumerating one by one, the LED mirror filling in as each card flashes its firmware at boot. You start a Mandelbrot render. The left side is your terminal; the top-right LED mirror shows the fractal forming across the hypercube in real time; the bottom-right telemetry shows the progress bar climbing, the hottest nodes lighting up in the thermal section, elapsed time ticking up. You `kill -9` the X server. The Ubuntu side freezes. **The sidebar keeps going.** You watch the Mandelbrot job finish on the sidebar while the desktop is dead.

### Implementation Cost

| Component | Cost | Notes |
| :--- | :--- | :--- |
| Cortex-R5F core | **free** | Already in silicon; currently unused |
| R5 firmware (FreeRTOS + HUD renderer) | ~50 KB compiled | Lives in PS OCM + DDR4 |
| AXI HP master / DMA engine | ~500 LUTs | Shared with other fabric blocks; writes into the sidebar DDR4 region |
| 7× LED mirror scaler + colormap LUT | ~200 LUTs + 1 BRAM | Can also run on the R5 directly — either works |
| Font ROM (8×16 VGA, 256 glyphs) | 4 KB of R5 firmware | No fabric needed — R5 blits characters from its own RAM |
| Telemetry AXI slaves (counters, stats) | ~1,000 LUTs total | Shared with other fabric instrumentation |
| **Total fabric** | **~1,700 LUTs + 1 BRAM** | **~4% of ZU2EG fabric** |

The fabric cost is dramatically lower than a soft-core approach because the R5 is already in the PS and needs no fabric resources at all. The remaining PL logic is just the DMA master and the telemetry AXI slaves, both of which are shared with other fabric instrumentation work.

On the Linux side, the only change is a framebuffer driver patch to set the scanline stride to 1920 while reporting a resolution of 1440×1080. This is a handful of lines in the DTS file. No kernel rebuilding, no driver development.

### Why This Is Worth Doing

Most features on a board like this are either "hardware that makes the software possible" or "hardware that the software exposes to users." The sidebar HUD is a rare third category: **hardware that is better than the software because the software can't reach it**. It's immune to the entire Linux software stack, which means it's immune to every class of bug that plagues every other display on every other computer. Your monitor keeps telling you the truth about the machine even when the machine is lying to itself.

This is the feature that turns the controller board from "a well-engineered embedded host" into a piece of computing *theater*. It belongs on this machine.

## The BMC: Putting the Cortex-R5F to Work

Once you commit to running the HUD on the R5F, the R5 is already a separate processor with its own power domain, running its own RTOS, reading telemetry, and writing pixels that survive Linux crashes. At that point, asking "what *else* could the R5 do while it's awake?" has exactly one answer: **everything a commercial server BMC does.** And when you go through the list of what HP iLO, Dell iDRAC, IBM RSA, and Sun LOM actually provide, the answer turns out to be: services the R5 can already run with no hardware changes to the board whatsoever.

### What a BMC Is, and Why Commercial Silicon Costs Extra

A Baseboard Management Controller is the "second computer" inside a server that exists specifically to manage the first one. It has:

- Its own small CPU, separate from the host CPU
- Its own network interface with its own MAC and IP address
- Its own firmware (usually a tiny Linux or FreeRTOS)
- The ability to read host telemetry (temperatures, fan speeds, voltages) via sideband buses
- The ability to power-cycle the host, reset it, and observe its serial console
- A web interface you can point a browser at
- Remote console access (VNC-style or proprietary)
- A command shell accessible over SSH

Every enterprise server made in the last 20 years has one. HP calls theirs Integrated Lights-Out (iLO). Dell calls theirs the integrated Dell Remote Access Controller (iDRAC). IBM has RSA. Supermicro has IPMI-over-LAN. Sun called theirs LOM. They all do the same thing — they give a remote administrator a way to reach the machine *when the main operating system can't tell them what's wrong*, which is precisely when it matters most.

Commercial BMC silicon is a separate chip on the motherboard (typically an ASPEED AST2500/AST2600 or similar), with its own RAM, its own flash, its own Ethernet PHY, its own jack on the back of the server, and its own license fee. HP charges extra for "iLO Advanced" to unlock the full feature set. Dell charges $399 for an "iDRAC Enterprise" license. The chips themselves add tens of dollars to the BOM.

**All of that is free on this board because the R5F is already in the silicon, and the rest is just firmware.**

### Zero PCB Changes Required

The key architectural fact: everything in this section is implementable **without changing a single component or trace on the controller board**. The R5F core is already there. The Gigabit Ethernet PHY is already there. The RJ45 is already there. The DDR4 is already there. The only things that change are:

1. A new FreeRTOS firmware image for the R5, loaded alongside Linux at boot
2. A one-time GEM queue partitioning in the FSBL (First Stage Bootloader) so the R5 can own a hardware queue
3. A device tree change on the Linux side to yield specific GEM queues to the R5

No components added. No components moved. No traces re-routed. No second PHY. No second RJ45. **The feature is entirely firmware-side.**

### The Shared-GEM Architecture

The Zynq UltraScale+ GEM has hardware support for this exact use case. Each GEM peripheral has up to 16 independent DMA queues, each with its own descriptor ring and interrupt line. The GEM's **Type 1/Type 2 Screener** hardware classifies incoming packets by destination MAC address, VLAN tag, IP address, or protocol, and routes them to specific queues automatically. Different CPU cores can then own different queues with zero software coordination.

The configuration is documented in Xilinx UG1137 (the Zynq UltraScale+ MPSoC Software Developer Guide) and XAPP1306 (Using Ethernet and the OpenAMP Framework), which publishes a reference design for exactly this case: **Linux on the A53 cluster shares GEM3 with FreeRTOS on the R5F core, with each OS owning a subset of the DMA queues, and the GEM's on-chip Screener routing packets to the right queue based on destination MAC address.**

```
                    ┌────────────────────┐
                    │   RTL8211EG PHY    │
                    │   (existing chip)  │◄────► RJ45 (existing)
                    └─────────┬──────────┘
                              │ RGMII (existing MIO38-51)
                    ┌─────────▼──────────┐
                    │   Zynq GEM3        │
                    │   ┌────────────┐   │
                    │   │ Screener   │   │  Hardware classifier
                    │   │ (MAC addr  │   │  routes incoming
                    │   │  matching) │   │  packets by MAC
                    │   └──┬──────┬──┘   │
                    │      │      │      │
                    │  Queues  Queues    │
                    │  0-1     2-3       │
                    └──┬─────────┬───────┘
                       │         │
                       ▼         ▼
                ┌──────────┐  ┌──────────┐
                │ A53 /    │  │ R5F /    │
                │ Linux    │  │ FreeRTOS │
                │ 192.168. │  │ 192.168. │
                │   1.100  │  │   1.101  │
                └──────────┘  └──────────┘
                   user         BMC
                   traffic      traffic
```

At runtime, the FSBL configures GEM3 with:
- **Queues 0–1** assigned to the A53 cluster, DMA rings in A53-owned DDR4
- **Queues 2–3** assigned to the R5F, DMA rings in R5-owned DDR4
- **Screener Type 1** rules: packets with destination MAC = Linux's MAC → queues 0–1; packets with destination MAC = BMC's MAC → queues 2–3; broadcast/multicast → mirrored to both

Linux boots, its GEM driver takes ownership of queues 0–1, pulls DHCP, gets its IP address, behaves like a normal Linux machine on the network. The R5 boots in parallel, its lwIP stack takes ownership of queues 2–3, pulls its own DHCP lease with a different MAC, gets a different IP, and comes up as an independent network endpoint.

**The two operating systems never coordinate at runtime.** Linux's packets and the BMC's packets ride in separate DMA rings, serviced by separate interrupts, processed by separate CPUs, with the hardware Screener doing the multiplexing. Neither OS can see the other's packets, neither OS has to share buffers, and neither OS has to run a software forwarding loop.

This is a documented, Xilinx-supported configuration. It requires zero PCB changes. It requires zero custom hardware. It requires a FreeRTOS image, an lwIP configuration, a device tree tweak, and some FSBL configuration. That is the entirety of the hardware cost.

### Better Than Commercial BMC Sideband Sharing

Enterprise servers that share a single physical RJ45 between the host NIC and the BMC do it through a sideband protocol called **NC-SI (Network Controller Sideband Interface)**, where the BMC sits behind the main NIC and passes packets through it over a dedicated control bus. This has a subtle but important flaw: if the main NIC firmware crashes or its driver misbehaves, the BMC loses network access because its packets are riding on the main NIC's infrastructure.

Commercial vendors call this "shared LOM mode" and offer "dedicated mode" (a second physical port, separate NIC) as the higher-reliability alternative. Real sysadmins frequently pick dedicated mode because shared LOM has caused real outages.

**This board's shared-GEM scheme is architecturally better than shared LOM.** The Screener and the DMA queues are GEM hardware features, below any software. The BMC's traffic does not pass through Linux code, Linux buffers, or Linux driver logic. It doesn't even pass through a shared memory queue. The packets are classified in the GEM silicon itself and dispatched directly to the R5's DMA rings. The only shared component is the GEM peripheral, which has no software to crash.

The only genuine shared failure mode is the GEM hardware itself getting into a wedged state — which, since the GEM is a hardened ARM IP block with decades of silicon hardening behind it, is vanishingly unlikely compared to a firmware crash in a sideband controller. And even in that failure mode, the R5 has full access to GEM3's control registers and can reset the peripheral without needing the A53s to cooperate.

You are, by accident, building a BMC architecture that is *more independent* than what HP charges extra for.

### Two MAC Addresses, Two IP Addresses, One Cable

From the outside, the machine looks like two hosts on the network sharing a physical uplink:

- **Main system:** MAC derived from Zynq eFuse serial, IP via DHCP, mDNS hostname `thinkin.local`, runs Ubuntu
- **BMC:** MAC derived from Zynq eFuse serial + 1, IP via DHCP, mDNS hostname `thinkin-bmc.local`, runs FreeRTOS

Any computer on the LAN can reach either independently:

```
$ ping thinkin.local
64 bytes from thinkin.local (192.168.1.100): icmp_seq=1 ttl=64 time=0.8 ms

$ ping thinkin-bmc.local
64 bytes from thinkin-bmc.local (192.168.1.101): icmp_seq=1 ttl=64 time=0.4 ms

$ ssh user@thinkin.local               # Ubuntu shell
$ ssh bmc@thinkin-bmc.local            # FreeRTOS BMC shell
$ curl http://thinkin-bmc.local/       # BMC web dashboard
```

Your router, your home switch, and your DHCP server all see two independent clients. None of them know or care that the two clients are riding on the same physical cable. No VLANs, no tagging, no coordination — just two MACs, the way Ethernet has always worked when multiple devices share a segment.

### What Runs on the BMC

Once the R5 has an IP address, the service stack falls into place. All of these are small by modern standards — FreeRTOS + lwIP + these services fits comfortably in 1 MB of compiled code, running out of a combination of R5 TCMs and a dedicated DDR4 region.

**HTTP dashboard on port 80.** A tiny embedded HTTP server (the kind that ships with every FreeRTOS port) exposes:

```
GET  /                     → HTML dashboard, live-updating sidebar view
GET  /sidebar.png          → PNG snapshot of the current 480×1080 sidebar
GET  /led.png              → PNG snapshot of the 64×64 LED panel
GET  /telemetry.json       → All telemetry as JSON
GET  /events               → Server-Sent Events stream of the event log
GET  /eventlog?n=100       → Last N events as JSON
POST /power/reset          → Hardware reset the main system (A53)
POST /power/cycle          → Full power cycle
POST /power/hypercube/off  → Cut hypercube power, leave BMC up
POST /job/kill             → Abort the current StarC job
POST /fans/set?speed=80    → Override fan duty cycle
```

Anyone on the LAN can open `http://thinkin-bmc.local/` in a browser and see a live dashboard identical in content to the physical sidebar on the machine's own monitor — same LED mirror, same telemetry, same event log, same fonts. The difference is that this dashboard is reachable from any computer on the network, including when Linux is dead.

**VNC / RFB server on port 5900.** A minimal RFB (Remote Framebuffer) server running on the R5 reads the sidebar framebuffer region directly from DDR4 and streams it as VNC rectangles. Point any VNC client at `thinkin-bmc.local:5900` and you get a live, pixel-perfect remote mirror of the physical operator console, streamed over TCP. This is literally what HP iLO calls "Integrated Remote Console" — they charge extra for it. You get it because the sidebar framebuffer already exists and the R5 already has access to it.

**SSH server on port 22 — the BMC shell.** An embedded SSH server (wolfSSH or Dropbear in cutdown form) drops you into a FreeRTOS command-line interface:

```
$ ssh bmc@thinkin-bmc.local
=== THINKIN MACHINE BMC / FreeRTOS 10.5 ===
bmc> status
  uptime       04d 17h 23m
  linux        ALIVE  pid 1 (systemd) responding
  hypercube    16/16 cards, 4096/4096 nodes
  tdma         RUNNING 1 kHz phase 7
  temps        psu=52°C pl=67°C ddr4=41°C nvme=44°C

bmc> temps --all
  zynq psu        52°C
  zynq pl         67°C    <─── from XADC
  ddr4            41°C
  nvme            44°C
  hottest node    card 07 node 243   78°C
  coolest node    card 11 node 001   49°C

bmc> fans
  fan0  2400 rpm  45% duty
  fan1  2380 rpm  45% duty
  fan2  2410 rpm  45% duty
  fan3  2390 rpm  45% duty

bmc> eventlog -n 5
  14:32:17  job mandelbrot_4k dispatched (4096 nodes)
  14:36:35  job mandelbrot_4k complete (4m 18s)
  14:37:02  linux syslog: sshd accepted connection from 192.168.1.42
  14:39:11  thermal reading card 07 node 243 peaked at 78°C
  14:43:27  BMC ssh session opened from 192.168.1.42

bmc> console
[attaches to the Linux PS UART0 console — you can now interact with the
 Linux boot messages, kernel panic output, or rescue shell even though
 Linux has no working Ethernet of its own]

bmc> power reset
  resetting main system...
  PS_SRST_B asserted
  waiting for FSBL...  OK
  U-Boot running...    OK
  kernel handoff...    OK
  linux alive again
  done. (took 47s)

bmc> quit
Connection to thinkin-bmc.local closed.
```

**Serial-over-LAN (SOL).** The R5 owns a bridge between the Linux PS UART0 (MIO8–9, the Linux console) and the network. When you type `console` in the BMC shell, your SSH session becomes transparent to the Linux kernel's serial console output. You can watch Linux boot, observe kernel panic messages, interact with U-Boot, type into an emergency shell — **all over the network, through the BMC, with no working Linux network stack**. Enterprise vendors call this "Serial over LAN" or "iLO Virtual Serial Port" and it is the single most useful BMC feature in existence for debugging a machine that is half-dead.

**Prometheus exporter on port 9100.** Standard Prometheus text format, scrapable by any Prometheus server, graphable in Grafana:

```
# HELP thinkin_uptime_seconds Seconds since power-on
# TYPE thinkin_uptime_seconds counter
thinkin_uptime_seconds 376421

# HELP thinkin_temp_celsius Temperature readings
# TYPE thinkin_temp_celsius gauge
thinkin_temp_celsius{sensor="psu"} 52
thinkin_temp_celsius{sensor="pl"} 67
thinkin_temp_celsius{sensor="ddr4"} 41
thinkin_temp_celsius{sensor="nvme"} 44

# HELP thinkin_hypercube_cards_alive Number of live compute cards
# TYPE thinkin_hypercube_cards_alive gauge
thinkin_hypercube_cards_alive 16

# HELP thinkin_hypercube_nodes_alive Number of live AG32 nodes
# TYPE thinkin_hypercube_nodes_alive gauge
thinkin_hypercube_nodes_alive 4096

# HELP thinkin_tdma_phase Current TDMA phase (0-11)
# TYPE thinkin_tdma_phase gauge
thinkin_tdma_phase 7

# HELP thinkin_tdma_frequency_hz TDMA clock frequency
# TYPE thinkin_tdma_frequency_hz gauge
thinkin_tdma_frequency_hz 1000

# HELP thinkin_fan_rpm Fan tachometer readings
# TYPE thinkin_fan_rpm gauge
thinkin_fan_rpm{fan="0"} 2400
thinkin_fan_rpm{fan="1"} 2380
thinkin_fan_rpm{fan="2"} 2410
thinkin_fan_rpm{fan="3"} 2390

# HELP thinkin_job_progress_ratio Current job completion 0.0-1.0
# TYPE thinkin_job_progress_ratio gauge
thinkin_job_progress_ratio 0.824
```

Your homebrew supercomputer fits into a standard Prometheus + Grafana monitoring stack as a first-class citizen, graphable alongside everything else in your lab or home.

**Syslog forwarding and persistence.** Linux's rsyslog forwards to the BMC. The BMC writes log messages into a circular buffer in its own DDR4 region and periodically flushes them to the QSPI flash. When Linux crashes hard enough to corrupt its own log files, the BMC still has a record of what happened. When you want to see what happened during last night's crash at 3am, you SSH into the BMC, type `eventlog --since 03:00`, and read the full history — regardless of whether Linux's journal survived.

### The Killer Demo, Network Edition

The original sidebar demo was:

> Kill Xorg. Desktop freezes. Sidebar keeps going. Room gasps.

The BMC upgrades it:

> You power on the machine and plug it into Ethernet. Ubuntu boots on the left side of the monitor, the sidebar updates on the right side, and from your laptop across the room you open two browser tabs: `http://thinkin.local/` (Ubuntu's web services) and `http://thinkin-bmc.local/` (the BMC dashboard). Both load. You start a Mandelbrot render. The left side of the monitor shows your terminal, the right sidebar shows the thermal map forming across the hypercube, and *the BMC dashboard on your laptop shows exactly the same thing*, streamed over the network. You type `sudo pkill -9 Xorg` in the Ubuntu session. The desktop freezes. **The BMC dashboard on your laptop keeps updating in real time.** Your Ubuntu browser tab stops loading. The BMC browser tab keeps working. You `ssh bmc@thinkin-bmc.local`, type `console`, and see the Linux kernel's death rattle on your screen. You type `power reset`. You watch the reset happen both on the sidebar and on your laptop's BMC dashboard in sync. U-Boot runs, the kernel boots, Ubuntu comes back. **You did all of this without ever touching the main machine.**

That's not a homebrew project demo. That's a server demo. That's what an HP engineer would show you about iLO.

### Feature Parity with Enterprise BMC Silicon

| Feature | HP iLO 5 | Dell iDRAC 9 | This board |
| :--- | :---: | :---: | :---: |
| HTTP dashboard | ✓ | ✓ | ✓ |
| Live telemetry (temp, fans, power) | ✓ | ✓ | ✓ |
| Remote console (VNC/RFB) | ✓ | ✓ | ✓ |
| SSH BMC shell | ✓ | ✓ | ✓ |
| Serial-over-LAN | ✓ | ✓ | ✓ |
| Power control (reset, cycle) | ✓ | ✓ | ✓ |
| Event log (persistent) | ✓ | ✓ | ✓ |
| Syslog forwarding | ✓ | ✓ | ✓ |
| Network-independent of host OS | ✓ | ✓ | ✓ |
| Prometheus / SNMP telemetry | ✓ (license) | ✓ (license) | ✓ |
| Dedicated BMC network port | ✓ (extra hardware) | ✓ (extra hardware) | ✓ (shared via GEM Screener) |
| Survives host OS crash | ✓ | ✓ | ✓ |
| Hardware cost | Separate ASPEED chip | Separate chip | $0 (R5 already in silicon) |
| License fee | $$$ | $$$ | $0 |

The only features this board can't easily match are IPMI 2.0 over LAN (a specific IPMI stack implementation, which could be added but is largely obsolete in favor of Redfish) and virtual media redirection (mounting an ISO from the admin's laptop as a CD-ROM on the host, which would require USB gadget mode work). Everything else is straightforward FreeRTOS application code.

### Implementation Plan

All firmware and software work, no hardware:

1. **FSBL modification** — partition GEM3 into A53-owned queues (0–1) and R5-owned queues (2–3), configure the Screener for MAC-based routing. Xilinx provides a reference FSBL that already supports this; it's ~50 lines of C.

2. **R5 FreeRTOS application** — FreeRTOS kernel + lwIP + HTTP server + embedded SSH + RFB server + Prometheus exporter + HUD renderer + telemetry gathering state machine. Rough code size: 100–200 KB of compiled binary, living in a combination of R5 TCMs and a dedicated DDR4 region. Probably 3,000–5,000 lines of C total, most of which is boilerplate service handlers.

3. **Linux device tree changes** — declare GEM3 as `xlnx,shared-gem` (or equivalent) with queues 0–1 claimed, yielding queues 2–3 to the R5. Declare the R5's DDR4 region as reserved memory. Declare the DP framebuffer with a 1920 stride but 1440 resolution. Maybe 30 lines of DTS.

4. **Linux userspace daemon** — a small systemd service that writes live telemetry (uptime, load, job state, hostname, IP) into the shared mailbox region the R5 reads. Maybe 200 lines of Python.

5. **Boot orchestration** — U-Boot loads both the Linux kernel and the R5 FreeRTOS image, starts the R5 via the Zynq's remoteproc framework before handing off to the kernel. This is standard OpenAMP boot flow with published reference designs.

Total software effort: maybe two weeks of focused work by someone who already knows Xilinx AMP. Total hardware effort: **zero**. Total new BOM parts: **zero**. Total PCB changes: **zero**.

### The R5F Budget

| Subsystem | Runs On | Memory |
| :--- | :--- | :--- |
| Sidebar HUD renderer | R5 core 0 | 64 KB TCM + shared DDR4 framebuffer |
| LED mirror scaler | R5 core 0 | In the same loop as HUD |
| HTTP server + web dashboard | R5 core 0 | ~100 KB DDR4 |
| SSH server (Dropbear / wolfSSH) | R5 core 0 | ~150 KB DDR4 |
| VNC / RFB server | R5 core 0 | ~50 KB DDR4 |
| Serial-over-LAN bridge | R5 core 0 | Small buffers, shared with console |
| Prometheus exporter | R5 core 0 | ~20 KB DDR4 |
| Event log (circular buffer) | R5 core 0 | 256 KB DDR4 + periodic QSPI flush |
| FreeRTOS + lwIP kernel | R5 core 0 | ~200 KB DDR4 |
| Thermal trip watchdog | R5 core 1 (or fabric) | Minimal, runs independently |
| Fan control PID loop | R5 core 1 (or fabric) | Minimal |

The machine has two R5F cores. Core 0 runs the full BMC + HUD stack. Core 1 is left either idle for future use, or runs the absolute-safety functions (thermal trip, fan emergency) in a tiny bare-metal loop with no dependencies on anything else. The full stack fits comfortably in the roughly 128 KB of R5 TCM + whatever DDR4 is allocated to the R5 (a few megabytes is more than enough).

### Why This Section Exists

At some point during the design of this board, the R5F cores went from "a bullet point in the silicon spec sheet that I picked because the price was right" to "the single most useful piece of silicon on the entire machine." They give you a full enterprise BMC, a fabric-independent sidebar renderer, a network-accessible operator console, and a set of services indistinguishable from what commercial server vendors charge hundreds of dollars in license fees to unlock — and they give it to you with zero additional hardware, zero PCB changes, and zero soft logic in the FPGA fabric.

The XCZU2EG is a ~$80 chip that includes, as a casual side effect of being a Zynq UltraScale+, a dual-core Cortex-A53 workstation CPU, a Mali-400 GPU, a dual-core Cortex-R5F real-time cluster, 47,000 LUTs of FPGA fabric, and a hardware DisplayPort controller. I originally picked it for the FPGA and the A53. The R5 cores came along for free and now they run the BMC. Nothing in the Zynq UltraScale+ lineup is wasted on this board — every block is doing a job, and some blocks are doing two.

This is why I will never go back to using an off-the-shelf single-board computer for a project like this. A Raspberry Pi does not have a BMC. A Jetson does not have a BMC. An Odroid does not have a BMC. The only way to get one is to build one yourself, and the only reason I can build one is because the Zynq gave me the hardware for free.

## The 16-Channel Routing Nightmare

Here is the exact reason a standard single-board computer could never run this machine: **I have to talk to 16 separate hypercube boards simultaneously.**

Each of the 16 compute cards requires its own independent, high-speed serial channel (RX/TX) to pass instructions, load StarC binaries, and retrieve data. Each AG32 node on every compute card exposes a dedicated UART0 control interface — this is the permanent link between the Zynq host and every node in the hypercube. The host uses this link for everything: flashing firmware via the AG32 serial bootloader at 460800 baud, loading StarC binaries, broadcasting run commands, and collecting results. The protocol is pure UART, 8N1, because that's what the AG32 silicon speaks natively.

As mentioned, Linux is terrible at this. So, I bypassed the CPU entirely. I went into the FPGA fabric (the Programmable Logic) and manually instantiated **16 independent hardware UART MACs**. I wired these MACs directly to the AXI memory interconnect. 
* The Linux kernel just sees a block of memory addresses. 
* When the ARM core wants to send a command to Card #12, it drops a payload into a specific memory address and walks away. 
* The FPGA hardware picks it up and blasts it out over the physical pins flawlessly, with zero CPU overhead.

### Physical Pin Allocation: HD Banks 25 and 26

All 16 UART channels are routed through the Zynq's **High-Density (HD) I/O banks**. The AG32 nodes run at 3.3V LVCMOS, and the HD banks (Banks 24, 25, 26, and 44) are the only PL banks on the XCZU2EG that support 3.3V signaling. The High-Performance (HP) banks (64, 65, 66) are limited to 1.8V and are reserved for future expansion.

The 32 UART signals (16 TX + 16 RX) are split across two banks:

* **Bank 25** carries Cards 0–7 (16 pins: 8 TX + 8 RX)
* **Bank 26** carries Cards 8–15 (16 pins: 8 TX + 8 RX)

This split keeps the fanout balanced and avoids overloading a single bank's I/O driver budget. Each bank is powered at **3.3V VCCO** with bulk and per-pin decoupling, matching the AG32's native logic levels — no level shifters required.

The remaining HD pins on Banks 24 and 44 are allocated to the TDMA phase clock outputs, the LED display SPI interface, and the quad-fan PWM array — all of which also run at 3.3V.

All 41 signals (32 UART + 5 TDMA + 4 LED SPI) exit the controller board through a single **100-pin shrouded IDC header** at 1.27mm pitch (2x50) connected to the backplane via a 2-inch ribbon cable. The fine pitch keeps the connector compact while providing 100 pins — enough for every signal to have its own dedicated adjacent ground return, with 18 spare pins. At this cable length and at UART baud rates, no termination resistors are needed — the signals are clean 3.3V LVCMOS driven straight from the PL fabric.

## The Orchestrator: TDMA Sync and the LED Display

The 16 compute cards are just the engines. The Zynq also has to conduct the rest of the orchestra.

First, there is the **TDMA Synchronization**. To prevent the 4,096 RISC-V chips from talking over each other, the entire machine runs on a globally synchronized Time Division Multiple Access (TDMA) schedule. Linux is terrible at microsecond-accurate timing because of kernel preemption. But the FPGA fabric? It *only* operates in hard, deterministic real-time. The PL fabric generates a flawless, jitter-free master phase clock and distributes it across the backplane to all 16 cards simultaneously. 

Second, there is the **LED Display**. The 64x64 front panel is controlled by an RP2040. The Zynq needs to blast display state data to that RP2040 fast enough to maintain a 60fps refresh rate. I spun up a dedicated **SPI master** in the FPGA fabric, running on **HD Bank 24**, wiring it directly to the front-panel connector. The SPI bus carries four signals: SCK, MOSI (Zynq→RP2040), MISO (RP2040→Zynq), and CS. At 60fps, the 64×64 display requires 4,096 pixels per frame — at even a modest SPI clock rate, this is well within the bandwidth budget. The RP2040 receives the frame buffer over SPI, handles the LED multiplexing and PWM drive locally, and the Zynq never thinks about individual LEDs.

## High-Speed Storage: The M.2 NVMe Slot

You cannot run a bare-metal supercomputer head-node off a micro SD card. If this machine is going to host its own job queues, compile StarC payloads natively, buffer massive datasets, and act as a cloud-accessible compute server, it needs real, high-bandwidth solid-state storage. So, I put an M.2 slot on the back of the board.

Adding NVMe to this specific Zynq package is a zero-sum game of transceiver math. The chip has exactly four High-Speed PS-GTR transceivers in Bank 505. Two of those lanes are permanently burned running the DisplayPort video out. That left me with just enough bandwidth to route a single **PCIe Gen2 x1** link to an M-Key M.2 connector. 

It maxes out around 500 MB/s. It won't break modern PCIe Gen4 benchmark records, but it provides ultra-low latency, native NVMe support, and lets Ubuntu boot in seconds. 

### Surviving the Clocking Trap

Routing the 100-ohm differential TX and RX pairs was the easy part (along with dropping the mandatory 0.1µF AC coupling capacitors on the transmit lines). The real trap with PCIe on a custom Zynq board is the clocking. 

Bank 505 needs highly stable reference clocks to drive those transceivers, and different protocols demand different frequencies. The PCIe specification strictly demands a **100 MHz HCSL reference clock** with incredibly low jitter, while DisplayPort and USB 3.0 both require a **27 MHz** reference. You cannot synthesize both from the same crystal. To solve this, I dropped two dedicated differential LVDS oscillators onto the board: a **SiTime SIT9121AI-2B1-33E27.000000** (27 MHz, LCSC C17415818) routed to `PS_MGTREFCLK0` (F23/F24) for DisplayPort and USB 3.0, and a **YXC OA1EL89CEIB112YLC-100M** (100 MHz, LCSC C7425450) routed to `PS_MGTREFCLK1` (E21/E22) for PCIe. Both share the same PQFD-6L 3.2x2.5mm footprint, placed adjacent to the Zynq Bank 505 balls. Without those clean clocks, neither the display nor the drive will enumerate.

Toss in a dedicated, high-current 3.3V switching buck converter to handle the massive 3-Amp power spikes that NVMe drives pull during write operations, and the board is transformed from an embedded controller into a fully self-contained workstation.

## By the Numbers: Bandwidth and Bottlenecks

Building a custom supercomputer host is ultimately an exercise in routing math. You have a finite number of pins, a finite number of high-speed transceivers, and a massive amount of data that needs to move between the Linux environment and the 65,536-core hypercube without bottlenecking.

Here is the exact mathematical breakdown of how the data flows through the XCZU2EG, and the physical constraints that dictate the speed of the machine.

| Subsystem | Interface / Protocol | Theoretical Maximum | The Hardware Reality |
| :--- | :--- | :--- | :--- |
| **System Memory** | 32-bit DDR4-2400 | **9.6 GB/s** | The SFVC784 package physically lacks the pins for a full 64-bit memory bus. By filling the available 32-bit bus with two 16Gb Micron chips, the dual-core A53 has a massive 4GB memory pool, but bandwidth is strictly capped at ~9.6 Gigabytes per second. |
| **High-Speed Transceivers** | PS-GTR (Bank 505) | **4 Total Lanes** | This is the most constrained resource on the board. 2 lanes are burned for the DisplayPort video output. 1 lane is dedicated to the PCIe NVMe slot. The final lane is reserved for USB 3.0 superspeed routing. |
| **NVMe Storage** | PCIe Gen2 x1 | **500 MB/s** | Because we only have one GTR lane left in the budget, the M.2 slot operates at PCIe Gen2 x1. While 500 Megabytes per second is modest for modern NVMe drives, it completely eclipses the latency and throughput of an SD card for native compiling. |
| **Hypercube Backplane** | 16x Custom FPGA MACs | **16 Gbps (Aggregate)** | To feed 16 separate compute cards, the Programmable Logic instantiates 16 independent hardware UARTs bypassing the Linux kernel. If each lane runs at 1 Gigabit, the FPGA fabric can blast 16 Gigabits of payload data per second directly into the array. |
| **Video Output** | 2-Lane DisplayPort 1.2 | **10.8 Gbps** | Driving 2-lane DisplayPort directly to the rear-panel connector requires zero conversion silicon, providing enough bandwidth to render the Mali-400 GPU desktop at 4K 30Hz or 1080p 60Hz. |

### The Silicon Budget

The math above illustrates the brutal realities of hardware engineering. Every feature is a trade-off. 

To get the 0.8mm BGA pitch that makes routing this 8-layer board economically viable, I had to sacrifice the 64-bit DDR bus found on 900+ pin packages. To get native NVMe storage for the job queue, I had to drop the PCIe link width down to a single lane. But by carefully allocating the four precious PS-GTR transceivers and offloading the 16-channel backplane routing entirely to the FPGA fabric, the board maximizes the physical limits of the silicon. It moves exactly as much data as it needs to, exactly when it needs to.

## The MIO Budget: Networking and the Ignition Key

While the DDR4, the NVMe drive, and the DisplayPort output hog all the high-bandwidth dedicated transceivers, a supercomputer still needs to talk to the outside world and manage basic housekeeping. 

Xilinx handles this through Multiplexed I/O (MIO). The Zynq has 78 dedicated pins (Banks 500-503) that can be dynamically assigned to internal, hardened hardware controllers inside the Processing System. The MIO budget on this board is fully allocated across six subsystems: QSPI boot flash, UART debug console, NVMe reset, MicroSD card, DisplayPort AUX, Gigabit Ethernet, and the USB ULPI PHY.

### The Gigabit Gateway
If this machine is going to operate as an edge-compute server taking job payloads from the internet, it needs a massive pipe to the network.

The Zynq Processing System includes four hardened Gigabit Ethernet MACs directly in the silicon, giving the Ubuntu kernel native, zero-overhead networking without burning CPU cycles on software drivers. I routed one of these MACs (GEM3) out through the MIO pins using the RGMII protocol to a dedicated physical transceiver (PHY) chip on the board. The Zynq handles the digital logic, the PHY handles the analog line coding, and the result is flawless, line-rate Gigabit Ethernet straight to the rear IO panel. When you plug a cable in, the host instantly pulls an IP address and is ready to accept SSH connections or web payloads.

The same GEM3 peripheral is also shared with the Cortex-R5F running the BMC, via hardware packet queue partitioning and the GEM's on-chip Screener. A single RJ45 on the back panel therefore carries **two independent network hosts**: Linux on the A53 cluster (hostname `thinkin.local`) and the BMC on the R5F (hostname `thinkin-bmc.local`), each with their own MAC address and IP address, visible to the LAN as two distinct clients on one cable. The hardware Screener classifies incoming packets by destination MAC and routes them to the correct CPU's DMA queues with zero software coordination. See "The BMC: Putting the Cortex-R5F to Work" for the full architecture.

### The Boot Chain: QSPI, SD, and JTAG

The M.2 NVMe drive is the primary storage engine, but the Zynq’s BootROM cannot read PCIe — it needs a simpler device to bootstrap from. To solve this, the board supports **three boot sources**, selectable at runtime via a 4-position DIP switch on the `PS_MODE[3:0]` pins:

| DIP Setting | MODE[3:0] | Boot Source | Use Case |
| :--- | :--- | :--- | :--- |
| All OFF | 0000 | JTAG | Board bringup — debugger pushes FSBL directly |
| SW1 ON | 0010 | QSPI Flash | Production — boots autonomously from soldered flash |
| SW0+SW1+SW2 ON | 0111 | MicroSD Card | Development — easy reflash from a laptop |

Each MODE pin has a 10kΩ pull-down resistor; the DIP switch overrides individual pins to 3.3V.

**QSPI Flash (Production Boot):** A dedicated QSPI flash chip on MIO0-5 holds the FSBL, U-Boot, and the PL bitstream. On power-up with MODE=0010, the BootROM reads the flash, initializes the Processing System, loads the FPGA fabric, and hands off to U-Boot. U-Boot then wakes up the PCIe transceivers and boots the full Ubuntu workstation OS from the NVMe drive at 500 MB/s. No removable media, nothing to come loose inside the sealed aluminum cube.

**MicroSD Card (Development Boot):** The microSD slot on MIO13-22 acts as the development ignition key. With MODE=0111, the same boot chain runs from the SD card instead. If I ever completely brick the QSPI while writing custom kernel drivers for the hypercube, I flip the DIP switch, pop in an SD card flashed on my laptop, and the board boots. No JTAG programmer required.

**JTAG (Debug Boot):** With MODE=0000, the BootROM halts and waits for a JTAG debugger to push the FSBL over the wire. This is strictly for initial bringup and low-level hardware debugging.

## Thermal Management: Quad-Fan PWM Array

To keep the Zynq and the 16-card hypercube cool inside the sealed aluminum chassis, the board features four standard 4-pin PWM fan headers. 

While the 12V power is provided directly from the main input rail, the control logic is handled by the FPGA fabric. By routing the PWM and Tachometer (Sense) lines to the Programmable Logic, the machine maintains deterministic cooling independent of the Linux kernel state. This allows for a hardware-level "fail-safe" where the fans default to 100% duty cycle if the system monitors detect a thermal runaway or a software hang.

## The Linux Software Stack: From AXI Peripherals to StarC Jobs

Everything described above is hardware — silicon, copper, and solder. But hardware without software is a paperweight. This section describes what happens on the other side of the AXI bus: the Linux environment that turns 16 serial ports, a TDMA clock generator, and a custom SPI master into a programmable supercomputer.

### The Device Tree: Stock IP for UARTs, UIO for Custom Blocks

The AXI peripherals split cleanly into two classes, and each class gets a different Linux integration strategy.

**Class 1 — Standard peripherals (the 16 backplane UARTs):**

The 16 hypercube control UARTs are instantiated as stock **Xilinx AXI UART Lite** IP blocks (`axi_uartlite`). This is a free Vivado IP block at roughly 150 LUTs per instance — 16 instances fit in about 5% of the ZU2EG's LUT budget — and critically, **mainline Linux ships a driver for it** at `drivers/tty/serial/uartlite.c`. Rolling a custom UART MAC was the original plan, but there is no reason to reinvent a peripheral that Linux already knows how to talk to.

Each UART is declared in the device tree as an `xlnx,xps-uartlite-1.00.a` device, with its own IRQ line routed through the Zynq's PL-to-PS interrupt fabric:

```
/* Device tree fragment — 16 instances, one per card */
hypercube_uart0: serial@a0000000 {
    compatible = "xlnx,xps-uartlite-1.00.a";
    reg = <0x0 0xa0000000 0x0 0x1000>;
    interrupts = <0 89 4>;
    interrupt-parent = <&gic>;
    clock = <100000000>;
    current-speed = <460800>;
    xlnx,data-bits = <8>;
    xlnx,use-parity = <0>;
};
/* ... through hypercube_uart15 at 0xa000f000, IRQ 104 */
```

The kernel mounts these as `/dev/ttyUL0` through `/dev/ttyUL15`. No custom kernel module, no `mmap()`, no register banging — the host library just opens them with `pyserial`, identical to talking to an Arduino over USB-serial. Every standard Linux serial tool works as well: `picocom /dev/ttyUL5` to interactively poke at card 5, `stty -F /dev/ttyUL3 460800` to reconfigure baud, `cat /dev/ttyUL7` to dump what card 7 is saying. The moment a 16-port design sits on mainline serial infrastructure, it inherits every tool and library ever written for Linux UARTs.

Interrupts are first-class. Each AXI UART Lite instance has its own IRQ wired to the Zynq's `IRQ_F2P` inputs (16 available, exactly enough). The kernel's uartlite driver handles RX-ready and TX-done interrupts automatically — userspace never polls. A blocking `read()` sleeps until data arrives, and the scheduler wakes the host library thread only when there's work to do. At 460800 baud × 16 channels (~7.4 Mbit/s aggregate during flashing), the dual-core A53 does not break a sweat.

If the AXI UART Lite's compile-time baud rate ever becomes limiting — it's set in Vivado at bitstream generation, not at runtime — the drop-in upgrade is **Xilinx AXI UART 16550** (`axi_uart16550`), a full 16550-compatible UART with a runtime baud divider, FIFOs, and a mainline Linux driver via `8250_of.c`. Costs ~500 LUTs per instance instead of 150, but still fits comfortably.

**Class 2 — Custom peripherals (TDMA, LED SPI, fan controller):**

The TDMA phase clock generator, the LED SPI master, and the fan PWM/tach controller have no analog in Linux's peripheral catalog. These are exposed as **Userspace I/O (UIO)** devices using the `generic-uio` driver:

```
tdma_ctrl: tdma@a0010000 {
    compatible = "generic-uio";
    reg = <0x0 0xa0010000 0x0 0x1000>;
    interrupt-parent = <&gic>;
    interrupts = <0 105 4>;
};

led_spi: spi@a0011000 {
    compatible = "generic-uio";
    reg = <0x0 0xa0011000 0x0 0x1000>;
};

fan_ctrl: fan@a0012000 {
    compatible = "generic-uio";
    reg = <0x0 0xa0012000 0x0 0x1000>;
};
```

The kernel creates `/dev/uio0`, `/dev/uio1`, and `/dev/uio2` for these three blocks. The host library `mmap()`s each register window directly. UIO is the correct abstraction here because each block has a single owner (the daemon), the access patterns are simple (TDMA start/stop, framebuffer push, fan duty update), and there's no existing kernel driver class to defer to.

The total custom kernel code for the entire controller board is **zero lines**. All 19 AXI peripherals (16 UARTs via mainline `uartlite` driver, 3 custom blocks via `generic-uio`) are handled by drivers that already exist in the Linux tree.

### The Host Library: How Linux Controls the Machine

The Python host library (`thinkin/machine.py`, documented in the [AG32 Gating Document](https://bbenchoff.github.io/pages/AG32Gating.html) as Software Milestone S3) is the single point of control for the entire hypercube. It maps directly onto the two Linux abstractions above — `pyserial` for the 16 stock UARTs, `mmap` for the 3 UIO blocks:

```python
import os
import mmap
import serial

class ThinkinMachine:
    def __init__(self, num_cards=16):
        # 16 stock serial ports — mainline kernel driver, pyserial client.
        # Identical to opening an Arduino over USB-serial.
        self.cards = [
            serial.Serial(f'/dev/ttyUL{i}', 460800, timeout=1)
            for i in range(num_cards)
        ]

        # 3 custom UIO peripherals — mmap the register windows.
        self.tdma    = self._mmap_uio('/dev/uio0', 0x1000)
        self.led_spi = self._mmap_uio('/dev/uio1', 0x1000)
        self.fans    = self._mmap_uio('/dev/uio2', 0x1000)

    def _mmap_uio(self, path, size):
        fd = os.open(path, os.O_RDWR | os.O_SYNC)
        return mmap.mmap(fd, size, mmap.MAP_SHARED,
                         mmap.PROT_READ | mmap.PROT_WRITE)

    def flash(self, firmware_path):
        # For each card: assert Boot0 + pulse NRST (via per-card I2C GPIO
        # expander on the backplane control bus), then stream firmware
        # through that card's pyserial handle and verify the echo.
        with open(firmware_path, 'rb') as f:
            payload = f.read()
        for card in self.cards:
            card.write(payload)
            card.read(len(payload))  # verify bootloader echo

    def load(self, data, dest_pvar):
        # Distribute data to all 4,096 nodes via control tree.
        # Each card's slice is written through its pyserial handle.
        ...

    def run(self):
        # Start TDMA phase clock via UIO register write.
        self.tdma[0:4] = (1).to_bytes(4, 'little')

    def collect(self, timeout=5.0):
        # Blocking reads on all 16 serial ports — the kernel wakes this
        # thread when bytes arrive. No polling, no wasted CPU.
        results = {}
        for i, card in enumerate(self.cards):
            results[i] = card.read_until(b'\n')
        return results

    def led_push(self, framebuffer):
        # Push 4,096-byte framebuffer to the LED SPI TX buffer with
        # command=PUSH. The RP2040 will display it on the next refresh
        # (assuming it is currently in HOST mode).
        self.led_spi[0] = CMD_PUSH
        self.led_spi[16:16+4096] = framebuffer

    def led_set_mode(self, mode):
        # Hand control back and forth between host-pushed content and
        # autonomous RP2040 playback. No framebuffer in the payload.
        # mode ∈ {'host', 'thermal', 'boot', 'badapple', 'doom', 'overlay'}
        self.led_spi[0] = MODE_COMMANDS[mode]

    def led_current_frame(self):
        # Read what the LED panel is ACTUALLY showing right now, as
        # reported by the RP2040 over MISO. This is ground truth — it
        # reflects physical reality whether the panel is showing a
        # Zynq-pushed thermal map, Bad Apple, Doom, or a boot animation.
        # The sidebar mirror on the operator console reads from this
        # same buffer.
        return bytes(self.led_spi[4096+16:4096+16+4096])

    def led_status(self):
        # Read the RP2040 status header: current mode, frame counter,
        # underrun flag, local-playing flag.
        return self.led_spi[4096:4096+16]
```

Every StarC host I/O primitive maps to a method on this class. When a StarC program calls `load_from_host(&input, 1)`, `load()` writes one float per node through the appropriate `pyserial` handle. When `store_to_host(&result, 1)` executes, `collect()` drains the results via blocking reads. When `led_set(brightness)` runs on a node, the result propagates up the control tree via UART, the host library batches these into a 4,096-byte framebuffer, and `led_push()` ships it to the RP2040 via the LED SPI TX window. `led_current_frame()` reads back whatever the RP2040 is *actually* displaying, which is the authoritative source for the sidebar mirror and for any user-visible "what is on the panel right now" queries.

The entire host library is around 300 lines of pure Python. No kernel module, no custom driver, no CFFI bindings, no `/dev/mem` — just `pyserial` and `mmap`, both available in the Python standard library or a single `pip install` away. This is *cleaner* than the alternatives: a Raspberry Pi with 16 USB-FTDI dongles would suffer from USB latency, hub topology pain, flaky connectors, and no hardware synchronization. The Zynq approach gives you 16 fully independent hardware UARTs, interrupt-driven, with zero custom code, and the exact same POSIX interface as any other Linux serial port.

### The Boot Sequence

When the machine powers on, the following happens in order:

1. **Zynq BootROM** reads the MicroSD card, loads FSBL (First Stage Boot Loader) and the PL bitstream. The FPGA fabric comes alive — all 16 AXI UART Lite instances, the TDMA controller, the LED SPI master, and the fan PWM array are now active. Fans spin at 100% (fail-safe default).
2. **U-Boot** initializes DDR4, wakes the PCIe transceiver, enumerates the NVMe drive.
3. **Ubuntu kernel** boots from NVMe. The device tree registers 16 `xlnx,xps-uartlite-1.00.a` serial ports (mainline driver) as `/dev/ttyUL0..15`, and `generic-uio` devices as `/dev/uio0..2` for the TDMA, LED SPI, and fan controllers. Gigabit Ethernet comes up, pulls DHCP. SSH is available.
4. **`thinkin-daemon`** starts as a systemd service. It opens the 16 serial ports with `pyserial`, `mmap()`s the three UIO register windows, runs a health check on each UART channel (sends a probe byte, checks for echo), and reports the number of live compute cards. It then opens a Unix socket for local job submission and an HTTP endpoint for remote submission.
5. **Flash firmware** — on first boot or after a firmware update, the daemon calls `machine.flash()` to program all 4,096 AG32 nodes. Each card's 256 nodes are flashed sequentially through that card's UART channel. Total flash time for the full machine is under five minutes.
6. **Ready** — the machine accepts StarC jobs. The TDMA clock is held stopped until a job is submitted.

### The Job Lifecycle

A StarC job flows through the following stages:

1. **Submit** — a user sends a `.starc` source file via SSH (`scp` + command) or the HTTP API.
2. **Compile** — the Zynq runs `starc_pp.py` to preprocess StarC into C, then `riscv-gcc` (installed on the NVMe) cross-compiles to an AG32 binary. This happens natively on the dual-core A53 — no external build server needed.
3. **Load** — `machine.load()` distributes input data to all 4,096 nodes through the 16 `/dev/ttyUL*` serial ports. Data flows Host → Card Controller → Nodes via the control tree.
4. **Run** — `machine.run()` enables the TDMA phase clock in the PL fabric via the TDMA UIO register. All nodes begin executing simultaneously. The FPGA generates the master phase clock and distributes it across the backplane — jitter-free, independent of Linux scheduling.
5. **Collect** — the host does a blocking `read()` on all 16 serial ports. As nodes complete their work and call `store_to_host()`, results stream back through the control tree, the kernel wakes the blocked reader threads, and `machine.collect()` assembles the complete result set without any polling.
6. **Display** — if the StarC program uses `led_set()`, the host library continuously writes LED state updates to the SPI master, and the RP2040 renders them on the 64x64 front panel at 60fps.

### TDMA Clock Control

The TDMA phase clock is the heartbeat of the entire machine. It is generated entirely in the PL fabric, but configured by Linux through AXI registers:

| Register | Address | Function |
| :--- | :--- | :--- |
| TDMA_ENABLE | 0xA001_0000 | Start/stop the phase clock (1=run, 0=halt) |
| TDMA_DIVIDER | 0xA001_0004 | Clock divider (sets phase rate: 100/1000/10000 Hz) |
| TDMA_PHASE | 0xA001_0008 | Current phase counter (read-only, 0–23) |
| TDMA_FRAME | 0xA001_000C | Superframe counter (read-only, counts from reset) |

When no job is running, the TDMA clock is halted. The host library writes `TDMA_DIVIDER` based on the StarC program's `star_set_phase_rate()` configuration, then sets `TDMA_ENABLE` to start execution. The PL fabric generates the phase select signals (`TDMA_PHASE[3:0]`) on Bank 44, which propagate through the backplane to every AG32's FPGA mux. Every node in the machine switches dimension links in lockstep, because the timing comes from hardware, not software.

### LED Display Pipeline

The LED display path is **bidirectional, full-duplex**. The SPI bus between the Zynq and the front-panel RP2040 carries a full framebuffer in each direction on every refresh: the Zynq tells the RP2040 what it wants displayed, and the RP2040 tells the Zynq what is actually on the panel right now.

This bidirectionality is necessary because the RP2040 is not a pure dumb slave. It runs its own animations, plays back local content (Bad Apple, a Doom playthrough, boot animations, idle screensavers), and composites host-pushed overlays on top of local content. At any given moment, the RP2040 is the authoritative source for what pixels are actually lit on the panel — the Zynq cannot know what the LEDs are showing unless the RP2040 tells it. The operator console sidebar mirror depends on this, because the mirror must reflect the physical panel state, not the host's intent.

**Data flow:**

```
Zynq command + optional framebuffer ──MOSI──►  RP2040 ──►  64×64 LED matrix
                                                  │
Zynq sidebar mirror  ◄──MISO── RP2040 current framebuffer + status
```

Every SPI transaction exchanges one full frame in each direction. The MOSI payload carries the Zynq's command byte (PUSH, NOP, MODE_HOST, MODE_THERMAL, MODE_BADAPPLE, MODE_DOOM, MODE_BOOT, MODE_OVERLAY, RESET) followed by an optional 4,096-byte framebuffer if the command is PUSH. The MISO payload carries a status header (current mode, frame counter, underrun flag) followed by the 4,096-byte framebuffer that the RP2040 is *currently lighting up* — ground truth for whatever the panel is showing this instant.

**Who is the master:** the RP2040 drives SCK and CS. This flips the conventional "Zynq as master, RP2040 as slave" arrangement, and it's deliberate. The RP2040 owns the LED refresh timer, so it knows when a frame is about to be latched into the panel drivers. Initiating the SPI transaction on the RP2040's own frame-refresh clock gives you free v-sync alignment — every readback corresponds to a specific, completed refresh cycle, with no tearing risk. The Zynq's fabric SPI core runs in slave mode, responding whenever the RP2040 strobes CS. Master/slave selection is a firmware configuration choice, not a wiring change; both modes use the same four wires (SCK, MOSI, MISO, CS) in the same directions.

**Modes of operation:**

| Mode | MOSI content | MISO content | Sidebar mirror shows |
| :--- | :--- | :--- | :--- |
| HOST (thermal map, job state) | Zynq pushes new frame | Echoed back | Host content (authoritative portrait of the hypercube) |
| LOCAL (Bad Apple, Doom, screensaver) | NOP commands | RP2040 local playback frames | Whatever the RP2040 is playing |
| OVERLAY | Zynq overlay framebuffer | Composited result | Host overlay on top of local content |
| BOOT | NOPs (Zynq not ready) | RP2040 boot animation | Boot animation |

The sidebar mirror in the operator console reflects **whatever the RP2040 reports it is actually showing**, which is always the physical truth of the LED panel regardless of which side is generating content. When the hypercube is running a StarC job, the panel is in HOST mode displaying the thermal map, and the sidebar is a live portrait of the 4,096 compute nodes. When the machine is idle, the panel drops into LOCAL mode playing Bad Apple, and the sidebar plays Bad Apple. When a job starts, the R5 sends a mode-change command, the panel snaps to HOST mode, and the sidebar follows. The HUD telemetry section below the mirror is independent of any of this — it always shows the machine state no matter what the LED panel is currently displaying.

**Bandwidth budget:** 4,096 bytes per direction × 60 Hz = 246 KB/s per direction, 492 KB/s bidirectional. At a 20 MHz SPI clock the link is running at ~20% utilization. At RGB888 (12,288 bytes per direction) it rises to ~60% utilization, still comfortable. There is plenty of headroom for any reasonable pixel format.

**The host library interface:**

```python
machine.led.push(framebuffer)        # send a new frame, command=PUSH
machine.led.set_mode('thermal')      # send mode change, no framebuffer
machine.led.set_mode('badapple')
machine.led.set_mode('doom')
machine.led.current_frame()          # read the RX buffer — what the LEDs
                                     # are actually showing right now
machine.led.status()                 # read RP2040 status header:
                                     # mode, frame counter, underruns
```

The host library reads `current_frame()` when it wants ground truth (e.g., for logging, screenshots, the sidebar mirror, or debugging an animation discrepancy). It calls `push()` only when it wants to override whatever the RP2040 is currently doing. `set_mode()` is used to hand control back and forth between host-driven content and autonomous RP2040 playback without having to keep streaming frames.

This pipeline also runs outside of StarC jobs. The daemon can push status patterns (boot animation, card health visualization, idle patterns), or it can simply issue `set_mode('badapple')` and let the RP2040 do its thing while the sidebar mirror dutifully reflects the playback in real time.

## Summary

This is a custom 8-layer 64-bit Linux motherboard. The Processing System runs Ubuntu, compiles StarC natively, and serves the network. The Programmable Logic handles the 16-channel backplane, TDMA synchronization, and LED display — all in deterministic hardware, independent of the kernel. Four PS-GTR transceiver lanes are fully allocated across DisplayPort, NVMe, and USB 3.0. The board boots from MicroSD, runs from NVMe, and memory-maps the entire 65,536-core hypercube directly into the Linux address space via AXI.

The original CM-1 required a VAX 11/780 or a Symbolics 3600 Lisp Machine as its front-end. This replaces that with a single 23mm BGA on a board that fits inside the cube.

## Appendix: Hardware Reference — Pin Mapping and Wiring Tables

This section documents the exact pin-level wiring between every major component on the controller board. Every connection listed here was routed by hand on an 8-layer PCB.

### Zynq Schematic Organization

The XCZU2EG-2SFVC784I symbol is split into 9 functional units across hierarchical schematic sheets, organized by Xilinx silicon bank:

| Unit | Sheet | Bank(s) | Pin Count | Function |
| :--- | :--- | :--- | :--- | :--- |
| A | PS_MIO | 500-503 | 105 | Ethernet RGMII, SD card, USB, UART, DP AUX |
| B | PS_DDR | 504 | 143 | DDR4 memory interface |
| C | PS_GTR | 505 | 24 | DisplayPort, PCIe NVMe, USB 3.0 |
| D | PL_Bank64 | 64 | 56 | Programmable Logic HP I/O |
| E | PL_Bank65 | 65 | 56 | Programmable Logic HP I/O |
| F | PL_Bank66 | 66 | 56 | Programmable Logic HP I/O |
| G | PL_HD | 24/25/26/44 | 104 | Programmable Logic HD I/O |
| H | Config | 0 | 8 | JTAG, boot mode, reset |
| I | Power_Zynq | NA | 233 | All VCC, GND, and NC pins |

### DDR4 Memory (PS_DDR Sheet)

Two **Micron MT40A1G16TB-062E** chips (U2 and U3) in 96-ball FBGA packages form a 32-bit DDR4-2400 bus. Data lines are point-to-point; address/command/clock lines are fly-by terminated with 39.2Ω resistor networks to a 0.6V VTT tracking regulator.

**Chip 1 (U2) — Lower 16 bits, point-to-point:**

| Zynq Signal | Zynq Ball | U2 Ball | U2 Signal |
| :--- | :--- | :--- | :--- |
| PS_DDR_DQ0 | AD21 | G2 | DQ0 |
| PS_DDR_DQ1 | AE20 | F7 | DQ1 |
| PS_DDR_DQ2 | AD20 | H3 | DQ2 |
| PS_DDR_DQ3 | AF20 | H7 | DQ3 |
| PS_DDR_DQ4 | AH21 | H2 | DQ4 |
| PS_DDR_DQ5 | AH20 | H8 | DQ5 |
| PS_DDR_DQ6 | AH19 | J3 | DQ6 |
| PS_DDR_DQ7 | AG19 | J7 | DQ7 |
| PS_DDR_DQS_P0 | AF21 | G3 | LDQS |
| PS_DDR_DQS_N0 | AG21 | F3 | LDQS# |
| PS_DDR_DM0 | AG20 | E7 | LDM#/LDBI# |
| PS_DDR_DQ8 | AF22 | A3 | DQ8 |
| PS_DDR_DQ9 | AH22 | B8 | DQ9 |
| PS_DDR_DQ10 | AE22 | C3 | DQ10 |
| PS_DDR_DQ11 | AD22 | C7 | DQ11 |
| PS_DDR_DQ12 | AH23 | C2 | DQ12 |
| PS_DDR_DQ13 | AH24 | C8 | DQ13 |
| PS_DDR_DQ14 | AE24 | D3 | DQ14 |
| PS_DDR_DQ15 | AG24 | D7 | DQ15 |
| PS_DDR_DQS_P1 | AF23 | B7 | UDQS |
| PS_DDR_DQS_N1 | AG23 | A7 | UDQS# |
| PS_DDR_DM1 | AE23 | E2 | UDM#/UDBI# |

**Chip 2 (U3) — Upper 16 bits, point-to-point:**

| Zynq Signal | Zynq Ball | U3 Ball | U3 Signal |
| :--- | :--- | :--- | :--- |
| PS_DDR_DQ16 | AC26 | G2 | DQ0 |
| PS_DDR_DQ17 | AD26 | F7 | DQ1 |
| PS_DDR_DQ18 | AD25 | H3 | DQ2 |
| PS_DDR_DQ19 | AD24 | H7 | DQ3 |
| PS_DDR_DQ20 | AG26 | H2 | DQ4 |
| PS_DDR_DQ21 | AH25 | H8 | DQ5 |
| PS_DDR_DQ22 | AH26 | J3 | DQ6 |
| PS_DDR_DQ23 | AG25 | J7 | DQ7 |
| PS_DDR_DQS_P2 | AF25 | G3 | LDQS |
| PS_DDR_DQS_N2 | AF26 | F3 | LDQS# |
| PS_DDR_DM2 | AE25 | E7 | LDM#/LDBI# |
| PS_DDR_DQ24 | AH27 | A3 | DQ8 |
| PS_DDR_DQ25 | AH28 | B8 | DQ9 |
| PS_DDR_DQ26 | AF28 | C3 | DQ10 |
| PS_DDR_DQ27 | AG28 | C7 | DQ11 |
| PS_DDR_DQ28 | AC27 | C2 | DQ12 |
| PS_DDR_DQ29 | AD27 | C8 | DQ13 |
| PS_DDR_DQ30 | AD28 | D3 | DQ14 |
| PS_DDR_DQ31 | AC28 | D7 | DQ15 |
| PS_DDR_DQS_P3 | AE27 | B7 | UDQS |
| PS_DDR_DQS_N3 | AF27 | A7 | UDQS# |
| PS_DDR_DM3 | AE28 | E2 | UDM#/UDBI# |

**Fly-by address/command/clock (Zynq → U2 → U3 → 39.2Ω to VTT):**

| Zynq Signal | Zynq Ball | DDR4 Pin | Function |
| :--- | :--- | :--- | :--- |
| PS_DDR_A0 | W28 | A0 (P3) | Address |
| PS_DDR_A1 | Y28 | A1 (P7) | Address |
| PS_DDR_A2 | AB28 | A2 (R3) | Address |
| PS_DDR_A3 | AA28 | A3 (N7) | Address |
| PS_DDR_A4 | Y27 | A4 (N3) | Address |
| PS_DDR_A5 | AA27 | A5 (P8) | Address |
| PS_DDR_A6 | Y22 | A6 (P2) | Address |
| PS_DDR_A7 | AA23 | A7 (R8) | Address |
| PS_DDR_A8 | AA22 | A8 (R2) | Address |
| PS_DDR_A9 | AB23 | A9 (R7) | Address |
| PS_DDR_A10 | AA25 | A10/AP (M3) | Address / Auto-Precharge |
| PS_DDR_A11 | AA26 | A11 (T2) | Address |
| PS_DDR_A12 | AB25 | A12/BC# (M7) | Address / Burst Chop |
| PS_DDR_A13 | AB26 | A13 (T8) | Address |
| PS_DDR_A14 | AB24 | WE#/A14 (L2) | Write Enable |
| PS_DDR_A15 | AC24 | CAS#/A15 (M8) | Column Address Strobe |
| PS_DDR_A16 | AC23 | RAS#/A16 (L8) | Row Address Strobe |
| PS_DDR_BA0 | V23 | BA0 (N2) | Bank Address |
| PS_DDR_BA1 | W22 | BA1 (N8) | Bank Address |
| PS_DDR_BG0 | W24 | BG0 (M2) | Bank Group |
| PS_DDR_ACT_N | Y23 | ACT# (L3) | Activate |
| PS_DDR_CK0 | W25 | CK (K7) | Clock+ |
| PS_DDR_CK_N0 | W26 | CK# (K8) | Clock- |
| PS_DDR_CKE0 | V28 | CKE (K2) | Clock Enable |
| PS_DDR_CS_N0 | W27 | CS# (L7) | Chip Select |
| PS_DDR_ODT0 | U28 | ODT (K3) | On-Die Termination |
| PS_DDR_PARITY | V24 | PAR (T3) | Parity |
| PS_DDR_RAM_RST_N | U23 | RESET# (P1) | DDR Reset |

**Per-chip passive components:**

| Component | Connection |
| :--- | :--- |
| ZQ (F9) on each chip | 240Ω resistor to ground (3 total including Zynq PS_DDR_ZQ at U24) |
| VREFCA (M1) on each chip | 10kΩ/10kΩ divider to VDDQ/2 (0.6V) + 100nF filter cap |
| TEN (N9) on each chip | Tied to ground |
| ALERT# (P9) on each chip | 10kΩ pullup to VDDQ, shared net to PS_DDR_ALERT_N (U25) |

**Unused Zynq DDR pins (no-connect):** PS_DDR_A17, PS_DDR_BG1, PS_DDR_CK1/CK_N1, PS_DDR_CKE1, PS_DDR_CS_N1, PS_DDR_ODT1, PS_DDR_DQ32–71, PS_DDR_DM4–8, PS_DDR_DQS_P4–8/N4–8.

### PS-GTR Transceiver Allocation (PS_GTR Sheet, Bank 505)

| GTR Lane | Function | Zynq TX+/TX- | Zynq RX+/RX- | Destination |
| :--- | :--- | :--- | :--- | :--- |
| Lane 0 | PCIe Gen2 x1 (NVMe) | E25/E26 | F27/F28 | M.2 M-Key Connector (J5) |
| Lane 1 | DisplayPort Lane 0 | D23/D24 | — | DP Connector (J6) Pin 1/3 |
| Lane 2 | DisplayPort Lane 1 | C25/C26 | — | DP Connector (J6) Pin 4/6 |
| Lane 3 | USB 3.0 SuperSpeed | B23/B24 | B27/B28 | TUSB8043A hub → 4x USB-A 3.0 |

### M.2 NVMe Slot (PCIe x1)

**Amphenol MDT275M02001** M-Key M.2 connector. PCIe Lane 0 only; Lanes 1–3 are no-connect.

| M.2 Pin | Signal | Connection |
| :--- | :--- | :--- |
| 49 (PETp0) | Drive TX+ | → PS_MGTRRXP0_505 (F27) |
| 47 (PETn0) | Drive TX- | → PS_MGTRRXN0_505 (F28) |
| 43 (PERp0) | Drive RX+ | ← PS_MGTRTXP0_505 (E25) via 0.1µF AC cap |
| 41 (PERn0) | Drive RX- | ← PS_MGTRTXN0_505 (E26) via 0.1µF AC cap |
| 55 (REFCLKp) | 100 MHz ref+ | From LVDS oscillator (YXC OA1EL89CEIB112YLC-100M) |
| 53 (REFCLKn) | 100 MHz ref- | From LVDS oscillator |
| 50 (PERST#) | PCIe Reset | Driven from Zynq MIO/PL GPIO |
| 52 (CLKREQ#) | Clock Request | 10kΩ pullup to 3.3V |
| 54 (PEWAKE#) | Wake | 10kΩ pullup to 3.3V |
| 69 (PEDET) | Presence Detect | 10kΩ pullup to 3.3V |
| 2,4,12,14,16,18,70,72,74 | +3.3V | Dedicated high-current 3.3V NVMe buck converter |

The 100 MHz LVDS oscillator also feeds PS_MGTREFCLK1P/N (E21/E22) on the Zynq for PCIe clock recovery.

### DisplayPort Output

**Foxconn 3VD51203-3D6A-7H** (J6) full-size DisplayPort receptacle (LCSC C2761456). 2-lane native DisplayPort from Zynq GTR.

| DP Pin | Signal | Connection |
| :--- | :--- | :--- |
| 1 | ML_Lane0+ | ← PS_MGTRTXP1_505 (D23) via 0.1µF AC cap |
| 3 | ML_Lane0- | ← PS_MGTRTXN1_505 (D24) via 0.1µF AC cap |
| 4 | ML_Lane1+ | ← PS_MGTRTXP2_505 (C25) via 0.1µF AC cap |
| 6 | ML_Lane1- | ← PS_MGTRTXN2_505 (C26) via 0.1µF AC cap |
| 15 | AUX_CH+ | MIO27 (TX out, 100Ω series) + MIO30 (RX in, tapped cable-side) |
| 17 | AUX_CH- | Ground |
| 18 | HPD | MIO28, 100kΩ pull-down |
| 20 | DP_PWR | 3.3V through ferrite bead |
| 7,9,10,12 | Lanes 2-3 | No-connect (2-lane config) |

MIO29 (AUX enable) tied to 3.3V via 10kΩ pullup.

### Gigabit Ethernet (PS_MIO Sheet)

**Realtek RTL8211EG-VB-CG** Gigabit PHY (QFN-64) connected via RGMII to Zynq GEM3 MAC. The internal 1.0V switching regulator is enabled (ENSWREG tied to 3.3V), so only a 3.3V supply is required externally.

**RGMII bus (Zynq → PHY):**

| Zynq MIO | Zynq Ball | Function | RTL8211EG Pin |
| :--- | :--- | :--- | :--- |
| PS_MIO38 | H18 | GEM_TX_CLK | 34 (GTX_CLK) |
| PS_MIO39 | H19 | GEM_TXD0 | 36 (TXD0) |
| PS_MIO40 | K18 | GEM_TXD1 | 39 (TXD1) |
| PS_MIO41 | J19 | GEM_TXD2 | 40 (TXD2) |
| PS_MIO42 | L18 | GEM_TXD3 | 41 (TXD3) |
| PS_MIO43 | K19 | GEM_TX_CTL | 35 (TXEN) |
| PS_MIO44 | J20 | GEM_RX_CLK | 24 (RXC) — 22Ω series resistor at PHY |
| PS_MIO45 | K20 | GEM_RXD0 | 19 (RXD0) |
| PS_MIO46 | L20 | GEM_RXD1 | 21 (RXD1) |
| PS_MIO47 | H21 | GEM_RXD2 | 22 (RXD2) |
| PS_MIO48 | J21 | GEM_RXD3 | 23 (RXD3) |
| PS_MIO49 | M18 | GEM_RX_CTL | 18 (RXDV/PHY_AD2) |
| PS_MIO50 | M19 | GEM_MDC | 53 (MDC) |
| PS_MIO51 | L21 | GEM_MDIO | 54 (MDIO) — 10kΩ pullup to 3.3V |

**GMII strap pins (sampled at reset, select RGMII mode):**

| RTL Pin | Signal | Strap |
| :--- | :--- | :--- |
| 25 | RXD4/SELRGV | 10kΩ to 3.3V (selects RGMII) |
| 27 | RXD5/TXDLY | 10kΩ to 3.3V (enables TX clock delay) |
| 28 | RXD6/RXDLY | 10kΩ to 3.3V (enables RX clock delay) |
| 29 | RXD7/AN0 | 10kΩ to 3.3V (autoneg: advertise all speeds) |
| 30 | RXER/AN1 | 10kΩ to 3.3V (autoneg: advertise all speeds) |
| 31 | COL/MODE | 10kΩ to GND (selects RGMII mode) |
| 47 | TXER | Direct to GND |

**Unused GMII pins (no-connect):** 42 (TXCLK), 43–46 (TXD4–TXD7), 32 (CRS), 1 (CLK125).

**PHY control and configuration:**

| RTL Pin | Signal | Connection |
| :--- | :--- | :--- |
| 38 | ~{PHYRST} | 10kΩ to 3.3V + 100nF to GND (RC power-on reset, ~1ms delay) |
| 56 | ~{INT} | 10kΩ pullup to 3.3V |
| 55 | ~{PME} | 10kΩ pullup to 3.3V |
| 58 | RSET | 12.1kΩ to GND (sets internal bias — value per Realtek spec) |
| 57 | ENSWREG | Tied to 3.3V (enables internal 1.0V switching regulator) |
| 3 | REG_OUT | 1µF + 0.1µF to GND (internal regulator output — do NOT connect elsewhere) |
| 64 | VDDREG | 0.1µF to GND (regulator bypass) |
| 61 | CKXTAL1 | 25 MHz crystal (YXC X322525MOB4SI, LCSC C9006) + 22pF load cap to GND |
| 62 | CKXTAL2 | 25 MHz crystal + 22pF load cap to GND |

**PHY address and LED pins (dual-function, strap at reset then LED output):**

| RTL Pin | Signal | Strap | LED Function | Connection |
| :--- | :--- | :--- | :--- | :--- |
| 50 | LED0/PHY_AD0 | 10kΩ to 3.3V (AD0=1) | Green LED (Link) | Cathode of green RJ45 LED |
| 51 | LED1/PHY_AD1 | 10kΩ to GND (AD1=0) | Yellow LED (Activity) | Cathode of yellow RJ45 LED |
| 52 | LED2 | — | Speed | NC or third LED |

PHY address = 0x01. LED anodes share a common 330Ω resistor to 3.3V.

**PHY to RJ45 jack (UDE RB1-125B8G1A, LCSC C363353):**

| RTL8211EG Pin | Signal | RJ45 Pin | Pair |
| :--- | :--- | :--- | :--- |
| 5 | MDI[0]+ | R2 | Pair A+ |
| 6 | MDI[0]- | R3 | Pair A- |
| 8 | MDI[1]+ | R4 | Pair B+ |
| 9 | MDI[1]- | R5 | Pair B- |
| 11 | MDI[2]+ | R6 | Pair C+ |
| 12 | MDI[2]- | R7 | Pair C- |
| 14 | MDI[3]+ | R8 | Pair D+ |
| 15 | MDI[3]- | R9 | Pair D- |

R1 (PHY-side center tap): 3.3V through ferrite bead + 0.1µF to ground. R10 (cable-side center tap): 0.1µF to ground.

**Power pins:**

| RTL Pin(s) | Signal | Rail |
| :--- | :--- | :--- |
| 10, 60 | AVDD33 | 3.3V + 0.1µF decoupling each |
| 20, 26, 37, 49 | DVDD33 | 3.3V + 0.1µF decoupling each |
| 7, 13, 59 | AVDD10 | Internal 1.0V (from ENSWREG regulator) + 0.1µF each |
| 33, 48 | DVDD10 | Internal 1.0V + 0.1µF each |
| 2, 4, 63, 65 | GND | Ground (pin 65 is exposed pad) |

### USB 3.0 — 4-Port Hub (PS_GTR + PS_MIO Sheets)

The Zynq has one USB 3.0 controller but no built-in USB 2.0 PHY. Two external chips are required: a **Microchip USB3300-EZK** ULPI PHY for USB 2.0 signaling, and a **TI TUSB8043A** 4-port hub to fan out to four USB-A 3.0 ports on the rear panel.

Signal path:

```
Zynq GTR Lane 3 (SS 5Gbps) ──────────────→ TUSB8043A pin 58/59 (upstream SS RX)
TUSB8043A pin 55/56 (upstream SS TX) ─────→ Zynq GTR Lane 3 RX
Zynq MIO52-63 (ULPI) → USB3300-EZK → D+/D- → TUSB8043A pin 53/54 (upstream USB2)
                                                    ├→ USB-A Port 1 (J7)
                                                    ├→ USB-A Port 2 (J8)
                                                    ├→ USB-A Port 3 (J9)
                                                    └→ USB-A Port 4 (J10)
```

**USB3300-EZK ULPI PHY — Zynq MIO connections:**

| Zynq MIO | Zynq Ball | Function | USB3300 Pin |
| :--- | :--- | :--- | :--- |
| PS_MIO52 | G18 | ULPI_CLK | CLKOUT |
| PS_MIO53 | D16 | ULPI_DIR | DIR |
| PS_MIO54 | F17 | ULPI_STP | STP |
| PS_MIO55 | B16 | ULPI_NXT | NXT |
| PS_MIO56 | C16 | ULPI_DATA0 | DATA0 |
| PS_MIO57 | A16 | ULPI_DATA1 | DATA1 |
| PS_MIO58 | F18 | ULPI_DATA2 | DATA2 |
| PS_MIO59 | E17 | ULPI_DATA3 | DATA3 |
| PS_MIO60 | C17 | ULPI_DATA4 | DATA4 |
| PS_MIO61 | D17 | ULPI_DATA5 | DATA5 |
| PS_MIO62 | A17 | ULPI_DATA6 | DATA6 |
| PS_MIO63 | E18 | ULPI_DATA7 | DATA7 |

USB3300-EZK D+ and D- outputs connect directly to TUSB8043A pins 53 (USB_DP_UP) and 54 (USB_DM_UP).

**TUSB8043A upstream SuperSpeed — Zynq GTR Lane 3:**

| TUSB8043A Pin | Signal | Connection |
| :--- | :--- | :--- |
| 58 | USB_SSRXP_UP | ← PS_MGTRTXP3_505 (B23) |
| 59 | USB_SSRXM_UP | ← PS_MGTRTXN3_505 (B24) |
| 55 | USB_SSTXP_UP | → PS_MGTRRXP3_505 (A25) |
| 56 | USB_SSTXM_UP | → PS_MGTRRXN3_505 (A26) |
| 53 | USB_DP_UP | ↔ USB3300-EZK D+ |
| 54 | USB_DM_UP | ↔ USB3300-EZK D- |
| 48 | USB_VBUS | 90.9kΩ to VBUS (5V), 10kΩ to GND (voltage divider) |

**TUSB8043A downstream ports — to four USB-A 3.0 connectors:**

| Port | SS TX+/- | SS RX+/- | D+/D- | Connector |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Pin 3/4 | Pin 6/7 | Pin 1/2 | J7 |
| 2 | Pin 11/12 | Pin 14/15 | Pin 9/10 | J8 |
| 3 | Pin 19/20 | Pin 22/23 | Pin 17/18 | J9 |
| 4 | Pin 26/27 | Pin 29/30 | Pin 24/25 | J10 |

**TUSB8043A clock:**

| Pin | Signal | Connection |
| :--- | :--- | :--- |
| 62 | XI | 24 MHz crystal + 1MΩ feedback resistor between XI and XO |
| 61 | XO | 24 MHz crystal (other leg) |

**TUSB8043A control and strap pins:**

| Pin | Signal | Connection |
| :--- | :--- | :--- |
| 50 | GRSTz | 10kΩ to 3.3V + 100nF to GND (RC power-on reset) |
| 49 | TEST | 10kΩ to GND |
| 64 | USB_R1 | 9.53kΩ 1% to GND (precision reference) |
| 41 | PWRCTL_POL | Strap per power switch polarity |
| 42 | GANGED | GND (per-port power control) |
| 40 | FULLPWRMGMTz | GND (enable power switching + overcurrent) |
| 45 | AUTOENz/HS_SUSPEND | 3.3V (disable auto-charge) |
| 39 | SMBUSz/SS_SUSPEND | 3.3V (I2C mode, or NC if no EEPROM) |
| 38 | SCL/SMBCLK | NC (no EEPROM) |
| 37 | SDA/SMBDAT | NC (no EEPROM) |
| 60 | NC | No connect |

**TUSB8043A per-port power and overcurrent:**

If not implementing per-port power switching, leave PWRCTL1-4 (pins 36, 35, 33, 32) unconnected and pull OVERCUR1-4z (pins 46, 47, 44, 43) to 3.3V with 10kΩ each.

**TUSB8043A power:**

| Pin(s) | Signal | Rail |
| :--- | :--- | :--- |
| 5, 8, 13, 21, 28, 31, 51, 57 | VDD | 1.1V (external regulator required) + 0.1µF each |
| 16, 34, 52, 63 | VDD33 | 3.3V + 0.1µF each |
| Thermal pad | VSS | GND |

### 16-Channel Backplane UARTs (PL HD Banks 25 and 26)

16 instances of **Xilinx AXI UART Lite** (`axi_uartlite`) instantiated in the Programmable Logic, each with its own AXI-Lite register window and dedicated IRQ line. Each channel is a dedicated TX/RX pair running at 460800 baud (compile-time configured in Vivado — for a runtime-configurable baud divider, substitute `axi_uart16550`). All pins are 3.3V LVCMOS, directly compatible with the AG32 UART0 control interface on each compute card.

These are stock Xilinx IP blocks with a mainline Linux driver — no custom RTL, no custom kernel code. See the "The Linux Software Stack" section above for the device tree and host library integration.

**Bank 25 — Cards 0–7 (VCCO = 3.3V):**

| Card | PL Signal | Direction | PL Bank | Backplane Pin | Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | UART_TX_0 | Output | 25 | Card 0 UART0_RX | Host TX → Node RX |
| 0 | UART_RX_0 | Input | 25 | Card 0 UART0_TX | Node TX → Host RX |
| 1 | UART_TX_1 | Output | 25 | Card 1 UART0_RX | Host TX → Node RX |
| 1 | UART_RX_1 | Input | 25 | Card 1 UART0_TX | Node TX → Host RX |
| 2 | UART_TX_2 | Output | 25 | Card 2 UART0_RX | Host TX → Node RX |
| 2 | UART_RX_2 | Input | 25 | Card 2 UART0_TX | Node TX → Host RX |
| 3 | UART_TX_3 | Output | 25 | Card 3 UART0_RX | Host TX → Node RX |
| 3 | UART_RX_3 | Input | 25 | Card 3 UART0_TX | Node TX → Host RX |
| 4 | UART_TX_4 | Output | 25 | Card 4 UART0_RX | Host TX → Node RX |
| 4 | UART_RX_4 | Input | 25 | Card 4 UART0_TX | Node TX → Host RX |
| 5 | UART_TX_5 | Output | 25 | Card 5 UART0_RX | Host TX → Node RX |
| 5 | UART_RX_5 | Input | 25 | Card 5 UART0_TX | Node TX → Host RX |
| 6 | UART_TX_6 | Output | 25 | Card 6 UART0_RX | Host TX → Node RX |
| 6 | UART_RX_6 | Input | 25 | Card 6 UART0_TX | Node TX → Host RX |
| 7 | UART_TX_7 | Output | 25 | Card 7 UART0_RX | Host TX → Node RX |
| 7 | UART_RX_7 | Input | 25 | Card 7 UART0_TX | Node TX → Host RX |

**Bank 26 — Cards 8–15 (VCCO = 3.3V):**

| Card | PL Signal | Direction | PL Bank | Backplane Pin | Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 8 | UART_TX_8 | Output | 26 | Card 8 UART0_RX | Host TX → Node RX |
| 8 | UART_RX_8 | Input | 26 | Card 8 UART0_TX | Node TX → Host RX |
| 9 | UART_TX_9 | Output | 26 | Card 9 UART0_RX | Host TX → Node RX |
| 9 | UART_RX_9 | Input | 26 | Card 9 UART0_TX | Node TX → Host RX |
| 10 | UART_TX_10 | Output | 26 | Card 10 UART0_RX | Host TX → Node RX |
| 10 | UART_RX_10 | Input | 26 | Card 10 UART0_TX | Node TX → Host RX |
| 11 | UART_TX_11 | Output | 26 | Card 11 UART0_RX | Host TX → Node RX |
| 11 | UART_RX_11 | Input | 26 | Card 11 UART0_TX | Node TX → Host RX |
| 12 | UART_TX_12 | Output | 26 | Card 12 UART0_RX | Host TX → Node RX |
| 12 | UART_RX_12 | Input | 26 | Card 12 UART0_TX | Node TX → Host RX |
| 13 | UART_TX_13 | Output | 26 | Card 13 UART0_RX | Host TX → Node RX |
| 13 | UART_RX_13 | Input | 26 | Card 13 UART0_TX | Node TX → Host RX |
| 14 | UART_TX_14 | Output | 26 | Card 14 UART0_RX | Host TX → Node RX |
| 14 | UART_RX_14 | Input | 26 | Card 14 UART0_TX | Node TX → Host RX |
| 15 | UART_TX_15 | Output | 26 | Card 15 UART0_RX | Host TX → Node RX |
| 15 | UART_RX_15 | Input | 26 | Card 15 UART0_TX | Node TX → Host RX |

Each AXI UART Lite instance occupies a 4 KB AXI-Lite register window. The Xilinx IP block exposes a standard register layout (RX FIFO at +0x00, TX FIFO at +0x04, STAT_REG at +0x08, CTRL_REG at +0x0C) that the mainline kernel driver knows how to drive. Base addresses are spaced at 0x1000 intervals for clean address decoding in the AXI Interconnect:

| Card | AXI Base Address | Linux Device | IRQ |
| :--- | :--- | :--- | :--- |
| 0  | 0xA000_0000 | `/dev/ttyUL0`  | 89  |
| 1  | 0xA000_1000 | `/dev/ttyUL1`  | 90  |
| 2  | 0xA000_2000 | `/dev/ttyUL2`  | 91  |
| ... | ... | ... | ... |
| 15 | 0xA000_F000 | `/dev/ttyUL15` | 104 |

Each instance has its own IRQ routed through Vivado IP Integrator to the Zynq's `IRQ_F2P` inputs (16 available, exactly consumed). The `drivers/tty/serial/uartlite.c` kernel driver handles all register access, FIFO management, and interrupt servicing — userspace talks to these through the standard POSIX serial API via `pyserial` or any other Linux serial library. No `/dev/mem`, no custom driver, no polling loops.

### LED Display SPI (PL HD Bank 24)

Dedicated **SPI slave** in the Programmable Logic, connected to the RP2040 LED controller on the front panel. The RP2040 is the SPI master; the Zynq fabric runs in slave mode. This inversion from the conventional arrangement gives free v-sync alignment because the RP2040 initiates transactions on its own LED refresh clock. All signals are 3.3V LVCMOS on HD Bank 24.

The SPI link is **full-duplex and bidirectional every frame**: MOSI carries a Zynq command byte plus an optional push-framebuffer; MISO carries an RP2040 status header plus the 4,096-byte framebuffer currently lit on the physical panel. The sidebar mirror in the operator console reads exclusively from the MISO RX buffer — whatever the RP2040 says is on the panel is authoritative, regardless of whether the RP2040 is displaying host-pushed content, a local animation, Bad Apple, Doom, or a boot splash. See the "LED Display Pipeline" section above for the full protocol and mode system.

| PL Signal | Direction | PL Bank | Connector Pin | Function |
| :--- | :--- | :--- | :--- | :--- |
| LED_SPI_SCK  | Input (slave) | 24 | Front-panel header | SPI clock, driven by RP2040 |
| LED_SPI_MOSI | Output | 24 | Front-panel header | Zynq → RP2040: command byte + optional push framebuffer |
| LED_SPI_MISO | Input  | 24 | Front-panel header | RP2040 → Zynq: status header + current physical framebuffer (full readback, 4 KB/frame) |
| LED_SPI_CS   | Input (slave) | 24 | Front-panel header | Chip select, driven by RP2040 at frame refresh boundaries |

### TDMA Phase Clock (PL HD Bank 44)

The master TDMA phase clock is generated in the PL fabric and distributed to all 16 compute cards via the backplane. The phase select lines encode the current TDMA phase, telling every AG32 node which dimension link is active.

| PL Signal | Direction | PL Bank | Function |
| :--- | :--- | :--- | :--- |
| TDMA_PHASE[0] | Output | 44 | Phase select bit 0 (to backplane) |
| TDMA_PHASE[1] | Output | 44 | Phase select bit 1 (to backplane) |
| TDMA_PHASE[2] | Output | 44 | Phase select bit 2 (extended for 12D) |
| TDMA_PHASE[3] | Output | 44 | Phase select bit 3 (extended for 12D) |
| TDMA_SYNC | Output | 44 | Frame sync pulse (marks phase 0) |

### Fan PWM Array (PL HD Bank 44)

Four-channel PWM fan controller in the PL fabric. Each fan header carries a PWM drive signal and a tachometer sense input. Fans default to 100% duty cycle if the PL fabric detects a thermal fault or software hang.

| PL Signal | Direction | PL Bank | Connector | Function |
| :--- | :--- | :--- | :--- | :--- |
| FAN_PWM_0 | Output | 44 | Fan header J11 | PWM drive (25 kHz) |
| FAN_TACH_0 | Input | 44 | Fan header J11 | Tachometer sense |
| FAN_PWM_1 | Output | 44 | Fan header J12 | PWM drive (25 kHz) |
| FAN_TACH_1 | Input | 44 | Fan header J12 | Tachometer sense |
| FAN_PWM_2 | Output | 44 | Fan header J13 | PWM drive (25 kHz) |
| FAN_TACH_2 | Input | 44 | Fan header J13 | Tachometer sense |
| FAN_PWM_3 | Output | 44 | Fan header J14 | PWM drive (25 kHz) |
| FAN_TACH_3 | Input | 44 | Fan header J14 | Tachometer sense |

### PL I/O Budget Summary

| PL Bank | Type | VCCO | Allocated Signals | Pins Used | Pins Remaining |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 24 | HD | 3.3V | LED SPI (4 pins) | 4 | ~22 |
| 25 | HD | 3.3V | Backplane UARTs 0–7 (16 pins) | 16 | ~10 |
| 26 | HD | 3.3V | Backplane UARTs 8–15 (16 pins) | 16 | ~10 |
| 44 | HD | 3.3V | TDMA phase clock (5), Fan PWM (8) | 13 | ~13 |
| 64 | HP | 1.8V | *Unallocated* | 0 | 56 |
| 65 | HP | 1.8V | *Unallocated* | 0 | 56 |
| 66 | HP | 1.8V | *Unallocated* | 0 | 56 |

## Backplane Region Buildout (Planned)

The board area between the Zynq BGA and the 100-pin backplane connector is currently empty. This section documents the signal conditioning, protection, and optional features that should populate that region. **Nothing in this section is currently in the schematic** — this is the design intent for the next round of schematic work, written so the next person (or LLM) picking up the project knows what belongs there and why.

The 49 backplane signals fall into six groups:

| Group | Count | Direction (FPGA POV) | Bank |
| :--- | :--- | :--- | :--- |
| UART_TX_0..15 | 16 | Output | 25/26 |
| UART_RX_0..15 | 16 | Input | 25/26 |
| SPI_SCK, SPI_MOSI, SPI_CS | 3 | Output | 24 |
| SPI_MISO | 1 | Input | 24 |
| TDMA_PHASE[0..3], TDMA_SYNC | 5 | Output | 44 |
| FAN_PWM_0..3 | 4 | Output | 44 |
| FAN_TACH_0..3 | 4 | Input | 44 |

Outputs from the FPGA: 28. Inputs to the FPGA: 21. Every signal is single-ended 3.3V LVCMOS, unidirectional, and runs at relatively low speed (≤10 MHz worst case for SPI; 460800 baud or slower for UART).

### Signal Conditioning and Protection (Required)

Every backplane signal should pass through three layers of protection between the Zynq and the IDC connector. This is not optional — the FPGA is a $200 BGA on a custom 8-layer board with no socket. Protection components are cheap insurance.

**Layer 1 — Series source termination (Zynq side, output lines only)**

A 22Ω 0402 resistor in series with every Zynq output, placed within ~5mm of the BGA. This is *not* about UART bit timing — it is about taming the ~1ns LVCMOS edge rates of the HD bank drivers. Without source termination, those edges will ring and overshoot at the receiver, couple into adjacent traces, and radiate as EMI from the ribbon cable.

Apply to all 28 output lines: 16× UART_TX, 3× SPI outputs, 5× TDMA, 4× FAN_PWM. Suggested part: RC0402FR-0722RL or equivalent.

Input lines (UART_RX, SPI_MISO, FAN_TACH) do not need series termination — the driver is on the other end of the cable.

**Layer 2 — Sacrificial unidirectional buffers (mid-board)**

Insert 74LVC244-style octal buffers between the Zynq and the connector. Every backplane signal is unidirectional, so simple 244-class buffers work — no bidirectional bus transceivers needed. The 74LVC244 has 8 independent buffers in two banks of four, each bank with its own active-low output enable. Direction within a chip can be mixed (each buffer has a distinct A→Y signal path), so a single chip can carry both FPGA-driven and backplane-driven lines.

Approximate chip count: **~6× 74LVC244** to cover all 49 signals (49 / 8 = 7, but with some packing efficiency 6 is achievable). Place them between the Zynq side (after the series resistors) and the connector side (before the TVS arrays).

Tie all OE# pins to a single "system ready" signal driven from a Zynq MIO GPIO (or PS_DONE). This keeps the entire backplane in high-Z during FPGA configuration so cards see clean idle instead of garbage transitions during boot.

The buffers serve three purposes:
- **Sacrificial protection** — a $0.40 chip absorbs damage instead of a $200 BGA bank
- **Defined startup state** via OE# control
- **Higher drive strength** if the ribbon cable is ever lengthened or replaced with something lossier

**Layer 3 — TVS diode arrays (connector side)**

Place a low-capacitance TVS array on every backplane signal, located within ~3mm of the IDC connector pins so the strike is clamped before it reaches any meaningful trace inductance. Trace length between the strike point and the clamp matters more than the diode response time.

Suggested part: **TPD4E1B06DCKR** (4-channel, 5pF, 5.5V working voltage) or PESD3V3L4UG. Roughly **13× quad arrays** to cover all 49 signals. Place each array directly under or adjacent to the connector pins it protects.

### Pull Resistors

Every input from the backplane should have a 10kΩ 0402 pull-up to 3.3V, placed on the Zynq side of the buffer:

- **16× UART_RX** — UART idles high. Pullups prevent noise from being interpreted as a start bit when a card is dead, missing, or in reset.
- **1× SPI_MISO** — prevents float when CS is deasserted.
- **4× FAN_TACH** — fan tach outputs are open-collector and require external pullups.

Total: 21 pull-up resistors.

### Test Points

Drop a test point on every backplane signal, placed between the buffer chip and the connector. SMD round test points (Keystone 5015 or similar 0.040" diameter pads) on a uniform grid. **This is critical for bringup** — you will be probing every line with a logic analyzer and a scope, and trying to clip onto 49 individual signals without dedicated test points is miserable.

In addition to individual test points, place a **2x25 0.05"-pitch shrouded header** that taps every backplane signal between the buffer and the connector. This gives you a single connector for a Saleae Logic Pro 16 / Kingst LA5016 / similar logic analyzer, so you can scope all 49 signals through one ribbon cable instead of 49 individual probes. Place it accessible from the top of the board for easy clip-on.

### Power Filtering for HD Banks

With up to 16 LVCMOS outputs potentially switching simultaneously on Banks 25 and 26, simultaneous switching output (SSO) noise on VCCO can be significant. Add a localized power island per bank:

- Ferrite bead (BLM18PG471SN1D, ~470Ω @ 100 MHz, 3A rated) between the main 3.3V plane and each local VCCO_25 / VCCO_26 / VCCO_24 / VCCO_44 island
- 10µF + 1µF + per-pin 100nF on the bank side of the bead

Cheap, takes minimal space, and noticeably quiets switching transients on bank power. Worth doing.

---

### Per-Card Reset and Boot Control (Currently Missing)

The host library's `flash()` method (`pages/ThinkinController.md` line ~263) describes "Assert Boot0 high, pulse NRST via GPIO" — but **the current schematic does not allocate any backplane pins or Zynq GPIO for these signals**. This is a real gap that must be closed before flashing will work.

Three options, in increasing complexity:

**Option A — Shared broadcast Boot0 + NRST (2 backplane pins, simplest)**

One global NRST and one global Boot0 broadcast to all 16 cards. The host puts the entire machine into bootloader mode in one operation, then flashes each card in parallel through its dedicated UART. After flashing, NRST is released and all cards run their new firmware simultaneously.

Limitation: cannot reset individual cards. If one card hangs mid-job, the only recovery is rebooting the whole machine. Acceptable if cards are reliable and recovery is rare.

Implementation: 2 additional output lines from PL Bank 44 (or any spare HD bank pin) → series R → buffer → TVS → backplane. Add to the 100-pin connector by reclaiming 2 of the 18 currently-spare pins.

**Option B — Per-card Boot0 + NRST via I2C GPIO expander (recommended)**

Add an I2C bus to the backplane (2 wires + GND = 3 pins) and place a PCA9555 16-bit I2C GPIO expander on each compute card. Each expander drives its own card's NRST and Boot0 locally. The host writes to the expanders over I2C to assert/release reset and bootloader mode on individual cards.

Bonus: the same I2C bus can carry temperature sensors, INA226 power monitors, EEPROM card-ID storage, and any future per-card slow-control signals.

Implementation: 2 additional MIO pins from the Zynq (one of the unused MIO64-77 range) brought out to backplane through buffers + TVS. Each card gets a PCA9555 with 4 address-strap pins to give it a unique I2C address.

This is the right answer. It costs 3 backplane pins instead of 32, scales to additional control signals, and keeps the master fully in control of every card individually.

**Option C — 32 dedicated GPIO lines (16 NRST + 16 Boot0)**

Direct point-to-point control. Most flexible, simplest software model, but requires 32 additional backplane pins + ~32 more grounds = 64 more connector pins. The current 100-pin IDC won't fit it; you would need to upgrade to a 200-pin or split into two connectors. Not recommended unless I2C is unworkable for some reason.

**Verdict:** implement Option B. It's the only one that scales and reuses existing connector pins.

---

### Optional Subsystems for the Empty Board Region

Beyond the required signal conditioning and the missing per-card reset control, the board area can host several independent subsystems. Each is genuinely useful; implement as appetite and complexity budget allow.

**Per-Card Power Monitoring (INA226 over I2C)**

If Option B above is implemented, you already have an I2C bus on the backplane. Add an INA226 current/voltage sensor on each compute card's power input. INA226 supports 16 selectable I2C addresses — exactly enough for 16 cards on a single bus. The host can then detect:
- Failed cards (zero current draw)
- Thermal runaway (current spike)
- Per-card power consumption for job profiling

Cost: ~$1.50/card for the chip + shunt resistor. High value for diagnostics.

**Per-Card Power Switching (Load Switches)**

Drop a TPS22918 or AP2161 load switch inline with each card's main power input, controlled from the same per-card PCA9555. This lets the host:
- Power-cycle a flaky card without rebooting the entire machine
- Sequentially bring up cards during boot to spread inrush current
- Cut power to cards that draw excessive current (closed-loop with INA226)

Combined with INA226, this gives you full per-card power management.

**RP2040 SWD Passthrough**

The RP2040 on the LED panel needs to be flashable. Currently there is no documented path. Add either:
- A passive SWD header routed through the front-panel connector to the RP2040's SWDIO/SWCLK pins, accessible from outside the cube
- An active path: Zynq MIO bit-banged SWD or an FT2232H USB-SWD bridge controlled by the host

The passive header is cheaper; the active path lets the host reflash the RP2040 over the network without opening the case. Worth doing.

**USB Debug Console (FT232 / CP2102)**

The current MIO map plans to bring out the UART0 console on MIO8-9 to a header. Upgrade this: add an FT232RL or CP2102N USB-serial bridge directly on the controller board, exposing the Zynq console as a micro-USB or USB-C port on the rear panel. Plug a laptop in, get a console — no 3.3V USB-TTL dongle needed.

This is independent of the four USB 3.0 host ports — the FT232 acts as a USB *device* on a separate connector.

**External Watchdog Timer**

The Zynq has internal watchdogs, but they share fate with the silicon they're trying to reset. An external watchdog (TPS3823, MAX6369) tied to PS_SRST_B gives you a true hardware reset path if the kernel locks hard enough to disable internal watchdogs. A userspace daemon toggles a Zynq GPIO every second; if the toggle stops for >1.6s, the watchdog yanks SRST and the whole system reboots.

**Battery-Backed RTC**

The Zynq has no battery-backed RTC. Add a DS3231 (I2C) + CR2032 holder. Without this, every power-on starts at 1970-01-01 until NTP catches up — bad for log timestamping and useless if the machine ever runs offline.

**Status / Diagnostic LEDs**

A bank of LEDs visible inside the cube or on the rear panel, driven from PL GPIO via a TLC59116 I2C LED driver (16 channels, brightness control, $1):
- 16× per-card link/activity LEDs (one per UART channel — blink on TX/RX)
- 1× Zynq heartbeat
- 1× TDMA running indicator
- 1× thermal warning
- 1× job-in-progress

Charlieplexed alternatives use fewer driver pins but are harder to debug. TLC59116 is the easy path.

**Front-Panel Buttons**

Reset and mode-select pushbuttons routed through a 74HC14 Schmitt-trigger debouncer (with RC) to Zynq GPIO. Useful for forcing reboots without yanking power or holding the SD card eject.

**Ambient Light Sensor (BH1750 / VEML7700)**

I2C ambient light sensor lets the LED display auto-dim. ~$0.50 of parts. Cute and slightly useful.

**Small OLED Status Display**

A 0.96" or 1.3" I2C OLED visible through a slot in the cube showing:
- IP address
- Boot status / kernel version
- Last job ID and result
- CPU/FPGA temperature
- Number of live cards

Lets you operate the machine headless without `nmap`-ing your network to find it. ~$3 of parts.

**Spare HD Bank Breakout**

Banks 25, 26, and 44 have ~10–13 unused pins each (per the I/O budget table above). Bring them out to a 0.1" header for future expansion — extra GPIO, additional UARTs, debug signals. Free real estate that's currently wasted.

---

### Implementation Priority

If implementing in passes:

**Pass 1 — Do not fab without these:**
- Series source termination (~28 resistors)
- TVS arrays at the connector (~13 chips)
- Pull-ups on RX / MISO / TACH inputs (~21 resistors)
- Test points + logic analyzer breakout header
- Per-card reset/boot control (Option B: I2C bus + PCA9555 per card) — this is currently missing from the design

**Pass 2 — Strongly recommended:**
- Sacrificial 74LVC244 buffers (~6 chips)
- VCCO power islands with ferrite beads on Banks 24/25/26/44
- USB debug console (FT232RL/CP2102N)
- **Operator Console HUD sidebar + BMC** (pure firmware/software work, zero new hardware, zero PCB changes) — 1440×1080 Linux + 480×1080 R5-owned sidebar with LED mirror and telemetry HUD, rendered by the Cortex-R5F (already in silicon). The same R5 runs a full BMC with HTTP dashboard, VNC remote console, SSH shell, serial-over-LAN, Prometheus exporter, and power control services, reachable over the existing Ethernet via a shared-GEM configuration (no second PHY or second RJ45 required). See "The Operator Console" and "The BMC: Putting the Cortex-R5F to Work" sections above. This is the highest-value feature on the board per dollar (zero) and per hour of PCB work (zero) — everything is firmware.

**Pass 3 — High-value features:**
- Per-card INA226 power monitoring
- Per-card load switches
- External watchdog timer
- Battery-backed RTC (DS3231)

**Pass 4 — Convenience and cosmetic:**
- TLC59116 status LED bank
- OLED status display
- Front-panel buttons
- Ambient light sensor
- RP2040 SWD passthrough
- Spare HD bank breakout header

Pass 1 items address actual hardware risks (FPGA destruction, missing GPIO functionality, undebuggable bringup). Pass 2 items significantly improve robustness and SI. Passes 3 and 4 add features rather than fix problems, but everything in Pass 3 is high-value-per-dollar diagnostics worth including in the first board spin if board space is truly unlimited.

## Schematic TODO — Remaining Work

The following items are not yet wired in the KiCad schematic and must be completed before the board can be fabricated.

### MIO Pin Reassignments

The addition of QSPI boot flash on MIO0-5 requires moving two signals:

| Signal | Current MIO | New MIO | Reason |
| :--- | :--- | :--- | :--- |
| M.2 PERST# | MIO2 | MIO6 or MIO7 | MIO2 needed for QSPI_IO0 |
| UART TX | MIO0 (reserved) | MIO8 | MIO0 needed for QSPI_SCLK |
| UART RX | MIO1 (reserved) | MIO9 | MIO1 needed for QSPI_CS |

### Updated MIO Map

| MIO Range | Function | Status |
| :--- | :--- | :--- |
| MIO0-5 | QSPI flash (SCLK, CS, IO0-IO3) | **TODO — need QSPI chip, wiring** |
| MIO6 or MIO7 | M.2 NVMe PERST# | **TODO — move from MIO2** |
| MIO8-9 | UART debug console (TX/RX) | **TODO — need header or level shifter** |
| MIO10-12 | Available | |
| MIO13-22 | MicroSD card (SDIO0) | Done |
| MIO23-26 | Available | |
| MIO27-30 | DisplayPort AUX + HPD | Done |
| MIO31-37 | Available | |
| MIO38-51 | Ethernet RGMII + MDIO | Done |
| MIO52-63 | USB ULPI | Done |
| MIO64-77 | Available | |

### Boot and Configuration (Config / PS_MIO Sheets)

| Item | Pins | What to Do | Sheet |
| :--- | :--- | :--- | :--- |
| Boot mode DIP switch | PS_MODE0-3 | 4-pos DIP switch + 10kΩ pulldowns on each pin. Switch ON = 3.3V. | PS_MIO |
| QSPI flash | MIO0-5 | Add QSPI flash chip (TBD part), wire SCLK/CS/IO0-IO3, decoupling | PS_MIO |
| JTAG debug header | PS_JTAG_TCK/TDI/TDO/TMS | Add 2x7 ARM JTAG header, wire to Zynq JTAG pins | PS_MIO / Config |
| Power-on reset | PS_POR_B | RC circuit: 10kΩ to 3.3V + 100nF to GND (delay ~1ms) | PS_MIO / Config |
| System reset | PS_SRST_B | 10kΩ pullup to 3.3V + optional reset button | PS_MIO / Config |
| PL config handshake | PS_PROG_B, PS_INIT_B, PS_DONE | 10kΩ pullups to 3.3V each | PS_MIO / Config |
| PS reference clock | PS_REF_CLK (R16) | SiT8008BI-71-33S-33.333330 (LCSC C806182), 2.0x1.6mm | PS_MIO / Config |
| PUDC_B | PUDC_B | Tied to GND (pull-ups enabled during config) | Config |
| UART console | MIO8-9 | UART0 TX/RX + pin header or FTDI connector | PS_MIO |

### PL Fabric (PL Bank Sheets + Backplane + Peripherals)

| Item | What to Do |
| :--- | :--- |
| Backplane connector | Place 100-pin shrouded IDC header (2x50, 1.27mm pitch) on Backplane.kicad_sch. Assign all 100 pins: 32 UART (Banks 25/26), 5 TDMA (Bank 44), 4 LED SPI (Bank 24), 41 GND (one per signal), 18 spare. 2-inch ribbon cable to backplane. **Reclaim 3 spare pins for the per-card I2C control bus (SDA, SCL, GND ref) — see Backplane Region Buildout section.** |
| Fan PWM/Tach | Change local labels on Peripherals.kicad_sch to global labels. Add matching global labels on PL_HD.kicad_sch connecting to Bank 44 pins. |
| PL pin assignment | Assign specific Zynq ball numbers to all PL signals (UARTs, TDMA, SPI, fans) on Banks 24/25/26/44. Currently all 272 PL I/O pins are unassigned. |
| HP Banks 64/65/66 | 168 HP pins currently unallocated. Add no-connect markers or reserve for future use. |
| Backplane signal conditioning | Series R + 74LVC244 buffers + TVS arrays + pullups + test points on all 49 backplane signals. See "Backplane Region Buildout (Planned)" section above for full part list and rationale. **Currently absent from schematic.** |
| Per-card reset/boot control | Currently missing. The host `flash()` method needs Boot0/NRST control per card — see Backplane Region Buildout section, Option B (I2C + PCA9555 per card). |

### Minor Fixes

| Item | What to Do |
| :--- | :--- |
| RTL8211EG LED2 (pin 52) | Add no-connect marker |
| RTL8211EG REG_OUT (pin 3) | Verify 1µF + 0.1µF decoupling cap to GND is present |
| J5 DisplayPort CONFIG1/CONFIG2 | Check Foxconn 3VD51203 datasheet — may need pull-ups/pull-downs or NC |