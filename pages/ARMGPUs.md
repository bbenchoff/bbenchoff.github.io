---
layout: default


---

# Nvidia GPUs and ARM Single Board Computers

Compute, storage, and bandwidth. Pick any two and you can do something cool. Early multimedia PCs had powerful CPUs and plenty of local storage on CDs but no connection to the Internet. So we got Myst and Microsoft Encarta. Thin clients flip that equation with fast network pipes and decent CPUs, but no storage. Deep space probes have more than enough compute and storage, but trickle data back over slow radio links. This pattern shows up everywhere in computing history. If you have two of these resources, you can usually fake the third through clever engineering—compress harder, cache locally, stream dynamically, whatever it takes.

This applies to modern AI tasks. GPUs have the compute power for AI and the memory to store large models. Once a neural network is loaded, inference becomes almost entirely self-contained: the CPU sends prompts in, and the GPU sends tokens out. You only need kilobytes of bandwidth to tell an AI to recreate scenes from _No Country For Old Men_ in the style of Miyazaki.

If bandwidth requirements are so minimal during inference, why do we need massive, power-hungry CPUs paired with these GPUs? Why not just connect a datacenter-grade GPU to something tiny and efficient, like a Raspberry Pi? After all, the Pi would just be feeding small prompts to the GPU and passing responses back to users.

The short answer is that you can’t actually run a modern datacenter GPU with a Raspberry Pi. But with a few hacks, you can build something even more absurd.

## Why GPUs and Raspberry Pis Don't Mix

The idea of this project is to create an 'Edge AI' device -- something with a small System on Chip attached to a datacenter-class GPU. This is impossible for several reasons. Firstly, the BAR size. This Base Address Register is a memory window into which the GPU is mapped to the CPU. The Raspberry Pi 5 (BCM2712) has a maximum window of 256MB, while a V100 GPU asks for 16-32GB. The allocation fails, and the driver quits.

Secondly, the Pi does not have an IOMMU to remap memory from the GPU into the CPU's address space. The Pi does not have this; the PCIe block only manages physical addresses. Without this, the GPU driver cannot initialize.

Finally, the Pi only has a single lane PCIe Gen 3 x 1. This isn't necessarily a deal breaker. This entire project is predicated on the fact that PCIe bandwidth is underutilized in inference tasks. This does mean filling 32GB of GPU memory would take half a minute. Ideally I'd like at least Gen3 x 4.

I've tested this with the Pi CM5 and the Rockchip RK3588 without success. Every cheap Linux chip you’ve heard of — i.MX, Rockchip, Broadcom, Allwinner, Amlogic, Mediatek — runs into this. No big BARs. No 64-bit MMIO. No IOMMU. Set-top box chips and the silicon inside Chromebooks weren’t built to drive datacenter GPUs.

## The solution to the problem

<p class="callout-sidebar">
Other chips outside of the i.MX/Rockchip/Allwinner/Mediatek confederation were also investigated for this project. Marvell CN96xx modules exist but start at US $800 in volume and burn 45-65 W – double the LX2160A for the same core count. The Zynq UltraScale+ (specifically the $300 XCZU2CG) also has PCIe Gen 2 x 4 and needs eight 4 GiB windows to host a single 32 GiB BAR. The Zynq could theoretically run a 32GB GPU, but with zero headroom for anything bigger. The Ampere Altra, a device **specifically designed for this purpose** costs a small fortune, and I'm already reeling at the LX2160's BGA-1517 package. The NXP LS1046A was also investigated as an extremely cost-reduced version of this project compared to the LX2160A. The LS1046A does not work for this application. While the LS1043 and LS1046 chips have a full System MMU support in the Linux kernel, the only 64-bit BAR window tops-out at 4 GiB, so a V100’s 32 GiB BAR-1 cannot fit.
</p>
 
 While most off-the-shelf ARM chips can't run datacenter silicon, a few parts can. The **NXP Layerscape LX2160A** is one of them — a 16-core ARMv8 chip with full 64-bit address space, proper IOMMU, large MMIO windows, and up to x16 lanes of PCIe Gen 4. It's usually found in [5G Base Stations](https://www.sageran.com/products/4g5g-portfolio/unity-outdoor-integrated-base-station-2w.html), [telecom equipment that inexplicably has 'NSA' in the product name](https://www.nexcom.com/Products/network-and-communication-solutions/edge-cloud-solutions/sd-wan-appliance/sd-wan-appliance-nsa-6310) and a [VPX module used for defense and aerospace](https://www.curtisswrightds.com/products/computing/processors/3u-vpx/vpx3-1708-v3-1708). It's also one of the only ARM SoCs that can reliably enumerate and initialize a GPU like the A100.

To that end, I found an LX2160A single board computer on eBay. This board, a SolidRun LX2160A-CEX7 with ClearFog ITX breakout board, allowed me to test the hardware stack and provided me with a standard PCIe slot for testing various GPUs. For the OS, I installed Ubuntu 22.04 ARM64 with kernel 6.8‑rc7, adding the boot flags `pci=realloc,resizable_bar=1` to ensure the PCIe subsystem was properly configured. The board idled at just 11W without a GPU - impressively efficient for a 16-core system.

The ClearFog has a single x16 PCIe slot (electrically x8 but they chopped the end off the connector so an x16 card will fit, neat). This gives me options for GPU placement. The x16 slot will make it easier to use standard GPUs without adapters.