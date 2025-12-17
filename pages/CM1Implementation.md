---
layout: default
title: "FPGA Implementation of the CM-1"
description: "Building a Connection Machine out of 4,096 FPGAs"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2022-06-04
image: "/images/default.jpg"
---


# Implementing 65,536 CM-1 Processors on 4,096 AG32 Chips

## The Goal

Replicate the exact CM-1 architecture:
- 65,536 bit-serial processors
- 4,096 routing nodes in a 12D hypercube  
- 16 processors per routing node
- SIMD execution (single instruction stream, broadcast to all)
- 4K bits of memory per processor (256MB total)

My machine has 4,096 AG32 chips. Each AG32 has ~2K LUTs. Put 16 soft processors in each AG32's FPGA fabric. 4,096 × 16 = 65,536 processors. Exact match.

## CM-1 Processor Architecture (from Hillis's thesis)

Each processor is absurdly simple:

```
Inputs:  A (1 bit from memory)
         B (1 bit from memory)  
         F (1 bit from a flag)

ALU:     Any boolean function of {A, B, F}
         Specified by 8-bit truth table
         
Outputs: M (1 bit to memory)
         G (1 bit to a flag)

State:   16 flags (8 general, 8 special)
         4K bits external memory
```

One instruction does everything:
- Read bit at address A from memory
- Read bit at address B from memory
- Read flag F
- Compute M = f(A,B,F) using truth table
- Compute G = g(A,B,F) using truth table
- Write M to memory at address A
- Write G to selected flag
- Conditionally execute based on another flag

Instruction word (55 bits):
```
A-address:        12 bits
B-address:        12 bits
Read-flag:         4 bits
Write-flag:        4 bits
Condition-flag:    4 bits
Condition-sense:   1 bit
Memory-TT:         8 bits
Flag-TT:           8 bits
NEWS-direction:    2 bits
```

The 16 special flags:
```
0-7:   General purpose (carry bits, temporaries)
8:     NEWS     - reads neighbor's flag output (N/E/W/S selectable)
9:     CUBE     - reads directly from hypercube neighbor
10:    DAISY    - reads previous processor in chain (for 16→1 reduction)
11:    ROUTER_DATA - for message passing
12:    ROUTER_ACK  - handshake from router
13:    LONG_PARITY - error correction
14:    INPUT    - external input pin
15:    ZERO     - always reads 0
```

## Resource Budget per AG32

Available: ~2,000 LUTs

### Per-Processor Costs:

**Flags (16 bits of state):**
- 16 flip-flops
- 16:1 mux for read-flag selection
- ~20 LUTs

**ALU (truth table lookup):**
- 8:1 mux for memory output (3 select bits → 8 entries)
- 8:1 mux for flag output
- ~10 LUTs

**Condition check:**
- 16:1 mux + comparator
- ~8 LUTs

**NEWS routing:**
- 4:1 mux for neighbor selection
- ~3 LUTs

**Total per processor: ~40 LUTs**

**16 processors: ~640 LUTs**

### Shared Infrastructure:

**Instruction broadcast/decode:**
- 55-bit instruction register
- Decode logic
- ~50 LUTs

**Memory interface:**
- 16 parallel memory ports (bit-serial, so 1 bit each)
- Address muxing
- ~100 LUTs

**Inter-processor routing (NEWS grid + daisy chain):**
- 4×4 grid connections
- Daisy chain for reductions
- ~50 LUTs

**TDMA controller (dimensions 4-11):**
- Phase counter
- Pin muxing
- ~50 LUTs

**Global OR tree:**
- 16-input OR for global flags
- ~10 LUTs

**Total infrastructure: ~260 LUTs**

### Grand Total: ~900 LUTs

**Headroom: ~1,100 LUTs** for the hardware router, packet buffers, error checking.

## Memory Architecture

The CM-1 used external SRAM chips (4K×4 per 16 processors = 4K bits each).

AG32 has 32KB of RAM. RISC-V firmware needs ~8KB. Leaves 24KB.

16 processors × 4K bits = 16 × 512 bytes = 8KB.

