---
layout: default


---

## An Isolated Thermocouple Reader

![Hero Image](/images/IsoThermHero.png)

### The problem
As a sort of test and measurement engineer at my job, we have to take temperature measurements on live electrical circuits. A thermocouple is great for this -- you can simply embed the tip of a thermocouple wire inside a block of copper and you'll get its temperature even if there's 500 Amps going through it.

The hardware for this is expensive. The [National Instruments 9212](https://www.ni.com/en-us/shop/model/ni-9212.html) is an 8-channel electrically isolated thermocouple input module for the NI family of DAQ units. This module costs $1600, and that doesn't even consider the 'base station' each of these modules needs. If you want to read electrically isolated thermocouple inputs, expect to spend at least $250 per channel.

I can do this for about $15 per channel.

### One chip does all the work

The problem is that I need to read small (+/- 50mV) voltages with a microcontroller, and these inputs need to be isolated. There is a chip that does this, the [Texas Instruments AMC3336](https://www.ti.com/product/AMC3336) and related chips like the AC3306M05 (+/- 50mV), and AMC3305M25 (+/- 250mV). These chips are isolated delta-sigma (ΔΣ) DACs. They all operate with a single power supply of 3.3V, and they will read the microvolt voltages needed for thermocouple measurement.


![AMC signals on an oscilloscope](/images/DS1Z_QuickPrint3.png)

![A graphic explination of what the PIO code is doing](/images/PIOGraphic.png)


[back](../)
