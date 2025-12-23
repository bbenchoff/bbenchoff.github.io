# Thinkin Machine - Project Meta Document

Word count tracking for all pages.

---

## THINKINMACHINE.MD

| Section | Words |
|---------|-------|
| Introduction | 800 |
| The LED Panel | 1,500 |
| My Machine, Overview | 800 |
| Hardware Architecture | 1,200 |
| Which Microcontroller To Use | 1,000 |
| 1 Node | 1,500 |
| 16 Nodes, The Slice | 500 |
| 256 Nodes, The Plane | 100 |
| 4096 Nodes | 150 |
| The Backplane | 1,500 |
| The Backplane Connectors | 800 |
| The Backplane Schematic | 1,200 |
| OrthoRoute | 800 |
| Backplane Assembly | 0 |
| Mechanical Design | 600 |
| Software Architecture | 0 |
| Parallel C (StarC) | 0 |
| What this thing does | 0 |
| Calculating & Performance | 0 |
| - Quantum Chromodynamics | 0 |
| - Bitonic Sort | 0 |
| - Neural Network | 0 |
| - Performance vs i7/RTX | 0 |
| One More Thing | 1,000 |
| Contextualizing the build | 1,500 |
| Related Works | 400 |
| **TOTAL** | **17,050** |

---

## 16NODEMACHINE.MD

| Section | Words |
|---------|-------|
| Introduction | 500 |
| Architectural Limitations | 600 |
| The CH32V203 Board | 0 |
| - Control Microcontroller | 200 |
| - The Node Microcontroller | 300 |
| - The Clock Tree | 200 |
| - Boot0 and /RST | 150 |
| - The Serial Mux | 150 |
| - The Finished CH32V203 Board | 200 |
| - Bringup of CH32V203 Board | 0 |
|   - PIOs and Clocks | 0 |
|   - Serial Programming | 0 |
|   - Blinking LEDs | 0 |
| - Hypercube Communications | 0 |
|   - Implementation of CDMA | 0 |
| - Results??? | 0 |
| The AG32VF303 Board | 0 |
| - Circuit Similarities | 0 |
| - Circuit Differences | 0 |
|   - Phase and Sync | 0 |
| - AG32 Bringup | 0 |
| - Hypercube Bringup | 0 |
|   - Implementation of TDMA | 0 |
| - Results??? | 0 |
| - CH32 & AG32 Comparison | 0 |
| - Conclusion | 0 |
| **TOTAL** | **2,300** |

## HYPERCUBETDMA.MD

| Section | Words |
|---------|-------|
| Introduction / The Problem | 400 |
| What is TDMA | 600 |
| Hypercube-Specific TDMA | 800 |
| Routing Examples | 600 |
| Bounded Latency | 300 |
| What Falls Out | 200 |
| Why This Works Here | 300 |
| My Context | 200 |
| **TOTAL** | **2,800** |

---

## ORTHOROUTE.MD

| Section | Words |
|---------|-------|
| Why I Built This | 400 |
| How It Works | 300 |
| Adapting FPGA Algorithms to PCBs | 400 |
| How PathFinder Almost Killed Me | 600 |
| Routing The Monster Board | 400 |
| The Future of OrthoRoute | 300 |
| **TOTAL** | **2,200** |


---

## AG32.MD

| Section | Words |
|---------|-------|
| Introduction | 300 |
| What Is The AG32 | 800 |
| Programming Model | 700 |
| **Setup & Installation** | |
| - Installing PlatformIO | 300 |
| - Installing Supra | 300 |
| - Device Connections | 200 |
| **MCU Projects** | |
| - Blink LED (MCU) | 250 |
| - UART Echo (MCU) | 250 |
| **FPGA Projects** | |
| - Blink LED (FPGA) | 350 |
| - UART Loopback (FPGA) | 350 |
| **Programming the AG32** | 400 |
| **TOTAL** | **4,200** |

---

## AG32SDK.MD

| Section | Words |
|---------|-------|
| **Why This Exists** | 400 |
| - The AG32 documentation problem | |
| - What already exists (Chinese tools) | |
| - What was missing | |
| **SDK Architecture** | 600 |
| - Register definitions | |
| - Peripheral libraries | |
| - Build system (Make/CMake) | |
| - Dual-binary workflow (code.bin + logic.bin) | |
| **Installation & Setup** | 500 |
| - Toolchain (RISC-V GCC) | |
| - Cloning the repo | |
| - First compile | |
| **Core Libraries** | 800 |
| - GPIO (with remapping) | |
| - UART (with FPGA routing) | |
| - Timers | |
| - SPI/I2C basics | |
| **Example Projects** | 600 |
| - Blink (the minimal case) | |
| - UART echo with dynamic remapping | |
| - Multi-UART with FPGA fabric | |
| **Bootloader & Upload** | 400 |
| - Serial bootloader protocol | |
| - Upload tool | |
| **What's NOT Here (Yet)** | 200 |
| - FPGA toolchain (use Supra) | |
| - Advanced peripherals | |
| - Future work | |
| **TOTAL** | **3,500** |

---

## CM1IMPLEMENTATION.MD

