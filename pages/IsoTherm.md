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

Thermocouples are just two bits of wire made of dissimilar metals that produce a voltage proportional to temperature. At full scale -- the minimum and maximum temperatures published in thermocouple lookup tables -- the voltages are fairly large and on the order of -10mV to about +50mV. That's 1/10000th to 1/50000ths of a Volt. To get sub 1°C resolution I will need to measure microvolts, or __millionths__ of a volt. With a range of +/- 50mV for the DAC, that means I need an effective resolution of at least 16 bits.

These inputs also need to be isolated. There is a chip that does this, the [Texas Instruments AMC3336](https://www.ti.com/product/AMC3336) and related chips like the AMC3306M05 (+/- 50mV), and AMC3305M25 (+/- 250mV). These chips are isolated delta-sigma (ΔΣ) DACs. They all operate with a single power supply of 3.3V, and they will read the microvolt voltages needed for thermocouple measurement.

The specs for these chips is great, especially on the  AMC3306M05. single 3.3V supply will allow me to read a single thermocouple input, +/- 50mV, at about 16 bits of resolution. It has 1200V of isolation. The only problem is that it's a ΔΣ DAC, so I need to figure out how to read that.

### Operation and reading of a ΔΣ DAC

A ΔΣ DAC is simple to describe -- feed it a square wave, and it will give you another square wave at half the frequency, the duty cycle of which is proportional to the voltage on the input. Here's what it looks like on an oscilloscope, clock input on top, signal on bottom:

![AMC signals on an oscilloscope](/images/DS1Z_QuickPrint3.png)

The ideal tool for this is the RP2040, also known as the Raspberry Pi microcontroller. The RP2040 has a PIO module that can toggle and read GPIOs __very fast__. Think of it as the microcontroller version of the [BeagleBone PRU](https://www.beagleboard.org/projects/pru).

Each of the two PIOs on the RP2040 has four State Machines (SM), a "sub-processor", with a handful of registers (four, actually, x, y, and an input and output shift register) and runs a handful of instructions (read, write, shift in, jump, and decrement). The input and and output shift registers are 32 bits wide, meaning if you want to read a ΔΣ DAC, you can only read 32 points before shifting that data out to the main processor via DMA.

To use these PIOs with the ACM3306, one SM needs to generate a clock. Another SM needs to wait for an IRQ from the clock generator PIO, then read a pin and shove it into the Input Shift Register. The code for each is listed below

### Clock Gen PIO code
```
.program clock_gen 
    set pindirs, 1       ; Set pin direction to output
.wrap_target
    set pins, 1          ; Set pin high
    nop                  ; Delay for low state
    set pins, 0          ; Set pin low
    irq nowait 0         ; Set IRQ 0 for the other SM
    set pins, 1          ; Set pin high
    nop                  ; Only want one IRQ
    set pins, 0          ; Set pin low
    nop                  ; Delay for low state
.wrap
```

### ACM Read PIO code
```
.program sample_counter
    set pindirs, 0          ; Set pin direction to input
    set x, 31               ; Initialize x for 32 bits
.wrap_target
do_capture:
    wait 1 irq 0            ; Wait for IRQ 0 (triggered by SM0)
    in pins, 1              ; Read 1 bit and shift into ISR
    jmp x-- do_capture      ; Loop until x is 0
    push block              ; Push 32 bits from ISR to RX FIFO
    set x, 31               ; Reload x for the next 32-bit capture
.wrap
```

A graphic representation of what's happening in this code is shown below. This code relies on setting an IRQ on the clock_gen PIO code, and reading that IRQ in the sample_counter PIO code.

![A graphic explination of what the PIO code is doing](/images/PIOGraphic.png)

This code collects 32 bits into the Input Shift Register of the PIO, and shoves that over to the main CPU when it's full. using _builtin_popcount() I can count the number of high bits and eventually get the proportion of high bits to total bits in the ΔΣ signal.

This works for one channel, but because the RP2040 only has eight total State Machines, I cannot read eight channels while generating the clock signal. The (RP2350)[https://www.raspberrypi.com/products/rp2350/] with twelve total SMs is a much better fit. I'll use that for the production version of this.

### Sync3 filters

### Device Hardware

![Image of the PCB](/images/IsoThermPCB.png)

For this to be a useful industrial DAQ, it needs to have inputs and outputs. For this, I added a W5500 Ethernet controller. USB-C is the future, but I don't need USB3. I wired up a USB-C port as a USB 2.0 interface, which is sufficient. Power is provided either through the USB-C port or a barrel jack while four transistors form a power OR circuit, allowing this device to be powered by either the barrel jack or USB port.

One thing I've noticed on industrial hardware is the complete lack of a user interface. I've used Ethernet DAQs where the only way to tell what IP address a device is set to is to use nmap after plugging it in. This device has a small OLED display that simply shows you its IP address. There are also side-mounted LEDs below this display and light pipes through the case. Even I question the utility of these LEDs but they look great and were cheap to implement.

Connectivity is mostly through Modbus over Ethernet, although streaming over serial is also supported. This is in line with most of the other data acquisition tooling at my job.

![Another hero image of the thing](/images/IsoThermEnclosure.png)


[back](../)
