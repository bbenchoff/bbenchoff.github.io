---
layout: default


---

# A port of Mbed-TLS for Mac System 7/8/9

There is one thing holding back classic Mac development: modern web encryption. It's a problem. Even though Macs from Performas up to the original iMac were contemporaneous with the early Internet, there are very few applications aware of the modern Internet, with HTTPS, SSL, TLS, and all that computationally-expensive encryption. [Classilla](https://www.floodgap.com/software/classilla/) and [iCab](https://www.icab.de/) make a good attempt, but support for modern encryption is still limited. That's not to say it's impossible:  [SSHeven](https://github.com/cy384/ssheven) is an SSH implementation for the Mac OS 7/8/9 that also uses mbedtls, though it does this through cross-compilation and [Retro68](https://github.com/autc04/Retro68/).

If I want to write Internet-aware applications _on_ a classic Mac, I need to port an SSL library. That's what I did here. It's just a proof of concept, but it is a (mostly) complete port of [Mbed-TLS](https://github.com/Mbed-TLS/mbedtls) compiled on a Power Macintosh G3 desktop using Metrowerks Codewarrior Pro 4.

![picture of the app running](/images/soeadsfadsfasdf)

## Technical Implementation
The client is built for Mac OS 7-9 systems, with a particular focus on supporting the sub-megapixel digital cameras of the mid-to-late 1990s. It's a native application written in C using Metrowerks CodeWarrior Pro 4, creating a fat binary that runs on both 68k and PowerPC Macs. This was not developed in a VM; this was made on a real Power Macintosh G3 desktop and a bookcase full of Inside Macintosh.

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

### Conversion to 64-bit data structures

The mbedtls library uses 64-bit data types. `int64_t`, `uint64_t`, and the like. My compiler doesn't know what those are. So I need to create them. Out of fucking thin air and structs, I guess. This is done in a redefinition of `stdint.h`, shown below:

```c
/* This is the definition of 64-bit data types */

typedef struct {
    uint32_t high;
    uint32_t low;
} uint64_t;

typedef struct {
    int32_t high;
    int32_t low;
} int64_t

```

The mbedtls library does very few operations on these 64-bit data types, zeroing the values and shifting right, mostly. In the same header file, I made a few functions which make that easier:

```c
/* Function to set a 64-bit value to zero */
static inline void uint64_zero(uint64_t *x)
{
    x->high = 0;
    x->low = 0;
}

/* Function to shift a uint64_t right by some amount */
static inline uint64_t uint64_t_shift_right(uint64_t x, int shift)
{
    uint64_t result;

    if(shift >= 32)
    {
        result.high = 0;
        result.low = x.high >> (shift-32);
    } else {
        result.high = x.high >> shift;
        result.lot = (x.low >> shift) | (x.high << (32 - shift));
    }
    return result;
}
```

This provides a basic framework for working with 64-bit data types, but it's not automatic. Every single 64-bit operation in the code needs to be modified. There's no fast way to do this, it's simply hitting compile, looking at the next error, changing that to something that will work, and hitting compile again. It takes forever.

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


[back](../)
