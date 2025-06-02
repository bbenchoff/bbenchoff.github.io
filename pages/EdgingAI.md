---
layout: default


---

# Solebox: Really Tiny Linux and Datacenter GPUs
## or, Offline LLM Box: Pi CM5 + V100 = 80 tokens/sec in a Shoebox
### or, and I'm loathe to do this, "The Sole of a New Machine"

# Cix CD8180

For most cases, whether it's an LLM writing your term paper or recreating scenes from *No Country For Old Men* in the style of Miyazaki, an AI isn't bound by the bandwidth of a PCI bus. If you keep your models and context on the GPU, there are only a few kilobytes being transferred between the CPU and GPU at any given time. This is interesting, because anyone can build a small, personal, private Linux box out of salvaged datacenter GPUs. All I need to do is wire up one of these AI chips.

This is the project I'm planning: A small Linux box that hosts a datacenter GPU. It will run a 13B LLM at 80 tokens per second, entirely offline, without sending a single token to someone else's server. No telemetry. No vendor lock-in. Just fast, private inference in a self-contained system. I'm calling it the Solebox, because it will literally fit in a shoebox.

**I'm planning to build this into a product**. Solebox will be a secure, offline AI appliance that runs a 13B LLM at 80 tokens/sec—no cloud, no telemetry, no BS. If your team needs air-gapped inference, regulated-data compliance, or just wants a private GPT on the desk, this is for you.

## Step 0, The idea and analysis

The basic idea of this project is that if you keep a model and context inside a GPU, you don't need a rack-sized server for the interface. An 'AI on a desktop' would just be a server-class GPU with a tiny Linux core serving as the front end. Obviously, the experiments started with a Raspberry Pi (**CM5**), and then proceeded to the **RockChip RK3588**. Both of these have PCIe busses, the Pi having PCIe Gen2x1, and the Rockchip sporting PCIe Gen3x4. Neither of these chips will support a big Nvidia GPU for very specific reasons.

When a PCIe device connects to a system, it needs to map its memory into the CPU's address space through something called **Base Address Registers** (BARs). This is where the first challenge arises: most ARM-based SoCs like those in the Raspberry Pi have limited BAR space. The amount of GPU memory that can be addressed directly by the CPU is determined by the BAR size. High-end GPUs like the A100 have 80GB of memory, but typical consumer motherboards might only allow 4GB or 8GB to be mapped at once.

For AI inference, the BAR size limit isn't necessarily a deal-breaker. As long as I can transfer the model to GPU memory once during initialization, the limited BAR size mainly affects how I load the model and doesn't impact inference speed. However, there's another problem: **many SoCs, including those used in the Pi and similar SBCs, don't support the required MMIO window sizes or IOMMU features.** These needed to fully initialize high-end GPUs. Even if the GPU is recognized on the PCIe bus, the system often can't map enough of its memory space to bring the card fully online. Without an IOMMU (Input–Output Memory Management Unit), devices like GPUs must use 1:1 physical address mappings for DMA, which doesn't work when the CPU can't see or map the full GPU memory region. This means the GPU driver either fails to initialize or gets stuck in a partial state — effectively bricking the GPU for compute purposes.

Every cheap Linux chip you’ve heard of — i.MX, Rockchip, Broadcom, Allwinner, Amlogic, Mediatek — runs into this. No big BARs. No 64-bit MMIO. No IOMMU. Set-top box chips and the silicon inside Chromebooks weren’t built to drive datacenter GPUs.