It fits. Holy shit it fits.

Memory map:
```
0x0000 - 0x1FFF: RISC-V code/data (8KB)
0x2000 - 0x3FFF: Processor 0-15 memory (8KB)
                 Each processor gets 512 bytes (4K bits)
                 Processor N: 0x2000 + N*0x200
```

Memory access is bit-serial. The RISC-V handles addressing; the FPGA fabric handles parallel execution across all 16 processors.

## The Topology Mapping

**Original CM-1:**
- 4,096 routers in a 12D hypercube (dimensions 0-11)
- 16 processors per router in a 4×4 NEWS grid
- Processors also connected via daisy chain

**Your Machine:**
- 4,096 AG32 chips in a 12D hypercube (dimensions 0-11)
- 16 soft processors per AG32

**Authentic CM-1 topology (what Hillis built)**
- Dimensions 0-11: between routers (your AG32-to-AG32 links)
- Within each chip: 4×4 NEWS grid + daisy chain
- Not a hypercube at the processor level, but the CM-1 technically wasn't either

## Verilog Implementation

### Single Processor Cell

```verilog
module cm1_processor (
    input  wire        clk,
    input  wire        rst_n,
    
    // Instruction (broadcast to all processors)
    input  wire        instr_valid,
    input  wire [11:0] addr_a,
    input  wire [11:0] addr_b,
    input  wire [3:0]  read_flag,
    input  wire [3:0]  write_flag,
    input  wire [3:0]  cond_flag,
    input  wire        cond_sense,
    input  wire [7:0]  tt_mem,      // Truth table for memory output
    input  wire [7:0]  tt_flag,     // Truth table for flag output
    
    // Memory interface (directly to RAM)
    output wire [11:0] mem_addr,
    output wire        mem_we,
    output wire        mem_wdata,
    input  wire        mem_rdata_a,  // Bit from address A
    input  wire        mem_rdata_b,  // Bit from address B
    
    // Neighbor connections
    input  wire        north_in,
    input  wire        east_in,
    input  wire        south_in,
    input  wire        west_in,
    output wire        flag_out,     // Goes to neighbors
    
    input  wire [1:0]  news_dir,     // 0=N, 1=E, 2=S, 3=W
    
    // Daisy chain
    input  wire        daisy_in,
    
    // Hypercube (directly from TDMA controller)
    input  wire        cube_in,
    
    // Global OR output
    output wire        global_bit
);

    // =========================================================
    // Flags: 8 general + 8 special
    // =========================================================
    reg [7:0] gp_flags;          // General purpose flags 0-7
    reg       long_parity;       // Flag 13
    
    // Special flags (directly wired, not stored):
    // Flag 8:  NEWS       - selected neighbor's flag_out
    // Flag 9:  CUBE       - cube_in
    // Flag 10: DAISY      - daisy_in
    // Flag 11: ROUTER_DATA - (for message passing, implement later)
    // Flag 12: ROUTER_ACK  - (for message passing, implement later)
    // Flag 13: LONG_PARITY - stored above
    // Flag 14: INPUT      - (external input, optional)
    // Flag 15: ZERO       - constant 0
    
    // NEWS mux
    wire news_flag;
    assign news_flag = (news_dir == 2'd0) ? north_in :
                       (news_dir == 2'd1) ? east_in :
                       (news_dir == 2'd2) ? south_in :
                                            west_in;
    
    // Flag read mux (16:1)
    wire f_bit;
    assign f_bit = (read_flag[3:0] == 4'd0)  ? gp_flags[0] :
                   (read_flag[3:0] == 4'd1)  ? gp_flags[1] :
                   (read_flag[3:0] == 4'd2)  ? gp_flags[2] :
                   (read_flag[3:0] == 4'd3)  ? gp_flags[3] :
                   (read_flag[3:0] == 4'd4)  ? gp_flags[4] :
                   (read_flag[3:0] == 4'd5)  ? gp_flags[5] :
                   (read_flag[3:0] == 4'd6)  ? gp_flags[6] :
                   (read_flag[3:0] == 4'd7)  ? gp_flags[7] :
                   (read_flag[3:0] == 4'd8)  ? news_flag :
                   (read_flag[3:0] == 4'd9)  ? cube_in :
                   (read_flag[3:0] == 4'd10) ? daisy_in :
                   (read_flag[3:0] == 4'd11) ? 1'b0 :  // ROUTER_DATA (stub)
                   (read_flag[3:0] == 4'd12) ? 1'b0 :  // ROUTER_ACK (stub)
                   (read_flag[3:0] == 4'd13) ? long_parity :
                   (read_flag[3:0] == 4'd14) ? 1'b0 :  // INPUT (stub)
                                               1'b0;   // ZERO
    
    // =========================================================
    // Condition Check
    // =========================================================
    wire cond_flag_val;
    assign cond_flag_val = (cond_flag[3:0] == 4'd0)  ? gp_flags[0] :
                           (cond_flag[3:0] == 4'd1)  ? gp_flags[1] :
                           (cond_flag[3:0] == 4'd2)  ? gp_flags[2] :
                           (cond_flag[3:0] == 4'd3)  ? gp_flags[3] :
                           (cond_flag[3:0] == 4'd4)  ? gp_flags[4] :
                           (cond_flag[3:0] == 4'd5)  ? gp_flags[5] :
                           (cond_flag[3:0] == 4'd6)  ? gp_flags[6] :
                           (cond_flag[3:0] == 4'd7)  ? gp_flags[7] :
                           (cond_flag[3:0] == 4'd15) ? 1'b0 :
                                                       1'b0;  // special flags
    
    wire execute = (cond_flag_val == cond_sense);
    
    // =========================================================
    // ALU: Truth Table Lookup
    // =========================================================
    wire [2:0] alu_index = {mem_rdata_a, mem_rdata_b, f_bit};
    wire mem_result = tt_mem[alu_index];
    wire flag_result = tt_flag[alu_index];
    
    // =========================================================
    // Outputs
    // =========================================================
    assign mem_addr = addr_a;  // Write address (same as read A)
    assign mem_we = instr_valid & execute;
    assign mem_wdata = mem_result;
    assign flag_out = flag_result;  // Broadcast to neighbors
    assign global_bit = flag_result;
    
    // =========================================================
    // Flag Write
    // =========================================================
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            gp_flags <= 8'h00;
            long_parity <= 1'b0;
        end else if (instr_valid && execute) begin
            case (write_flag)
                4'd0: gp_flags[0] <= flag_result;
                4'd1: gp_flags[1] <= flag_result;
                4'd2: gp_flags[2] <= flag_result;
                4'd3: gp_flags[3] <= flag_result;
                4'd4: gp_flags[4] <= flag_result;
                4'd5: gp_flags[5] <= flag_result;
                4'd6: gp_flags[6] <= flag_result;
                4'd7: gp_flags[7] <= flag_result;
                4'd13: long_parity <= flag_result;
                // Other special flags not writable
                default: ;
            endcase
        end
    end

endmodule
```