| Section | Words |
|---------|-------|
| **Introduction: The Problem** | 300 |
| - Only one CM-1 exists (MoMA) | |
| - No working software archive | |
| - Built from Hillis's thesis alone | |
| **The Goal** | 80 |
| **CM-1 Processor Architecture** | 250 |
| **Comparison to Original CM-1** | 400 |
| - Hardware specs side-by-side | |
| - Processor architecture | |
| - Memory per node | |
| - Topology (both 12D hypercube) | |
| **Architectural Differences: Routers vs TDMA** | 800 |
| - Original CM-1 Router Design | |
|   - Packet-switched network | |
|   - Adaptive routing with referral | |
|   - 7 message buffers per node | |
|   - Deadlock avoidance | |
|   - ~10K transistors per router | |
| - My TDMA Approach | |
|   - Deterministic time-division | |
|   - No buffering needed | |
|   - Collision-free by design | |
|   - Dimension-ordered routing | |
|   - ~50 LUTs total | |
| - Why This Works | |
|   - SIMD execution pattern | |
|   - Synchronous compute phases | |
|   - Predictable communication | |
| - Tradeoffs | |
|   - What I lose: async messaging | |
|   - What I gain: simplicity, determinism | |
|   - Resource comparison | |
| - Legitimacy Argument | |
|   - Still a hypercube | |
|   - Still SIMD | |
|   - Still bit-serial processors | |
|   - Communication semantics equivalent | |
| **Resource Budget per AG32** | 400 |
| **Memory Architecture** | 150 |
| **The Topology Mapping** | 150 |
| **Verilog Implementation** | 50 |
| - Single Processor Cell | (code) |
| - 16-Processor Array | (code) |
| - Integration with TDMA | (code) |
| **Memory Access Pattern** | 150 |
| **What You Can Run (Theoretically)** | 400 |
| - Hand-assembled examples | |
| - These work in simulation | |
| **The Missing Piece** | 400 |
| - No CM-1 binaries exist (publicly) | |
| - No *Lisp compiler survives | |
| - NASA might have something | |
| - TMC alumni might have archives | |
| **Verification Status** | 200 |
| - Simulation works | |
| - Logic analyzer confirms | |
| - No end-to-end test possible | |
| **Call to Action** | 300 |
| - If you worked at TMC... | |
| - If you have archives... | |
| - Danny, if you're reading this... | |
| **LUT Summary** | 50 |
| **The Flex (and the Ask)** | 200 |
| **TOTAL (text)** | **~4,280** |
| **Code blocks** | **(~600 lines)** |

---

## STARC.MD

| Section | Words |
|---------|-------|
| **Introduction: Why StarC Exists** | 400 |
| - The CM-1 had C* and *Lisp | |
| - Modern parallel languages miss the point | |
| - This machine needs CM-style programming | |
| **The Programming Model** | 500 |
| - Xectors (distributed values) | |
| - Set-centric thinking | |
| - SIMD with masks | |
| - Communication as permutation | |
| **Core Primitives** | 1,200 |
| - **Xectors and Shapes** | |
|   - pvar<T> types | |
|   - pid() and coord(dim) | |
| - **Processor Selection (where)** | |
|   - where(mask) { } syntax | |
|   - Inactive lane semantics | |
| - **Communication Primitives** | |
|   - prs(addr) - remote read | |
|   - pact(addr, val, combiner) - remote write | |
|   - get/send - permutation | |
|   - nbr(dim, value) - neighbor exchange | |
| - **Collective Operations** | |
|   - reduce, scan, spread | |
|   - rank (optional) | |
| - **Synchronization** | |
|   - barrier() | |
|   - phase control | |
| **The MVP Subset** | 300 |
| - Four things that make it work | |
| - What you can build with just these | |
| **Toolchain Architecture** | 800 |
| - .starc source files | |
| - Python preprocessor (starc_pp.py) | |
| - Runtime library structure | |
|   - backend_sim (desktop) | |
|   - backend_hw (actual nodes) | |
| - Build pipeline | |
| - Why source-to-source not LLVM | |
| **The Preprocessor** | 400 |
| - Tokenizer approach | |
| - What gets rewritten | |
| - What stays plain C | |
| - Why regex dies here | |
| **Runtime Library** | 600 |
| - Mask stack management | |
| - nbr() over TDMA | |
| - reduce/scan tree algorithms | |
| - get/send routing | |
| - prs/pact with combining | |
| **Example Programs** | 800 |
| - Vector addition | |
| - Matrix multiply | |
| - Parallel prefix sum | |
| - Bitonic sort | |
| - Image convolution (NEWS) | |
| **Comparison to C* and *Lisp** | 400 |
| - What C* had | |
| - What *Lisp had | |
| - What StarC keeps | |
| - What StarC changes | |
| **Current Status** | 200 |
| - What works | |
| - What's stubbed | |
| - What's planned | |
| **The Point** | 200 |
| - Making the machine programmable | |
| - Not just operational | |
| **TOTAL** | **5,800** |

---

## GRAND TOTALS

| Page | Current Words |
|------|---------------|
| ThinkinMachine.md | 17,050 |
| 16NodeMachine.md | 2,300 |
| HypercubeTDMA.md | 2,800 |
| OrthoRoute.md | 2,200 |
| AG32.md | 4,200 |
| AG32SDK.md | 3,500 |
| CM1Implementation.md | 4,300 |
| StarC.md (optional) | 5,800 |
| **TOTAL** | **42,150 words** |
