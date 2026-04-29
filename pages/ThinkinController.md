---
layout: default
title: "Bare-metal Zynq UltraScale+ Hypercube Controller"
description: "Bare-metal Zynq UltraScale+ hypercube front-end"
keywords: ["FPGA", "PCB", "Zynq", "UltraScale+", "DDR4"]
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

# Part I — The Hardware (PCB Design)

## The Silicon Strategy: Designing for the Footprint

The heart of the controller board is an AMD/Xilinx Zynq UltraScale+ MPSoC. The specific part is the **XCZU2EG-2SFVC784I**.

Choosing this specific piece of silicon was a highly calculated exercise in balancing performance against the punishing physical constraints of my 1:1:1 aluminum cube enclosure.

* **The `EG` Architecture:** The `EG` designation means this chip includes the full Processing System: a **Dual-Core Cortex-A53** application processor, **Dual Cortex-R5F** real-time cores, and critically, the **Mali-400 MP2 GPU** for hardware-accelerated graphics. This gives me a smooth Linux desktop without burning FPGA fabric on a soft GPU.
* **The `-2` Speed Grade:** Speed grade 2 is the mid-tier bin, clocking the A53 cores at up to **1.5 GHz**. This runs at the standard 0.85V core voltage. Inside the sealed aluminum cube thermal management is still a concern, but the industrial-temperature rating (`I`, -40°C to +100°C) and the modest PL fabric of the ZU2 keep the total power envelope manageable.
* **The `SFVC784` Package:** This is the saving grace for the PCB layout. It is a 784-pin BGA, but critically, it has a **0.8mm ball pitch**. This kept me out of expensive High-Density Interconnect (HDI) microvia hell. I was able to route the fanout using standard 0.45mm/0.2mm "dog-bone" vias on a standard JLCPCB pool run.

### The Pin-Compatible Upgrade Path

The beauty of Xilinx's UltraScale+ architecture is pin compatibility. Because I designed this entire motherboard around the 0.8mm `SFVC784` footprint, I could later drop in an **XCZU3EG** if I ever need quad-core A53 performance. Same package, same pinout, zero rerouting. For now, the dual-core ZU2EG with its integrated GPU is more than enough to run a Linux desktop while the real work happens in the FPGA fabric.

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

There are two distinct memory domains in this machine. The entire 4,096-node hypercube possesses a grand total of **32 Megabytes** of distributed SRAM--a mathematically perfect match to the original 1985 CM-1. 

However, the Linux host needs real breathing room. I gave the Zynq 4 Gigabytes of system RAM using two **Micron MT40A1G16TB-062E** DDR4 chips. 

### Routing the Fly-By Topology
Because the Zynq requires a 32-bit memory bus to run the OS efficiently, and each Micron chip is 16-bits wide (x16), I had to place two chips side-by-side. 

Routing this was a *pain*. 

The lower 16 data bits (DQ0-DQ15) go point-to-point to Chip 1. The upper 16 data bits (DQ16-DQ31) go point-to-point to Chip 2. However, the address, command, and clock lines have to be routed in a **Fly-By Topology**. They exit the Zynq, hit the pads on the first RAM chip, continue along the same layer to the second RAM chip, and then terminate into 39.2-ohm resistors tied to a 0.6V VTT tracking regulator. Length-matching this on a custom 8-layer board to picosecond tolerances is exactly as stressful as it sounds.

## The Display Interface

The Zynq Processing System's hardened video controller outputs native DisplayPort. Rather than adding an expensive, hard-to-source active converter chip to translate to HDMI, I put a standard full-size **DisplayPort receptacle** (Foxconn 3VD51203-3D6A-7H) directly on the rear I/O panel. Two high-speed GTR lanes from Bank 505 drive the DisplayPort signal directly to the connector--no protocol conversion, no converter IC, no wasted board space. Users who need HDMI can use a standard $10 active DP-to-HDMI dongle.

The DisplayPort AUX channel (a bidirectional sideband for EDID and link training) is routed through MIO pins 27, 28, 29, and 30. The DisplayPort AUX channel is routed through a **FIN1019MTC bidirectional LVDS buffer** (per UG583 requirement). MIO27 (DP_AUX_OUT) drives the buffer's DI input, MIO29 (DP_OE) controls the buffer's DE direction pin, MIO30 (DP_AUX_IN) receives from the buffer's RO output, and MIO28 (DP_HPD) reads the Hot Plug Detect signal directly from the connector through a 100kΩ pulldown.

## The 16-Channel Backplane

Here is the exact reason a standard single-board computer could never run this machine: **I have to talk to 16 separate hypercube boards simultaneously, in hard real time, with bootloader-level timing discipline on every channel.**

Each of the 16 compute cards requires its own independent, high-speed serial channel (RX/TX) to pass instructions, load StarC binaries, and retrieve data. Each AG32 node on every compute card exposes a dedicated UART0 control interface -- this is the permanent link between the controller board and every node in the hypercube. The controller uses this link for everything: flashing firmware via the AG32 serial bootloader at 460800 baud, loading StarC binaries, broadcasting run commands, and collecting results. The protocol is pure UART, 8N1, because that's what the AG32 silicon speaks natively.

The UARTs live in the FPGA fabric as **16 independent hardware AXI UART Lite instances**, each with its own AXI-Lite register window and its own IRQ line routed through the PL-to-PS interrupt fabric.

### Physical Pin Allocation: HD Banks 25 and 26

All 16 UART channels are routed through the Zynq's **High-Density (HD) I/O banks**. The AG32 nodes run at 3.3V LVCMOS, and the HD banks (Banks 24, 25, 26, and 44) are the only PL banks on the XCZU2EG that support 3.3V signaling. The High-Performance (HP) banks (64, 65, 66) are limited to 1.8V and are reserved for future expansion.

The 32 UART signals (16 TX + 16 RX) are split across two banks:

* **Bank 25** carries Cards 0-7 (16 pins: 8 TX + 8 RX)
* **Bank 26** carries Cards 8-15 (16 pins: 8 TX + 8 RX)

This split keeps the fanout balanced and avoids overloading a single bank's I/O driver budget. Each bank is powered at **3.3V VCCO** with bulk and per-pin decoupling, matching the AG32's native logic levels -- no level shifters required.

The remaining HD pins on Banks 24 and 44 are allocated to the TDMA phase clock outputs, the LED display SPI interface, and the quad-fan PWM array -- all of which also run at 3.3V.

All 40 backplane signals (32 UART + 2 TDMA + 4 LED SPI + 2 I2C) exit the controller board through a **60-pin HARTING shrouded IDC header** (2x30, 2.54mm pitch) connected to the backplane via a ribbon cable. The signals pass through 74LVC244 octal buffers for protection and defined startup state, with 22Ω series termination on output lines to tame edge rates.

## The Orchestrator: TDMA Sync and the LED Display

The 16 compute cards are just the engines. The controller board also has to conduct the rest of the orchestra.

First, there is the **TDMA Synchronization**. To prevent the 4,096 RISC-V chips from talking over each other, the entire machine runs on a globally synchronized Time Division Multiple Access (TDMA) schedule. Linux is terrible at microsecond-accurate timing because of kernel preemption. But the FPGA fabric? It *only* operates in hard, deterministic real-time. The PL fabric generates a flawless, jitter-free master phase clock and distributes it across the backplane to all 16 cards simultaneously. The TDMA controller block is an AXI peripheral with a tiny register map (`TDMA_ENABLE`, `TDMA_DIVIDER`, `TDMA_PHASE`, `TDMA_FRAME`).

Second, there is the **LED Display**. The 64x64 front panel is controlled by an RP2040. The controller board needs to push display state to that RP2040 fast enough to maintain a 60 fps refresh rate. A dedicated **SPI slave** in the FPGA fabric on **HD Bank 24** talks to the RP2040 -- the RP2040 is the SPI master (for v-sync alignment reasons described in the "LED Display Pipeline" section below), and the Zynq fabric latches the transaction on the RP2040's own frame clock. The SPI bus carries four signals: SCK, MOSI, MISO, and CS. At 60 fps, the 64x64 display requires 4,096 pixels per frame in each direction, which is trivial bandwidth for even a modest SPI clock.

## High-Speed Storage: The M.2 NVMe Slot

You cannot run a bare-metal supercomputer head-node off a micro SD card. If this machine is going to host its own job queues, compile StarC payloads natively, buffer massive datasets, and act as a cloud-accessible compute server, it needs real, high-bandwidth solid-state storage. So, I put an M.2 slot on the back of the board.

Adding NVMe to this specific Zynq package is a zero-sum game of transceiver math. The chip has exactly four High-Speed PS-GTR transceivers in Bank 505. Two of those lanes are permanently burned running the DisplayPort video out. That left me with just enough bandwidth to route a single **PCIe Gen2 x1** link to an M-Key M.2 connector. 

It maxes out around 500 MB/s. It won't break modern PCIe Gen4 benchmark records, but it provides ultra-low latency, native NVMe support, and lets Ubuntu boot in seconds. 

### Surviving the Clocking Trap

Routing the 100-ohm differential TX and RX pairs was the easy part (along with dropping the mandatory 0.1uF AC coupling capacitors on the transmit lines). The real trap with PCIe on a custom Zynq board is the clocking. 

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

Xilinx handles this through Multiplexed I/O (MIO). The Zynq has 78 dedicated pins (Banks 500-503) that can be dynamically assigned to internal, hardened hardware controllers inside the Processing System. The MIO budget on this board is fully allocated across seven subsystems: QSPI boot flash, UART debug console, NVMe reset, MicroSD card, DisplayPort AUX, Gigabit Ethernet, and the USB ULPI PHY.

### The Gigabit Gateway
If this machine is going to operate as an edge-compute server taking job payloads from the internet, it needs a massive pipe to the network.

The Zynq Processing System includes four hardened Gigabit Ethernet MACs directly in the silicon, giving the Ubuntu kernel native, zero-overhead networking without burning CPU cycles on software drivers. I routed one of these MACs (GEM3) out through the MIO pins using the RGMII protocol to a dedicated physical transceiver (PHY) chip on the board. The Zynq handles the digital logic, the PHY handles the analog line coding, and the result is flawless, line-rate Gigabit Ethernet straight to the rear IO panel. When you plug a cable in, the host instantly pulls an IP address and is ready to accept SSH connections or web payloads.

### The Boot Chain: QSPI, SD, and JTAG

The M.2 NVMe drive is the primary storage engine, but the Zynq's BootROM cannot read PCIe -- it needs a simpler device to bootstrap from. To solve this, the board supports **three boot sources**, selectable at runtime via a 4-position DIP switch on the `PS_MODE[3:0]` pins:

| DIP Setting | MODE[3:0] | Boot Source | Use Case |
| :--- | :--- | :--- | :--- |
| All OFF | 0000 | JTAG | Board bringup -- debugger pushes FSBL directly |
| SW1 ON | 0010 | QSPI Flash | Production -- boots autonomously from soldered flash |
| SW0+SW1+SW2 ON | 0111 | MicroSD Card | Development -- easy reflash from a laptop |

Each MODE pin has a 10k-ohm pull-down resistor; the DIP switch overrides individual pins to 3.3V.

**QSPI Flash (Production Boot):** A dedicated QSPI flash chip on MIO0-5 holds the FSBL, U-Boot, and the PL bitstream. On power-up with MODE=0010, the BootROM reads the flash, initializes the Processing System, loads the FPGA fabric, and hands off to U-Boot. U-Boot then wakes up the PCIe transceivers and boots the full Ubuntu workstation OS from the NVMe drive at 500 MB/s. No removable media, nothing to come loose inside the sealed aluminum cube.

**MicroSD Card (Development Boot):** The microSD slot on MIO13-22 acts as the development ignition key. With MODE=0111, the same boot chain runs from the SD card instead. If I ever completely brick the QSPI while writing custom kernel drivers for the hypercube, I flip the DIP switch, pop in an SD card flashed on my laptop, and the board boots. No JTAG programmer required.


## USB 3.0 Hub

The Zynq has one USB 3.0 controller but no built-in USB 2.0 PHY. Two external chips are required: a **Microchip USB3300-EZK** ULPI PHY for USB 2.0 signaling, and a **TI TUSB8043A** 4-port hub to fan out to four USB-A 3.0 ports on the rear panel. The USB3300 connects to the Zynq via the ULPI bus on MIO52-63, while the SuperSpeed 5 Gbps signal rides PS-GTR Lane 3 from Bank 505 directly into the TUSB8043A's upstream port. The hub then splits both SuperSpeed and High-Speed paths to four downstream USB-A 3.0 connectors, providing full USB 3.0 at 5 Gbps to all four ports. The TUSB8043A requires a 1.1V core supply (provided by a TPS74801 LDO) and a 24 MHz crystal.

## Audio Output

The machine has two independent audio paths: digital audio over DisplayPort, and a dedicated analog output with an internal speaker.

**DisplayPort Audio** requires zero additional hardware. The Zynq's DP controller supports native audio over the DP link — any monitor with speakers or a DP-to-HDMI dongle receives audio automatically.

**Analog Audio** is driven by a **TI PCM5102A** I2S DAC connected to 3 PL pins on HD Bank 24 (I2S_BCK, I2S_DIN, I2S_LRCK on balls W14, W13, Y14). The DAC outputs line-level stereo through 470Ω series resistors to a **switched 3.5mm TRS jack** on the rear panel. When headphones are plugged in, the jack's normally-closed switch contacts open and the headphones receive stereo directly from the DAC.

When nothing is plugged in, the switch contacts remain closed and route both channels through a passive mono mixing network (two 1kΩ resistors summing L+R) into a **Diodes PAM8302A** 2.5W Class-D mono amplifier, which drives a small internal speaker. The amp runs from 5V provided by an **AMS1117-5.0** LDO regulator tapped from the 12V input rail. Plugging in headphones physically disconnects the speaker — no software mute logic needed.

The I2S transmitter is instantiated in the PL fabric (~200 LUTs) and fed PCM samples over AXI by the A53 (for Linux ALSA audio) or the R5 (for BMC alert tones, boot chimes, or system event sounds). The PCM5102A's SCK pin is tied to GND, enabling its internal PLL to recover the system clock from BCK — no fourth signal line required.

## Real-Time Clock

A **Maxim DS3231** battery-backed RTC provides accurate wall-clock time independent of Linux, NTP, or even main power. The DS3231 connects via its own dedicated I2C bus on **MIO10 (SCL) and MIO11 (SDA)**, using the Zynq's hardened PS I2C0 controller — no FPGA fabric required. A **CR2032 coin cell** provides backup power, keeping the clock running when the machine is unplugged.

Because the I2C0 controller is a PS peripheral, both the R5 cluster and the A53 can access it directly. The BMC on R5 core 0 reads the RTC for event log timestamps, syslog entries, and "time since last power cycle" — all without depending on Linux or network time. Linux accesses the same RTC through the mainline `rtc-ds1307` driver (which supports the DS3231) and the standard `hwclock` path. On boot, Linux sets its system clock from the RTC before NTP is available.

The DS3231's ±2ppm TCXO means the clock drifts less than a minute per year without NTP correction. The INT/SQW output is left unconnected — if a wakeup alarm or precision 32kHz reference is ever needed, it can be routed to a spare MIO in a future revision. SDA and SCL have 4.7kΩ pullups to 3.3V.

## Thermal Management: Quad-Fan PWM Array

To keep the Zynq and the 16-card hypercube cool inside the sealed aluminum chassis, the board features four standard 4-pin PWM fan headers. 

The baseline fan is the **Noctua NF-A9 PWM** (92x92x25mm, 2.3 mmH₂O static pressure, 46 CFM, 1.2W). Four fans fit the 30mm depth available on the back interior wall. However, the perforated PVC grille on the back panel and the high-impedance card cage (16 cards at half-inch pitch) may consume most of the Noctua's available static pressure. If testing shows inadequate airflow through the card cage, the drop-in replacement is the **Sanyo Denki San Ace 9GA0912P4G001** (92x92x25mm, 7.8 mmH₂O static pressure, 62 CFM, 14.76W) — 3.4x the static pressure of the Noctua. The tradeoff: four Sanyo Denkis draw 59W total (~50 dBA each), adding significant power and noise. PWM control in the FPGA fabric can keep them at low duty cycle during idle.

A brief lived-experience note on the San Ace: the spec sheet really does not prepare you for it. "50 dBA" is a number on a page; spinning one up on the bench is a different category of experience. A single 9GA at full duty is a shop-vac — four of them in a sealed aluminum chassis is not something you want to sit next to without hearing protection.

The saving grace is that at **10% PWM duty the 9GA is entirely tolerable**, and bench testing shows that 10% through the card cage still provides more than sufficient airflow. The fan has enormous headroom; idle operation uses almost none of it. This is actually better than it sounds, because the PL-enforced fail-safe — fans default to 100% until the R5 PID loop takes over — turns boot into a piece of theater. Power on, all four 9GAs immediately scream up to full duty like a jet on the apron, and then within a second or two of the R5 coming alive, the PID loop drops them to 10% and the room goes quiet. It's an inadvertently great demo moment: the machine announces itself, then settles. If you're going to be that loud on startup, you might as well lean into it.

While the 12V power is provided directly from the main input rail, the control logic is handled by the FPGA fabric. By routing the PWM and Tachometer (Sense) lines to the Programmable Logic, the machine maintains deterministic cooling independent of the Linux kernel state. This allows for a hardware-level "fail-safe" where the fans default to 100% duty cycle if the system monitors detect a thermal runaway or a software hang.

## Power Supply Architecture

The controller board requires seven distinct voltage rails, all derived from a single 12V input through a **JST VH (3.96mm pitch) 2-pin connector** with 16 AWG wire. The JST VH is rated for 10A per contact, providing comfortable margin for the ~5A worst-case draw. The Zynq UltraScale+ has strict power sequencing requirements — rails must come up in a specific order or the chip can be damaged — so the power supply isn't just a collection of regulators, it's a timed sequence.

### The Power Budget

| Rail | Voltage | Typical | Peak | What It Powers |
| :--- | :--- | :--- | :--- | :--- |
| VCCINT + VCCBRAM + VCCINT_IO + VCC_PSINTFP + VCC_PSINTLP | 0.85V | 4.5A | 7A | PL fabric, block RAM, A53 cores, R5 cores — all the silicon that thinks |
| VCCAUX + VCC_PSAUX + VCC_PSDDR_PLL | 1.8V | 0.8A | 1.5A | PL auxiliary, PS auxiliary, DDR PLL |
| VCC_PSDDR + DDR4 VDDQ | 1.2V | 1.5A | 3A | DDR4 controller and memory chips |
| DDR4 VTT | 0.6V | 0.5A | 1A | DDR4 fly-by termination (tracking regulator, VDDQ/2) |
| +3.3V | 3.3V | 2A | 4A | Ethernet PHY, USB hub, USB PHY, QSPI flash, SD card, DisplayPort, oscillators, backplane buffers, HD bank VCCO, every pullup on the board |
| +5.0V | 5.0V | 1A | 2.5A | USB VBUS (4 ports × 500mA) |
| +1.1V | 1.1V | 0.3A | 0.5A | TUSB8043A USB hub core |

**Total board power at typical load: ~40W.** At peak (all USB ports loaded, PL fabric fully utilized, DDR4 at max bandwidth): **~50W.** With buck converter inefficiency from the 12V rail (~85% efficiency), the input draw is approximately **5A at 12V / 60W** worst case.

For context: this is less than a Raspberry Pi 5 under load (27W) plus a USB hub plus an NVMe enclosure plus an Ethernet adapter. Except this is one board doing all of that plus driving 4,096 processors through an FPGA backplane.

### Sequencing

The Zynq UltraScale+ power-up sequence per Xilinx UG1085:

1. **0.85V** (VCCINT, VCCBRAM, VCC_PSINTFP, VCC_PSINTLP) — must come up first
2. **1.8V** (VCCAUX, VCC_PSAUX) — second, after 0.85V is stable
3. **VCCO banks** (3.3V for HD, 1.8V for HP) — third, after auxiliary rails
4. **1.2V** (VCC_PSDDR, DDR4 VDDQ) — after PS aux is stable
5. **0.6V** VTT tracking regulator — after VDDQ, tracks at VDDQ/2
6. **3.3V and 5V** peripheral rails — can come up in parallel with VCCO or after

Violating this order can damage the Zynq. The sequencing is handled by the PMIC or a dedicated sequencer chip that gates each regulator's enable pin in the correct order, with each rail's power-good output triggering the next stage.

### Regulator Architecture: The TPS6508640 PMIC

The heart of the power supply is a **TI TPS6508640RSKR** (IC1, LCSC C2659217), a configurable multi-rail PMIC designed specifically for Zynq UltraScale+ MPSoCs. The "640" OTP variant is factory-programmed for the Zynq UltraScale+ ZU7-ZU15 range, but all output voltages match the ZU2EG's requirements identically — no I2C reprogramming needed. The PMIC provides 13 output rails from a single chip, with hardcoded power-up sequencing stored in OTP silicon. TI publishes a complete Zynq reference design ([TIDA-01480](https://www.ti.com/tool/TIDA-01480)) using this exact chip.

