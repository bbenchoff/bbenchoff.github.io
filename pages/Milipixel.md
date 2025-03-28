---
layout: default


---

# Milipixel: A Classic Mac Client for Vintage Digital Photography

![Milipixel Box Art](/images/MilipixelBoxArt.png)

## What is Milipixel?

Milipixel is a photo sharing app for classic Macintosh hardware focused on vintage digital photography. The platform celebrates the distinctive CCD sensor aesthetic of early digital cameras like the Apple QuickTake, Kodak DCS-420, early Sony Mavica, and Casio QV series.

This page details the Classic Mac client application that connects these vintage systems to the [Milipixel.com](https://milipixel.com) platform.

## Technical Implementation
The client is built for Mac OS 7-9 systems, with a particular focus on supporting the sub-megapixel digital cameras of the mid-to-late 1990s. It's a native application written in C using Metrowerks CodeWarrior Pro 4, creating a fat binary that runs on both 68k and PowerPC Macs. This was not developed in a VM; this was made on a real Power Macintosh G3 desktop and a bookcase full of Inside Macintosh.

## Networking Stack
There are several Internet-aware applications for the Classic Mac OS, but the biggest limitation for this ecosystem is the absence of a SSL and TLS. Without SSL and TLS, you can't open a website that begins with HTTPS, and doing anything like 'logging in' and 'pulling from the API' are fever dreams of madmen. I _have_ to get SSL and TLS working before doing anything else.

The application uses Open Transport for its core networking capabilities, but Open Transport does not have SSL/TLS functionality. The [Mbed-TLS](https://github.com/Mbed-TLS/mbedtls) library is a small, portable TLS library that will give me what I need. There is proof it will work with my system; [SSHeven](https://github.com/cy384/ssheven) is an SSH implementation for the Mac OS 7/8/9 that also uses mbedtls, though it does this through cross-compilation and [Retro68](https://github.com/autc04/Retro68/). All I need to do is port the mbedtls code to something that will compile and run in Codewarrior. 

### SSL Implementation Challenges

Mbedtls was written for C99 compilers, but my version of CodeWarrior only supports C89/C90. The transition required significant code modifications:

* Creating compatibility layers for modern C integer types
* Restructuring code to declare variables at block beginnings (C89 requirement)
* Addressing include path limitations in Mac's archaic file system

That last bit -- addressing the path limitations -- is a big one. You know how you can write `#include "mbedtls/aes.h"`, and the compiler will pull in code from the `aes.h` file that's in the `mbedtls` folder? You can't do that on a Mac! There is a text-based file location sort of _thing_ in the classic Mac OS, but I couldn't find any way to use that in Codewarrior. Yeah, it was fun.

The biggest problem? **C89 doesn't support variadic macros or method overloading. 64-bit ints are completely unknown on this platform** Holy hell this is annoying as shit. If you don't know what I'm talking about, here's an example of method overloading:

```c
void print(int x);
void print(const char* s);
```

Those are two functions, both of them return nothing, but one of them takes an int, and the other a string. _They're both named the same thing_. This works if you have method overloading, like is found in C99. C89/90 doesn't have it, and it's a bitch and a half to port C89 code to C99 because of this. This also shows up in variadic macros, which I believe is a portmanteau of _variable argument_. It's something like this

```c
#define superprint(...) fprintf(stderr, __VA_ARGS__);
```

This is a way to do something like method overloading, but using the preprocessor instead of the language itself. Obviously we see more method overloading this century simply because languages support it now, so different names for the same thing, I guess.

Yeah, this was an incredibly time consuming and boring fix. But now I have a C89 port of mbedtls.

### Entropy Collection Nightmare

I've discoverd a great plot hole in an Asimov short story. If you're wondering how can the net amount of entropy of the universe be massively decreased, the answer isn't to use a computer trillions of years in the future, the answer is to use a computer built thirty years ago.

The classic Mac OS has very little entropy, something required for high-quality randomness. This meant my SSL implementation gave the error code `MBEDTLS_ERR_ENTROPY_SOURCE_FAILED`. I created a custom entropy collection system that draws from multiple sources:

* System clock and tick counts at microsecond resolution
* Mouse movement tracking
* Memory states and allocation patterns
* Hardware timing variations
* Network packet timing with OTGetTimeStamp()
* TCP sequence numbers and connection statistics
* Time delays between user interactions
* The amount of time it takes for the screensaver to activate

All of these sources are combined and XORed together for a pool of randomness that's sufficient for crypto operations. I wouldn't exactly call this _random_, but it's random enough to initialize the crypto subsystems in mbedtls. It works, but I make no guarantees about its security of this entropy function. *This mbedtls implementation should be considered insecure*.

### SSL Handshake Failures

Even after solving the entropy issues, the SSL handshake failures persisted with strange error codes:

* -26880 (0xFFFF9700): MBEDTLS_ERR_SSL_FATAL_ALERT_MESSAGE
* -30848 (0xFFFF8780): MBEDTLS_ERR_X509_UNKNOWN_VERSION
* -30592 (0xFFFF8880): MBEDTLS_ERR_X509_CERT_VERIFY_FAILED

Resolving these required extensive config adjustments:

* Disabling OS-specific modules (MBEDTLS_NET_C, MBEDTLS_TIMING_C)
* Enabling proper certificate handling via MBEDTLS_CERTS_C
* Removing problematic ECP implementations (MBEDTLS_ECP_INTERNAL_ALT)
* Expanding TLS version support range (1.0-1.2)
* Selecting compatible cipher suites for older hardware
* Custom implementations of networking functions (ot_send, ot_recv)
* Correct integration with mbedtls_ssl_set_bio()

Flow control issues also caused misleading "SSL handshake successful" messages after failed handshakes, requiring fixes to properly handle errors and implementing better retry logic for non-blocking I/O.

### Memory, Resources, and Debugging

///Something about memory, and resources

Despite a lot of work, I was still getting an error during the SSL handshake. The only way I had to debug this was MbedTLS' built-in debugging capability. This usually writes to the console with `printf` statements... but the classic Mac doesn't have a console. Or `printf`, really. So I implemented my own. This reqired rewriting the debug code, then modifying all the calls to the debug code totalling about 600 statements spread throughout the library. This was tedious.

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

## System Requirements

- **Processor**: 68030 or better (optimized for PowerPC)
- **RAM**: 4MB minimum, 8MB recommended
- **System**: Mac OS 7.1 through Mac OS 9.2.2
- **Display**: 512x384 minimum resolution
- **Networking**: Open Transport 1.1.2 or later
- **Storage**: 5MB for application, variable for cached images

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

## Development Notes

This client represents a fascinating intersection of vintage and modern technology. While developing for Classic Mac OS presents unique challenges, especially in networking and memory management, it's been rewarding to create software that gives these vintage systems new life in the modern internet landscape.

Future work will go into supporting the QuickTake camera's direct connection capabilities, allowing direct import from camera to application to the Internet. Additionally, I may also add in support for MacTCP, obliviating the requirement for OpenTransport. I'm not especially confident a transition to MacTCP can be done, but I will investigate the possibility further.

## About the Developer

I'm a vintage Mac enthusiast focused on creating software that connects classic machines to modern services. My other projects include [GitRez](https://github.com/bbenchoff/GitRez), a GitHub client for Classic Mac OS, and [Nedry](https://github.com/bbenchoff/Nedry), a recreation of the Unix system seen in Jurassic Park.

[back to main page](../)


[back](../)
