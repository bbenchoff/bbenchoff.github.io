---
layout: default


---

# A Minimum Viable Computer, or Linux for $15.

![Front of Device](/images/Linux/Front.png)

This is a 'Linux Swiss Army Knife', or a device capable of doing everything a normal computer does, offering maximum utility while still being able to fit in your pocket. With this comes some sort of definition of what a 'computer' and what a 'useful computer' is. This is very arguable, but I've narrowed it down to the following list of requirements:

* Runs Linux. Just command line.
* Has a keyboard. No touchscreen display.
* Has a USB port. To connect to other things.
* Some sort of battery power, I guess.

That's about it. Could you do all of this with a smartphone? Yeah, kinda, if you root prepaid Android phone, but even that would cost more than $30. I know I can build something cheaper.

Given the list of requirements, I know I need some sort of SoC, perferrably as cheap as possible. I need a keyboard of some sort, preferrably as cheap as possible. I need a screen, some sort of battery system, and some sort of storage. All preferrably as cheap as possible. I think I've cracked this problem, and I've come up with a computer that runs Linux and costs about $15 USD.

### TL;DR, Gimme the specs:

* Allwinner F1C100s SoC
	* ARM926EJ-S CPU @ 533 MHz
	* 32 MB DDR (64 MB with pin-compatable F1C200s)
	* Runs Linux! A recent version of Linux!
* 2.3" IPS TFT
	* 320 by 240 pixel resolution
	* ILI9342 controller (SPI)
* USB 2.0 over USB-A connector
	* 5V to devices
* 48-key keyboard
	* Silicone membrane, like a TV remote control
	* Yes, you can type any character you want
* microSD card for storage
	* How could you possibly fill up 64 GB of storage?
* 2x AAA NiMH battery
	* The battery life is long enough
	* Charge over USB C @ 500mA
* Licensed!
	* There's a few drivers I had to write for this, I'll submit a patch eventually.
	* Everything else is licensed as permissively as possible
	* Yes 'Open Hardware' means more than PDFs of schematics
* Low Price!
	* It costs $10,000 USD to build one of these
	* The ten thousandth one costs $15
* Designed in 2021
	* I can buy all the parts right now, in quantity.

## Design & Expansion

