---
layout: default


---

# Milipixel: A Classic Mac Client for Vintage Digital Photography

<img src="/images/MilipixelScreenshot.png" alt="Milipixel Client Screenshot" align="right" hspace="10" width="350">

## What is Milipixel?

Milipixel is a complete ecosystem for vintage digital photography, bridging 1990s hardware with modern image sharing. The platform celebrates the distinctive aesthetic of early digital cameras like the Apple QuickTake, Kodak DCS-420, early Sony Mavica, and Casio QV series.

This page details the Classic Mac client application that connects these vintage systems to the [Milipixel.com](https://milipixel.com) platform.

## Technical Implementation

The client is built for Mac OS 7-9 systems, with a particular focus on supporting the sub-megapixel digital cameras of the mid-to-late 1990s. It's a native application written in C/C++ using Metrowerks CodeWarrior Pro 4, creating a fat binary that runs on both 68k and PowerPC Macs. This was not developed in a VM; this was made on a real Power Macintosh G3 desktop and a bookcase full of _Inside Macintosh_.

### Networking Stack

The application uses OpenTransport for its core networking capabilities, combined with a compact implementation of wolfSSL to enable secure HTTPS connections to the Milipixel API. This approach allows even vintage Macs to connect securely to modern web services without compromising on encryption standards.

```c
/* Example of our secure connection setup */
OSStatus EstablishSecureConnection(void) {
    OSStatus err = noErr;
    
    // Initialize wolfSSL
    wolfSSL_Init();
    
    // Create a new wolfSSL context
    WOLFSSL_CTX* ctx = wolfSSL_CTX_new(wolfTLSv1_2_client_method());
    if (ctx == NULL) {
        return -1;
    }
    
    // Establish TCP connection first through OpenTransport
    err = ConnectToServer();
    if (err != noErr) {
        wolfSSL_CTX_free(ctx);
        return err;
    }
    
    // Create wolfSSL object
    WOLFSSL* ssl = wolfSSL_new(ctx);
    if (ssl == NULL) {
        DisconnectFromServer();
        wolfSSL_CTX_free(ctx);
        return -1;
    }
    
    // Set up custom I/O functions that use OpenTransport
    wolfSSL_SetIORecv(ctx, OpenTransportReceive);
    wolfSSL_SetIOSend(ctx, OpenTransportSend);
    
    // Perform the TLS handshake
    int ret = wolfSSL_connect(ssl);
    if (ret != SSL_SUCCESS) {
        // Handle error
        DisconnectFromServer();
        wolfSSL_free(ssl);
        wolfSSL_CTX_free(ctx);
        return -1;
    }
    
    // Store the SSL context for later use
    gSSL = ssl;
    gSSLContext = ctx;
    
    return noErr;
}
```

### Image Processing

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

<img src="/images/MilipixelGridView.png" alt="Thumbnail Grid View" align="left" hspace="10" width="250">

### Viewing Experience

- **Thumbnail Grid**: A clean 2×2 grid for browsing multiple images
- **Detail View**: Full-screen viewing of individual images
- **Adaptive Scaling**: Automatically scales images to fit window size while preserving aspect ratio
- **EXIF Display**: Shows available camera metadata (when present)

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
- **RAM**: 8MB minimum, 32MB recommended
- **System**: Mac OS 7.1 through Mac OS 9.2.2
- **Display**: 640×480 minimum resolution with 256 colors
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

Particular attention was paid to supporting the QuickTake camera's direct connection capabilities, allowing direct import from camera to application on suitably equipped Macs.

Future versions will include more social features and potentially support for more obscure vintage camera formats beyond JPEG.

## About the Developer

I'm a vintage Mac enthusiast focused on creating software that connects classic machines to modern services. My other projects include [GitRez](https://github.com/bbenchoff/GitRez), a GitHub client for Classic Mac OS, and [Nedry](https://github.com/bbenchoff/Nedry), a recreation of the Unix system seen in Jurassic Park.

[back to main page](../)


[back](../)
