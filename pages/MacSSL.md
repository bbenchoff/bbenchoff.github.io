---
layout: default
title: "Mbed-TLS Port for Classic Mac OS"
description: "Implementation of modern SSL/TLS security for Classic Macintosh OS 7/8/9 using Mbed-TLS"
keywords: ["Classic Mac OS", "SSL/TLS", "Mbed-TLS", "vintage computing", "retro development", "encryption", "Mac System 7", "network security"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-04-15
image: "/images/MacSSL1.png"
---

# MacSSL
## A port of Mbed-TLS for the Classic Macintosh OS 7/8/9

_Note: this repository will never change. It's a proof of concept and template._

This is a C89/C90 port of MbedTLS for Mac System 7/8/9. It works, and compiles under Metrowerks Codewarrior Pro 4. Here's the proof:

![Proof of pulling an API request down](https://bbenchoff.github.io/images/640by480Client.png){: loading="lazy" alt="Proof of pulling an API request down"}

And here's the repository: [https://github.com/bbenchoff/MacSSL](https://github.com/bbenchoff/MacSSL).

This is a basic app that performs a GET request on whatever is in api.h, and prints the result out to the text box (with a lot of debug information, of course). The idea of this project was to build an 'app' of sorts for [640by480](https://640by480.com/), my 'instagram clone for vintage digital cameras'. The idea would be to login, post images, view images, and read comments. I would need HTTPS for that, so here we are: a port of MbedTLS for the classic mac.

## What this port is based on, and limitations

This port is based on [polarssl](https://github.com/cuberite/polarssl), itself a fork of [Mbed-TLS](https://github.com/Mbed-TLS/mbedtls), version 2.29.9, or thereabouts. This is a C library that implements the crypto primitives, X.509 certificate manipulation, and the SSL/TLS protocols.

Currently, the bare minimum configuration of this library supports the following:

### Ciphersuites
* `MBEDTLS_TLS_RSA_WITH_AES_128_CBC_SHA`
* `MBEDTLS_TLS_RSA_WITH_AES_256_CBC_SHA`

### Elliptic Curves
* `MBEDTLS_ECP_DP_SECP256R1`

### Signature Algorithms
* `SHA-256 + RSA`
* `SHA-384 + RSA`
* `SHA-1 + RSA`

### Certificate Handling
* Root cert `ISRG Root X1`
* Intermediate cert `Let's Encrypt R11`

All of this is wrapped up into support for `TLS 1.1`. This was enough for what _I_ wanted to do, but it provides a basic framework for adding `TLS 1.2`, additional ciphersuites like `ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256`, and more elliptic curves such as `ECP_DP_CURVE25519`. The framework is there, but if you want to add these it's going to take a little work.

## The Example App

This repository produces a FAT-compiled application for Mac System 7/8/9. It works through the OpenTransport library, i.e. MacTCP is not supported. This application sends a GET request to the API endpoint of a server [https://640by480.com/api/v1/posts](https://640by480.com/api/v1/posts), and returns the results to a text box, and also writes a file to the disk in the same location the application is run from. This file, `SSL-Debug.txt`, also saves the debug info from `mbedtls_debug_set_threshold()`; the value of this debug threshold can be adjusted in `SSLWrapper.c`. More info on that below.

## SSL Implementation Challenges

Mbedtls was written for C99 compilers, but my version of CodeWarrior only supports C89/C90. The transition required significant code modifications:

* Creating compatibility layers for modern C integer types
* Implementing 64-bit integer emulation
* Restructuring code to declare variables at block beginnings (C89 requirement)
* Addressing include path limitations in Mac's un-*NIX-like file system

That last bit -- addressing the path limitations -- is a big one. You know how you can write `#include "mbedtls/aes.h"`, and the compiler will pull in code from the `aes.h` file that's in the `mbedtls` folder? You can't do that on a Mac! Or at least I couldn't figure out how Codewarrior defines paths.  The solution is basically to put all the files from Mbed-TLS into the project as a flat directory.

The biggest problem? **C89 doesn't support variadic macros or method overloading. 64-bit ints are completely unknown on this platform**. If you don't know what I'm talking about, here's an example of method overloading:

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

The mbedtls library uses 64-bit data types. `int64_t`, `uint64_t`, and the like. My compiler doesn't know what those are. So I need to create them. This is done in a redefinition of `stdint.h`, shown below:

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

After finishing this header file, I had a mostly complete 64-bit data type written for a system that really didn't support it in the first place.

## Entropy Collection Nightmare

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

## Certificate Handling

Yes, this code can handle certificates. The current certificate handling is set to `OPTIONAL`, but it does work when `REQUIRED`.

The root certificate is the ISRG Root X1, and the intermediate certificate is the Let's Encrypt R11. This provides enough to connect to the end certificate for 640by480.com. Root certificate trust is stored in the code at SSLWrapper.c.

## Debug Log

As mentioned above, this app has two methods of output: it displays information (and eventually the result of the GET request) to a textbox. It also saves _everything_ to a file on disk. This bifurcation of debug information is due to the 32k limit of a TETextBox of the classic Macintosh Toolbox. This window cannot display more than 32000 characters without a bit of work, and the combination of debug information and the GET result will probably push that over the 32k limit.

This means I can save all of the SSL debug information to a file, and paste it here. This is the internal debug info of a connection with this app:

```
=== SSL DEBUG LOG STARTED ===
SSL DBG [2] => write close notify
SSL DBG [2] <= write close notify
SSL DBG [2] => free
SSL DBG [2] <= free
SSL DBG [2] => handshake
SSL DBG [2] client state: 0
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] client state: 1
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => write client hello
SSL DBG [3] client hello, max version: [3:2]
SSL DBG [3] dumping 'client hello, random bytes' (32 bytes)
SSL DBG [3] 0000:  95 08 1f c2 40 ed 62 08 c2 e1 e2 0b f1 b1 fa 1d  ....@.b.........
SSL DBG [3] 0010:  26 1f a1 02 40 74 b1 58 29 f4 73 b1 de d3 6c a3  &...@t.X).s...l.
SSL DBG [3] client hello, session id len.: %zu
SSL DBG [3] dumping 'client hello, session id' (0 bytes)
SSL DBG [3] client hello, add ciphersuite: 0x2f (TLS-RSA-WITH-AES-128-CBC-SHA)
SSL DBG [3] client hello, add ciphersuite: 0x35 (TLS-RSA-WITH-AES-256-CBC-SHA)
SSL DBG [3] client hello, got %zu ciphersuites (excluding SCSVs)
SSL DBG [3] adding EMPTY_RENEGOTIATION_INFO_SCSV
SSL DBG [3] client hello, compress len.: 1
SSL DBG [3] client hello, compress alg.: 0
SSL DBG [3] client hello, adding server name extension: 640by480.com
SSL DBG [3] client hello, total extension length: %zu
SSL DBG [2] => write handshake message
SSL DBG [2] => write record
SSL DBG [3] output record: msgtype = 22, version = [3:2], msglen = %zu
SSL DBG [4] dumping 'output record sent to network' (77 bytes)
SSL DBG [4] 0000:  16 03 02 00 48 01 00 00 44 03 02 95 08 1f c2 40  ....H...D......@
SSL DBG [4] 0010:  ed 62 08 c2 e1 e2 0b f1 b1 fa 1d 26 1f a1 02 40  .b.........&...@
SSL DBG [4] 0020:  74 b1 58 29 f4 73 b1 de d3 6c a3 00 00 06 00 2f  t.X).s...l...../
SSL DBG [4] 0030:  00 35 00 ff 01 00 00 15 00 00 00 11 00 0f 00 00  .5..............
SSL DBG [4] 0040:  0c 36 34 30 62 79 34 38 30 2e 63 6f 6d           .640by480.com
SSL DBG [2] => flush output
SSL DBG [2] message length: %zu, out_left: %zu
SSL DBG [2] ssl->f_send() returned 77 (-0xffffffb3)
SSL DBG [2] <= flush output
SSL DBG [2] <= write record
SSL DBG [2] <= write handshake message
SSL DBG [2] <= write client hello
SSL DBG [2] client state: 2
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => parse server hello
SSL DBG [2] => read record
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 5 (-0xfffffffb)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record header' (5 bytes)
SSL DBG [4] 0000:  16 03 02 00 55                                   ....U
SSL DBG [3] input record: msgtype = 22, version = [3:2], msglen = %zu
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 85 (-0xffffffab)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record from network' (90 bytes)
SSL DBG [4] 0000:  16 03 02 00 55 02 00 00 51 03 02 47 08 e7 7a 96  ....U...Q..G..z.
SSL DBG [4] 0010:  68 af 36 03 e3 9d 56 d0 a3 e9 23 df 95 c7 c8 e4  h.6...V...#.....
SSL DBG [4] 0020:  7f 98 b9 44 4f 57 4e 47 52 44 00 20 79 36 3f 83  ...DOWNGRD. y6?.
SSL DBG [4] 0030:  e5 a0 e5 be 30 00 62 a4 72 53 a8 30 61 1b 42 a2  ....0.b.rS.0a.B.
SSL DBG [4] 0040:  8d 48 a9 3f c1 a5 52 27 b4 f5 64 cd 00 2f 00 00  .H.?..R'..d../..
SSL DBG [4] 0050:  09 ff 01 00 01 00 00 00 00 00                    ..........
SSL DBG [3] handshake message: msglen = %zu, type = %u, hslen = %zu
SSL DBG [2] <= read record
SSL DBG [3] dumping 'server hello, version' (2 bytes)
SSL DBG [3] 0000:  03 02                                            ..
SSL DBG [3] server hello, current time: 1191765882
SSL DBG [3] dumping 'server hello, random bytes' (32 bytes)
SSL DBG [3] 0000:  47 08 e7 7a 96 68 af 36 03 e3 9d 56 d0 a3 e9 23  G..z.h.6...V...#
SSL DBG [3] 0010:  df 95 c7 c8 e4 7f 98 b9 44 4f 57 4e 47 52 44 00  ........DOWNGRD.
SSL DBG [3] server hello, session id len.: %zu
SSL DBG [3] dumping 'server hello, session id' (32 bytes)
SSL DBG [3] 0000:  79 36 3f 83 e5 a0 e5 be 30 00 62 a4 72 53 a8 30  y6?.....0.b.rS.0
SSL DBG [3] 0010:  61 1b 42 a2 8d 48 a9 3f c1 a5 52 27 b4 f5 64 cd  a.B..H.?..R'..d.
SSL DBG [3] no session has been resumed
SSL DBG [3] server hello, chosen ciphersuite: 002f
SSL DBG [3] server hello, compress alg.: 0
SSL DBG [3] server hello, chosen ciphersuite: TLS-RSA-WITH-AES-128-CBC-SHA
SSL DBG [2] server hello, total extension length: %zu
SSL DBG [3] found renegotiation extension
SSL DBG [3] unknown extension found: 0 (ignoring)
SSL DBG [2] <= parse server hello
SSL DBG [2] client state: 3
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => parse certificate
SSL DBG [2] => read record
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 5 (-0xfffffffb)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record header' (5 bytes)
SSL DBG [4] 0000:  16 03 02 0a 16                                   .....
SSL DBG [3] input record: msgtype = 22, version = [3:2], msglen = %zu
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 2582 (-0xfffff5ea)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record from network' (2587 bytes)
SSL DBG [4] 0000:  16 03 02 0a 16 0b 00 0a 12 00 0a 0f 00 04 ff 30  ...............0
SSL DBG [4] 0010:  82 04 fb 30 82 03 e3 a0 03 02 01 02 02 12 04 95  ...0............
SSL DBG [4] 0020:  84 2c 95 9d 54 17 0a da a7 aa bb 26 15 0e 87 82  .,..T......&....
SSL DBG [4] 0030:  30 0d 06 09 2a 86 48 86 f7 0d 01 01 0b 05 00 30  0...*.H........0
SSL DBG [4] 0040:  33 31 0b 30 09 06 03 55 04 06 13 02 55 53 31 16  31.0...U....US1.
SSL DBG [4] 0050:  30 14 06 03 55 04 0a 13 0d 4c 65 74 27 73 20 45  0...U....Let's E
SSL DBG [4] 0060:  6e 63 72 79 70 74 31 0c 30 0a 06 03 55 04 03 13  ncrypt1.0...U...
SSL DBG [4] 0070:  03 52 31 31 30 1e 17 0d 32 35 30 32 31 33 30 32  .R110...25021302
SSL DBG [4] 0080:  31 32 31 30 5a 17 0d 32 35 30 35 31 34 30 32 31  1210Z..250514021
SSL DBG [4] 0090:  32 30 39 5a 30 17 31 15 30 13 06 03 55 04 03 13  209Z0.1.0...U...
SSL DBG [4] 00a0:  0c 36 34 30 62 79 34 38 30 2e 63 6f 6d 30 82 01  .640by480.com0..
SSL DBG [4] 00b0:  22 30 0d 06 09 2a 86 48 86 f7 0d 01 01 01 05 00  "0...*.H........
SSL DBG [4] 00c0:  03 82 01 0f 00 30 82 01 0a 02 82 01 01 00 ac 4d  .....0.........M
SSL DBG [4] 00d0:  1d ee 0f 82 d6 e0 4f e7 35 c7 5e b8 73 a0 cc 61  ......O.5.^.s..a
SSL DBG [4] 00e0:  74 b6 f7 c7 28 c4 35 3c 86 76 b2 3d e5 8c 68 80  t...(.5<.v.=..h.
SSL DBG [4] 00f0:  d7 8a 6f 61 99 14 03 ee 22 29 2e 6f e9 b6 f0 83  ..oa....").o....
SSL DBG [4] 0100:  51 52 de 7d e1 3c 56 34 e4 8a 7f 64 ff a1 4f aa  QR.}.<V4...d..O.
SSL DBG [4] 0110:  a3 de 99 5b e7 41 ff ae e7 c4 c7 fa 46 39 08 2b  ...[.A......F9.+
SSL DBG [4] 0120:  cc 9f 3c 54 dc 02 c1 0e 4a c8 e7 16 f8 90 6a 3d  ..<T....J.....j=
SSL DBG [4] 0130:  70 41 5f 9f 1d 55 30 63 8a ba 97 6c b2 de ce c5  pA_..U0c...l....
SSL DBG [4] 0140:  46 5b b5 d0 bc d7 57 18 bb 19 53 56 37 51 6c 26  F[....W...SV7Ql&
SSL DBG [4] 0150:  9e 1d 75 89 43 ca 4d a2 f4 61 76 77 85 41 3a ed  ..u.C.M..avw.A:.
SSL DBG [4] 0160:  f4 10 4f 89 60 a9 a3 b7 36 ce 60 54 2e 2c a5 a3  ..O.`...6.`T.,..
SSL DBG [4] 0170:  ab bd 61 c4 bc 2b 82 b3 ca 6c 6a dd 88 55 73 09  ..a..+...lj..Us.
SSL DBG [4] 0180:  32 7d 1c 2e 43 2b 6c 8a 5b a7 b3 95 e2 2f e8 4d  2}..C+l.[..../.M
SSL DBG [4] 0190:  1c f2 3d ce 72 94 b4 94 0c 4d a0 43 6e 30 22 77  ..=.r....M.Cn0"w
SSL DBG [4] 01a0:  21 be ac 57 21 9e 93 3a c0 e7 94 bd 3b 44 26 73  !..W!..:....;D&s
SSL DBG [4] 01b0:  50 81 dd d0 0a d5 42 7e 2b 10 56 cf fe 8a 62 cd  P.....B~+.V...b.
SSL DBG [4] 01c0:  9a 08 7d 2d fd de 3d c3 4e 8d 2c 86 aa 27 02 03  ..}-..=.N.,..'..
SSL DBG [4] 01d0:  01 00 01 a3 82 02 23 30 82 02 1f 30 0e 06 03 55  ......#0...0...U
SSL DBG [4] 01e0:  1d 0f 01 01 ff 04 04 03 02 05 a0 30 1d 06 03 55  ...........0...U
SSL DBG [4] 01f0:  1d 25 04 16 30 14 06 08 2b 06 01 05 05 07 03 01  .%..0...+.......
SSL DBG [4] 0200:  06 08 2b 06 01 05 05 07 03 02 30 0c 06 03 55 1d  ..+.......0...U.
SSL DBG [4] 0210:  13 01 01 ff 04 02 30 00 30 1d 06 03 55 1d 0e 04  ......0.0...U...
SSL DBG [4] 0220:  16 04 14 d6 9a 9e b4 8e a4 56 c3 54 d0 86 3a a3  .........V.T..:.
SSL DBG [4] 0230:  33 f0 76 08 d7 34 b8 30 1f 06 03 55 1d 23 04 18  3.v..4.0...U.#..
SSL DBG [4] 0240:  30 16 80 14 c5 cf 46 a4 ea f4 c3 c0 7a 6c 95 c4  0.....F.....zl..
SSL DBG [4] 0250:  2d b0 5e 92 2f 26 e3 b9 30 57 06 08 2b 06 01 05  -.^./&..0W..+...
SSL DBG [4] 0260:  05 07 01 01 04 4b 30 49 30 22 06 08 2b 06 01 05  .....K0I0"..+...
SSL DBG [4] 0270:  05 07 30 01 86 16 68 74 74 70 3a 2f 2f 72 31 31  ..0...http://r11
SSL DBG [4] 0280:  2e 6f 2e 6c 65 6e 63 72 2e 6f 72 67 30 23 06 08  .o.lencr.org0#..
SSL DBG [4] 0290:  2b 06 01 05 05 07 30 02 86 17 68 74 74 70 3a 2f  +.....0...http:/
SSL DBG [4] 02a0:  2f 72 31 31 2e 69 2e 6c 65 6e 63 72 2e 6f 72 67  /r11.i.lencr.org
SSL DBG [4] 02b0:  2f 30 29 06 03 55 1d 11 04 22 30 20 82 0c 36 34  /0)..U..."0 ..64
SSL DBG [4] 02c0:  30 62 79 34 38 30 2e 63 6f 6d 82 10 77 77 77 2e  0by480.com..www.
SSL DBG [4] 02d0:  36 34 30 62 79 34 38 30 2e 63 6f 6d 30 13 06 03  640by480.com0...
SSL DBG [4] 02e0:  55 1d 20 04 0c 30 0a 30 08 06 06 67 81 0c 01 02  U. ..0.0...g....
SSL DBG [4] 02f0:  01 30 82 01 05 06 0a 2b 06 01 04 01 d6 79 02 04  .0.....+.....y..
SSL DBG [4] 0300:  02 04 81 f6 04 81 f3 00 f1 00 77 00 73 20 22 0f  ..........w.s ".
SSL DBG [4] 0310:  08 16 8a f9 f3 c4 a6 8b 0a b2 6a 9a 4a 00 ee f5  ..........j.J...
SSL DBG [4] 0320:  77 85 8a 08 4d 05 00 d4 a5 42 44 59 00 00 01 94  w...M....BDY....
SSL DBG [4] 0330:  fd 49 82 08 00 00 04 03 00 48 30 46 02 21 00 89  .I.......H0F.!..
SSL DBG [4] 0340:  eb 18 a6 96 ad 8d 7c aa 0a 34 0a 09 54 8f a7 cd  ......|..4..T...
SSL DBG [4] 0350:  27 aa 83 a0 8e 12 fa f5 7e 2b 23 f8 50 0f 9f 02  '.......~+#.P...
SSL DBG [4] 0360:  21 00 8e 01 11 a0 17 bb 7d 61 12 82 36 19 49 ac  !.......}a..6.I.
SSL DBG [4] 0370:  83 59 c5 8e 79 1c 34 9a df b3 ad 69 d5 cf f3 06  .Y..y.4....i....
SSL DBG [4] 0380:  3b cf 00 76 00 a2 e3 0a e4 45 ef bd ad 9b 7e 38  ;..v.....E....~8
SSL DBG [4] 0390:  ed 47 67 77 53 d7 82 5b 84 94 d7 2b 5e 1b 2c c4  .GgwS..[...+^.,.
SSL DBG [4] 03a0:  b9 50 a4 47 e7 00 00 01 94 fd 49 82 13 00 00 04  .P.G......I.....
SSL DBG [4] 03b0:  03 00 47 30 45 02 20 2e ed 27 5b 27 c2 72 6e 12  ..G0E. ..'['.rn.
SSL DBG [4] 03c0:  2b 92 98 6b f4 f3 b2 39 40 a2 db 74 9d a2 e3 8b  +..k...9@..t....
SSL DBG [4] 03d0:  76 92 98 c4 2a 73 60 02 21 00 85 17 95 c7 68 55  v...*s`.!.....hU
SSL DBG [4] 03e0:  60 21 a1 53 f2 3c 93 ab 8b 09 ca b2 06 a1 99 2a  `!.S.<.........*
SSL DBG [4] 03f0:  32 cc 1c 88 6f b4 a8 6a 21 23 30 0d 06 09 2a 86  2...o..j!#0...*.
SSL DBG [4] 0400:  48 86 f7 0d 01 01 0b 05 00 03 82 01 01 00 28 9d  H.............(.
SSL DBG [4] 0410:  63 83 5a 20 8f 4e 58 8e a6 78 90 ed 28 6e 89 3f  c.Z .NX..x..(n.?
SSL DBG [4] 0420:  a8 90 a9 a4 0a 92 20 f1 5a 81 03 30 9d 1c b1 7a  ...... .Z..0...z
SSL DBG [4] 0430:  4c 7e 25 ce c5 d7 13 85 ac 2f f3 a3 85 f6 a7 49  L~%....../.....I
SSL DBG [4] 0440:  46 4f d4 fb 91 c8 27 71 d8 8a 06 17 b5 dc f3 bf  FO....'q........
SSL DBG [4] 0450:  1b ce 56 93 ba dc ec 3a 93 cc af 0d cc 42 3f 2a  ..V....:.....B?*
SSL DBG [4] 0460:  32 0b e0 8b 9c 13 ee 61 e5 7b 49 a3 72 f6 20 a0  2......a.{I.r. .
SSL DBG [4] 0470:  84 e4 7f 87 15 ef 5f 16 75 c4 7b f9 cb 14 42 35  ......_.u.{...B5
SSL DBG [4] 0480:  ad 90 2e a7 0e 72 e5 4f 8f 2d 57 c1 db bd 8b 0e  .....r.O.-W.....
SSL DBG [4] 0490:  d2 10 90 23 71 f6 a1 d6 31 df 19 a1 d9 1d ca 7e  ...#q...1......~
SSL DBG [4] 04a0:  80 b0 da cd 4e d9 44 02 4e 6c e3 80 5e 9e 0e 71  ....N.D.Nl..^..q
SSL DBG [4] 04b0:  e9 6a 2f 55 6d fc ed 86 da 9c f3 a7 ed 71 64 16  .j/Um........qd.
SSL DBG [4] 04c0:  1f 2e 11 95 46 f0 20 91 09 d4 11 f3 c8 f6 e9 ef  ....F. .........
SSL DBG [4] 04d0:  74 13 46 cb 89 03 b9 d3 b0 f8 6e 38 75 7f bc 1f  t.F.......n8u...
SSL DBG [4] 04e0:  75 44 33 e7 71 d4 85 f7 f9 f9 95 37 6a da ac e9  uD3.q......7j...
SSL DBG [4] 04f0:  a5 4f 07 44 ab 8d 4e 19 26 a1 ec 2d 52 6a 81 db  .O.D..N.&..-Rj..
SSL DBG [4] 0500:  9a a5 2e 0d ca 70 18 82 92 8f 96 c4 0d 4b 00 05  .....p.......K..
SSL DBG [4] 0510:  0a 30 82 05 06 30 82 02 ee a0 03 02 01 02 02 11  .0...0..........
SSL DBG [4] 0520:  00 8a 7d 3e 13 d6 2f 30 ef 23 86 bd 29 07 6b 34  ..}>../0.#..).k4
SSL DBG [4] 0530:  f8 30 0d 06 09 2a 86 48 86 f7 0d 01 01 0b 05 00  .0...*.H........
SSL DBG [4] 0540:  30 4f 31 0b 30 09 06 03 55 04 06 13 02 55 53 31  0O1.0...U....US1
SSL DBG [4] 0550:  29 30 27 06 03 55 04 0a 13 20 49 6e 74 65 72 6e  )0'..U... Intern
SSL DBG [4] 0560:  65 74 20 53 65 63 75 72 69 74 79 20 52 65 73 65  et Security Rese
SSL DBG [4] 0570:  61 72 63 68 20 47 72 6f 75 70 31 15 30 13 06 03  arch Group1.0...
SSL DBG [4] 0580:  55 04 03 13 0c 49 53 52 47 20 52 6f 6f 74 20 58  U....ISRG Root X
SSL DBG [4] 0590:  31 30 1e 17 0d 32 34 30 33 31 33 30 30 30 30 30  10...24031300000
SSL DBG [4] 05a0:  30 5a 17 0d 32 37 30 33 31 32 32 33 35 39 35 39  0Z..270312235959
SSL DBG [4] 05b0:  5a 30 33 31 0b 30 09 06 03 55 04 06 13 02 55 53  Z031.0...U....US
SSL DBG [4] 05c0:  31 16 30 14 06 03 55 04 0a 13 0d 4c 65 74 27 73  1.0...U....Let's
SSL DBG [4] 05d0:  20 45 6e 63 72 79 70 74 31 0c 30 0a 06 03 55 04   Encrypt1.0...U.
SSL DBG [4] 05e0:  03 13 03 52 31 31 30 82 01 22 30 0d 06 09 2a 86  ...R110.."0...*.
SSL DBG [4] 05f0:  48 86 f7 0d 01 01 01 05 00 03 82 01 0f 00 30 82  H.............0.
SSL DBG [4] 0600:  01 0a 02 82 01 01 00 ba 87 bc 5c 1b 00 39 cb ca  ..........\..9..
SSL DBG [4] 0610:  0a cd d4 67 10 f9 01 3c a5 4e a5 61 cb 26 ca 52  ...g...<.N.a.&.R
SSL DBG [4] 0620:  fb 15 01 b7 b9 28 f5 28 1e ed 27 b3 24 18 39 67  .....(.(..'.$.9g
SSL DBG [4] 0630:  09 0c 08 ec e0 3a b0 3b 77 0e bd f3 e5 39 54 41  .....:.;w....9TA
SSL DBG [4] 0640:  0c 4e ae 41 d6 99 74 de 51 db ef 7b ff 58 bd a8  .N.A..t.Q..{.X..
SSL DBG [4] 0650:  b7 13 f6 de 31 d5 f2 72 c9 72 6a 0b 83 74 95 9c  ....1..r.rj..t..
SSL DBG [4] 0660:  46 00 64 14 99 f3 b1 d9 22 d9 cd a8 92 aa 1c 26  F.d....."......&
SSL DBG [4] 0670:  7a 3f fe ef 58 05 7b 08 95 81 db 71 0f 8e fb e3  z?..X.{....q....
SSL DBG [4] 0680:  31 09 bb 09 be 50 4d 5f 8f 91 76 3d 5a 9d 9e 83  1....PM_..v=Z...
SSL DBG [4] 0690:  f2 e9 c4 66 b3 e1 06 66 43 48 18 80 65 a0 37 18  ...f...fCH..e.7.
SSL DBG [4] 06a0:  9a 9b 84 32 97 b1 b2 bd c4 f8 15 00 9d 27 88 fb  ...2.........'..
SSL DBG [4] 06b0:  e2 63 17 96 6c 9b 27 67 4b c4 db 28 5e 69 c2 79  .c..l.'gK..(^i.y
SSL DBG [4] 06c0:  f0 49 5c e0 24 50 e1 c4 bc a1 05 ac 7b 40 6d 00  .I\.$P......{@m.
SSL DBG [4] 06d0:  b4 c2 41 3f a7 58 b8 2f c5 5c 9b a5 bb 09 9e f1  ..A?.X./.\......
SSL DBG [4] 06e0:  fe eb b0 85 39 fd a8 0a ef 45 c4 78 eb 65 2a c2  ....9....E.x.e*.
SSL DBG [4] 06f0:  cf 5f 3c de e3 5c 4d 1b f7 0b 27 2b aa 0b 42 77  ._<..\M...'+..Bw
SSL DBG [4] 0700:  53 4f 79 6a 1d 87 d9 02 03 01 00 01 a3 81 f8 30  SOyj...........0
SSL DBG [4] 0710:  81 f5 30 0e 06 03 55 1d 0f 01 01 ff 04 04 03 02  ..0...U.........
SSL DBG [4] 0720:  01 86 30 1d 06 03 55 1d 25 04 16 30 14 06 08 2b  ..0...U.%..0...+
SSL DBG [4] 0730:  06 01 05 05 07 03 02 06 08 2b 06 01 05 05 07 03  .........+......
SSL DBG [4] 0740:  01 30 12 06 03 55 1d 13 01 01 ff 04 08 30 06 01  .0...U.......0..
SSL DBG [4] 0750:  01 ff 02 01 00 30 1d 06 03 55 1d 0e 04 16 04 14  .....0...U......
SSL DBG [4] 0760:  c5 cf 46 a4 ea f4 c3 c0 7a 6c 95 c4 2d b0 5e 92  ..F.....zl..-.^.
SSL DBG [4] 0770:  2f 26 e3 b9 30 1f 06 03 55 1d 23 04 18 30 16 80  /&..0...U.#..0..
SSL DBG [4] 0780:  14 79 b4 59 e6 7b b6 e5 e4 01 73 80 08 88 c8 1a  .y.Y.{....s.....
SSL DBG [4] 0790:  58 f6 e9 9b 6e 30 32 06 08 2b 06 01 05 05 07 01  X...n02..+......
SSL DBG [4] 07a0:  01 04 26 30 24 30 22 06 08 2b 06 01 05 05 07 30  ..&0$0"..+.....0
SSL DBG [4] 07b0:  02 86 16 68 74 74 70 3a 2f 2f 78 31 2e 69 2e 6c  ...http://x1.i.l
SSL DBG [4] 07c0:  65 6e 63 72 2e 6f 72 67 2f 30 13 06 03 55 1d 20  encr.org/0...U. 
SSL DBG [4] 07d0:  04 0c 30 0a 30 08 06 06 67 81 0c 01 02 01 30 27  ..0.0...g.....0'
SSL DBG [4] 07e0:  06 03 55 1d 1f 04 20 30 1e 30 1c a0 1a a0 18 86  ..U... 0.0......
SSL DBG [4] 07f0:  16 68 74 74 70 3a 2f 2f 78 31 2e 63 2e 6c 65 6e  .http://x1.c.len
SSL DBG [4] 0800:  63 72 2e 6f 72 67 2f 30 0d 06 09 2a 86 48 86 f7  cr.org/0...*.H..
SSL DBG [4] 0810:  0d 01 01 0b 05 00 03 82 02 01 00 4e e2 89 5d 0a  ...........N..].
SSL DBG [4] 0820:  03 1c 90 38 d0 f5 1f f9 71 5c f8 c3 8f b2 37 88  ...8....q\....7.
SSL DBG [4] 0830:  7a 6f b0 25 1f ed be b7 d8 86 06 8e e9 09 84 cd  zo.%............
SSL DBG [4] 0840:  72 bf 81 f3 fc ca cf 53 48 ed bd f6 69 42 d4 a5  r......SH...iB..
SSL DBG [4] 0850:  11 3e 35 c8 13 b2 92 1d 05 5f ea 2e d4 d8 f8 49  .>5......_.....I
SSL DBG [4] 0860:  c3 ad f5 99 96 9c ef 26 d8 e1 b4 24 0b 48 20 4d  .......&...$.H M
SSL DBG [4] 0870:  fc d3 54 b4 a9 c6 21 c8 e1 36 1b ff 77 64 29 17  ..T...!..6..wd).
SSL DBG [4] 0880:  b9 f0 4b ef 5d ea cd 79 d0 bf 90 bf be 23 b2 90  ..K.]..y.....#..
SSL DBG [4] 0890:  da 4a a9 48 31 74 a9 44 0b e1 e2 f6 2d 83 71 a4  .J.H1t.D....-.q.
SSL DBG [4] 08a0:  75 7b d2 94 c1 05 19 46 1c b9 8f f3 c4 74 48 25  u{.....F.....tH%
SSL DBG [4] 08b0:  2a 0d e5 f5 db 43 e2 db 93 9b b9 19 b4 1f 2f df  *....C......../.
SSL DBG [4] 08c0:  6a 0e 8f 31 d3 63 0f bb 29 dc dd 66 2c 3f b0 1b  j..1.c..)..f,?..
SSL DBG [4] 08d0:  67 51 f8 41 3c e4 4d b9 ac b8 a4 9c 66 63 f5 ab  gQ.A<.M.....fc..
SSL DBG [4] 08e0:  85 23 1d cc 53 b6 ab 71 ae dc c5 01 71 da 36 ee  .#..S..q....q.6.
SSL DBG [4] 08f0:  0a 18 2a 32 fd 09 31 7c 8f f6 73 e7 9c 9c b5 4a  ..*2..1|..s....J
SSL DBG [4] 0900:  15 6a 77 82 5a cf da 8d 45 fe 1f 2a 64 05 30 3e  .jw.Z...E..*d.0>
SSL DBG [4] 0910:  73 c2 c6 0c b9 d6 3b 63 4a ab 46 03 fe 99 c0 46  s.....;cJ.F....F
SSL DBG [4] 0920:  40 27 60 63 df 50 3a 07 47 d8 15 4a 9f ea 47 1f  @'`c.P:.G..J..G.
SSL DBG [4] 0930:  99 5a 08 62 0c b6 6c 33 08 4d d7 38 ed 48 2d 2e  .Z.b..l3.M.8.H-.
SSL DBG [4] 0940:  05 68 ae 80 5d ef 4c dc d8 20 41 5f 68 f1 bb 5a  .h..].L.. A_h..Z
SSL DBG [4] 0950:  cd e3 0e b0 0c 31 87 9b 43 de 49 43 e1 c8 04 3f  .....1..C.IC...?
SSL DBG [4] 0960:  d1 3c 1b 87 45 30 69 a8 a9 72 0e 79 12 1c 31 d8  .<..E0i..r.y..1.
SSL DBG [4] 0970:  3e 23 57 dd a7 4f a0 f0 1c 81 d1 77 1f 6f d6 d2  >#W..O.....w.o..
SSL DBG [4] 0980:  b9 a8 b3 03 16 81 39 4b 9f 55 ae d2 6a e4 b3 bf  ......9K.U..j...
SSL DBG [4] 0990:  ea a5 d5 9f 4b a3 c9 d6 3b 72 f3 4a f6 54 ab 0c  ....K...;r.J.T..
SSL DBG [4] 09a0:  fc 38 f7 60 80 df 6e 35 ca 75 a1 54 e4 2f bc 6e  .8.`..n5.u.T./.n
SSL DBG [4] 09b0:  17 c9 1a a5 37 b5 a2 9a ba ec f4 c0 75 46 4f 77  ....7.......uFOw
SSL DBG [4] 09c0:  a8 e8 59 56 91 66 2d 6e de 29 81 d6 a6 97 05 5e  ..YV.f-n.).....^
SSL DBG [4] 09d0:  64 45 be 2c ce ea 64 42 44 b0 c3 4f ad f0 b4 dc  dE.,..dBD..O....
SSL DBG [4] 09e0:  03 ca 99 9b 09 82 95 82 0d 63 8a 66 f9 19 72 f8  .........c.f..r.
SSL DBG [4] 09f0:  d5 b9 89 10 e2 89 98 09 35 f9 a2 1c be 92 73 23  ........5.....s#
SSL DBG [4] 0a00:  74 e9 9d 1f d7 3b 4a 9a 84 58 10 c2 f3 a7 e2 35  t....;J..X.....5
SSL DBG [4] 0a10:  ec 7e 3b 45 ce 30 46 52 6b c0 c0                 .~;E.0FRk..
SSL DBG [3] handshake message: msglen = %zu, type = %u, hslen = %zu
SSL DBG [2] <= read record
SSL DBG [3] peer certificate #1:
SSL DBG [3] cert. version     : 3
SSL DBG [3] serial number     : 04:95:84:2C:95:9D:54:17:0A:DA:A7:AA:BB:26:15:0E:87:82
SSL DBG [3] issuer name       : C=US, O=Let's Encrypt, CN=R11
SSL DBG [3] subject name      : CN=640by480.com
SSL DBG [3] issued  on        : 2025-02-13 02:12:10
SSL DBG [3] expires on        : 2025-05-14 02:12:09
SSL DBG [3] signed using      : RSA with SHA-256
SSL DBG [3] RSA key size      : 2048 bits
SSL DBG [3] basic constraints : CA=false
SSL DBG [3] subject alt name  :
SSL DBG [3]     dNSName : 640by480.com
SSL DBG [3]     dNSName : www.640by480.com
SSL DBG [3] key usage         : Digital Signature, Key Encipherment
SSL DBG [3] ext key usage     : TLS Web Server Authentication, TLS Web Client Authentication
SSL DBG [3] certificate policies : ???
SSL DBG [3] value of 'crt->rsa.N' (2048 bits) is:
SSL DBG [3]  ac 4d 1d ee 0f 82 d6 e0 4f e7 35 c7 5e b8 73 a0
SSL DBG [3]  cc 61 74 b6 f7 c7 28 c4 35 3c 86 76 b2 3d e5 8c
SSL DBG [3]  68 80 d7 8a 6f 61 99 14 03 ee 22 29 2e 6f e9 b6
SSL DBG [3]  f0 83 51 52 de 7d e1 3c 56 34 e4 8a 7f 64 ff a1
SSL DBG [3]  4f aa a3 de 99 5b e7 41 ff ae e7 c4 c7 fa 46 39
SSL DBG [3]  08 2b cc 9f 3c 54 dc 02 c1 0e 4a c8 e7 16 f8 90
SSL DBG [3]  6a 3d 70 41 5f 9f 1d 55 30 63 8a ba 97 6c b2 de
SSL DBG [3]  ce c5 46 5b b5 d0 bc d7 57 18 bb 19 53 56 37 51
SSL DBG [3]  6c 26 9e 1d 75 89 43 ca 4d a2 f4 61 76 77 85 41
SSL DBG [3]  3a ed f4 10 4f 89 60 a9 a3 b7 36 ce 60 54 2e 2c
SSL DBG [3]  a5 a3 ab bd 61 c4 bc 2b 82 b3 ca 6c 6a dd 88 55
SSL DBG [3]  73 09 32 7d 1c 2e 43 2b 6c 8a 5b a7 b3 95 e2 2f
SSL DBG [3]  e8 4d 1c f2 3d ce 72 94 b4 94 0c 4d a0 43 6e 30
SSL DBG [3]  22 77 21 be ac 57 21 9e 93 3a c0 e7 94 bd 3b 44
SSL DBG [3]  26 73 50 81 dd d0 0a d5 42 7e 2b 10 56 cf fe 8a
SSL DBG [3]  62 cd 9a 08 7d 2d fd de 3d c3 4e 8d 2c 86 aa 27
SSL DBG [3] value of 'crt->rsa.E' (17 bits) is:
SSL DBG [3]  01 00 01
SSL DBG [3] peer certificate #2:
SSL DBG [3] cert. version     : 3
SSL DBG [3] serial number     : 8A:7D:3E:13:D6:2F:30:EF:23:86:BD:29:07:6B:34:F8
SSL DBG [3] issuer name       : C=US, O=Internet Security Research Group, CN=ISRG Root X1
SSL DBG [3] subject name      : C=US, O=Let's Encrypt, CN=R11
SSL DBG [3] issued  on        : 2024-03-13 00:00:00
SSL DBG [3] expires on        : 2027-03-12 23:59:59
SSL DBG [3] signed using      : RSA with SHA-256
SSL DBG [3] RSA key size      : 2048 bits
SSL DBG [3] basic constraints : CA=true, max_pathlen=0
SSL DBG [3] key usage         : Digital Signature, Key Cert Sign, CRL Sign
SSL DBG [3] ext key usage     : TLS Web Client Authentication, TLS Web Server Authentication
SSL DBG [3] certificate policies : ???
SSL DBG [3] value of 'crt->rsa.N' (2048 bits) is:
SSL DBG [3]  ba 87 bc 5c 1b 00 39 cb ca 0a cd d4 67 10 f9 01
SSL DBG [3]  3c a5 4e a5 61 cb 26 ca 52 fb 15 01 b7 b9 28 f5
SSL DBG [3]  28 1e ed 27 b3 24 18 39 67 09 0c 08 ec e0 3a b0
SSL DBG [3]  3b 77 0e bd f3 e5 39 54 41 0c 4e ae 41 d6 99 74
SSL DBG [3]  de 51 db ef 7b ff 58 bd a8 b7 13 f6 de 31 d5 f2
SSL DBG [3]  72 c9 72 6a 0b 83 74 95 9c 46 00 64 14 99 f3 b1
SSL DBG [3]  d9 22 d9 cd a8 92 aa 1c 26 7a 3f fe ef 58 05 7b
SSL DBG [3]  08 95 81 db 71 0f 8e fb e3 31 09 bb 09 be 50 4d
SSL DBG [3]  5f 8f 91 76 3d 5a 9d 9e 83 f2 e9 c4 66 b3 e1 06
SSL DBG [3]  66 43 48 18 80 65 a0 37 18 9a 9b 84 32 97 b1 b2
SSL DBG [3]  bd c4 f8 15 00 9d 27 88 fb e2 63 17 96 6c 9b 27
SSL DBG [3]  67 4b c4 db 28 5e 69 c2 79 f0 49 5c e0 24 50 e1
SSL DBG [3]  c4 bc a1 05 ac 7b 40 6d 00 b4 c2 41 3f a7 58 b8
SSL DBG [3]  2f c5 5c 9b a5 bb 09 9e f1 fe eb b0 85 39 fd a8
SSL DBG [3]  0a ef 45 c4 78 eb 65 2a c2 cf 5f 3c de e3 5c 4d
SSL DBG [3]  1b f7 0b 27 2b aa 0b 42 77 53 4f 79 6a 1d 87 d9
SSL DBG [3] value of 'crt->rsa.E' (17 bits) is:
SSL DBG [3]  01 00 01
SSL DBG [3] Use configuration-specific verification callback
SSL DBG [3] Certificate verification flags clear
SSL DBG [2] <= parse certificate
SSL DBG [2] client state: 4
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => parse server key exchange
SSL DBG [2] <= skip parse server key exchange
SSL DBG [2] client state: 5
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => parse certificate request
SSL DBG [2] => read record
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 5 (-0xfffffffb)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record header' (5 bytes)
SSL DBG [4] 0000:  16 03 02 00 04                                   .....
SSL DBG [3] input record: msgtype = 22, version = [3:2], msglen = %zu
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 4 (-0xfffffffc)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record from network' (9 bytes)
SSL DBG [4] 0000:  16 03 02 00 04 0e 00 00 00                       .........
SSL DBG [3] handshake message: msglen = %zu, type = %u, hslen = %zu
SSL DBG [2] <= read record
SSL DBG [3] got no certificate request
SSL DBG [2] <= parse certificate request
SSL DBG [2] client state: 6
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => parse server hello done
SSL DBG [2] => read record
SSL DBG [2] reuse previously read message
SSL DBG [2] <= read record
SSL DBG [2] <= parse server hello done
SSL DBG [2] client state: 7
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => write certificate
SSL DBG [2] <= skip write certificate
SSL DBG [2] client state: 8
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => write client key exchange
SSL DBG [2] => write handshake message
SSL DBG [2] => write record
SSL DBG [3] output record: msgtype = 22, version = [3:2], msglen = %zu
SSL DBG [4] dumping 'output record sent to network' (267 bytes)
SSL DBG [4] 0000:  16 03 02 01 06 10 00 01 02 01 00 0d 26 27 be 0f  ............&'..
SSL DBG [4] 0010:  62 92 ee fc 88 5a c9 e9 b9 d4 0c d3 d7 aa 12 90  b....Z..........
SSL DBG [4] 0020:  d6 11 2a c7 bd 44 3d 82 27 fa e3 ca a8 59 bc af  ..*..D=.'....Y..
SSL DBG [4] 0030:  4a 1a 43 6e fe e7 fc b3 80 e7 91 9e 93 16 34 e4  J.Cn..........4.
SSL DBG [4] 0040:  ce 60 39 e5 99 85 c9 94 1f cd e1 9d 04 2b bb 59  .`9..........+.Y
SSL DBG [4] 0050:  94 aa 4e 21 9a fe be 6e 7f df cb 71 2f 9e 87 7b  ..N!...n...q/..{
SSL DBG [4] 0060:  10 cc 93 ce 9c b0 e8 17 de 7c 4d 05 94 dd 0e bc  .........|M.....
SSL DBG [4] 0070:  9b d9 97 c1 60 3a 4c e9 23 b8 de fc 30 d9 4b 2e  ....`:L.#...0.K.
SSL DBG [4] 0080:  ce 70 f7 f1 bc fb 60 ae 45 26 2f 90 95 0b 4e ea  .p....`.E&/...N.
SSL DBG [4] 0090:  28 9b cb 39 12 92 b7 e2 c7 ec 90 1b 60 6b d5 e7  (..9........`k..
SSL DBG [4] 00a0:  b0 bd 57 c0 1f 64 fe 91 e1 e2 37 e7 2c f4 d6 ef  ..W..d....7.,...
SSL DBG [4] 00b0:  03 36 1c b9 43 03 ed c8 28 33 37 08 b4 e0 95 5b  .6..C...(37....[
SSL DBG [4] 00c0:  75 34 d8 8f fc e1 e1 45 70 f7 ca 54 a7 42 94 45  u4.....Ep..T.B.E
SSL DBG [4] 00d0:  d3 37 51 14 ab 26 43 c4 51 02 6b 83 16 29 83 9d  .7Q..&C.Q.k..)..
SSL DBG [4] 00e0:  35 2f 87 49 53 6f b7 1e 80 18 90 35 47 b2 48 e1  5/.ISo.....5G.H.
SSL DBG [4] 00f0:  c7 c1 d7 4f 95 2d 2e bd 0f 59 68 bf f1 11 96 c9  ...O.-...Yh.....
SSL DBG [4] 0100:  1a 79 ca 20 d7 bd 32 9a 54 8f 64                 .y. ..2.T.d
SSL DBG [2] => flush output
SSL DBG [2] message length: %zu, out_left: %zu
SSL DBG [2] ssl->f_send() returned 267 (-0xfffffef5)
SSL DBG [2] <= flush output
SSL DBG [2] <= write record
SSL DBG [2] <= write handshake message
SSL DBG [2] <= write client key exchange
SSL DBG [2] client state: 9
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => write certificate verify
SSL DBG [2] => derive keys
SSL DBG [3] dumping 'premaster secret' (48 bytes)
SSL DBG [3] 0000:  03 02 8e 72 82 b6 20 60 55 d4 e9 7e 03 36 7e 6c  ...r.. `U..~.6~l
SSL DBG [3] 0010:  91 8b 1e 39 d4 42 0b cb 6e 05 73 70 7b 3b 3b 31  ...9.B..n.sp{;;1
SSL DBG [3] 0020:  9b c6 89 d9 e1 0e 5e 3f 99 be bf ff 28 48 bf 27  ......^?....(H.'
SSL DBG [3] ciphersuite = TLS-RSA-WITH-AES-128-CBC-SHA
SSL DBG [3] dumping 'master secret' (48 bytes)
SSL DBG [3] 0000:  91 c1 29 e1 a0 a8 8b 1e 72 54 98 71 ac ea 9f 63  ..).....rT.q...c
SSL DBG [3] 0010:  62 d0 22 42 43 1b 04 34 b5 65 1e a4 63 6c 9d db  b."BC..4.e..cl..
SSL DBG [3] 0020:  be 2a 62 69 be bf c1 94 9d b8 9f 30 be 7b 8e e2  .*bi.......0.{..
SSL DBG [4] dumping 'random bytes' (64 bytes)
SSL DBG [4] 0000:  47 08 e7 7a 96 68 af 36 03 e3 9d 56 d0 a3 e9 23  G..z.h.6...V...#
SSL DBG [4] 0010:  df 95 c7 c8 e4 7f 98 b9 44 4f 57 4e 47 52 44 00  ........DOWNGRD.
SSL DBG [4] 0020:  95 08 1f c2 40 ed 62 08 c2 e1 e2 0b f1 b1 fa 1d  ....@.b.........
SSL DBG [4] 0030:  26 1f a1 02 40 74 b1 58 29 f4 73 b1 de d3 6c a3  &...@t.X).s...l.
SSL DBG [4] dumping 'key block' (256 bytes)
SSL DBG [4] 0000:  66 11 51 9b 76 62 db 64 be da ed c5 81 c0 0d 6f  f.Q.vb.d.......o
SSL DBG [4] 0010:  f8 5a 67 65 5a 5f 61 9f 5f 6b 29 67 fa f3 a8 82  .ZgeZ_a._k)g....
SSL DBG [4] 0020:  b6 e6 30 ed eb 78 63 b4 aa c7 9c d3 58 5e c9 f0  ..0..xc.....X^..
SSL DBG [4] 0030:  8a 53 f3 db fc a7 64 50 fb 35 6d 63 08 89 98 55  .S....dP.5mc...U
SSL DBG [4] 0040:  2e bc 79 4a 52 b2 a5 c9 d8 f8 44 f4 ca 04 22 79  ..yJR.....D..."y
SSL DBG [4] 0050:  20 b1 9f b6 52 f5 ce 64 40 fb 70 31 bd bf 64 4b   ...R..d@.p1..dK
SSL DBG [4] 0060:  07 68 78 20 79 47 04 1f 74 bb fa d8 48 25 51 54  .hx yG..t...H%QT
SSL DBG [4] 0070:  79 e9 11 28 31 4c 72 8e 12 22 53 98 c7 3d 5b 29  y..(1Lr.."S..=[)
SSL DBG [4] 0080:  dd 4b 56 33 a1 ea 2d 19 25 7e a4 a9 43 57 66 b0  .KV3..-.%~..CWf.
SSL DBG [4] 0090:  57 c9 06 c9 b6 50 16 2d d6 c3 f4 39 ca d4 11 8e  W....P.-...9....
SSL DBG [4] 00a0:  8e 39 f8 d4 86 88 27 32 5c a6 55 17 45 39 4a 93  .9....'2\.U.E9J.
SSL DBG [4] 00b0:  6e b6 67 3a ca a3 f2 db 9f a5 11 e1 d0 4d 3e 32  n.g:.........M>2
SSL DBG [4] 00c0:  8a 5f 5d 02 42 a6 cd de 10 83 28 a8 b7 4d a9 5c  ._].B.....(..M.\
SSL DBG [4] 00d0:  05 d4 35 1a bd 17 07 0a 05 fa 2b b5 61 a5 7c 19  ..5.......+.a.|.
SSL DBG [4] 00e0:  1e 11 5c c2 1d 50 2b 2e 78 51 d8 2b 87 01 38 8e  ..\..P+.xQ.+..8.
SSL DBG [4] 00f0:  c4 32 95 9b 8d bc 3a 02 ce d2 d3 39 8c 5c 6e 94  .2....:....9.\n.
SSL DBG [3] keylen: 16, minlen: 48, ivlen: 16, maclen: 20
SSL DBG [2] <= derive keys
SSL DBG [2] <= skip write certificate verify
SSL DBG [2] client state: 10
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => write change cipher spec
SSL DBG [2] => write handshake message
SSL DBG [2] => write record
SSL DBG [3] output record: msgtype = 20, version = [3:2], msglen = %zu
SSL DBG [4] dumping 'output record sent to network' (6 bytes)
SSL DBG [4] 0000:  14 03 02 00 01 01                                ......
SSL DBG [2] => flush output
SSL DBG [2] message length: %zu, out_left: %zu
SSL DBG [2] ssl->f_send() returned 6 (-0xfffffffa)
SSL DBG [2] <= flush output
SSL DBG [2] <= write record
SSL DBG [2] <= write handshake message
SSL DBG [2] <= write change cipher spec
SSL DBG [2] client state: 11
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => write finished
SSL DBG [2] => calc  finished tls
SSL DBG [4] dumping 'finished  md5 state' (16 bytes)
SSL DBG [4] 0000:  20 01 b3 f3 69 cb f2 4b 81 2b 60 2c b1 61 2c af   ...i..K.+`,.a,.
SSL DBG [4] dumping 'finished sha1 state' (20 bytes)
SSL DBG [4] 0000:  8d 91 45 f3 e8 b0 9d 3e b9 c6 a9 12 31 2a d2 fd  ..E....>....1*..
SSL DBG [4] 0010:  53 63 a8 00                                      Sc..
SSL DBG [3] dumping 'calc finished result' (12 bytes)
SSL DBG [3] 0000:  77 04 c5 12 47 96 12 ff 89 58 74 0e              w...G....Xt.
SSL DBG [2] <= calc  finished
SSL DBG [3] switching to new transform spec for outbound data
SSL DBG [2] => write handshake message
SSL DBG [2] => write record
SSL DBG [2] => encrypt buf
SSL DBG [4] dumping 'before encrypt: output payload' (16 bytes)
SSL DBG [4] 0000:  14 00 00 0c 77 04 c5 12 47 96 12 ff 89 58 74 0e  ....w...G....Xt.
SSL DBG [4] dumping 'computed mac' (20 bytes)
SSL DBG [4] 0000:  e0 88 0f 1e 75 80 fd 7c a5 9a b9 39 b0 18 be 37  ....u..|...9...7
SSL DBG [4] 0010:  fc 42 7a 41                                      .BzA
SSL DBG [3] before encrypt: msglen = %zu, including %zu bytes of IV and %zu bytes of padding
SSL DBG [2] <= encrypt buf
SSL DBG [3] output record: msgtype = 22, version = [3:2], msglen = %zu
SSL DBG [4] dumping 'output record sent to network' (69 bytes)
SSL DBG [4] 0000:  16 03 02 00 40 0b 1c 49 b6 d2 ee dd 1e 9d c6 fc  ....@..I........
SSL DBG [4] 0010:  c6 a2 fc 82 22 de 0d 84 98 69 03 c8 21 90 06 82  ...."....i..!...
SSL DBG [4] 0020:  71 1b 84 db 0d 63 1c 8d 40 0e 5f b4 cb 4a 56 50  q....c..@._..JVP
SSL DBG [4] 0030:  95 57 c5 03 cb cb 58 01 48 54 47 82 1d 8e 88 f9  .W....X.HTG.....
SSL DBG [4] 0040:  10 d4 1c ae 3b                                   ....;
SSL DBG [2] => flush output
SSL DBG [2] message length: %zu, out_left: %zu
SSL DBG [2] ssl->f_send() returned 69 (-0xffffffbb)
SSL DBG [2] <= flush output
SSL DBG [2] <= write record
SSL DBG [2] <= write handshake message
SSL DBG [2] <= write finished
SSL DBG [2] client state: 12
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => parse change cipher spec
SSL DBG [2] => read record
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 5 (-0xfffffffb)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record header' (5 bytes)
SSL DBG [4] 0000:  14 03 02 00 01                                   ....`
SSL DBG [3] input record: msgtype = 20, version = [3:2], msglen = %zu
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 1 (-0xffffffff)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record from network' (6 bytes)
SSL DBG [4] 0000:  14 03 02 00 01 01                                ......
SSL DBG [2] <= read record
SSL DBG [3] switching to new transform spec for inbound data
SSL DBG [2] <= parse change cipher spec
SSL DBG [2] client state: 13
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] => parse finished
SSL DBG [2] => calc  finished tls
SSL DBG [4] dumping 'finished  md5 state' (16 bytes)
SSL DBG [4] 0000:  d8 34 b8 73 b4 8b 55 f9 ac bb 24 e4 91 d3 0a 23  .4.s..U...$....#
SSL DBG [4] dumping 'finished sha1 state' (20 bytes)
SSL DBG [4] 0000:  01 d6 ab a4 e8 0f 3b c3 72 e0 13 96 f3 e5 d8 8b  ......;.r.......
SSL DBG [4] 0010:  21 73 59 06                                      !sY.
SSL DBG [3] dumping 'calc finished result' (12 bytes)
SSL DBG [3] 0000:  16 44 61 26 2f a7 81 cf 0f 0f 06 bb              .Da&/.......
SSL DBG [2] <= calc  finished
SSL DBG [2] => read record
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 5 (-0xfffffffb)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record header' (5 bytes)
SSL DBG [4] 0000:  16 03 02 00 40                                   ....@
SSL DBG [3] input record: msgtype = 22, version = [3:2], msglen = %zu
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 64 (-0xffffffc0)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record from network' (69 bytes)
SSL DBG [4] 0000:  16 03 02 00 40 68 93 59 5e 5c 7c 29 c6 19 43 1f  ....@h.Y^\|)..C.
SSL DBG [4] 0010:  63 fa 6e 98 79 5a c6 97 c8 d1 8b f3 bc 0d 05 73  c.n.yZ.........s
SSL DBG [4] 0020:  46 af 15 0c 62 35 e0 91 b7 5f 4c f4 1a 32 30 a3  F...b5..._L..20.
SSL DBG [4] 0030:  90 7b 6b 41 f3 d5 d2 14 a8 bf f2 43 b0 93 95 ca  .{kA.......C....
SSL DBG [4] 0040:  ac f0 ad d1 bd                                   .....
SSL DBG [2] => decrypt buf
SSL DBG [2] <= decrypt buf
SSL DBG [4] dumping 'input payload after decrypt' (16 bytes)
SSL DBG [4] 0000:  14 00 00 0c 16 44 61 26 2f a7 81 cf 0f 0f 06 bb  .....Da&/.......
SSL DBG [3] handshake message: msglen = %zu, type = %u, hslen = %zu
SSL DBG [2] <= read record
SSL DBG [2] <= parse finished
SSL DBG [2] client state: 14
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [2] handshake: done
SSL DBG [2] client state: 15
SSL DBG [2] => flush output
SSL DBG [2] <= flush output
SSL DBG [3] => handshake wrapup
SSL DBG [3] => handshake wrapup: final free
SSL DBG [3] <= handshake wrapup: final free
SSL DBG [3] <= handshake wrapup
SSL DBG [2] <= handshake
SSL DBG [2] => write
SSL DBG [2] => write record
SSL DBG [2] => encrypt buf
SSL DBG [4] dumping 'before encrypt: output payload' (126 bytes)
SSL DBG [4] 0000:  47 45 54 20 2f 61 70 69 2f 76 31 2f 70 6f 73 74  GET /api/v1/post
SSL DBG [4] 0010:  73 2f 20 48 54 54 50 2f 31 2e 30 0d 0a 48 6f 73  s/ HTTP/1.0..Hos
SSL DBG [4] 0020:  74 3a 20 36 34 30 62 79 34 38 30 2e 63 6f 6d 0d  t: 640by480.com.
SSL DBG [4] 0030:  0a 55 73 65 72 2d 41 67 65 6e 74 3a 20 36 34 30  .User-Agent: 640
SSL DBG [4] 0040:  62 79 34 38 30 2d 43 6c 61 73 73 69 63 4d 61 63  by480-ClassicMac
SSL DBG [4] 0050:  43 6c 69 65 6e 74 2f 31 2e 30 0d 0a 41 63 63 65  Client/1.0..Acce
SSL DBG [4] 0060:  70 74 3a 20 2a 2f 2a 0d 0a 43 6f 6e 6e 65 63 74  pt: */*..Connect
SSL DBG [4] 0070:  69 6f 6e 3a 20 63 6c 6f 73 65 0d 0a 0d 0a        ion: close....
SSL DBG [4] dumping 'computed mac' (20 bytes)
SSL DBG [4] 0000:  1f 01 12 88 75 f4 9f ba ab 20 02 1f bf bd 46 df  ....u.... ....F.
SSL DBG [4] 0010:  93 42 63 e8                                      .Bc.
SSL DBG [3] before encrypt: msglen = %zu, including %zu bytes of IV and %zu bytes of padding
SSL DBG [2] <= encrypt buf
SSL DBG [3] output record: msgtype = 23, version = [3:2], msglen = %zu
SSL DBG [4] dumping 'output record sent to network' (181 bytes)
SSL DBG [4] 0000:  17 03 02 00 b0 48 ef 97 f9 18 c0 c0 12 dc f0 dd  .....H..........
SSL DBG [4] 0010:  4f 9d f0 99 fc 30 05 47 63 5c b1 f4 74 13 0c 5c  O....0.Gc\..t..\
SSL DBG [4] 0020:  0b 87 95 2e 22 cf 7e b8 64 35 9d 9b 47 9e 12 3e  ....".~.d5..G..>
SSL DBG [4] 0030:  f0 45 d1 84 59 3f 62 4f 5a be 03 6d b2 68 59 97  .E..Y?bOZ..m.hY.
SSL DBG [4] 0040:  e5 de ab fc 70 4c 05 0a af 90 f9 89 a9 a6 d5 17  ....pL..........
SSL DBG [4] 0050:  2a fd c3 38 48 fb 22 12 0a ac b9 4b bb 61 fd aa  *..8H."....K.a..
SSL DBG [4] 0060:  f7 55 93 20 c0 6d 01 27 f0 99 4a d8 a5 5a 0c c9  .U. .m.'..J..Z..
SSL DBG [4] 0070:  0e 4b ee 55 3c e8 be ce 7b fc 82 2c 2a 06 b1 68  .K.U<...{..,*..h
SSL DBG [4] 0080:  a8 8d 8b 14 1f 53 1d 7a 01 21 44 3c 20 99 21 ef  .....S.z.!D< .!.
SSL DBG [4] 0090:  c1 26 9b bd 00 32 9f 44 6a b6 f1 c8 5c 21 47 9f  .&...2.Dj...\!G.
SSL DBG [4] 00a0:  78 75 b7 83 cc 82 0a da 70 08 7a 65 98 d1 76 ee  xu......p.ze..v.
SSL DBG [4] 00b0:  1d 0b 5e 4a 87                                   ..^J.
SSL DBG [2] => flush output
SSL DBG [2] message length: %zu, out_left: %zu
SSL DBG [2] ssl->f_send() returned 181 (-0xffffff4b)
SSL DBG [2] <= flush output
SSL DBG [2] <= write record
SSL DBG [2] <= write
SSL DBG [2] => read
SSL DBG [2] => read record
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 5 (-0xfffffffb)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record header' (5 bytes)
SSL DBG [4] 0000:  17 03 02 01 60                                   ....`
SSL DBG [3] input record: msgtype = 23, version = [3:2], msglen = %zu
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 352 (-0xfffffea0)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record from network' (357 bytes)
SSL DBG [4] 0000:  17 03 02 01 60 13 71 09 b5 17 47 b9 19 41 f5 59  ....`.q...G..A.Y
SSL DBG [4] 0010:  ee c3 14 74 7a a6 a0 e6 3d ea 52 a9 2e f9 46 5b  ...tz...=.R...F[
SSL DBG [4] 0020:  6d 32 81 b1 3c c8 9e 7b 76 0a f0 c9 13 0b ec f9  m2..<..{v.......
SSL DBG [4] 0030:  8f b0 7d 5e 27 a0 13 38 3a c4 c5 13 74 c9 fb 6c  ..}^'..8:...t..l
SSL DBG [4] 0040:  a1 0e 14 19 ea 32 8e 8f 95 5d ce 73 94 b1 e8 02  .....2...].s....
SSL DBG [4] 0050:  14 77 b8 20 d0 9d b8 a2 5e f1 4c e5 5b c0 8f c8  .w. ....^.L.[...
SSL DBG [4] 0060:  15 cb 9c 20 3a ce d9 76 f1 df 15 ac c4 98 79 8a  ... :..v......y.
SSL DBG [4] 0070:  44 b5 dd 6b 4a 9b 4a e5 44 a7 b5 07 6c 39 0e a8  D..kJ.J.D...l9..
SSL DBG [4] 0080:  73 49 58 ed 17 6d c4 4e ee 74 ec 0c 25 25 dd 34  sIX..m.N.t..%%.4
SSL DBG [4] 0090:  65 38 20 59 5d 13 cf 4d d7 af 54 be f9 f3 af b9  e8 Y]..M..T.....
SSL DBG [4] 00a0:  e3 25 f4 46 a6 c5 31 a1 fe 8e fd cb f9 49 d3 3e  .%.F..1......I.>
SSL DBG [4] 00b0:  ff ce e2 96 a9 3e a6 12 5e 3f f3 bb ae c8 10 26  .....>..^?.....&
SSL DBG [4] 00c0:  6f bf 99 e3 d4 40 2d 2d 48 07 49 52 8a e0 be 74  o....@--H.IR...t
SSL DBG [4] 00d0:  cb 29 f4 de 11 5a bb 5a bd 77 8c 26 e5 f7 c9 e1  .)...Z.Z.w.&....
SSL DBG [4] 00e0:  43 67 12 bd df 0e ab 39 b3 7b 84 71 d4 13 db 40  Cg.....9.{.q...@
SSL DBG [4] 00f0:  f2 aa 75 61 b2 05 9b af f2 49 5b e4 9c ea b5 2c  ..ua.....I[....,
SSL DBG [4] 0100:  ca 0e d2 8a 41 41 2e e6 ae f1 a1 30 e1 4c c9 56  ....AA.....0.L.V
SSL DBG [4] 0110:  1d ee 8c 36 32 5f fe dd b8 ac 34 70 7d 0f e5 c4  ...62_....4p}...
SSL DBG [4] 0120:  f6 a4 43 03 22 bd f4 fc b4 53 20 4e 49 43 30 56  ..C."....S NIC0V
SSL DBG [4] 0130:  3e 0d af f0 21 a5 45 c2 9a 98 bc 38 a7 f0 52 62  >...!.E....8..Rb
SSL DBG [4] 0140:  48 b6 5d 1a 96 23 b3 3a 9d c5 f8 5f f1 49 3e bf  H.]..#.:..._.I>.
SSL DBG [4] 0150:  0d 9c 14 de 93 50 a4 20 3e 73 e2 9c ba 1a e2 ad  .....P. >s......
SSL DBG [4] 0160:  20 85 be 11 a7                                    ....
SSL DBG [2] => decrypt buf
SSL DBG [2] <= decrypt buf
SSL DBG [4] dumping 'input payload after decrypt' (301 bytes)
SSL DBG [4] 0000:  48 54 54 50 2f 31 2e 31 20 32 30 30 20 4f 4b 0d  HTTP/1.1 200 OK.
SSL DBG [4] 0010:  0a 44 61 74 65 3a 20 54 68 75 2c 20 31 30 20 41  .Date: Thu, 10 A
SSL DBG [4] 0020:  70 72 20 32 30 32 35 20 30 36 3a 35 36 3a 32 36  pr 2025 06:56:26
SSL DBG [4] 0030:  20 47 4d 54 0d 0a 53 65 72 76 65 72 3a 20 41 70   GMT..Server: Ap
SSL DBG [4] 0040:  61 63 68 65 2f 32 2e 34 2e 32 39 20 28 55 62 75  ache/2.4.29 (Ubu
SSL DBG [4] 0050:  6e 74 75 29 0d 0a 43 6f 6e 74 65 6e 74 2d 4c 65  ntu)..Content-Le
SSL DBG [4] 0060:  6e 67 74 68 3a 20 38 37 39 33 0d 0a 56 61 72 79  ngth: 8793..Vary
SSL DBG [4] 0070:  3a 20 41 63 63 65 70 74 2c 43 6f 6f 6b 69 65 0d  : Accept,Cookie.
SSL DBG [4] 0080:  0a 41 6c 6c 6f 77 3a 20 47 45 54 2c 20 50 4f 53  .Allow: GET, POS
SSL DBG [4] 0090:  54 2c 20 48 45 41 44 2c 20 4f 50 54 49 4f 4e 53  T, HEAD, OPTIONS
SSL DBG [4] 00a0:  0d 0a 58 2d 46 72 61 6d 65 2d 4f 70 74 69 6f 6e  ..X-Frame-Option
SSL DBG [4] 00b0:  73 3a 20 44 45 4e 59 0d 0a 58 2d 43 6f 6e 74 65  s: DENY..X-Conte
SSL DBG [4] 00c0:  6e 74 2d 54 79 70 65 2d 4f 70 74 69 6f 6e 73 3a  nt-Type-Options:
SSL DBG [4] 00d0:  20 6e 6f 73 6e 69 66 66 0d 0a 52 65 66 65 72 72   nosniff..Referr
SSL DBG [4] 00e0:  65 72 2d 50 6f 6c 69 63 79 3a 20 73 61 6d 65 2d  er-Policy: same-
SSL DBG [4] 00f0:  6f 72 69 67 69 6e 0d 0a 43 6f 6e 6e 65 63 74 69  origin..Connecti
SSL DBG [4] 0100:  6f 6e 3a 20 63 6c 6f 73 65 0d 0a 43 6f 6e 74 65  on: close..Conte
SSL DBG [4] 0110:  6e 74 2d 54 79 70 65 3a 20 61 70 70 6c 69 63 61  nt-Type: applica
SSL DBG [4] 0120:  74 69 6f 6e 2f 6a 73 6f 6e 0d 0a 0d 0a           tion/json....
SSL DBG [2] <= read record
SSL DBG [2] <= read
SSL DBG [2] => read
SSL DBG [2] => read record
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 5 (-0xfffffffb)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record header' (5 bytes)
SSL DBG [4] 0000:  17 03 02 1e 90                                   .....
SSL DBG [3] input record: msgtype = 23, version = [3:2], msglen = %zu
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned 7824 (-0xffffe170)
SSL DBG [2] <= fetch input
SSL DBG [4] dumping 'input record from network' (7829 bytes)
SSL DBG [4] 0000:  17 03 02 1e 90 e1 9f f5 29 2d cd 71 c3 69 2b 6d  ........)-.q.i+m
SSL DBG [4] 0010:  ee b3 39 7d a3 0b 67 b4 c0 3a 11 46 7f de 69 a3  ..9}..g..:.F..i.
SSL DBG [4] 0020:  d3 a9 57 14 e4 27 3c 01 05 8d c1 ac 75 96 61 c1  ..W..'<.....u.a.
SSL DBG [4] 0030:  8f 5f b4 5c 6f 46 34 dc 3e 54 3d a4 09 a0 64 f8  ._.\oF4.>T=...d.
SSL DBG [4] 0040:  5c 2d 30 fd ea c5 32 63 5e 47 c0 72 7a 1e 01 5f  \-0...2c^G.rz.._
SSL DBG [4] 0050:  3f ef fe ae 21 9c d2 bf 14 66 bd 8e ae 2e 3c 88  ?...!....f....<.
SSL DBG [4] 0060:  e2 e6 5b d5 63 dd b8 1b 9c b5 aa f0 3f 52 9f 2a  ..[.c.......?R.*
SSL DBG [4] 0070:  a1 67 56 2c ab ff e7 92 42 18 b5 93 4d f8 9d 49  .gV,....B...M..I
SSL DBG [4] 0080:  13 8d c6 c2 b4 fc 47 04 a0 0e 5f 7d e7 dd a2 1d  ......G..._}....
SSL DBG [4] 0090:  84 88 41 3a d0 3b 9b 6d dd ed fc 80 20 83 ca f1  ..A:.;.m.... ...
SSL DBG [4] 00a0:  ba 7d 1a f3 15 24 db 72 dd e0 d4 36 13 15 44 b9  .}...$.r...6..D.
SSL DBG [4] 00b0:  08 fe 66 db cb 79 d3 f8 8f c6 18 f7 ca 12 9c 28  ..f..y.........(
SSL DBG [4] 00c0:  ba 2e 91 9a 6e ef af c6 29 1b 25 c8 27 6b ba 1d  ....n...).%.'k..
SSL DBG [4] 00d0:  af 48 09 8d 5a fe 84 b2 68 31 b2 a5 21 57 aa 6b  .H..Z...h1..!W.k
SSL DBG [4] 00e0:  0f 25 07 a6 81 67 81 a8 30 bc 0b a6 3f 85 fa 3d  .%...g..0...?..=
SSL DBG [4] 00f0:  ff c7 d8 c2 ea fb f0 cd 6e ca 77 d4 ad 85 8d c9  ........n.w.....
SSL DBG [4] 0100:  8d c0 c0 c6 81 47 98 ec 18 8f 1d 6b bd 07 85 64  .....G.....k...d
SSL DBG [4] 0110:  4b 6f 11 e4 9f 77 b2 88 a0 76 16 a2 ae a6 1f 37  Ko...w...v.....7
SSL DBG [4] 0120:  b0 de 99 67 ab 77 d7 cd d5 a1 42 a0 fa 0e 06 d7  ...g.w....B.....
SSL DBG [4] 0130:  7c 6d c9 b1 99 7b 36 3a 0b 5e 06 7e df 0c 28 42  |m...{6:.^.~..(B
SSL DBG [4] 0140:  e6 e2 31 bc 9b eb 01 77 53 3c c7 96 3c d4 45 cd  ..1....wS<..<.E.
SSL DBG [4] 0150:  46 14 3e 6e c2 51 da 67 b4 b7 25 3d 21 4f 97 f1  F.>n.Q.g..%=!O..
SSL DBG [4] 0160:  4b 4a 71 17 ac 90 52 db 23 05 16 b1 48 1c 55 bc  KJq...R.#...H.U.
SSL DBG [4] 0170:  9e d5 10 c4 47 7e 10 c5 d5 8b a5 4f 21 bf 69 ac  ....G~.....O!.i.
SSL DBG [4] 0180:  74 8e a0 d1 01 03 e4 f8 ac 81 f9 eb d5 6a 15 04  t............j..
SSL DBG [4] 0190:  cd f7 e3 52 ae 58 fe aa 8f 66 af 6c 01 4f 35 48  ...R.X...f.l.O5H
SSL DBG [4] 01a0:  51 3f c7 03 48 db 0b 5b 1c 74 78 77 fa b3 fe ed  Q?..H..[.txw....
SSL DBG [4] 01b0:  2f cc 31 f4 0a f1 33 59 dd 37 66 98 d1 9d d1 39  /.1...3Y.7f....9
SSL DBG [4] 01c0:  23 51 06 7a f4 04 0b a1 a7 48 5a a6 4c 47 15 4a  #Q.z.....HZ.LG.J
SSL DBG [4] 01d0:  07 fb 74 43 ba 2c 0b e1 7b 5a b1 77 5d f8 c2 21  ..tC.,..{Z.w]..!
SSL DBG [4] 01e0:  4a b1 d2 cf 15 36 70 53 34 b0 2e 1a 99 db f2 c4  J....6pS4.......
SSL DBG [4] 01f0:  61 82 7b 33 a2 9e 76 21 29 12 87 b3 21 9e 28 09  a.{3..v!)...!.(.
SSL DBG [4] 0200:  3b a3 a6 95 b4 2f f0 2e 64 9c 1b 51 fc 0f 30 d4  ;..../..d..Q..0.
SSL DBG [4] 0210:  3a 69 55 52 75 6c d3 38 b6 2b 4a 7b 20 88 10 ad  :iURul.8.+J{ ...
SSL DBG [4] 0220:  d7 66 79 6b 66 00 0e 98 ae 73 5a d0 02 cd 3b 51  .fykf....sZ...;Q
SSL DBG [4] 0230:  d7 5f 8a 85 9a c9 a6 4c a2 0c 8e 61 41 3c 30 d4  ._.....L...aA<0.
SSL DBG [4] 0240:  99 a8 2e c1 ad 5f 6b e2 0a a1 50 bc 98 e3 94 b3  ....._k...P.....
SSL DBG [4] 0250:  d3 4a 18 b8 4c 93 76 da 2f aa df c5 70 15 fe 6b  .J..L.v./...p..k
SSL DBG [4] 0260:  79 d4 9f bf 2d 53 d5 ee 17 38 ae e0 f6 4a 28 c0  y...-S...8...J(.
SSL DBG [4] 0270:  b9 cb b9 84 95 68 9d 8e aa f4 c0 c8 4f a8 a9 ef  .....h......O...
SSL DBG [4] 0280:  eb a1 68 ff 14 35 41 28 c3 5f be e9 84 28 0c 1c  ..h..5A(._...(..
SSL DBG [4] 0290:  c3 31 e6 a5 60 6c a1 98 a0 01 34 5f 1d fb d5 85  .1..`l....4_....
SSL DBG [4] 02a0:  6e c5 90 df b0 0b f9 cc 45 f5 47 79 47 db 5d 15  n.......E.GyG.].
SSL DBG [4] 02b0:  93 f1 9b b7 33 78 ac 7e f1 76 54 ed a6 25 f8 41  ....3x.~.vT..%.A
SSL DBG [4] 02c0:  82 50 08 cd 50 dc 29 13 0d 3a d5 c6 34 af 3e 99  .P..P.)..:..4.>.
SSL DBG [4] 02d0:  ad 87 1b 02 53 95 df 32 93 e7 28 b3 e2 0e 85 29  ....S..2..(....)
SSL DBG [4] 02e0:  b1 9a a1 77 01 4f 44 fb 0a 73 2b 41 68 07 21 cc  ...w.OD..s+Ah.!.
SSL DBG [4] 02f0:  b6 6b 77 e6 80 f7 c4 05 89 9e e7 d6 60 21 5a 78  .kw.........`!Zx
SSL DBG [4] 0300:  2a 7a 9c 0a db 03 e6 e5 42 97 26 04 85 be a1 9f  *z......B.&.....
SSL DBG [4] 0310:  4d e4 00 57 a1 19 2a b6 d8 da c6 24 39 f0 24 72  M..W..*....$9.$r
SSL DBG [4] 0320:  3a 97 bc 06 1d 4c 89 5d c4 ca 49 d8 b2 8d 9a fa  :....L.]..I.....
SSL DBG [4] 0330:  19 71 5f 9f 0e d1 8a 1c c1 9e 49 00 d5 bc 1a 15  .q_.......I.....
SSL DBG [4] 0340:  1c a3 a5 88 62 17 a6 67 97 45 71 2d ab 0e b1 1b  ....b..g.Eq-....
SSL DBG [4] 0350:  27 47 15 0a 87 78 49 59 b3 43 25 56 56 8e f5 52  'G...xIY.C%VV..R
SSL DBG [4] 0360:  b2 a4 e5 05 9b 2d a5 c1 00 80 61 80 3d 9f 0d a9  .....-....a.=...
SSL DBG [4] 0370:  41 8d 53 03 6d a3 ed 92 19 dc 42 f0 77 27 2d fe  A.S.m.....B.w'-.
SSL DBG [4] 0380:  1d 82 8a dd 2c 03 f3 c5 6b ec e4 93 a5 b3 0c 26  ....,...k......&
SSL DBG [4] 0390:  0c aa cf 60 d3 6b 5a 67 4a 94 a5 98 81 f5 6f f0  ...`.kZgJ.....o.
SSL DBG [4] 03a0:  dc 11 6a d8 3c 71 d5 69 e9 8a fd e5 aa 9a 54 82  ..j.<q.i......T.
SSL DBG [4] 03b0:  65 38 5a 70 ec 4f 76 7c 49 bb b4 75 fb 9a 2d c9  e8Zp.Ov|I..u..-.
SSL DBG [4] 03c0:  0b 56 37 c4 d4 1e 58 3c db 50 05 6b e5 d2 92 3a  .V7...X<.P.k...:
SSL DBG [4] 03d0:  04 1f 7f 78 a2 af 5b a3 97 dc 45 39 3b c3 69 99  ...x..[...E9;.i.
SSL DBG [4] 03e0:  90 d8 7c 00 06 41 c8 75 02 ab cb 54 5f 48 c3 c9  ..|..A.u...T_H..
SSL DBG [4] 03f0:  d9 4f 01 df 53 7a 04 d7 20 fe 5e 43 66 f6 25 1d  .O..Sz.. .^Cf.%.
SSL DBG [4] 0400:  19 3b 42 6c 15 18 0c f5 cd 5e ed 49 cb 6b 93 4f  .;Bl.....^.I.k.O
SSL DBG [4] 0410:  4f 28 3a ff 84 9a e3 0d 0f ea 81 f5 e5 06 26 29  O(:...........&)
SSL DBG [4] 0420:  da 33 ad 12 49 37 b3 3f 8d b1 80 b7 81 7a 3e cd  .3..I7.?.....z>.
SSL DBG [4] 0430:  88 d3 d6 23 7d 9e cc b3 8e ce 61 83 83 38 e7 22  ...#}.....a..8."
SSL DBG [4] 0440:  93 7e d6 02 e3 5e 1d 2c 21 8c c2 1f d9 f7 22 20  .~...^.,!....." 
SSL DBG [4] 0450:  01 64 c6 b0 3d 6c b3 36 a3 42 95 f9 c6 94 23 15  .d..=l.6.B....#.
SSL DBG [4] 0460:  96 ed d5 1e f4 aa f0 b1 28 5d 66 20 56 98 1c ba  ........(]f V...
SSL DBG [4] 0470:  b6 49 8f 53 2d 65 dd 44 3d 52 85 47 25 66 ac d1  .I.S-e.D=R.G%f..
SSL DBG [4] 0480:  2a d6 d0 01 10 e4 ff 2c 70 55 29 b5 d9 98 c5 71  *......,pU)....q
SSL DBG [4] 0490:  d1 14 aa 64 f6 62 ae 53 2f 46 80 d8 96 1a 41 66  ...d.b.S/F....Af
SSL DBG [4] 04a0:  95 34 c2 5a 8b a1 62 40 10 ce ec 29 95 5e f9 a2  .4.Z..b@...).^..
SSL DBG [4] 04b0:  82 71 1b af 35 74 60 b4 f4 bb c8 fc fd ce 21 c2  .q..5t`.......!.
SSL DBG [4] 04c0:  62 f9 39 88 9b 68 25 40 82 03 31 5f 8c a7 73 08  b.9..h%@..1_..s.
SSL DBG [4] 04d0:  ce 58 7a 02 31 fb 84 60 71 5a dd c9 1d 79 8c 2e  .Xz.1..`qZ...y..
SSL DBG [4] 04e0:  12 a3 b8 64 0a be 4c 30 8e d9 87 b8 47 2c e7 68  ...d..L0....G,.h
SSL DBG [4] 04f0:  62 2f e1 8a 85 43 5e 30 65 36 38 e2 2b 23 31 a4  b/...C^0e68.+#1.
SSL DBG [4] 0500:  f2 a2 4e d6 29 96 41 c7 5b 6b 36 4f 2e 1c c2 e6  ..N.).A.[k6O....
SSL DBG [4] 0510:  eb 77 d2 07 36 48 ef c1 15 4b a5 06 88 53 30 fb  .w..6H...K...S0.
SSL DBG [4] 0520:  6b 19 05 b3 0d 2f b8 8d 76 18 4e f9 18 dd f5 66  k..../..v.N....f
SSL DBG [4] 0530:  b5 af 02 83 fb 24 ec 81 1a f1 c5 be 04 20 63 3e  .....$....... c>
SSL DBG [4] 0540:  a0 86 8c 27 d7 76 80 8f 95 36 e3 44 af 58 64 b0  ...'.v...6.D.Xd.
SSL DBG [4] 0550:  d9 3f 64 2e 59 1d b4 07 72 98 7a 83 ed b5 db 01  .?d.Y...r.z.....
SSL DBG [4] 0560:  9a f4 65 56 d4 4a 75 51 d5 9e 06 f1 64 a9 fe 19  ..eV.JuQ....d...
SSL DBG [4] 0570:  e5 57 30 45 2a 64 f3 8f 3c 2b ae 02 ed cd 72 34  .W0E*d..<+....r4
SSL DBG [4] 0580:  47 86 be e4 97 0f aa 61 72 f7 c3 a6 46 d6 61 e1  G......ar...F.a.
SSL DBG [4] 0590:  50 71 d9 18 ec cb f1 eb 9b f2 74 c1 d5 d8 06 c7  Pq........t.....
SSL DBG [4] 05a0:  e7 c6 c1 54 ae 31 c5 90 6e 3d 60 5e c9 74 8b de  ...T.1..n=`^.t..
SSL DBG [4] 05b0:  75 3e 62 fc 66 f2 e1 50 1f 7a 62 b6 f6 53 46 18  u>b.f..P.zb..SF.
SSL DBG [4] 05c0:  5a 77 26 f0 f9 bc 90 7a 98 d3 09 72 17 87 3a d5  Zw&....z...r..:.
SSL DBG [4] 05d0:  67 e9 0e 5f ae af fe 7c 7e 9d 15 94 02 fa ea a9  g.._...|~.......
SSL DBG [4] 05e0:  fb 47 7f eb 69 2c 48 0b 64 10 4d b5 14 b1 87 bd  .G..i,H.d.M.....
SSL DBG [4] 05f0:  c0 b9 3d 98 e6 d0 2b 57 49 a3 38 87 cf 4c 53 a0  ..=...+WI.8..LS.
SSL DBG [4] 0600:  6a 84 b6 83 c5 54 b8 5c b5 64 a4 ab 0c 49 86 0f  j....T.\.d...I..
SSL DBG [4] 0610:  a0 7f 59 f7 e5 a3 de 12 92 e1 7e f8 70 79 0c 29  ..Y.......~.py.)
SSL DBG [4] 0620:  7e 74 0f 3e 71 94 42 ea b4 a1 e0 0b 37 6b 01 eb  ~t.>q.B.....7k..
SSL DBG [4] 0630:  cb fa 28 eb f1 e9 56 a1 a5 bc cb e4 fe 03 e9 af  ..(...V.........
SSL DBG [4] 0640:  06 65 44 d2 8d 58 29 ad 4c 23 4b 12 cf b2 fa d2  .eD..X).L#K.....
SSL DBG [4] 0650:  2c 84 03 8f 13 99 89 b1 b2 4a d8 95 c0 9b e3 52  ,........J.....R
SSL DBG [4] 0660:  c2 ea af 4b 11 45 59 1f 69 7a 6c 9d a2 cf ac ec  ...K.EY.izl.....
SSL DBG [4] 0670:  c6 13 19 b0 7f 76 7f 47 a4 ae 98 83 d8 31 fd 08  .....v.G.....1..
SSL DBG [4] 0680:  b5 d2 aa f1 1a 2b 5b 4f 6e ca 70 f0 da fb 63 af  .....+[On.p...c.
SSL DBG [4] 0690:  40 95 b0 36 33 33 5d 81 c9 74 0d 6b e5 51 b7 4d  @..633]..t.k.Q.M
SSL DBG [4] 06a0:  d5 5f 85 ef 08 15 61 63 71 73 a6 0a 60 28 13 7a  ._....acqs..`(.z
SSL DBG [4] 06b0:  41 d2 3c f7 a0 91 7b 2f ce ac bd e7 e5 82 e9 eb  A.<...{/........
SSL DBG [4] 06c0:  8a 08 af d6 12 a7 05 10 93 23 c9 eb c6 10 97 e7  .........#......
SSL DBG [4] 06d0:  99 b6 31 e1 05 15 a8 c7 68 73 f8 c2 f2 48 39 23  ..1.....hs...H9#
SSL DBG [4] 06e0:  2b c6 79 3b 7d 0e 0e c7 c8 5c 3f 2b dc a6 c5 35  +.y;}....\?+...5
SSL DBG [4] 06f0:  84 21 06 92 f5 3e 93 5d 4c a8 b0 af 79 fa f4 14  .!...>.]L...y...
SSL DBG [4] 0700:  01 9c e1 3d a8 c4 a0 64 43 34 7e 9a be b6 d9 65  ...=...dC4~....e
SSL DBG [4] 0710:  6e c6 18 a5 26 5b 2a 14 bc 63 f8 ef 5d 8e aa 7c  n...&[*..c..]..|
SSL DBG [4] 0720:  5d 8e c7 97 2b cb 60 91 ca a5 6b 33 89 77 b2 36  ]...+.`...k3.w.6
SSL DBG [4] 0730:  9f f8 b7 a6 90 bf 79 f9 ee 24 dc 93 12 3a f6 34  ......y..$...:.4
SSL DBG [4] 0740:  98 d7 e1 ce e4 d3 16 89 69 9a 3b 6b b3 ed 20 80  ........i.;k.. .
SSL DBG [4] 0750:  db db 3e cc 1e b3 ba 93 e8 ef 75 7c db cc bf 99  ..>.......u|....
SSL DBG [4] 0760:  27 b4 f5 3c 18 32 20 0b 6b 42 eb 7b 39 dd 0a ed  '..<.2 .kB.{9...
SSL DBG [4] 0770:  ad dd d8 6f 36 e5 f6 9f 33 e6 01 f8 4c 50 da 45  ...o6...3...LP.E
SSL DBG [4] 0780:  d5 0c a1 65 a3 79 7d 3d ee 00 ce 1b 39 bd c4 43  ...e.y}=....9..C
SSL DBG [4] 0790:  45 56 d0 92 56 73 f5 55 a0 4b 41 8d 1c 14 ed e8  EV..Vs.U.KA.....
SSL DBG [4] 07a0:  45 70 00 2b 5f 59 36 1f c1 e1 8e 20 a2 47 6d 3a  Ep.+_Y6.... .Gm:
SSL DBG [4] 07b0:  06 a3 b1 c8 e6 9b 64 4d 79 79 f1 fd 56 7f 32 da  ......dMyy..V.2.
SSL DBG [4] 07c0:  92 ac e8 93 70 76 21 43 5c 9b c4 65 0d 47 fa 99  ....pv!C\..e.G..
SSL DBG [4] 07d0:  8e a3 42 3b aa 43 59 f4 bf e2 08 47 5c 82 9c f2  ..B;.CY....G\...
SSL DBG [4] 07e0:  59 80 c1 4f aa ff bc cc 21 ce 69 b3 01 53 6c 0d  Y..O....!.i..Sl.
SSL DBG [4] 07f0:  18 34 8d 4c 9c 7e 69 6b bc 1d 77 07 0f 02 f7 e5  .4.L.~ik..w.....
SSL DBG [4] 0800:  3e 67 6b 63 b5 33 ec 58 19 5e bf 4c ed 34 34 9c  >gkc.3.X.^.L.44.
SSL DBG [4] 0810:  b4 40 f1 ec 1d de ca 61 e2 2d 14 cc fd 3b 00 f2  .@.....a.-...;..
SSL DBG [4] 0820:  af cf ff 66 0a a9 5b ea 64 2d 56 55 1d 41 fd d0  ...f..[.d-VU.A..
SSL DBG [4] 0830:  b3 b6 16 1b 3d aa 45 93 a9 b6 b9 46 d1 91 ce 7e  ....=.E....F...~
SSL DBG [4] 0840:  01 55 50 88 d1 86 a4 2d 24 42 bc c0 77 c8 c5 ff  .UP....-$B..w...
SSL DBG [4] 0850:  df 08 7f 4d 22 a8 67 e7 63 ea 66 f9 93 e9 9d aa  ...M".g.c.f.....
SSL DBG [4] 0860:  dd c2 c2 c0 e4 bf 23 d7 c6 ff 82 fb 92 44 d3 a7  ......#......D..
SSL DBG [4] 0870:  d4 87 85 e5 91 46 d1 9e 3d fb 00 f9 9a cb 74 1d  .....F..=.....t.
SSL DBG [4] 0880:  67 59 64 7a 7a 49 c0 89 1e f6 d5 42 99 dc 13 f2  gYdzzI.....B....
SSL DBG [4] 0890:  a0 39 9c ff d6 60 0a 4c 8e 20 60 08 af 9e 3c 72  .9...`.L. `...<r
SSL DBG [4] 08a0:  a0 8e 66 e3 ff 0a 71 60 3a e2 d0 9e 7e 1e 8b 31  ..f...q`:...~..1
SSL DBG [4] 08b0:  76 6c d1 89 fb 8b 31 fe 2d 72 f5 51 3c 0c 1e 2b  vl....1.-r.Q<..+
SSL DBG [4] 08c0:  36 a4 07 27 b5 a3 84 87 e1 ef 20 ed 50 c3 82 f1  6..'...... .P...
SSL DBG [4] 08d0:  c8 5b 32 dc cc 4e 7b 68 b2 48 2e 68 eb 3f 81 08  .[2..N{h.H.h.?..
SSL DBG [4] 08e0:  a4 7c 6d 63 62 6a e8 53 ce 7a 0b df 1d 29 f0 ac  .|mcbj.S.z...)..
SSL DBG [4] 08f0:  b2 34 31 c4 36 8f 27 91 e1 16 1e 8b 6b 01 e8 07  .41.6.'.....k...
SSL DBG [4] 0900:  e3 b7 05 b0 f2 f7 f6 3b 3b ab 96 59 80 90 49 fc  .......;;..Y..I.
SSL DBG [4] 0910:  a8 19 ec dd fe 66 18 ec 89 4b 5a 9e 62 82 9e 49  .....f...KZ.b..I
SSL DBG [4] 0920:  32 95 49 95 96 39 d7 75 2e 0f bc 55 55 44 d5 ac  2.I..9.u...UUD..
SSL DBG [4] 0930:  10 69 fd a0 0a 21 fe 18 6b ea 1a 83 56 c8 54 27  .i...!..k...V.T'
SSL DBG [4] 0940:  21 72 d9 1b 73 b6 86 e9 80 32 36 14 90 76 41 08  !r..s....26..vA.
SSL DBG [4] 0950:  0a 7e b1 30 d9 42 b8 c5 f8 73 9c c9 9d 2c ee 49  .~.0.B...s...,.I
SSL DBG [4] 0960:  bc 18 c2 39 41 7b e7 19 26 dd 19 3f 09 78 9d 13  ...9A{..&..?.x..
SSL DBG [4] 0970:  4a 61 c1 a8 01 cf 3b e5 34 49 b6 9d b5 d9 46 ad  Ja....;.4I....F.
SSL DBG [4] 0980:  b1 ad 65 3a ac cf 33 78 a9 1e 0b af a5 25 b2 2e  ..e:..3x.....%..
SSL DBG [4] 0990:  58 1b b4 a5 0f 7d 40 ef 46 75 33 83 e8 32 1e 70  X....}@.Fu3..2.p
SSL DBG [4] 09a0:  b4 f1 d2 4b 10 53 f4 4d 00 c7 5b df d6 ea 77 a0  ...K.S.M..[...w.
SSL DBG [4] 09b0:  db 49 15 cc 87 38 fc 2f af 41 c2 e8 92 fc 75 af  .I...8./.A....u.
SSL DBG [4] 09c0:  fe 80 af 18 d3 6b b8 d8 ec 9c 4f 20 d5 09 7f 3f  .....k....O ...?
SSL DBG [4] 09d0:  0d da 21 0e 00 8c 3c a5 3a f2 b0 f5 5e 77 50 54  ..!...<.:...^wPT
SSL DBG [4] 09e0:  f0 fe 32 3e 4b 8d f6 46 46 fb 2d de fb 3a 47 1a  ..2>K..FF.-..:G.
SSL DBG [4] 09f0:  34 75 cb e4 52 a4 b0 af a5 87 52 d7 38 59 4e b2  4u..R.....R.8YN.
SSL DBG [4] 0a00:  dd 30 64 f5 ee ca 6d be 99 e1 d1 a4 a4 1a b2 2f  .0d...m......../
SSL DBG [4] 0a10:  f3 49 8d 42 6d e1 56 0b ac ae f5 f2 38 dd 1c 26  .I.Bm.V.....8..&
SSL DBG [4] 0a20:  e5 1c 96 b6 ed fa ab 5d 40 0d fc 32 e6 c7 95 6d  .......]@..2...m
SSL DBG [4] 0a30:  3a 7d 95 8a c9 eb 19 36 fa 01 91 8a f7 31 c7 3f  :}.....6.....1.?
SSL DBG [4] 0a40:  d1 47 06 0a f2 f5 c7 89 2c f2 3f f2 7d d4 97 14  .G......,.?.}...
SSL DBG [4] 0a50:  8e af 30 11 8f 3e 3d 95 91 52 9b 08 fd ed ed f4  ..0..>=..R......
SSL DBG [4] 0a60:  38 b1 23 64 f4 ba e1 04 45 98 ef 41 57 50 98 5e  8.#d....E..AWP.^
SSL DBG [4] 0a70:  31 3a eb d1 5c 3a 17 72 25 24 69 72 eb b0 3e db  1:..\:.r%$ir..>.
SSL DBG [4] 0a80:  15 87 bc ad 9c 54 45 4b bd 93 a8 77 0a d0 2e ab  .....TEK...w....
SSL DBG [4] 0a90:  66 6d ad 77 48 19 48 e5 e6 4c 1b 34 52 1e 3c 93  fm.wH.H..L.4R.<.
SSL DBG [4] 0aa0:  84 55 c9 61 10 45 a8 40 b1 19 44 af 66 d9 8c 62  .U.a.E.@..D.f..b
SSL DBG [4] 0ab0:  72 29 37 47 b7 eb 4a a5 d1 57 8b 22 b8 d3 27 77  r)7G..J..W."..'w
SSL DBG [4] 0ac0:  29 2e 99 39 5c 9b a9 ce 1d 01 5b 05 b5 cc 8b 2f  )..9\.....[..../
SSL DBG [4] 0ad0:  3e dc bf f3 f5 ff ea 26 a5 8f 82 c5 43 37 71 ba  >......&....C7q.
SSL DBG [4] 0ae0:  d3 69 77 6d a5 e9 e5 8d 3a 95 11 92 13 f5 c1 3e  .iwm....:......>
SSL DBG [4] 0af0:  90 af 3e 25 91 ef dc dd 68 e1 6b c1 61 d8 13 56  ..>%....h.k.a..V
SSL DBG [4] 0b00:  88 89 33 1b 49 d2 ad 2b 26 f7 1d 12 a1 75 ac 78  ..3.I..+&....u.x
SSL DBG [4] 0b10:  b2 f3 0f 25 02 74 6f bd 45 25 f4 a8 a5 50 88 a3  ...%.to.E%...P..
SSL DBG [4] 0b20:  70 2e 66 50 33 14 2b 41 cb fa bc 85 e0 fc 77 f9  p.fP3.+A......w.
SSL DBG [4] 0b30:  c1 07 55 92 ac 8b 6c e5 c0 2e d8 90 7c 8f c7 d8  ..U...l.....|...
SSL DBG [4] 0b40:  57 47 1f 19 ca 0f 4d 20 9c bb 3f db c1 8d 68 1d  WG....M ..?...h.
SSL DBG [4] 0b50:  94 da d3 d1 7a 9b e2 ca eb 51 ed 3a c9 d8 7b e3  ....z....Q.:..{.
SSL DBG [4] 0b60:  2f 82 28 11 e8 93 7a da 96 ef 77 a6 29 24 61 8b  /.(...z...w.)$a.
SSL DBG [4] 0b70:  2b 96 81 93 81 61 50 cd f2 5e ab 13 8f 5f 93 6f  +....aP..^..._.o
SSL DBG [4] 0b80:  61 9b ed 3b ff f1 7f 19 8e 54 5c 54 1e a7 48 7b  a..;.....T\T..H{
SSL DBG [4] 0b90:  a5 44 7f 3a 41 cd 0d 8f 7a 81 fa 8b 44 35 40 2d  .D.:A...z...D5@-
SSL DBG [4] 0ba0:  d4 f1 b8 7e 33 df d7 8b f3 a2 bc 96 9c d2 a2 5d  ...~3..........]
SSL DBG [4] 0bb0:  35 6e 05 b5 db c6 2f 1b c5 f7 43 33 58 a6 23 b4  5n..../...C3X.#.
SSL DBG [4] 0bc0:  ad d7 fb 2b ae af 83 d9 0c 71 8e 01 48 93 86 d6  ...+.....q..H...
SSL DBG [4] 0bd0:  1b 01 c9 95 5a 2a a5 2e d7 40 83 d4 c6 77 ef ce  ....Z*...@...w..
SSL DBG [4] 0be0:  a0 64 c0 91 c2 f8 4f 6f 2b ce 73 f0 05 1f d9 66  .d....Oo+.s....f
SSL DBG [4] 0bf0:  74 f6 7a d3 7c c9 d5 47 dd 89 6f bf a1 ee e1 17  t.z.|..G..o.....
SSL DBG [4] 0c00:  6e 61 73 56 11 43 16 03 1d 87 e8 14 a6 dc 26 db  nasV.C........&.
SSL DBG [4] 0c10:  91 dd 24 2c 1a ef b7 68 fa 5a 8b ce 48 a6 50 78  ..$,...h.Z..H.Px
SSL DBG [4] 0c20:  10 01 5b 91 9c 8f 34 93 ce 13 4b 11 53 d7 cc da  ..[...4...K.S...
SSL DBG [4] 0c30:  8e a4 5f c5 73 f3 46 12 e8 fc 7b 93 a2 4c 94 b8  .._.s.F...{..L..
SSL DBG [4] 0c40:  6e 10 0c 68 4b bf e6 b1 95 bc 99 71 e1 47 eb 32  n..hK......q.G.2
SSL DBG [4] 0c50:  45 ea d1 8c fb d4 2d 13 50 20 8b 85 b6 e1 4a af  E.....-.P ....J.
SSL DBG [4] 0c60:  f1 a9 ef b3 c4 1d 13 51 02 31 0a 05 50 cd bb a1  .......Q.1..P...
SSL DBG [4] 0c70:  f5 03 0a 99 96 64 db 45 af 7f 12 8d 5e 9c 1e 05  .....d.E....^...
SSL DBG [4] 0c80:  f3 9f f9 3e 0a 08 b3 8a 3e ef fc 0b ce 7c 42 5c  ...>....>....|B\
SSL DBG [4] 0c90:  27 ff 25 96 fc a5 84 69 bb d3 92 bb bf 6c 82 2b  '.%....i.....l.+
SSL DBG [4] 0ca0:  52 b0 40 ea f4 49 98 9e f0 b8 12 51 b6 d2 4c 56  R.@..I.....Q..LV
SSL DBG [4] 0cb0:  ac 0f e0 ac fc 63 01 03 fd 16 a1 53 cc 35 25 57  .....c.....S.5%W
SSL DBG [4] 0cc0:  f1 e2 c3 99 fc 2f e4 7e 34 90 aa 3d 0a 04 47 95  ...../.~4..=..G.
SSL DBG [4] 0cd0:  90 b5 2c 16 14 f8 24 45 27 7c 35 80 ae 96 e6 d5  ..,...$E'|5.....
SSL DBG [4] 0ce0:  ea 00 3c 9f a1 0d c9 ca 79 62 ff e8 ea 3a 9f bb  ..<.....yb...:..
SSL DBG [4] 0cf0:  96 12 ac 7b 79 0c 73 61 bc 81 40 ec 96 dd 13 8a  ...{y.sa..@.....
SSL DBG [4] 0d00:  b9 10 8d 2a 73 6d f4 ac ea 37 13 7a 0a 76 75 72  ...*sm...7.z.vur
SSL DBG [4] 0d10:  41 2a 4e 5f 1c d1 6e 32 d6 06 97 88 6b ec 1a dc  A*N_..n2....k...
SSL DBG [4] 0d20:  14 7a 38 f3 d5 8d c8 76 af 50 23 0d 76 fa 8f 1e  .z8....v.P#.v...
SSL DBG [4] 0d30:  68 4b 8a b2 c1 2b 69 f9 ef cc 52 5a 72 fb cc 22  hK...+i...RZr.."
SSL DBG [4] 0d40:  b9 01 86 f5 2a e7 7c 61 7d ea e3 0a 30 0f 43 dd  ....*.|a}...0.C.
SSL DBG [4] 0d50:  a6 e1 32 88 20 bf b5 a8 c5 97 e5 55 10 55 38 82  ..2. ......U.U8.
SSL DBG [4] 0d60:  91 9e 28 df 4e 7c a9 53 cf ce 51 8a d1 a1 c5 2b  ..(.N|.S..Q....+
SSL DBG [4] 0d70:  9f 99 ab 5b 98 d7 75 af c0 3e 26 69 5e d6 ec f5  ...[..u..>&i^...
SSL DBG [4] 0d80:  5a e2 da 8f 7b 38 1c 55 ed fb 80 48 fc 43 ae 6b  Z...{8.U...H.C.k
SSL DBG [4] 0d90:  5b a8 c2 d1 35 f1 75 1e ad 2e 03 aa 65 32 20 e7  [...5.u.....e2 .
SSL DBG [4] 0da0:  0f 10 35 7a 67 d8 bf 76 6d 00 28 66 1a d3 2a 0f  ..5zg..vm.(f..*.
SSL DBG [4] 0db0:  5a 48 4a 15 90 ff 78 ec a7 86 d7 ec 48 73 22 99  ZHJ...x.....Hs".
SSL DBG [4] 0dc0:  d2 eb f2 79 a4 cb 08 c7 9e b7 62 fd 5b c4 4d f0  ...y......b.[.M.
SSL DBG [4] 0dd0:  a4 78 de 64 d5 21 ec e3 51 c1 4a 2a f0 f6 d8 05  .x.d.!..Q.J*....
SSL DBG [4] 0de0:  3b 2e 5f 24 35 62 38 f5 9e df 86 67 05 ca ce 21  ;._$5b8....g...!
SSL DBG [4] 0df0:  99 64 28 94 e4 5f 24 cc fb fd 48 67 cb 38 87 28  .d(.._$...Hg.8.(
SSL DBG [4] 0e00:  d9 f5 d2 d4 c4 22 7e eb f3 e0 e7 14 35 39 0a fb  ....."~.....59..
SSL DBG [4] 0e10:  8f 9d 4d 09 eb 4d 8d a0 52 73 08 d3 98 eb 44 b1  ..M..M..Rs....D.
SSL DBG [4] 0e20:  48 6a 98 5d 36 1d 1c 62 3e 2f 64 7c c2 14 a7 68  Hj.]6..b>/d|...h
SSL DBG [4] 0e30:  8d e9 71 cd b8 28 05 11 f3 77 a1 13 f7 5f 62 68  ..q..(...w..._bh
SSL DBG [4] 0e40:  4b a3 76 f9 5c cf e4 53 b0 e1 8a be 99 f8 7e 74  K.v.\..S......~t
SSL DBG [4] 0e50:  ef b5 83 9a dc 39 c9 4e b5 f1 a6 7f 99 f8 f6 e2  .....9.N........
SSL DBG [4] 0e60:  de 9b fe 58 13 68 28 8e 86 ba 8b 00 a6 11 20 ba  ...X.h(....... .
SSL DBG [4] 0e70:  57 9a a6 78 ad 42 ee 9c fc c0 24 4b 88 73 da a9  W..x.B....$K.s..
SSL DBG [4] 0e80:  08 0a 11 de ca d4 7b a7 2f 3c fb 8e 41 5b 5c 87  ......{./<..A[\.
SSL DBG [4] 0e90:  87 4d d2 3f 88 9f 36 ff ea 3f 36 be 5b ba bd 6c  .M.?..6..?6.[..l
SSL DBG [4] 0ea0:  bd 9c ba fe ef e2 cb 15 9a 40 bc b2 4c 2c 18 7e  .........@..L,.~
SSL DBG [4] 0eb0:  a6 06 86 62 ae 08 f9 2e 70 0f 6b 2a 48 de f9 bb  ...b....p.k*H...
SSL DBG [4] 0ec0:  b2 cf 47 20 29 fd 44 e1 01 98 d0 46 be 10 9b c0  ..G ).D....F....
SSL DBG [4] 0ed0:  8a ec 0b 9d ba 3a 98 54 0a a5 06 5b e5 f3 04 2d  .....:.T...[...-
SSL DBG [4] 0ee0:  6a d8 53 1b 95 cf 8c 32 8c f9 91 b6 43 e6 f3 c2  j.S....2....C...
SSL DBG [4] 0ef0:  d2 cb 17 df c3 0d 40 10 d7 7b b1 bc a8 4f 1a a9  ......@..{...O..
SSL DBG [4] 0f00:  34 95 46 56 84 6b f0 aa 2c 72 58 3f 5b 29 7a 8e  4.FV.k..,rX?[)z.
SSL DBG [4] 0f10:  b3 aa 8e c4 f9 e7 80 50 27 60 9f b0 2e 05 4c 1a  .......P'`....L.
SSL DBG [4] 0f20:  00 b2 8a 42 2e ad 88 50 75 5c 6c 6b 94 dd e0 5f  ...B...Pu\lk..._
SSL DBG [4] 0f30:  4e 5e 3d 98 e5 51 6a e1 3e 8c 04 d4 85 3c 96 61  N^=..Qj.>....<.a
SSL DBG [4] 0f40:  a7 78 b2 01 de 5e f7 0c b3 73 64 a1 f0 54 29 e5  .x...^...sd..T).
SSL DBG [4] 0f50:  ee a8 50 2f 99 5d 89 60 f3 e4 01 96 91 f0 58 6a  ..P/.].`......Xj
SSL DBG [4] 0f60:  f7 d7 08 7e 0b b3 02 b5 4e 96 49 58 c8 2f a0 0a  ...~....N.IX./..
SSL DBG [4] 0f70:  96 6a 40 b4 e8 54 07 ed 5b 30 f9 85 8f d6 3f d5  .j@..T..[0....?.
SSL DBG [4] 0f80:  83 2b 65 ed 03 66 a0 ce e3 89 d0 9f b6 0a e1 16  .+e..f..........
SSL DBG [4] 0f90:  01 7e 77 75 f3 81 e0 19 e1 b4 31 09 cc f0 96 1d  .~wu......1.....
SSL DBG [4] 0fa0:  b6 78 82 5e 04 83 81 87 90 54 c5 05 06 18 41 d4  .x.^.....T....A.
SSL DBG [4] 0fb0:  a1 4d b6 ef d7 48 a1 62 1b bd 87 98 56 14 02 2b  .M...H.b....V..+
SSL DBG [4] 0fc0:  a7 a2 5c 84 d1 b2 70 6e 7c ba 91 77 7f 61 cf 88  ..\...pn|..w.a..
SSL DBG [4] 0fd0:  a7 e1 31 62 f2 be 16 2a 94 50 cd db 9a a6 5f c6  ..1b...*.P...._.
SSL DBG [4] 0fe0:  57 81 89 68 61 29 e8 ba 98 8a 98 af fc 10 91 44  W..ha).........D
SSL DBG [4] 0ff0:  38 54 2c a6 67 8e a2 5c 97 57 81 c6 36 13 cf dd  8T,.g..\.W..6...
SSL DBG [2] => decrypt buf
SSL DBG [2] <= decrypt buf
SSL DBG [4] dumping 'input payload after decrypt' (7787 bytes)
SSL DBG [4] 0000:  7b 22 63 6f 75 6e 74 22 3a 34 38 31 2c 22 6e 65  {"count":481,"ne
SSL DBG [4] 0010:  78 74 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30  xt":"https://640
SSL DBG [4] 0020:  62 79 34 38 30 2e 63 6f 6d 2f 61 70 69 2f 76 31  by480.com/api/v1
SSL DBG [4] 0030:  2f 70 6f 73 74 73 2f 3f 70 61 67 65 3d 32 22 2c  /posts/?page=2",
SSL DBG [4] 0040:  22 70 72 65 76 69 6f 75 73 22 3a 6e 75 6c 6c 2c  "previous":null,
SSL DBG [4] 0050:  22 72 65 73 75 6c 74 73 22 3a 5b 7b 22 69 64 22  "results":[{"id"
SSL DBG [4] 0060:  3a 36 32 33 2c 22 69 6d 61 67 65 22 3a 22 68 74  :623,"image":"ht
SSL DBG [4] 0070:  74 70 73 3a 2f 2f 36 34 30 62 79 34 38 30 2e 63  tps://640by480.c
SSL DBG [4] 0080:  6f 6d 2f 6d 65 64 69 61 2f 43 61 72 2d 49 4d 41  om/media/Car-IMA
SSL DBG [4] 0090:  47 45 30 33 2e 6a 70 65 67 22 2c 22 74 68 75 6d  GE03.jpeg","thum
SSL DBG [4] 00a0:  62 6e 61 69 6c 22 3a 22 68 74 74 70 73 3a 2f 2f  bnail":"https://
SSL DBG [4] 00b0:  36 34 30 62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64  640by480.com/med
SSL DBG [4] 00c0:  69 61 2f 43 61 72 2d 49 4d 41 47 45 30 33 5f 74  ia/Car-IMAGE03_t
SSL DBG [4] 00d0:  68 75 6d 62 6e 61 69 6c 2e 6a 70 67 22 2c 22 64  humbnail.jpg","d
SSL DBG [4] 00e0:  65 74 61 69 6c 22 3a 22 68 74 74 70 73 3a 2f 2f  etail":"https://
SSL DBG [4] 00f0:  36 34 30 62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64  640by480.com/med
SSL DBG [4] 0100:  69 61 2f 43 61 72 2d 49 4d 41 47 45 30 33 5f 64  ia/Car-IMAGE03_d
SSL DBG [4] 0110:  65 74 61 69 6c 2e 6a 70 67 22 2c 22 64 65 73 63  etail.jpg","desc
SSL DBG [4] 0120:  72 69 70 74 69 6f 6e 22 3a 22 4f 75 74 64 6f 6f  ription":"Outdoo
SSL DBG [4] 0130:  72 20 73 68 6f 74 20 6f 66 20 61 20 66 72 65 73  r shot of a fres
SSL DBG [4] 0140:  68 6c 79 20 77 61 73 68 65 64 20 63 61 72 20 3a  hly washed car :
SSL DBG [4] 0150:  44 22 2c 22 61 75 74 68 6f 72 22 3a 7b 22 69 64  D","author":{"id
SSL DBG [4] 0160:  22 3a 33 39 34 2c 22 75 73 65 72 6e 61 6d 65 22  ":394,"username"
SSL DBG [4] 0170:  3a 22 62 6f 6f 76 69 73 68 22 7d 2c 22 63 72 65  :"boovish"},"cre
SSL DBG [4] 0180:  61 74 65 64 22 3a 22 32 30 32 35 2d 30 33 2d 31  ated":"2025-03-1
SSL DBG [4] 0190:  30 54 32 31 3a 33 39 3a 32 33 2e 33 33 35 33 33  0T21:39:23.33533
SSL DBG [4] 01a0:  31 5a 22 2c 22 6d 6f 64 69 66 69 65 64 22 3a 22  1Z","modified":"
SSL DBG [4] 01b0:  32 30 32 35 2d 30 33 2d 31 30 54 32 31 3a 33 39  2025-03-10T21:39
SSL DBG [4] 01c0:  3a 32 33 2e 33 33 35 33 37 33 5a 22 2c 22 63 6f  :23.335373Z","co
SSL DBG [4] 01d0:  6d 6d 65 6e 74 73 22 3a 5b 5d 2c 22 63 6f 6d 6d  mments":[],"comm
SSL DBG [4] 01e0:  65 6e 74 5f 63 6f 75 6e 74 22 3a 30 7d 2c 7b 22  ent_count":0},{"
SSL DBG [4] 01f0:  69 64 22 3a 36 32 32 2c 22 69 6d 61 67 65 22 3a  id":622,"image":
SSL DBG [4] 0200:  22 68 74 74 70 73 3a 2f 2f 36 34 30 62 79 34 38  "https://640by48
SSL DBG [4] 0210:  30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30 36  0.com/media/f006
SSL DBG [4] 0220:  34 32 33 35 2e 6a 70 67 22 2c 22 74 68 75 6d 62  4235.jpg","thumb
SSL DBG [4] 0230:  6e 61 69 6c 22 3a 22 68 74 74 70 73 3a 2f 2f 36  nail":"https://6
SSL DBG [4] 0240:  34 30 62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69  40by480.com/medi
SSL DBG [4] 0250:  61 2f 66 30 30 36 34 32 33 35 5f 74 68 75 6d 62  a/f0064235_thumb
SSL DBG [4] 0260:  6e 61 69 6c 2e 6a 70 67 22 2c 22 64 65 74 61 69  nail.jpg","detai
SSL DBG [4] 0270:  6c 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30 62  l":"https://640b
SSL DBG [4] 0280:  79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66  y480.com/media/f
SSL DBG [4] 0290:  30 30 36 34 32 33 35 5f 64 65 74 61 69 6c 2e 6a  0064235_detail.j
SSL DBG [4] 02a0:  70 67 22 2c 22 64 65 73 63 72 69 70 74 69 6f 6e  pg","description
SSL DBG [4] 02b0:  22 3a 22 41 72 63 6f 73 61 6e 74 69 2c 20 41 72  ":"Arcosanti, Ar
SSL DBG [4] 02c0:  69 7a 6f 6e 61 2e 20 32 2d 31 39 2d 32 35 2c 20  izona. 2-19-25, 
SSL DBG [4] 02d0:  73 68 6f 74 20 6f 6e 20 44 43 53 2d 34 32 30 63  shot on DCS-420c
SSL DBG [4] 02e0:  22 2c 22 61 75 74 68 6f 72 22 3a 7b 22 69 64 22  ","author":{"id"
SSL DBG [4] 02f0:  3a 31 2c 22 75 73 65 72 6e 61 6d 65 22 3a 22 62  :1,"username":"b
SSL DBG [4] 0300:  65 6e 63 68 6f 66 66 22 7d 2c 22 63 72 65 61 74  enchoff"},"creat
SSL DBG [4] 0310:  65 64 22 3a 22 32 30 32 35 2d 30 32 2d 32 33 54  ed":"2025-02-23T
SSL DBG [4] 0320:  32 31 3a 35 39 3a 35 39 2e 33 38 35 37 32 31 5a  21:59:59.385721Z
SSL DBG [4] 0330:  22 2c 22 6d 6f 64 69 66 69 65 64 22 3a 22 32 30  ","modified":"20
SSL DBG [4] 0340:  32 35 2d 30 32 2d 32 33 54 32 31 3a 35 39 3a 35  25-02-23T21:59:5
SSL DBG [4] 0350:  39 2e 33 38 35 37 35 36 5a 22 2c 22 63 6f 6d 6d  9.385756Z","comm
SSL DBG [4] 0360:  65 6e 74 73 22 3a 5b 5d 2c 22 63 6f 6d 6d 65 6e  ents":[],"commen
SSL DBG [4] 0370:  74 5f 63 6f 75 6e 74 22 3a 30 7d 2c 7b 22 69 64  t_count":0},{"id
SSL DBG [4] 0380:  22 3a 36 32 31 2c 22 69 6d 61 67 65 22 3a 22 68  ":621,"image":"h
SSL DBG [4] 0390:  74 74 70 73 3a 2f 2f 36 34 30 62 79 34 38 30 2e  ttps://640by480.
SSL DBG [4] 03a0:  63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30 33 38 34  com/media/f00384
SSL DBG [4] 03b0:  37 35 2e 6a 70 67 22 2c 22 74 68 75 6d 62 6e 61  75.jpg","thumbna
SSL DBG [4] 03c0:  69 6c 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30  il":"https://640
SSL DBG [4] 03d0:  62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f  by480.com/media/
SSL DBG [4] 03e0:  66 30 30 33 38 34 37 35 5f 74 68 75 6d 62 6e 61  f0038475_thumbna
SSL DBG [4] 03f0:  69 6c 2e 6a 70 67 22 2c 22 64 65 74 61 69 6c 22  il.jpg","detail"
SSL DBG [4] 0400:  3a 22 68 74 74 70 73 3a 2f 2f 36 34 30 62 79 34  :"https://640by4
SSL DBG [4] 0410:  38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30  80.com/media/f00
SSL DBG [4] 0420:  33 38 34 37 35 5f 64 65 74 61 69 6c 2e 6a 70 67  38475_detail.jpg
SSL DBG [4] 0430:  22 2c 22 64 65 73 63 72 69 70 74 69 6f 6e 22 3a  ","description":
SSL DBG [4] 0440:  22 50 61 72 61 73 61 75 72 6f 6c 6f 70 68 75 73  "Parasaurolophus
SSL DBG [4] 0450:  2c 20 54 75 73 63 6f 6e 2c 20 32 2d 32 30 2d 32  , Tuscon, 2-20-2
SSL DBG [4] 0460:  35 2c 20 53 68 6f 74 20 6f 6e 20 44 43 53 2d 34  5, Shot on DCS-4
SSL DBG [4] 0470:  32 30 63 22 2c 22 61 75 74 68 6f 72 22 3a 7b 22  20c","author":{"
SSL DBG [4] 0480:  69 64 22 3a 31 2c 22 75 73 65 72 6e 61 6d 65 22  id":1,"username"
SSL DBG [4] 0490:  3a 22 62 65 6e 63 68 6f 66 66 22 7d 2c 22 63 72  :"benchoff"},"cr
SSL DBG [4] 04a0:  65 61 74 65 64 22 3a 22 32 30 32 35 2d 30 32 2d  eated":"2025-02-
SSL DBG [4] 04b0:  32 33 54 32 31 3a 31 33 3a 34 36 2e 37 38 34 38  23T21:13:46.7848
SSL DBG [4] 04c0:  35 34 5a 22 2c 22 6d 6f 64 69 66 69 65 64 22 3a  54Z","modified":
SSL DBG [4] 04d0:  22 32 30 32 35 2d 30 32 2d 32 33 54 32 31 3a 31  "2025-02-23T21:1
SSL DBG [4] 04e0:  33 3a 34 36 2e 37 38 34 38 39 30 5a 22 2c 22 63  3:46.784890Z","c
SSL DBG [4] 04f0:  6f 6d 6d 65 6e 74 73 22 3a 5b 7b 22 69 64 22 3a  omments":[{"id":
SSL DBG [4] 0500:  31 32 39 2c 22 74 65 78 74 22 3a 22 54 68 69 73  129,"text":"This
SSL DBG [4] 0510:  20 69 73 20 61 20 63 6f 6d 6d 65 6e 74 20 49 27   is a comment I'
SSL DBG [4] 0520:  6d 20 74 65 73 74 69 6e 67 20 73 74 75 66 66 22  m testing stuff"
SSL DBG [4] 0530:  2c 22 61 75 74 68 6f 72 22 3a 7b 22 69 64 22 3a  ,"author":{"id":
SSL DBG [4] 0540:  31 2c 22 75 73 65 72 6e 61 6d 65 22 3a 22 62 65  1,"username":"be
SSL DBG [4] 0550:  6e 63 68 6f 66 66 22 7d 2c 22 63 72 65 61 74 65  nchoff"},"create
SSL DBG [4] 0560:  64 22 3a 22 32 30 32 35 2d 30 33 2d 30 36 54 31  d":"2025-03-06T1
SSL DBG [4] 0570:  39 3a 35 34 3a 33 32 2e 36 37 34 36 32 39 5a 22  9:54:32.674629Z"
SSL DBG [4] 0580:  2c 22 6d 6f 64 69 66 69 65 64 22 3a 22 32 30 32  ,"modified":"202
SSL DBG [4] 0590:  35 2d 30 33 2d 30 36 54 31 39 3a 35 34 3a 33 32  5-03-06T19:54:32
SSL DBG [4] 05a0:  2e 36 37 34 36 35 37 5a 22 7d 5d 2c 22 63 6f 6d  .674657Z"}],"com
SSL DBG [4] 05b0:  6d 65 6e 74 5f 63 6f 75 6e 74 22 3a 31 7d 2c 7b  ment_count":1},{
SSL DBG [4] 05c0:  22 69 64 22 3a 36 32 30 2c 22 69 6d 61 67 65 22  "id":620,"image"
SSL DBG [4] 05d0:  3a 22 68 74 74 70 73 3a 2f 2f 36 34 30 62 79 34  :"https://640by4
SSL DBG [4] 05e0:  38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30  80.com/media/f00
SSL DBG [4] 05f0:  34 31 36 39 35 2d 32 2e 6a 70 67 22 2c 22 74 68  41695-2.jpg","th
SSL DBG [4] 0600:  75 6d 62 6e 61 69 6c 22 3a 22 68 74 74 70 73 3a  umbnail":"https:
SSL DBG [4] 0610:  2f 2f 36 34 30 62 79 34 38 30 2e 63 6f 6d 2f 6d  //640by480.com/m
SSL DBG [4] 0620:  65 64 69 61 2f 66 30 30 34 31 36 39 35 2d 32 5f  edia/f0041695-2_
SSL DBG [4] 0630:  74 68 75 6d 62 6e 61 69 6c 2e 6a 70 67 22 2c 22  thumbnail.jpg","
SSL DBG [4] 0640:  64 65 74 61 69 6c 22 3a 22 68 74 74 70 73 3a 2f  detail":"https:/
SSL DBG [4] 0650:  2f 36 34 30 62 79 34 38 30 2e 63 6f 6d 2f 6d 65  /640by480.com/me
SSL DBG [4] 0660:  64 69 61 2f 66 30 30 34 31 36 39 35 2d 32 5f 64  dia/f0041695-2_d
SSL DBG [4] 0670:  65 74 61 69 6c 2e 6a 70 67 22 2c 22 64 65 73 63  etail.jpg","desc
SSL DBG [4] 0680:  72 69 70 74 69 6f 6e 22 3a 22 4f 63 6f 74 69 6c  ription":"Ocotil
SSL DBG [4] 0690:  6c 6f 20 66 6c 6f 77 65 72 2c 20 54 75 73 63 6f  lo flower, Tusco
SSL DBG [4] 06a0:  6e 2c 20 41 5a 2c 20 32 2d 32 30 2d 32 35 2e 20  n, AZ, 2-20-25. 
SSL DBG [4] 06b0:  53 68 6f 74 20 6f 6e 20 44 43 53 2d 34 32 30 63  Shot on DCS-420c
SSL DBG [4] 06c0:  22 2c 22 61 75 74 68 6f 72 22 3a 7b 22 69 64 22  ","author":{"id"
SSL DBG [4] 06d0:  3a 31 2c 22 75 73 65 72 6e 61 6d 65 22 3a 22 62  :1,"username":"b
SSL DBG [4] 06e0:  65 6e 63 68 6f 66 66 22 7d 2c 22 63 72 65 61 74  enchoff"},"creat
SSL DBG [4] 06f0:  65 64 22 3a 22 32 30 32 35 2d 30 32 2d 32 33 54  ed":"2025-02-23T
SSL DBG [4] 0700:  32 31 3a 31 30 3a 30 36 2e 31 36 32 38 35 33 5a  21:10:06.162853Z
SSL DBG [4] 0710:  22 2c 22 6d 6f 64 69 66 69 65 64 22 3a 22 32 30  ","modified":"20
SSL DBG [4] 0720:  32 35 2d 30 32 2d 32 33 54 32 31 3a 31 30 3a 30  25-02-23T21:10:0
SSL DBG [4] 0730:  36 2e 31 36 32 38 39 30 5a 22 2c 22 63 6f 6d 6d  6.162890Z","comm
SSL DBG [4] 0740:  65 6e 74 73 22 3a 5b 5d 2c 22 63 6f 6d 6d 65 6e  ents":[],"commen
SSL DBG [4] 0750:  74 5f 63 6f 75 6e 74 22 3a 30 7d 2c 7b 22 69 64  t_count":0},{"id
SSL DBG [4] 0760:  22 3a 36 31 39 2c 22 69 6d 61 67 65 22 3a 22 68  ":619,"image":"h
SSL DBG [4] 0770:  74 74 70 73 3a 2f 2f 36 34 30 62 79 34 38 30 2e  ttps://640by480.
SSL DBG [4] 0780:  63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30 36 37 34  com/media/f00674
SSL DBG [4] 0790:  35 35 2e 6a 70 67 22 2c 22 74 68 75 6d 62 6e 61  55.jpg","thumbna
SSL DBG [4] 07a0:  69 6c 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30  il":"https://640
SSL DBG [4] 07b0:  62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f  by480.com/media/
SSL DBG [4] 07c0:  66 30 30 36 37 34 35 35 5f 74 68 75 6d 62 6e 61  f0067455_thumbna
SSL DBG [4] 07d0:  69 6c 2e 6a 70 67 22 2c 22 64 65 74 61 69 6c 22  il.jpg","detail"
SSL DBG [4] 07e0:  3a 22 68 74 74 70 73 3a 2f 2f 36 34 30 62 79 34  :"https://640by4
SSL DBG [4] 07f0:  38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30  80.com/media/f00
SSL DBG [4] 0800:  36 37 34 35 35 5f 64 65 74 61 69 6c 2e 6a 70 67  67455_detail.jpg
SSL DBG [4] 0810:  22 2c 22 64 65 73 63 72 69 70 74 69 6f 6e 22 3a  ","description":
SSL DBG [4] 0820:  22 53 77 61 6c 6c 6f 77 74 61 69 6c 20 62 75 74  "Swallowtail but
SSL DBG [4] 0830:  74 65 72 66 6c 79 2e 20 49 6e 20 4f 61 6b 20 43  terfly. In Oak C
SSL DBG [4] 0840:  72 65 65 6b 20 63 61 6e 79 6f 6e 2c 20 53 6c 69  reek canyon, Sli
SSL DBG [4] 0850:  64 65 20 52 6f 63 6b 20 41 5a 2e 20 32 2d 31 39  de Rock AZ. 2-19
SSL DBG [4] 0860:  2d 32 35 2e 20 53 68 6f 74 20 6f 6e 20 4b 6f 64  -25. Shot on Kod
SSL DBG [4] 0870:  61 6b 20 44 43 53 2d 34 32 30 43 22 2c 22 61 75  ak DCS-420C","au
SSL DBG [4] 0880:  74 68 6f 72 22 3a 7b 22 69 64 22 3a 31 2c 22 75  thor":{"id":1,"u
SSL DBG [4] 0890:  73 65 72 6e 61 6d 65 22 3a 22 62 65 6e 63 68 6f  sername":"bencho
SSL DBG [4] 08a0:  66 66 22 7d 2c 22 63 72 65 61 74 65 64 22 3a 22  ff"},"created":"
SSL DBG [4] 08b0:  32 30 32 35 2d 30 32 2d 32 33 54 32 31 3a 30 36  2025-02-23T21:06
SSL DBG [4] 08c0:  3a 33 39 2e 39 30 39 37 39 34 5a 22 2c 22 6d 6f  :39.909794Z","mo
SSL DBG [4] 08d0:  64 69 66 69 65 64 22 3a 22 32 30 32 35 2d 30 32  dified":"2025-02
SSL DBG [4] 08e0:  2d 32 33 54 32 31 3a 30 36 3a 33 39 2e 39 30 39  -23T21:06:39.909
SSL DBG [4] 08f0:  38 32 37 5a 22 2c 22 63 6f 6d 6d 65 6e 74 73 22  827Z","comments"
SSL DBG [4] 0900:  3a 5b 5d 2c 22 63 6f 6d 6d 65 6e 74 5f 63 6f 75  :[],"comment_cou
SSL DBG [4] 0910:  6e 74 22 3a 30 7d 2c 7b 22 69 64 22 3a 36 31 38  nt":0},{"id":618
SSL DBG [4] 0920:  2c 22 69 6d 61 67 65 22 3a 22 68 74 74 70 73 3a  ,"image":"https:
SSL DBG [4] 0930:  2f 2f 36 34 30 62 79 34 38 30 2e 63 6f 6d 2f 6d  //640by480.com/m
SSL DBG [4] 0940:  65 64 69 61 2f 66 30 30 37 30 36 37 35 2e 6a 70  edia/f0070675.jp
SSL DBG [4] 0950:  67 22 2c 22 74 68 75 6d 62 6e 61 69 6c 22 3a 22  g","thumbnail":"
SSL DBG [4] 0960:  68 74 74 70 73 3a 2f 2f 36 34 30 62 79 34 38 30  https://640by480
SSL DBG [4] 0970:  2e 63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30 37 30  .com/media/f0070
SSL DBG [4] 0980:  36 37 35 5f 74 68 75 6d 62 6e 61 69 6c 2e 6a 70  675_thumbnail.jp
SSL DBG [4] 0990:  67 22 2c 22 64 65 74 61 69 6c 22 3a 22 68 74 74  g","detail":"htt
SSL DBG [4] 09a0:  70 73 3a 2f 2f 36 34 30 62 79 34 38 30 2e 63 6f  ps://640by480.co
SSL DBG [4] 09b0:  6d 2f 6d 65 64 69 61 2f 66 30 30 37 30 36 37 35  m/media/f0070675
SSL DBG [4] 09c0:  5f 64 65 74 61 69 6c 2e 6a 70 67 22 2c 22 64 65  _detail.jpg","de
SSL DBG [4] 09d0:  73 63 72 69 70 74 69 6f 6e 22 3a 22 50 72 6f 6e  scription":"Pron
SSL DBG [4] 09e0:  67 68 6f 72 6e 2c 20 6f 75 74 73 69 64 65 20 4d  ghorn, outside M
SSL DBG [4] 09f0:  65 74 65 6f 72 20 43 72 61 74 65 72 20 41 5a 2c  eteor Crater AZ,
SSL DBG [4] 0a00:  20 32 2d 31 37 2d 32 35 2c 20 73 68 6f 74 20 6f   2-17-25, shot o
SSL DBG [4] 0a10:  6e 20 4b 6f 64 61 6b 20 44 43 53 2d 34 32 30 22  n Kodak DCS-420"
SSL DBG [4] 0a20:  2c 22 61 75 74 68 6f 72 22 3a 7b 22 69 64 22 3a  ,"author":{"id":
SSL DBG [4] 0a30:  31 2c 22 75 73 65 72 6e 61 6d 65 22 3a 22 62 65  1,"username":"be
SSL DBG [4] 0a40:  6e 63 68 6f 66 66 22 7d 2c 22 63 72 65 61 74 65  nchoff"},"create
SSL DBG [4] 0a50:  64 22 3a 22 32 30 32 35 2d 30 32 2d 32 33 54 32  d":"2025-02-23T2
SSL DBG [4] 0a60:  31 3a 30 34 3a 35 39 2e 33 38 36 35 34 32 5a 22  1:04:59.386542Z"
SSL DBG [4] 0a70:  2c 22 6d 6f 64 69 66 69 65 64 22 3a 22 32 30 32  ,"modified":"202
SSL DBG [4] 0a80:  35 2d 30 32 2d 32 33 54 32 31 3a 30 34 3a 35 39  5-02-23T21:04:59
SSL DBG [4] 0a90:  2e 33 38 36 35 37 39 5a 22 2c 22 63 6f 6d 6d 65  .386579Z","comme
SSL DBG [4] 0aa0:  6e 74 73 22 3a 5b 5d 2c 22 63 6f 6d 6d 65 6e 74  nts":[],"comment
SSL DBG [4] 0ab0:  5f 63 6f 75 6e 74 22 3a 30 7d 2c 7b 22 69 64 22  _count":0},{"id"
SSL DBG [4] 0ac0:  3a 36 31 37 2c 22 69 6d 61 67 65 22 3a 22 68 74  :617,"image":"ht
SSL DBG [4] 0ad0:  74 70 73 3a 2f 2f 36 34 30 62 79 34 38 30 2e 63  tps://640by480.c
SSL DBG [4] 0ae0:  6f 6d 2f 6d 65 64 69 61 2f 66 30 30 37 37 31 31  om/media/f007711
SSL DBG [4] 0af0:  35 2e 6a 70 67 22 2c 22 74 68 75 6d 62 6e 61 69  5.jpg","thumbnai
SSL DBG [4] 0b00:  6c 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30 62  l":"https://640b
SSL DBG [4] 0b10:  79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66  y480.com/media/f
SSL DBG [4] 0b20:  30 30 37 37 31 31 35 5f 74 68 75 6d 62 6e 61 69  0077115_thumbnai
SSL DBG [4] 0b30:  6c 2e 6a 70 67 22 2c 22 64 65 74 61 69 6c 22 3a  l.jpg","detail":
SSL DBG [4] 0b40:  22 68 74 74 70 73 3a 2f 2f 36 34 30 62 79 34 38  "https://640by48
SSL DBG [4] 0b50:  30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30 37  0.com/media/f007
SSL DBG [4] 0b60:  37 31 31 35 5f 64 65 74 61 69 6c 2e 6a 70 67 22  7115_detail.jpg"
SSL DBG [4] 0b70:  2c 22 64 65 73 63 72 69 70 74 69 6f 6e 22 3a 22  ,"description":"
SSL DBG [4] 0b80:  47 69 67 61 6e 74 69 63 75 73 20 48 65 61 64 69  Giganticus Headi
SSL DBG [4] 0b90:  63 75 73 2c 20 4b 69 6e 67 6d 61 6e 2c 20 41 5a  cus, Kingman, AZ
SSL DBG [4] 0ba0:  20 32 2d 31 36 2d 32 35 2c 20 73 68 6f 74 20 6f   2-16-25, shot o
SSL DBG [4] 0bb0:  6e 20 4b 6f 64 61 6b 20 44 43 53 2d 34 32 30 63  n Kodak DCS-420c
SSL DBG [4] 0bc0:  22 2c 22 61 75 74 68 6f 72 22 3a 7b 22 69 64 22  ","author":{"id"
SSL DBG [4] 0bd0:  3a 31 2c 22 75 73 65 72 6e 61 6d 65 22 3a 22 62  :1,"username":"b
SSL DBG [4] 0be0:  65 6e 63 68 6f 66 66 22 7d 2c 22 63 72 65 61 74  enchoff"},"creat
SSL DBG [4] 0bf0:  65 64 22 3a 22 32 30 32 35 2d 30 32 2d 32 33 54  ed":"2025-02-23T
SSL DBG [4] 0c00:  32 31 3a 30 33 3a 34 34 2e 34 34 30 31 36 31 5a  21:03:44.440161Z
SSL DBG [4] 0c10:  22 2c 22 6d 6f 64 69 66 69 65 64 22 3a 22 32 30  ","modified":"20
SSL DBG [4] 0c20:  32 35 2d 30 32 2d 32 33 54 32 31 3a 30 33 3a 34  25-02-23T21:03:4
SSL DBG [4] 0c30:  34 2e 34 34 30 31 39 37 5a 22 2c 22 63 6f 6d 6d  4.440197Z","comm
SSL DBG [4] 0c40:  65 6e 74 73 22 3a 5b 5d 2c 22 63 6f 6d 6d 65 6e  ents":[],"commen
SSL DBG [4] 0c50:  74 5f 63 6f 75 6e 74 22 3a 30 7d 2c 7b 22 69 64  t_count":0},{"id
SSL DBG [4] 0c60:  22 3a 36 31 36 2c 22 69 6d 61 67 65 22 3a 22 68  ":616,"image":"h
SSL DBG [4] 0c70:  74 74 70 73 3a 2f 2f 36 34 30 62 79 34 38 30 2e  ttps://640by480.
SSL DBG [4] 0c80:  63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30 39 36 34  com/media/f00964
SSL DBG [4] 0c90:  33 35 2e 6a 70 67 22 2c 22 74 68 75 6d 62 6e 61  35.jpg","thumbna
SSL DBG [4] 0ca0:  69 6c 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30  il":"https://640
SSL DBG [4] 0cb0:  62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f  by480.com/media/
SSL DBG [4] 0cc0:  66 30 30 39 36 34 33 35 5f 74 68 75 6d 62 6e 61  f0096435_thumbna
SSL DBG [4] 0cd0:  69 6c 2e 6a 70 67 22 2c 22 64 65 74 61 69 6c 22  il.jpg","detail"
SSL DBG [4] 0ce0:  3a 22 68 74 74 70 73 3a 2f 2f 36 34 30 62 79 34  :"https://640by4
SSL DBG [4] 0cf0:  38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66 30 30  80.com/media/f00
SSL DBG [4] 0d00:  39 36 34 33 35 5f 64 65 74 61 69 6c 2e 6a 70 67  96435_detail.jpg
SSL DBG [4] 0d10:  22 2c 22 64 65 73 63 72 69 70 74 69 6f 6e 22 3a  ","description":
SSL DBG [4] 0d20:  22 44 6f 6e 6b 65 79 2c 20 4f 61 74 6d 61 6e 2c  "Donkey, Oatman,
SSL DBG [4] 0d30:  20 41 5a 2e 20 32 2d 31 37 2d 32 35 2c 20 53 68   AZ. 2-17-25, Sh
SSL DBG [4] 0d40:  6f 74 20 6f 6e 20 4b 6f 64 61 6b 20 44 43 53 2d  ot on Kodak DCS-
SSL DBG [4] 0d50:  34 32 30 43 22 2c 22 61 75 74 68 6f 72 22 3a 7b  420C","author":{
SSL DBG [4] 0d60:  22 69 64 22 3a 31 2c 22 75 73 65 72 6e 61 6d 65  "id":1,"username
SSL DBG [4] 0d70:  22 3a 22 62 65 6e 63 68 6f 66 66 22 7d 2c 22 63  ":"benchoff"},"c
SSL DBG [4] 0d80:  72 65 61 74 65 64 22 3a 22 32 30 32 35 2d 30 32  reated":"2025-02
SSL DBG [4] 0d90:  2d 32 33 54 32 31 3a 30 32 3a 35 32 2e 35 33 34  -23T21:02:52.534
SSL DBG [4] 0da0:  36 38 34 5a 22 2c 22 6d 6f 64 69 66 69 65 64 22  684Z","modified"
SSL DBG [4] 0db0:  3a 22 32 30 32 35 2d 30 32 2d 32 33 54 32 31 3a  :"2025-02-23T21:
SSL DBG [4] 0dc0:  30 32 3a 35 32 2e 35 33 34 37 32 32 5a 22 2c 22  02:52.534722Z","
SSL DBG [4] 0dd0:  63 6f 6d 6d 65 6e 74 73 22 3a 5b 5d 2c 22 63 6f  comments":[],"co
SSL DBG [4] 0de0:  6d 6d 65 6e 74 5f 63 6f 75 6e 74 22 3a 30 7d 2c  mment_count":0},
SSL DBG [4] 0df0:  7b 22 69 64 22 3a 36 31 35 2c 22 69 6d 61 67 65  {"id":615,"image
SSL DBG [4] 0e00:  22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30 62 79  ":"https://640by
SSL DBG [4] 0e10:  34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f 66 30  480.com/media/f0
SSL DBG [4] 0e20:  31 32 32 32 31 39 2e 6a 70 67 22 2c 22 74 68 75  122219.jpg","thu
SSL DBG [4] 0e30:  6d 62 6e 61 69 6c 22 3a 22 68 74 74 70 73 3a 2f  mbnail":"https:/
SSL DBG [4] 0e40:  2f 36 34 30 62 79 34 38 30 2e 63 6f 6d 2f 6d 65  /640by480.com/me
SSL DBG [4] 0e50:  64 69 61 2f 66 30 31 32 32 32 31 39 5f 74 68 75  dia/f0122219_thu
SSL DBG [4] 0e60:  6d 62 6e 61 69 6c 2e 6a 70 67 22 2c 22 64 65 74  mbnail.jpg","det
SSL DBG [4] 0e70:  61 69 6c 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34  ail":"https://64
SSL DBG [4] 0e80:  30 62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61  0by480.com/media
SSL DBG [4] 0e90:  2f 66 30 31 32 32 32 31 39 5f 64 65 74 61 69 6c  /f0122219_detail
SSL DBG [4] 0ea0:  2e 6a 70 67 22 2c 22 64 65 73 63 72 69 70 74 69  .jpg","descripti
SSL DBG [4] 0eb0:  6f 6e 22 3a 22 52 6f 79 27 73 20 43 61 66 65 20  on":"Roy's Cafe 
SSL DBG [4] 0ec0:  2f 20 4d 6f 74 65 6c 20 69 6e 20 41 6d 62 6f 79  / Motel in Amboy
SSL DBG [4] 0ed0:  2c 20 43 41 2e 20 32 2d 31 36 2d 32 35 2c 20 73  , CA. 2-16-25, s
SSL DBG [4] 0ee0:  68 6f 74 20 6f 6e 20 4b 6f 64 61 6b 20 44 43 53  hot on Kodak DCS
SSL DBG [4] 0ef0:  2d 34 32 30 63 2e 22 2c 22 61 75 74 68 6f 72 22  -420c.","author"
SSL DBG [4] 0f00:  3a 7b 22 69 64 22 3a 31 2c 22 75 73 65 72 6e 61  :{"id":1,"userna
SSL DBG [4] 0f10:  6d 65 22 3a 22 62 65 6e 63 68 6f 66 66 22 7d 2c  me":"benchoff"},
SSL DBG [4] 0f20:  22 63 72 65 61 74 65 64 22 3a 22 32 30 32 35 2d  "created":"2025-
SSL DBG [4] 0f30:  30 32 2d 32 33 54 32 31 3a 30 31 3a 35 30 2e 34  02-23T21:01:50.4
SSL DBG [4] 0f40:  30 33 36 33 38 5a 22 2c 22 6d 6f 64 69 66 69 65  03638Z","modifie
SSL DBG [4] 0f50:  64 22 3a 22 32 30 32 35 2d 30 32 2d 32 33 54 32  d":"2025-02-23T2
SSL DBG [4] 0f60:  31 3a 30 31 3a 35 30 2e 34 30 33 36 37 36 5a 22  1:01:50.403676Z"
SSL DBG [4] 0f70:  2c 22 63 6f 6d 6d 65 6e 74 73 22 3a 5b 5d 2c 22  ,"comments":[],"
SSL DBG [4] 0f80:  63 6f 6d 6d 65 6e 74 5f 63 6f 75 6e 74 22 3a 30  comment_count":0
SSL DBG [4] 0f90:  7d 2c 7b 22 69 64 22 3a 36 31 34 2c 22 69 6d 61  },{"id":614,"ima
SSL DBG [4] 0fa0:  67 65 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30  ge":"https://640
SSL DBG [4] 0fb0:  62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f  by480.com/media/
SSL DBG [4] 0fc0:  63 6f 6e 76 65 72 74 65 64 5f 44 43 53 30 30 36  converted_DCS006
SSL DBG [4] 0fd0:  38 30 2e 6a 70 67 22 2c 22 74 68 75 6d 62 6e 61  80.jpg","thumbna
SSL DBG [4] 0fe0:  69 6c 22 3a 22 68 74 74 70 73 3a 2f 2f 36 34 30  il":"https://640
SSL DBG [4] 0ff0:  62 79 34 38 30 2e 63 6f 6d 2f 6d 65 64 69 61 2f  by480.com/media/
SSL DBG [2] <= read record
SSL DBG [2] <= read
SSL DBG [2] => read
SSL DBG [2] => read record
SSL DBG [2] => fetch input
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] in_left: %zu, nb_want: %zu
SSL DBG [2] ssl->f_recv(_timeout)() returned -1 (-0x0001)
SSL DBG [1] mbedtls_ssl_fetch_input() returned -1 (-0x0001)
SSL DBG [1] ssl_get_next_record() returned -1 (-0x0001)
SSL DBG [1] mbedtls_ssl_read_record() returned -1 (-0x0001)
SSL DBG [2] => write close notify
SSL DBG [2] => send alert message
SSL DBG [3] send alert level=1 message=0
SSL DBG [2] => write record
SSL DBG [2] => encrypt buf
SSL DBG [4] dumping 'before encrypt: output payload' (2 bytes)
SSL DBG [4] 0000:  01 00                                            ..
SSL DBG [4] dumping 'computed mac' (20 bytes)
SSL DBG [4] 0000:  43 23 4a 0a d3 74 04 7c e6 cb a7 d6 8c 72 79 4f  C#J..t.|.....ryO
SSL DBG [4] 0010:  c7 33 34 2f                                      .34/
SSL DBG [3] before encrypt: msglen = %zu, including %zu bytes of IV and %zu bytes of padding
SSL DBG [2] <= encrypt buf
SSL DBG [3] output record: msgtype = 21, version = [3:2], msglen = %zu
SSL DBG [4] dumping 'output record sent to network' (53 bytes)
SSL DBG [4] 0000:  15 03 02 00 30 a8 2b 50 1d a2 71 0a 90 b4 a7 41  ....0.+P..q....A
SSL DBG [4] 0010:  9a 61 a0 75 6d c8 eb 6c 2a ae c5 34 cf d8 cb 29  .a.um..l*..4...)
SSL DBG [4] 0020:  86 24 72 e2 98 6a 62 47 5c f9 17 e1 35 31 4b 64  .$r..jbG\...51Kd
SSL DBG [4] 0030:  7d a7 9a 3a 03                                   }..:.
SSL DBG [2] => flush output
SSL DBG [2] message length: %zu, out_left: %zu
SSL DBG [2] ssl->f_send() returned -1 (-0x0001)
SSL DBG [1] mbedtls_ssl_flush_output() returned -1 (-0x0001)
SSL DBG [1] mbedtls_ssl_write_record() returned -1 (-0x0001)
SSL DBG [1] mbedtls_ssl_send_alert_message() returned -1 (-0x0001)
SSL DBG [2] => free
SSL DBG [2] <= free
=== SSL DEBUG LOG FINISHED ===

```


[back](../)