### 16-Processor Array with NEWS Grid

```verilog
module cm1_array_16 (
    input  wire        clk,
    input  wire        rst_n,
    
    // Broadcast instruction
    input  wire        instr_valid,
    input  wire [11:0] addr_a,
    input  wire [11:0] addr_b,
    input  wire [3:0]  read_flag,
    input  wire [3:0]  write_flag,
    input  wire [3:0]  cond_flag,
    input  wire        cond_sense,
    input  wire [7:0]  tt_mem,
    input  wire [7:0]  tt_flag,
    input  wire [1:0]  news_dir,
    
    // Memory interface (directly to RAM, bit-serial)
    // Each processor accesses its own 4K-bit region
    output wire [15:0] mem_we,           // Write enable per processor
    output wire [15:0] mem_wdata,        // Write data per processor
    input  wire [15:0] mem_rdata_a,      // Read data A per processor
    input  wire [15:0] mem_rdata_b,      // Read data B per processor
    
    // Hypercube input (from TDMA, active dimension)
    input  wire [15:0] cube_in,          // One bit per processor
    output wire [15:0] cube_out,         // One bit per processor
    
    // Global OR (for reductions)
    output wire        global_or
);

    // Flag outputs from each processor
    wire [15:0] flag_out;
    
    // NEWS grid connections (4x4)
    // Processor layout:
    //   0  1  2  3
    //   4  5  6  7
    //   8  9  10 11
    //   12 13 14 15
    
    // North neighbors (wrap around)
    wire [15:0] north_in = {flag_out[11:8], flag_out[15:12], 
                           flag_out[3:0], flag_out[7:4]};
    // Actually, simpler:
    // proc N's north = proc (N-4) mod 16, but with wrap
    // Let me just enumerate:
    
    wire [15:0] north;  // north_in for each processor
    assign north[0]  = flag_out[12]; // 0's north is 12
    assign north[1]  = flag_out[13];
    assign north[2]  = flag_out[14];
    assign north[3]  = flag_out[15];
    assign north[4]  = flag_out[0];
    assign north[5]  = flag_out[1];
    assign north[6]  = flag_out[2];
    assign north[7]  = flag_out[3];
    assign north[8]  = flag_out[4];
    assign north[9]  = flag_out[5];
    assign north[10] = flag_out[6];
    assign north[11] = flag_out[7];
    assign north[12] = flag_out[8];
    assign north[13] = flag_out[9];
    assign north[14] = flag_out[10];
    assign north[15] = flag_out[11];
    
    wire [15:0] south;  // south = N+4 mod 16
    assign south[0]  = flag_out[4];
    assign south[1]  = flag_out[5];
    assign south[2]  = flag_out[6];
    assign south[3]  = flag_out[7];
    assign south[4]  = flag_out[8];
    assign south[5]  = flag_out[9];
    assign south[6]  = flag_out[10];
    assign south[7]  = flag_out[11];
    assign south[8]  = flag_out[12];
    assign south[9]  = flag_out[13];
    assign south[10] = flag_out[14];
    assign south[11] = flag_out[15];
    assign south[12] = flag_out[0];
    assign south[13] = flag_out[1];
    assign south[14] = flag_out[2];
    assign south[15] = flag_out[3];
    
    wire [15:0] east;   // east = (N+1) with row wrap
    assign east[0]  = flag_out[1];
    assign east[1]  = flag_out[2];
    assign east[2]  = flag_out[3];
    assign east[3]  = flag_out[0];  // wrap
    assign east[4]  = flag_out[5];
    assign east[5]  = flag_out[6];
    assign east[6]  = flag_out[7];
    assign east[7]  = flag_out[4];  // wrap
    assign east[8]  = flag_out[9];
    assign east[9]  = flag_out[10];
    assign east[10] = flag_out[11];
    assign east[11] = flag_out[8];  // wrap
    assign east[12] = flag_out[13];
    assign east[13] = flag_out[14];
    assign east[14] = flag_out[15];
    assign east[15] = flag_out[12]; // wrap
    
    wire [15:0] west;   // west = (N-1) with row wrap
    assign west[0]  = flag_out[3];  // wrap
    assign west[1]  = flag_out[0];
    assign west[2]  = flag_out[1];
    assign west[3]  = flag_out[2];
    assign west[4]  = flag_out[7];  // wrap
    assign west[5]  = flag_out[4];
    assign west[6]  = flag_out[5];
    assign west[7]  = flag_out[6];
    assign west[8]  = flag_out[11]; // wrap
    assign west[9]  = flag_out[8];
    assign west[10] = flag_out[9];
    assign west[11] = flag_out[10];
    assign west[12] = flag_out[15]; // wrap
    assign west[13] = flag_out[12];
    assign west[14] = flag_out[13];
    assign west[15] = flag_out[14];
    
    // Daisy chain: 0 → 1 → 2 → ... → 15 → (wraps to 0)
    wire [15:0] daisy;
    assign daisy[0] = flag_out[15];
    genvar i;
    generate
        for (i = 1; i < 16; i = i + 1) begin : gen_daisy
            assign daisy[i] = flag_out[i-1];
        end
    endgenerate
    
    // Instantiate 16 processors
    generate
        for (i = 0; i < 16; i = i + 1) begin : gen_proc
            cm1_processor proc (
                .clk(clk),
                .rst_n(rst_n),
                .instr_valid(instr_valid),
                .addr_a(addr_a),
                .addr_b(addr_b),
                .read_flag(read_flag),
                .write_flag(write_flag),
                .cond_flag(cond_flag),
                .cond_sense(cond_sense),
                .tt_mem(tt_mem),
                .tt_flag(tt_flag),
                .mem_addr(),  // All processors use same address
                .mem_we(mem_we[i]),
                .mem_wdata(mem_wdata[i]),
                .mem_rdata_a(mem_rdata_a[i]),
                .mem_rdata_b(mem_rdata_b[i]),
                .north_in(north[i]),
                .east_in(east[i]),
                .south_in(south[i]),
                .west_in(west[i]),
                .flag_out(flag_out[i]),
                .news_dir(news_dir),
                .daisy_in(daisy[i]),
                .cube_in(cube_in[i]),
                .global_bit()
            );
        end
    endgenerate
    
    // Cube output for TDMA
    assign cube_out = flag_out;
    
    // Global OR
    assign global_or = |flag_out;

endmodule
```

