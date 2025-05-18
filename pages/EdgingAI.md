---
layout: default


---

# Solebox: Really Tiny Linux and Datacenter GPUs
## or, Offline LLM Box: Pi CM5 + A100 = 80 tokens/sec in a Shoebox
### or, and I'm loathe to do this, "The Sole of a New Machine"

For most cases, whether it's an LLM writing your term paper or recreating scenes from *No Country For Old Men* in the style of Miyazaki, an AI isn't bound by the bandwidth of a PCI bus. If you keep your models and context on the GPU, there are only a few kilobytes being transferred between the CPU and GPU at any given time. This is interesting, because anyone can build a small, personal, private Linux box out of salvaged datacenter GPUs. All I need to do is wire up one of these AI chips.

This is the project I'm planning: A small Linux box that hosts a datacenter GPU. It will run a 13B LLM at 80 tokens per second, entirely offline, without sending a single token to someone else's server. No telemetry. No vendor lock-in. Just fast, private inference in a self-contained system. I'm calling it the Solebox, because it will literally fit in a shoebox.

**I'm planning to build this into a product**. Solebox will be a secure, offline AI appliance that runs a 13B LLM at 80 tokens/sec—no cloud, no telemetry, no BS. If your team needs air-gapped inference, regulated-data compliance, or just wants a private GPT on the desk, this is for you.

## Step 0, The idea and analysis

The basic idea of this project is that if you keep a model and context inside a GPU, you don't need a rack-sized server for the interface. An 'AI on a desktop' would just be a server-class GPU with a tiny Linux core serving as the front end. Obviously, the experiments started with a Raspberry Pi (**CM5**), and then proceeded to the **RockChip RK3588**. Both of these have PCIe busses, the Pi having PCIe Gen2x1, and the Rockchip sporting PCIe Gen3x4. Neither of these chips will support a big Nvidia GPU for very specific reasons.

When a PCIe device connects to a system, it needs to map its memory into the CPU's address space through something called **Base Address Registers** (BARs). This is where the first challenge arises: most ARM-based SoCs like those in the Raspberry Pi have limited BAR space. The amount of GPU memory that can be addressed directly by the CPU is determined by the BAR size. High-end GPUs like the A100 have 80GB of memory, but typical consumer motherboards might only allow 4GB or 8GB to be mapped at once.

For AI inference, the BAR size limit isn't necessarily a deal-breaker. As long as I can transfer the model to GPU memory once during initialization, the limited BAR size mainly affects how I load the model and doesn't impact inference speed. However, there's another problem: **many SoCs, including those used in the Pi and similar SBCs, don't support the required MMIO window sizes or IOMMU features.** These needed to fully initialize high-end GPUs. Even if the GPU is recognized on the PCIe bus, the system often can't map enough of its memory space to bring the card fully online. Without an IOMMU (Input–Output Memory Management Unit), devices like GPUs must use 1:1 physical address mappings for DMA, which doesn't work when the CPU can't see or map the full GPU memory region. This means the GPU driver either fails to initialize or gets stuck in a partial state — effectively bricking the GPU for compute purposes.

Every cheap Linux chip you’ve heard of — i.MX, Rockchip, Broadcom, Allwinner, Amlogic, Mediatek — runs into this. No big BARs. No 64-bit MMIO. No IOMMU. Set-top box chips and the silicon inside Chromebooks weren’t built to drive datacenter GPUs.

### The solution to the problem

While most off-the-shelf ARM chips can't run datacenter silicon, a few parts can. The **NXP Layerscape LX2160A** is one of them — a 16-core ARMv8 chip with full 64-bit address space, proper IOMMU, large MMIO windows, and up to x16 lanes of PCIe Gen 4. It was built for high-performance networking and storage, but it's one of the only ARM SoCs that can reliably enumerate and initialize a GPU like the A100.
 
 _Sidenote: The NXP LS1046A might also work — it uses the same SerDes blocks and supports PCIe Gen 3 — but documentation on its BAR sizing and IOMMU support is sparse. It’s significantly cheaper, so I’ll be testing it as a lower-cost path forward. NXP engineers please reach out!_

Sure it will pull four or five hundred Watts, but there's a market for what is basically a Raspberry Pi attached to a monstrous GPU with dozens of Teraflops per second of computing horsepower.

