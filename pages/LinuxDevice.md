---
layout: default


---

# A $15 Linux Computer, or a Linux Swiss Army Knife

![Front of Device](/images/Linux/Front.png)

This project is an exploration of how inexpensive a computer can be. In the end, I ended up designing a 'Linux Swiss Army Knife', or a device capable of doing everything a normal computer does. With this comes some sort of definition of what a 'computer' is. This is very arguable, but I've narrowed it down to the following list of requirements:

* Runs Linux. Just command line.
* Has a keyboard. No touchscreen display.
* Has a USB port. To connect to other things.

That's about it. Given that list of requirements, I know I need some sort of SoC, perferrably as cheap as possible. I need a keyboard of some sort, preferrably as cheap as possible. I need a screen, some sort of battery system, and some sort of storage. All preferrably as cheap as possible. I think I've cracked this problem, and I've come up with a computer that runs Linux and costs about $15 USD.

### TL;DR, Gimme the specs:

* Allwinner F1C100s SoC
	* ARM926EJ-S CPU @ 533 MHz
	* 32 MB DDR (64 MB with pin-compatable F1C200s)
* 2.3" IPS TFT
	* 320 by 240 pixel resolution
	* ILI9342 controller (SPI)
* USB 2.0 over USB-A connector
* 48-key Keyboard
	* Yes, you can type any character you want
* microSD card for storage
* 2x AAA NiMH battery
	* The battery life is long enough
	* Charge over USB C

## Design & Expansion

The biggest question is the Linux SoC. For this I chose the [Allwinner F1C100s](https://linux-sunxi.org/F1C100s), an ARM9 core running at 533MHz with an integrated 32MB of DDR (the F1C200s bumps the memory up to 64MB and is drop-in pin compatible). This is the same chip used in a now-discontinued dev board, the Lichee Pi Nano, and [I have Buildroot running on this chip](https://github.com/bbenchoff/NixDevice) thanks to the efforts of others. It boots from an SD card and puts a terminal on a SPI display. Everything kinda just works.

The keyboard was not as easy, as a suite of tact switches would be expensive both in material cost and assembly cost. Instead, I'm using a [silicone membrane keyboard](https://bbenchoff.github.io/pages/keyboard.html), much like what you would find on a TV remote control. Because the electrical connections for the keyboard is printed on the circuit board, this type of keyboard is essentially free. Or a little less than $1 in quantites greater than a few thousand or so.

The battery is slightly more challenging, as using lithium cells would mean more stringent requirements re: shipping and transport. Instead of lithium cells, I'll be using AAA NiMH cells. 

![Silicone Membrane Keyboard](/images/Linux/Back.png)

The 'back' of the device contains all the ports. These include a USB Type-A port, where you can easily attach a WiFi or Bluetooth adapter, USB keyboard, webcam, or really *any other device*. lsusb works, so have fun with that.

Additionally, the storage on this device is through a SD card -- 

![Board Layout](/images/Linux/Board.png)


## Does it really cost $15?

In short, yes, if you're counting the BOM cost in quantities greater than 10,000.

## What can it do?

![Silicone Membrane Keyboard](/images/Linux/Doom.png)

What can a $15 Linux computer do? First off, yes, [it can run Doom](https://www.chocolate-doom.org/wiki/index.php/Chocolate_Doom). Chocolate Doom is actually a default package in Buildroot, which is awesome.


## In Closing, or, A Hammer for the Mind

I hate to invoke Steve Jobs on this, but one of the most insightful things he ever said was his ['Bicycle for the Mind' anecdote](https://www.youtube.com/watch?v=ob_GX50Za6c). In this story, Jobs read a story in Scientific American where scientists tested the efficiency of locomotion for dozens of species. The condor was most efficient, or able to travel a kilometer using the least amount of energy. Humans were middling, about a third of the way down the list. However, Jobs tells, someone at Scientific American had the insight to test a human *on a bicycle*. Here, the bike blew every other animal away, and because of technology, humans are the most efficient species on the planet. The computer is a bicycle for the mind, allowing us to do more _thought_ easier and with less energy.

It's a brilliant anecdote showcasing what computers can do now, but also what would be possible in the future with further advances in computing. The story is also complete bullshit, because humans evolved to be pursuit hunters able to out-walk an antelope. Humans don't need to be the most efficient animal, humans just need to be more efficient than an antelope. But I digress...

This anecdote ties 'humans as tool-builders' and 'humans are the supreme animal' into a neat little package, but it fails to mention the tools needed to build a bicycle. We need hammers, we need wreches, and we need knowledge of fairly advanced metullurgy.

That's what this device is. It's a tool used to fix our computers. If you need a serial terminal, just grab this device and a USB to FTDI thingy, and you've got a serial terminal. Want to flash a microcontroller? This thing has AVRDude built in. Want to listen to Starlink satellites? Just plug in an SDR. That's what this device is: a tool to fix computers, or a Hammer for the Mind.


[back](../)