**Key references:**
- [TPS650864 Datasheet (SWCS138G)](https://www.ti.com/lit/ds/symlink/tps650864.pdf) — Section 7.3 covers the TPS6508640 OTP settings
- [TPS65086x Design Guide (SLVUAJ9)](https://www.ti.com/lit/ug/slvuaj9/slvuaj9.pdf) — Schematic guidelines and PCB layout rules
- [TPS65086x Schematic and Layout Checklist (SLVA734)](https://www.ti.com/lit/an/slva734/slva734.pdf) — Layout verification checklist
- [TIDA-01480 Reference Design](https://www.ti.com/tool/TIDA-01480) — Validated Zynq UltraScale+ power supply

**PMIC output → Zynq rail mapping (as implemented):**

| PMIC Output | Type | Net Name | Voltage | Zynq Rail | External Components |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BUCK1 | Controller (ext FETs) | `+3V3` | 3.3V | HD bank VCCO (24/25/26/44), ETH PHY, USB hub/PHY, QSPI, SD, DP, oscillators, backplane buffers, all pullups. Also feeds PVIN3/4/5 for converters. | CSD87381P (U23), 0.47µH inductor, 2x 22µF 25V in, 6x 22µF out |
| BUCK2 | Controller (ext FETs) | `+0V85_VCCINT` | 0.85V | VCCINT + VCCBRAM + VCCINT_IO + VCC_PSINTFP + VCC_PSINTLP (42 balls total — all core silicon) | CSD87381P (U24), 0.47µH inductor, 2x 22µF 25V in, 6x 22µF out |
| BUCK3 | Converter (internal) | `+1V2_MGTAVTT` | 1.2V | VMGTAVTT (GTR transceiver termination) | 0.47µH inductor, 10µF in, 4x 22µF out |
| BUCK4 | Converter (internal) | `+0V9_MGTAVCC` | 0.9V | VMGTAVCC (GTR transceiver analog) | 0.47µH inductor, 10µF in, 4x 22µF out |
| BUCK5 | Converter (internal) | `+1.8V` | 1.8V | VCCAUX + VCC_PSAUX + VCC_PSDDR_PLL | 0.47µH inductor, 10µF in, 4x 22µF out |
| BUCK6 | Controller (ext FETs) | `+1V2_VDDQ` | 1.2V | VCC_PSDDR + DDR4 VDDQ | CSD87381P (U25), 0.47µH inductor, 2x 22µF 25V in, 4x 22µF out |
| VTT LDO | Tracking (VDDQ/2) | `+0V6_VTT` | 0.6V | DDR4 fly-by termination | 10µF in (from BUCK6), 2x 22µF out |
| LDOA1 | LDO | `+2V5_VPP` | 2.5V | DDR4 VPP | 4.7µF out |
| LDOA2 | LDO | `+1V5_LDOA2` | 1.5V | Available | 4.7µF out |
| LDOA3 | LDO | `+1V2_LDOA3` | 1.2V | Available | 4.7µF out |
| SWA1 | Load switch | `+3V3_PSIO` | 3.3V | VCCO_PSIO (MIO banks 500/501) | 0.1µF out, fed from BUCK1 |
| SWB1 | Load switch | `+1V8_MGTAVCCAUX` | 1.8V | VMGTAVCCAUX (GTR aux) | 0.1µF out, fed from BUCK5 |
| SWB2 | Load switch | `+1V8_SWB2` | 1.8V | Spare | 0.1µF out, fed from BUCK5 |

**Internal supply rails (not output rails — used inside the PMIC):**

| Pin | Net Name | Voltage | Bypass Cap | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| 55 (VSYS) | `+12V` | 12V | 1µF 25V | Main system input. 5.6-21V range. |
| 54 (LDO3P3) | `+3.3V_PMIC` | 3.3V | 4.7µF | Internal digital logic, I2C pullups, CTL pin pullups |
| 56 (LDO5P0) | `+5V_DRV` | 5.0V | 4.7µF 10V | Gate driver supply for external FETs |
| 57 (V5ANA) | `+5V_DRV` | 5.0V | 4.7µF 10V | Shorted to LDO5P0 on PCB |
| 8 (DRV5V_2_A1) | `+5V_DRV` | 5.0V | 2.2µF 10V X5R | Gate driver for BUCK2 + LDOA1 |
| 38 (DRV5V_1_6) | `+5V_DRV` | 5.0V | 2.2µF 10V X5R | Gate driver for BUCK1 + BUCK6 |
| 53 (VREF) | — | 1.25V | 100nF (GND to AGND island) | Band-gap reference. Do not load. |

**CTL pin strapping (passive resistors, no firmware):**

| Pin | Name | Strap | Connection | Selects |
| :--- | :--- | :--- | :--- | :--- |
| 13 | CTL1 | HIGH | 10kΩ to `+3.3V_PMIC` | Enables DDR sequence (BUCK6, LDOA1, VTT) |
| 60 | CTL2 | LOW | 10kΩ to GND | 1.2V for BUCK6 (DDR4 VDDQ, not 1.35V) |
| 61 | CTL3/SLPENB1 | HIGH | 10kΩ to `+3.3V_PMIC` | Main sequence enable — starts BUCK2 on power-up |
| 62 | CTL4 | From GPO1 | Direct wire to pin 16 | BUCK2_PG triggers BUCK1 start (VCCINT merged with VCCBRAM) |
| 63 | CTL5 | HIGH | 10kΩ to `+3.3V_PMIC` | Enables VTT LDO |
| 14 | CTL6/SLPENB2 | LOW | 10kΩ to GND | 0.85V for BUCK2 (not 0.9V) |

**GPO connections:**

| Pin | Name | Type | Connection | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| 16 | GPO1 | Push-pull | → CTL4 (pin 62) | BUCK2 power-good triggers next sequencing stage |
| 26 | GPO2 | Open drain | 10kΩ to `+3.3V_PMIC` | Test point (I2C-controlled) |
| 27 | GPO3 | Open drain | 10kΩ to `+1.8V`, global label `PS_POR_B` → Zynq pin P16 | Zynq power-on reset. Released 75ms after all rails stable. |
| 28 | GPO4 | Open drain | 10kΩ to `+3.3V_PMIC` | Test point (BUCK4 power-good) |

**I2C and interrupt (optional runtime access):**

| Pin | Name | Net | MIO | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| 58 | CLK | `PMIC_SCL` | MIO24 (Bank 500, 3.3V) | I2C1 SCL, 10kΩ pullup to `+3.3V_PMIC` |
| 59 | DATA | `PMIC_SDA` | MIO25 (Bank 500, 3.3V) | I2C1 SDA, 10kΩ pullup to `+3.3V_PMIC` |
| 15 | IRQB | `PMIC_IRQ` | MIO26 (Bank 501, 3.3V) | Open-drain interrupt, 10kΩ pullup to `+3.3V_PMIC` |

I2C is not required for normal operation — all voltages and sequencing are hardcoded in OTP. The I2C connection allows optional runtime voltage tweaking, current limit adjustment, and telemetry readback (die temperature, rail status, fault flags) by the R5 BMC or Linux.

**Power-up sequence (from OTP, zero software, per datasheet Figure 7-4):**

1. VSYS exceeds 5.6V → internal LDO5 (5V) and LDO3P3 (3.3V) start, I2C becomes available
2. CTL3 is high (pulled up at power-on) → **BUCK2 starts: `+0V85_VCCINT`** — all Zynq core power
3. GPO1 asserts (BUCK2 power-good) → CTL4 goes high
4. CTL4 high → **BUCK1 starts: `+3V3`** — all peripherals, and input power for BUCK3/4/5 converters
5. **BUCK4 starts: `+0V9_MGTAVCC`** — GTR analog supply
6. GPO4 asserts (BUCK4 power-good)
7. **BUCK3 starts: `+1V2_MGTAVTT`** (2ms delay) — GTR termination
8. **BUCK5 starts: `+1.8V`** — VCCAUX, PS auxiliary, DDR PLL
9. **SWB1 starts: `+1V8_MGTAVCCAUX`** — GTR auxiliary
10. **LDOA1 starts: `+2V5_VPP`** (2ms delay) — DDR4 programming voltage
11. **SWA1 starts: `+3V3_PSIO`** — MIO bank VCCO
12. **BUCK6 starts: `+1V2_VDDQ`** — DDR4 VDDQ (enabled by CTL1 + CTL5)
13. **VTT LDO starts: `+0V6_VTT`** — DDR4 termination (tracks VDDQ/2)
14. GPO3 goes high (75ms delay) → **PS_POR_B released** — Zynq begins boot

This matches the Xilinx UG1085 required power-up order: VCCINT first, then VCCAUX, then VCCO banks, then DDR, then VTT, then POR_B. Violating this order can damage the Zynq. The OTP-hardcoded sequence prevents this without any software involvement.

**External FETs for buck controllers:**

The three buck controllers (BUCK1, BUCK2, BUCK6) use D-CAP2 topology with external gate-driven MOSFETs. Each controller requires a **TI CSD87381P** NexFET Power Block II (LCSC C464808) — a dual N-channel MOSFET in a 3x2.5mm LGA package containing both the high-side and low-side FETs. The CSD87381P is rated for 30V, 15A, and is the same FET validated in the TIDA-01480 reference design.

| Ref | PMIC Pins | FET | Output | Inductor | Input Caps | Output Caps |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| U23 | DRVH1(33), SW1(34), BOOT1(35), PGNDSNS1(36), DRVL1(37), FBVOUT1(29), ILIM1(30) | CSD87381P | `+3V3` 3.3V | 0.47µH (C54321646) | 2x 22µF 25V (C398931) | 6x 22µF 6.3V (C109448) |
| U24 | DRVH2(3), SW2(4), BOOT2(5), PGNDSNS2(6), DRVL2(7), FBVOUT2(2), FBGND2(1), ILIM2(64) | CSD87381P | `+0V85_VCCINT` 0.85V | 0.47µH (C54321646) | 2x 22µF 25V (C398931) | 6x 22µF 6.3V (C109448) |
| U25 | DRVH6(43), SW6(42), BOOT6(41), PGNDSNS6(40), DRVL6(39), FBVOUT6(44), ILIM6(45) | CSD87381P | `+1V2_VDDQ` 1.2V | 0.47µH (C54321646) | 2x 22µF 25V (C398931) | 4x 22µF 6.3V (C109448) |

Each controller also has a 100nF bootstrap capacitor between BOOTx and SWx (floats — neither side to GND), and an ILIM resistor to GND (currently 10kΩ placeholder — final value TBD per SLVUAJ9 Equation 5). BUCK2 uniquely has FBGND2 (pin 1), a remote negative feedback sense that routes to the output capacitor ground pad on the PCB.

The FET pin names on the EasyEDA/LCSC symbol (U23/U24/U25) map as: VIN=drain, TG=DRVH (top gate, high-side), VSW=SW (switch node), BG=DRVL (bottom gate, low-side), PGND=PGNDSNS (power ground sense).

**Complete PMIC BOM:**

| Ref | Part | LCSC | Value/Description | Qty |
| :--- | :--- | :--- | :--- | :--- |
| IC1 | TPS6508640RSKR | C2659217 | PMIC, VQFN-64, 8x8mm | 1 |
| U23, U24, U25 | CSD87381P | C464808 | Dual NexFET, 30V 15A, 3x2.5mm | 3 |
| — | YOUCHI HTMD-4020-R47-M | C54321646 | 0.47µH inductor, 10A sat, 8.5A rated, 4x4mm (controllers) | 3 |
| — | Shun Xiang Nuo SMNR5020-R47MT | C135279 | 0.47µH inductor, 4.6A sat, 4.5A rated, 5x5mm (converters) | 3 |
| — | Murata GRT21BR61E226ME13L | C398931 | 22µF 25V X5R 0805 (controller inputs, 12V side) | 6 |
| — | YAGEO CC0603MRX5R5BB226 | C109448 | 22µF 6.3V X5R 0603 (converter/controller outputs, VTT) | 34 |
| — | Samsung CL05A106MP5NUNC | C315248 | 10µF 10V X5R 0402 (converter inputs, VTT input) | 4 |
| — | — | — | 4.7µF ceramic 0402 (LDO/supply bypass) | 8 |
| — | — | — | 2.2µF 10V X5R 0402 (DRV5V bypass) | 2 |
| — | — | — | 1µF 25V 0402 (VSYS bypass) | 1 |
| — | — | — | 1µF 0402 (load switch PVIN bypass) | 2 |
| — | — | — | 100nF 0402 (VREF bypass, bootstrap caps) | 4 |
| — | — | — | 0.1µF 0402 (load switch output bypass) | 3 |
| — | — | — | 10kΩ 0402 resistors (CTL straps, GPO pullups, I2C pullups, IRQB) | 11 |
| — | — | — | 10kΩ 0402 resistors (ILIM placeholders, TBD final value) | 3 |

**Additional regulators (not covered by the PMIC):**

Two TPS568215 synchronous buck converters provide dedicated high-current supplies for the NVMe drive and USB ports, isolated from the main `+3V3` rail to prevent load transient interference. Both are wired on the Power_Supply sheet. The TPS74801 LDO for the USB hub 1.1V core was previously wired on the PS_GTR sheet.

| Part | Ref | Net | Output | Feeds | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TI TPS568215RNNR | U20 | `+3V3_NVMe` | 3.3V | M.2 NVMe drive (dedicated supply for 3A write spikes) | **Wired** |
| TI TPS568215RNNR | U21 | `+5V_USB` | 5.0V | USB VBUS (4 ports × 500mA = 2A) | **Wired** |
| TI TPS74801DRCR | U22 | `+1.1V` | 1.1V | TUSB8043A USB hub core (VDD pins, ~300mA) | Wired on PS_GTR sheet |

**TPS568215 circuit details (both U20 and U21 are identical except feedback divider):**

The TPS568215 is an 18-pin monolithic synchronous buck converter with internal FETs, D-CAP3 control mode, 4.5-17V input range, 8A output. [Datasheet: SLVSDI8C](https://www.ti.com/lit/ds/symlink/tps568215.pdf). The output voltage is set by a resistor divider on the FB pin (internal reference = 600mV): VOUT = 0.6V × (1 + R_UPPER / R_LOWER).

| Pin | Name | U20 (3.3V NVMe) | U21 (5V USB) |
| :--- | :--- | :--- | :--- |
| 2, 11 | VIN | `+12V` | `+12V` |
| 3,4,5,8,9,10 | PGND | GND | GND |
| 12 | AGND | GND (single-point tie to PGND on PCB) | GND |
| 1 | BOOT | 0.1µF cap to SW (floats) | 0.1µF cap to SW (floats) |
| 6, 7 | SW | Inductor pad 1 | Inductor pad 1 |
| 13 | FB | Divider: 45.3kΩ to output, 10kΩ to GND | Divider: **73.2kΩ** to output, 10kΩ to GND |
| 14 | SS | Float (1ms default soft-start) | Float |
| 15 | EN | 100kΩ to `+12V` (enables on power-up) | 100kΩ to `+12V` |
| 16 | PGOOD | 10kΩ pullup to `+3V3_NVMe` | 10kΩ pullup to `+5V_USB` |
| 17 | VREG5 | 4.7µF cap to GND | 4.7µF cap to GND |
| 18 | MODE | 10kΩ to GND (400kHz DCM) | 10kΩ to GND (400kHz DCM) |

| Component | Per converter | LCSC | Notes |
| :--- | :--- | :--- | :--- |
| Inductor 1.5µH | 1 | C7497090 (APV ANR5020T1R5M, 4.5A sat, 5x5mm) | Same part for both U20 and U21 |
| 22µF 25V input cap | 2 | C398931 (Murata GRT21BR61E226ME13L, 0805) | Same as PMIC controller input caps |
| 0.1µF input cap | 2 | — (0402, generic) | High-frequency decoupling |
| 22µF 6.3V output cap | 4 | C109448 (YAGEO CC0603MRX5R5BB226, 0603) | Same as PMIC output caps |
| 0.1µF bootstrap cap | 1 | — (0402, generic) | Between BOOT and SW, floats |
| 4.7µF VREG5 cap | 1 | — (0402, generic) | Internal LDO bypass |
| 45.3kΩ (U20) or 73.2kΩ (U21) | 1 | — (0402 1%) | Upper feedback resistor, sets VOUT |
| 10kΩ | 1 | — (0402) | Lower feedback resistor |
| 100kΩ | 1 | — (0402) | EN pullup to +12V |
| 10kΩ | 1 | — (0402) | PGOOD pullup |
| 10kΩ | 1 | — (0402) | MODE to GND |

**Layout notes (from TPS568215 datasheet Section 8.4):**
- Input caps right across VIN and PGND, as close to the IC as possible
- Multiple vias under the device near VIN and GND pads for thermal performance
- Layer 1 (inner) is GND with PGND-to-AGND single point tie
- Layer 2 (inner) has VIN copper pour with vias to top layer
- FB trace routed to AGND, away from switch node
- VIN trace as wide as possible
- BOOT cap connected on bottom layer

### Reference Designs and Layout

The PMIC circuit follows the [TPS65086x Design Guide (SLVUAJ9)](https://www.ti.com/lit/ug/slvuaj9/slvuaj9.pdf) for component selection, schematic topology, and PCB layout. The design guide specifies exact placement priorities, ground plane strategy, and trace routing rules for each power stage. A complete design reference file with all pin connections, layout rules, and component values is maintained at `Controller/TPS6508640_DESIGN_REFERENCE.md`.

**Critical PCB layout rules (from SLVUAJ9):**
- All inductors, input/output caps, and FETs must be on the same board layer as the PMIC (top)
- Solid, unbroken ground plane on layer 2 directly under the entire PMIC area
- AGND (pin 52) connects to a dedicated ground island on the top layer, single-point via to the ground plane — NOT connected to the thermal pad on the top layer
- PGNDSNS traces route to the FET PGND pad but must NOT merge with the ground plane (sense only)
- FBVOUT traces route on a lower signal layer under the ground plane, connecting at the output capacitor positive terminal
- DRVHx and SWx routed together as a pair; DRVLx on top layer with return path to PowerPAD
- Bootstrap caps placed near the IC, not the FET
- Input caps as close to FET VIN/PGND pads as physically possible
- VREF 100nF cap ground goes to the AGND island, not the main ground pour

## Summary

This is a custom 8-layer 64-bit AMP motherboard. The **A53 cluster** runs Ubuntu, compiles StarC natively, serves the network, and drives the left 1440x1080 of the DisplayPort output as a normal Linux desktop. **R5F core 0** runs a FreeRTOS BMC image that paints the right 480x1080 of the display as an out-of-band operator console and serves HTTP/SSH/VNC/SoL/Prometheus on its own shared-GEM network queue. **R5F core 1** runs a FreeRTOS hypercube controller image that owns the 16 backplane UARTs, the TDMA block, the LED SPI TX buffer, and the fan PWM -- it is the CPU that actually orchestrates StarC jobs on the 4,096 compute nodes, and Linux reaches it over a mainline rpmsg mailbox. The Programmable Logic handles the 16-channel backplane, TDMA synchronization, LED SPI, and fan PWM in deterministic hardware, under the control of R5 core 1 rather than Linux. Four PS-GTR transceiver lanes are fully allocated across DisplayPort, NVMe, and USB 3.0. The board boots from QSPI flash (or MicroSD in development), runs Ubuntu from NVMe, and brings the R5 cluster up via Xilinx remoteproc alongside the Linux kernel.

Because real-time hypercube control lives on a processor that shares nothing with Linux except the memory controller, in-flight StarC jobs keep running to completion when Linux panics, the LED panel keeps displaying live telemetry, and the BMC network services stay reachable -- a survival property most enterprise servers charge extra for, achieved here as a side effect of putting every block of the XCZU2EG to work.

The original CM-1 required a VAX 11/780 or a Symbolics 3600 Lisp Machine as its front-end. This replaces both with a single 23mm BGA on a board that fits inside the cube, with the VAX-style "service processor" role filled by a pair of hardened real-time cores that Xilinx shipped in the same package almost as an afterthought.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Part II — The Firmware (Three CPUs and What They Do)

Everything in this section lives in a bitstream, FSBL, device tree, or application binary. This is the code side of the controller board.

### The Three-CPU AMP Architecture

The controller board runs three independent CPUs in Asymmetric Multiprocessing (AMP) mode:

- **A53 cluster (2 cores)** -- runs Ubuntu Linux. The user frontend: SSH, desktop, web API, StarC compilation, job queue management, NVMe storage, primary network stack. Drives the left 1440x1080 of the DisplayPort output via the Mali-400 GPU.
- **R5F core 0** -- runs FreeRTOS. The BMC and HUD renderer: paints the right 480x1080 operator console sidebar (448x448 LED mirror + 480x600 telemetry HUD), runs HTTP/SSH/VNC/SoL/Prometheus services on its own shared-GEM network queue. Survives Linux crashes by design.
- **R5F core 1** -- runs FreeRTOS. The hypercube controller: owns 16 AXI UART Lite blocks, TDMA controller, LED SPI TX buffer, fan PWM. Orchestrates StarC jobs on the 4,096 compute nodes. Linux reaches it through rpmsg, not direct hardware access.

Linux talks to the hypercube through rpmsg, not direct serial or UIO. In-flight jobs survive Linux crashes because the R5 cluster owns the control path.

## The Hypercube Controller: R5F Core 1 as the Real-Time Supervisor

Core 0 runs the BMC and the operator console. The natural question is what to do with core 1. The answer turns out to be: **make it the hypercube controller**, the CPU that actually orchestrates StarC jobs on the 4,096 compute nodes. Linux, on the A53 cluster, stops touching the backplane hardware directly and instead submits jobs to core 1 over a shared-memory mailbox. This is the standard HPC split between a "user frontend" and a "service processor," reinvented by accident because the XCZU2EG happens to ship both kinds of CPU in the same package.

### Why Linux Should Not Own the UARTs

The original plan was to have Linux open `/dev/ttyUL0` through `/dev/ttyUL15` with `pyserial` and drive the hypercube directly. This works -- the `uartlite` kernel driver is mainline, pyserial is fine, the A53s have plenty of headroom. But it has two problems that get worse the longer you think about them:

1. **Linux scheduling jitter lands on every hypercube interaction.** A Linux process reading a UART can be delayed by a kernel interrupt, a page fault, a scheduler quantum, or a neighbor thread misbehaving. On a machine with microsecond-sensitive TDMA control and a bootloader handshake protocol that needs to stream 460800-baud bytes without gaps, that jitter is actively hostile. The A53 cluster is a workstation CPU optimized for throughput under load, not for bounded latency.

2. **Linux sits on the critical path for every status claim the machine makes about itself.** If Linux owns the UARTs, it owns the telemetry, which means the LED panel content, the sidebar mirror, and the HUD numbers are all downstream of a CPU that can kernel-panic. The sidebar keeping itself alive during an Xorg crash is a real property, but it's only an *accident* as long as the hypercube data feeding it also lives inside Linux. "Survives an Xorg crash" does not imply "survives a kernel panic," and the distinction starts to matter the moment someone types `sudo pkill -9` at the wrong process.

Moving the UARTs to R5 core 1 fixes both problems at once. The R5 is hard real-time with bounded interrupt latency. It has no kernel scheduler to preempt its tight loops. And because it runs in a power domain separate from the A53 cluster, its operation is genuinely independent of Linux's state -- not practically independent, but architecturally independent.

### What Core 1 Runs

Core 1 runs its own FreeRTOS image, mapped into its own TCMs and a dedicated DDR4 reserved-memory region declared in the device tree. The firmware does the following:

1. **Owns the 16 AXI UART Lite blocks.** Every UART's interrupt routes to core 1 via the PL-to-PS interrupt fabric. A UART worker task per card handles RX/TX FIFO draining, protocol framing, and bootloader sequencing during flash operations. The sub-microsecond interrupt latency of the R5 makes this dramatically more deterministic than anything Linux can do.

2. **Collects autonomous telemetry from every node.** Each card's AG32 controller sends a heartbeat frame at a fixed rate -- say once per second -- containing per-node temperatures, the node-alive bitmap, the current job phase, and a sequence counter. Core 1's parser decodes these as they arrive and updates a **thermal table** in shared DDR4: a flat array of 4,096 entries, one per node, with temperature, liveness state, and last-update timestamp. This table is the single source of truth for hypercube status on the entire controller board, and everything downstream (LED panel, HUD, BMC web dashboard, Prometheus exporter) reads from it.

3. **Renders the thermal map for the LED panel.** Core 1 applies a colormap LUT to the thermal table, produces a 64x64 framebuffer, and writes it into the LED SPI TX buffer. The RP2040 picks it up on the next refresh and lights the panel. The thermal-mode content of the front panel is therefore **produced by R5 core 1 from live telemetry, with zero Linux involvement**. The sidebar mirror on the operator console reflects this via the MISO readback path, which means the sidebar thermal view is also independent of Linux.

4. **Executes job commands from Linux.** When Linux wants to run a StarC job, it writes a command descriptor into a shared-memory mailbox and rings a doorbell via the Zynq's inter-processor interrupt mechanism. Core 1 picks up the command, fans the work across the appropriate UARTs, and writes the results back into a reply buffer. Commands are small and well-defined: `FLASH`, `LOAD`, `RUN`, `COLLECT`, `LED_PUSH`, `LED_MODE`, `SET_FAN`, `STATUS`, `RESET_CARD`. Everything the old `ThinkinMachine` Python class did as direct UART I/O becomes a mailbox transaction.

5. **Drives the TDMA clock and the fan PWM.** Both are AXI peripherals with simple register maps. Core 1 writes `TDMA_ENABLE` and `TDMA_DIVIDER` when a job starts and stops, and runs a PID loop over the fan PWM using the thermal table as its setpoint source.

6. **Exposes virtual TTYs to Linux for interactive debug.** Users who want to `picocom /dev/ttyUL5` to manually poke at a card still can -- core 1's rpmsg stack exposes `/dev/rpmsg-tty0` through `/dev/rpmsg-tty15`, which behave exactly like real serial ports through the mainline `drivers/tty/rpmsg_tty.c` driver. When a debug session is open on a given virtual tty, core 1 temporarily suspends autonomous telemetry collection on that card so the debug bytes don't collide with heartbeat frames. From Linux userspace, the experience is indistinguishable from opening a direct UART.

### Why This Is the Correct Architecture

Every real supercomputer eventually arrives at this split. Cray called it the Service Management Workstation. IBM Blue Gene separated "I/O nodes" from "compute nodes" from a dedicated service node. Modern HPC clusters run `slurmctld` on a control node distinct from both the login nodes and the compute nodes. The pattern is universal: **one processor hosts users, another processor runs the machine.**

The XCZU2EG gives you both classes of processor in the same package -- a full Linux workstation on the A53 cluster and a dual-core hard-real-time service processor on the R5F cluster -- and it is architecturally wrong to run the real-time side as a side effect of a Linux userspace daemon. Moving hypercube control to the R5 is not an optimization or a workaround; it is the configuration the silicon was designed for, and Xilinx publishes reference designs for exactly this case.

### What Linux Still Does

Linux is not demoted by any of this. It is promoted into the role it is genuinely good at:

- **The user frontend.** SSH, HTTPS, web API, desktop environment, terminal, file editing, the whole conventional Ubuntu experience on the Mali-accelerated 1440x1080 half of the DisplayPort output.
- **StarC compilation.** `starc_pp.py` + `riscv-gcc` + the whole build toolchain runs natively on the A53 cluster with 4 GB of DDR4 and a 500 MB/s NVMe drive.
- **Job queue and results storage.** Incoming jobs land in a queue on the NVMe, get compiled, and are dispatched to core 1 via rpmsg. Results come back and are stored in a results database on the NVMe.
- **The primary network stack.** GEM3 queues 0-1 belong to Linux; the BMC's queues 2-3 are shared on the same PHY but belong to core 0.
- **The desktop display.** The Mali-400 draws the Ubuntu UI on the left 1440x1080 of the screen.

What Linux stops doing is pretending to be a real-time processor. That job moves where it belongs.

### Crash Survival, Stated Honestly

With this architecture, the "sidebar survives Linux crashes" story becomes a subset of a much stronger claim: **the hypercube survives Linux crashes.** In particular:

- **In-flight jobs finish to completion on the R5.** If Linux panics while a Mandelbrot render is running, core 1 keeps orchestrating the TDMA phase clock, keeps pumping the control tree, and keeps collecting results from the nodes. The job finishes. Its output ends up in the reply buffer, waiting for Linux to come back and collect it.
- **Telemetry keeps flowing.** The thermal table is maintained by core 1 from autonomous heartbeats. Linux is not in that path.
- **The LED panel keeps displaying a live thermal map.** Core 1 is rendering it and pushing it to the RP2040 every frame. Linux is not in that path.
- **The sidebar mirror and the HUD stay live.** Core 0 reads the thermal table (written by core 1) and the RP2040 MISO readback, and renders both halves of the operator console. Linux is not in that path either.
- **The BMC network services stay reachable.** Core 0 owns its own GEM queue via the shared-GEM Screener. Linux is not in that path.
- **What you actually lose:** the ability to submit *new* jobs, edit files, SSH in, or compile new StarC programs -- because those are genuinely Linux-side activities. The machine as a whole degrades to "the currently running job finishes cleanly, the operator console stays live showing real data, and then new work has to wait for a Linux reboot."

The HUD gets a new `LINUX:` line that reads `ALIVE`, `DEAD`, or `REBOOTING` based on whether the Linux-side heartbeat mailbox is still ticking. When it reads `DEAD`, core 0 posts an event to the log (`14:47:12 LINUX: kernel panic -- hypercube still running autonomously`) and the BMC dashboard in a browser on the LAN turns the Linux status red while the hypercube status stays green. Both are telling the truth.

This is dramatically better than "the screen keeps drawing pixels of stale data." It is what crash-tolerant supercomputers have always meant by "survivable," and it is only possible because the real-time control path and the user-facing control path live on different CPUs in different power domains.

## The Operator Console: A Fabric-Owned Display Sidebar

The DisplayPort output is not just for running Ubuntu. Modern single-board computers hand the entire display to the operating system and call it a day -- on this machine, the fabric claims part of the screen for itself, permanently, and Linux isn't even told it exists. The result is a hardware operator console that runs at all times and survives any software state, including complete kernel panics.

### The Partition

The physical DisplayPort link runs at **1920x1080 @ 60Hz**. Rather than handing all 2,073,600 pixels to Linux, the framebuffer is split into two vertical regions:

```
+----------------------------------------------------+
|  DisplayPort output: 1920x1080 @ 60Hz              |
|  +-----------------------------+------------------+ |
|  |                             | +--------------+ | |
|  |                             | |              | | |
|  |                             | |  448x448     | | |
|  |                             | |  LED PANEL   | | |
|  |   1440x1080 Ubuntu          | |  MIRROR      | | |
|  |   (4:3, Mali-400 GPU,       | |  (7x exact)  | | |
|  |    Xorg / Wayland)          | |              | | |
|  |                             | +--------------+ | |
|  |                             | ---------------- | |
|  |                             |  TELEMETRY HUD   | |
|  |                             |  (fabric text    | |
|  |                             |   480x600)       | |
|  |                             |                  | |
|  +-----------------------------+------------------+ |
|            Linux side                sidebar        |
|            (PS owns)              (fabric owns)     |
+----------------------------------------------------+
```

- **Left region: 1440x1080** -- exact 4:3 aspect ratio, the same aspect every 1980s workstation monitor had (VGA, Sun 3, NeXTstation, SPARCstation). This is what Linux/Xorg/Wayland sees as its entire display. The Mali-400 GPU renders the Ubuntu desktop into this region exactly as it would on any other machine. Applications, window managers, and the kernel framebuffer console believe the screen is 1440x1080 and nothing more.
- **Right region: 480x1080** -- owned exclusively by the Programmable Logic. Split into two sub-regions: a **448x448 LED panel mirror** at the top (centered with a 16-pixel decorative border on each side) and a **480x600 telemetry HUD** below it. Linux has no knowledge of these pixels and no way to draw on them.

### How the Partition Works

The PS DisplayPort controller is configured for 1920x1080 and scans out a single contiguous framebuffer from DDR4. Linux is then told via the framebuffer driver that the screen is **1440x1080** but that the scanline stride is **1920 x 4 bytes = 7680 bytes** instead of the expected 5760. This is a standard trick: Xorg writes 1440 pixels per line, leaves the remaining 480 pixels of each scanline untouched, and the DP hardware happily pulls all 1920 pixels per line anyway. Linux has no idea the extra 480 pixels exist because they're outside the framebuffer size it was configured with.

A PL AXI master on one of the Zynq's High-Performance (HP) AXI ports writes directly into those otherwise-untouched 480 pixels per line. The DP controller, reading the same DDR4 region, scans the fabric-written pixels out on the right side of the display. Both writers (PS GPU on the left, PL DMA on the right) share the DDR4 memory controller but never touch each other's regions. Zero conflict, zero coordination, zero software involvement.

**This is the key architectural property:** the sidebar is not a Linux feature, not a kernel module, not an Xorg driver, not a userspace process. It is a hardware DMA master writing to a fixed memory region that the display controller happens to scan out. Nothing in the Linux software stack is aware it exists.

### The Out-of-Band Console Property

Because the sidebar is painted by a processor that shares nothing with the Linux side except the DDR4 memory controller, it **keeps running when Linux is dead**. When Ubuntu panics, when Xorg hangs, when the A53 cores livelock inside a kernel bug -- none of it matters to the sidebar. R5 core 0 keeps reading telemetry and writing pixels, the DMA path keeps moving bytes to the framebuffer, and the DP controller keeps scanning it all out at 60Hz.

More importantly, **the data the sidebar is displaying is still live**, because R5 core 1 is still running the hypercube. Telemetry keeps streaming into the thermal table, the LED panel keeps displaying an up-to-the-second thermal map, and any job that was in flight when Linux died keeps executing to completion on the compute nodes. See "Hypercube Controller: R5F Core 1" below for the full architecture -- the short version is that Linux was never on the hypercube control path in the first place.

The user experience of a crashed system becomes:

- **Left side:** frozen desktop, last image before the crash
- **Right side:** **still updating with live data.** Real thermal map from the 4,096 compute nodes, real temperatures, real TDMA state, real card health. Any in-flight StarC job keeps running to completion and the progress bar keeps climbing. The HUD posts a header reading `LINUX: DEAD (kernel panic at 14:47:12)` so there's no ambiguity about what happened, but everything else on the sidebar is current.

This is exactly what enterprise servers call an **out-of-band management console**. IBM RSA, Dell iDRAC, HP iLO, Sun LOM -- every major server vendor ships dedicated BMC silicon just to provide this feature, because the ability to see what's wrong *when the main OS can't tell you* is the difference between "five-hour remote debug session" and "oh, node 7 is on fire." Commercial servers pay hundreds of dollars of BOM cost for a dedicated BMC chip to get this.

This board gets it for free because the PL is already on the other side of the DP controller's DMA port, and because the R5 cluster is on the other side of Linux entirely. The BMC functionality and the hypercube-survives-Linux-crash property are both side effects of where the fabric and the R5 cores happen to sit in the memory hierarchy.

### The 448x448 LED Mirror

The top of the sidebar is a live mirror of the 64x64 front-panel LED display, scaled **7x exactly** to 448x448, centered in the 480-wide sidebar with a 16-pixel dark border on each horizontal edge. The integer scaling factor is deliberate: it's pixel-perfect with no interpolation artifacts, and the visible grid between upscaled pixels gives each LED a chunky, deliberate look. The 16-pixel border reads as a bezel around the mirrored display.

**The critical detail is where the mirror source comes from.** It is not the "intended framebuffer" the host library last pushed -- because the RP2040 on the front panel is not a dumb slave. It runs its own animations, plays local video (Bad Apple, a Doom demo, boot splashes, idle screensavers), and composites host overlays on top of local content. At any moment, the RP2040 might be lighting up pixels the Zynq never pushed. The only way to know what is *actually* on the physical panel is to ask the RP2040 directly.

So the mirror source is the **SPI MISO readback buffer**: every frame, the RP2040 streams its current framebuffer back to the Zynq over the LED SPI link's MISO line, along with a small status header (current mode, frame counter, underrun flag). R5 core 0 reads that RX buffer in DDR4 every frame, applies the colormap LUT, and writes the scaled 7x mirror into the sidebar region of the DP framebuffer. The mirror is always showing what the RP2040 *reports it is actually displaying*, which is ground truth by construction.

Note that in thermal mode the RP2040 is displaying a framebuffer that was **produced by R5 core 1** (the hypercube controller), not by Linux. Core 1 applies the colormap to the live thermal table and writes the 64x64 image into the LED SPI TX buffer; the RP2040 then latches that frame for display and echoes it back on MISO. The mirror is therefore reflecting R5-rendered live telemetry, and Linux is not in the path. See the "Hypercube Controller: R5F Core 1" section below for the full rendering pipeline.

See the "LED Display Pipeline" section later in the document for the full bidirectional SPI protocol. The short version: the SPI link is full-duplex, MOSI carries Zynq commands and optional push-framebuffers, MISO carries the RP2040's authoritative current framebuffer, and the mirror reads from MISO.

This matters because it means the mirror is *always correct in every mode*:

- When a StarC job is running and the panel shows the thermal map, the mirror shows the thermal map -- a live portrait of the 4,096 compute nodes
- When the machine is idle and the RP2040 is playing Bad Apple, the mirror shows Bad Apple -- your operator console literally has a music video on it
- When a job starts, the R5 sends a mode-change command, the panel snaps to thermal mode, and the mirror snaps with it in the same frame
- When the RP2040 composites a host overlay on top of local content (e.g., "JOB DONE" banner over the idle animation), the mirror shows the composite -- whatever the LEDs are showing, the mirror is showing

The "portrait of the hypercube" property is now correctly framed as **a mode the machine can be in**, not a permanent guarantee. When the panel is in thermal mode, the sidebar is a portrait of the machine. When the panel is in Bad Apple mode, the sidebar is Bad Apple. Both are correct reflections of physical reality. The HUD text *below* the mirror is independent and always shows the live machine state regardless of what the LED panel is doing, so the "telemetry about the machine" property is preserved in the HUD even when the LED mirror is showing a music video.

Implementation is cheap. The R5 already has AXI access to DDR4, so it reads the SPI RX buffer in place. A colormap LUT lives in R5 TCM (256 entries x 3 bytes = 768 bytes, negligible). The R5 applies the LUT to each of 4,096 bytes and writes 49 pixels per LED (7x7 nearest-neighbor expansion) into the sidebar region of the DP framebuffer. Total fabric cost for this block: **zero** -- it all happens on the R5. The fabric only needs to provide the SPI slave peripheral (which it already does) and the DMA master writing into the framebuffer region (shared with the HUD renderer).

Update rate: match the LED panel at 60 fps, frame-locked to the RP2040's refresh clock. Because the RP2040 drives the SPI transaction on its own v-sync and the Zynq's SPI slave latches the frame immediately, and because the R5 is running a tight loop waiting for that data, there is **sub-frame latency** between the physical front panel and its mirror -- typically one 16.6 ms frame in the worst case, often less. Wave your hand in front of the cube, the LEDs update, the mirror updates on the very next monitor refresh.

This is what gives you the canonical demo: you run a Mandelbrot render, and on the same monitor you see your terminal on the left and a live thermal portrait of the hypercube computing it on the right, updating in lockstep with the physical panel you can also see on the front of the machine. And when the machine is idle, you glance up at the operator console and it's playing Bad Apple on the right side while your desktop is on the left, and that is somehow *even better*.

### The 480x600 Telemetry HUD

Below the mirror sits a text-mode operator console. At an 8x16 VGA font, that's **60 columns x 37 rows** of monospace text -- enough for a serious telemetry display. A sample layout:

```
============================================================
  ######## ##   ## ## ###    ## ##  ## ## ###    ##
     ##    ##   ## ## ####   ## ## ##  ## ####   ##
     ##    ######## ## ## ##  ## ####   ## ## ##  ##
     ##    ##   ## ## ##  ## ## ## ##  ## ##  ## ##
     ##    ##   ## ## ##   #### ##  ## ## ##   ####
                    C O N N E C T I O N
                     M A C H I N E  II
  S/N 0001                              FW 0.4.2-alpha
============================================================
 SYSTEM
   uptime         04d 17h 23m 41s
   load avg       0.42  0.38  0.35
   zynq psu       52 C    pl fabric   67 C
   ddr4           41 C    nvme        44 C
   hostname       thinkin.local       ip  192.168.1.217
============================================================
 HYPERCUBE
   cards          16 / 16  ALIVE
   nodes          4096 / 4096  ALIVE
   tdma           RUNNING    1 kHz    phase  7 / 12
   backplane      OK   0 errors / hour
============================================================
 CURRENT JOB   mandelbrot_4k
   progress     ################....   82.4%
   started      14:32:17    elapsed  00:04:18
   nodes busy   4096        phase    collect
============================================================
 THERMAL
   hottest      card 07 node 243    78 C
   coolest      card 11 node 001    49 C
   fan rpm      2400  2380  2410  2390
============================================================
 INTEGRITY
   cosmic rays  12 hits / 24h   (sipm cpm: 0.14)
   sem scrub    0 errors corrected
   uart frames  0 errors / hour
============================================================
 LAST EVENT
   14:36:35  job mandelbrot_4k dispatched to all 16 cards
============================================================
```

Every value on that HUD comes from a different part of the system, and every source is already memory-mapped on the AXI bus:

| HUD Field | Source | AXI Slave |
| :--- | :--- | :--- |
| Uptime, load, hostname, IP | Linux -> shared mailbox in DDR4 | Mailbox region |
| Zynq PS temp | Zynq System Monitor (SYSMON) | PS peripheral |
| PL fabric temp | XADC in PL | XADC block |
| DDR4 and NVMe temps | I2C temperature sensors | I2C controller |
| Card/node alive counts | Per-UART stats counters in PL | Stats block |
| TDMA state, phase, frame | TDMA controller | TDMA UIO block |
| Backplane error counts | Per-UART error counters | Stats block |
| Current job info | thinkin-daemon -> mailbox | Mailbox region |
| Hottest/coolest nodes | Per-node temperature readings, gathered via AG32 telemetry through the UART control tree and cached in a thermal table | Thermal table in DDR4 |
| RP2040 display mode & frame counter | LED SPI MISO status header, updated every frame | LED SPI slave RX buffer |
| Fan RPM | Fan PWM/tach controller | Fan UIO block |
| Cosmic ray counter | SiPM counter (if cosmic ray detector is fitted) | Counter block |
| SEM scrub errors | Xilinx Soft Error Mitigation IP | SEM IP block |
| UART frame errors | Per-UART error counters | Stats block |
| Event log | thinkin-daemon -> ring buffer in DDR4 | Event ring |

**Not a single one of these readings goes through the Linux kernel.** The HUD renderer reads straight from the AXI slaves and writes pixels straight into the DP framebuffer. The Linux side only contributes to fields that are *only* knowable from userspace (uptime, hostname, current job) and it writes those into a mailbox region that the HUD polls. Everything else is pure fabric.

### The HUD Renderer: Cortex-R5F Core 0

The telemetry HUD is rendered by **Cortex-R5F core 0**, one of the Zynq's two hardened real-time cores, not by a soft processor in fabric. This is free silicon: the R5F cores are part of the XCZU2EG's Processing System, they've been sitting in the chip the whole time, and until now nothing on the board was using them. They run at up to 600 MHz, have their own TCM (tightly-coupled memory), their own caches, their own interrupt controller, and their own power domain separate from the A53 cluster -- meaning the R5 survives A53 crashes by design.

Core 0 runs a FreeRTOS image that does nothing except:

1. Read local telemetry from memory-mapped AXI slaves and PS peripherals (SYSMON, XADC, fan controller, stats counters)
2. Read the **hypercube thermal table** -- a shared DDR4 region maintained by R5 core 1, the hypercube controller, containing live per-node temperatures, alive bitmap, and job state (see "Hypercube Controller: R5F Core 1" below)
3. Read the LED SPI slave's **MISO RX buffer** -- the authoritative current framebuffer streamed back from the RP2040 every refresh
4. Format telemetry into strings with `sprintf`-style code
5. Blit characters from a font ROM into the sidebar region of the DP framebuffer in DDR4
6. Upscale the RP2040's reported 64x64 framebuffer 7x into the top 448x448 of the sidebar
7. Sleep for ~16ms (for a 60Hz update rate) and repeat

Because core 0 has direct AXI access to DDR4 and to the LED SPI slave peripheral, it reads the MISO RX buffer in place. This is the **actual, authoritative** current panel content (see the "LED Display Pipeline" section later in the document for why this has to come from the RP2040's readback rather than from a host-written framebuffer). The R5 applies the colormap LUT and writes the scaled mirror into the sidebar region of the DP framebuffer. Zero copies, minimal fabric logic.

Critically, **none of the data core 0 reads flows through Linux.** Local telemetry comes from hardened PS peripherals; hypercube telemetry comes from core 1's shared table; the LED mirror source comes from the SPI slave's RX buffer. The A53 cluster is not on any of these paths, and a Linux kernel panic does not perturb any of them.

The R5 is used instead of a soft core because it is flatly better for this job in every dimension: it's already in the silicon (no fabric cost), it runs ~12x faster than a PicoRV32 at fabric clock rates, it has a hard FPU, it has a full Xilinx BSP with FreeRTOS and lwIP support, and Xilinx explicitly supports "A53 runs Linux + R5 runs FreeRTOS" as a first-class AMP (Asymmetric Multiprocessing) configuration with published reference designs.

The sidebar becomes, in effect, **a completely self-contained embedded system running inside the Zynq PS**, with its own CPU, its own firmware, its own memory, and its own display output. Its sole function is to render the operator console and run the BMC services described in the next section, and it does so independently of anything the A53 cluster is doing. When Linux crashes, core 0 doesn't notice and doesn't care. It just keeps drawing pixels and answering network requests -- and because core 1 is still running the hypercube, the pixels it draws are still live data, not a frozen screenshot.

### Implementation Cost

| Component | Cost | Notes |
| :--- | :--- | :--- |
| Cortex-R5F core | **free** | Already in silicon; currently unused |
| R5 firmware (FreeRTOS + HUD renderer) | ~50 KB compiled | Lives in PS OCM + DDR4 |
| AXI HP master / DMA engine | ~500 LUTs | Shared with other fabric blocks; writes into the sidebar DDR4 region |
| 7x LED mirror scaler + colormap LUT | ~200 LUTs + 1 BRAM | Can also run on the R5 directly -- either works |
| Font ROM (8x16 VGA, 256 glyphs) | 4 KB of R5 firmware | No fabric needed -- R5 blits characters from its own RAM |
| Telemetry AXI slaves (counters, stats) | ~1,000 LUTs total | Shared with other fabric instrumentation |
| **Total fabric** | **~1,700 LUTs + 1 BRAM** | **~4% of ZU2EG fabric** |

The fabric cost is dramatically lower than a soft-core approach because the R5 is already in the PS and needs no fabric resources at all. The remaining PL logic is just the DMA master and the telemetry AXI slaves, both of which are shared with other fabric instrumentation work.

On the Linux side, the only change is a framebuffer driver patch to set the scanline stride to 1920 while reporting a resolution of 1440x1080. This is a handful of lines in the DTS file. No kernel rebuilding, no driver development.

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

Every enterprise server made in the last 20 years has one. HP calls theirs Integrated Lights-Out (iLO). Dell calls theirs the integrated Dell Remote Access Controller (iDRAC). IBM has RSA. Supermicro has IPMI-over-LAN. Sun called theirs LOM. They all do the same thing -- they give a remote administrator a way to reach the machine *when the main operating system can't tell them what's wrong*, which is precisely when it matters most.

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
                    +--------------------+
                    |   RTL8211EG PHY    |
                    |   (existing chip)  |<----> RJ45 (existing)
                    +---------+----------+
                              | RGMII (existing MIO38-51)
                    +---------v----------+
                    |   Zynq GEM3        |
                    |   +------------+   |
                    |   | Screener   |   |  Hardware classifier
                    |   | (MAC addr  |   |  routes incoming
                    |   |  matching) |   |  packets by MAC
                    |   +--+------+--+   |
                    |      |      |      |
                    |  Queues  Queues    |
                    |  0-1     2-3       |
                    +--+---------+-------+
                       |         |
                       v         v
                +----------+  +----------+
                | A53 /    |  | R5F /    |
                | Linux    |  | FreeRTOS |
                | 192.168. |  | 192.168. |
                |   1.100  |  |   1.101  |
                +----------+  +----------+
                   user         BMC
                   traffic      traffic
```

At runtime, the FSBL configures GEM3 with:
- **Queues 0-1** assigned to the A53 cluster, DMA rings in A53-owned DDR4
- **Queues 2-3** assigned to the R5F, DMA rings in R5-owned DDR4
- **Screener Type 1** rules: packets with destination MAC = Linux's MAC -> queues 0-1; packets with destination MAC = BMC's MAC -> queues 2-3; broadcast/multicast -> mirrored to both

Linux boots, its GEM driver takes ownership of queues 0-1, pulls DHCP, gets its IP address, behaves like a normal Linux machine on the network. The R5 boots in parallel, its lwIP stack takes ownership of queues 2-3, pulls its own DHCP lease with a different MAC, gets a different IP, and comes up as an independent network endpoint.

**The two operating systems never coordinate at runtime.** Linux's packets and the BMC's packets ride in separate DMA rings, serviced by separate interrupts, processed by separate CPUs, with the hardware Screener doing the multiplexing. Neither OS can see the other's packets, neither OS has to share buffers, and neither OS has to run a software forwarding loop.

This is a documented, Xilinx-supported configuration. It requires zero PCB changes. It requires zero custom hardware. It requires a FreeRTOS image, an lwIP configuration, a device tree tweak, and some FSBL configuration. That is the entirety of the hardware cost.

### Better Than Commercial BMC Sideband Sharing

Enterprise servers that share a single physical RJ45 between the host NIC and the BMC do it through a sideband protocol called **NC-SI (Network Controller Sideband Interface)**, where the BMC sits behind the main NIC and passes packets through it over a dedicated control bus. This has a subtle but important flaw: if the main NIC firmware crashes or its driver misbehaves, the BMC loses network access because its packets are riding on the main NIC's infrastructure.

Commercial vendors call this "shared LOM mode" and offer "dedicated mode" (a second physical port, separate NIC) as the higher-reliability alternative. Real sysadmins frequently pick dedicated mode because shared LOM has caused real outages.

**This board's shared-GEM scheme is architecturally better than shared LOM.** The Screener and the DMA queues are GEM hardware features, below any software. The BMC's traffic does not pass through Linux code, Linux buffers, or Linux driver logic. It doesn't even pass through a shared memory queue. The packets are classified in the GEM silicon itself and dispatched directly to the R5's DMA rings. The only shared component is the GEM peripheral, which has no software to crash.

The only genuine shared failure mode is the GEM hardware itself getting into a wedged state -- which, since the GEM is a hardened ARM IP block with decades of silicon hardening behind it, is vanishingly unlikely compared to a firmware crash in a sideband controller. And even in that failure mode, the R5 has full access to GEM3's control registers and can reset the peripheral without needing the A53s to cooperate.

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

Your router, your home switch, and your DHCP server all see two independent clients. None of them know or care that the two clients are riding on the same physical cable. No VLANs, no tagging, no coordination -- just two MACs, the way Ethernet has always worked when multiple devices share a segment.

### What Runs on the BMC

Once the R5 has an IP address, the service stack falls into place. All of these are small by modern standards -- FreeRTOS + lwIP + these services fits comfortably in 1 MB of compiled code, running out of a combination of R5 TCMs and a dedicated DDR4 region.

**HTTP dashboard on port 80.** A tiny embedded HTTP server (the kind that ships with every FreeRTOS port) exposes:

```
GET  /                     -> HTML dashboard, live-updating sidebar view
GET  /sidebar.png          -> PNG snapshot of the current 480x1080 sidebar
GET  /led.png              -> PNG snapshot of the 64x64 LED panel
GET  /telemetry.json       -> All telemetry as JSON
GET  /events               -> Server-Sent Events stream of the event log
GET  /eventlog?n=100       -> Last N events as JSON
POST /power/reset          -> Hardware reset the main system (A53)
POST /power/cycle          -> Full power cycle
POST /power/hypercube/off  -> Cut hypercube power, leave BMC up
POST /job/kill             -> Abort the current StarC job
POST /fans/set?speed=80    -> Override fan duty cycle
```

Anyone on the LAN can open `http://thinkin-bmc.local/` in a browser and see a live dashboard identical in content to the physical sidebar on the machine's own monitor -- same LED mirror, same telemetry, same event log, same fonts. The difference is that this dashboard is reachable from any computer on the network, including when Linux is dead.

**VNC / RFB server on port 5900.** A minimal RFB (Remote Framebuffer) server running on the R5 reads the sidebar framebuffer region directly from DDR4 and streams it as VNC rectangles. Point any VNC client at `thinkin-bmc.local:5900` and you get a live, pixel-perfect remote mirror of the physical operator console, streamed over TCP. This is literally what HP iLO calls "Integrated Remote Console" -- they charge extra for it. You get it because the sidebar framebuffer already exists and the R5 already has access to it.

**SSH server on port 22 -- the BMC shell.** An embedded SSH server (wolfSSH or Dropbear in cutdown form) drops you into a FreeRTOS command-line interface:

```
$ ssh bmc@thinkin-bmc.local
=== THINKIN MACHINE BMC / FreeRTOS 10.5 ===
bmc> status
  uptime       04d 17h 23m
  linux        ALIVE  pid 1 (systemd) responding
  hypercube    16/16 cards, 4096/4096 nodes
  tdma         RUNNING 1 kHz phase 7
  temps        psu=52 C pl=67 C ddr4=41 C nvme=44 C

bmc> temps --all
  zynq psu        52 C
  zynq pl         67 C    <--- from XADC
  ddr4            41 C
  nvme            44 C
  hottest node    card 07 node 243   78 C
  coolest node    card 11 node 001   49 C

bmc> fans
  fan0  2400 rpm  45% duty
  fan1  2380 rpm  45% duty
  fan2  2410 rpm  45% duty
  fan3  2390 rpm  45% duty

bmc> eventlog -n 5
  14:32:17  job mandelbrot_4k dispatched (4096 nodes)
  14:36:35  job mandelbrot_4k complete (4m 18s)
  14:37:02  linux syslog: sshd accepted connection from 192.168.1.42
  14:39:11  thermal reading card 07 node 243 peaked at 78 C
  14:43:27  BMC ssh session opened from 192.168.1.42

bmc> console
[attaches to the Linux PS UART0 console -- you can now interact with the
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

**Serial-over-LAN (SOL).** The R5 owns a bridge between the Linux PS UART0 (MIO8-9, the Linux console) and the network. When you type `console` in the BMC shell, your SSH session becomes transparent to the Linux kernel's serial console output. You can watch Linux boot, observe kernel panic messages, interact with U-Boot, type into an emergency shell -- **all over the network, through the BMC, with no working Linux network stack**. Enterprise vendors call this "Serial over LAN" or "iLO Virtual Serial Port" and it is the single most useful BMC feature in existence for debugging a machine that is half-dead.

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

**Syslog forwarding and persistence.** Linux's rsyslog forwards to the BMC. The BMC writes log messages into a circular buffer in its own DDR4 region and periodically flushes them to the QSPI flash. When Linux crashes hard enough to corrupt its own log files, the BMC still has a record of what happened. When you want to see what happened during last night's crash at 3am, you SSH into the BMC, type `eventlog --since 03:00`, and read the full history -- regardless of whether Linux's journal survived.

### Feature Parity with Enterprise BMC Silicon

| Feature | HP iLO 5 | Dell iDRAC 9 | This board |
| :--- | :---: | :---: | :---: |
| HTTP dashboard | Y | Y | Y |
| Live telemetry (temp, fans, power) | Y | Y | Y |
| Remote console (VNC/RFB) | Y | Y | Y |
| SSH BMC shell | Y | Y | Y |
| Serial-over-LAN | Y | Y | Y |
| Power control (reset, cycle) | Y | Y | Y |
| Event log (persistent) | Y | Y | Y |
| Syslog forwarding | Y | Y | Y |
| Network-independent of host OS | Y | Y | Y |
| Prometheus / SNMP telemetry | Y (license) | Y (license) | Y |
| Dedicated BMC network port | Y (extra hardware) | Y (extra hardware) | Y (shared via GEM Screener) |
| Survives host OS crash | Y | Y | Y |
| Hardware cost | Separate ASPEED chip | Separate chip | $0 (R5 already in silicon) |
| License fee | $$$ | $$$ | $0 |

The only features this board can't easily match are IPMI 2.0 over LAN (a specific IPMI stack implementation, which could be added but is largely obsolete in favor of Redfish) and virtual media redirection (mounting an ISO from the admin's laptop as a CD-ROM on the host, which would require USB gadget mode work). Everything else is straightforward FreeRTOS application code.

### Why This Section Exists

At some point during the design of this board, the R5F cores went from "a bullet point in the silicon spec sheet that I picked because the price was right" to "the single most useful piece of silicon on the entire machine." They give you a full enterprise BMC, a fabric-independent sidebar renderer, a network-accessible operator console, and a real-time hypercube controller that keeps the compute nodes running even when Linux is dead -- and they give it to you with zero additional hardware, zero PCB changes, and zero soft logic in the FPGA fabric.

The XCZU2EG is a ~$80 chip that includes, as a casual side effect of being a Zynq UltraScale+, a dual-core Cortex-A53 workstation CPU, a Mali-400 GPU, a dual-core Cortex-R5F real-time cluster, 47,000 LUTs of FPGA fabric, and a hardware DisplayPort controller. I originally picked it for the FPGA and the A53. The R5 cores came along for free, and between the two of them they run the BMC, the operator console, and the entire real-time supervisor for the hypercube. Nothing in the Zynq UltraScale+ lineup is wasted on this board -- every block is doing a job, and most blocks are doing two.

This is why I will never go back to using an off-the-shelf single-board computer for a project like this. A Raspberry Pi does not have a BMC. A Jetson does not have a BMC. An Odroid does not have a BMC. None of them have a pair of hardened real-time cores in a separate power domain sharing a memory controller with the application processor. The only way to get any of these things is to build them yourself, and the only reason I can build them is because the Zynq gave me the hardware for free.

### The Sound Table: Event-Driven Audio from the BMC

Because the R5 owns the I2S peripheral, the machine has a voice that is independent of Linux. R5 core 0 maintains a **sound table** — a set of short PCM samples indexed by event type, stored in QSPI flash and loaded into DDR4 at boot. When the R5 detects an event, it looks up the corresponding sample and streams it to the I2S DAC. Linux can be dead and the machine still speaks.

**Boot sequence chimes:**

| Event | Sound | When |
| :--- | :--- | :--- |
| Power-on | Startup chime | FSBL releases R5 from reset, ~1-2s after power-on. First sign of life — plays before the display initializes, before DDR4 training, before Linux. Like the original Macintosh, but from an independent processor. |
| Cards enumerated | Rising tone | All 16 backplane boards responded to heartbeat |
| Cards partial | Falling tone | Some boards missing — something is wrong |
| Linux up | Confirmation tone | A53 cluster reached userspace and the daemon wrote to the mailbox |
| Ready | Soft chime | thinkin-daemon started, machine is accepting jobs |

**Runtime events:**

| Event | Sound |
| :--- | :--- |
| Job submitted | Short acknowledgment |
| Job complete | Completion chime |
| Job failed | Error tone |
| SSH login to BMC | Subtle click |
| Power reset issued | Warning tone before reset |

**Errors and warnings (these play even when Linux is dead):**

| Event | Sound |
| :--- | :--- |
| Linux crash | Distinctive alert — R5 detects the A53 stopped updating the mailbox |
| Thermal warning | Ascending warning tone — a node exceeded threshold |
| Card offline | One of the 16 boards stopped responding |
| Fan failure | Tachometer stopped reporting — urgent tone |
| UART errors | Backplane communication degrading |

The startup chime is the most important. The original Macintosh played its chime from the main CPU — if the CPU was dead, silence. This machine's chime plays from the R5, which comes out of reset independently of the A53 cluster. If you ever flip the power switch and hear nothing, the problem is at the hardware level — the R5 itself didn't start, which means the QSPI flash or the Zynq's boot ROM failed. The chime is a diagnostic, not decoration.

### Sound Design: The Startup Chime

The chimes are generated procedurally via a Python DSP script (`Controller/Sounds/generate_chimes.py`) that outputs 48 kHz, 16-bit signed PCM WAV files. The script contains a full synthesis toolkit: wavetable oscillators with spectral morphing, detuned unison voices, ADSR envelopes, bell tones with inharmonic partials, and frequency sweeps. The output files are baked into the R5 firmware image for QSPI flash storage.

The startup chime is a **I→IV chord progression** (Cmaj add9 → Fmaj add9) that lasts approximately 5.7 seconds:

**Chord I** (D3-G3-C4-E4) uses `warm_tone` in ethereal mode — nearly-pure sinusoidal pads with 4-5 detuned unison voices creating slow internal beating. Long raised-cosine attacks (0.2-0.3 seconds) mean the chord *breathes in* from silence rather than striking. The sound is calm, still, almost like a flute stop on a pipe organ. The machine is waking up.

**Chord IV** (F4-A4-F5) arrives approximately one second later, blooming in over a raised-cosine crossfade. These voices use `wavetable_tone` — a wavetable oscillator that starts with moderate harmonic richness (12 harmonics) and morphs slowly toward a purer timbre. The spectral content *moves* instead of just fading. Five detuned unison copies per voice create a wide, living pad with shimmering internal beating.

The arc of the chime is **pure → complex**. The I chord establishes stillness. The IV chord introduces harmonic movement and spectral life. The timbral enrichment mirrors the boot sequence — the machine starts quiet (R5 just woke up) and the harmonic complexity builds as more subsystems come online. Shared tones (G3, C4) ring through both chords as ethereal pads, providing continuity while the wavetable voices fill in around them.

The design philosophy is ambient, not percussive. Think Brian Eno's *Music for Airports*, not a Yamaha DX7 electric piano. The tones emerge, evolve, and decay. There are no sharp transients, no brightness bursts, no vibrato. The complexity comes from slow beating between detuned voices and from the wavetable's glacial spectral morph. The sound should feel like it belongs inside a machined aluminum cube — resonant, considered, unhurried.

For the idle state, the RP2040 can stream compressed audio data alongside its framebuffer over the SPI MISO link. When the LED panel is playing Bad Apple, the R5 decodes the audio stream and pushes it to the I2S DAC. The supercomputer plays Bad Apple with sound, through an internal speaker, in a black aluminum cube on your desk.

### The Boot Sequence

When the machine powers on, the following happens in order:

1. **Zynq BootROM** reads the QSPI flash (or MicroSD in development mode), loads FSBL (First Stage Boot Loader), the ATF, U-Boot, and the PL bitstream. The FPGA fabric comes alive -- all 16 AXI UART Lite instances, the TDMA controller, the LED SPI slave, and the fan PWM array are now active. Fans spin at 100% (fail-safe default, enforced by the PL, not by any CPU).
2. **FSBL optionally starts the R5 cluster early.** The FSBL can be configured to launch R5 core 0's firmware (`thinkin-bmc.elf`) as part of stage-2 boot, before U-Boot runs. This gives you an operator-console boot splash and a functioning BMC within ~1 second of power-on, which is long before Linux has anything to show. The R5 core 0 startup chime also plays here via the I2S path, Sun/Mac style.
3. **U-Boot** initializes DDR4, wakes the PCIe transceiver, enumerates the NVMe drive, and hands off to the Linux kernel.
4. **Ubuntu kernel** boots from NVMe. The device tree declares the 16 AXI UART Lite nodes and the TDMA/LED/fan blocks as `status = "reserved"`, so the `uartlite` and `generic-uio` drivers skip them entirely. Linux sees no `/dev/ttyUL*` and no `/dev/uio*` -- those peripherals belong to the R5.
5. **Remoteproc loads the R5 firmware images.** The `zynqmp-r5-remoteproc` kernel driver reads the `firmware-name` properties from the device tree, loads `thinkin-bmc.elf` onto core 0 (if FSBL didn't already) and `thinkin-hypercube.elf` onto core 1, releases both cores from reset, and waits for them to come up. When they do, rpmsg character devices appear: `/dev/rpmsg-hypercube`, `/dev/rpmsg-tty0..15`, and internal BMC telemetry channels.
6. **Gigabit Ethernet comes up** on GEM3 queues 0-1 (Linux side) and 2-3 (BMC side) via the shared-GEM Screener. Linux pulls its DHCP lease as `thinkin.local`; R5 core 0 pulls a separate lease as `thinkin-bmc.local`. SSH is available on both.
7. **`thinkin-daemon`** starts as a systemd service. It opens `/dev/rpmsg-hypercube`, sends a `CMD_STATUS` request, and reads back the hypercube's current state -- number of live cards, live nodes, any in-flight job state from before the last Linux reboot. It then opens a Unix socket for local job submission and an HTTPS endpoint for remote submission.
8. **Flash firmware** -- on first boot or after a firmware update, the daemon sends `CMD_FLASH` with the new AG32 firmware blob. R5 core 1 asserts Boot0 and NRST across the I2C GPIO expanders, streams the firmware through all 16 UARTs in parallel, verifies each card's bootloader echo, and reports completion. Total flash time for the full machine is under five minutes.
9. **Ready** -- the machine accepts StarC jobs. The TDMA clock is held stopped by core 1 until a job arrives.

Because the R5 cluster can be launched in stage 2 of the FSBL, the order above is slightly flexible: in a typical production boot, core 0 is already rendering the operator console sidebar and core 1 is already drawing a neutral LED boot animation before U-Boot even hands off to Linux. The 15 seconds Linux spends coming up are visible on the right side of the DisplayPort output as a live BMC boot log, not a black screen.

### The Job Lifecycle

A StarC job flows through the following stages. The Linux-side steps happen on the A53 cluster; the hypercube-side steps happen on R5 core 1:

1. **Submit** (A53) -- a user sends a `.starc` source file via SSH (`scp` + command) or the HTTPS API.
2. **Compile** (A53) -- Linux runs `starc_pp.py` to preprocess StarC into C, then `riscv-gcc` (installed on the NVMe) cross-compiles to an AG32 binary. This happens natively on the A53 cluster with 4 GB of DDR4 and a 500 MB/s NVMe drive -- no external build server needed.
3. **Load** (rpmsg -> R5 core 1) -- `machine.load()` sends a `CMD_LOAD` descriptor to core 1 with a pointer to the input data buffer in DDR4. Core 1 walks the control tree, fanning the input across the 16 UART workers, and each card's controller distributes its slice to its 256 nodes.
4. **Run** (rpmsg -> R5 core 1) -- `machine.run()` sends `CMD_RUN`. Core 1 writes `TDMA_DIVIDER` to match the program's phase rate and asserts `TDMA_ENABLE`. All 4,096 nodes begin executing simultaneously. The PL fabric generates the master phase clock and distributes it across the backplane -- jitter-free, independent of *either* the A53 or R5 scheduler, because the TDMA generator is pure hardware.
5. **Collect** (rpmsg -> R5 core 1) -- `machine.collect()` sends `CMD_COLLECT`. Core 1 has been accumulating `store_to_host()` bytes in its output ring continuously since `RUN` was issued; the collect command simply drains that ring and returns the assembled result buffer over rpmsg.
6. **Display** (implicit, R5 core 1) -- if the StarC program uses `led_set()`, the per-node LED state propagates up the control tree via UART, core 1 assembles it into a 64x64 framebuffer, and writes it into the LED SPI TX buffer. The RP2040 displays the result on the front panel on the next refresh. If the program is not using the LED panel, core 1 is still drawing its own thermal map into the same buffer, so the panel is always showing something live.

The user-visible latency of this split is negligible: an rpmsg round trip for a small command is a few microseconds, and the large payloads (firmware blobs, input data, result buffers) are passed by DDR4 pointer rather than copied through the mailbox. The throughput of the hypercube control path is fundamentally limited by the 460800-baud UARTs, not by the R5, the A53, or rpmsg.

### TDMA Clock Control

The TDMA phase clock is the heartbeat of the entire machine. It is generated entirely in the PL fabric, and its control registers are owned by **R5 core 1**, not by Linux:

| Register | Address (R5 view) | Function |
| :--- | :--- | :--- |
| TDMA_ENABLE | 0xA001_0000 | Start/stop the phase clock (1=run, 0=halt) |
| TDMA_DIVIDER | 0xA001_0004 | Clock divider (sets phase rate: 100/1000/10000 Hz) |
| TDMA_PHASE | 0xA001_0008 | Current phase counter (read-only, 0-23) |
| TDMA_FRAME | 0xA001_000C | Superframe counter (read-only, counts from reset) |

When no job is running, the TDMA clock is halted. When a `CMD_RUN` descriptor arrives from Linux over rpmsg with a `phase_rate_hz` field, core 1 writes `TDMA_DIVIDER` to match, then sets `TDMA_ENABLE`. When the job completes (either because all nodes have reported via `store_to_host()` or because `CMD_STOP` arrives), core 1 clears `TDMA_ENABLE`. The PL fabric generates the phase select signals (`TDMA_PHASE[3:0]`) on Bank 44, which propagate through the backplane to every AG32's FPGA mux. Every node in the machine switches dimension links in lockstep, because the timing comes from hardware, not software -- and because the CPU that commands the start/stop lives in a real-time power domain, there is no scheduler jitter even on the control transitions.

Linux never sees these registers. It does not map them, does not know their addresses, and cannot write them even accidentally. The A53's MMU is configured to exclude the AXI peripheral region from Linux's accessible memory map, so a stray `/dev/mem` write cannot reach the TDMA controller. This is both a correctness guarantee and a security guarantee.

### LED Display Pipeline

The LED display path is **bidirectional, full-duplex**. The SPI bus between the Zynq and the front-panel RP2040 carries a full framebuffer in each direction on every refresh: the Zynq tells the RP2040 what it wants displayed, and the RP2040 tells the Zynq what is actually on the panel right now.

This bidirectionality is necessary because the RP2040 is not a pure dumb slave. It runs its own animations, plays back local content (Bad Apple, a Doom playthrough, boot animations, idle screensavers), and composites host-pushed overlays on top of local content. At any given moment, the RP2040 is the authoritative source for what pixels are actually lit on the panel -- the controller cannot know what the LEDs are showing unless the RP2040 tells it. The operator console sidebar mirror depends on this, because the mirror must reflect the physical panel state, not the controller's intent.

**Who owns what on the Zynq side.** The SPI slave peripheral in the PL fabric is the physical link. **R5 core 1** owns the TX buffer (what gets sent on MOSI) -- in thermal mode it's rendering a live thermal map from its own telemetry table every frame. **R5 core 0** owns the RX buffer readback (what comes in on MISO) -- it consumes this for the 448x448 sidebar mirror in the operator console. Linux does not touch the SPI peripheral at all. When Linux wants to push user content (a `led_set()` from a StarC program, or a status pattern from a systemd unit, or a custom animation from a daemon), it sends a `CMD_LED_PUSH` rpmsg descriptor to core 1, and core 1 writes the user framebuffer into the TX buffer on Linux's behalf.

**Data flow:**

```
R5 core 1 command + optional framebuffer --MOSI-->  RP2040 -->  64x64 LED matrix
                                                       |
R5 core 0 sidebar mirror  <--MISO-- RP2040 current framebuffer + status
```

Every SPI transaction exchanges one full frame in each direction. The MOSI payload carries a command byte (PUSH, NOP, MODE_HOST, MODE_THERMAL, MODE_BADAPPLE, MODE_DOOM, MODE_BOOT, MODE_OVERLAY, MODE_CRASH, RESET) followed by an optional 4,096-byte framebuffer if the command is PUSH. The MISO payload carries a status header (current mode, frame counter, underrun flag) followed by the 4,096-byte framebuffer that the RP2040 is *currently lighting up* -- ground truth for whatever the panel is showing this instant.

**Who is the SPI master:** the RP2040 drives SCK and CS. This flips the conventional "Zynq as master, RP2040 as slave" arrangement, and it's deliberate. The RP2040 owns the LED refresh timer, so it knows when a frame is about to be latched into the panel drivers. Initiating the SPI transaction on the RP2040's own frame-refresh clock gives you free v-sync alignment -- every readback corresponds to a specific, completed refresh cycle, with no tearing risk. The Zynq's fabric SPI core runs in slave mode, responding whenever the RP2040 strobes CS. Master/slave selection is a firmware configuration choice, not a wiring change; both modes use the same four wires (SCK, MOSI, MISO, CS) in the same directions.

**Modes of operation:**

| Mode | Who writes the TX buffer | MISO content | Sidebar mirror shows |
| :--- | :--- | :--- | :--- |
| THERMAL (normal running state) | R5 core 1 from thermal table | Echoed back | Live portrait of the 4,096 compute nodes |
| HOST (user StarC content) | R5 core 1 on behalf of Linux | Echoed back | Whatever the user program pushed |
| LOCAL (Bad Apple, Doom, screensaver) | NOP (RP2040 ignores MOSI) | RP2040 local playback frames | Whatever the RP2040 is playing |
| OVERLAY | R5 core 1 composites overlay | Composited result | Host overlay on top of local content |
| BOOT | NOP (Zynq not ready yet) | RP2040 boot animation | Boot animation |
| CRASH (Linux dead) | R5 core 1 thermal + red border | Echoed back | Live thermal map with a crash indicator |

The sidebar mirror in the operator console reflects **whatever the RP2040 reports it is actually showing**, which is always the physical truth of the LED panel regardless of which side is generating content.

**Bandwidth budget:** 4,096 bytes per direction x 60 Hz = 246 KB/s per direction, 492 KB/s bidirectional. At a 20 MHz SPI clock the link is running at ~20% utilization. At RGB888 (12,288 bytes per direction) it rises to ~60% utilization, still comfortable. There is plenty of headroom for any reasonable pixel format.

### The Killer Demos

The demo that sells the sidebar feature:

> Power on the machine. The DisplayPort output shows a boot progress HUD on the right side while U-Boot text scrolls up the left. Ubuntu boots, the desktop appears on the left at 1440x1080 -- and the right sidebar has been live the whole time, showing the fabric coming up, cards enumerating one by one, the LED mirror filling in as each card flashes its firmware at boot. You start a Mandelbrot render. The left side is your terminal; the top-right LED mirror shows the fractal forming across the hypercube in real time; the bottom-right telemetry shows the progress bar climbing, the hottest nodes lighting up in the thermal section, elapsed time ticking up. You `kill -9` the X server. The Ubuntu side freezes. **The sidebar keeps going.** You watch the Mandelbrot job finish on the sidebar while the desktop is dead.

The BMC upgrades it:

> You power on the machine and plug it into Ethernet. Ubuntu boots on the left side of the monitor, the sidebar updates on the right side, and from your laptop across the room you open two browser tabs: `http://thinkin.local/` (Ubuntu's web services) and `http://thinkin-bmc.local/` (the BMC dashboard). Both load. You start a Mandelbrot render. The left side of the monitor shows your terminal, the right sidebar shows the thermal map forming across the hypercube, and *the BMC dashboard on your laptop shows exactly the same thing*, streamed over the network. You type `sudo pkill -9 Xorg` in the Ubuntu session. The desktop freezes. **The BMC dashboard on your laptop keeps updating in real time.** Your Ubuntu browser tab stops loading. The BMC browser tab keeps working. You `ssh bmc@thinkin-bmc.local`, type `console`, and see the Linux kernel's death rattle on your screen. You type `power reset`. You watch the reset happen both on the sidebar and on your laptop's BMC dashboard in sync. U-Boot runs, the kernel boots, Ubuntu comes back. **You did all of this without ever touching the main machine.**

That's not a homebrew project demo. That's a server demo. That's what an HP engineer would show you about iLO.

### Device Tree: Reserved Memory and Remoteproc

The controller-board peripherals split into three classes, each with a different Linux integration strategy.

**Class 1 -- Peripherals reserved to the R5 cluster.**

The 16 AXI UART Lite instances, the TDMA block, the LED SPI slave, and the fan PWM/tach block are all AXI peripherals sitting on the PL side of the interconnect. Under the AMP configuration, they are **marked as reserved on the Linux side** so the Linux drivers never probe them:

```
/* Linux device tree -- the PL peripherals are reserved for the R5 */
hypercube_uart0: serial@a0000000 {
    compatible = "xlnx,xps-uartlite-1.00.a";
    reg = <0x0 0xa0000000 0x0 0x1000>;
    interrupts = <0 89 4>;
    interrupt-parent = <&gic>;
    status = "reserved";          /* R5 owns this */
};
/* ... through hypercube_uart15, then tdma_ctrl, led_spi, fan_ctrl, all reserved */
```

None of these devices appear in `/dev` on the Linux side. The `uartlite` kernel driver is still in the kernel tree, but it never binds to any node. The AXI peripherals belong to R5 core 1 exclusively, and core 1's FreeRTOS image drives them directly from its own address space (which is set up in the R5 BSP rather than the Linux device tree).

The IRQs for these peripherals are routed through the PS GIC's SPI lines so that core 1 -- not the A53 cluster -- is the target. This is a one-line change in the Xilinx IP Integrator design and a matching change in the `interrupt-parent` of the R5's BSP, and it ensures that Linux never even sees the interrupts fire.

**Class 2 -- Reserved memory regions for the R5 cluster.**

Core 0's FreeRTOS image, core 1's FreeRTOS image, the shared rpmsg vring buffers, and the shared thermal table all live in specific DDR4 regions that must be carved out from under Linux's normal memory allocator:

```
reserved-memory {
    #address-cells = <2>;
    #size-cells = <2>;
    ranges;

    r5_0_code: r5-0-code@70000000 {
        reg = <0x0 0x70000000 0x0 0x00200000>;  /* 2 MB for core 0 FreeRTOS */
        no-map;
    };
    r5_1_code: r5-1-code@70200000 {
        reg = <0x0 0x70200000 0x0 0x00200000>;  /* 2 MB for core 1 FreeRTOS */
        no-map;
    };
    rpmsg_vrings: rpmsg@70400000 {
        reg = <0x0 0x70400000 0x0 0x00100000>;  /* 1 MB for vring buffers */
        compatible = "shared-dma-pool";
    };
    thermal_table: thermal@70500000 {
        reg = <0x0 0x70500000 0x0 0x00010000>;  /* 64 KB shared thermal table */
        compatible = "shared-dma-pool";
    };
    sidebar_fb: fb@70600000 {
        reg = <0x0 0x70600000 0x0 0x007e8000>;  /* 480x1080 ARGB sidebar */
        no-map;
    };
};
```

Linux is told to stay out of these regions. The A53 MMU is configured to map them as non-cached shared memory so accesses from either cluster see a consistent view of the same bytes. This is the same pattern Xilinx ships in every AMP reference design on the ZU+ platform.

**Class 3 -- The rpmsg channel to the R5 cluster.**

Linux talks to the R5 cores through **remoteproc + rpmsg**, the mainline Linux framework for asymmetric multiprocessing with Xilinx UltraScale+ remote CPUs. Two remoteproc nodes are declared -- one for each R5 core -- with the firmware images and rpmsg channel descriptors attached:

```
zynqmp_r5_rproc {
    compatible = "xlnx,zynqmp-r5-remoteproc";
    xlnx,cluster-mode = <0>;  /* split mode: core 0 and core 1 independent */

    r5f_0 {
        memory-region = <&r5_0_code>, <&rpmsg_vrings>;
        firmware-name = "thinkin-bmc.elf";
        rpmsg_channels {
            rpmsg-bmc { /* HUD telemetry mailbox, SoL bridge, etc. */ };
        };
    };
    r5f_1 {
        memory-region = <&r5_1_code>, <&rpmsg_vrings>, <&thermal_table>;
        firmware-name = "thinkin-hypercube.elf";
        rpmsg_channels {
            rpmsg-hypercube { /* job command / reply channel */ };
            rpmsg-tty0 { /* virtual TTY for card 0 debug */ };
            /* ... rpmsg-tty15 ... */
        };
    };
};
```

At boot, Linux's remoteproc framework loads `thinkin-bmc.elf` onto core 0, loads `thinkin-hypercube.elf` onto core 1, releases both cores from reset, and exposes the rpmsg channels as character devices: `/dev/rpmsg-hypercube` for the job command protocol, `/dev/rpmsg-tty0..15` for interactive per-card debug, and internal channels for BMC telemetry exchange.

The total custom kernel code for the entire controller board is **zero lines**. Remoteproc and rpmsg are both mainline. The R5 BSPs and FreeRTOS ports are Xilinx-supplied.

### Linux Software Stack

Linux does not own the hypercube hardware directly. R5F core 1 owns the 16 AXI UART Lite instances, the TDMA block, the LED SPI TX buffer, and the fan PWM controller. Linux is a user of that controller, reaching it through an rpmsg mailbox. The AXI UART Lite device tree nodes on the Linux side are marked `status = "reserved"` so the mainline `drivers/tty/serial/uartlite.c` driver never binds to them. Linux reaches the UARTs indirectly through the `/dev/rpmsg-hypercube` command channel (for job control) or through the `/dev/rpmsg-tty0..15` virtual TTYs (for interactive debug), both backed by the OpenAMP rpmsg framework and serviced by core 1 on the other side of the mailbox.

**For interactive debug**, the `/dev/rpmsg-tty0..15` virtual serial ports are still available and still work with every standard Linux tty tool. `picocom /dev/rpmsg-tty5` opens a bidirectional bridge through core 1 to card 5's UART, and while the bridge is open core 1 suspends autonomous telemetry collection for that one card so the debug bytes don't collide with heartbeat frames. From the user's shell, the experience is indistinguishable from the old direct-UART design.

This architecture is cleaner than the alternatives. A Raspberry Pi with 16 USB-FTDI dongles would suffer from USB latency, hub topology pain, flaky connectors, and no hardware synchronization. A single-CPU Zynq design would work but would put real-time UART servicing on a CPU that runs a preemptive multitasking kernel. The dual-cluster approach gives you 16 fully independent hardware UARTs, serviced by a processor that was designed for real-time work, controlled from Linux through a single mainline rpmsg character device -- with no custom kernel code anywhere in the stack.

### The rpmsg Command Protocol

Linux and R5 core 1 communicate over **Xilinx OpenAMP rpmsg**, a standard Xilinx-supported AMP pattern with mainline Linux drivers and published reference designs. A single rpmsg channel carries command descriptors in one direction and reply descriptors in the other:

```c
struct hypercube_cmd {
    uint32_t opcode;       // FLASH, LOAD, RUN, COLLECT, ...
    uint32_t job_id;
    uint32_t card_mask;    // which of the 16 cards to act on
    uint64_t payload_ptr;  // DDR4 pointer to command payload
    uint32_t payload_len;
    uint64_t reply_ptr;    // DDR4 pointer to reply buffer
    uint32_t flags;
};
```

The payload and reply buffers live in DDR4 regions that are mapped into both the A53 and R5 address spaces with matching MMU/MPU entries, so there are no extra copies. Linux writes the payload, pushes the descriptor, and waits for the reply doorbell. Core 1 processes the descriptor and rings the completion back via a second IPI. The whole round trip is sub-millisecond for small commands and throughput-limited (not latency-limited) for large ones.

**rpmsg opcodes understood by the R5 hypercube controller firmware:**

```python
CMD_FLASH    = 0x01
CMD_LOAD     = 0x02
CMD_RUN      = 0x03
CMD_COLLECT  = 0x04
CMD_LED_PUSH = 0x05
CMD_LED_MODE = 0x06
CMD_SET_FAN  = 0x07
CMD_STATUS   = 0x08
CMD_RESET    = 0x09
```

### The Host Library: How Linux Talks to the Hypercube Controller

The Python host library (`thinkin/machine.py`, documented in the [AG32 Gating Document](https://bbenchoff.github.io/pages/AG32Gating.html) as Software Milestone S3) is the single point of control for the entire hypercube. From the user's point of view, its API is exactly what it would be in a naive single-CPU design: you construct a `ThinkinMachine` object and call `flash()`, `load()`, `run()`, `collect()`, `led_push()`, and so on. Everything the old design did with `pyserial` and `mmap` still works from the caller's perspective -- just in a completely different place.

Under the hood, instead of opening 16 serial ports and mmaping three UIO windows, the library opens a single rpmsg character device and pushes command descriptors to R5 core 1:

```python
import os
import struct

class ThinkinMachine:
    def __init__(self):
        # One character device, one open() call. The rpmsg channel
        # is backed by a virtio vring in the reserved DDR4 region and
        # serviced by R5 core 1 on the other side.
        self.fd = os.open('/dev/rpmsg-hypercube',
                          os.O_RDWR | os.O_CLOEXEC)

    def _do(self, opcode, payload=b'', card_mask=0xFFFF, job_id=0):
        # Write a command descriptor, block until the R5 writes a reply.
        # The kernel's rpmsg character-device driver handles the framing
        # and the doorbell IPI; userspace just sees read() and write().
        header = struct.pack('<IIIQI',
                             opcode, job_id, card_mask,
                             0,  # payload_ptr unused for inline payloads
                             len(payload))
        os.write(self.fd, header + payload)
        reply = os.read(self.fd, 65536)
        return reply

    def flash(self, firmware_path):
        # R5 core 1 handles Boot0/NRST via the I2C GPIO expanders,
        # streams firmware through each card's UART bootloader at
        # 460800 baud, verifies the echo, and reports completion.
        with open(firmware_path, 'rb') as f:
            payload = f.read()
        return self._do(CMD_FLASH, payload)

    def load(self, data, dest_pvar):
        # R5 core 1 fans the data across the 16 UART workers and
        # walks the control tree down to each node.
        return self._do(CMD_LOAD, data)

    def run(self, phase_rate_hz=1000):
        # R5 core 1 programs TDMA_DIVIDER, asserts TDMA_ENABLE, and
        # begins watching for completion frames from the cards.
        return self._do(CMD_RUN,
                        struct.pack('<I', phase_rate_hz))

    def collect(self, timeout=5.0):
        # R5 core 1 has been accumulating results in its output ring
        # as nodes call store_to_host(). COLLECT drains the ring.
        return self._do(CMD_COLLECT,
                        struct.pack('<d', timeout))

    def led_push(self, framebuffer):
        # Hand a user framebuffer to R5 core 1, which writes it into
        # the LED SPI TX buffer for the next RP2040 refresh.
        return self._do(CMD_LED_PUSH, bytes(framebuffer))

    def led_set_mode(self, mode):
        # R5 core 1 issues the mode-change command byte to the RP2040
        # on the next SPI transaction.
        return self._do(CMD_LED_MODE, mode.encode('ascii'))

    def led_current_frame(self):
        # R5 core 0 already has this -- the LED SPI MISO readback.
        # The hypercube controller forwards a snapshot via rpmsg.
        return self._do(CMD_STATUS,
                        struct.pack('<I', 1))  # flag: want framebuffer

    def status(self):
        # One-shot read of the full machine state: thermal table,
        # alive bitmap, TDMA phase, current job, fan RPMs.
        return self._do(CMD_STATUS,
                        struct.pack('<I', 0))  # flag: telemetry only
```

Every StarC host I/O primitive maps to a method on this class exactly as before. When a StarC program calls `load_from_host(&input, 1)`, `load()` sends a `CMD_LOAD` rpmsg to core 1, and core 1 fans the data across the appropriate UART workers. When `store_to_host(&result, 1)` executes, the R5 accumulates the result bytes as they arrive from the control tree; `collect()` drains that accumulated output with a single round trip.

The entire host library is around 300 lines of pure Python, plus ~200 lines of C in the R5 firmware that decodes rpmsg descriptors and dispatches to the appropriate UART workers. The library code is simpler than the pyserial+mmap version -- one open file descriptor instead of 19, one protocol instead of two, no per-UART bookkeeping -- because most of the work has moved to the R5 where it belongs.

**LED display host library interface:**

```python
machine.led.push(framebuffer)        # CMD_LED_PUSH rpmsg to core 1
machine.led.set_mode('thermal')      # CMD_LED_MODE rpmsg to core 1
machine.led.set_mode('badapple')
machine.led.set_mode('doom')
machine.led.current_frame()          # CMD_STATUS rpmsg with framebuffer flag
machine.led.status()                 # CMD_STATUS rpmsg, telemetry only
```

Underneath, every call is an rpmsg descriptor to core 1. The host library does not have direct access to the LED SPI peripheral, and it does not need it -- core 1 is the single source of truth for what goes out on MOSI, and it handles user-content push requests as well as its own autonomous thermal rendering. `current_frame()` returns whatever the RP2040 *actually* has on the panel, because the LED mirror has to be a portrait of physical reality regardless of which side last wrote the TX buffer.

This pipeline also runs outside of StarC jobs. The `thinkin-daemon` can push status patterns, boot splashes, or card health visualizations by sending `CMD_LED_PUSH` commands. It can hand control back to the RP2040 at any time by sending `CMD_LED_MODE` with `MODE_BADAPPLE` or similar, and the sidebar mirror dutifully reflects the playback in real time.

### R5F Core 0: BMC and HUD Firmware

Core 0 runs a FreeRTOS image that handles:

**HUD renderer** -- reads local telemetry from AXI slaves and PS peripherals (SYSMON, XADC, fan controller, stats counters), reads the hypercube thermal table from shared DDR4 (written by core 1), reads the LED SPI MISO RX buffer, formats everything into strings, blits characters from a font ROM into the sidebar framebuffer, and upscales the RP2040's 64x64 readback 7x into the LED mirror. Runs at 60 Hz.

**BMC services** -- all running on the R5's own shared-GEM network queue:
- HTTP dashboard on port 80
- VNC/RFB server on port 5900
- SSH server on port 22 (wolfSSH or Dropbear)
- Serial-over-LAN bridge (UART0 console to network)
- Prometheus exporter on port 9100
- Syslog receiver and persistent event log

**Implementation plan:**

1. **FSBL modification** -- partition GEM3 into A53-owned queues (0-1) and R5-owned queues (2-3), configure the Screener for MAC-based routing. Xilinx provides a reference FSBL that already supports this; it's ~50 lines of C.

2. **R5 FreeRTOS application** -- FreeRTOS kernel + lwIP + HTTP server + embedded SSH + RFB server + Prometheus exporter + HUD renderer + telemetry gathering state machine. Rough code size: 100-200 KB of compiled binary, living in a combination of R5 TCMs and a dedicated DDR4 region. Probably 3,000-5,000 lines of C total, most of which is boilerplate service handlers.

3. **Linux device tree changes** -- declare GEM3 as `xlnx,shared-gem` (or equivalent) with queues 0-1 claimed, yielding queues 2-3 to the R5. Declare the R5's DDR4 region as reserved memory. Declare the DP framebuffer with a 1920 stride but 1440 resolution. Maybe 30 lines of DTS.

4. **Linux userspace daemon** -- a small systemd service that writes live telemetry (uptime, load, job state, hostname, IP) into the shared mailbox region the R5 reads. Maybe 200 lines of Python.

5. **Boot orchestration** -- U-Boot loads both the Linux kernel and the R5 FreeRTOS image, starts the R5 via the Zynq's remoteproc framework before handing off to the kernel. This is standard OpenAMP boot flow with published reference designs.

Total software effort: maybe two weeks of focused work by someone who already knows Xilinx AMP. Total hardware effort: **zero**. Total new BOM parts: **zero**. Total PCB changes: **zero**.

### R5F Core 1: Hypercube Controller Firmware

Core 1 runs its own FreeRTOS image with the following subsystems:

- **16-UART worker tasks** -- one per card. Each task owns its UART's IRQ, drains RX FIFO into a per-card ring buffer, feeds TX FIFO from a per-card TX queue. Handles protocol framing and bootloader sequencing during flash operations.
- **Autonomous telemetry parser** -- decodes heartbeat frames from each card's AG32 controller (per-node temperatures, alive bitmap, job phase, sequence counter). Updates the **thermal table** in shared DDR4: 4,096 entries x 8 bytes = 32 KB.
- **Thermal map renderer** -- applies colormap LUT to thermal table, produces 64x64 framebuffer, writes to LED SPI TX buffer every frame.
- **Job dispatcher** -- receives `CMD_FLASH`, `CMD_LOAD`, `CMD_RUN`, `CMD_COLLECT`, etc. over rpmsg from Linux. Fans work across UART workers, accumulates results in output ring.
- **rpmsg responder** -- services the `/dev/rpmsg-hypercube` command channel and the `/dev/rpmsg-tty0..15` virtual TTY bridges.
- **TDMA controller driver** -- programs `TDMA_ENABLE` and `TDMA_DIVIDER` on job start/stop.
- **Fan PID control loop** -- reads thermal table, drives fan PWM duty cycle.

### R5F Budget (Both Cores)

| Subsystem | Runs On | Memory |
| :--- | :--- | :--- |
| Sidebar HUD renderer | R5 core 0 | 64 KB TCM + shared DDR4 framebuffer |
| LED mirror scaler (MISO readback) | R5 core 0 | In the same loop as HUD |
| HTTP server + web dashboard | R5 core 0 | ~100 KB DDR4 |
| SSH server (Dropbear / wolfSSH) | R5 core 0 | ~150 KB DDR4 |
| VNC / RFB server | R5 core 0 | ~50 KB DDR4 |
| Serial-over-LAN bridge | R5 core 0 | Small buffers, shared with console |
| Prometheus exporter | R5 core 0 | ~20 KB DDR4 |
| Event log (circular buffer) | R5 core 0 | 256 KB DDR4 + periodic QSPI flush |
| FreeRTOS kernel + lwIP (core 0) | R5 core 0 | ~200 KB DDR4 |
| 16-UART hypercube control tree | R5 core 1 | 16 x 4 KB RX rings + per-card state |
| Autonomous telemetry parser | R5 core 1 | ~8 KB parser state |
| Hypercube thermal table (4,096 nodes) | R5 core 1 | 4,096 x 8 B = 32 KB shared DDR4 |
| Thermal map renderer (LED SPI TX) | R5 core 1 | 4 KB framebuffer + 768 B colormap LUT |
| Job dispatcher + rpmsg responder | R5 core 1 | ~32 KB DDR4 for command/reply rings |
| TDMA controller driver | R5 core 1 | Small -- direct AXI register writes |
| Fan PID control loop | R5 core 1 | Minimal |
| FreeRTOS kernel + OpenAMP (core 1) | R5 core 1 | ~150 KB DDR4 |

The machine has two R5F cores, and both are fully committed. **Core 0** runs the BMC + HUD stack. **Core 1** runs the hypercube controller. The complete firmware for both cores fits comfortably in the available TCM plus a few megabytes of reserved DDR4.

### Configuring the R5 Cluster from Linux

The R5 firmware images are loaded by remoteproc at boot from `/lib/firmware/`. Updating the firmware is a file copy and a restart:

```bash
scp thinkin-bmc.elf user@thinkin.local:/lib/firmware/
echo stop  > /sys/class/remoteproc/remoteproc0/state
echo start > /sys/class/remoteproc/remoteproc0/state
```

But firmware updates should be rare. For day-to-day configuration — sidebar layout, chime sounds, thermal thresholds, fan curves, LED panel mode — the R5 reads a live configuration region over rpmsg. Linux writes configuration commands; the R5 applies them on the next frame. No recompile, no reboot.

**The `thinkin-ctl` tool:**

```bash
# Sidebar
thinkin-ctl sidebar --layout compact
thinkin-ctl sidebar --layout full
thinkin-ctl sidebar --reload          # re-read sidebar.css from disk

# Audio
thinkin-ctl chime --event boot --file /usr/share/thinkin/chimes/startup.pcm
thinkin-ctl chime --event job-complete --file /usr/share/thinkin/chimes/done.pcm
thinkin-ctl chime --list              # show all event→sound mappings
thinkin-ctl volume 80                 # 0-100

# Thermal and fans
thinkin-ctl thermal --warn 75 --critical 90
thinkin-ctl fans --curve aggressive
thinkin-ctl fans --curve silent
thinkin-ctl fans --set 60             # manual override, 60% duty

# LED panel
thinkin-ctl led --mode thermal
thinkin-ctl led --mode badapple
thinkin-ctl led --mode host           # Zynq pushes frames

# Status
thinkin-ctl status                    # dump full machine state from R5
```

Under the hood, `thinkin-ctl` writes structured commands to `/dev/rpmsg-bmc` (core 0) or `/dev/rpmsg-hypercube` (core 1). It's maybe 500 lines of Python wrapping the rpmsg character devices.

### Sidebar Styling: `sidebar.css`

The HUD layout is defined by a CSS-like configuration file at `/etc/thinkin/sidebar.css`. The R5's HUD renderer parses a simplified subset of CSS that maps to its text-mode blitter. This isn't a browser — it's a 60-column × 37-row character grid — but CSS syntax is familiar and expressive enough to define what goes where.

```css
/* /etc/thinkin/sidebar.css */

sidebar {
    width: 480px;
    height: 1080px;
    background: #000000;
    font: 8x16 vga;
    color: #cccccc;
}

led-mirror {
    position: top;
    width: 448px;
    height: 448px;
    scale: 7x;
    border: 16px solid #000000;
}

section#header {
    border-bottom: double;
    color: #ffffff;
    text-align: center;
    content: "THINKIN MACHINE II";
}

section#system {
    label: "SYSTEM";
    border-bottom: single;
    color: #88ff88;
}

section#system field#uptime    { source: bmc.uptime;    format: "DDd HHh MMm SSs"; }
section#system field#load      { source: linux.loadavg;  format: "%.2f %.2f %.2f"; }
section#system field#temps     { source: bmc.temps;      format: "%s %d°C"; columns: 2; }
section#system field#hostname  { source: linux.hostname;  }
section#system field#ip        { source: linux.ip;        }

section#hypercube {
    label: "HYPERCUBE";
    border-bottom: single;
    color: #88ccff;
}

section#hypercube field#cards  { source: r5_1.cards_alive;  format: "%d / 16"; }
section#hypercube field#nodes  { source: r5_1.nodes_alive;  format: "%d / 4096"; }
section#hypercube field#tdma   { source: r5_1.tdma_state;   }
section#hypercube field#errors { source: r5_1.uart_errors;  format: "%d errors/hour"; }

section#job {
    label: "CURRENT JOB";
    border-bottom: single;
    color: #ffcc44;
    visible: r5_1.job_active;
}

section#job field#name      { source: r5_1.job_name; }
section#job field#progress  { source: r5_1.job_progress; format: bar; width: 20; }
section#job field#elapsed   { source: r5_1.job_elapsed;  format: "HH:MM:SS"; }
section#job field#phase     { source: r5_1.job_phase; }

section#thermal {
    label: "THERMAL";
    border-bottom: single;
    color: #ff8844;
}

section#thermal field#hottest { source: r5_1.hottest_node; format: "card %02d node %03d  %d°C"; }
section#thermal field#coolest { source: r5_1.coolest_node; format: "card %02d node %03d  %d°C"; }
section#thermal field#fans    { source: bmc.fan_rpm; format: "%d  %d  %d  %d"; }

section#events {
    label: "LAST EVENT";
    border-top: single;
    position: bottom;
    color: #aaaaaa;
    lines: 3;
    source: bmc.event_log;
}

/* Conditional styling */
section#system field#temps[value > 80] { color: #ff4444; }
section#hypercube field#cards[value < 16] { color: #ff4444; }
field#linux-status[value = "DEAD"] { color: #ff0000; blink: true; }
```

The R5 HUD renderer reads this file once at startup (or on `thinkin-ctl sidebar --reload`) and builds an internal layout table: which sections exist, what order they appear in, which telemetry sources feed each field, and how to format them. Every frame, it walks the layout table, reads the corresponding AXI register or DDR4 mailbox value for each field, formats the string, and blits it into the sidebar framebuffer.

The `source` property maps directly to memory-mapped values:
- `bmc.*` — values R5 core 0 reads from PS peripherals (SYSMON, fan tach, event log)
- `r5_1.*` — values R5 core 1 writes into the shared thermal table and job state region
- `linux.*` — values the thinkin-daemon writes into the shared mailbox

The `visible` property allows sections to appear and disappear based on machine state — the job section only renders when a job is active, for example.

The `format: bar` property renders a progress bar using Unicode block characters (▏▎▍▌▋▊▉█) for smooth visual feedback.

Conditional styling uses bracket selectors. When a temperature exceeds 80°C, it turns red. When cards go offline, the count turns red. When Linux is dead, the status field blinks. The R5 evaluates these conditions every frame.

Users can edit this file, run `thinkin-ctl sidebar --reload`, and see the changes on the next monitor refresh. No recompile, no reboot, no firmware update. The sidebar becomes customizable the way a Linux desktop is customizable — with a text file and a reload command.

### BMC Implementation Plan and Effort Estimates

All firmware and software work, no hardware:

| Step | Description | Effort |
| :--- | :--- | :--- |
| 1 | FSBL modification -- partition GEM3, configure Screener | ~50 lines of C, reference FSBL exists |
| 2 | R5 core 0 FreeRTOS application (HUD + BMC services) | 3,000-5,000 lines of C, 100-200 KB compiled |
| 3 | R5 core 1 FreeRTOS application (hypercube controller) | ~2,000-3,000 lines of C |
| 4 | Linux device tree changes (reserved memory, shared-GEM, DP stride) | ~30 lines of DTS |
| 5 | Linux userspace daemon (telemetry mailbox writer) | ~200 lines of Python |
| 6 | Boot orchestration (remoteproc loading of R5 images) | Standard OpenAMP boot flow |

Total software effort: approximately two weeks of focused work for someone who already knows Xilinx AMP. Total hardware effort: **zero**. Total new BOM parts: **zero**. Total PCB changes: **zero**.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Part III — Hardware Reference (Pin Tables)

## Hardware Reference: Pin Mapping and Wiring Tables

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

### MIO Master Map

| MIO Range | Function | Status |
| :--- | :--- | :--- |
| MIO0-5 | QSPI flash (W25Q512JVEIQ, SCLK, CS, IO0-IO3) | Done |
| MIO6 | M.2 NVMe PERST# | Done |
| MIO7 | Available | |
| MIO8-9 | UART debug console (FT230XS USB-serial) | Done |
| MIO10-11 | RTC I2C (DS3231M via PS I2C0) | Done |
| MIO12 | Available | |
| MIO13-16 | MicroSD SD_DAT[0:3] (SDIO0 Option 0) | Done |
| MIO17 | Backplane buffer enable (BP_OE_N) | Done |
| MIO18-20 | Available (freed by SDIO0 Option 0 remap) | |
| MIO21 | MicroSD SD_CMD (SDIO0 Option 0) | Done |
| MIO22 | MicroSD SD_CLK (SDIO0 Option 0) | Done |
| MIO23 | Available (SD BUSPWR unused — slot hardwired to +3V3) | |
| MIO24-25 | PMIC I2C (TPS6508640 via PS I2C1) | Done |
| MIO26 | PMIC interrupt (PMIC_IRQ) | Done |
| MIO27-30 | DisplayPort AUX + HPD | Done |
| MIO31-37 | Available | |
| MIO38-51 | Ethernet RGMII + MDIO (RTL8211EG) | Done |
| MIO52-63 | USB ULPI (USB3300) | Done |
| MIO64-77 | Available | |

### Gigabit Ethernet PHY (PS_MIO Sheet)

**Realtek RTL8211EG-VB-CG** Gigabit PHY (QFN-64) connected via RGMII to Zynq GEM3 MAC. The internal 1.0V switching regulator is enabled (ENSWREG tied to 3.3V), so only a 3.3V supply is required externally.

**RGMII bus (Zynq -> PHY):**

| Zynq MIO | Zynq Ball | Function | RTL8211EG Pin |
| :--- | :--- | :--- | :--- |
| PS_MIO38 | H18 | GEM_TX_CLK | 34 (GTX_CLK) |
| PS_MIO39 | H19 | GEM_TXD0 | 36 (TXD0) |
| PS_MIO40 | K18 | GEM_TXD1 | 39 (TXD1) |
| PS_MIO41 | J19 | GEM_TXD2 | 40 (TXD2) |
| PS_MIO42 | L18 | GEM_TXD3 | 41 (TXD3) |
| PS_MIO43 | K19 | GEM_TX_CTL | 35 (TXEN) |
| PS_MIO44 | J20 | GEM_RX_CLK | 24 (RXC) -- 22-ohm series resistor at PHY |
| PS_MIO45 | K20 | GEM_RXD0 | 19 (RXD0) |
| PS_MIO46 | L20 | GEM_RXD1 | 21 (RXD1) |
| PS_MIO47 | H21 | GEM_RXD2 | 22 (RXD2) |
| PS_MIO48 | J21 | GEM_RXD3 | 23 (RXD3) |
| PS_MIO49 | M18 | GEM_RX_CTL | 18 (RXDV/PHY_AD2) |
| PS_MIO50 | M19 | GEM_MDC | 53 (MDC) |
| PS_MIO51 | L21 | GEM_MDIO | 54 (MDIO) -- 10k-ohm pullup to 3.3V |

**GMII strap pins (sampled at reset, select RGMII mode):**

| RTL Pin | Signal | Strap |
| :--- | :--- | :--- |
| 25 | RXD4/SELRGV | 10k-ohm to 3.3V (selects RGMII) |
| 27 | RXD5/TXDLY | 10k-ohm to 3.3V (enables TX clock delay) |
| 28 | RXD6/RXDLY | 10k-ohm to 3.3V (enables RX clock delay) |
| 29 | RXD7/AN0 | 10k-ohm to 3.3V (autoneg: advertise all speeds) |
| 30 | RXER/AN1 | 10k-ohm to 3.3V (autoneg: advertise all speeds) |
| 31 | COL/MODE | 10k-ohm to GND (selects RGMII mode) |
| 47 | TXER | Direct to GND |

**Unused GMII pins (no-connect):** 42 (TXCLK), 43-46 (TXD4-TXD7), 32 (CRS), 1 (CLK125).

**PHY control and configuration:**

| RTL Pin | Signal | Connection |
| :--- | :--- | :--- |
| 38 | ~{PHYRST} | 10k-ohm to 3.3V + 100nF to GND (RC power-on reset, ~1ms delay) |
| 56 | ~{INT} | 10k-ohm pullup to 3.3V |
| 55 | ~{PME} | 10k-ohm pullup to 3.3V |
| 58 | RSET | 12.1k-ohm to GND (sets internal bias -- value per Realtek spec) |
| 57 | ENSWREG | Tied to 3.3V (enables internal 1.0V switching regulator) |
| 3 | REG_OUT | 1uF + 0.1uF to GND (internal regulator output -- do NOT connect elsewhere) |
| 64 | VDDREG | 0.1uF to GND (regulator bypass) |
| 61 | CKXTAL1 | 25 MHz crystal (YXC X322525MOB4SI, LCSC C9006) + 22pF load cap to GND |
| 62 | CKXTAL2 | 25 MHz crystal + 22pF load cap to GND |

**PHY address and LED pins (dual-function, strap at reset then LED output):**

| RTL Pin | Signal | Strap | LED Function | Connection |
| :--- | :--- | :--- | :--- | :--- |
| 50 | LED0/PHY_AD0 | 10k-ohm to 3.3V (AD0=1) | Green LED (Link) | Cathode of green RJ45 LED |
| 51 | LED1/PHY_AD1 | 10k-ohm to GND (AD1=0) | Yellow LED (Activity) | Cathode of yellow RJ45 LED |
| 52 | LED2 | -- | Speed | NC or third LED |

PHY address = 0x01. LED anodes share a common 330-ohm resistor to 3.3V.

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

R1 (PHY-side center tap): 3.3V through ferrite bead + 0.1uF to ground. R10 (cable-side center tap): 0.1uF to ground.

**Power pins:**

| RTL Pin(s) | Signal | Rail |
| :--- | :--- | :--- |
| 10, 60 | AVDD33 | 3.3V + 0.1uF decoupling each |
| 20, 26, 37, 49 | DVDD33 | 3.3V + 0.1uF decoupling each |
| 7, 13, 59 | AVDD10 | Internal 1.0V (from ENSWREG regulator) + 0.1uF each |
| 33, 48 | DVDD10 | Internal 1.0V + 0.1uF each |
| 2, 4, 63, 65 | GND | Ground (pin 65 is exposed pad) |

### QSPI Flash (PS_MIO Sheet)

QSPI flash chip on MIO0-5 holds the FSBL, U-Boot, and the PL bitstream. Part: **W25Q512JVEIQ** (U7, 512Mbit / 64MB, WinBond, LCSC C7389628).

### SD Card (PS_MIO Sheet)

MicroSD slot on SDIO0, **Option 0 MIO mux** per UG1085 Table 26-11 (p744). Development boot source. 4-bit bus, default speed / high-speed mode (max 50 MHz, 25 MB/s). No UHS-I support, no 1.8V voltage translator — plenty for a boot source.

| SDIO0 Signal | MIO | Zynq Ball |
| :--- | :--- | :--- |
| SD_DAT0 | MIO13 | AH18 |
| SD_DAT1 | MIO14 | AG18 |
| SD_DAT2 | MIO15 | AE18 |
| SD_DAT3 | MIO16 | AF18 |
| SD_CMD | MIO21 | AC21 |
| SD_CLK | MIO22 | AB20 |

MIO mux options 1 (MIO38-51) and 2 (MIO64-76) were rejected — 1 conflicts with Ethernet RGMII, 2 leaves no room for future growth on bank 503.

Unused optional signals: SD_BUSPWR (MIO23), SD_CDn (MIO24 — also used for PMIC I2C), SD_WPn (MIO25 — also used for PMIC I2C). The µSD receptacle has no CD or WP switches and the slot is hardwired to +3V3, so none are needed.

Series termination: 30Ω 0402 on CLK/CMD/DAT[3:0] near the connector per UG583 §5.5. Pullup: 4.7kΩ on DAT3 for default card-present detection per SD spec.

### UART Debug Console (PS_MIO Sheet)

**FT230XS** USB-serial bridge on MIO8-9 (UART0 TX/RX). Exposes the Zynq PS UART0 console as a USB device port on the rear panel via a **USB-C connector**. Plug a laptop in, get a console -- no 3.3V USB-TTL dongle needed. The FT230XS speaks USB 2.0 Full Speed only; the USB-C receptacle requires **5.1kΩ pull-down resistors on both CC1 and CC2** so a USB-C host recognizes it as a USB 2.0 device and provides VBUS. Without these resistors the port will not enumerate.

### DisplayPort AUX (PS_MIO Sheet)

MIO27 drives AUX data out through a 100-ohm series resistor, MIO30 reads the return signal tapped from the same net, MIO29 controls the output enable (tied to 3.3V via 10k-ohm pullup), and MIO28 reads the Hot Plug Detect signal from the connector.

### DDR4 Memory (PS_DDR Sheet)

Two **Micron MT40A1G16TB-062E** chips (U2 and U3) in 96-ball FBGA packages form a 32-bit DDR4-2400 bus. Data lines are point-to-point; address/command/clock lines are fly-by terminated with 39.2-ohm resistor networks to a 0.6V VTT tracking regulator.

**Chip 1 (U2) -- Lower 16 bits, point-to-point:**

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

**Chip 2 (U3) -- Upper 16 bits, point-to-point:**

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

**Fly-by address/command/clock (Zynq -> U2 -> U3 -> 39.2-ohm to VTT):**

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
| ZQ (F9) on each chip | 240-ohm resistor to ground (3 total including Zynq PS_DDR_ZQ at U24) |
| VREFCA (M1) on each chip | 10k-ohm/10k-ohm divider to VDDQ/2 (0.6V) + 100nF filter cap |
| TEN (N9) on each chip | Tied to ground |
| ALERT# (P9) on each chip | 10k-ohm pullup to VDDQ, shared net to PS_DDR_ALERT_N (U25) |

**Unused Zynq DDR pins (no-connect):** PS_DDR_A17, PS_DDR_BG1, PS_DDR_CK1/CK_N1, PS_DDR_CKE1, PS_DDR_CS_N1, PS_DDR_ODT1, PS_DDR_DQ32-71, PS_DDR_DM4-8, PS_DDR_DQS_P4-8/N4-8.

### PS-GTR Transceiver Allocation (PS_GTR Sheet, Bank 505)

| GTR Lane | Function | Zynq TX+/TX- | Zynq RX+/RX- | Destination |
| :--- | :--- | :--- | :--- | :--- |
| Lane 0 | PCIe Gen2 x1 (NVMe) | E25/E26 | F27/F28 | M.2 M-Key Connector (J5) |
| Lane 1 | DisplayPort Lane 0 | D23/D24 | -- | DP Connector (J6) Pin 1/3 |
| Lane 2 | DisplayPort Lane 1 | C25/C26 | -- | DP Connector (J6) Pin 4/6 |
| Lane 3 | USB 3.0 SuperSpeed | B23/B24 | B27/B28 | TUSB8043A hub -> 4x USB-A 3.0 |

### M.2 NVMe Slot (PCIe x1)

**Amphenol MDT275M02001** M-Key M.2 connector. PCIe Lane 0 only; Lanes 1-3 are no-connect.

| M.2 Pin | Signal | Connection |
| :--- | :--- | :--- |
| 49 (PETp0) | Drive TX+ | -> PS_MGTRRXP0_505 (F27) |
| 47 (PETn0) | Drive TX- | -> PS_MGTRRXN0_505 (F28) |
| 43 (PERp0) | Drive RX+ | <- PS_MGTRTXP0_505 (E25) via 0.1uF AC cap |
| 41 (PERn0) | Drive RX- | <- PS_MGTRTXN0_505 (E26) via 0.1uF AC cap |
| 55 (REFCLKp) | 100 MHz ref+ | From LVDS oscillator (YXC OA1EL89CEIB112YLC-100M) |
| 53 (REFCLKn) | 100 MHz ref- | From LVDS oscillator |
| 50 (PERST#) | PCIe Reset | Driven from Zynq MIO/PL GPIO |
| 52 (CLKREQ#) | Clock Request | 10k-ohm pullup to 3.3V |
| 54 (PEWAKE#) | Wake | 10k-ohm pullup to 3.3V |
| 69 (PEDET) | Presence Detect | 10k-ohm pullup to 3.3V |
| 2,4,12,14,16,18,70,72,74 | +3.3V | Dedicated high-current 3.3V NVMe buck converter |

The 100 MHz LVDS oscillator also feeds PS_MGTREFCLK1P/N (E21/E22) on the Zynq for PCIe clock recovery.

### DisplayPort Output

**Foxconn 3VD51203-3D6A-7H** (J6) full-size DisplayPort receptacle (LCSC C2761456). 2-lane native DisplayPort from Zynq GTR.

| DP Pin | Signal | Connection |
| :--- | :--- | :--- |
| 1 | ML_Lane0+ | <- PS_MGTRTXP1_505 (D23) via 0.1uF AC cap |
| 3 | ML_Lane0- | <- PS_MGTRTXN1_505 (D24) via 0.1uF AC cap |
| 4 | ML_Lane1+ | <- PS_MGTRTXP2_505 (C25) via 0.1uF AC cap |
| 6 | ML_Lane1- | <- PS_MGTRTXN2_505 (C26) via 0.1uF AC cap |
| 15 | AUX_CH+ | MIO27 (TX out, 100-ohm series) + MIO30 (RX in, tapped cable-side) |
| 17 | AUX_CH- | Ground |
| 18 | HPD | MIO28, 100k-ohm pull-down |
| 20 | DP_PWR | 3.3V through ferrite bead |
| 7,9,10,12 | Lanes 2-3 | No-connect (2-lane config) |

MIO29 (DP_OE) drives the FIN1019MTC buffer direction control (DE pin).

### USB 3.0 -- 4-Port Hub (PS_GTR + PS_MIO Sheets)

The Zynq has one USB 3.0 controller but no built-in USB 2.0 PHY. Two external chips are required: a **Microchip USB3300-EZK** ULPI PHY for USB 2.0 signaling, and a **TI TUSB8043A** 4-port hub to fan out to four USB-A 3.0 ports on the rear panel.

Signal path:

```
Zynq GTR Lane 3 (SS 5Gbps) -----------------> TUSB8043A pin 58/59 (upstream SS RX)
TUSB8043A pin 55/56 (upstream SS TX) ---------> Zynq GTR Lane 3 RX
Zynq MIO52-63 (ULPI) -> USB3300-EZK -> D+/D- -> TUSB8043A pin 53/54 (upstream USB2)
                                                    +-> USB-A Port 1 (J7)
                                                    +-> USB-A Port 2 (J8)
                                                    +-> USB-A Port 3 (J9)
                                                    +-> USB-A Port 4 (J10)
```

**USB3300-EZK ULPI PHY -- Zynq MIO connections:**

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

**TUSB8043A upstream SuperSpeed -- Zynq GTR Lane 3:**

| TUSB8043A Pin | Signal | Connection |
| :--- | :--- | :--- |
| 58 | USB_SSRXP_UP | <- PS_MGTRTXP3_505 (B23) |
| 59 | USB_SSRXM_UP | <- PS_MGTRTXN3_505 (B24) |
| 55 | USB_SSTXP_UP | -> PS_MGTRRXP3_505 (A25) |
| 56 | USB_SSTXM_UP | -> PS_MGTRRXN3_505 (A26) |
| 53 | USB_DP_UP | <-> USB3300-EZK D+ |
| 54 | USB_DM_UP | <-> USB3300-EZK D- |
| 48 | USB_VBUS | 90.9k-ohm to VBUS (5V), 10k-ohm to GND (voltage divider) |

**TUSB8043A downstream ports -- to four USB-A 3.0 connectors:**

| Port | SS TX+/- | SS RX+/- | D+/D- | Connector |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Pin 3/4 | Pin 6/7 | Pin 1/2 | J7 |
| 2 | Pin 11/12 | Pin 14/15 | Pin 9/10 | J8 |
| 3 | Pin 19/20 | Pin 22/23 | Pin 17/18 | J9 |
| 4 | Pin 26/27 | Pin 29/30 | Pin 24/25 | J10 |

**TUSB8043A clock:**

| Pin | Signal | Connection |
| :--- | :--- | :--- |
| 62 | XI | 24 MHz crystal + 1M-ohm feedback resistor between XI and XO |
| 61 | XO | 24 MHz crystal (other leg) |

**TUSB8043A control and strap pins:**

| Pin | Signal | Connection |
| :--- | :--- | :--- |
| 50 | GRSTz | 10k-ohm to 3.3V + 100nF to GND (RC power-on reset) |
| 49 | TEST | 10k-ohm to GND |
| 64 | USB_R1 | 9.53k-ohm 1% to GND (precision reference) |
| 41 | PWRCTL_POL | Strap per power switch polarity |
| 42 | GANGED | GND (per-port power control) |
| 40 | FULLPWRMGMTz | GND (enable power switching + overcurrent) |
| 45 | AUTOENz/HS_SUSPEND | 3.3V (disable auto-charge) |
| 39 | SMBUSz/SS_SUSPEND | 3.3V (I2C mode, or NC if no EEPROM) |
| 38 | SCL/SMBCLK | NC (no EEPROM) |
| 37 | SDA/SMBDAT | NC (no EEPROM) |
| 60 | NC | No connect |

**TUSB8043A per-port power and overcurrent:**

If not implementing per-port power switching, leave PWRCTL1-4 (pins 36, 35, 33, 32) unconnected and pull OVERCUR1-4z (pins 46, 47, 44, 43) to 3.3V with 10k-ohm each.

**TUSB8043A power:**

| Pin(s) | Signal | Rail |
| :--- | :--- | :--- |
| 5, 8, 13, 21, 28, 31, 51, 57 | VDD | 1.1V (external regulator required) + 0.1uF each |
| 16, 34, 52, 63 | VDD33 | 3.3V + 0.1uF each |
| Thermal pad | VSS | GND |

### 16-Channel Backplane UARTs (PL HD Banks 25 and 26)

16 instances of **Xilinx AXI UART Lite** (`axi_uartlite`) instantiated in the Programmable Logic, each with its own AXI-Lite register window and dedicated IRQ line. Each channel is a dedicated TX/RX pair running at 460800 baud (compile-time configured in Vivado -- for a runtime-configurable baud divider, substitute `axi_uart16550`). All pins are 3.3V LVCMOS, directly compatible with the AG32 UART0 control interface on each compute card.

These are stock Xilinx IP blocks with a mainline Linux driver -- no custom RTL, no custom kernel code.

**Bank 25 -- Cards 0-7 (VCCO = 3.3V):**

| Card | PL Signal | Direction | PL Bank | Backplane Pin | Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | UART_TX_0 | Output | 25 | Card 0 UART0_RX | Host TX -> Node RX |
| 0 | UART_RX_0 | Input | 25 | Card 0 UART0_TX | Node TX -> Host RX |
| 1 | UART_TX_1 | Output | 25 | Card 1 UART0_RX | Host TX -> Node RX |
| 1 | UART_RX_1 | Input | 25 | Card 1 UART0_TX | Node TX -> Host RX |
| 2 | UART_TX_2 | Output | 25 | Card 2 UART0_RX | Host TX -> Node RX |
| 2 | UART_RX_2 | Input | 25 | Card 2 UART0_TX | Node TX -> Host RX |
| 3 | UART_TX_3 | Output | 25 | Card 3 UART0_RX | Host TX -> Node RX |
| 3 | UART_RX_3 | Input | 25 | Card 3 UART0_TX | Node TX -> Host RX |
| 4 | UART_TX_4 | Output | 25 | Card 4 UART0_RX | Host TX -> Node RX |
| 4 | UART_RX_4 | Input | 25 | Card 4 UART0_TX | Node TX -> Host RX |
| 5 | UART_TX_5 | Output | 25 | Card 5 UART0_RX | Host TX -> Node RX |
| 5 | UART_RX_5 | Input | 25 | Card 5 UART0_TX | Node TX -> Host RX |
| 6 | UART_TX_6 | Output | 25 | Card 6 UART0_RX | Host TX -> Node RX |
| 6 | UART_RX_6 | Input | 25 | Card 6 UART0_TX | Node TX -> Host RX |
| 7 | UART_TX_7 | Output | 25 | Card 7 UART0_RX | Host TX -> Node RX |
| 7 | UART_RX_7 | Input | 25 | Card 7 UART0_TX | Node TX -> Host RX |

**Bank 26 -- Cards 8-15 (VCCO = 3.3V):**

| Card | PL Signal | Direction | PL Bank | Backplane Pin | Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 8 | UART_TX_8 | Output | 26 | Card 8 UART0_RX | Host TX -> Node RX |
| 8 | UART_RX_8 | Input | 26 | Card 8 UART0_TX | Node TX -> Host RX |
| 9 | UART_TX_9 | Output | 26 | Card 9 UART0_RX | Host TX -> Node RX |
| 9 | UART_RX_9 | Input | 26 | Card 9 UART0_TX | Node TX -> Host RX |
| 10 | UART_TX_10 | Output | 26 | Card 10 UART0_RX | Host TX -> Node RX |
| 10 | UART_RX_10 | Input | 26 | Card 10 UART0_TX | Node TX -> Host RX |
| 11 | UART_TX_11 | Output | 26 | Card 11 UART0_RX | Host TX -> Node RX |
| 11 | UART_RX_11 | Input | 26 | Card 11 UART0_TX | Node TX -> Host RX |
| 12 | UART_TX_12 | Output | 26 | Card 12 UART0_RX | Host TX -> Node RX |
| 12 | UART_RX_12 | Input | 26 | Card 12 UART0_TX | Node TX -> Host RX |
| 13 | UART_TX_13 | Output | 26 | Card 13 UART0_RX | Host TX -> Node RX |
| 13 | UART_RX_13 | Input | 26 | Card 13 UART0_TX | Node TX -> Host RX |
| 14 | UART_TX_14 | Output | 26 | Card 14 UART0_RX | Host TX -> Node RX |
| 14 | UART_RX_14 | Input | 26 | Card 14 UART0_TX | Node TX -> Host RX |
| 15 | UART_TX_15 | Output | 26 | Card 15 UART0_RX | Host TX -> Node RX |
| 15 | UART_RX_15 | Input | 26 | Card 15 UART0_TX | Node TX -> Host RX |

### UART AXI Register Map

Each AXI UART Lite instance occupies a 4 KB AXI-Lite register window. The Xilinx IP block exposes a standard register layout (RX FIFO at +0x00, TX FIFO at +0x04, STAT_REG at +0x08, CTRL_REG at +0x0C). Base addresses are spaced at 0x1000 intervals for clean address decoding in the AXI Interconnect, and both CPU clusters see the same physical addresses:

| Card | AXI Base Address | Owning CPU | Linux View | IRQ Target |
| :--- | :--- | :--- | :--- | :--- |
| 0  | 0xA000_0000 | R5F core 1 | `/dev/rpmsg-tty0`  | R5F core 1 |
| 1  | 0xA000_1000 | R5F core 1 | `/dev/rpmsg-tty1`  | R5F core 1 |
| 2  | 0xA000_2000 | R5F core 1 | `/dev/rpmsg-tty2`  | R5F core 1 |
| ... | ... | ... | ... | ... |
| 15 | 0xA000_F000 | R5F core 1 | `/dev/rpmsg-tty15` | R5F core 1 |

Each instance has its own IRQ routed through Vivado IP Integrator to the Zynq's `IRQ_F2P` inputs (16 available, exactly consumed). The IRQs target **R5F core 1's GIC view** via the PS GIC SPI lines, not the A53 cluster.

### LED Display SPI (PL HD Bank 24)

Dedicated **SPI slave** in the Programmable Logic, connected to the RP2040 LED controller on the front panel. The RP2040 is the SPI master; the Zynq fabric runs in slave mode. This inversion from the conventional arrangement gives free v-sync alignment because the RP2040 initiates transactions on its own LED refresh clock. All signals are 3.3V LVCMOS on HD Bank 24.

The SPI link is **full-duplex and bidirectional every frame**: MOSI carries a Zynq command byte plus an optional push-framebuffer; MISO carries an RP2040 status header plus the 4,096-byte framebuffer currently lit on the physical panel.

| PL Signal | Direction | PL Bank | Connector Pin | Function |
| :--- | :--- | :--- | :--- | :--- |
| LED_SPI_SCK  | Input (slave) | 24 | Front-panel header | SPI clock, driven by RP2040 |
| LED_SPI_MOSI | Output | 24 | Front-panel header | Zynq -> RP2040: command byte + optional push framebuffer |
| LED_SPI_MISO | Input  | 24 | Front-panel header | RP2040 -> Zynq: status header + current physical framebuffer (full readback, 4 KB/frame) |
| LED_SPI_CS   | Input (slave) | 24 | Front-panel header | Chip select, driven by RP2040 at frame refresh boundaries |

### TDMA Clock (PL HD Bank 44)

The TDMA timing is distributed to all 16 compute cards via two signals on the backplane: a phase clock and a superframe sync pulse. Each node maintains a local counter to track which TDMA phase it's in, counting clock ticks since the last sync pulse. This is simpler and more reliable than distributing a 4-bit phase bus — one fast clock and one slow sync are far easier to route, terminate, and keep skew-free across a ribbon cable to 16 cards.

| PL Signal | Direction | PL Bank | Function |
| :--- | :--- | :--- | :--- |
| TDMA_CLK | Output | 44 | Phase advance clock — one tick per TDMA phase, all nodes advance to next dimension |
| TDMA_SYNC | Output | 44 | Superframe sync pulse — goes high at phase 0, marks the start of a new frame |

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

### Backplane I2C Bus (PL HD Bank 44)

Dedicated I2C bus on Bank 44 for per-card reset/boot control (PCA9555 GPIO expanders), optional per-card INA226 power monitoring, and other backplane slow-control peripherals. Two pins (SDA, SCL) plus ground reference routed to the backplane connector. This is a separate bus from the onboard PS I2C0 (MIO10-11) used by the DS3231 RTC — the two buses share no wires and cannot interfere with each other.

### PL I/O Budget Summary

| PL Bank | Type | VCCO | Backplane Signals | Board-Internal Signals | Pins Used | Pins Available | Pins Spare |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 24 | HD | 3.3V | LED SPI (4 pins) | I2S audio to DAC (3 pins) | 7 | 24 | 17 |
| 25 | HD | 3.3V | UART cards 0-7: 8 TX + 8 RX (16 pins) | — | 16 | 24 | 8 |
| 26 | HD | 3.3V | UART cards 8-15: 8 TX + 8 RX (16 pins) | — | 16 | 24 | 8 |
| 44 | HD | 3.3V | TDMA CLK + SYNC (2 pins), I2C backplane SDA + SCL (2 pins) | Fan PWM ×4 + Fan Tach ×4 (8 pins) | 12 | 24 | 12 |
| 64 | HP | 1.8V | — | — | 0 | 24 | 24 (NC) |
| 65 | HP | 1.8V | — | — | 0 | 24 | 24 (NC) |
| 66 | HP | 1.8V | — | — | 0 | 24 | 24 (NC) |

**Backplane signals total: 40** (32 UART + 4 LED SPI + 2 TDMA + 2 I2C).
**Board-internal signals total: 11** (3 I2S + 8 fan). These do NOT go through the backplane connector.
**Total HD bank pins used: 51 of 96.** 45 spare pins across the four HD banks.

### Boot and Configuration (Config / PS_MIO Sheets) — All Done

| Item | Pins | Status | Sheet |
| :--- | :--- | :--- | :--- |
| Boot mode DIP switch | PS_MODE0-3 | Done. SW1, 4-pos DIP, 10kΩ pulldowns. JTAG=0000, QSPI=0010, SD=0111. | PS_MIO |
| QSPI flash | MIO0-5 | Done. W25Q512JVEIQ (U7, 512Mbit, LCSC C7389628). 4.7kΩ pullups on CS/HOLD/WP. | PS_MIO |
| JTAG debug header | PS_JTAG_TCK/TDI/TDO/TMS | Done. J15, 10-pin ARM JTAG/SWD. 4.7kΩ pullups on TMS/TCK/TDI. | PS_MIO |
| Power-on reset | PS_POR_B | Done. 10kΩ pullup to +3V3, 100nF cap to GND. Connected to PMIC GPO3 via global label. | PS_MIO |
| System reset | PS_SRST_B | Done. 10kΩ pullup to +3V3. | PS_MIO |
| PL config handshake | PS_PROG_B, PS_INIT_B, PS_DONE | Done. 10kΩ pullups to +3V3 each. | Config |
| PS reference clock | PS_REF_CLK (R16) | Done. Y7, SiT8008BI-71-33S-33.333330 (LCSC C806182). | PS_MIO |
| PUDC_B | PUDC_B | Done. Tied to GND. | Config |
| UART console | MIO8-9 | Done. FT230XS (U8) USB-serial bridge + USB-C connector. | PS_MIO |
| PS_PADI/PS_PADO | N17/N18 | Done. PADI tied to GND, PADO floating (internal RTC not used, external DS3231M instead). | Config |

### Backplane Connector

A single **2x30 (60-pin) HARTING 09185606324 shrouded IDC header** (J13) at 2.54mm pitch carries all backplane signals via ribbon cable. 40 signals + 20 ground returns. The extra ground pins provide good return current paths and signal isolation.

The signal path uses a `_BUF` suffix naming convention: PL_HD sheet has `UART_TX_0` (Zynq side), a 22Ω series resistor bridges to `UART_TX_BUF_0` (buffer/connector side) on the Backplane sheet. The 74LVC244 buffer takes the `_BUF` net on its A input and drives the connector. For RX inputs, the path is reversed: connector → buffer A input → buffer Y output → `UART_RX_0` on PL_HD. This keeps the two nets distinct across the series resistor, which is correct.

Backplane sheet components: 5x 74LVC244APW,118 (U16-U19, U27, LCSC C6079) + J13 connector. BP_I2C_SDA bypasses the buffers (bidirectional, direct connection with 4.7kΩ pullup).

The backplane carries **40 signals** total:

| Group | Count | Direction (FPGA POV) | Bank | Notes |
| :--- | :--- | :--- | :--- | :--- |
| UART_TX_0..15 | 16 | Output | 25/26 | 8 per bank, one per compute card |
| UART_RX_0..15 | 16 | Input | 25/26 | 8 per bank, one per compute card |
| LED_SPI_MOSI | 1 | Output | 24 | Zynq → RP2040 |
| LED_SPI_SCK, LED_SPI_MISO, LED_SPI_CS | 3 | Input | 24 | RP2040 is SPI master |
| TDMA_CLK | 1 | Output | 44 | Phase advance clock |
| TDMA_SYNC | 1 | Output | 44 | Superframe sync pulse |
| BP_I2C_SDA | 1 | Bidirectional | 44 | Per-card reset/boot control (PCA9555) |
| BP_I2C_SCL | 1 | Output | 44 | Per-card reset/boot control (PCA9555) |

Signals that are NOT on the backplane (board-internal only): I2S audio (3 signals, Bank 24 → PCM5102A DAC), Fan PWM/Tach (8 signals, Bank 44 → fan headers J8/J9/J10/J17).

Outputs from FPGA to backplane: 20 (16x UART_TX, 1x SPI_MOSI, 1x TDMA_CLK, 1x TDMA_SYNC, 1x BP_I2C_SCL). Inputs to FPGA from backplane: 19 (16x UART_RX, 3x SPI_SCK/MISO/CS). Bidirectional: 1 (BP_I2C_SDA). Every signal is single-ended 3.3V LVCMOS, unidirectional (except I2C SDA), and runs at low speed (≤10 MHz for SPI, 460800 baud for UART).

**LED SPI direction:** The Zynq is the SPI slave, the RP2040 on each LED panel is the master (for v-sync alignment — the RP2040 drives SCK on its own frame clock and the Zynq latches the transaction). Signal directions through the 244 buffers follow standard SPI slave conventions:

| Signal | Direction (Zynq POV) | U18 channel (Zynq-side pin) |
| :--- | :--- | :--- |
| SCK | Input | bank 2 ch 5 Y (pin 9) |
| CS | Input | bank 2 ch 6 Y (pin 7) |
| MOSI | Input | bank 2 ch 7 Y (pin 5) |
| MISO | Output | bank 1 ch 1 A (pin 2) |

### J13 Pinout (Complete)

All 60 pins assigned. Signal pins tap the 244 Y outputs (for TX) or A inputs (for RX) directly — TVS arrays tap the same wires near the connector. 19 GND pins and 1 +3V3 pin are interspersed through the IDC for return current quality.

| J13 Pin | Signal | | J13 Pin | Signal |
| :--- | :--- | :--- | :--- | :--- |
| 1 | LED_SPI_MOSI (RP2040→Zynq) | | 2 | LED_SPI_MISO (Zynq→RP2040) |
| 3 | LED_SPI_CS (RP2040→Zynq) | | 4 | LED_SPI_SCK (RP2040→Zynq) |
| 5 | GND | | 6 | GND |
| 7 | TDMA_CLK | | 8 | GND |
| 9 | TDMA_SYNC | | 10 | GND |
| 11 | BP_I2C_SCL | | 12 | BP_I2C_SDA |
| 13 | UART_TX_0 | | 14 | UART_RX_0 |
| 15 | UART_TX_1 | | 16 | UART_RX_1 |
| 17 | GND | | 18 | GND |
| 19 | UART_TX_2 | | 20 | UART_RX_2 |
| 21 | UART_TX_3 | | 22 | UART_RX_3 |
| 23 | GND | | 24 | GND |
| 25 | UART_TX_7 | | 26 | UART_RX_7 |
| 27 | UART_TX_6 | | 28 | UART_RX_6 |
| 29 | GND | | 30 | GND |
| 31 | UART_TX_5 | | 32 | UART_RX_5 |
| 33 | UART_TX_4 | | 34 | UART_RX_4 |
| 35 | GND | | 36 | GND |
| 37 | UART_TX_8 | | 38 | UART_RX_8 |
| 39 | UART_TX_9 | | 40 | UART_RX_9 |
| 41 | GND | | 42 | GND |
| 43 | UART_TX_10 | | 44 | UART_RX_10 |
| 45 | UART_TX_11 | | 46 | UART_RX_11 |
| 47 | GND | | 48 | GND |
| 49 | UART_TX_15 | | 50 | UART_RX_15 |
| 51 | UART_TX_14 | | 52 | UART_RX_14 |
| 53 | GND | | 54 | GND |
| 55 | UART_TX_13 | | 56 | UART_RX_13 |
| 57 | UART_TX_12 | | 58 | UART_RX_12 |
| 59 | GND | | 60 | +3V3 |

Totals: 16 UART_TX (TX0–TX15), 16 UART_RX (RX0–RX15), 4 SPI, 2 TDMA, 2 I2C, 19 GND, 1 +3V3 = 60. All 16 UART channels active; no NC pins.

### Backplane Buffer Chip Assignments

Five 74LVC244APW SSOP-20 chips (LCSC C6079) cover 39 of 40 signals (BP_I2C_SDA bypasses buffers as a bidirectional line). Signal-to-chip mapping:

| Chip | Role | Bank 1 (pins 2/4/6/8 A, pins 18/16/14/12 Y) | Bank 2 (pins 11/13/15/17 A, pins 9/7/5/3 Y) |
| :--- | :--- | :--- | :--- |
| U16 | TX 0-7 (Zynq→connector) | A: UART_TX_BUF_0..3 | A: UART_TX_BUF_4..7 |
| U17 | TX 8-15 (Zynq→connector) | A: UART_TX_BUF_8..11 | A: UART_TX_BUF_12..15 |
| U18 | Mixed (SPI + TDMA + I2C_SCL) | A-inputs: MISO (pin 2, Zynq→conn), TDMA_CLK (pin 4, Zynq→conn), TDMA_SYNC (pin 6, Zynq→conn), I2C_SCL (pin 8, Zynq→conn) | A-inputs: SCK (pin 11, conn→Zynq), CS (pin 13, conn→Zynq), MOSI (pin 15, conn→Zynq) + pin 17 A tied to GND (spare), pin 3 Y NC |
| U19 | RX 8-15 (connector→Zynq) | Y: UART_RX_BUF_8..11 | Y: UART_RX_BUF_12..15 |
| U27 | RX 0-7 (connector→Zynq) | Y: UART_RX_BUF_0..3 | Y: UART_RX_BUF_4..7 |

Both /OE pins (pins 1, 19) on every chip tie to `BP_OE_N` (Zynq MIO17 at ball AC18, held high by R175 10kΩ pullup to +3V3 until software drives low).

### Backplane Signal Conditioning (Implemented)

**Series damping resistors on PL_HD sheet — 36 × 22Ω 0402 (R139–R174):**

- **R139–R154** (16): on UART_TX_BUF_0..15 — between Zynq PL pin and 244 A input. Source termination for Zynq-driven outputs.
- **R155–R170** (16): on UART_RX_BUF_0..15 — between 244 Y output and Zynq PL pin. Damps the 244 output driver into the short Zynq-side trace; also acts as low-pass with the Zynq input capacitance to slow edge rates and reduce ringing.
- **R171–R174** (4): on TDMA_CLK, TDMA_SYNC, LED_SPI_MOSI, BP_I2C_SCL — same pattern as UART_TX (Zynq pin → R → 244 A input).

Note: LED_SPI_SCK, LED_SPI_CS, LED_SPI_MISO do **not** have series Rs currently. These are RP2040-driven inputs to Zynq through the 244. Add if ringing shows up at bringup — direct Zynq pin-to-244 Y-output traces currently.

**Pullup resistors on PL_HD sheet — all to +3V3:**

- **19 × 10kΩ 0402:** UART_RX_BUF_0..15 (16), LED_SPI_SCK_BUF, LED_SPI_CS_BUF, LED_SPI_MISO_BUF (3). Keeps all Zynq inputs at a defined idle-high state when the 244 buffers are tri-stated (during FPGA config, reset, or any fault) — per UG583 §5.
- **2 × 4.7kΩ 0402:** BP_I2C_SDA (direct net), BP_I2C_SCL_BUF (buffered side). Required for I2C bus function.
- **1 × 10kΩ 0402** (R175): BP_OE_N holds the 244 OE# pins high by default. Tri-states the entire backplane on power-on and any software crash.

Total pullups: 22 resistors. Total backplane signal conditioning resistors (both sheets): 58.

**Layer 2 -- Sacrificial unidirectional buffers (mid-board)**

Insert 74LVC244-style octal buffers between the Zynq and the connector. Every backplane signal is unidirectional, so simple 244-class buffers work -- no bidirectional bus transceivers needed. The 74LVC244 has 8 independent buffers in two banks of four, each bank with its own active-low output enable. Direction within a chip can be mixed (each buffer has a distinct A->Y signal path), so a single chip can carry both FPGA-driven and backplane-driven lines.

Approximate chip count: **5x 74LVC244** already placed on Backplane sheet to cover the 40 backplane signals (40 / 8 = 5). Placed between the Zynq side (after the series resistors) and the connector side (before the TVS arrays). Note: I2C SDA is bidirectional and cannot go through a 244 — it needs a direct connection or a bidirectional buffer.

Tie all 10 OE# pins (both banks on each of the 5 chips) to **BP_OE_N** — a dedicated enable signal driven from Zynq **MIO17 (ball AC18, bank 500, 3.3V PSIO)**. A 10kΩ pullup to +3V3 on the BP_OE_N net holds it high by default, keeping the buffers tri-stated through power-on, Zynq boot, PL config, and any software crash. First-boot software drives MIO17 low once the PL bitstream is loaded and the UART IP blocks have initialized, enabling the entire backplane in one write. Re-asserting MIO17 high re-tri-states the backplane (useful for fault handling or card hot-swap).

PS_DONE was considered as the enable source and rejected — it goes *high* when PL config completes, which is the opposite polarity to what an active-low /OE needs. Using PS_DONE directly would enable the buffers during config and disable them after — backwards. Would need an inverter chip. A single MIO GPIO is simpler, software-controllable, and costs only one freed pin (MIO17 came available after the SDIO0 Option 0 remap — see SD Card section).

The buffers serve three purposes:
- **Sacrificial protection** -- a $0.40 chip absorbs damage instead of a $200 BGA bank
- **Defined startup state** via OE# control
- **Higher drive strength** if the ribbon cable is ever lengthened or replaced with something lossier

**TVS diode arrays (connector side) — placed and wired:**

10x **SRV05-4.TCT** (LCSC C13612, 4-channel common-rail TVS array, SOT-23-6) cover all 40 backplane signals. Ref designators: **U14, U15, U28, U29, U30, U31, U32, U33, U34, U35**.

Per array: pin 2 (VN) → GND, pin 5 (VP) → +3V3, pins 1/3/4/6 (IO1-4) → 4 signals tapped between the 244 and J13 so the strike is clamped at the connector entry before it reaches meaningful trace inductance. Signal-to-TVS grouping follows physical J13 pin adjacency — each TVS sits close to the 4 connector pins it protects.

Pick each TVS by observing the 4 nearest J13 signal pins in the layout. Trace length between strike point and clamp matters more than the diode response time, so keep all four IO stubs short (~3mm max).

**Test Points**

Drop a test point on every backplane signal, placed between the buffer chip and the connector. SMD round test points (Keystone 5015 or similar 0.040" diameter pads) on a uniform grid. **This is critical for bringup** -- you will be probing every line with a logic analyzer and a scope, and trying to clip onto 49 individual signals without dedicated test points is miserable.

In addition to individual test points, consider a logic analyzer breakout header that taps the backplane signals between the buffer and the connector for debug during bringup.

**Power Filtering for HD Banks**

With up to 16 LVCMOS outputs potentially switching simultaneously on Banks 25 and 26, simultaneous switching output (SSO) noise on VCCO can be significant. Add a localized power island per bank:

- Ferrite bead (BLM18PG471SN1D, ~470-ohm @ 100 MHz, 3A rated) between the main 3.3V plane and each local VCCO_25 / VCCO_26 / VCCO_24 / VCCO_44 island
- 10uF + 1uF + per-pin 100nF on the bank side of the bead

Cheap, takes minimal space, and noticeably quiets switching transients on bank power. Worth doing.

### Per-Card Reset and Boot Control (Currently Missing)

The host library's `flash()` method describes "Assert Boot0 high, pulse NRST via GPIO" -- but **the current schematic does not allocate any backplane pins or Zynq GPIO for these signals**. This is a real gap that must be closed before flashing will work.

Three options, in increasing complexity:

**Option A -- Shared broadcast Boot0 + NRST (2 backplane pins, simplest)**

One global NRST and one global Boot0 broadcast to all 16 cards. The host puts the entire machine into bootloader mode in one operation, then flashes each card in parallel through its dedicated UART. After flashing, NRST is released and all cards run their new firmware simultaneously.

Limitation: cannot reset individual cards. If one card hangs mid-job, the only recovery is rebooting the whole machine. Acceptable if cards are reliable and recovery is rare.

Implementation: 2 additional output lines from PL Bank 44 (or any spare HD bank pin) -> series R -> buffer -> TVS -> backplane. Add to the 100-pin connector by reclaiming 2 of the 18 currently-spare pins.

**Option B -- Per-card Boot0 + NRST via I2C GPIO expander (recommended)**

Add an I2C bus to the backplane (2 wires + GND = 3 pins) and place a PCA9555 16-bit I2C GPIO expander on each compute card. Each expander drives its own card's NRST and Boot0 locally. The host writes to the expanders over I2C to assert/release reset and bootloader mode on individual cards.

Bonus: the same I2C bus can carry temperature sensors, INA226 power monitors, EEPROM card-ID storage, and any future per-card slow-control signals.

Implementation: 2 additional MIO pins from the Zynq (one of the unused MIO64-77 range) brought out to backplane through buffers + TVS. Each card gets a PCA9555 with 4 address-strap pins to give it a unique I2C address.

This is the right answer. It costs 3 backplane pins instead of 32, scales to additional control signals, and keeps the master fully in control of every card individually.

**Option C -- 32 dedicated GPIO lines (16 NRST + 16 Boot0)**

Direct point-to-point control. Most flexible, simplest software model, but requires 32 additional backplane pins + ~32 more grounds = 64 more connector pins. The current 100-pin IDC won't fit it; you would need to upgrade to a 200-pin or split into two connectors. Not recommended unless I2C is unworkable for some reason.

**Verdict:** implement Option B. It's the only one that scales and reuses existing connector pins.

### Backplane Power Distribution

Power and signals share the same physical connector — the Molex SlimStack — but are distributed through separate copper structures inside the backplane PCB. Each compute card draws approximately **2.5A at 12V (~25W)** — 256 AG32 chips at ~30mA each at 3.3V, stepped down from 12V by an on-card regulator at ~85% efficiency. The full 16-card hypercube draws approximately **39A at 12V (~400W)** aggregate.

**Per-card power delivery through SlimStack connectors**

Of the 1100 electrical connections per card (22 Molex SlimStack connectors, 50 circuits each, dual-row top and bottom), 1024 carry hypercube signal lines. From the remaining ~76 pins, **8 pins are allocated to +12V** and **8 pins to GND** per card. At ~0.5A per SlimStack contact, 8 power pins provide 4A of capacity against a 2.5A load — 160% margin. No separate power connector is required; all power enters the card through the same SlimStack interface as the signals.

**32-layer stacked power bus**

The backplane is a 32-layer PCB. Rather than routing high-current power on a single layer (which would require ~30mm trace width for 39A), the +12V and GND buses are implemented as **traces stacked on all 32 layers**, stitched together with full through-hole vias. This divides the current equally across layers:

- 39A ÷ 32 layers = ~1.22A per layer
- At 1.22A on an internal layer with 1oz copper and 10°C rise, IPC-2221 requires ~0.4mm trace width
- The actual trace width is **2mm per layer** — roughly 20% of the thermal budget, with large margin

The +12V bus and GND bus each run the full length of the backplane as continuous traces. Via stitch arrays connect all 32 layers at regular intervals along the bus and at every tap point. At the power input end of the board, where the full 39A enters, a larger via array (20+ vias) ensures low-impedance connection across the full layer stack. At each per-card tap point, 2–3 vias are sufficient for the 2.5A per-card draw.

**Per-card current monitoring: INA226 on the backplane**

At each of the 16 card positions, the +12V bus taps off through a **10mΩ shunt resistor** (0.5W, 2512 package) into an **INA226** current/voltage monitor. The current path per card is:

**32-layer +12V bus → via array → shunt resistor → INA226 high-side sense → 8 SlimStack +12V pins → card**

The INA226 sits immediately adjacent to the shunt resistor with Kelvin-connected sense traces. After the shunt, the trace only carries 2.5A for a single card, so it runs on a single layer at ~1.5mm width to the SlimStack power pins. The 16 INA226s are daisy-chained on the **backplane I2C bus** (Bank 44 PL pins, shared with the PCA9555 GPIO expanders for per-card reset control). Each INA226 has its A0/A1 address pins strapped to a unique combination, giving all 16 non-conflicting addresses on the same bus.

R5 core 1 polls all 16 INA226s in a round-robin at ~500 Hz (a full sweep of 16 devices at 400 kHz I2C takes ~2ms). Per-card current, voltage, and power readings are written into the shared thermal table alongside the per-node temperature data from the AG32 heartbeats. The HUD, the BMC web dashboard, and the Prometheus exporter all read from this table.

Diagnostic value: "Card 7 is drawing zero current" is the fastest possible dead-card detection — faster than heartbeat timeout, faster than UART echo failure. "Card 12 is drawing 3x normal current" catches shorts before they escalate. At ~$2 per card (INA226 + shunt resistor), this is cheap insurance for a 16-card system.

**Power input: Molex Mega-Fit 6-pin**

Power enters the backplane through a **6-pin Molex Mega-Fit vertical header** (768290006 / LCSC C588522). 2x3 configuration at 5.7mm pitch, through-hole, top latch, rated at **23.5A per contact**. Three pins carry +12V, three pins carry GND — 70.5A of capacity against the 39A worst-case load, a 180% margin. The mating wire-side plug accepts crimp terminals wired to an external 12V power supply (minimum 500W / 42A capacity for the full machine under load).

**Controller board current monitoring: INA226 on +12V input**

A single INA226 on the controller board monitors the +12V input rail (between the JST VH power connector and the PMIC VSYS pin). This gives total controller board power consumption, updated every HUD frame. It hangs on the **PS I2C1 bus** (MIO24-25) alongside the PMIC, at a non-conflicting I2C address.

### Optional Hardware Subsystems

Beyond the required signal conditioning, per-card reset control, and power distribution, the board area between the Zynq BGA and the 100-pin backplane connector can host several independent subsystems. Each is genuinely useful; implement as appetite and complexity budget allow.

**Per-Card Power Switching (Load Switches)**

Drop a TPS22918 or AP2161 load switch inline with each card's +12V on the backplane, controlled from the same per-card PCA9555 GPIO expander. This lets the host:
- Power-cycle a flaky card without rebooting the entire machine
- Sequentially bring up cards during boot to spread inrush current
- Cut power to cards that draw excessive current (closed-loop with the INA226 current monitors already on the backplane — see "Backplane Power Distribution" above)

Combined with the per-card INA226s, this gives you two layers of per-card power protection: active monitoring (INA226) and software-controlled switching (load switch + PCA9555).

**RP2040 SWD Passthrough**

The RP2040 on the LED panel needs to be flashable. Currently there is no documented path. Add either:
- A passive SWD header routed through the front-panel connector to the RP2040's SWDIO/SWCLK pins, accessible from outside the cube
- An active path: Zynq MIO bit-banged SWD or an FT2232H USB-SWD bridge controlled by the host

The passive header is cheaper; the active path lets the host reflash the RP2040 over the network without opening the case. Worth doing.

**External Watchdog Timer**

The Zynq has internal watchdogs, but they share fate with the silicon they're trying to reset. An external watchdog (TPS3823, MAX6369) tied to PS_SRST_B gives you a true hardware reset path if the kernel locks hard enough to disable internal watchdogs. A userspace daemon toggles a Zynq GPIO every second; if the toggle stops for >1.6s, the watchdog yanks SRST and the whole system reboots.

**Status / Diagnostic LEDs**

A bank of LEDs visible inside the cube or on the rear panel, driven from PL GPIO via a TLC59116 I2C LED driver (16 channels, brightness control, $1):
- 16x per-card link/activity LEDs (one per UART channel -- blink on TX/RX)
- 1x Zynq heartbeat
- 1x TDMA running indicator
- 1x thermal warning
- 1x job-in-progress

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

Banks 25, 26, and 44 have ~10-13 unused pins each (per the I/O budget table above). Bring them out to a 0.1" header for future expansion -- extra GPIO, additional UARTs, debug signals. Free real estate that's currently wasted.

### Implementation Priority Passes

**Pass 1 -- Do not fab without these:**
- Series source termination (~26 resistors)
- TVS arrays at the connector (~13 chips)
- Pull-ups on RX / MISO / TACH inputs (~21 resistors)
- Test points + logic analyzer breakout header
- Per-card reset/boot control (Option B: I2C bus + PCA9555 per card) -- I2C backplane bus (BP_I2C_SDA/SCL) allocated on Bank 44. PCA9555 expanders go on the compute cards.
- Battery-backed RTC (DS3231 on PS I2C0, MIO10-11) -- already designed-in, needed for BMC event log timestamps from first boot

**Pass 2 -- Strongly recommended:**
- Sacrificial 74LVC244 buffers (~6 chips)
- VCCO power islands with ferrite beads on Banks 24/25/26/44
- USB debug console (FT230XS)
- **Operator Console HUD + BMC + Hypercube Controller on the R5F cluster** (pure firmware/software work, zero new hardware, zero PCB changes) -- 1440x1080 Linux + 480x1080 R5-owned sidebar with LED mirror and telemetry HUD, rendered by R5 core 0. The same core runs a full BMC with HTTP dashboard, VNC remote console, SSH shell, serial-over-LAN, Prometheus exporter, and power control services, reachable over the existing Ethernet via a shared-GEM configuration (no second PHY or second RJ45 required). **R5 core 1** runs the real-time hypercube controller -- it owns all 16 backplane UARTs, the TDMA block, the LED SPI TX path, and the fan PWM, and Linux drives it over a mainline rpmsg mailbox. This splits the machine into a proper HPC-style user frontend (A53/Linux) and service processor (R5F cluster), with the consequence that in-flight StarC jobs keep running to completion even when Linux kernel-panics. This is the highest-value feature on the board per dollar (zero) and per hour of PCB work (zero) -- everything is firmware.

**Pass 3 -- High-value features:**
- Per-card INA226 power monitoring
- Per-card load switches
- External watchdog timer

**Pass 4 -- Convenience and cosmetic:**
- TLC59116 status LED bank
- OLED status display
- Front-panel buttons
- Ambient light sensor
- RP2040 SWD passthrough
- Spare HD bank breakout header

Pass 1 items address actual hardware risks (FPGA destruction, missing GPIO functionality, undebuggable bringup). Pass 2 items significantly improve robustness and SI. Passes 3 and 4 add features rather than fix problems, but everything in Pass 3 is high-value-per-dollar diagnostics worth including in the first board spin if board space is truly unlimited.

### Schematic Status Summary

All major schematic work is complete. The remaining items are PL pin assignment (ball-level wiring on PL_HD sheet) and backplane connector pinout/signal conditioning.

**MIO Master Map (updated)**

| MIO Range | Function | Status |
| :--- | :--- | :--- |
| MIO0-5 | QSPI flash (W25Q512JVEIQ, SCLK, CS, IO0-IO3) | Done |
| MIO6 | M.2 NVMe PERST# | Done |
| MIO7 | Available | |
| MIO8-9 | UART debug console (FT230XS USB-serial) | Done |
| MIO10-11 | RTC I2C (DS3231M via PS I2C0) | Done |
| MIO12 | Available | |
| MIO13-16 | MicroSD SD_DAT[0:3] (SDIO0 Option 0) | Done |
| MIO17 | Backplane buffer enable (BP_OE_N) | Done |
| MIO18-20 | Available (freed by SDIO0 Option 0 remap) | |
| MIO21 | MicroSD SD_CMD (SDIO0 Option 0) | Done |
| MIO22 | MicroSD SD_CLK (SDIO0 Option 0) | Done |
| MIO23 | Available (SD BUSPWR unused) | |
| MIO24-25 | PMIC I2C (TPS6508640 via PS I2C1) | Done |
| MIO26 | PMIC interrupt (PMIC_IRQ) | Done |
| MIO27-30 | DisplayPort AUX + HPD | Done |
| MIO31-37 | Available | |
| MIO38-51 | Ethernet RGMII + MDIO (RTL8211EG) | Done |
| MIO52-63 | USB ULPI (USB3300) | Done |
| MIO64-77 | Available | |

**MIO Bank Voltages**

| Bank | MIO Range | VCCO Voltage | Driven By | Reason |
| :--- | :--- | :--- | :--- | :--- |
| 500 | MIO0-25 | 3.3V | SWA1 (from BUCK1) | QSPI flash (W25Q512JVEIQ) and SD card need 3.3V |
| 501 | MIO26-51 | 3.3V | SWA1 (from BUCK1) | RTL8211EG Ethernet PHY is 3.3V |
| 502 | MIO52-63 | 1.8V | BUCK5 or SWB | USB3300 ULPI runs at 1.8V |
| 503 | MIO64-77 | 3.3V | `+3V3_PSIO` | All available, no peripherals assigned. Bank powered at 3.3V for flexibility. |

**TPS6508640 PMIC Implementation — COMPLETE**

All 65 pins of IC1 (TPS6508640RSKR) are wired on Power_Supply.kicad_sch. The circuit follows the TPS650864 datasheet (SWCS138G) Section 7.3 OTP configuration and the TPS65086x Design Guide (SLVUAJ9) for layout. A complete design reference file is at `Controller/TPS6508640_DESIGN_REFERENCE.md`.

All PMIC pins wired. All three CSD87381P external FET circuits wired (U23/BUCK1, U24/BUCK2, U25/BUCK6). All three internal converter circuits wired (BUCK3/4/5). VTT LDO wired. All LDO outputs wired. All load switches wired. All CTL straps, GPO connections, I2C, and interrupt wired.

**TPS568215 Buck Converters — COMPLETE**

Both U20 (3.3V NVMe) and U21 (5V USB VBUS) are fully wired on Power_Supply.kicad_sch with feedback dividers, bootstrap caps, input/output caps, inductors, enable resistors, mode selection, PGOOD pullups, and VREG5 bypass caps.

**Power supply schematic status: COMPLETE.** All four power ICs (IC1, U20, U21, U22) are fully wired. Every power rail on the board has a source.

**Zynq power pin wiring status: COMPLETE.** All power, ground, and configuration pins on U1 (Power_Zynq sheet) are connected to their respective rails with decoupling capacitors placed per AMD Answer Record 000039033.

**Complete Power Net Master List (as implemented in KiCad):**

*Rails that connect to Zynq power pins:*

| Net Name | Voltage | Source | Zynq Pins | Balls | Decoupling Caps |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `+0V85_VCCINT` | 0.85V | IC1 BUCK2 (U24 FET) | VCCINT (18), VCCBRAM (4), VCCINT_IO (4), VCC_PSINTFP (7), VCC_PSINTFP_DDR (3), VCC_PSINTLP (6) | 42 balls | 1x 330µF, 7x 100µF, 2x 47µF, 5x 10µF |
| `+1V8` | 1.8V | IC1 BUCK5 | VCCAUX (2), VCCAUX_IO (3), VCCADC (1, filtered), VCC_PSAUX (4), VCC_PSDDR_PLL (2, filtered), VCC_PSPLL (3), VCC_PSADC (1, filtered), VCCO_PSIO2_502 (2), VCC_PSBATT (1), VCCO_64/65/66 (9, HP banks unused but powered) | 28 balls | 2x 100µF, 4x 47µF, 10x 10µF, 3x ferrite beads |
| `+3V3` | 3.3V | IC1 BUCK1 (U23 FET) | VCCO_24 (2), VCCO_25 (2), VCCO_26 (2), VCCO_44 (2) | 8 balls | 4x 47µF, 4x 10µF |
| `+3V3_PSIO` | 3.3V | IC1 SWA1 | VCCO_PSIO0_500 (3), VCCO_PSIO1_501 (2), VCCO_PSIO3_503 (2) | 7 balls | 1x 100µF, 3x 10µF |
| `+1V2_VDDQ` | 1.2V | IC1 BUCK6 (U25 FET) | VCCO_PSDDR_504 (7) | 7 balls | 1x 100µF, 1x 10µF |
| `+0V9_MGTAVCC` | 0.9V | IC1 BUCK4 | PS_MGTRAVCC (2) | 2 balls | 1x 10µF |
| `+1V2_MGTAVTT` | 1.2V | IC1 BUCK3 | PS_MGTRAVTT (4) | 4 balls | 1x 10µF |

Also on Power_Zynq: POR_OVERRIDE (W7) → GND. PS_MGTRREF_505 (F22) → 240Ω to GND. RSVDGND (5 pins) → GND. GND (131 pins) + GNDADC (P13) + GND_PSADC (W20) → GND.

Per-bank sub-nets created in KiCad for layout flexibility (all connect to parent rail): `+3V3_VCCO_24`, `+3V3_VCCO_25`, `+3V3_VCCO_26`, `+3V3_VCCO_44`, `+3V3_PSIO_VCCO_PSIO0_500`, `+3V3_PSIO_VCCO_PSIO1_501`, `+3V3_PSIO_VCCO_PSIO3_503`, `+1V8_VCCO_PSIO2_502`. These sub-nets allow separate decoupling islands per bank on the PCB while sharing the same power source.

Filtered pins: VCCADC (P12), VCC_PSDDR_PLL (U16, U18), and VCC_PSADC (Y20) each connect to `+1V8` through an LC filter (ferrite bead ~470Ω@100MHz in series, then 10µF cap to GND on the pin side) to isolate sensitive analog/PLL supplies from switching noise.

*Rails that do NOT connect to Zynq pins — they go to other chips and connectors:*

| Net Name | Voltage | Source | Where It Goes | Sheet |
| :--- | :--- | :--- | :--- | :--- |
| `+0V6_VTT` | 0.6V | IC1 VTT LDO (tracks VDDQ/2) | DDR4 fly-by termination resistor network. Terminates the address/command/clock signals at the far end of the fly-by chain after the last DDR4 chip. | PS_DDR |
| `+2V5_VPP` | 2.5V | IC1 LDOA1 | DDR4 VPP (programming voltage). Required by the DDR4 spec for internal wordline boosting in the DRAM array. Connected to the VPP pin on both MT40A1G16TB chips. | PS_DDR |
| `+1V8_MGTAVCCAUX` | 1.8V | IC1 SWB1 | PS-GTR transceiver auxiliary supply. Powers the analog auxiliary circuits in the GTR quad (Bank 505). Connects near the GTR reference clock oscillators and transceiver pins. | PS_GTR |
| `+3V3_NVMe` | 3.3V | U20 TPS568215 | M.2 NVMe connector (J11) 3.3V power pins. Dedicated high-current supply isolated from main `+3V3` to handle 3A write spikes without drooping the peripheral rail. | PS_GTR |
| `+5V_USB` | 5.0V | U21 TPS568215 | USB-A VBUS pins on all four USB ports (J4, J12, and two others). This is bus power for plugged-in USB devices per the USB spec. No chip on the board runs at 5V — this is purely for external devices. | PS_GTR |
| `+1V5_LDOA2` | 1.5V | IC1 LDOA2 | **Spare.** 600mA LDO output, currently unassigned. Available for future use (e.g. VCCO for an HP bank if ever activated, or an external peripheral). | Power_Supply |
| `+1V2_LDOA3` | 1.2V | IC1 LDOA3 | **Spare.** 600mA LDO output, currently unassigned. Available for future use. | Power_Supply |
| `+1V8_SWB2` | 1.8V | IC1 SWB2 | **Spare.** 300mA load switch output, currently unassigned. Available for future use. | Power_Supply |

*Internal PMIC rails (not output rails — used inside the PMIC only):*

| Net Name | Voltage | Source | Purpose |
| :--- | :--- | :--- | :--- |
| `+3.3V_PMIC` | 3.3V | IC1 LDO3P3 (pin 54) | PMIC internal digital logic. Powers CTL pin pullups, I2C pullups (SCL/SDA to MIO24/25), GPO pullups, IRQB pullup. 40mA max — do not load externally. |
| `+5V_DRV` | 5.0V | IC1 LDO5P0 (pin 56) | PMIC gate driver supply. Feeds DRV5V_2_A1 (pin 8) and DRV5V_1_6 (pin 38) which drive the CSD87381P FET gates. V5ANA (pin 57) shorted to this net. 100mA max — do not load externally. |
| `+12V` | 12V | J2 JST VH connector | Board input power. Feeds VSYS (pin 55), all three controller FET drains (U23/U24/U25 VIN), and both TPS568215 VIN pins (U20/U21). 5A worst case at the connector. |

**Zynq UltraScale+ Decoupling Capacitors (Power_Zynq sheet — COMPLETE):**

Per AMD Answer Record 000039033, Table 161 (XCZU2EG-SFVC784 row) and Table 162 (PS rails). Capacitor specs from Table 170. All caps placed and wired on Power_Zynq sheet.

Decoupling by pin block:

| Pin Block | Net | Balls | 330µF | 100µF | 47µF | 10µF |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| VCCINT (18 pins) | `+0V85_VCCINT` | N11,N13,N15,P10,P14,P15,R10,R11,R14,T11,T15,U10,U14,U15,V10,V11,V12,V14 | 1 | 4 | 1 | 1 |
| VCCBRAM (4 pins) | `+0V85_VCCINT` | L11,L12,M11,M12 | — | — | 1 | 1 |
| VCCINT_IO (4 pins) | `+0V85_VCCINT` | K10,L10,M9,M10 | — | — | — | — |
| VCC_PSINTFP (7 pins) | `+0V85_VCCINT` | AA15,AA16,AA17,AA18,AB16,Y15,Y17 | — | 1 | — | 1 |
| VCC_PSINTFP_DDR (3 pins) | `+0V85_VCCINT` | AA20,AA21,Y19 | — | 1 | — | 1 |
| VCC_PSINTLP (6 pins) | `+0V85_VCCINT` | V16,V17,V18,W15,W16,W17 | — | 1 | — | 1 |
| VCCAUX (2 pins) | `+1V8` | M16,N16 | — | — | 1 | 1 |
| VCCAUX_IO (3 pins) | `+1V8` | M13,M14,M15 | — | — | — | — |
| VCCADC (1 pin, filtered) | `+1V8` | P12 | — | — | — | 1 |
| VCC_PSAUX (4 pins) | `+1V8` | U19,U20,V19,W19 | — | 1 | — | 1 |
| VCC_PSDDR_PLL (2 pins, filtered) | `+1V8` | U16,U18 | — | — | — | 1 |
| VCC_PSPLL (3 pins) | `+1V8` | T16,T17,T18 | — | 1 | — | 1 |
| VCC_PSADC (1 pin, filtered) | `+1V8` | Y20 | — | — | — | 1 |
| VCCO_PSIO2_502 (2 pins) | `+1V8` | D18,G17 | — | — | — | 1 |
| VCCO_64 (3 pins, unused HP) | `+1V8` | AC5,AD8,AG7 | — | — | 1 | 1 |
| VCCO_65 (3 pins, unused HP) | `+1V8` | H5,J3,L4 | — | — | 1 | 1 |
| VCCO_66 (3 pins, unused HP) | `+1V8` | B7,D3,E6 | — | — | 1 | 1 |
| VCC_PSBATT (1 pin) | `+1V8` | Y18 | — | — | — | 1 |
| VCCO_24 (2 pins) | `+3V3` | AA14,AD13 | — | — | 1 | 1 |
| VCCO_25 (2 pins) | `+3V3` | B12,E11 | — | — | 1 | 1 |
| VCCO_26 (2 pins) | `+3V3` | C15,F14 | — | — | 1 | 1 |
| VCCO_44 (2 pins) | `+3V3` | AC10,AG12 | — | — | 1 | 1 |
| VCCO_PSIO0_500 (3 pins) | `+3V3_PSIO` | AB17,AE16,AG17 | — | 1 | — | 1 |
| VCCO_PSIO1_501 (2 pins) | `+3V3_PSIO` | H20,L19 | — | — | — | 1 |
| VCCO_PSIO3_503 (2 pins) | `+3V3_PSIO` | M17,P18 | — | — | — | 1 |
| VCCO_PSDDR_504 (7 pins) | `+1V2_VDDQ` | AB22,AD23,AF24,P23,T24,V25,Y26 | — | 1 | — | 1 |
| PS_MGTRAVCC (2 pins) | `+0V9_MGTAVCC` | B22,D22 | — | — | — | 1 |
| PS_MGTRAVTT (4 pins) | `+1V2_MGTAVTT` | A23,C23,D25,E23 | — | — | — | 1 |

Grand total Zynq decoupling: 1x 330µF, 11x 100µF, 10x 47µF, 26x 10µF = **48 capacitors** + 3 ferrite beads for filtered analog rails.

LCSC parts for Zynq decoupling:

| Value | Package | LCSC | Manufacturer | MPN | Price |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 330µF | 1210 X6S 2.5V | C314600 | Murata | GRM32EC80E337ME05L | $0.76 |
| 100µF | 0805 X5R 6.3V | C141660 | Murata | GRM21BR60J107ME15L | $0.14 |
| 47µF | 0603 X5R 6.3V | C3848273 | Murata | GRM188R60J476ME01D | $0.06 |
| 10µF | 0402 X5R 10V | C315248 | Samsung | CL05A106MP5NUNC | $0.005 |

Placement per AMD Table 170: 10µF 0402 caps on PCB backside directly under BGA (0-1"). 47µF 0603 within 0.5-2". 100µF 0805 within 0.5-3". 330µF 1210 bulk cap within 1-4".

Reference documents in `Controller/docs/`:
- `ug583-ultrascale-pcb-design.pdf` — UG583 v1.29, full UltraScale PCB design guide
- `Answer_Record_PCB_Decoupling_Capacitors.pdf` — AMD Answer Record 000039033, original decoupling tables

**Schematic Verification (April 2026):**

**Round 1 — Cross-sheet audit:** Six issues found, all resolved:

| # | Issue | Resolution |
| :--- | :--- | :--- |
| 1 | VCCO_PSDDR_504 (7 pins) not connected to `+1V2_VDDQ` on Power_Zynq | **Fixed.** Added `+1V2_VDDQ` global label, wired all 7 pins, added decoupling. |
| 2 | `+1V2_VDDQ`, `+0V6_VTT`, `+2V5_VPP` missing from PS_DDR sheet | **Fixed.** Added all three global labels. DDR4 VDD (ball B3) also connected to `+1V2_VDDQ`. All VSS/VSSQ to GND. |
| 3 | `PS_POR_B` not connected to Zynq pin P16 | **Fixed.** Added `PS_POR_B` global label on PS_MIO sheet. |
| 4 | `+1V8_MGTAVCCAUX` not reaching PS_GTR | **Not needed.** XCZU2EG has no MGTAVCCAUX pin. SWB1 output is spare. |
| 5 | `1V8` label (missing + prefix) on Power_Supply | **Fixed.** Renamed to `+1V8`. |
| 6 | `GND1` power symbol on Power_Supply | **Fixed.** Replaced with `GND`. |

**Minor fixes completed:**
- RTL8211EG LED2 (pin 52): Already had NC marker. No action needed.
- RTL8211EG REG_OUT (pin 3): Verified — decoupling caps to GND present.
- DisplayPort CONFIG1/CONFIG2 (pins 13/14): Connected to GND (correct for source-side DP).

**Round 2 — KiCad ERC.** Initial run: 907 entries. After fixes: 804 entries.

All peripheral IC power pin issues have been resolved:

| Chip | Sheet | Issue | Resolution |
| :--- | :--- | :--- | :--- |
| U22 (TPS74801 LDO) | PS_GTR | Entire chip was disconnected | **Fixed.** All 9 pins wired: IN/BIAS/EN to `+3V3`, GND, 47nF SS cap, FB divider (3.74kΩ/10kΩ for 1.1V), OUT to `+1V1_USB`, PG pullup. 10µF input cap, 22µF output cap. |
| U5 (TUSB8043A USB hub) | PS_GTR | 12 power pins floating | **Fixed.** 8x VDD pins to `+1V1_USB` (from U22), 4x VDD33 pins to `+3V3`, each with 0.1µF bypass. |
| U21 (TPS568215 5V USB) | Power_Supply_2 | VIN not connected | **Fixed.** Pin 2 (VIN) wired to `+12V`. |
| U4 (RTL8211EG ETH PHY) | PS_MIO | 13 power/ground pins floating | **Fixed.** AVDD33/DVDD33 to `+3V3`, AVDD10/DVDD10 to internal REG_OUT net, VDDREG to `+3V3`, GND pin wired. All with 0.1µF bypass caps. |
| U6 (USB3300 ULPI PHY) | PS_GTR | 8 pins floating | **Fixed.** VDD3.3 pins to `+3V3`, VBUS detect divider, VDD1.8/VDDA1.8 internal regulator outputs bypassed to GND (NOT connected to `+1V8` rail). |
| USBC2 (USB-C debug) | PS_MIO | B6/B7 not connected | **Fixed.** Wired both DP2/DN2 data pairs (required for USB-C plug-flip). |
| Y1, Y3 (oscillators) | PS_GTR | GND pins floating | **Fixed.** Wired to GND. |
| Misc (J3, FB5, caps, etc.) | Various | Various floating items | **Fixed.** |

Remaining 804 ERC entries are:
- **423 pin_not_connected:** 126 Zynq PL I/O pins + 175 backplane connector pins + 120 buffer IC pins = all deferred PL fabric work. Zero unexpected unconnected pins.
- **199 unconnected_wire_endpoint:** Cosmetic — dangling wire stubs in the schematic. Clean up when convenient. Not functional issues.
- **34 power_pin_not_driven:** False positives from KiCad ERC. These pins ARE connected to correct nets via global labels, but ERC wants a `PWR_FLAG` symbol on the net. All verified correct — add `PWR_FLAG` symbols to suppress if desired.
- **29 pin_to_pin:** Informational — two outputs on same net. Normal for power distribution.
- **23 same_local_global_label:** Warning — same name used as local and global label. Cosmetic.
- **11 footprint_link_issues, 7 lib_symbol_mismatch:** Library housekeeping. Check before fab.
- **4 multiple_net_names:** Nets with aliases. Verify intentional.
- **3 misc:** DRVL1 isolated label (stray on Power_Supply), UART0_USB+/USB- dangling labels (stubs on PS_MIO). Clean up when convenient.

**Verified and passing:**
- IC1 (TPS6508640 PMIC): All 65 pins connected, zero floating pins
- U23/U24/U25 (CSD87381P FETs): All wired correctly
- U20 (TPS568215 3.3V NVMe): Wired on Power_Supply_2
- U21 (TPS568215 5V USB VBUS): Wired on Power_Supply_2
- U22 (TPS74801 1.1V USB hub LDO): Wired on PS_GTR, output = `+1V1_USB`
- U4 (RTL8211EG Ethernet PHY): All power pins wired with bypass caps
- U5 (TUSB8043A USB hub): All VDD (1.1V) and VDD33 (3.3V) pins wired with bypass caps
- U6 (USB3300 ULPI PHY): All power pins wired, internal 1.8V regulators bypassed correctly
- U7 (W25Q512JVEIQ QSPI flash): Wired on PS_MIO
- U8 (FT230XS UART bridge): Wired on PS_MIO
- U9 (PCM5102A audio DAC): Wired on Peripherals
- U10 (PAM8302A audio amp): Wired on Peripherals
- U11 (AMS1117-5.0): Wired on Peripherals
- U12 (AMS1117-3.3): Wired on Peripherals
- U13 (DS3231M RTC): Wired on Peripherals
- All 42 VCCINT-domain Zynq pins: Connected to `+0V85_VCCINT`
- All VCCAUX/VCC_PSAUX/VCC_PSPLL pins: Connected to `+1V8`
- All HD bank VCCO pins: Connected to per-bank sub-nets of `+3V3`
- All HP bank VCCO pins: Connected to `+1V8` (unused banks, powered to prevent floating)
- All PS MIO bank VCCO pins: Connected to correct voltage nets
- VCCO_PSDDR_504 (7 pins): Connected to `+1V2_VDDQ`
- PS_MGTRAVCC/PS_MGTRAVTT: Connected to `+0V9_MGTAVCC`/`+1V2_MGTAVTT`
- POR_OVERRIDE (W7): Connected to GND
- PS_POR_B (P16): Connected to PMIC GPO3
- DDR4 power: `+1V2_VDDQ`, `+0V6_VTT`, `+2V5_VPP` all reach PS_DDR sheet
- DisplayPort CONFIG1/CONFIG2: Connected to GND
- 42+ Zynq decoupling caps: Placed and wired per AMD Answer Record 000039033

**Round 3 — UG583 Chapter 5 Review (PS Interface Guidelines):**

A review of UG583 (v1.29) Chapter 5 "PCB Guidelines for the PS Interface in the Zynq UltraScale+ MPSoC" identified the following issues and requirements. Items marked MISSING are schematic changes needed before fabrication.

| # | Severity | Interface | Issue | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** | DisplayPort AUX | UG583 requires a bidirectional LVDS buffer between the Zynq and the DP connector AUX channel. | **Fixed.** Added FIN1019MTC (TSSOP-14) on PS_GTR next to DP connector. DI←MIO27, DE←MIO29, /RE→GND, RO→MIO30. DO+/RI+ tied together through 100Ω to DP_AUX_CH+. DO-/RI- tied to GND. MIO28 (HPD) direct to connector with 100kΩ pulldown. |
| 2 | **HIGH** | PS-GTR MGTRREF | UG583 specifies 500Ω 0.5% to GND on PS_MGTRREF (F22). Was 240Ω. | **Fixed.** Changed to 500Ω 0.5%. |
| 3 | **HIGH** | PS-GTR Ref Clocks | UG583 requires 10nF AC coupling caps on reference clock differential pairs. Were missing entirely. | **Fixed.** Added 4x 10nF caps in series: 2 on Y3 (27MHz) → MGTREFCLK0P/N, 2 on Y1 (100MHz) → MGTREFCLK1P/N. |
| 4 | **MEDIUM** | USB 2.0 ULPI | 30Ω series resistors on DATA[7:0] and STP lines near Zynq. | **Fixed.** Verified present. |
| 5 | **MEDIUM** | SD/SDIO | 30Ω series resistors on CLK/CMD/DATA, 4.7kΩ pullup on DAT3. No CDn/WPn on micro SD connector. | **Fixed.** Verified present. CDn/WPn not applicable. |
| 6 | **MEDIUM** | QSPI | 4.7kΩ pullups on HOLD/WP/CS. MIO6 used for M2_PERST# (not QSPI loopback) — no conflict. | **Fixed.** Verified present. No loopback conflict. |
| 7 | **LOW** | Boot Mode | UG583 prefers 4.7kΩ, design uses 10kΩ. | **Acceptable.** 10kΩ works. Optional change. |
| 8 | **LOW** | JTAG | 4.7kΩ pullups on TMS, TCK, TDI. | **Verified present.** |
| 9 | **LOW** | PS_INIT_B/PROG_B/DONE | Pullups to `+3V3`. | **Verified.** All three have 10kΩ pullups to `+3V3`. |
| 10 | **INFO** | PS RTC | Internal RTC not used (external DS3231M). PADI to GND, PADO floating. | **Verified.** Correctly terminated. |
| 11 | **INFO** | USB 3.0 Layout | Differential traces at 90Ω ±15Ω. | **Layout note.** No schematic change needed. |
| 12 | **INFO** | Ethernet RGMII | Delay skew ±50ps including package time. | **Layout note.** No schematic change needed. |

**PS-GTR power supply requirements (from UG583 Table 131):**
- PS_MGTRAVCC (`+0V9_MGTAVCC`): Noise must be <10mVpp from 10kHz to 80MHz. Recommended filter: 1x 10µF ceramic. ✅ Present.
- PS_MGTRAVTT (`+1V2_MGTAVTT`): Same noise requirement. Recommended filter: 1x 10µF ceramic. ✅ Present.
- Both supplies are dedicated rails from the PMIC (BUCK4 and BUCK3), not shared with non-transceiver loads. ✅ Correct per guideline.

**Errata review (EN285 v1.15):** All errata are software/firmware level. No PCB-level errata affect this design. DDR4 minimum data rate is 1000Mb/s for industrial (I) temp grade — our DDR4-2400 is well above this. Document at `Controller/docs/en285-zynq-ultrascale-plus-errata.pdf`.

**Round 4 — SDIO0 MIO Mapping Audit.** Reviewed Chapter 26 of UG1085 (v2.5), Table 26-11 (p744), to verify SDIO0 MIO assignment. Found that the as-drawn schematic put SD_DAT0..3/CMD/CLK on the wrong MIO pins. All 6 SDIO0 signals remapped to their correct Option 0 MIOs per the silicon mux (DAT0..3 on MIO13-16, CMD on MIO21, CLK on MIO22). The remap freed MIO17-20 in bank 500 for other use. MIO17 was then claimed for `BP_OE_N`, the backplane buffer output enable (see Backplane Connector section). See Task #13 in development log for detailed before/after mapping.

**Round 5 — Backplane Wiring + ERC Cleanup.** After implementing the full backplane signal conditioning (5x 74LVC244 buffers wired, 10x SRV05-4 TVS arrays wired, 58 conditioning resistors placed), ran KiCad ERC. 130 entries surfaced; triaged into four real bugs and ~125 cosmetic/false-positive entries:

| # | Issue | Resolution |
| :--- | :--- | :--- |
| 1 | U33 pin 5 (VP / +3V3 rail on one TVS array) floating | **Fixed.** Wired to +3V3 on Backplane sheet. |
| 2 | Dangling `UART_RX_BUF_6` global label at top-level sheet | **Fixed.** Orphan label removed. |
| 3 | R184 pin 2 unconnected on PL_HD | **Fixed.** |
| 4 | `#PWR0323` orphan power symbol on Backplane sheet | **Fixed.** |

**Round 7 — ERC Cleanup.** Iterated on ERC errors across three passes: 130 → 24 → 18 → 13. The final 13 reduce to 4 known-safe library quirks after deleting ~6 misplaced PWR_FLAGs (duplicate stacks, flags on signal pins instead of power rails, flags on LDO outputs instead of inputs). The 4 residual errors are:

| Error | Why safe to ignore |
| :--- | :--- |
| DDR4 `U2 ALERT#` pin_to_pin | KiCad library types ALERT# as open-collector while Zynq `PS_DDR_ALERT_N` is typed as output. Topology is correct (single-source, pulled up externally). |
| DDR4 `U3 ALERT#` pin_to_pin | Same, for second DDR4 chip. |
| `U6 VDD1.8` pins 15↔26 pin_to_pin | USB3300 datasheet specifies these pins are tied together externally (they're both the chip's internal 1.8V regulator output). Library models them as separate power outputs. |
| `U6 VDD1.8` pins 26↔29 (VDDA1.8) pin_to_pin | Same — chip has analog and digital 1.8V rails that tie together per datasheet. |

Key lessons from the pass:
- One `PWR_FLAG` per power net. Not two, not four. Multiple flags create `Power output + Power output` pin_to_pin errors.
- `PWR_FLAG` goes on rails **entering** the board (from connectors, batteries, external sources), never on LDO/buck/PMIC output pins (those are already typed as power drivers).
- `PWR_FLAG` never goes on signal pins (I/O, CPEN, etc.) — only on power nets.
- Orphan `#PWR` symbols accumulate when you delete a wire without also removing the floating power symbol. Hunt them by coordinate in the ERC report.

**Schematic state after Round 7: verified functional, ready for layout.** The 4 residual errors are library-level cosmetic.

**Round 6 — LED SPI Direction Audit.** Noticed that the SPI wiring was inverted for the Zynq-as-slave topology the design calls for. On U18, MOSI had been placed on bank 1 ch 1 (Zynq-drives-connector direction) and MISO on bank 2 ch 7 (connector-drives-Zynq direction) — exactly backwards from what a slave needs. Swapped the two global labels on U18: `LED_SPI_MOSI_BUF` moved to pin 5 (bank 2 2Y1, Zynq-reads direction) and `LED_SPI_MISO_BUF` moved to pin 2 (bank 1 1A1, Zynq-drives direction). R173 now sits on MOSI's Zynq-side receive path (still a valid use — damps the 244 Y-output driver into the Zynq input). Netlist verified: MOSI now flows RP2040→J13 pin 1→U18 pin 15→buffer→pin 5→R173→Zynq AC14 (input); MISO now flows Zynq AC13 (output)→U18 pin 2→buffer→pin 18→J13 pin 2→RP2040. Also noted: MISO (Zynq output) has no 22Ω series R between AC13 and the 244 A input, while the other Zynq outputs on this chip do. Not a blocker; could add if edge ringing shows up at bringup.

Remaining ERC cleanup (cosmetic, do before fab): add NC flags on ~44 spare PL bank pins and ~19 available MIO pins; add `PWR_FLAG` symbols on filtered Zynq power rails (VCC_PSADC, VCC_PSDDR_PLL, PS_MGTRAVCC, PS_MGTRAVTT, VCCADC — ERC can't see through the ferrite beads); add `PWR_FLAG` on VCCO_PSIO0_500, VCCO_PSIO2_502, VCCO_PSDDR_504; add NC flags on unused GTR lanes (PS_MGTREFCLK2N/P, PS_MGTREFCLK3N/P, PS_MGTRRXN1/2, PS_MGTRRXP1/2). Known non-issues that stay: U6 USB3300 VDD1.8 "double-driven" (internal regulator symbol quirk), DDR4 U2/U3 ALERT# open-collector pin type mismatch (library quirk, connection is correct).

**Backplane signal conditioning — final component count (Backplane + PL_HD sheets):**

| Category | Count | Ref range | Notes |
| :--- | :--- | :--- | :--- |
| 74LVC244 buffers | 5 | U16, U17, U18, U19, U27 | SSOP-20, LCSC C6079 |
| SRV05-4 TVS arrays | 10 | U14, U15, U28–U35 | SOT-23-6, LCSC C13612 |
| HARTING IDC header | 1 | J13 | 60-pin (2x30), 09185606324 |
| 22Ω series Rs | 36 | R139–R174 | 16 TX + 16 RX + 4 on U18 bank 1 outputs |
| 10kΩ pullup Rs | 20 | includes R175 (BP_OE_N) | 16 UART_RX + 3 SPI input + 1 OE |
| 4.7kΩ I2C pullup Rs | 2 | — | BP_I2C_SDA, BP_I2C_SCL_BUF |
| 100nF 0402 decoupling | 5 | one per 244 | |
| 10µF 0805 bulk | 1 | — | shared across 244 cluster |

**PL Fabric TODO (deferred — not needed for initial board bringup, needed for hypercube operation)**

The pinout document is at `Controller/docs/xczu2egsfvc784pkg.txt`. Each HD bank has 24 I/O pins available. The errata document (`Controller/docs/en285-zynq-ultrascale-plus-errata.pdf`) was reviewed — no PCB-level errata affect this design; all workarounds are software/firmware.

**Proposed PL Pin Assignment — Bank 24 (LED SPI + I2S Audio)**

LED SPI signals are grouped on adjacent pins for clean routing to the backplane connector. I2S signals retain their existing assignments (W14/W13/Y14) for routing to the PCM5102A DAC.

| Ball | Zynq Pin Name | Signal | Direction | Destination |
| :--- | :--- | :--- | :--- | :--- |
| W14 | IO_L9P_AD11P_24 | I2S_LRCK | Output | PCM5102A DAC (board-internal) |
| W13 | IO_L9N_AD11N_24 | I2S_DIN | Output | PCM5102A DAC (board-internal) |
| Y14 | IO_L10P_AD10P_24 | I2S_BCK | Output | PCM5102A DAC (board-internal) |
| AD15 | IO_L5P_HDGC_24 | LED_SPI_SCK | Input | Backplane → RP2040 drives clock |
| AD14 | IO_L5N_HDGC_24 | LED_SPI_CS | Input | Backplane → RP2040 drives CS |
| AC14 | IO_L6P_HDGC_24 | LED_SPI_MOSI | Output | Backplane → Zynq to RP2040 |
| AC13 | IO_L6N_HDGC_24 | LED_SPI_MISO | Input | Backplane → RP2040 to Zynq |
| | | | | |
| AA12, AA13, AB13, AB14, AB15, AE13, AE14, AE15, AF13, AG13, AG14, AH13, AH14, W11, W12, Y12, Y13 | — | *Spare* | — | 17 unassigned pins |

**Proposed PL Pin Assignment — Bank 25 (UART Cards 0-7)**

Each card gets one TX (output) and one RX (input) pin, using P/N pairs for routing convenience.

| Ball | Zynq Pin Name | Signal | Direction | Card |
| :--- | :--- | :--- | :--- | :--- |
| F12 | IO_L6P_HDGC_25 | UART_TX_0 | Output | Card 0 |
| F11 | IO_L6N_HDGC_25 | UART_RX_0 | Input | Card 0 |
| E12 | IO_L8P_HDGC_25 | UART_TX_1 | Output | Card 1 |
| D11 | IO_L8N_HDGC_25 | UART_RX_1 | Input | Card 1 |
| G11 | IO_L5P_HDGC_25 | UART_TX_2 | Output | Card 2 |
| F10 | IO_L5N_HDGC_25 | UART_RX_2 | Input | Card 2 |
| E10 | IO_L7P_HDGC_25 | UART_TX_3 | Output | Card 3 |
| D10 | IO_L7N_HDGC_25 | UART_RX_3 | Input | Card 3 |
| D12 | IO_L12P_AD8P_25 | UART_TX_4 | Output | Card 4 |
| C12 | IO_L12N_AD8N_25 | UART_RX_4 | Input | Card 4 |
| A12 | IO_L11P_AD9P_25 | UART_TX_5 | Output | Card 5 |
| A11 | IO_L11N_AD9N_25 | UART_RX_5 | Input | Card 5 |
| B11 | IO_L10P_AD10P_25 | UART_TX_6 | Output | Card 6 |
| A10 | IO_L10N_AD10N_25 | UART_RX_6 | Input | Card 6 |
| C11 | IO_L9P_AD11P_25 | UART_TX_7 | Output | Card 7 |
| B10 | IO_L9N_AD11N_25 | UART_RX_7 | Input | Card 7 |
| | | | | |
| G10, H11, H12, J10, J11, J12, K12, K13 | — | *Spare* | — | 8 unassigned pins |

**Proposed PL Pin Assignment — Bank 26 (UART Cards 8-15)**

Same pairing strategy as Bank 25.

| Ball | Zynq Pin Name | Signal | Direction | Card |
| :--- | :--- | :--- | :--- | :--- |
| E14 | IO_L6P_HDGC_AD6P_26 | UART_TX_8 | Output | Card 8 |
| E13 | IO_L6N_HDGC_AD6N_26 | UART_RX_8 | Input | Card 8 |
| D15 | IO_L5P_HDGC_AD7P_26 | UART_TX_9 | Output | Card 9 |
| D14 | IO_L5N_HDGC_AD7N_26 | UART_RX_9 | Input | Card 9 |
| G13 | IO_L7P_HDGC_AD5P_26 | UART_TX_10 | Output | Card 10 |
| F13 | IO_L7N_HDGC_AD5N_26 | UART_RX_10 | Input | Card 10 |
| F15 | IO_L8P_HDGC_AD4P_26 | UART_TX_11 | Output | Card 11 |
| E15 | IO_L8N_HDGC_AD4N_26 | UART_RX_11 | Input | Card 11 |
| G15 | IO_L9P_AD3P_26 | UART_TX_12 | Output | Card 12 |
| G14 | IO_L9N_AD3N_26 | UART_RX_12 | Input | Card 12 |
| H14 | IO_L10P_AD2P_26 | UART_TX_13 | Output | Card 13 |
| H13 | IO_L10N_AD2N_26 | UART_RX_13 | Input | Card 13 |
| K14 | IO_L11P_AD1P_26 | UART_TX_14 | Output | Card 14 |
| J14 | IO_L11N_AD1N_26 | UART_RX_14 | Input | Card 14 |
| L14 | IO_L12P_AD0P_26 | UART_TX_15 | Output | Card 15 |
| L13 | IO_L12N_AD0N_26 | UART_RX_15 | Input | Card 15 |
| | | | | |
| A13, A14, A15, B13, B14, B15, C13, C14 | — | *Spare* | — | 8 unassigned pins |

**Proposed PL Pin Assignment — Bank 44 (TDMA + Fan + I2C Backplane)**

TDMA and I2C backplane signals assigned to available pins. Fan signals need ball assignments (currently have global labels but no specific balls).

| Ball | Zynq Pin Name | Signal | Direction | Destination |
| :--- | :--- | :--- | :--- | :--- |
| W10 | IO_L10P_AD2P_44 | TDMA_CLK | Output | Backplane |
| Y10 | IO_L10N_AD2N_44 | TDMA_SYNC | Output | Backplane |
| AA11 | IO_L9P_AD3P_44 | BP_I2C_SCL | Output | Backplane (PCA9555 expanders) |
| AA10 | IO_L9N_AD3N_44 | BP_I2C_SDA | Bidirectional | Backplane (PCA9555 expanders) |
| AG10 | IO_L1P_AD11P_44 | Fan1PWM | Output | Fan header J8 |
| AH10 | IO_L1N_AD11N_44 | Fan1Tach | Input | Fan header J8 |
| AF11 | IO_L2P_AD10P_44 | Fan2PWM | Output | Fan header J9 |
| AG11 | IO_L2N_AD10N_44 | Fan2Tach | Input | Fan header J9 |
| AH11 | IO_L3N_AD9N_44 | Fan3PWM | Output | Fan header J10 |
| AH12 | IO_L3P_AD9P_44 | Fan3Tach | Input | Fan header J10 |
| AE10 | IO_L4P_AD8P_44 | Fan4PWM | Output | Fan header J17 |
| AF10 | IO_L4N_AD8N_44 | Fan4Tach | Input | Fan header J17 |
| | | | | |
| AB9, AB10, AB11, AC11, AC12, AD10, AD11, AD12, AE12, AF12, Y9 | — | *Spare* | — | 11 unassigned pins |

**Assignment notes:**
- TX/RX pairs use P/N differential pair pins for routing convenience, even though the signals are single-ended 3.3V LVCMOS. TX always on the P pin, RX on the N pin.
- HDGC (High-Density Global Clock) capable pins are used for LED SPI SCK/CS and fan PWM — these have enhanced clock routing resources in the fabric, useful for the SPI clock and PWM generation.
- Spare pins on each bank are available for future expansion or debug test points.
- All signals are 3.3V LVCMOS. VCCO for all four HD banks is `+3V3`.

**Board status: schematic complete — ready for ERC cleanup pass, then layout.**

| Item | Status |
| :--- | :--- |
| Wire PL_HD sheet | **Done.** All 51 signals wired to assigned Zynq balls. |
| Backplane connector | **Done.** J13 pinout locked in (see J13 Pinout table earlier in this document). |
| Backplane signal conditioning | **Done.** Full count: 36x 22Ω series Rs (R139–R174), 19x 10kΩ pullups + 1x BP_OE_N pullup (R175), 2x 4.7kΩ I2C pullups, 10x SRV05-4 TVS arrays (U14/U15/U28–U35) placed and wired, 5x 244 buffers (U16/U17/U18/U19/U27) wired, 6x decoupling caps placed. |
| Per-card reset/boot control | **Allocated.** I2C backplane bus (BP_I2C_SDA/SCL on Bank 44) on J13 pins 11 and 12. PCA9555 expanders live on each compute card, not the controller. |
| UART_TX_0 routing to J13 | **Done.** U16 pin 18 wired to J13 pin 13. All 16 UART channels active. |
| LED SPI direction fix | **Done.** MOSI/MISO swapped on U18 to correctly reflect Zynq-as-slave topology. Round 6 verification confirmed via netlist. |
| ERC cleanup pass | **Done (functional).** Three iterations took the count from 130 → 24 → 18 → 13, all circuit-level bugs fixed by Round 5. Remaining 13 reduce to 4 known-safe library quirks once misplaced PWR_FLAGs are cleaned (details in Round 7 above). Schematic is ready for layout. |
| Schematic state | **Complete.** |
| Layout | **In progress.** Stackup and net classes defined (see below). PMIC schematic complete (two original wiring bugs fixed: U23 BG miswire, BUCK4 inductor topology). PMIC top-layer placement and routing locked. Remaining work tracked in "PMIC Layout Phases" at the end of this document. |

### PCB Stackup (JLC08161H-2116, 8-layer, impedance-controlled)

Fabricator: **JLCPCB**. Stackup: their standard 8-layer 1.6mm impedance-controlled option, material FR-4 Tg155. Board size: 227mm × 112mm. Eight layers is viable (not generous) for this design because the XCZU2EG BGA is only 23×23mm at 0.8mm pitch, the DDR4 bus is 32-bit (not 72-bit ECC), and only 2 PS-GTR lanes are routed out.

| Layer | Copper | Dielectric below | Thickness | Material | Dk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| L1 (F.Cu) | 1 oz (35µm) | Prepreg 2116 | 0.1164 mm (4.58 mil) | RC54% | 4.2 |
| L2 (In1.Cu) | 0.5 oz (15µm) | Core | 0.3 mm (11.81 mil) | 0.3mm H/HOZ | 4.3 |
| L3 (In2.Cu) | 0.5 oz | Prepreg 1080 × 2 | 0.1528 mm (6.02 mil) | RC67% | 3.9 |
| L4 (In3.Cu) | 0.5 oz | Core | 0.3 mm | 0.3mm H/HOZ | 4.3 |
| L5 (In4.Cu) | 0.5 oz | Prepreg 1080 × 2 | 0.1528 mm | RC67% | 3.9 |
| L6 (In5.Cu) | 0.5 oz | Core | 0.3 mm | 0.3mm H/HOZ | 4.3 |
| L7 (In6.Cu) | 0.5 oz | Prepreg 2116 | 0.1164 mm | RC54% | 4.2 |
| L8 (B.Cu) | 1 oz | — | — | — | — |

Total board thickness: 1.6mm ± 10%. Solder mask: green, Dk 3.3, 0.01mm. Finish: to be set (ENIG recommended for the 0.8mm BGA pitch).

### Layer Assignment

```
L1  SIG  — BGA escape, components, PS-GTR diff pairs, DDR4 DQ/DQS group 1, Ethernet MDI, USB 2.0 diff
L2  GND  — solid ground plane (reference for L1 and L3)
L3  SIG  — DDR4 DQ/DQS group 2, DDR4 ADDR/CMD/CTL, PS MIO internal routing
L4  PWR  — power plane A: +0V85_VCCINT (big island under BGA), +1V2_VDDQ (between Zynq DDR pin cluster and DDR4 chips), +0V9_MGTAVCC, +1V2_MGTAVTT, +0V6_VTT
L5  PWR  — power plane B: +3V3 (main spine), +1V8 (distributed pours covering VCCAUX/PSAUX/PSPLL/HP bank VCCO areas, moved from L4 due to +0V85_VCCINT and +1V2_VDDQ blocking BGA areas), +3V3_PSIO, +3V3_NVMe, +5V_USB, +2V5_VPP, +1V8_MGTAVCCAUX, +12V input
L6  SIG  — backplane routing (40 LVCMOS signals), peripherals, short signals
L7  GND  — solid ground plane (reference for L6 and L8)
L8  SIG  — backside decoupling caps, test points, remaining backplane signals
```

Reference continuity:
- L1 → L2 (GND, 0.116mm): ideal microstrip reference, used for PS-GTR and DDR4 DQ group 1
- L3 → L2 (GND, 0.3mm above) and L4 (PWR, 0.15mm below): asymmetric stripline, acceptable for DDR4 if the return path is managed
- L6 → L5 (PWR above) and L7 (GND below): asymmetric stripline, fine for low-speed signals
- L8 → L7 (GND, 0.116mm): mirror of L1

### Net Classes and Trace Rules

Impedance targets from the governing specs: UG583 §3 for DDR4, USB-IF for USB 2.0/3.0, PCIe 3.0 for NVMe, DP 1.4 for DisplayPort, IEEE 802.3 for Ethernet. Trace widths computed from JLCPCB's impedance calculator against the JLC08161H-2116 stackup with its published Dk values.

**Single-ended classes:**

| Class | Target Ω | Layer | Trace width (mil) | Trace width (mm) | Clearance (mm) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DDR4_DATA` (DQ, DM) | 40Ω SE | L1 | 11.16 | 0.2835 | 0.152 |
| `DDR4_ADDR` (ADDR/CMD/CTL) | 40Ω SE | L3 | 10.59 | 0.2690 | 0.152 |
| `ETH_RGMII` | 50Ω SE | L3 | 6.96 | 0.1768 | 0.152 |
| `CLK_REF` | 50Ω SE | L1 | 7.34 | 0.1864 | 0.200 |
| `BACKPLANE_LVCMOS` | 50Ω SE (loose) | L6 | 6.96 | 0.1768 | 0.152 |
| `Default` | 50Ω SE | L1 | 7.34 | 0.1864 | 0.152 |

**Differential classes (all on L1, outer microstrip with L2 GND reference):**

| Class | Target Ω | Trace width (mil/mm) | Trace gap (mil/mm) | Clearance (mm) |
| :--- | :--- | :--- | :--- | :--- |
| `DDR4_CLK` | 80Ω diff | 8.29 / 0.2106 | 6.00 / 0.152 | 0.200 |
| `DDR4_STROBE` (DQS) | 80Ω diff | 8.29 / 0.2106 | 6.00 / 0.152 | 0.200 |
| `GTR_85` (USB3, NVMe, MGTREFCLK) | 85Ω diff | 6.97 / 0.1770 | 5.50 / 0.140 | 0.200 |
| `DP_100` (DisplayPort ML lanes) | 100Ω diff | 4.28 / 0.1087 | 5.00 / 0.127 | 0.200 |
| `USB2_90` (D+/D-) | 90Ω diff | 5.74 / 0.1458 | 5.00 / 0.127 | 0.200 |
| `ETH_MDI_100` (Zynq→PHY→RJ45) | 100Ω diff | 4.28 / 0.1087 | 5.00 / 0.127 | 0.200 |

**Power classes:**

| Class | Track width | Via | Notes |
| :--- | :--- | :--- | :--- |
| `POWER_SMALL` | 0.300 mm (12 mil) | 0.8/0.4 mm | LDO outputs, low-current rails |
| `POWER_HIGH` | 0.500+ mm or plane fill | 1.0/0.5 mm | `+0V85_VCCINT`, `+3V3`, `+12V`, `+1V2_VDDQ` — prefer plane fills |

**Note on the 100Ω diff traces (4.28 mil):** narrow but within JLC's 3.5 mil minimum for 1oz outer copper. Watch for solder mask alignment margin during BGA escape near the Zynq. Ethernet MDI pairs are short (few cm total), so impedance tolerance is forgiving — 4.28 mil is fine there. DisplayPort ML lanes route to J5 on the board edge, also short — no issue.

### Length Matching Targets

| Group | Tolerance (±) | Convert to ~mil |
| :--- | :--- | :--- |
| DDR4 DQ within byte lane (to its DQS) | 20 ps | ~3 mil |
| DDR4 DQS pair internal skew | 1 ps | <1 mil |
| DDR4 ADDR/CMD group | 50 ps | ~7.5 mil |
| PS-GTR diff pair internal skew | 2 ps | <0.5 mil |
| Ethernet RGMII TX group (TXD0-3, TX_CTL, TX_CLK) | 50 ps | ~7.5 mil |
| Ethernet RGMII RX group | 50 ps | ~7.5 mil |
| USB 3.0 / USB 2.0 diff pair internal skew | 5 ps | ~0.75 mil |

### Routing Priority Order

1. PMIC (IC1) + external FETs (U23/U24/U25) first — anchors power distribution
2. DDR4 — most constrained, fix topology before placement hardens
3. PS-GTR diff pairs to J4 (USB-C), J5 (DP), J11 (M.2 NVMe) — tight impedance on outer layer
4. Ethernet MDI + RGMII
5. USB 2.0 + ULPI bus
6. Zynq decoupling caps (48 per AMD AR 000039033)
7. Backplane signals (40) to J13 — lowest priority, most routing slack
8. Peripherals (audio, RTC, LDO outputs, fans)

**Open layout questions:**

- Surface finish: **ENIG** recommended for the 0.8mm-pitch Zynq BGA. HASL would be marginal at that pitch.
- Via sizes: default 0.3mm drill / 0.6mm pad for signals; larger 0.4/0.8 for power vias. JLC minimum is 0.3mm drill / 0.45mm pad (0.15mm annular ring). BGA escape vias can go 0.25/0.5 with JLC's extended DRC but costs extra.
- Back-drill: not needed at this speed (GTR at 6 Gbps, DDR4 at 2400 MT/s) on a 1.6mm board.

### PMIC Layout Phases

Working reference for the TPS6508640 PMIC section layout. Detailed component-by-component guidance lives in `Controller/docs/PMIC_Layout_Guide.md`. SLVUAJ9 (TI design guide) and SLVA734 (TI checklist) drive the rules.

**Done — Phase A: Schematic + Top-Layer Routing**

| Item | Status |
| :--- | :--- |
| TPS6508640 schematic, all 6 bucks + 4 LDOs + 3 load switches + VTT LDO | Complete |
| BUCK4 LX/FB inductor topology bug | Fixed |
| U23 gate-drive miswire (BG on DRVH1) | Fixed |
| Boot caps (C88, C79, C97) placed close to IC1 BOOT pins (audit PASS) | Done |
| Ext FETs (U23, U24, U25) adjacent to IC1 BUCK pins (audit PASS) | Done |
| Ext-FET inductors (L4, L5, L6) adjacent to FET VSW (audit PASS) | Done |
| ILIM resistors (R99, R100, R101) close to IC1 (audit PASS) | Done |
| LDO output bulk caps placed close to LDO output pins | Done |
| EPAD via stitching under IC1 (≥9 vias) | Done |
| Top-layer DRVH/SW differential routing pattern | Done |
| Phase-A audit mitigations (3× 1µF 0402 caps directly across U23/U24/U25 VIN/PGND pads to compensate for distant +12V bulk caps) | Done |

**Open issues from layout audit:**
- L1, L2, L3 (internal-FET buck inductors for BUCK5/4/3) sit ~8-10mm from IC1 LX pins — accepted given board space constraints, mitigated by L1-layer copper pours on LX nets and short total path
- C45, C46 (DRV5V bypass caps) at 4.5/3.2mm from IC1 pins 38/8 — minor warning, can be tightened later if convenient
- C47 (VREF cap) at 4.1mm from IC1 pin 53 — minor warning, will be addressed when AGND island is built

**To Do — Phases B through I**

These phases are tracked in the project task list and walked through in sequence. Each represents a self-contained layout work block.

| Phase | Description | Layer(s) | Notes |
| :--- | :--- | :--- | :--- |
| **B1** | `+0V85_VCCINT` filled zone — largest pour on board | L4 | Anchors BUCK2 power delivery to Zynq BGA. Must be drawn before backside caps so they have a destination plane. |
| **B2** | `+1V2_VDDQ` filled zone | L4 | Between Zynq DDR pin cluster and DDR4 chips. Feeds VCCO_PSDDR_504 + DDR4 VDD pins. |
| **B3** | Small L4 islands: `+0V9_MGTAVCC`, `+1V2_MGTAVTT`, `+0V6_VTT`, `+1V8` | L4 | 0.2mm clearance between pours. |
| **C** | L5 power planes: `+3V3` main spine + smaller islands (`+5V_USB`, `+3V3_NVMe`, `+3V3_PSIO`, `+2V5_VPP`, `+1V8_MGTAVCCAUX`, `+12V` from J2) | L5 | Whole-board power spine, can be drawn anytime. |
| **D** | Move 10µF 0402 caps (C139, C140, C141, C149, C150) to bottom layer (L8/B.Cu) directly under Zynq VCCINT ball clusters | L8 | High-frequency decoupling; AMD AR 000039033 zone (0-1 inch from BGA on backside). Each cap one via straight up to its closest VCCINT ball. Must be done after Phase B1 so vias have a target plane. |
| **E** | FB/FBVOUT sense traces routed on inner layer L3 with L2 GND shielding | L3 | All 6 buck feedbacks: FBVOUT1, FBVOUT2 + FBGND2 (matched pair), FB3, FB4, FB5, FBVOUT6. Each thin (4-6 mil), via to L3 within 2mm of IC1 pin, route on L3, via back to L1 at center of the corresponding output cap bank. |
| **F** | PGNDSNS Kelvin traces with L1 GND pour keep-outs | L1 | PGNDSNS1, PGNDSNS2, PGNDSNS6 thin traces from FET PGND corners to IC1 pins 36/6/40, isolated from main GND pour via Rule Areas. **Must be done before final L1 GND pour fill** or the pour will eat the traces. |
| **G** | AGND island on L1 around C47/IC1 pin 52 | L1 | Small filled zone separate from main GND pour, single-point tie via, isolated from PowerPAD. Holds VREF cap on a clean reference. **Must be done before final L1 GND pour fill.** |
| **H** | Verify L2 and L7 GND plane integrity | L2, L7 | Check planes are continuous under PMIC area; no signal traces routed through these layers in the PMIC region; no via wall obstructing return current flow. |
| **I** | Re-run layout audit script | All | Regenerate netlist, parse `Controller.kicad_pcb`, verify all phases applied. Goal: zero fails, ≤3 warnings before considering PMIC complete. |

**Critical interdependencies:**
1. Phase F (PGNDSNS keep-outs) and Phase G (AGND island) must be done **before** the final L1 GND pour fill — otherwise the pour merges the isolated nets with main GND.
2. Phase B1 (`+0V85_VCCINT` plane) must be done **before** Phase D (backside caps) — the vias from backside caps need a destination plane on L4.
3. Phase E (FB sense traces) is independent and can be done in parallel with B/C.

**After PMIC complete:**
- Move to DDR4 layout (highest constraint, length matching to DQS, fly-by topology)
- Then PS-GTR diff pairs to J4/J5/J11
- Then Ethernet, USB 2.0, RGMII
- Then backplane signals (40 LVCMOS to J13) — most slack, lowest priority
- Then peripherals (audio, RTC, fans)
- Final DRC pass and ERC re-run before Gerber export

