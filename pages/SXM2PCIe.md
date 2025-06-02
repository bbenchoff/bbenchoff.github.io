---
layout: default


---

# Reverse Engineering the Nvidia SXM2 Socket

<p class="callout-sidebar">
<strong>LEGAL:</strong><br>
Nvidia’s SXM documentation is only released under mutual NDA. The pinout shown here was derived solely from publicly purchased hardware and non-destructive continuity probing, which is lawful reverse-engineering under U.S. and many other jurisdictions’ “fair use” and interoperability exemptions.
</p>

For another project, it was necessary for me to acquire the pinout for Nvidia's [SXM2 socket](https://en.wikipedia.org/wiki/SXM_(socket)). This is a high-bandwidth mezzanine connector used in Nvidia datacenter GPUs. The SXM2 "standard" is quite old at the time of this writing (mid-2025), but details of this connector, including a pinout or even mechanical drawings, are still locked under NDAs at Nvidia's behest.

Therefore, to get the details on this pinout, I had to do it the old-fashioned way. I had to reverse engineer it.

The basis of this reverse engineering came from a PCIe SXM2 carrier board that can be found on the Chinese parts of the internet. My carrier board is effectively identical to [this carrier board purchased by l4rz](https://l4rz.net/running-nvidia-sxm-gpus-in-consumer-pcs/). It contains everything needed: an SXM2 footprint with a single Amphenol Meg-Array connector, power delivered by two 2x3 PCIe power headers, and not much else. There's some circuitry on the back for a fan PWM controller, but not much else. The NVLink connector -- the second Meg-Array connector -- is not populated, because this card is only meant for a single SXM2 module.

Because of the simplicity of this circuit, it really is __mostly__ only a matter of testing the continuity of all the pins with a multimeter. __Mostly__.

## The Pinout

This is, to the best of my ability, the pinout for an SXM2 module:

![Graphic of the SXM2 pinout](/images/SXM2Pinout.png)

Also in table format:

|Row|A|B|C|D|E|F|G|H|J|K|
|---|---|---|---|---|---|---|---|---|---|---|
|1|GND|PERp1|GND|PERp2|GND|GND|PETp0|GND|PETp2|GND|
|2|PERp0|PERn1|PERp3|PERn2|GND|GND|PETn0|PETp1|PETn2|PETp3|
|3|PERn0|GND|PERn3|GND|GND|GND|GND|PETn1|GND|PETn3|
|4|GND|PERp4|GND|PERp5|GND|GND|PETp4|GND|PETp5|GND|
|5|PERp7|PERn4|PERp6|PERn5|GND|GND|PETn4|PETp7|PETn5|PETp6|
|6|PERn7|GND|PERn6|GND|GND|GND|GND|PETn7|GND|PETn6|
|7|GND|GND|GND|GND|REFCLK+|REFCLK-|GND|GND|GND|GND|
|8|PERp8|GND|PERp10|GND|GND|GND|GND|PETp9|GND|PETp10|
|9|PERn8|PERp9|PERn10|PERp11|GND|GND|PETp8|PETn9|PETp11|PETn10|
|10|GND|PERn9|GND|PERn11|GND|GND|PETn8|GND|PETn11|GND|
|11|PERp12|GND|PERp13|GND|GND|GND|GND|PETp12|GND|PETp13|
|12|PERn12|PERp15|PERn13|PERp14|GND|GND|PETp15|PETn12|PETp14|PETn13|
|13|GND|PERn15|GND|PERn14|GND|GND|PETn15|GND|PETn14|GND|
|14|GND|GND|GND|GND|GND|GND|GND|GND|GND|GND|
|15||GND||GND|GND|GND|GND||GND|
|16|||GND|GND|||
|17|GND||GND||GND|GND||GND||GND|
|18||GND||GND|||GND||GND|U1/Pin3|
|19|GND|GND|GND|GND|GND|GND|GND||GND|U1/Pin1|
|20|
|21|GND|GND|GND|GND|GND|GND|GND|GND|GND|GND|
|22|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|23|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|24|GND|GND|GND|GND|GND|GND|GND|GND|GND|GND|
|25|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|26|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|27|GND|GND|GND|GND|GND|GND|GND|GND|GND|GND|
|28|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|29|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|30|GND|GND|GND|GND|GND|GND|GND|GND|GND|GND|
|31|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|32|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|33|GND|GND|GND|GND|GND|GND|GND|GND|GND|GND|
|34|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|35|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|36|GND|GND|GND|GND|GND|GND|GND|GND|GND|GND|
|37|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|38|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|
|39|GND|GND|GND|GND|GND|GND|GND|GND|GND|GND|
|40|12V|12V|12V|12V|12V|12V|12V|12V|12V|12V|


## The Temperature Sensor

Apart from the fan controller circuitry on the back of the card, there is one other small piece of active electronics on this card: a temperature sensor right behind the PCIe Meg-Array connector. 

![The Temperature Sensor Chip](/images/TempSensorChip.jpg)
![Schematic of the Temperature Sensor](/images/TempSensorSch.png)

The broad strokes of this device is an SOT-23-3 package, with pin 3 wired to pin K18 on the Meg-Array connector. Pin K19 on the Meg-Array is wired to GND on the device (pin 1), and a 10k resistor is wired between GND and VIN (pin 2). This implies an NTC thermistor-based temperature sensor, or a digital temperature sensor with an analog output mode. 

This IC is unidentifiable from its markings (X06L), even after consulting [http://www.smdmarkingcodes.com/](http://www.smdmarkingcodes.com/) and looking at the pictures of __all__ the SOT-23 temperature sensors on [LCSC](https://www.lcsc.com/). This means an exact match is impossible, but does not mean a drop-in replacement cannot be found. I inferred the function of each pin of the chip (power, ground, and output), and wired them up to a power supply and my multimeter. By measuring the voltage output of the chip under different conditions (room temperature, an ice cube, and a hot air gun set to 100C), I was able to plot a curve that allowed me to find a suitable drop-in replacement:


## The Mechanical Footprint

Finally, the mechanical part of the build. The actual footprint.

The footprint itself is just two Meg-Array connectors, but one is left unpopulated. Easy enough. The __hard__ part is the mechanical portion. The SXM2 module is fastened to the board with eight individual M3 screws. These are M3 SMD standoffs, soldered to the opposite side of the board.

![Render of the board, both sides](/images/SXM2Render.png)

Other than that, it's a standard PCIe x16 card.

![board in KiCad](/images/SXM2Board.png)

All work for this project is [available on my Github](https://github.com/bbenchoff/SXM2toPCIe).

[back](../)
