---
layout: default


---

# Milipixel: A Classic Mac Client for Vintage Digital Photography

![Milipixel Box Art](/images/MilipixelBoxArt.png)

## What is Milipixel?

Milipixel is an online photo sharing app for classic Macintosh hardware focused on vintage digital photography. The platform celebrates the distinctive CCD sensor aesthetic of early digital cameras like the Apple QuickTake, Kodak DCS-420, early Sony Mavica, and Casio QV series. It's Internet-aware, meaning you can upload your pictures to the web, download pictures from other photographers, as well as comment, like, and share pictures you find interesting. It's Instagram or Flickr, if it was built in 1994, and available only for Macintosh computers.

This page details the Classic Mac client application that connects these vintage systems to the [Milipixel.com](https://milipixel.com) platform.

## Features

<img src="/images/MilipixelGridView.png" alt="Thumbnail Grid View" hspace="10">

### Viewing Experience

- **Thumbnail Grid**: A clean grid for browsing multiple images
- **Detail View**: Full-screen viewing of individual images
- **Adaptive Scaling**: Automatically scales images to fit window size while preserving aspect ratio
- **EXIF Display**: Shows available camera metadata (when present, which is not often)
- **Slideshow**: A full-screen slideshow of images, either random or your favorites.

### Image Management

- **Download**: Retrieve photos from the Milipixel.com platform
- **Upload**: Send your own vintage camera photos to the service
- **Local Storage**: Save images for offline viewing
- **Metadata Editing**: Add titles and descriptions to your photos

### Social Features

- **Favorites**: Mark photos you love
- **Comments**: View and add comments to photos
- **User Profiles**: See collections by photographer

## Current Status

Milipixel client v0.9 beta is available for testing. The core viewing functionality is complete, with upload capabilities still in development. The application successfully connects to the Milipixel.com API using secure HTTPS connections and properly displays JPEG images from the most popular vintage digital cameras.

<div style="text-align: center">
    <img src="/images/MilipixelProgress.png" alt="Development Progress" width="500">
</div>

## Download

You can download the current beta from:
- [Milipixel.com/downloads](https://milipixel.com/downloads)
- [Macintosh Garden](https://macintoshgarden.org/apps/milipixel)
- [Mac GUI](https://www.macgui.com/downloads/?file_id=42672)

The client is available as a Stuffit archive (.sit) with an Installer VISE package. Both 68k and PowerPC code is included in a single fat binary.

## System Requirements

- **Processor**: 68030 or better (optimized for PowerPC)
- **RAM**: 4MB minimum, 8MB recommended
- **System**: Mac OS 7.1 through Mac OS 9.2.2
- **Display**: 512x384 minimum resolution
- **Networking**: Open Transport 1.1.2 or later
- **Storage**: 5MB for application, variable for cached images

<hr>

# Technical Implementation
The client is built for Mac OS 7-9 systems, with a particular focus on supporting the sub-megapixel digital cameras of the mid-to-late 1990s. It's a native application written in C using Metrowerks CodeWarrior Pro 4, creating a fat binary that runs on both 68k and PowerPC Macs. This was not developed in a VM; this was made on a real Power Macintosh G3 desktop and a bookcase full of Inside Macintosh volumes.

## Networking Stack
There are several Internet-aware applications for the Classic Mac OS, but the biggest limitation for this ecosystem is the absence of a SSL and TLS. Without SSL and TLS, you can't open a website that begins with HTTPS, and doing anything like 'logging in' and 'pulling from the API' are fever dreams of madmen. I _had_ to get SSL and TLS working before doing anything else.

The application uses Open Transport for its core networking capabilities, but Open Transport does not have SSL/TLS functionality. The [Mbed-TLS](https://github.com/Mbed-TLS/mbedtls) library is a small, portable TLS library that will give me what I need. There is proof it will work with my system; [SSHeven](https://github.com/cy384/ssheven) is an SSH implementation for the Mac OS 7/8/9 that also uses mbedtls, though it does this through cross-compilation and [Retro68](https://github.com/autc04/Retro68/). All I need to do is port the mbedtls code to something that will compile and run in Codewarrior. 

### SSL Implementation Challenges

Mbedtls was written for C99 compilers, but my version of CodeWarrior only supports C89/C90. The transition required significant code modifications:

* Creating compatibility layers for modern C integer types
* Restructuring code to declare variables at block beginnings (C89 requirement)
* Addressing include path limitations in Mac's archaic file system

That last bit -- addressing the path limitations -- is a big one. You know how you can write `#include "mbedtls/aes.h"`, and the compiler will pull in code from the `aes.h` file that's in the `mbedtls` folder? You can't do that on a Mac! There is a text-based file location sort of _thing_ in the classic Mac OS, but I couldn't find any way to use that in Codewarrior. Yeah, it was fun.

The biggest problem? **C89 doesn’t support method overloading or variadic macros**—two things modern C devs take for granted. That means no superprint(...) macros and no same-name functions that take different arguments. Refactoring this across a massive library like mbedtls? Painful. This was an incredibly time consuming and boring fix, but now I have a C89 port of mbedtls.

### Entropy Collection Nightmare

I've discovered a great plot hole in an Asimov short story. If you're wondering how to massively reduce the net entropy of the universe, forget about a computer trillions of years in the future. Just use one built thirty years ago.

The classic Mac OS has very little entropy, something required for high-quality randomness. This meant my SSL implementation gave the error code `MBEDTLS_ERR_ENTROPY_SOURCE_FAILED`. I created a custom entropy collection system that draws from multiple sources including: • System clock at microsecond resolution • Mouse movement tracking • Hardware timing variation • Network packet timing with `OTGetTimeStamp()` • The name of files in the System folder • The amount of time it takes for the screensaver to activate

All of these sources are combined and XORed together for a pool of randomness that's sufficient for crypto operations. I wouldn't exactly call this _random_, but it's random enough to initialize the crypto subsystems in mbedtls. It works, but I make no guarantees about its security of this entropy function. *This mbedtls implementation should be considered insecure*.

### SSL Handshake Failures

Getting entropy working was only half the battle. The SSL handshake was still failing—often, and with cryptic error codes like:

* 26880 (0xFFFF9700): MBEDTLS_ERR_SSL_FATAL_ALERT_MESSAGE
* 30848 (0xFFFF8780): MBEDTLS_ERR_X509_UNKNOWN_VERSION
* 30592 (0xFFFF8880): MBEDTLS_ERR_X509_CERT_VERIFY_FAILED

Fixing these handshake issues required a full audit of the mbedTLS configuration. I disabled OS-specific modules like `MBEDTLS_NET_C` and `MBEDTLS_TIMING_C`, and enabled proper certificate support with `MBEDTLS_CERTS_C`. I removed problematic elliptic curve code such as `MBEDTLS_ECP_INTERNAL_ALT`, since it wasn’t needed and tended to break things. I expanded support for older TLS versions, allowing 1.0 through 1.2—because anything newer simply doesn’t work on this hardware. A carefully selected set of cipher suites was chosen to avoid overloading these ancient machines. I also had to write custom `ot_send` and `ot_recv` functions for Open Transport, and hook them into `mbedtls_ssl_set_bio()` to make sure the I/O layer actually routed data where it was supposed to.

Then there was a fun little surprise: flow control bugs in the SSL stack sometimes threw up false positives—reporting “handshake successful” even when the handshake had actually failed. I had to dig into the error handling and implement proper retry logic, especially around non-blocking sockets. It wasn’t just broken—it was misleadingly broken. Great.

### Memory, Resources, and Debugging

Despite a lot of work, I was still getting an error during the SSL handshake. The only way I had to debug this was MbedTLS' built-in debugging capability. This usually writes to the console with `printf` statements... but the classic Mac doesn't have a console. Or `printf`, really. So I implemented my own. This reqired rewriting the debug code, then modifying all the calls to the debug code totalling about a thousand statements spread throughout the library. This was tedious.

The basic structure of my prototype app dumped all of the debug info to a text box, specifically a TETextBox, as it is called in the Macintosh Toolbox. A TETextBox can hold somewhere around 32000 characters, after which things stop working as intended. This was fixed by also writing debug information to a file. This allowed for a complete capture of _everything_ related to the SSL handshake and I was quickly able to debug the program.

## Image Processing

For JPEG decoding, I've integrated Aaron Giles' JPEG library, specifically designed for Classic Mac OS systems. This optimized library provides efficient decoding even on 68k processors, allowing smooth display of images on systems ranging from an SE/30 to PowerPC machines.

```c
OSErr DecodeAndDisplayJPEG(char* jpegData, long dataSize, short imageIndex) {
    OSErr err = noErr;
    JpegInfo jpegInfo;
    GWorldPtr jpegGWorld = NULL;
    
    // Initialize the JPEG decoder
    if (!JpegInit(&jpegInfo, jpegData, dataSize)) {
        return -1; // Decoder initialization error
    }
    
    // Create GWorld for the decoded image
    SetRect(&gImages[imageIndex].originalSize, 0, 0, 
            jpegInfo.width, jpegInfo.height);
    
    err = NewGWorld(&jpegGWorld, 32, 
                    &gImages[imageIndex].originalSize, NULL, NULL, 0);
    if (err != noErr) {
        JpegFree(&jpegInfo);
        return err;
    }
    
    // Configure and execute the decode operation
    PixMapHandle pmh = GetGWorldPixMap(jpegGWorld);
    LockPixels(pmh);
    
    JpegSetTarget(&jpegInfo, (unsigned char*)GetPixBaseAddr(pmh), 
                  (*pmh)->rowBytes & 0x3FFF);
    
    if (!JpegDecode(&jpegInfo)) {
        err = -1;
    } else {
        // Create PicHandle for display
        GrafPtr savePort;
        GetPort(&savePort);
        SetPort((GrafPtr)jpegGWorld);
        
        gImages[imageIndex].picture = OpenPicture(&gImages[imageIndex].originalSize);
        CopyBits((BitMap*)*pmh, &((GrafPtr)jpegGWorld)->portBits, 
                &gImages[imageIndex].originalSize, 
                &gImages[imageIndex].originalSize, 
                srcCopy, NULL);
        ClosePicture();
        
        SetPort(savePort);
        gImages[imageIndex].loaded = true;
    }
    
    // Clean up
    UnlockPixels(pmh);
    DisposeGWorld(jpegGWorld);
    JpegFree(&jpegInfo);
    
    return err;
}
```

### Memory Management

Special attention has been paid to memory constraints common in vintage Macs. The application uses handle-based memory management and implements intelligent purging strategies to minimize RAM requirements:

```c
void OptimizeMemoryUsage(void) {
    short i;
    
    // Make image handles purgeable when not visible
    for (i = 0; i < MAX_IMAGES; i++) {
        if (gImages[i].loaded && gImages[i].picture != NULL) {
            if (i == gCurrentImageIndex && gImageDetailsMode) {
                // Currently visible image - keep in memory
                HNoPurge((Handle)gImages[i].picture);
            } else {
                // Not currently visible - allow Memory Manager to purge if needed
                HPurge((Handle)gImages[i].picture);
            }
        }
    }
}
```

## The UI

Milipixel supports a truly vast range of screen resolutions from `512x342` of the 68030 compact Macs (and the LC II I'm using for testing) up to `1024x768` and higher. By counting the number of pixels, the range of resolutions is nearly _an order of magnitude_. Today we can take for granted that a picture 1024 posted to the Internet will look good -- everyone's screen is that wide, and if it's not the operating system will scale it properly. Not so on the Mac! I struggled some time coming up with a user interface that would work as well with an SE/30 as it would with a Bondi Blue iMac.

The initial idea was to capitalize on the server-side resizing of [640by480.com](https://640by480.com/). When uploading a file to the website, it resizes that image to two sizes -- one with a bounding box of 250x250, and another with a bounding box of 640x640. If the aspect ratio is correct, this means I will get an images either `250x187` or `187x250`, and `640x480` or `480x640`. Displaying thumbnails on the smallest screen is of paramount importance, but unfortunately with a screen resolution of `512x324` I could only display two images at a time -- not exactly an 'instagram built in 1994' experience.

I needed inspiration on how to lay these images out on a screen, so I turned to old Mac video games. Shufflepuck told me I could hide the menu bar to get a few extra pixels, and I was deeply influenced by Escape Velocity Nova with a main screen with a side bar for navigation. But none of these really worked until I remembered....

![Sim City 2000, the inspiration for my UI layout](/images/SC2KUI.png)

SimCity 2000. As a UI this is brilliant. At the top, there's a menu bar, which gives me the File menu, a View menu, and even an Edit menu for copy and paste. The main screen is the map view, with scroll bars, and I can scroll around the entire screen. This window can be moved and resized. It's exactly what I need.

So the UI is settled -- I'll use a main window where the viewport is a much larger virtual canvas where I'll put the thumbnails. The zoom control means I don't necessarily need to worry about dozens of different resolutions. Drop a dozen or so images on a gigantic viewport, and I can zoom and scroll to my heart's delight. Clicking on an image opens up a new window with the 'large' version of the pic and the author, description, and comments for that post. SimCity 2000 is the inspiration for the UI, and it will work really, really well.


## Development Notes

This client represents a fascinating intersection of vintage and modern technology. While developing for Classic Mac OS presents unique challenges, especially in networking and memory management, it's been rewarding to create software that gives these vintage systems new life in the modern internet landscape.

Future work will go into supporting the QuickTake camera's direct connection capabilities, allowing direct import from camera to application to the Internet. Additionally, I may also add in support for MacTCP, obliviating the requirement for OpenTransport. I'm not especially confident a transition to MacTCP can be done, but I will investigate the possibility further.

## About the Developer

I'm a vintage Mac enthusiast focused on creating software that connects classic machines to modern services. My other projects include [GitRez](https://github.com/bbenchoff/GitRez), a GitHub client for Classic Mac OS, and [Nedry](https://github.com/bbenchoff/Nedry), a recreation of the Unix system seen in Jurassic Park.

[back to main page](../)


[back](../)