The most consequential design decision is the Linux SoC. For this I chose the [Allwinner F1C100s](https://linux-sunxi.org/F1C100s), an ARM9 core running at 533MHz with an integrated 32MB of DDR (the F1C200s bumps the memory up to 64MB and is drop-in pin compatible). This is the same chip used in a now-discontinued dev board, the Lichee Pi Nano, and [I have Buildroot running on this chip](https://github.com/bbenchoff/NixDevice) thanks to the efforts of others. It boots from an SD card and puts a terminal on a SPI display. Everything kinda just works thanks to [some very cool people working on the sunxi stuff for Linux](https://linux-sunxi.org/F1C100s).

The keyboard was not as easy, as a suite of tact switches would be expensive both in component cost and assembly cost. Instead, I'm using a [silicone membrane keyboard](https://bbenchoff.github.io/pages/keyboard.html), much like what you would find on a TV remote control. Because the electrical connections for the keyboard is printed on the circuit board, this type of keyboard is essentially free. Or a little less than $1 in quantites greater than a few thousand or so.

The silicone membrane keyboard does come with a drawback -- it requires a plastic enclosure. That's acceptable, as any 'pocket computer' device needs an enclosure anyway. My enclosure is a two-piece clamshell snap-fit design requiring no tools to assemble or disassemble. The cost is about $1 in quantity, and will be screen printed with alt keyboard combinations above each key.

The battery is slightly more challenging, as using lithium cells would mean more stringent requirements in regards to shipping and transport. Instead of lithium cells, I'll be using AAA NiMH cells. While providing less overall power per unit mass of lithium, it's significantly less expensive than lithium. This design can also be modified for AA NiMH cells for more than twice the runtime at the expense of a slightly thicker enclosure.

![The ports on the device](/images/Linux/Back.png)

The 'back' of the device contains all the ports. These include a USB Type-A port, where you can easily attach a WiFi or Bluetooth adapter, USB keyboard, webcam, or really *any other device*. lsusb works, so have fun with that.

Additionally, the storage on this device is through a SD card -- I've sourced a few 8GB cards and they work fine, but at scale 32GB or 64GB are more readily available. This is the second most expensive line item in the BOM, coming in at about $2/each at quantity 10,000.

![Board Layout](/images/Linux/Board.png)

The PCB is a simple 2-layer board. There's really nothing novel here except the contact pads for the silicone membrane keyboard.

### Earlier renderings of the device

![Handheld Linux Thing](/images/SAB-4.png)
![Handheld Linux Thing](/images/SAB-5.png)


## Does it really cost $15?

The answer to the big question, "How much does it cost?" is, "What the market will bear". In short, yes, if you're counting the BOM cost in quantities greater than 10,000. That said, let's go into the cost breakdown. This is an abridged but still accurate BOM, with costs for each row in the last column.

| Device	| Description	| Cost @ QTY 1000	|
|--------	|--------	|--------		|
| CPU		| F1C100s	| $0.75			|
| Display	| ILI9342	| $2.20			|
| Keyboard	| custom	| $1.20			|
| Enclosure	| custom	| $1.70			|
| C1, C6, C8	| 22uF		| $0.15			|
| C2, C3	| 1uF		| $0.02			|
| C9..C13..C17	| 100nF		| $0.0045		|
| C12		| 2.2uF		| $0.0011		|
| C18, C19	| 1uF		| $0.002		|
| Resistors (20)| Jellybean	| $0.015		|
| IC2 		| MCP1642B	| $0.93 		|
| J1		| Display conn	| $0.52584		|
| L1		| 4.7uH 	| $0.31790		|
| L2..L4	| 2.2uH		| $0.0126		|
| SW1		| Switch	| $0.10			|
| Q1		| Mosfet 	| $0.16			|
| T1		| Thermistor	| $0.10659		|
| Conn1...4	| Battery conn.	| $1.10			|
| Type C	| Type C conn.	| $0.1894		|
| Type A	| Type A conn.	| $0.0496		|
| U2..U4	| MT3420B	| $0.22			|
| Y1		| Crystal 12MHz	| $0.12			|
| SD card	| 64GB		| $2.20			|
| Battery (2)	| AAA NiMH	| $1.10			|
|		|		| **TOTAL $12.16079**	|

There you go, a full Linux computer for just over twelve bucks in parts. Neither the PCB nor assembly are included, and better component selection (caps, and a generic version of the battery clip) would drop a few cents off the build. But I'll call this a $15 computer for the clickbait headline. Speaking of clickbait, if you want to build _one_ of these things, It'll cost you about ten grand. The first one costs ten grand, the ten thousandth one costs fifteen bucks. If you really want to know what the price is, I'd say a Chinese manufacturer could charge $20 and still make some money.

I can buy all of the components for this device right now at the beginning of 2022, in the depths of a component shortage. Give me six months and I'll give you a tens of thousands of these things.

## What can it do?

![Silicone Membrane Keyboard](/images/Linux/Doom.png)

What can a $15 Linux computer do? First off, yes, [it can run Doom](https://www.chocolate-doom.org/wiki/index.php/Chocolate_Doom). Chocolate Doom is actually a default package in Buildroot, which is awesome.

Instead of me telling you what this device can do, instead let me ask what _you_ can do with command line Linux, a keyboard, and a USB port. Do you want software defined radio? Sure thing, there's a package for that. Do you want this thing to be a crypto wallet? No problem, in fact you can display your expensive monkeys on the screen. Want to compile your own code on this thing? Go ahead. There's even a few GPIOs left open and broken out, have fun with that. There's one SPI and a few I2Cs that aren't connected to anything.

This is, in short, a device that can do anything. It's just really small and really, really cheap.

One thing I'm not even going to attempt is a GUI. You're stuck with command line unless someone hacks something else in. 


## In Closing, or, A Hammer for the Mind

I hate to invoke Steve Jobs on this, but one of the most insightful things he ever said was his ['Bicycle for the Mind' anecdote](https://www.youtube.com/watch?v=ob_GX50Za6c). In this story, Jobs read a story in Scientific American where scientists tested the efficiency of locomotion for dozens of species. The condor was most efficient, or able to travel a kilometer using the least amount of energy. Humans were middling, about a third of the way down the list. However, Jobs tells, someone at Scientific American had the insight to test a human *on a bicycle*. Here, the bike blew every other animal away, and because of technology, humans are the most efficient species on the planet. 

The computer is a bicycle for the mind, or so this analogy goes, allowing us to do more _thought_ easier and with less energy. This is the type of thinking that gets you to the wonder of 1980s and -90s computing, when _we were changing the world_, before technology of the 2000s and 2010s was changing the world _for the worse_, what with destroying democracy with Facebook. 

This story is complete bullshit. The efficiency of animal locomotion is just a function of evolution. Of course an albatross is extremely efficent at flying, because an albatross has to fly 10,000 miles without stopping. Of course a human's bipedal locomotion is more efficent than an antelope, because humans are pursuit hunters. All we need to do is walk to where the antelope finally exhausts itself.

The continued the bicycle for the mind analogy fails to mention the tools needed to build a bicycle. This also leaves out the growth IT and technology industries of 'bicycle repairmen, but for the mind'. We need hammers, we need wreches, and we need knowledge of fairly advanced metullurgy. That's what this device is. It's a tool used to fix our computers. If you need a serial terminal, just grab this device and a USB to FTDI thingy, and you've got a serial terminal. Want to flash a microcontroller? This thing has AVRDude built in. Want to listen to Starlink satellites? Just plug in an SDR. This is the Linux Swiss Army Knife: a tool to fix the 'bicycles for the mind'. It's a simple, cheap, nearly endlessly-expandable device meant to fix the real computers. I'm calling it the 'Hammer for the Mind'. Or it's a $15 Linux Computer. Or the Minimum Viable Computer. The hardest thing in technology is naming something.


[back](../)
