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

The Zynq Processing System includes four hardened Gigabit Ethernet MACs directly in the silicon, giving the Ubuntu kernel native, zero-overhead networking without burning CPU cycles on software drivers. I routed one of these MACs out through the MIO pins using the RGMII protocol to a dedicated physical transceiver (PHY) chip on the board. The Zynq handles the digital logic, the PHY handles the analog line coding, and the result is flawless, line-rate Gigabit Ethernet straight to the rear IO panel. When you plug a cable in, the host instantly pulls an IP address and is ready to accept SSH connections or web payloads.

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

## The Linux Software Stack: From AXI Registers to StarC Jobs

Everything described above is hardware — silicon, copper, and solder. But hardware without software is a paperweight. This section describes what happens on the other side of the AXI bus: the Linux environment that turns 16 memory-mapped UART peripherals and a TDMA clock generator into a programmable supercomputer.

### The Device Tree and UIO

The 16 UART MACs in the Programmable Logic are not standard 16550-compatible UARTs that Linux can auto-detect. They are custom IP blocks on the AXI interconnect, each mapped to a 4-register window (TX_DATA, RX_DATA, STATUS, BAUD_DIV) at known addresses starting at `0xA000_0000`. The TDMA phase clock generator and LED SPI master are similarly custom blocks at their own AXI addresses.

Rather than writing a full kernel driver for each of these, the initial approach is **Userspace I/O (UIO)**. The Zynq's device tree declares each PL peripheral as a `generic-uio` device with its physical address range. At boot, the kernel creates `/dev/uio0` through `/dev/uio17` (16 UARTs + TDMA controller + LED SPI), and userspace code `mmap()`s the registers directly. No kernel module, no `ioctl()` overhead, no context switch on every byte. The Python host library writes directly to physical registers from userspace at memory-bus speed.

```
/* Device tree fragment — one entry per UART channel */
hypercube_uart0: serial@a0000000 {
    compatible = "generic-uio";
    reg = <0x0 0xa0000000 0x0 0x1000>;
    interrupt-parent = <&gic>;
    interrupts = <0 89 4>;
};

hypercube_uart1: serial@a0001000 {
    compatible = "generic-uio";
    reg = <0x0 0xa0001000 0x0 0x1000>;
    interrupt-parent = <&gic>;
    interrupts = <0 90 4>;
};
/* ... through hypercube_uart15 at 0xa000f000 */

tdma_ctrl: tdma@a0010000 {
    compatible = "generic-uio";
    reg = <0x0 0xa0010000 0x0 0x1000>;
};

led_spi: spi@a0011000 {
    compatible = "generic-uio";
    reg = <0x0 0xa0011000 0x0 0x1000>;
};
```

Once the machine is stable, a proper platform driver can replace UIO for interrupt coalescing and DMA. But for bringup and development, UIO means the entire host library is pure Python with `mmap` — no kernel recompilation, no module loading, no rebooting.

### The Host Library: How Linux Controls the Machine