## Integration with TDMA

The CM-1's router is complex — adaptive routing, buffering, referral. You don't need it. Your TDMA scheme is better for this:

**Original CM-1 router:**
- Packet-switched
- 7 message buffers
- Adaptive routing with referral
- Complex, ~10K transistors per router

**Your TDMA approach:**
- No buffering needed (deterministic scheduling)
- No arbitration (schedule prevents collisions)
- ~50 LUTs total

For CM-1 emulation, the CUBE flag reads directly from the TDMA-selected dimension. When a processor writes to the CUBE flag, that bit goes out on the active dimension during the appropriate phase.

```verilog
module cm1_with_tdma #(
    parameter MY_ADDR = 12'h000
)(
    input  wire        clk,
    input  wire        rst_n,
    
    // Phase clock
    input  wire        phase_tick,
    input  wire        phase_sync,
    
    // Physical pins (dimensions 0-11 of chip-level hypercube)
    inout  wire [11:0] dim_pins,
    
    // RISC-V interface  
    input  wire        simd_enable,
    input  wire [55:0] instruction,
    output wire        global_or_out,
    
    // Memory interface to RISC-V RAM
    // (bit-serial access to 16 × 4K bit regions)
    output wire [11:0] mem_addr,
    output wire [15:0] mem_we,
    output wire [15:0] mem_wdata,
    input  wire [15:0] mem_rdata_a,
    input  wire [15:0] mem_rdata_b
);

    // TDMA phase counter
    reg [4:0] phase;
    always @(posedge clk) begin
        if (phase_sync)
            phase <= 0;
        else if (phase_tick)
            phase <= (phase == 23) ? 0 : phase + 1;
    end
    
    wire [3:0] active_dim = phase[4:1];
    wire       phase_dir  = phase[0];
    wire       my_bit     = MY_ADDR[active_dim];
    wire       i_transmit = (my_bit == phase_dir);
    
    // CM-1 processor array
    wire [15:0] cube_out;
    wire [15:0] cube_in;
    
    cm1_array_16 array (
        .clk(clk),
        .rst_n(rst_n),
        .instr_valid(simd_enable),
        .addr_a(instruction[11:0]),
        .addr_b(instruction[23:12]),
        .read_flag(instruction[27:24]),
        .write_flag(instruction[31:28]),
        .cond_flag(instruction[35:32]),
        .cond_sense(instruction[36]),
        .tt_mem(instruction[44:37]),
        .tt_flag(instruction[52:45]),
        .news_dir(instruction[54:53]),
        .mem_we(mem_we),
        .mem_wdata(mem_wdata),
        .mem_rdata_a(mem_rdata_a),
        .mem_rdata_b(mem_rdata_b),
        .cube_in(cube_in),
        .cube_out(cube_out),
        .global_or(global_or_out)
    );
    
    // TDMA pin muxing
    // When transmitting: drive pin with cube_out[0] (all procs same in SIMD)
    // When receiving: sample pin into cube_in
    
    genvar d;
    generate
        for (d = 0; d < 12; d = d + 1) begin : gen_dim
            assign dim_pins[d] = (i_transmit && active_dim == d) ? 
                                 cube_out[0] : 1'bz;
        end
    endgenerate
    
    // All processors receive the same cube bit (they're on same chip)
    wire cube_bit = dim_pins[active_dim];
    assign cube_in = {16{cube_bit}};
    
    // Memory address (same for all processors)
    assign mem_addr = instruction[11:0];

endmodule
```

