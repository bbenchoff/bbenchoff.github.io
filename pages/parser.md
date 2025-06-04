---
layout: default
title: "parser"
description: "Hardware engineering and PCB design documentation by Brian Benchoff"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-06-04
image: "/images/default.jpg"
---
## ANSI Terminal Parser

The core functionality of the [portable dumb terminal](/pages/dumb.html), the ANSI terminal processor is a reimplementation of the control logic of the [VT100](https://en.wikipedia.org/wiki/VT100) terminal.

![State Diagram of parser](/images/ParserState.png){: loading="lazy" alt="State Diagram of parser"}

This parser is capable of handling all escape codes in the ANSI x3.64-1979 standard, 'level 5' DEC private escape codes (equivalent to a VT5xx series terminal), and other terminal implementations. The parser is written in C and is extremely portable, capable of running on small, 8MHz microcontrollers.

More information can be found in my [Dumb Terminal repository](https://github.com/bbenchoff/Dumb-Badge).

[back](../)