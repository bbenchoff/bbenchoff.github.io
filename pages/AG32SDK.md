---
layout: default
title: "AG32SDK"
description: "A Software Development Kit for the AG32 RISC-V + CPLD MCU"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2022-06-04
last_modified_at: 2022-06-04
image: "/images/default.jpg"
---

# The AG32

The AG32 is a family of 32-bit RISC-V microcontrollers with a built-in ~2k-logic-element FPGA/CPLD block, aimed at “MCU + small FPGA in one chip” use cases. The core is an RV32IMAFC RISC-V CPU (integer, mul/div, atomics, single-precision FPU, compressed instructions) running up to about 248 MHz, with up to 1 MB of on-chip flash and 128 KB SRAM depending on the part. It features a fairly normal suite of peripherals: five UARTs, CAN, I²C, SPI, USB FS+OTG, Ethernet MAC, timers, three 12-bit 3 MSPS ADCs (17 channels), DACs, comparators, RTC, watchdog, etc.

Every AG32 has an embedded **AGRV2K** FPGA fabric: about **2 K logic elements (2 K LUT4+FF slices) plus four M9K RAM blocks**, wired into the MCU over the internal AHB bus.([agm-micro.com][1]) So it’s basically a small non-volatile FPGA bolted to a reasonably beefy MCU, but in one package, with very fast internal connectivity.