## Memory Access Pattern

The CM-1 instruction takes 3 cycles:
1. Read bit from address A
2. Read bit from address B  
3. Write result to address A

Your RAM interface needs to support this. Since all 16 processors access the same address (SIMD), you can use 16 single-bit RAMs or one 16-bit-wide RAM.

For AG32 with 32KB RAM:
```
Address mapping:
  Processor P, bit address B → RAM address = P * 512 + (B / 8)
  Within byte: bit (B % 8)
```

The RISC-V firmware handles the memory access timing:
```c
void cm1_execute_instruction(uint64_t instr) {
    // Unpack instruction
    uint16_t addr_a = instr & 0xFFF;
    uint16_t addr_b = (instr >> 12) & 0xFFF;
    // ... etc
    
    // Cycle 1: Read A bits for all 16 processors
    uint16_t bits_a = read_all_processors_bit(addr_a);
    
    // Cycle 2: Read B bits
    uint16_t bits_b = read_all_processors_bit(addr_b);
    
    // Cycle 3: FPGA computes and writes
    fpga_execute(instr, bits_a, bits_b);
}
```

## What You Can Run

With this architecture, you can run actual CM-1 programs:

**32-bit Addition (bit-serial):**
```
; Add X[31:0] + Y[31:0] → Z[31:0], using flag 0 as carry

; Initialize carry to 0
COND=ZERO, WRITE_FLAG=0, TT_FLAG=0x00

; For bit i = 0 to 31:
ADDR_A=X+i, ADDR_B=Y+i, READ_FLAG=0
TT_MEM = 0x96   ; A XOR B XOR F (sum)
TT_FLAG = 0xE8  ; (A AND B) OR (A AND F) OR (B AND F) (carry)
WRITE_FLAG = 0
; Write sum to Z+i
```

