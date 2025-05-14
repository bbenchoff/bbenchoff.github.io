---
layout: default


---

# Solebox: Really Tiny Linux and Datacenter GPUs
## or, I Built an Offline LLM Box: Pi CM5 + A100 = 80 tokens/sec in a Shoebox
### or, and I'm loathe to do this, "The Sole of a New Machine"

For most cases, whether it's an LLM writing your term paper or recreating scenes from *No Country For Old Men* in the style of Miyazaki, an AI isn't bound by the bandwidth of a PCI bus. If you keep your models and context on the GPU, there are only a few kilobytes being transferred between the CPU and GPU at any given time. This is interesting, because anyone can build a small, personal, private Linux box out of salvaged datacenter GPUs. All I needed to do is wire up one of these AI chips.

This is the project: It’s a small Linux box. It hosts a datacenter GPU. It runs a 13B LLM at 80 tokens per second, entirely offline, without sending a single token to someone else’s server. No telemetry. No vendor lock-in. Just fast, private inference in a self-contained system. Call it the Solebox, because it does more than fit in a shoebox.

**I'm building this into a product**. Solebox is a secure, offline AI appliance that runs a 13B LLM at 80 tokens/sec—no cloud, no telemetry, no BS. If your team needs air-gapped inference, regulated-data compliance, or just wants a private GPT on the desk, get in touch or star the repo to follow along.






[back](../)
