---
layout: default


---

# A C89/C90 port of Mbed-TLS for Mac System 7/8/9

There is one thing holding back classic Mac development: modern web encryption. It's a problem. Even though Macs from Performas up to the original iMac were contemporaneous with the early Internet, there are very few applications aware of the modern Internet with HTTPS, SSL, TLS, and all that computationally-expensive encryption. [Classilla](https://www.floodgap.com/software/classilla/) and [iCab](https://www.icab.de/) make a good attempt, but support for modern encryption is still limited. That's not to say it's impossible:  [SSHeven](https://github.com/cy384/ssheven) is an SSH implementation for the Mac OS 7/8/9 that also uses Mbed-TLS, though it does this through cross-compilation and [Retro68](https://github.com/autc04/Retro68/).

If I want to write Internet-aware applications _on_ a classic Mac, I need to port an SSL library. That's what I did here. It's just a proof of concept, but it is a (mostly) complete port of [Mbed-TLS](https://github.com/Mbed-TLS/mbedtls) compiled on a Power Macintosh G3 desktop using Metrowerks Codewarrior Pro 4.

![picture of the app running](/images/soeadsfadsfasdf)

## Technical Implementation
The client is built for Mac OS 7-9 systems using OpenTransport. Right now it's effectively a proof of concept pulling JSON data from the API on [640by480.com](https://640by480.com/), my weird little 'Instagram for vintage digital cameras'. But this works. I'm getting data over HTTPS. This is also the first time I'm aware of that a Mac SE/30 can read data over HTTPS without using a proxy server. 

### SSL Implementation Challenges

Mbedtls was written for C99 compilers, but my version of CodeWarrior only supports C89/C90. The transition required significant code modifications:

* Creating compatibility layers for modern C integer types
* Implementing 64-bit integer emulation
* Restructuring code to declare variables at block beginnings (C89 requirement)
* Addressing include path limitations in Mac's un-*NIX-like file system

That last bit -- addressing the path limitations -- is a big one. You know how you can write `#include "mbedtls/aes.h"`, and the compiler will pull in code from the `aes.h` file that's in the `mbedtls` folder? You can't do that on a Mac! There is a text-based file location sort of _thing_ in the classic Mac OS, but I couldn't find any way to use that in Codewarrior. The solution is basically to put all the files from Mbed-TLS into the project as a flat directory. Yes, Metroworks Codewarrior has an option for DOS/UNIX-like file paths when importing files, but I couldn't figure out how to do that.

The biggest problem? **C89 doesn't support variadic macros or method overloading. 64-bit ints are completely unknown on this platform** Holy hell this is annoying as shit. If you don't know what I'm talking about, here's an example of method overloading:

```c
void print(int x);
void print(const char* s);
```

Those are two functions, both of them return nothing, but one of them takes an int, and the other a string. _They're both named the same thing_. This works if you have method overloading, like is found in C99. C89/90 doesn't have it, and it's a bitch and a half to port C89 code to C99 because of this. This also shows up in variadic macros, which I believe is a portmanteau of _variable argument_. It's something like this:

```c
#define superprint(...) fprintf(stderr, __VA_ARGS__);
```

This is a way to do something like method overloading, but using the preprocessor instead of the language itself. Obviously we see more method overloading this century simply because languages support it now, so different names for the same thing, I guess.

Yeah, this was an incredibly time consuming and boring fix.

### Conversion to 64-bit data structures

The mbedtls library uses 64-bit data types. `int64_t`, `uint64_t`, and the like. My compiler doesn't know what those are. So I need to create them. Out of fucking thin air and structs, I guess. This is done in a redefinition of `stdint.h`, shown below:

```c
/*
 * mac_stdint.h
 * 
 * Compatibility header providing C99 fixed-width integer types
 * for CodeWarrior Pro 4 on Classic Mac OS
 */

#ifndef MAC_STDINT_H
#define MAC_STDINT_H

/* Include Mac OS types */
#include <Types.h>

/* 
 * Define fixed width integer types based on Mac OS types
 * Classic Mac OS on 68K processors is big-endian
 */

/* Exact-width signed integer types */
typedef signed char        int8_t;
typedef short              int16_t;
typedef long               int32_t;

/* Exact-width unsigned integer types */
typedef unsigned char      uint8_t;
typedef unsigned short     uint16_t;
typedef unsigned long      uint32_t;

/* Minimum-width signed integer types */
typedef signed char        int_least8_t;
typedef short              int_least16_t;
typedef long               int_least32_t;

/* Minimum-width unsigned integer types */
typedef unsigned char      uint_least8_t;
typedef unsigned short     uint_least16_t;
typedef unsigned long      uint_least32_t;

/* Fast minimum-width signed integer types */
typedef signed char        int_fast8_t;
typedef short              int_fast16_t;
typedef long               int_fast32_t;

/* Fast minimum-width unsigned integer types */
typedef unsigned char      uint_fast8_t;
typedef unsigned short     uint_fast16_t;
typedef unsigned long      uint_fast32_t;

/* Greatest-width integer types */
typedef long               intmax_t;
typedef unsigned long      uintmax_t;

/* Integer type capable of holding a pointer */
typedef long               intptr_t;
typedef unsigned long      uintptr_t;

/* Limits of exact-width integer types */
#define INT8_MIN           (-128)
#define INT16_MIN          (-32767-1)
#define INT32_MIN          (-2147483647L-1)

#define INT8_MAX           127
#define INT16_MAX          32767
#define INT32_MAX          2147483647L

#define UINT8_MAX          255U
#define UINT16_MAX         65535U
#define UINT32_MAX         4294967295UL

/* Limits of minimum-width integer types */
#define INT_LEAST8_MIN     INT8_MIN
#define INT_LEAST16_MIN    INT16_MIN
#define INT_LEAST32_MIN    INT32_MIN

#define INT_LEAST8_MAX     INT8_MAX
#define INT_LEAST16_MAX    INT16_MAX
#define INT_LEAST32_MAX    INT32_MAX

#define UINT_LEAST8_MAX    UINT8_MAX
#define UINT_LEAST16_MAX   UINT16_MAX
#define UINT_LEAST32_MAX   UINT32_MAX

/* Limits of fastest minimum-width integer types */
#define INT_FAST8_MIN      INT8_MIN
#define INT_FAST16_MIN     INT16_MIN
#define INT_FAST32_MIN     INT32_MIN

#define INT_FAST8_MAX      INT8_MAX
#define INT_FAST16_MAX     INT16_MAX
#define INT_FAST32_MAX     INT32_MAX

#define UINT_FAST8_MAX     UINT8_MAX
#define UINT_FAST16_MAX    UINT16_MAX
#define UINT_FAST32_MAX    UINT32_MAX

/* Limits of integer types capable of holding object pointers */
#define INTPTR_MIN         INT32_MIN
#define INTPTR_MAX         INT32_MAX
#define UINTPTR_MAX        UINT32_MAX

/* Limits of greatest-width integer types */
#define INTMAX_MIN         INT32_MIN
#define INTMAX_MAX         INT32_MAX
#define UINTMAX_MAX        UINT32_MAX

#define SIZE_MAX			UINT32_MAX

/* 
 * 64-bit types are not natively supported in Classic Mac OS on 68K
 * So here they are
 */
 
typedef struct {
	uint32_t high;
	uint32_t low;
} uint64_t;

typedef struct {
	int32_t high;
	int32_t low;
} int64_t;

/* Function to initialize a 64-bit value */
static inline uint64_t uint64_init(unsigned long high, unsigned long low)
{
	uint64_t result;
	result.high = high;
	result.low = low;
	return result;
}

/* Function to set a 64-bit value to zero */
static inline void uint64_zero(uint64_t *x)
{
	x->high = 0;
	x->low = 0;
}

static inline uint64_t uint64_shift_right(uint64_t x, int shift)
{
	uint64_t result;
	
	if(shift >= 32)
	{
		result.high = 0;
		result.low = x.high >> (shift - 32);
	} else {
		result.high = x.high >> shift;
		result.low = (x.low >> shift) | (x.high << (32 - shift));
	}
	
	return result;
	
}

static inline uint64_t uint64_shift_left(uint64_t x, int shift)
{
	uint64_t result;
	
	if(shift >= 32)
	{
		result.high = x.low << (shift - 32);
		result.low = 0;
	} else {
		result.high = (x.high << shift) | (x.low >> (32 - shift));
		result.low = x.low << shift;
	}
	return result;
}

static inline uint64_t uint64_xor(uint64_t a, uint64_t b)
{
	uint64_t result;
	result.high = a.high ^ b.high;
	result.low = a.low ^ b.low;
	return result;
}

static inline uint64_t uint64_or(uint64_t a, uint64_t b)
{
	uint64_t result;
	result.high = a.high | b.high;
	result.low = a.low | b.low;
	return result;
}

static inline uint64_t uint64_from_uint32_high(uint32_t x)
{
	uint64_t result;
	result.high = x;
	result.low = 0;
	return result;
}

static inline int uint64_less_than(uint64_t a, uint64_t b)
{
	if(a.high < b.high) return 1;
	if(a.high > b.high) return 0;
	return a.low < b.low;
}

static inline uint64_t uint64_add_size_t(uint64_t a, unsigned long b)
{
	uint64_t result;
	unsigned long temp = a.low +b;
	
	if(temp<a.low)
	{
		result.high = a.high + 1;
	} else {
		result.high = a.high;
	}
	result.low = temp;
	return result;
}

static inline uint64_t uint64_multiply_by_8(uint64_t x)
{
	uint64_t result;
	unsigned long carry;
		
	//check if shifting left by three would cause bits to shift from low to high
	carry = (x.low & 0xE0000000) >> 29; //extract top three bits
	
	result.low = x.low << 3;
	
	//shift high part left by three and add carry
	result.high = (x.high << 3) | carry;
	
	return result;
}

static inline int uint64_is_non_zero(uint64_t x)
{
	return(x.high != 0 || x.low != 0);
}

#define UINT64_C(h, l) ((uint64_t){(h), (l)})
#define INT64_C(h, l) ((int64_t){(h), (l)})

#define UINT64_LOW(x) ((x).low)
#define UINT64_HIGH(x) ((x).high)

#endif /* MAC_STDINT_H */

```

The mbedtls library does very few operations on these 64-bit data types, zeroing the values, xor and the like, and shifting right and left. This provides a basic framework for working with 64-bit data types, but it's not automatic. Every single 64-bit operation in the code needs to be modified. There's no fast way to do this, it's simply hitting compile, looking at the next error, changing that to something that will work, and hitting compile again.

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

### Certificate Handling

Yes, this code can handle certificates. 

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