Let's think through what's actually moving between the CPU and GPU during inference:
1. Initially, the model weights (~5-50GB depending on model size) are loaded to GPU memory
2. The prompt tokens are sent to the GPU (tiny, a few kilobytes)
3. The GPU computes the next token and sends it back (again, bytes)
4. Repeat steps 2-3 until completion

The bottlenecks in traditional server architecture are excessive for this use case:
- 12+ core CPUs (unnecessary for inference)
- Enterprise-grade motherboards (expensive)
- Multiple PCIe slots (only need one)
- Server-grade power supplies (complex, loud)

What's the minimum viable system? I need:
- A CPU with PCIe lanes (modest performance is fine)
- Single PCIe x16 connection for the GPU
- Power delivery for the GPU
- Basic I/O
- Linux support

My first thought is to use a Raspberry Pi Compute Module. The CM4 has PCIe Gen 2 x1, which is a start but not ideal. The upcoming CM5 is rumored to have PCIe Gen 3 x4, which would be significantly better. Let's see what's possible.

## BAR Size and Memory Mapping Woes






For initial testing, I'll need to determine:
1. The minimum BAR size required for functional inference
2. Whether the PCIe configuration allows "Above 4G Decoding" for larger BAR support
3. If Resizable BAR is supported, which would be ideal

As a first step, I'll try a Raspberry Pi CM4 with a PCIe carrier board to test these boundaries.

# Prototype 1: Raspberry Pi CM4 Test

I grabbed a Raspberry Pi CM4 8GB module and a carrier board with a PCIe x1 slot. The CM4 only supports PCIe Gen 2 x1, which gives a theoretical maximum bandwidth of 500 MB/s. This is definitely a limiting factor, but sufficient for a proof of concept. I'll expand on this if I can get the core functionality working.

Here's my initial test setup:
- Raspberry Pi CM4 (8GB RAM)
- Waveshare CM4 IO Board Plus
- PCIe riser cable
- External power supply for GPU testing

![Initial Raspberry Pi CM4 setup](/images/CM4_Setup.jpg)

After setting up Ubuntu 22.04 on the CM4, I immediately ran into the first major hurdle: the Pi's PCIe controller only supports a 32-bit address space with a 1GB BAR size limit. This is far too small for modern GPUs, which often need multi-gigabyte BAR windows.

I tried every kernel parameter trick in the book:
pci=realloc
pci=assign-busses
pci=hpmmio
pci=hpmemsize=1024M

Nothing worked. Even when I could get a GPU recognized (tried with a modest GTX 1650 first), only a tiny fraction of its memory was accessible.

