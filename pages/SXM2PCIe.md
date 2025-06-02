---
layout: default


---

# Reverse Engineering the Nvidia SXM2 Socket

For another project, it was necessary for me to acquire the pinout for Nvidia's [SXM2 socket](https://en.wikipedia.org/wiki/SXM_(socket)). This is a high-bandwidth mezzanine connector used in Nvidia datacenter GPUs. The SXM2 "standard" is quite old at the time of this writing (mid-2025), but details of this connector, including a pinout or even mechanical drawings, are still locked under NDAs at Nvidia's behest.

Therefore, to get the details on this pinout, I had to do it the old-fashioned way. I had to reverse engineer it.

The basis of this reverse engineering came from a PCIe SXM2 carrier board that can be found on the Chinese parts of the internet. My carrier board is effectively identical to [this carrier board purchased by l4rz](https://l4rz.net/running-nvidia-sxm-gpus-in-consumer-pcs/). It contains everything needed: an SXM2 footprint with a single Amphenol Meg-Array connector, power delivered by two 2x3 PCIe power headers, and not much else. There's some circuitry on the back for a fan PWM controller, but not much else. The NVLink connector -- the second Meg-Array connector -- is not populated, because this card is only meant for a single SXM2 module.

Because of the simplicity of this circuit, it really is __mostly__ only a matter of testing the continuity of all the pins with a multimeter. __Mostly__.

## The Pinout

This is, to the best of my ability, the pinout for an SXM2 module:

![Graphic of the SXM2 pinout](/images/SXM2Pinout.png)

## The Temperature Sensor

Apart from the can controller circuitry on the back of the card, there is one other small piece of active electronics on this card: a temperature sensor right behind the PCIe Meg-Array connector. This IC is unidentifiable from its markings (X06L), but its function can be inferred.

![The Temperature Sensor Chip](/images/TempSensorChip.jpg)
![Schematic of the Temperature Sensor](/images/TempSensorSch.png)


[back](../)
