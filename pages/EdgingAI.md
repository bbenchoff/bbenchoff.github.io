---
layout: default


---

# Working With Datacenter GPUs and a Raspberry Pi
## or, Building My Own AI Edge Device

I'm reasonably impressed with the state of AI in 2025, but the wizened computer nerd in me hates that everything is cloud-based and reliant on an Internet connection. The 1337 haxxor hates that all the data goes off into a Microsoft datacenter. And the electrical engineer part of me wants to fix this.

For most cases, whether it's an LLM writing your term paper or trying to recreate scenes from *No Country For Old Men* in the style of Miyazaki, AI is not bound by the bandwith of the bus the GPU is sitting on. If you keep your models and context on the GPU, there are only a few kilobytes being transferred between the CPU and GPU at any given time. This is interesting, because anyone can build a small, personal, private Linux box out of bare chips. All I need to do is connect a GPU salvaged from a datacenter and wire it up.

This is the project: it's a small Linux box, a massive GPU, all wrapped into a small package that sits on your desk. It's an AI compute appliance that runs entirely offline, spits out 80–90 tokens/sec from a 13B LLM, and fits in a shoebox. It doesn’t phone home. It doesn’t leak data. And it opens the door to private AI. Call it the ShoeboxGPT.



[back](../)
