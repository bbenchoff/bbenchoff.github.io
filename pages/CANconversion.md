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

asdfasdf


[back](../)