Oh, and the AG32 is available in quantity for **eighty cents** [on LCSC](https://www.lcsc.com/product-detail/C41397171.html). Can you beat that? No, you can't.

---

### What does the microcontroller compare to?

Short version: **“high-end Cortex-M4/M33 class” is a fair mental model**, but it’s not a drop-in clone.

* The AG32 core is **RV32IMAFC at up to 248 MHz**, with hardware float and zero-wait-state on-chip flash.([agm-micro.com][2])
* Instruction set efficiency for RV32IMAC vs Armv7-M (M3/M4) is broadly similar; both are 32-bit load/store RISCs with 16-bit compressed encodings available (Thumb-2 vs RVC). Real-world benchmarks tend to come within the same general “1 DMIPS/MHz give or take” envelope for this class of core, assuming similar memory systems.([Wevolver][3])

Caveats:

* There are no widely published Dhrystone/CoreMark numbers for AG32 yet, so anything more precise than “same ballpark as a fast M4/M33 at ~200+ MHz” would be pretending.
* Ecosystem is much thinner than ST/NXP/etc; the performance you *get today* will depend a lot on how good the SDK and linker scripts are, which… I'm writing.

So: yes, thinking of it as a **Cortex-M4/M33-ish microcontroller in horsepower** is reasonable, but you should expect more friction and fewer vendor-hand-holding libraries.

---

### What is the FPGA part “equivalent” to?

The embedded AGRV2K fabric is:

* **2 K “logic elements”** (internally described as up to 2 K slices, each slice = LUT4 + register).([agm-micro.com][1])
* **4× M9K-style block RAMs**, so ~36 Kb of true block RAM total.([agm-micro.com][1])
* Instant-on, non-volatile, 3.3 V I/O, with a PLL and a handful of global clocks.([agm-micro.com][1])

AGM themselves and their ecosystem docs explicitly say the embedded 2KLE block can replace things like:

* **Altera EPM570 / EPM1270 CPLDs**,
* **Lattice MachXO2-256 / XO2-640 / XO2-1200**, etc.([EEWorld][4])

So mentally: **“one small low-end FPGA or a few mid-range CPLDs worth of logic”**. It’s nowhere near a Cyclone/Artix monster, but it’s massive overkill compared to classic glue logic and very capable for:

* Bus adapters / weird digital interfaces
* Small DSP-ish pipelines (filters, decimators, simple video timing, ADC front-ends)
* State machines and protocol engines
* GPIO expansion, custom PWM/stepper generators, etc.

---

### Why would anyone want this thing?

Ignoring “because it’s weird and fun,” the real value props are:

1. **MCU + small FPGA without a second chip**

   * You get MCU + ~2KLE FPGA **in one package**, on one 3.3 V rail, with a shared clock tree and internal AHB link between them. That saves BOM, board area, and layout complexity vs “STM32 + MachXO2 + level shifters”.([agm-micro.com][5])

2. **Stupidly fast MCU↔FPGA link**

   * The FPGA fabric sits on the MCU’s internal bus, not behind SPI or parallel GPIO bit-banging, so you can stream samples or control registers at bus speed with low latency. That’s exactly what they pitch for audio/video front-ends, oscilloscopes, energy-storage systems, etc.([agm-micro.com][6])

3. **Custom digital interfaces and timing**

   * Need a 100 MHz DDR-ish ADC interface, weird RGB panel timing, or some non-standard sensor bus? You stuff the wires into the FPGA, write a little HDL, and hand the MCU a polite FIFO or register file. The marketing pages literally show examples like “implement AD9288 oscilloscope front-end” and touch-screen pre/post-processing using the 2K FPGA.([agm-micro.com][5])

4. **Cheap poor-man’s Zynq / SmartFusion**

   * It’s the same architectural idea as Zynq/SmartFusion/etc, but shrunk down to microcontroller scale and price: small RISC-V core instead of Cortex-A, tiny FPGA instead of a sea of LUTs, still enough to offload the nasty real-time bits. For a lot of embedded products, that’s exactly the sweet spot.

5. **Pin-compatibility and “mystery meat” defense**

   * Some SKUs are marketed as pin-compatible replacements for GD32/STM32F4 parts, but with the embedded FPGA and at significantly lower cost, at least in Chinese channels.([agm-micro.com][5])
   * They even brag that because you can reassign digital pin functions arbitrarily through the FPGA fabric, it’s harder for cloners to figure out what chip you used just by staring at the board.([agm-micro.com][5])

So the elevator pitch in human words:

> **AG32 is a high-clock RISC-V Cortex-M-class MCU glued to a tiny, actually-useful FPGA, with a fast internal bus between them and a very aggressive price point.**
> You use the RISC-V side for “normal firmware things” and the 2KLE fabric for all the timing-sensitive, interface-weird, or mildly-DSP-ish bits you’d normally burn a separate CPLD/FPGA on.

For what you’re trying to do—being the unofficial English-language SDK and tooling ecosystem—this is basically a weird little SoC waiting for someone to civilize it.

[1]: https://www.agm-micro.com/upload/userfiles/files/AGRV2K_Rev_3_0.pdf "FEATURES"
[2]: https://www.agm-micro.com/solutions.aspx?id=3110&lang=&p=2076 "Industrial Applications"
[3]: https://www.wevolver.com/article/risc-v-vs-arm?utm_source=chatgpt.com "RISC-V vs ARM: A Comprehensive Comparison of ..."
[4]: https://en.eeworld.com.cn/bbs/thread-1316984-1-1.html?utm_source=chatgpt.com "AG32 MCU+CPLD joint programming (case description)"
[5]: https://www.agm-micro.com/solutions.aspx?id=3093&lang=en&p=2076 "AGM32 mcu, AGM Micro, Programmable ..."
[6]: https://www.agm-micro.com/solutions.aspx?id=3104&lang=en&p=2077 "Audio and Video"


# AG32VF303 SDK & Toolchain Plan

This document outlines a practical plan to build an open, English-language SDK and toolchain for the **AG32VF303** RISC-V MCU family, including examples, docs, and flashing/debug support.

These notes describe the minimum infrastructure needed so that *“clone repo + plug in J-Link”* is enough to be productive.

## A Note on Supra and the CPLD Toolchain

The AG32 parts ship with an embedded AGRV2K CPLD/FPGA fabric, and AGM’s intended flow is to use their proprietary Supra tool (plus, historically, a Quartus-based flow) to build bitstreams.

For this SDK, I am **deliberately punting on reimplementing that toolchain**.

The plan is:

* Treat **Supra as a black-box compiler**: it takes Verilog + a pin/VE file and emits a bitstream.
* Focus this project on:
  * A clean, open **MCU toolchain** (GCC, linker scripts, startup code).
  * An **API and memory map** for how the MCU talks to logic in the AGRV2K fabric (register windows, FIFOs, etc.).
  * A handful of **HDL reference designs** (GPIO expander, simple register bank, FIFO, timers) that can be built with Supra.

In other words, the goal here is **not** to recreate IceStorm for AG32 or reverse-engineer the bitstream format. That would be a separate, much larger project.

Instead, this SDK assumes:

* You use Supra to compile the logic.
* This repo shows you **how to integrate that logic with the RISC-V side**, document the registers, and ship a usable MCU + CPLD system.

Once the MCU-side SDK is solid and there are a few good “MCU ↔ CPLD” examples, I can always come back and layer nicer Supra automation or explore more open flows later.


---

## 0. Relevant Links

## Official product & documentation

* [AG32VF303 Series – AGM Micro](https://www.agm-micro.com/products.aspx?id=3113&lang=&p=37)
* [AG32 MCU Series overview (family list)](https://www.agm-micro.com/products.aspx?lang=&p=37)
* [AG32 MCU Reference Manual – 2025-08-28](https://www.agm-micro.com/upload/userfiles/files/AG32%20MCU%20Reference%20Manual%2820250828%E4%BF%AE%E8%AE%A2%E7%89%88%EF%BC%89.pdf)
* [AG32 MCU Reference Manual – 2023-09 (mirror)](https://m.elecfans.com/article/2361211.html)
* [AG32 MCU Selection Guide (family comparison table)](https://cdn.yun.sooce.cn/4/70277/pdf/168646652071026663cb4225154d5c74e8a1046746e65.pdf)

### Device-specific product pages

* [AG32VF303CCT6 – LQFP-48 product page (AGMFPGA)](https://www.agmfpga.com/doc_26974610.html)
* [AG32VF303VCT6 – LQFP-100 product page (AGMFPGA)](https://www.agmfpga.com/doc_25436762.html)

### Distributor pages (extra datasheet mirrors)

* [AG32VF303CCT6 – LCSC](https://lcsc.com/product-detail/microcontrollers-mcu-mpu-soc_agm-microelectronics-ag32vf303cct6_C7541224.html)
* [AG32VF303CCT6 – SemiKey](https://www.semikey.com/product-detail/ag32vf303cct6)
* [AG32VF303CCT6 – Chinese distributor mirror](https://www.tcx-micro.com/yaojun19870207/vip_doc/25436783.html)

---

## GitHub & ecosystem repos

* [AGMCU / AGMCU – official AG32 repo (includes AG32_DATASHEET_202303.pdf)](https://github.com/AGMCU/AGMCU)
* [SoCXin / AG32VF407 – L3 R3: AGM RISC-V + CPLD/FPGA MCU (AG32VH407 / AG32VF407 / AG32VF303)](https://github.com/SoCXin/AG32VF407)
* [OS-Q / platform-agm32 – PlatformIO “agm32rv” platform](https://github.com/OS-Q/platform-agm32)
* [SoCXin org – all AG32-related repos](https://github.com/orgs/SoCXin/repositories)

---

## Toolchain / usage discussion & pointers

* [AG1280q48 tutorial issue – notes + link to AGMCU docs site](https://github.com/libc0607/libc0607.github.io/issues/1)
* [Getting Started with AG32 MCU + CPLD Joint Use (Part 1) – EEWorld](https://en.eeworld.com.cn/bbs/thread-1309074-1-1.html)
* [AG32 low-power mode & AGRV2KQ32 = AG32VF303KCU6 note – EEWorld](https://en.eeworld.com.cn/bbs/thread-1312847-1-1.html)

---

## Handy generic AG32 docs (family-wide)

* [AG32 MCU Reference Manual – older generic PDF mirror](https://aimg8.dlssyht.cn/u/2213600/ueditor/file/1107/2213600/1680858170722635.pdf)
* [AG32 MCU Reference Manual 2023-09 article (Chinese, with download link)](https://m.elecfans.com/article/2361211.html)

That should be enough anchors for your SDK README / docs page: “official series page, ref manual, selection guide, GitHub repos, and the weird Chinese forum posts where the real knowledge lives.”

---

## 1. Goals

- Support the **AG32VF303** family (e.g. CCT6, KCU6 packages) as first-class targets.
- Provide:
  - A reproducible GCC toolchain configuration.
  - Startup code + linker script.
  - Minimal low-level (LL) headers for core peripherals.
  - A small set of clean, boring, reliable examples.
  - A simple flashing/debug path using OpenOCD + GDB.
- Publish everything in a public GitHub repo, documented in English.
- Fuck I'm going to have to write the Arduino... thing... for this

---

## 2. Target Device (AG32VF303) – Working Assumptions

*(Verify exact addresses/sizes in the datasheet and update this section.)*

- **CPU**: RISC-V 32-bit core, up to 248 MHz, with FPU.
- **Flash**: 256 KB @ `0x0800_0000` (assumed).
- **SRAM**: 128 KB @ `0x2000_0000` (assumed).
- **Peripherals** (partial list):
  - GPIO ports
  - UARTs (e.g., 5×)
  - I²C (e.g., 2×)
  - Timers (basic + advanced)
  - ADC (3× 12-bit up to 3 MSPS, 17 channels)
  - DACs, comparators, watchdog, RTC
  - Ethernet MAC, USB FS/OTG
- **Extras**: Integrated logic/CPLD-style block (“ASIC logics”) to be treated later.

---

## 3. Repository Layout

Planned directory structure for `ag32vf303-sdk`:

```text
ag32vf303-sdk/
  toolchain/
    README.md
    cmake/
      toolchain-riscv-gcc.cmake

  cores/
    rv/
      startup_ag32vf303.S
      system_ag32vf303.c
      ag32vf303.h          # core + global definitions
      ag32vf303_gpio.h     # LL register structs
      ag32vf303_uart.h
      ag32vf303_timer.h
      ag32vf303_adc.h
      ...                  # expand as needed

  boards/
    ag32vf303cct6-minimal/
      board.h              # LED pin, clock source, UART pins
      board.c
    ag32vf303kcu6-minimal/
      board.h
      board.c

  ld/
    ag32vf303_256kflash_128ksram.ld

  examples/
    00_blinky/
    01_uart_echo/
    02_timer_blink/
    03_adc_single/
    04_spi_loopback/
    05_i2c_scan/
    06_dma_mem2mem/
    10_rtt_or_semihosting/

  tools/
    flash_openocd.sh
    flash_openocd.bat
    gdb_init_ag32vf303.gdb

  docs/
    00_overview.md
    01_getting_started.md
    02_memory_and_clocks.md
    03_gpio.md
    04_uart.md
    05_timers.md
    06_adc.md
    07_spi.md
    08_i2c.md
    09_dma.md
    20_debugging.md
    30_cpld_logic_intro.md   # later

  CMakeLists.txt
  README.md
  LICENSE
```

Keep it predictable and minimal so it’s easy to navigate.

---

## 4. Toolchain & Build System

### 4.1 Toolchain Choice

Use a standard, bare-metal RISC-V GCC:

- **Compiler**: `riscv32-unknown-elf-gcc`
- **Architecture flags** (subject to confirmation):
  - `-march=rv32imafc`
  - `-mabi=ilp32f`
- **Common flags**:
  - `-mcmodel=medany`
  - `-ffunction-sections -fdata-sections`
  - Link with `-Wl,--gc-sections`

### 4.2 CMake Toolchain File

`toolchain/cmake/toolchain-riscv-gcc.cmake`:

- Sets the compiler to `riscv32-unknown-elf-gcc`.
- Adds the CPU/ABI flags.
- Provides a simple entrypoint so users can do:

```bash
cmake -B build -DCMAKE_TOOLCHAIN_FILE=toolchain/cmake/toolchain-riscv-gcc.cmake
cmake --build build
```

### 4.3 Linker Script Skeleton

`ld/ag32vf303_256kflash_128ksram.ld` (addresses are placeholders until confirmed):

```ld
MEMORY
{
  FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 256K
  RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

ENTRY(Reset_Handler)

SECTIONS
{
  .isr_vector :
  {
    KEEP(*(.isr_vector))
  } > FLASH

  .text :
  {
    *(.text*)
    *(.rodata*)
    KEEP(*(.init))
    KEEP(*(.fini))
  } > FLASH

  .data : AT(ADDR(.text) + SIZEOF(.text))
  {
    _sidata = LOADADDR(.data);
    _sdata = .;
    *(.data*)
    _edata = .;
  } > RAM

  .bss :
  {
    _sbss = .;
    *(.bss*)
    *(COMMON)
    _ebss = .;
  } > RAM

  _end = .;
}
```

This is the baseline. Later, reserved regions (bootloader, logic config, etc.) can be added.

---

## 5. Startup Code & System Init

### 5.1 Startup File

`cores/rv/startup_ag32vf303.S` responsibilities:

- Provide the interrupt vector table in `.isr_vector`, placed at the start of flash.
- Define `Reset_Handler`:
  1. Set stack pointer.
  2. Copy `.data` from flash to RAM.
  3. Zero `.bss`.
  4. Call `SystemInit`.
  5. Call `main`.
- Provide weak default handlers for interrupts, aliased to a `Default_Handler`.

### 5.2 System Initialization

`cores/rv/system_ag32vf303.c`:

- Configure system clocks:
  - Enable clock sources.
  - Set up PLL to reach 248 MHz core frequency (or a stable initial value).
  - Configure AHB/APB prescalers.
- Enable FPU if required by this core.
- Optionally provide `SystemCoreClock` and `SystemCoreClockUpdate()`.

Every magic constant should be commented with the relevant reference manual section.

---

## 6. Flashing & Debugging

### 6.1 Primary Path: OpenOCD + J-Link (or other SWD/JTAG)

Provide scripts in `tools/`:

```bash
./tools/flash_openocd.sh build/examples/00_blinky/blinky.elf
```

`flash_openocd.sh` (conceptually):

- Starts OpenOCD with:
  - `interface jlink` (or other)
  - Appropriate RISC-V target config.
- Issues commands:
  - `reset halt`
  - `program blinky.elf verify reset`
  - `exit`

Provide a `gdb_init_ag32vf303.gdb`:

```gdb
target extended-remote :3333
monitor reset halt
load
monitor reset init
continue
```

This gives a canonical debug flow:

```bash
riscv32-unknown-elf-gdb build/.../blinky.elf
```

### 6.2 Secondary Path: Bootloader (Later)

Once the vendor bootloader protocol is understood:

- Add `tools/ag32boot.py`:
  - Toggles the boot/reset pins (could use a helper microcontroller).
  - Speaks the serial boot protocol.
- Wrap in `flash_bootloader.sh` as an alternate flashing path.

This is non-blocking for initial SDK release.

---

## 7. Example Projects

Each example lives in `examples/NAME/` with its own `CMakeLists.txt` and uses the shared core/board/ld files.

Initial set:

1. **00_blinky**
   - Uses the LED defined in `board.h`.
   - Configures GPIO via LL registers.
   - Implements a crude delay loop.

2. **01_uart_echo**
   - Sets up a canonical UART instance and pins.
   - Configures baud (e.g. 115200 8N1).
   - Implements echo (polling or basic interrupt-driven RX).

3. **02_timer_blink**
   - Configures a hardware timer to tick at 1 kHz.
   - Timer interrupt toggles LED.

4. **03_adc_single**
   - Enables ADC, selects one channel.
   - Performs single-shot conversions.
   - Prints readings in millivolts over UART.

5. **04_spi_loopback**
   - Sets SPI as master.
   - Requires MOSI/MISO jumper.
   - Verifies a known pattern round-trips.

6. **05_i2c_scan**
   - I²C master on canonical pins.
   - Scans addresses 0x03–0x77.
   - Prints discovered device addresses via UART.

7. **06_dma_mem2mem**
   - Configures a DMA channel to copy memory.
   - Confirms with completion interrupt or checksum.

8. **10_rtt_or_semihosting** (optional)
   - Example of printf via debug channel instead of UART (if supported).

Round 2 (later):

- CAN loopback.
- USB CDC.
- Ethernet ping responder (with external PHY).
- Simple logic/CPLD demo.

---

## 8. Documentation Structure

Planned docs in `docs/`:

### `00_overview.md`

- What AG32VF303 is.
- Summary of core features and integrated logic.
- Relation to other MCUs (e.g., “feels like STM32/CH32, but RISC-V + logic”).

### `01_getting_started.md`

- Requirements:
  - Toolchain.
  - J-Link (or other probe).
  - Minimal board/pinout diagram.
- Steps:
  1. Install toolchain.
  2. Clone SDK repo.
  3. Configure and build `00_blinky`.
  4. Flash with `flash_openocd.sh`.
  5. Observe LED + UART.

### `02_memory_and_clocks.md`

- Flash/RAM sizes and base addresses.
- Reset clock source.
- PLL configuration and recommended “canonical” clock setup.
- `SystemCoreClock` explanation.

### `03_gpio.md`

- GPIO port structure.
- Registers (mode, type, pull, speed, input, output).
- Examples:
  - Configure output pin.
  - Configure input with pull-up.

### `04_uart.md`

- Register overview.
- Peripheral/pin mux table for at least one UART.
- Simple polled TX.
- Interrupt-driven echo.

### `05_timers.md`

- Timer modes (up-counter, PWM).
- Frequency calculations.
- Example: periodic interrupt.

### `06_adc.md`

- Channel selection and sampling.
- Calibration (if needed).
- Single-shot example.

### `07_spi.md`, `08_i2c.md`, `09_dma.md`

- Same pattern: short intro → registers → code snippet → reference example.

### `20_debugging.md`

- Using OpenOCD + GDB with this SDK.
- Common issues and troubleshooting tips.

### `30_cpld_logic_intro.md` (later)

- What the integrated logic fabric is.
- High-level description of the logic tool flow.
- Very simple example (e.g., combinational logic mapped to a pin).

---

## 9. Phased Implementation Plan

### Phase 0 – Read & Annotate

- Gather:
  - VF303 datasheet.
  - Full AG32 reference manual.
  - Pinout docs for at least VF303CCT6 and VF303KCU6.
- Mark:
  - Memory map.
  - Clock tree.
  - Reset behavior.
  - Interrupt vector layout.

### Phase 1 – Bare Minimum Bring-Up

- Write:
  - Linker script (`ag32vf303_256kflash_128ksram.ld`).
  - Startup (`startup_ag32vf303.S`).
  - Minimal `system_ag32vf303.c` with just enough clocking to run.
- Implement tiny `main.c`:
  - Disable watchdog (if present).
  - Enable one GPIO port.
  - Toggle an output pin in a loop.
- Get OpenOCD + GDB talking:
  - Prove that code flashes, runs, and can be halted.

**Milestone:** LED toggles using custom code and toolchain.

### Phase 2 – Repo Skeleton + Blinky + UART

- Create repo with the directory structure in Section 3.
- Add a `boards/ag32vf303cct6-minimal` definition with:
  - LED pin.
  - UART pins.
  - Base clock/oscillator config.
- Implement:
  - `00_blinky`
  - `01_uart_echo`
- Write enough of:
  - `01_getting_started.md`
  - `03_gpio.md`
  - `04_uart.md`
  to support these examples.

**Milestone:** Another developer with the same hardware could follow the docs and get UART echo.

### Phase 3 – Peripheral Coverage

- Add and test examples:
  - `02_timer_blink`
  - `03_adc_single`
  - `04_spi_loopback`
  - `05_i2c_scan`
  - `06_dma_mem2mem`
- Flesh out:
  - `02_memory_and_clocks.md`
  - `05_timers.md`
  - `06_adc.md`
  - `07_spi.md`
  - `08_i2c.md`
  - `09_dma.md`

**Milestone:** Most “normal” embedded projects on VF303 can be started by copy-pasting from examples.

### Phase 4 – Advanced Features & Ecosystem

- Add:
  - CAN, USB, Ethernet examples.
  - Basic logic/CPLD example and `30_cpld_logic_intro.md`.
- Investigate:
  - Bootloader programming protocol.
  - Write `ag32boot.py` and `flash_bootloader.sh`.
- Optional:
  - Create a PlatformIO “platform” that wraps this SDK for users who prefer that environment.

---

## 10. Outcome

Once these steps are done, the AG32VF303 will have:

- A public, documented SDK.
- A standard GCC toolchain configuration.
- Clean startup/linker glue.
- A set of well-scoped, buildable examples.
- A working debug/flash workflow.

In other words: you will have turned a mysterious RISC-V + logic device into a usable, documented platform.

## 11. Bonus Example Projects

A 'kinda fast RISC-V microcontroller + small FPGA' _needs_ example projects. Here's some ideas:

- **DVI Video** - TMDS at 250 MHz, might fit in 2K LEs barely
- **Logic Analyzer** - FPGA samples GPIOs at 50+ MHz into block RAM, Sigrok.
- **Audio synthesizer** - FPGA does Wavetable, FM, I2S, MCU does MIDI, envelope, UI
- **A Fucking Connection Machine** - The reason I'm doing this


[back to main project page](ThinkinMachine.html)

[main](../)