**Global OR (using daisy chain):**
```
; Reduce all processors' flag 0 to processor 0

; 16 processors, 4 steps (log2)
; Step 1: Each proc ORs with daisy neighbor
READ_FLAG=DAISY, TT_FLAG=0xFE  ; F OR existing
WRITE_FLAG=0

; Repeat 3 more times
; After 4 steps, proc 0 has global OR
```

**NEWS Shift (image processing):**
```
; Shift all data north by one pixel
; Read from south neighbor, write to local memory

NEWS_DIR=SOUTH, READ_FLAG=NEWS
ADDR_A=pixel_addr, TT_MEM=0xAA  ; Copy F to memory
```

## LUT Summary

| Component | LUTs |
|-----------|------|
| 16 processors (flags + ALU) | 640 |
| NEWS grid routing | 50 |
| Daisy chain | 16 |
| Instruction decode | 50 |
| Memory interface | 100 |
| TDMA controller | 50 |
| Global OR | 10 |
| **Total** | **~916** |
| **Remaining for router/extras** | **~1,084** |

There's room for:
- Hardware packet router (for async messages)
- Debug/trace logic
- Performance counters
- More sophisticated memory interface

## The Flex

When this works, I get to say:

"I built the only working Connection Machine. 65,536 bit-serial processors in a 12D hypercube, running the original CM-1 instruction set. The actual CM-1 cost $5 million and filled a room. Mine cost $5,000 and fits on a desk."

And unlike the original, mine has deterministic latency. Hillis had to deal with adaptive routing and buffer overflow.


[back](../)