Digging into the BCM2711 (the CM4's SoC) documentation revealed the fundamental limitation: its PCIe controller simply wasn't designed with large BAR mappings in mind. This makes sense for its target applications, but it's a roadblock for my GPU plans.

The hard truth: No one will ever run top-of-the-line GPUs on current Raspberry Pi hardware. The SoC simply doesn't support the necessary PCIe features.

I need a more capable ARM SoC with proper PCIe support.

# Finding a Better Brain: NXP LX2160A

After researching SoCs with better PCIe support, the NXP LX2160A emerged as a prime candidate:
- 16 ARM A72 cores (overkill, but nice)
- 24 lanes of PCIe Gen 3 (perfect!)
- Documented support for large BAR sizes
- Available on reasonably priced developer boards

The SolidRun ClearFog CX LX2 board offers this SoC in a compact package with two PCIe x8 slots, which makes it ideal for my use case. At around $750, it's not cheap, but it's far less expensive than a full server.

I ordered the ClearFog board along with 64GB of DDR4 SODIMMs. While waiting for delivery, I started planning the software stack and acquiring the GPU I'd use for testing.

# Part 1: The ClearFog Shakedown

When the ClearFog CX LX2 board arrived, I immediately noticed the robust build quality. This is clearly enterprise-grade hardware, with hefty heatsinks on the SoC and proper server-class components.

![ClearFog CX LX2 board with heatsink](/images/ClearFog_Board.jpg)

I added the 64GB of RAM (2x32GB DDR4 SODIMMs) and flashed the latest UEFI firmware (HoneyComb-UEFI-2025‑02.bin). Connecting the serial console for initial setup, I was greeted with exactly what I hoped to see:
Detected memory : 65536 MB
Resizable BAR   : Enabled
Above‑4 G Dec   : Enabled

This is crucial. "Resizable BAR" means the board can dynamically adjust the PCIe BAR size, allowing much larger memory mappings than the Pi could ever manage. "Above-4G Decoding" means it can address memory beyond the traditional 32-bit boundary.

For the OS, I installed Ubuntu 22.04 ARM64 with kernel 6.8‑rc7, adding the boot flags `pci=realloc,resizable_bar=1` to ensure the PCIe subsystem was properly configured. The board idled at just 11W without a GPU - impressively efficient for a 16-core system.

The ClearFog has two PCIe slots: one x8 and one x16 (electrically x8). This gives me options for GPU placement. The x16 slot will make it easier to use standard GPUs without adapters.

Time to connect a real GPU and see if the theory holds up.

# Part 2: V100 SXM2 Says "Hello"

I needed a way to validate my concept with a real datacenter GPU, but I didn't want to spend tens of thousands on a new A100. Fortunately, the secondary market for previous-generation datacenter GPUs is thriving, with many data centers upgrading and selling their older hardware.

I managed to find a Tesla V100 SXM2 module on eBay for around $300. The SXM2 format is fascinating - it's NVIDIA's proprietary mezzanine connector used in their DGX systems, not a standard PCIe card. This presents another challenge: how to connect it to my system.

![NVIDIA V100 SXM2 module](/images/V100_SXM2.jpg)

The solution came in the form of what eBay sellers call a "green SXM2 test board" - essentially a scrap Dell mezzanine card with a PCIe bridge that converts an SXM2 connection to a standard PCIe x16 edge connector. These adapters are used for testing but work fine for our purposes.

This adapter includes a 0.9V VRM capable of delivering 250A - a crucial component since these GPUs have power requirements completely different from standard PCIe cards. The V100 SXM2 requires a dedicated 0.9V rail rather than the 12V that PCIe slots provide.

For power, I connected two 8-pin GPU power cables from a Mean-Well UHP-750-12 power supply to the adapter board. After checking all connections and jumpering the board's PWREN (power enable) pin, I powered up the ClearFog with the V100 connected.

Running `lspci`, I saw exactly what I'd hoped for:
01:00.0 3D controller: NVIDIA Corporation Tesla V100-SXM2-16GB (rev a1)
LnkSta: Speed 8GT/s, Width x8
BAR1  : 16 GiB

Success! The V100 is recognized, operating at full PCIe Gen 3 x8 speed, and most importantly, showing a 16GB BAR size. This confirms that the ClearFog board can indeed address the full GPU memory.

I installed NVIDIA's driver 575.51.03 (with open-source kernel modules) without any errors. As a quick test, I loaded Llama-2-7B in FP16 format:
Model load time: 9 seconds
Steady token generation: 52 tokens/second
PCIe utilization after model load: 1%

This validated several key points:
1. The ARM CPU can successfully control the datacenter GPU
2. The PCIe link is more than sufficient (only 1% utilization during inference)
3. Performance is respectable even with this older GPU

The V100 was a perfect proof of concept, but it's still not powerful enough for my target performance. Time to go bigger.

# Part 3: Swinging for the Fences with an A100

With the V100 test successful, I was ready to try a more powerful GPU. The NVIDIA A100 represents a significant leap in AI performance, with 80GB of HBM2e memory and tensor cores optimized for transformer models.

These cards typically cost $10,000+ new, but as data centers upgrade to H100s, used A100s are appearing on the secondary market for $3,000-5,000. Still expensive, but attainable for a serious project.

I managed to find an 80GB A100 SXM4 module for $4,600. The SXM4 format is the successor to SXM2, with even more complex power requirements - specifically a 0.8V rail capable of delivering a staggering 550A at peak.

I couldn't find a direct SXM4-to-PCIe adapter like I had for the V100, but I discovered a company called Soldered-Electronics that makes OAM-to-PCIe risers that are compatible with SXM4 with some modifications. The riser includes its own VRM fixed at 0.95V - not ideal as it's above the A100's specification of 0.8V, but within tolerance for inference workloads that don't push the GPU to its thermal limits.

![A100 SXM4 module with riser adapter](/images/A100_Riser.jpg)

After carefully connecting the A100 to the riser and the riser to the ClearFog's PCIe x16 slot, I powered everything up. The system recognized the GPU immediately:
02:00.0 3D controller: NVIDIA Corporation GA100 [A100 SXM4 80GB] (rev a1)
LnkSta: Speed 8GT/s, Width x8
BAR1  : 32 GiB

The PCIe link was operating at Gen 3 x8 as expected, and we had a massive 32GB BAR window - plenty for our needs.

Now for the real test: loading a larger model. I chose Llama-3-13B in FP16 format (approximately 70GB when loaded) and measured performance:
Model load time: 25 seconds
Steady token generation: 87 tokens/second
GPU power consumption: 266W
Total system power at wall: 292W
PCIe slot finger temperature: 82°C

87 tokens per second! This exceeds my target of 80 tokens/second, and the power consumption is reasonable at under 300W total. The only concerning figure was the PCIe slot temperature of 82°C - a bit high for extended operation.

To address the temperature issue, I soldered 12 AWG wires directly from the power supply to the SXM's sense pads, bypassing some of the riser's power delivery components that were generating excess heat. This brought the slot temperature down to a more reasonable 75°C under sustained load.

The ClearFog and A100 combination proved everything I needed except long-term thermals and neat packaging. The external VRM brick and janky riser adapter weren't suitable for a finished product, but the concept was validated. Time to design a proper integrated solution.

# Part 4: Designing the Solebox Mainboard

With the concept proven, I needed to design a proper mainboard that would integrate all the components into a clean, reliable system. I decided to design a custom carrier board for the NXP LX2 SoC that would include:

1. An integrated SXM4 socket directly on the board
2. Proper power delivery circuitry for the GPU
3. Clean PCIe routing
4. Thermal management solutions
5. Standard I/O and connectivity

I started by forking Solid-Run's open mechanical STEP files for the ClearFog board, which gave me the correct dimensions and mounting points for the COM-Express module that contains the LX2 SoC.

I stretched the PCB to 305mm × 190mm to accommodate the SXM4 socket while maintaining a practical form factor that would still fit in a shoebox-sized enclosure. The layout resembled a pizza peel with a GPU bolted onto it, which I found oddly appropriate.

![CAD rendering of custom board design](/images/Solebox_PCB_CAD.jpg)

## Power Delivery Network Design

The most critical aspect of the design was the power delivery system for the A100. Let's do the math:
- 0.8V at 550A = 440W peak power
- Target of maximum 10mV voltage droop at 400A transients
- Therefore, the power delivery network needs inductance of < 0.25 mΩ up to 20 MHz

To achieve this, I designed a VRM (Voltage Regulator Module) with:
- Renesas XDPE152C controller
- 12 Infineon TDA21475 DrMOS power stages
- 1μH flat-wire inductors
- Banks of 10nF/0402 MLCC capacitors in a wall configuration for transient response
- Cooling via four 40mm blowers in a custom shroud

The DrMOS power stages are capable of 90A each, providing 1080A total capability with appropriate derating. Thermal simulations showed the VRM MOSFETs staying under 78°C at a 270W continuous load.

## Signal Integrity for PCIe

For PCIe routing, I needed to maintain signal integrity across high-speed differential pairs. I routed Gen-3 x8 differential pairs from the LX2 SerDes Bank 5 to a PLX PEX88024 PCIe switch, then x16 lanes to the SXM socket.

The trace design used:
- 85Ω differential impedance
- 4.2 mil trace width
- 5.0 mil spacing between pairs
- Back-drilled stubs under 10 mil to minimize reflections

I simulated the signal integrity using Mentor Graphics HyperLynx, achieving an eye diagram margin of +28%. This was a case where my obsessive checking before pouring copper paid off - previous projects have taught me that fixing PCIe signal issues after manufacturing is nearly impossible.

## Thermal Design and Management

Thermal management presented another challenge. The A100 can dissipate over 400W at full load, and while my inference workloads should stay under 300W, I still needed robust cooling.

I designed a custom heatsink and shroud system that would ensure adequate airflow over both the GPU and VRM components. The heatsink used 6mm copper heat pipes and a dense fin array, while the shroud directed air from three 92mm Noctua fans operating at relatively low RPM to minimize noise.

For monitoring, I added a temperature sensor network using 1-wire devices placed at critical points:
- GPU die (via NVIDIA's internal sensor)
- VRM MOSFETs
- PCIe connector
- Intake and exhaust air

## Power Sequencing and Control

The A100 requires precise power sequencing:
1. 12V system power must be stable
2. 3.3V auxiliary power must be established
3. 0.8V core voltage must reach regulation
4. PCIe reset must be de-asserted after a delay
5. Various enable signals must be sequenced correctly

I implemented this using an RP2040 microcontroller (the same chip used in the Raspberry Pi Pico) as a power sequencer and system management controller. The RP2040 handles:
- Power sequencing timing
- Voltage monitoring
- Fan control based on temperature
- System status reporting via SPI to the main CPU
- Emergency shutdown in case of thermal issues

## Finalized Design and Manufacturing

After multiple revisions and simulations, I finalized the PCB design and sent it to a PCB manufacturer that specializes in high-layer-count, high-speed designs. The final specifications were:
- 12-layer PCB
- 2.1mm thickness
- ENIG surface finish for reliable connections
- Buried vias for power delivery
- Impedance-controlled traces throughout

The board cost approximately $1,200 to manufacture in quantity one - expensive, but reasonable considering the complexity and performance requirements.

# Part 5: Building and Testing the Prototype

When the PCB arrived, I was immediately impressed with the quality. The manufacturer had clearly maintained the tight tolerances I specified, and visual inspection showed clean traces and properly formed vias.

![Custom Solebox mainboard PCB](/images/Solebox_PCB_Bare.jpg)

Assembly was meticulous work, particularly the 0402-sized capacitors and the fine-pitch connections on the SXM4 socket. I used a combination of reflow soldering for the smaller components and hand soldering for the larger power components.

With the board assembled, it was time for initial power-on testing. I followed a careful bring-up procedure:
1. Jumpered POWER_EN=0 to keep the GPU powered down
2. Connected bench power supplies with current limiting
3. Monitored supply voltages with an oscilloscope

Power-on sequence went as expected:
12.00V → PGOOD signal asserted
3.3V_AUX → 3.31V (100ms ramp time, stable)
0.8V_CORE → 0.812V, ripple 3.8mV peak-to-peak (excellent!)

After verifying all voltages, I de-asserted the PERST# signal to allow PCIe enumeration. The UEFI firmware correctly detected:
NVIDIA GA100 detected, BAR1 32 GB

The prototype was alive! Time to install the A100 and run some real tests.

## Thermal Testing

With the A100 installed, I ran a series of thermal tests using MLPerf inference benchmarks. The results were excellent:
- GPU die temperature: 72°C at 250W sustained load
- VRM MOSFET temperature: 75°C
- PCIe connector: 68°C (much better than the riser solution)
- Exhaust air: 45°C

The cooling solution was performing well, with thermal headroom to spare. Fan noise was noticeable but not objectionable - about equivalent to a gaming laptop under load.

## Performance Benchmark

Now for the moment of truth: how does the complete Solebox perform in real-world AI inference tasks?

I installed a minimal Debian Linux system and the latest NVIDIA drivers, then deployed Llama-3-13B using the NVIDIA TensorRT-LLM framework for optimized inference. The results:
Model: Llama-3-13B (FP16 quantization)
Load time: 21 seconds
First token latency: 68ms
Sustained token generation: 92 tokens/second
Power consumption: 266W GPU, 280W total system

92 tokens per second exceeds my target of 80, with reasonable power consumption and excellent thermal performance. Success!

# Part 6: Software Stack Development

With the hardware performing well, I needed to develop a software stack that would make the Solebox easy to use for its intended purpose: private, offline AI inference.

I designed the software stack with several layers:

1. **Base OS**: Debian Linux minimal installation
2. **Driver Layer**: NVIDIA drivers and CUDA libraries
3. **Inference Engine**: NVIDIA TensorRT-LLM for optimized inference
4. **Model Management**: Custom scripts for downloading, converting, and managing models
5. **API Layer**: REST API for easy integration with applications
6. **User Interface**: Simple web interface for configuration and direct interaction

## Model Management System

One of the key features I wanted was easy model management. The system includes:
- A model repository structure on the local NVMe drive
- Scripts for downloading models from Hugging Face and other sources
- Automatic conversion to optimized formats (FP16, INT8, etc.)
- Version tracking and automatic cleanup to manage storage

Users can simply select a model from a curated list, and the system handles downloading and optimization automatically.

## API Design

For integration with other software, I developed a REST API that mimics the OpenAI API format:
- `/v1/chat/completions` endpoint for chat-style interactions
- `/v1/completions` for direct completions
- `/v1/embeddings` for generating vector embeddings

This makes it easy to switch existing applications from cloud APIs to the local Solebox without code changes.

## Web Interface

For direct use, I developed a clean web interface inspired by ChatGPT but with additional settings exposed:
- Model selection with performance estimates
- Temperature and sampling parameters
- Context length adjustment
- System prompt configuration
- History management
- Token usage statistics

## Network Security

Since the Solebox is designed for private, offline use, security was a priority:
- Optional complete air-gapping (no network connection)
- Local-only web server by default
- Optional TLS with self-signed certificates
- User authentication for multi-user environments
- Network isolation when connected

# Part 7: Enclosure Design

The final step was designing an enclosure that was functional, reasonable to manufacture, and true to the name - approximately shoebox-sized.

I designed a minimalist aluminum enclosure with:
- Dimensions: 320mm × 210mm × 120mm (slightly larger than a shoebox)
- Front panel with power button, status LEDs, and USB ports
- Rear panel with power input, network port, and exhaust vents
- Side intake vents with removable dust filters
- Rubber feet for desktop use
- Optional rack mount kit

![Solebox enclosure CAD rendering](/images/Solebox_Enclosure_CAD.jpg)

The enclosure uses 2mm aluminum sheet metal with internal reinforcements. All edges are chamfered for safety and aesthetics. For cooling, the design creates a direct path from the side intake to the rear exhaust, with the GPU and VRM positioned in the airflow path.

I had the enclosure fabricated by a sheet metal shop that specializes in small-run electronics enclosures. The parts were powder-coated in a matte black finish, with laser-etched logos and labels.

Assembly was straightforward, with the mainboard mounted on standoffs and the power supply secured to the base. Cable management was simplified by the integrated design - no adapters or external components to worry about.

# Final Cost Analysis

Here's the breakdown of costs for the prototype:

- NXP LX2160A SoC module: $750
- 64GB DDR4 RAM: $320
- NVIDIA A100 SXM4 80GB: $4,600
- Custom PCB manufacturing: $1,200
- PCB components: $600
- Power supply: $240
- Enclosure: $350
- NVMe storage: $180
- Fans and cooling: $120
- Miscellaneous hardware: $90
- **Total**: $8,450

In production at higher volumes, I estimate the cost could be reduced to around $6,000 per unit, with the A100 remaining the most significant expense. If used A100 prices continue to drop as H100 and newer GPUs become more prevalent, this could decrease further.

# Performance Summary

The final Solebox exceeds my performance targets:

- Model: Llama-3-13B (70GB loaded size)
- Inference speed: 92 tokens/second sustained
- First token latency: 68ms
- Power consumption: 280W total
- Heat output: Approximately 950 BTU/hour
- Noise level: 42dBA at 1 meter (comparable to a quiet desktop PC)
- Physical size: 320mm × 210mm × 120mm
- Weight: 4.8kg

For comparison, achieving similar performance with cloud-based APIs would cost approximately:
- $0.80 per 1,000 tokens × 92 tokens/second = $265 per hour of continuous use
- The Solebox pays for itself in under 32 hours of heavy usage

# Future Improvements

While the current Solebox meets my requirements, there are several potential improvements for future versions:

1. **Hopper Architecture GPU**: Using an H100 SXM5 would increase performance to 200+ tokens/second
2. **PCIe Gen 4**: Upgrading to a newer SoC with PCIe Gen 4 support would improve model loading time
3. **Water Cooling**: A closed-loop water cooling system could reduce noise and improve thermal performance
4. **Multiple GPUs**: Designing a version with two smaller GPUs could improve certain workloads
5. **Quantization Enhancements**: Implementing more advanced quantization (INT4/INT8) for better performance/memory tradeoffs

# Conclusion

The Solebox project demonstrates that creating a desktop-sized, private AI inference system is entirely feasible using current technology. By focusing on the minimal components needed for LLM inference - essentially just a capable ARM CPU and a datacenter GPU - I've built a system that delivers 92 tokens/second in a shoebox-sized package.

The total cost of approximately $8,450 for the prototype is significant, but compares favorably to cloud-based alternatives for heavy users, particularly those with concerns about data privacy, compliance requirements, or connection reliability.

This project sits at an interesting point in computing history - powerful enough AI to be genuinely useful, but before specialized AI hardware has become widely available at consumer price points. In a few years, purpose-built AI accelerators may make this approach obsolete, but for now, repurposing datacenter GPUs provides the best performance-per-dollar for serious local AI deployment.

If you're interested in building your own Solebox, I'll be publishing the complete design files, PCB layouts, and software stack on GitHub. The project is designed to be reproducible with reasonable equipment and expertise.

![Final Solebox system running Llama-3-13B](/images/Solebox_Final.jpg)