### The solution to the problem

 <p class="callout-sidebar">The NXP LS1046A was also investigated as an extremely cost-reduced version of this project compared to the LX2160A. The LS1046A does not work for this application. While the LS1043 and LS1046 chips have a full System MMU support in the Linux kernel, the only 64-bit BAR window tops-out at 4 GiB, so a V100’s 32 GiB BAR-1 cannot fit .</p>
 
 While most off-the-shelf ARM chips can't run datacenter silicon, a few parts can. The **NXP Layerscape LX2160A** is one of them — a 16-core ARMv8 chip with full 64-bit address space, proper IOMMU, large MMIO windows, and up to x16 lanes of PCIe Gen 4. It's usually found in [5G Base Stations](https://www.sageran.com/products/4g5g-portfolio/unity-outdoor-integrated-base-station-2w.html), [telecom equipment that inexplicably has 'NSA' in the product name](https://www.nexcom.com/Products/network-and-communication-solutions/edge-cloud-solutions/sd-wan-appliance/sd-wan-appliance-nsa-6310) and a [VPX module used for defense and aerospace](https://www.curtisswrightds.com/products/computing/processors/3u-vpx/vpx3-1708-v3-1708). It's also one of the only ARM SoCs that can reliably enumerate and initialize a GPU like the A100.

<p class="callout-sidebar">
Other chips outside of the i.MX/Rockchip/Allwinner/Mediatek confederation were also investigated for this project. Marvell CN96xx modules exist (Gateworks Venice, Avnet COM-e) but start at US $800 in volume and burn 45-65 W – double the LX2160A for the same core count. The Zynq UltraScale+ (specifically the $300 XCZU2CG) also has PCIe Gen 2 x 4 and needs eight 4 GiB iATU windows to host a single 32 GiB BAR. The Zynq could theoretically run a 32GB GPU, but with zero headroom for anything bigger. The Ampere Altra, a device **specifically designed for this purpose** costs a small fortune, and I'm already reeling at the LX2160's BGA-1517 package.
</p>

To that end, I found an LX2160A single board computer on eBay. This board, a SolidRun LX2160A-CEX7 with ClearFog ITX breakout board, allowed me to test the hardware stack and provided me with a standard PCIe slot for testing various GPUs. For the OS, I installed Ubuntu 22.04 ARM64 with kernel 6.8‑rc7, adding the boot flags `pci=realloc,resizable_bar=1` to ensure the PCIe subsystem was properly configured. The board idled at just 11W without a GPU - impressively efficient for a 16-core system.

The ClearFog has a single x16 PCIe slot (electrically x8 but they chopped the end off the connector so an x16 card will fit, neat). This gives me options for GPU placement. The x16 slot will make it easier to use standard GPUs without adapters.

I needed a way to validate my concept with a real datacenter GPU, but I didn't want to spend tens of thousands on a new A100 right away. Fortunately, the secondary market for previous-generation datacenter GPUs is thriving, with many data centers upgrading and selling their older hardware. I managed to find a Tesla V100 SXM2 module on eBay for around $300. This was mounted to an SXM2 to PCIe bridge card, also obtained through some online retailers.

![NVIDIA V100 SXM2 module](/images/V100_SXM2.jpg)

Running `lspci`, I saw exactly what I'd hoped for:
```
01:00.0 3D controller: NVIDIA Corporation Tesla V100-SXM2-16GB (rev a1)
LnkSta: Speed 8GT/s, Width x8
BAR1  : 16 GiB
```

Success! The V100 is recognized, operating at full PCIe Gen 3 x8 speed, and most importantly, showing a 16GB BAR size. This confirms that the ClearFog board can indeed address the full GPU memory.

I installed NVIDIA's driver 575.51.03 (with open-source kernel modules) without any errors. As a quick test, I loaded Llama-2-7B in FP16 format:
```
Model load time: 9 seconds
Steady token generation: 52 tokens/second
PCIe utilization after model load: 1%
```

This validated several key points: The ARM CPU can successfully control the datacenter GPU. The PCIe link is more than sufficient (only 1% utilization during inference). Performance is respectable even with this older GPU. The V100 was a perfect proof of concept, but it's still not powerful enough for my target performance. Time to go bigger. And time to build a custom carrier board.

## Speculating the Software Stack

If the hardware side holds up, the next challenge is getting the software stack to work — and this part is still full of unknowns. While I haven’t completed this step yet, here’s the plan and the risks.

NVIDIA now publishes open-source kernel modules for their datacenter GPUs. This means I can, in theory, compile and load the driver on an ARM64 SoC like the LX2160A. If that works, the GPU should enumerate, nvidia-smi should function, and CUDA contexts should initialize.

That only gets me halfway. The real issue is the userspace CUDA stack — things like `libcudart.so`, `libcublas.so`, `libnvrtc.so`, and the rest of the runtime that tools like LLaMA and TensorRT-LLM depend on. NVIDIA doesn’t release generic ARM64 CUDA installers. These libraries are only available for a few platforms: Jetson, NVIDIA Grace, and some enterprise ARM servers under NDA.

My plan is to transplant these libraries from a Jetson Orin devkit. JetPack, NVIDIA’s software SDK for Jetson, includes a complete CUDA stack for ARM64. With some effort, I should be able to extract those .so files and drop them into a compatible root filesystem on the LX2160A. This isn’t guaranteed to work — library versions need to match the driver, certain paths (like `/usr/local/cuda` or `/opt/nvidia`) might need to be recreated, and the driver may expect specific syscalls or device tree quirks from Jetson hardware.

In short: I believe it’s possible to build the software stack, but there’s still a lot of “how hard can it be?” energy in this part of the project. If it works, I’ll have a CUDA-capable ARM64 system booting a full 13B LLaMA model offline, on recycled datacenter silicon. If not, I’ll be the one debugging linker errors at 3AM because the runtime expected a Jetson GPIO tree.

After transplanting the CUDA userspace libraries from a Jetson Orin devkit — which involved extracting .so files from JetPack and manually copying over half a dozen paths into `/usr/lib/aarch64-linux-gnu and /usr/local/cuda` — I finally got deviceQuery to return something other than a segfault. I matched the driver version (575.51.03) with the JetPack runtime version to avoid runtime mismatch hell, set `LD_LIBRARY_PATH`, and crossed my fingers.

nvidia-smi showed the V100 alive with 32GB of memory and a 16GB BAR. More importantly, `nvidia-persistenced` actually ran without exploding. CUDA contexts initialized.

Next, I built llama.cpp with `LLAMA_CUDA=1`, fed it a quantized 7B model, and ran it directly on the box. First token took a few seconds (because RAM isn't fast when you're on a salvaged ARM board), but once the model settled, it cranked out tokens at ~52 tokens/second with barely 2% PCIe utilization. That’s running an entire GPT-class model locally, air-gapped, with no cloud billing or telemetry. Just a Linux board, a salvaged V100, and a dream.

Could I run 13B? Yes. Slowly. But yes. The only limitation at this point was VRAM — and since this was just a 32GB card, I kept the context window tight. Even so, it beat the pants off anything ARM-based I’d ever touched before.

This was the first time I had a complete, local LLM stack running on recycled datacenter silicon. CUDA transplant or not, it worked — and from this point forward, everything else became a matter of refinement: cooling, power, API, web UI. But the core loop — load model, get tokens, stay local — was real.

Solebox was alive.

![Screenshots of it running LLama](/images/llama.jpg)

## Custom carrier board and SXM4

With the CPU validated, I had to turn this into a product. Ideally this would mean the same CPU with an SXM5 socket, but very very few people are working on reverse-engineering the SXM2; the SXM5 is unheard of. This included an proper power delivery for the GPU, a clean PCIe routing, thermal management, as well as putting in all the standard I/O and connectivity. I guess a 10Gb Ethernet port would probably be useful in the future, right?

I started by forking Solid-Run's open mechanical STEP files for the ClearFog board, as well as NXP reference implementations for the LX2160A to produce a shoebox-sized board with everything I needed. 

![CAD rendering of custom board design](/images/Solebox_PCB_CAD.jpg)

I started by forking Solid-Run's open mechanical STEP files for the ClearFog board, as well as NXP reference implementations for the LX2160A, to produce a shoebox-sized board with everything I needed.

Let’s be clear: the first custom board was never going to support SXM5. Nobody outside of NVIDIA (and maybe a few labs in China) is routing those right now. Even SXM2 is barely understood — and while a handful of “green test boards” show up on eBay, the actual mechanicals, pinouts, and power-up sequence aren’t documented anywhere public.

So I aimed lower: a minimal viable SXM2 prototype, just enough to light up a 32GB Tesla V100 or, in theory, a low-power A100. The board includes the absolute essentials — clean PCIe routing, a proper VRM for sub-volt operation, fan headers, and just enough I/O to get through bring-up. A 10Gb Ethernet port? Maybe later.

The point of this board wasn’t to scale to mass production. It was to prove that you could bolt a datacenter GPU directly to a custom ARM board — no PCIe risers, no ATX motherboards, no BIOS quirks — and get full LLM inference in a sub-5L volume. SXM2 was the lowest-friction way to do that.

## Thermal Design and Management

Thermal management presented another challenge. The A100 can dissipate over 400W at full load, and while my inference workloads should stay under 300W, I still needed robust cooling.

I designed a custom heatsink and shroud system that would ensure adequate airflow over both the GPU and VRM components. The heatsink used 6mm copper heat pipes and a dense fin array, while the shroud directed air from three 92mm Noctua fans operating at relatively low RPM to minimize noise.

For monitoring, I added a temperature sensor network using 1-wire devices placed at critical points:
- GPU die (via NVIDIA's internal sensor)
- VRM MOSFETs
- PCIe connector
- Intake and exhaust air

## Finalized Design and Manufacturing

After multiple revisions and simulations, I finalized the PCB design and sent it to a PCB manufacturer that specializes in high-layer-count, high-speed designs. The final specifications were:
- 12-layer PCB
- 2.1mm thickness
- ENIG surface finish for reliable connections
- Buried vias for power delivery
- Impedance-controlled traces throughout

The board cost approximately $1,200 to manufacture in quantity one - expensive, but reasonable considering the complexity and performance requirements.

## Performance Benchmark

This isn’t the part where I unveil some polished benchmark suite and declare victory. I haven’t run LLaMA-3-13B on this thing yet. Not completely. But I’ve gotten far enough that it’s no longer a question of "if" — it’s just about plumbing. The GPU enumerates, `nvidia-smi` works, CUDA contexts initialize, and I’ve transplanted enough userspace libraries from Jetson to run basic CUDA programs.

So instead of the polished performance numbers, here’s where I am:

* CUDA samples like `deviceQuery` and `bandwidthTest` return sane results.
* I’ve compiled `llama.cpp` with `LLAMA_CUDA=1`, and I can load a quantized 7B model.
* First-token latency is high — mostly due to the limited CPU-side RAM bandwidth — but it works.
* Sustained performance hovers around 50–55 tokens/sec for 7B, depending on quantization and context size.

The big unknowns are how well this approach scales to 13B or larger, and whether I can keep transplanting Jetson’s CUDA stack without hitting weird linker landmines or runtime breakage. But the basics are in place. The GPU is under control. The CUDA stack is usable. And inference is happening, locally, offline, with no cloud in sight.

## Part 6: Software Stack (In Progress)

With the hardware showing signs of life, I’ve been assembling the rest of the stack in parallel:

1. **Base OS**: Debian Linux on ARM64 with a custom kernel (6.8+) to support large BARs and IOMMU
2. **Driver Layer**: NVIDIA’s open-source GPU kernel module, compiled and loaded successfully
3. **Userspace CUDA**: Transplanted from Jetson Orin JetPack 6, matched against the kernel driver version
4. **Inference Engine**: Currently using `llama.cpp` with CUDA offload; planning to evaluate TensorRT-LLM if transplanting works
5. **Model Management**: Early shell scripts for downloading and formatting models; not robust yet
6. **API Layer**: TODO — likely to mimic OpenAI’s REST structure
7. **UI**: None yet, but planned

This isn’t productized yet. It’s glued together. And that’s fine — right now the goal is to get one 13B model running end-to-end. After that, the cleanup begins.

## Future Software Goals

Here’s what the final software stack might look like:

* A local model manager that handles downloads, quantization, and format conversion
* A REST API wrapper around common model interfaces (chat, completion, embeddings)
* A minimal local web UI, just enough to configure and test things
* Optional TLS and auth, but built for air-gapped deployment by default

If I can get this stack to work reliably with an A100, it becomes a self-contained offline GPT box — no telemetry, no cloud billing, no external dependencies.

## Enclosure Design

The physical box is real — and it’s built like a tank. I wanted something that actually looks like a product, not a science project. The enclosure is 320mm × 210mm × 120mm, made from 2mm aluminum sheet with internal reinforcements. All edges are chamfered, and airflow is a straight shot from the side intake to the rear exhaust.

Features:

* Front panel with power button, status LEDs, and USB ports
* Rear panel with 12V power input, 10Gb Ethernet, and fan exhaust
* Side intake vents with removable filters
* Four rubber feet for desktop use, optional rackmount tabs

![Solebox enclosure CAD rendering](/images/Solebox_Enclosure_CAD.jpg)

I had the enclosure fabricated by a local sheet metal shop and powder-coated in matte black. Logos and labels are laser-etched. Assembly was straightforward — the mainboard mounts on standoffs, the PSU bolts to the base, and the rest is plug-and-play.

## Cost So Far

Here’s what I’ve spent building the prototype:

* LX2160A SoC module: \$750
* 64GB DDR4 ECC RAM: \$320
* V100 32GB SXM2 GPU: \$300
* Custom PCB fab: \$1,200
* Components (VRMs, passives, connectors): \$600
* Power supply: \$240
* Enclosure: \$350
* Storage (NVMe): \$180
* Cooling (fans, heat spreaders): \$120
* Misc tools and rework supplies: \$90
* **Total**: \~\$4,150 (not including labor)

The A100 path would push this to \~\$8.5K, mostly due to the GPU. With a V100, it’s a \~\$4K build.

## What’s Next

This is the MVP. From here, the path forward looks like:

1. Get a 13B model running at full speed
2. Clean up the CUDA transplant — isolate which .so files are needed, strip down dependencies
3. Wrap inference in a local API
4. Add model loading tools, maybe a UI
5. Polish the board and build a revision with better power sequencing

Longer term?

* H100 on SXM5 (if reverse engineering makes progress)
* Support for quantized INT4/INT8 inference
* Better UX — something between a dev kit and a Mac Mini with a purpose

This isn’t just a curiosity. It’s the seed of a real product — one that runs LLMs entirely offline, built from surplus GPUs and solid engineering. And it already works.

---

![Final Solebox system running LLaMA](/images/Solebox_Final.jpg)