The Python host library (`thinkin/machine.py`, documented in the [AG32 Gating Document](https://bbenchoff.github.io/pages/AG32Gating.html) as Software Milestone S3) is the single point of control for the entire hypercube. It maps directly onto the hardware described in this document:

```python
class ThinkinMachine:
    def __init__(self, num_cards=16):
        # mmap() all 16 UART register blocks via /dev/uio0..15
        # mmap() TDMA controller via /dev/uio16
        # mmap() LED SPI via /dev/uio17

    def flash(self, firmware_path):
        # For each card 0-15:
        #   Set BAUD_DIV for 460800 (bootloader rate)
        #   Assert Boot0 high, pulse NRST via GPIO
        #   Stream _batch.bin through TX_DATA register
        #   Verify response on RX_DATA
        #   Release Boot0, pulse NRST to run

    def load(self, data, dest_pvar):
        # Distribute data to all 4,096 nodes via control tree
        # Implements load_from_host() from StarC runtime

    def run(self):
        # Write TDMA_ENABLE to TDMA controller
        # Phase clock starts, all nodes begin execution

    def collect(self, timeout=5.0):
        # Poll all 16 UART STATUS registers for RX_FIFO_NOTEMPTY
        # Drain results from each card into {node_addr: data} dict

    def update_leds(self, framebuffer):
        # Write 4096-byte framebuffer to LED SPI TX register
        # RP2040 receives frame, drives 64x64 LED matrix
```

Every StarC host I/O primitive maps to a method on this class. When a StarC program calls `load_from_host(&input, 1)`, the host library's `load()` method writes one float per node through the appropriate UART channel. When `store_to_host(&result, 1)` executes, `collect()` drains the results. When `led_set(brightness)` runs on a node, the node sends an LED update up the control tree, and the host library batches these into SPI frame writes to the RP2040.

### The Boot Sequence

When the machine powers on, the following happens in order:

1. **Zynq BootROM** reads the MicroSD card, loads FSBL (First Stage Boot Loader) and the PL bitstream. The FPGA fabric comes alive — all 16 UARTs, the TDMA controller, the LED SPI master, and the fan PWM array are now active. Fans spin at 100% (fail-safe default).
2. **U-Boot** initializes DDR4, wakes the PCIe transceiver, enumerates the NVMe drive.
3. **Ubuntu kernel** boots from NVMe. The device tree registers UIO devices for all PL peripherals. Gigabit Ethernet comes up, pulls DHCP. SSH is available.
4. **`thinkin-daemon`** starts as a systemd service. It `mmap()`s all UIO devices, runs a health check on each UART channel (sends a probe byte, checks for echo), and reports the number of live compute cards. It then opens a Unix socket for local job submission and an HTTP endpoint for remote submission.
5. **Flash firmware** — on first boot or after a firmware update, the daemon calls `machine.flash()` to program all 4,096 AG32 nodes. Each card's 256 nodes are flashed sequentially through that card's UART channel. Total flash time for the full machine is under five minutes.
6. **Ready** — the machine accepts StarC jobs. The TDMA clock is held stopped until a job is submitted.

### The Job Lifecycle

A StarC job flows through the following stages:

1. **Submit** — a user sends a `.starc` source file via SSH (`scp` + command) or the HTTP API.
2. **Compile** — the Zynq runs `starc_pp.py` to preprocess StarC into C, then `riscv-gcc` (installed on the NVMe) cross-compiles to an AG32 binary. This happens natively on the dual-core A53 — no external build server needed.
3. **Load** — `machine.load()` distributes input data to all 4,096 nodes through the 16 UART channels. Data flows Host → Card Controller → Nodes via the control tree.
4. **Run** — `machine.run()` enables the TDMA phase clock in the PL fabric. All nodes begin executing simultaneously. The FPGA generates the master phase clock and distributes it across the backplane — jitter-free, independent of Linux scheduling.
5. **Collect** — the host polls all 16 UART channels for results. As nodes complete their work and call `store_to_host()`, results stream back through the control tree. `machine.collect()` assembles the complete result set.
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

The LED display path is: **Linux framebuffer → AXI SPI master (PL) → front-panel connector → RP2040 → 64x64 LED matrix**.

The host library maintains a 4,096-byte framebuffer in userspace memory (one byte per LED, mapping directly to the 64x64 grid). When a StarC program calls `led_set(brightness)` on any node, the result propagates up the control tree via UART, and the host library updates the corresponding byte in the framebuffer. A dedicated thread writes the complete framebuffer to the SPI TX register at 60fps. The RP2040 on the front panel receives each frame via SPI, handles PWM drive and row scanning, and the LEDs update.

This pipeline also runs outside of StarC jobs. The daemon can render status patterns (boot animation, card health visualization, idle patterns) independently of the hypercube.

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

16 independent hardware UART MACs instantiated in the Programmable Logic, memory-mapped to the AXI interconnect. Each channel is a dedicated TX/RX pair running at up to 460800 baud (bootloader) or the runtime baud rate configured by the host. All pins are 3.3V LVCMOS, directly compatible with the AG32 UART0 control interface on each compute card.

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

Each UART MAC is mapped to a contiguous 16-byte register block on the AXI bus. Base addresses are spaced at 0x1000 intervals for clean decoding:

| Card | AXI Base Address | Registers |
| :--- | :--- | :--- |
| 0 | 0xA000_0000 | TX_DATA, RX_DATA, STATUS, BAUD_DIV |
| 1 | 0xA000_1000 | TX_DATA, RX_DATA, STATUS, BAUD_DIV |
| 2 | 0xA000_2000 | TX_DATA, RX_DATA, STATUS, BAUD_DIV |
| ... | ... | ... |
| 15 | 0xA000_F000 | TX_DATA, RX_DATA, STATUS, BAUD_DIV |

The Linux kernel sees these as memory-mapped peripherals. A minimal character driver (or direct `/dev/mem` access during bringup) writes to TX_DATA, reads from RX_DATA, and polls STATUS for FIFO full/empty flags. The BAUD_DIV register allows per-channel baud rate configuration — 460800 for bootloader flashing, runtime rate for normal operation.

### LED Display SPI (PL HD Bank 24)

Dedicated SPI master in the Programmable Logic for driving the 64×64 front-panel LED display via the RP2040 display controller. All signals are 3.3V LVCMOS on HD Bank 24.

| PL Signal | Direction | PL Bank | Connector Pin | Function |
| :--- | :--- | :--- | :--- | :--- |
| LED_SPI_SCK | Output | 24 | Front-panel header | SPI clock |
| LED_SPI_MOSI | Output | 24 | Front-panel header | Zynq → RP2040 frame data |
| LED_SPI_MISO | Input | 24 | Front-panel header | RP2040 → Zynq status/ack |
| LED_SPI_CS | Output | 24 | Front-panel header | Chip select (active low) |

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
| Backplane connector | Place 100-pin shrouded IDC header (2x50, 1.27mm pitch) on Backplane.kicad_sch. Assign all 100 pins: 32 UART (Banks 25/26), 5 TDMA (Bank 44), 4 LED SPI (Bank 24), 41 GND (one per signal), 18 spare. 2-inch ribbon cable to backplane. |
| Fan PWM/Tach | Change local labels on Peripherals.kicad_sch to global labels. Add matching global labels on PL_HD.kicad_sch connecting to Bank 44 pins. |
| PL pin assignment | Assign specific Zynq ball numbers to all PL signals (UARTs, TDMA, SPI, fans) on Banks 24/25/26/44. Currently all 272 PL I/O pins are unassigned. |
| HP Banks 64/65/66 | 168 HP pins currently unallocated. Add no-connect markers or reserve for future use. |

### Minor Fixes

| Item | What to Do |
| :--- | :--- |
| RTL8211EG LED2 (pin 52) | Add no-connect marker |
| RTL8211EG REG_OUT (pin 3) | Verify 1µF + 0.1µF decoupling cap to GND is present |
| J5 DisplayPort CONFIG1/CONFIG2 | Check Foxconn 3VD51203 datasheet — may need pull-ups/pull-downs or NC |