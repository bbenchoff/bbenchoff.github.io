---
layout: default


---

# Multi-Stop Bus Tracker (and a tide display. and possibly weather.)

![The render of the Bus Display](/images/BusDisplayRender.png)

I live in SF, with some of the best public transit in the country. I would like to know when the next bus will be arriving at a stop near my house. Not just one stop, either: there are several bus lines that will all take me downtown, but they're all served by different stops. I need a device that will ping the city's API for _all_ the bus stops near my house, and condense that into a list I can put on a small display somewhere. I don't want to dedicate a whole computer to this task, so I need to build an embedded solution.


![The standard MUNI bus display at some bus stops](/images/MuniBusDisplay.jpg)

This is somewhat different than the displays actually found at bus stops around the city (above). By their nature, the displays at one bus stop do not track the arrivals at other nearby bus stops. It can be done, I just need the data. This can be done through the [511.org API](https://511.org/). Given any bus stop in the city, this API will give me predicted times of arrivals each bus scheduled at that stop, its line number/letter, and its destination. There is a rate limit on this API of 60 seconds, but that only means I'm sending a request every 65 seconds.

But there are a few problems:

- The 511.org API *only* works with HTTPS. 
- The API *only* gives me gzipped JSON. I need to decompress this on the device.
- I need to do this on an embedded device. I'm using a Pi Pico2W, simply because that's the bullshit I'm currently on.

## Problem 1: HTTPS and Decompressing JSON

Getting data from the 511.org API presents two immediate challenges: the API requires HTTPS connections, and it only returns gzipped JSON data. This is an unusual requirement for embedded projects; most examples of accessing web APIs on microcontrollers use plain HTTP, and compressed data is rarely seen in embedded applications.

HTTPS was the easier of these problems to solve; the SSLClient library for Arduino handles the SSL/TLS handshake and encryption. The only tricky part was getting the correct SSL certificates in the right format. [A web-based tool](https://openslab-osu.github.io/bearssl-certificate-utility/) creates a trust_anchors.h file containing the certificates needed for SSL verification - you just input the domain name (api.511.org) and it generates the properly formatted certificate array that SSLClient needs. With the correct certificates in place, SSLClient manages the encrypted connection transparently.

Figuring out the payload was another matter entirely. At first, every response I was getting from the server was garbage, even when telling the server to send me *un*compressed JSON. Looking at the hex dump of the data I was receiving told me another story.

![The key insight that told me it was gzipped JSON](/images/HexDecoding.png)

### I can not tell you how many times looking at a hex dump has saved my ass.

The 0x1F 0x8B is the magic number for gzip encoding. Once I saw that, I knew I needed a library for decompressing gzip on an embedded platform. I found the [miniz library](https://github.com/richgel999/miniz), a portable library in C that handles the decompression. Even with this library, it's tricky; I need to skip past the 10-byte header, extract the uncompressed size from the last 4 bytes, and decompress everything in between. I also need to manage the memory correctly with malloc() and free(), and no I haven't learned Rust yet. 

## Problem 2: Organizing this data

The 511.org API gives me a lot of data for each bus stop - route numbers, destinations, arrival times, and current locations. But I need to track multiple stops at once, and merge all this information into something useful. This meant creating a data structure that could handle multiple stops and multiple arrivals at each stop.

The solution I came up with uses a simple array of stop data structures. Each stop structure contains its stop code (a unique identifier for each bus stop) and an array of upcoming arrivals. Each arrival contains the bus line number, destination, arrival time, and stop name. The size of these arrays is fixed - I can track up to 20 arrivals per stop, which is more than enough for my needs.

When new data comes in from the API, I clear out the old arrivals for that stop and fill in the new ones. There's also a cleanup function that removes arrivals that have already passed. The most interesting part is how the display function handles all this data - it looks through all stops and all arrivals, groups buses going to the same destination, and creates a consolidated list of arrival times. For example, if the 48 bus is coming to the same stop in 5, 20, and 35 minutes, it shows up as one line: "48 Inbound in 5, 20, 35 minutes". Pinging two stops means I can also get "28 to the Presidio in 2, 12, 23 minutes".

![Getting the bus displays four bus stops around Market and Van Ness](/images/MuniBusses.png)

The above is the device pinging four bus stops ({"15696", "15565", "13220", "15678"}) around Market and Van Ness. Each stop has several bus lines on it, and the code correctly displays the line, destination, and arrival time. This might seem like overkill for just checking bus times, but it means I can glance at the display and immediately see every bus that's coming to any stop near my house, sorted by arrival time.

## Problem 3: Let's add a display!

This thing needs a display, something low power, too. I settled on an ePaper display, the [Microtips MT-DEPG0750RWU790F30](https://www.mouser.com/ProductDetail/Microtips-Technology/MT-DEPG0750RWU790F30?qs=Y0Uzf4wQF3nnUJiBp%2FvOzg%3D%3D), a 7.5" display with a resolution of 480x800. There are a few things that brought me to this display: it has an on-chip framebuffer, which can [vastly increase capabilities if you're smart](https://bbenchoff.github.io/pages/dumb.html), and programmable waveforms for the eInk. With both of those features I might be able to increase the refresh rate to something that will play Bad Apple or Doom. We'll see.

![The breakout PCB for the e-paper panel](/images/MicrotipsPCB.png)

![Schematic for the Epaper driver](/images/MicrotipsSchematic.png)

I whipped up a board in KiCad that would support this board. The panel driver circuit is ripped straight from the datasheet and drives the panel with SPI. In addition to that, I added a few [solderable standoffs](https://www.digikey.com/en/products/detail/w%C3%BCrth-elektronik/9774060360R/4810237) and a power circuit built around TI's TPS560200, giving me 3.3V from 4.5V to 17V. There is a vertical USB-C (power only) on the board, because i envision this being something like a picture frame. There is also a ~12V power input ORed with the USB-C power input in case I ever want to install this inside a wall.

Writing the driver/library for the e-paper display proceeded as it usually does when I write a display driver -- tearing my hair out and somehow it magically works.


[back](../)
