---
layout: default


---

# Multi-Stop Bus Tracker

I live in a city with some of the best public transit in the country. I would like to know when the next bus will be arriving at a stop near my house. Not just one stop, either: there are several bus lines near my house that will all take me downtown, but they're all served by different stops. I need a device that will ping the city's API for _all_ the bus stops near my house, and condense that into a list I can put on a small display somewhere. Ideally, this is an embedded solution. I shouldn't need to boot an operating system to do this.

The ideal solution would be a small, low-power display mounted to a wall somewhere, telling me when the next bus will be showing up _somewhere_ around my house.

![The standard MUNI bus display at some bus stops](/images/MuniBusDisplay.jpg)

This is somewhat different than the displays actually found at bus stops around the city (above); I need to track multiple bus stops. This can be done through the [511.org API](https://511.org/). Given any bus stop in the city, this API will give me predicted times of arrivals each bus scheduled at that stop, it's line number/letter, and its destination.

But there are a few problems:

- The 511.org API *only* works with HTTPS
- The API only gives me gzipped JSON. I need to decompress this on the device.
- I need to do this on an embedded device. I'm using a Pi Pico2W, simply because that's the bullshit I'm currently on.

## Problem 1: HTTPS and Decompressing JSON

Getting data from the 511.org API presents two immediate challenges: the API requires HTTPS connections, and it only returns gzipped JSON data. This is an unusual requirement for embedded projects; most examples of accessing web APIs on microcontrollers use plain HTTP, and compressed data is rarely seen in embedded applications.

HTTPS was the easier of these problems to solve; the SSLClient library for Arduino handles the SSL/TLS handshake and encryption. The only tricky part was getting the correct SSL certificates in the right format. [A web-based tool](https://openslab-osu.github.io/bearssl-certificate-utility/) creates a trust_anchors.h file containing the certificates needed for SSL verification - you just input the domain name (api.511.org) and it generates the properly formatted certificate array that SSLClient needs. With the correct certificates in place, SSLClient manages the encrypted connection transparently.

Figuring out the payload was another matter entirely. At first, every response I was getting from the server was garbage, even when telling the server to send me *un*compressed JSON. Looking at the hex dump of the data I was receiving told me another story.

![The key insight that told me it was gzipped JSON](/images/HexDecoding.png)

The 0x1F 0x8B is the magic number for gzip encoding. Once I saw that, I knew I needed a library for decompressing gzip on an embedded platform. I found the [miniz library](https://github.com/richgel999/miniz), a portable library in C that handles the decompression. Even with this library, it's tricky; I need to skip past the 10-byte header, extract the uncompressed size from the last 4 bytes, and decompress everything in between. I also need to manage the memory correctly with malloc() and free(), and no I haven't learned Rust yet. 

## Problem 2: Organizing this data

The 511.org API gives me a lot of data for each bus stop - route numbers, destinations, arrival times, and current locations. But I need to track multiple stops at once, and merge all this information into something useful. This meant creating a data structure that could handle multiple stops and multiple arrivals at each stop.

The solution I came up with uses a simple array of stop data structures. Each stop structure contains its stop code (a unique identifier for each bus stop) and an array of upcoming arrivals. Each arrival contains the bus line number, destination, arrival time, and stop name. The size of these arrays is fixed - I can track up to 20 arrivals per stop, which is more than enough for my needs.

When new data comes in from the API, I clear out the old arrivals for that stop and fill in the new ones. There's also a cleanup function that removes arrivals that have already passed. The most interesting part is how the display function handles all this data - it looks through all stops and all arrivals, groups buses going to the same destination, and creates a consolidated list of arrival times. For example, if the 48 bus is coming to the same stop in 5, 20, and 35 minutes, it shows up as one line: "48 Inbound in 5, 20, 35 minutes". Pinging two stops means I can also get "28 to the Presidio in 2, 12, 23 minutes".

This might seem like overkill for just checking bus times, but it means I can glance at the display and immediately see every bus that's coming to any stop near my house, sorted by arrival time.

# Problem 3: Let's add a display!

This thing needs a display, something low power, too. I settled on an ePaper display, the [Microtips MT-DEPG0750RWU790F30](https://www.mouser.com/ProductDetail/Microtips-Technology/MT-DEPG0750RWU790F30?qs=Y0Uzf4wQF3nnUJiBp%2FvOzg%3D%3D), a 7.5" display with a resolution of 480x800. There are a few things that brought me to this display: it has an on-chip framebuffer, which can [vastly increase capabilities if you're smart](https://bbenchoff.github.io/pages/dumb.html), and programmable waveforms for the eInk. With both of those features I might be able to increase the refresh rate to something that will play Bad Apple or Doom. We'll see.



[back](../)
