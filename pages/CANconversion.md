---
layout: default


---

## Converting a car to CAN

My restoration of a <a href="https://bbenchoff.github.io/pages/Citicar.html">a vintage electric car</a> includes significant upgrades. Because the motor was beyond repair, I upgraded to a more powerful AC induction motor. This required a modern motor controller, and because hybrid and electric vehicles are hitting the scrap heap, I decided to move away from heavy lead acid batteries to modern lithium packs. All of these upgrades mean the stock dashboard electronics are obsolete; the stock speedometer is run off a cable, and the new motor does not have a cable connected to the shaft. Any sort of voltage measurement on the stock dashboard would be wildly inaccurate with the different cell chemistry and higher voltage.

In short, to upgrade this car to modern electronics, the easiest path forward is to replace *all* of the electronics.

## A Comparison of Approaches

To describe what goes into converting a car to CAN, I must go over what the original schematic looked like. Here it is, on the left:

![A comparison between two schematics](/images/Car/Schematics.png)

While this schematic neglects the high power electronics like the motor, contactor, and charger, the complete 12 Volt system is there. The brains of the operation is four relays. This, along with a 'flasher' unit -- basically a bi-metallic strip that turns off when enough current is applied -- is all you need to run a car. This schematic will handle hazard lights, turn signals, brake lights, and everything else a car is legally required to have. Throw some switches in there for the wiper and defrost and that's all you really need in a car. Not shown is the speedometer, but you get the point.

The CAN version of this schematic is significantly different. Instead of relays, each of the lights on the exterior of the car -- turn signals, marker lights, brake lights -- are each connected to their own MOSFET. There are optoisolators to read the state of switches, a display for the speedometer and a CAN-enabled Reverse-Neutral-Drive switch. Here's how I built each of those:

### The CAN-MOSFET Board

![The CAN MOSFET Board](/images/Car/GaugeCluster/CANMOSFET.jpg)

The design of the MOSFET board has several requirements, including:

- There should be two CAN ports, because everything will be daisy-chained. Also, I'm using Deutsch connectors.
- Each device should have at least eight channels of output
- I'll also need opto-isolated inputs to read switch states
- The device should be as small, or as thin, as possible. It needs to fit in a very small car.

The design I came up with is below. There are two Deutsch connectors for power and CAN, along with a bank of screw terminals for each output. Yes, I'm aware the screw terminals aren't the proper connector -- ideally they would be soldered directly to the board or broken out onto a larger connector.

Also on this board is a 'shield' of sorts. The CAN MOSFET board has several different options:

- Without a shield, giving 8 MOSFET outputs
- With a 8-port opto input, giving 8 MOSFET outputs and 8 opto inputs
- With a 4/4 opto/mosfet shield, giving 12 MOSFET outputs and 4 opto inputs

![Render of the complete CAN MOSFET device, with shield](/images/Car/GaugeCluster/CANGPIO.png)

The circuit for the MOSFETs and optos are simple enough. For the 'microcontroller and CAN' part of the circuit, I settled on an ATMega328p, Microchip MCP2515 CAN controller, and Microchip MCP2551 CAN Transceiver. Yes, this is effectively an Arduino running my car, but with the proper application of watchdog timers, most concerns can be oblivated. See Jack Ganssle's [article on watchdogs](http://www.ganssle.com/watchdogs.htm) for some introduction to this.

![The CAN MOSFET Board](/images/Car/GaugeCluster/sch.png)

### The Display

![The Display](/images/Car/GaugeCluster/LEDBezel.png)

The only way for me to measure the speed of the car is by reading the motor RPM, dividing by whatever the gear ratio of the differential is, and multiplying by the wheel diameter of the wheels. I think pi is in there somewhere. I need a display, and the most basic LCD display simply will not do for this. To this end, I created an 18*39 LED display -- that's 702 LEDs -- by [writing a driver for the IS31FL3741 LED driver chip](https://bbenchoff.github.io/pages/IS31FL3741.html). This is the third time I have written a driver for this chip.

The CAD and PCB design for this display is just a column and row arrangement for the LEDs on one board. This is connected to a second board that holds an [Adafruit Feather M4 CAN Express](https://www.adafruit.com/product/4759). Add some Deutsch connectors and it's good to go. This is housed in a CNC aluminum enclosure, capped with 

![The Display](/images/Car/GaugeCluster/ExplodedBezel.png)



[back](../)
