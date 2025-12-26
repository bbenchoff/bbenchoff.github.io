---
layout: default
title: "Blank"
description: "Hardware engineering and PCB design documentation by Brian Benchoff"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2022-06-04
image: "/images/default.jpg"
---

# StarC: A Parallel C for Hypercube Computers

## Introduction: Why StarC Exists

The Connection Machine had two programming languages: C* (a parallel extension of C) and *Lisp (a parallel dialect of Lisp). Both are dead. The compilers don't exist. The documentation is scattered across university archives and the Internet Archive. If you want to program a hypercube computer in 2025, you're on your own.

Modern parallel programming languages miss the point of a Connection Machine. MPI treats parallelism as message passing between independent processes. CUDA assumes a GPU with tens of thousands of lightweight threads. OpenMP is shared-memory parallelism with pragma annotations. None of these capture what the Connection Machine was: a SIMD machine where thousands of processors execute the same instruction simultaneously, operating on different data, with explicit control over which processors are active.

This machine—4,096 RISC-V microcontrollers arranged as a 12-dimensional hypercube—needs a programming model that matches its architecture. It needs a language where:

- **Data is distributed** across all processors by default
- **Operations happen everywhere** simultaneously
- **Masking is first-class** - you explicitly control which processors execute
- **Communication is topology-aware** - neighbor exchanges and dimension-ordered routing are primitives, not libraries

StarC is that language. It's C, extended with primitives for data-parallel computation on a hypercube. It compiles to normal C code that runs on the actual hardware. The toolchain is simple: a Python preprocessor rewrites StarC syntax into runtime library calls, then a standard C compiler produces the firmware.

This isn't a research project. This isn't a language design exercise. This is the minimum viable language needed to make a hypercube computer programmable instead of merely operational.

## Open Design Questions

This spec describes the language as designed. Several decisions remain open until validated against real hardware and real programs. This section tracks tensions between StarC's expressiveness and the TDMA network's constraints.

### Neighbor Exchange Ordering

`nbr(dim, value)` maps directly to TDMA phases. Dimension 0 uses phases 0-1. Dimension 11 uses phases 22-23. Calling dimensions in ascending order is fast. Calling them out of order forces a wait until the next superframe:

```c
nbr(0, x);   // phase 0 or 1
nbr(11, y);  // phase 22 or 23 — fast, same superframe

nbr(11, y);  // phase 22 or 23
nbr(0, x);   // phase 0 or 1 of NEXT superframe — 23 phases of dead time
```

**Unresolved:** Do we document this and let programmers deal with it? Add a `nbr_batch()` primitive that reorders internally? Have the preprocessor reorder independent `nbr()` calls? Unknown until we write real algorithms and see how often this bites.

### Hotspot Permutations

`get(source)` allows arbitrary communication patterns. But TDMA guarantees "one message per link per phase." If all 4,096 processors call `get(0)`, processor 0 cannot serve everyone in one superframe. The data must fan out through the hypercube over multiple cycles.

**Unresolved:** How slow is slow? Is this acceptable for rare operations? Should `broadcast(source, value)` be a first-class primitive using tree distribution? Do we need combining at intermediate nodes? Unknown until we measure actual timings on hardware.

### Collective Operation Rule Enforcement

The rule: "All processors must reach collective operations in the same sequence." TDMA requires this for timing correctness. But StarC allows:

```c
if (pid() < 2048) {
    x = reduce_sum(y);  // half the machine calls this
}
// other half never does — TDMA schedule breaks
```

**Unresolved:** Is "undefined behavior" sufficient, or do we need compile-time restrictions (collectives only at top-level scope), runtime detection, or tooling (playground warnings)? Unknown until we see how often programmers accidentally write this.

### Payload Size Limits

At 10 kHz phase rate with 1 Mbps baud, each phase carries ~100 bits (~10 bytes with header). StarC allows `pvar<float>`, arrays, structs. A 64-byte neighbor exchange doesn't fit in one phase.

**Unresolved:** Do we define `STAR_MAX_PAYLOAD` and restrict types? Fragment large messages across superframes? Let users choose phase rate based on payload needs? Unknown until we know what payloads real algorithms require.

### NEWS Communication

The spec mentions NEWS (North-East-West-South) for 2D grid operations within chips. The TDMA spec only covers hypercube dimensions.

**Unresolved:** How do NEWS directions map to dimensions 0-3? What happens at chip boundaries? Does NEWS use TDMA or a faster on-chip path? Punted to a future version. Hypercube primitives are the core; NEWS is nice-to-have for image processing.

### Barrier Semantics

`barrier()` is defined as "wait for end of superframe." But:
- If called at phase 5, wait for phase 23 of this superframe, or phase 0 of next?
- Do masked processors participate?

**Working definition:** Barrier means "wait until the next superframe boundary; all processors participate regardless of mask state." Subject to revision based on what the firmware actually needs.

### The Meta-Question

The TDMA spec assumes lockstep execution. StarC assumes programmer flexibility. These are in tension. The more flexibility StarC provides (masking, conditionals, arbitrary permutations), the harder it is to maintain TDMA's guarantees.

**Current stance:** Co-design carefully. Accept that some patterns are fast (neighbor exchange, reductions) and some are slow (arbitrary permutations, hotspots). Document costs. Use the playground to build intuition. Revise after building the 16-node AG32 board and writing real programs.

---

*This section will be revised or removed as questions are resolved through implementation.*

## The Programming Model

The Connection Machine's programming model, as described in Hillis's thesis, is fundamentally different from how most programmers think about parallelism today.

**Traditional parallelism:** You have a sequential program. You identify parts that can run in parallel. You spawn threads or processes. You coordinate them with locks and messages. Parallelism is something you add to a serial program.

**CM-1 parallelism:** The machine IS parallel. There is no serial program. There are 4,096 processors. They all execute the same instruction stream (SIMD). Each processor has its own data. Operations happen everywhere simultaneously. Masking controls which processors are active. Communication moves data between processors according to the hypercube topology.

This is **set-centric programming**. You don't write loops over array elements. You write operations that apply to the entire set of processors. A variable doesn't hold one value—it holds 4,096 values, one per processor. When you write `x = x + 1`, that happens on all 4,096 processors simultaneously.

Hillis called these distributed variables **xectors** (a portmanteau of "vector" and something else, probably "executor"). C* formalized them as **parallel variables with shapes**. StarC calls them `pvar<T>` - parallel variables of type T.

The key insight: **data structures are active**. An array isn't passive storage. It's 4,096 individual values, each owned by a processor, all operated on simultaneously. Computation happens through coordinated interactions across the network.

### Xectors (Parallel Variables)

A `pvar<T>` is one value per processor. If you have 4,096 processors and declare `pvar<int> x`, you have 4,096 separate integers, one in each processor's local memory.

```c
pvar<int> x;              // 4,096 integers, one per processor
pvar<float> temperature;  // 4,096 floats
pvar<char> pixel;         // 4,096 bytes
```

Each processor can read and write its own value:

```c
x = 42;                   // All 4,096 processors store 42
x = pid();                // Each processor stores its own ID (0-4095)
x = x + 1;                // All processors increment their local copy
```

But the power comes from operations that move data between processors or combine values across the entire machine.

### Processor Identity

Each processor needs to know its own address in the hypercube:

```c
int pid()           // Returns this processor's 12-bit address (0-4095)
int coord(int dim)  // Returns bit d of this processor's address
```

This is how you write position-dependent code:

```c
pvar<int> x;
x = pid();        // Processor 0 stores 0, processor 1 stores 1, etc.

if (coord(0) == 1) {
    // Only processors with bit 0 set execute this
    // That's processors 1, 3, 5, 7, ... (odd addresses)
}
```

### Masking with `where`

The `where` statement is the most important primitive in StarC. It controls which processors execute a block of code.

```c
where (x > 100) {
    x = x * 2;
}
```

This means: "For processors where x is greater than 100, double x. All other processors do nothing."

Inactive processors still participate in the instruction stream (it's SIMD), but they don't modify their state. If a `where` block contains a reduction or scan, inactive processors contribute identity elements (0 for sum, -∞ for max, etc.) but still participate in the communication pattern.

```c
where (coord(0) == 0) {
    // Only even-addressed processors
    y = reduce_sum(x);  // Sum only the even processors' values
}
```

`where` can nest:

```c
where (x > 0) {
    where (y > 0) {
        z = x + y;  // Only where both x and y are positive
    }
}
```

The runtime maintains a **mask stack**. Each `where` pushes a mask onto the stack. When the block exits, the mask is popped. This is invisible to the programmer but critical for correct execution.

### Variable Types: Scalar vs Parallel

StarC has two kinds of variables with fundamentally different semantics:

**Scalar variables** (normal C):
```c
int count = 0;
float pi = 3.14159;
char buffer[256];
```

Scalars exist **once** - the same value is replicated across all processors. Every processor executes the same scalar operations and sees the same scalar values. Scalars are how you write code that coordinates parallel operations.

**Parallel variables** (pvars):
```c
pvar<int> x;
pvar<float> temperature;
pvar<uint8_t> pixel;
```

Pvars exist **4,096 times** - each processor has its own distinct value. Operations on pvars happen simultaneously on all processors, each operating on their local copy.

**Mixing scalar and parallel:**
```c
pvar<int> x;
int scalar_value = 100;

x = scalar_value;          // Every processor stores 100
x = x + scalar_value;      // Every processor adds 100 to its local x
x = x + 1;                 // Every processor increments its local x

int total = reduce_sum(x); // Reduce pvar to scalar - same result on all processors
```

**Key distinction:** Scalars are for **control** and **coordination**. Pvars are for **data**. Loop counters are scalar. Data being processed is parallel.

**Assignment semantics:**
```c
pvar<int> x = 5;           // All processors: x ← 5
pvar<int> y = pid();       // Each processor: y ← its own address

int s1 = 42;               // All processors: s1 ← 42 (replicated)
int s2 = reduce_sum(x);    // All processors: s2 ← sum(all x values) (same everywhere)
```

**What you cannot do:**
```c
int scalar = x;            // ERROR: cannot assign pvar to scalar
                          // (which processor's value would you use?)

pvar<int> x = some_function_returning_different_values();
                          // ERROR: right side must be deterministic
                          // (all processors must compute same expression)
```

To convert a pvar to a scalar, you must use a reduction or explicitly select one processor's value:
```c
int result = reduce_sum(x);     // Sum all processors' x values
int first = (pid() == 0) ? x : 0;  // Only processor 0's value (others get 0)
```

## Core Primitives

StarC provides five categories of primitives that map directly to the hypercube architecture:

1. **Xectors and shapes** - distributed data
2. **Processor selection** - masking
3. **Communication** - moving data between processors
4. **Collective operations** - reductions, scans, broadcasts
5. **Synchronization** - barriers and phase control
6. **LED Control** - because we have to do this

### Xectors and Shapes

```c
pvar<T>          // Declare a parallel variable of type T
pid()            // Get this processor's 12-bit address
coord(dim)       // Get bit 'dim' of this processor's address
```

**Example:**
```c
pvar<int> data;
data = pid() * 2;  // Each processor stores 2× its address
```

#### Arrays of Parallel Variables

Arrays of pvars create multiple parallel values per processor:
```c
pvar<int> local_data[1024];  // Each processor has 1,024 integers
```

This creates 4,096 × 1,024 = 4,194,304 total integers distributed across the machine.

**Indexing with scalars:**
```c
pvar<int> A[100];

for (int i = 0; i < 100; i++) {  // Scalar loop counter
    A[i] = i;                     // All processors: A[i] ← i
}
// Now all processors have [0, 1, 2, ..., 99] in their local A array
```

The index `i` is the same on all processors, so all processors access the same element of their local array.

**Indexing with pvars:**
```c
pvar<int> A[256];
pvar<int> index;

index = pid() % 256;     // Each processor computes different index
pvar<int> value = A[index];  // Each processor reads different element

// This is legal but watch out: different processors access different elements
```

**Memory layout:**

Arrays are stored in each processor's local memory. `A[0]` through `A[n-1]` are consecutive in the local address space. There is no shared memory - every processor has its own copy of the array.

**Multi-dimensional arrays:**
```c
pvar<float> matrix[64][64];  // 64×64 matrix per processor

matrix[row][col] = 0.0f;     // Access with scalar indices
```

**Common pattern - distributed vectors:**
```c
// Distribute a 4096-element vector: each processor holds one element
pvar<float> my_element;

// Distribute a 4096×1024 matrix: each processor holds one row of 1024 elements  
pvar<float> my_row[1024];
```

### Type System

**Legal types for pvars:**
```c
// Primitive types
pvar<int>              // 32-bit signed integer
pvar<float>            // 32-bit floating point
pvar<double>           // 64-bit floating point (if hardware supports)
pvar<char>             // 8-bit character
pvar<uint8_t>          // 8-bit unsigned
pvar<uint16_t>         // 16-bit unsigned
pvar<uint32_t>         // 32-bit unsigned
pvar<int64_t>          // 64-bit signed (if hardware supports)

// Structs
pvar<struct point { int x; int y; }>
pvar<struct rgb { uint8_t r, g, b; }>

// Typedef'd types
typedef struct { float x, y, z; } vec3;
pvar<vec3> position;
```

**Illegal types for pvars:**
```c
pvar<int*>             // ERROR: no pointers in pvars
pvar<int[]>            // ERROR: no variable-length arrays
pvar<pvar<int>>        // ERROR: no nested pvars
pvar<void>             // ERROR: void has no size
```

**Type conversions:**

Implicit conversions work as in C:
```c
pvar<int> x = 5;
pvar<float> y = x;     // int → float conversion
pvar<uint8_t> z = y;   // float → uint8_t (truncation)
```

Explicit casts:
```c
pvar<int> x = 1000;
pvar<uint8_t> y = (uint8_t)x;  // Explicit truncation
```

**Structure member access:**
```c
typedef struct { int x; int y; } point;
pvar<point> p;

p.x = 10;              // Set x member on all processors
p.y = pid();           // Set y member to processor address

pvar<int> sum = p.x + p.y;  // Read members
```

**Size considerations:**

Communication primitives (`nbr`, `get`, `send`) need to know the size of data being moved. The runtime uses `sizeof(T)` to determine how many bytes to transmit. Large structs are legal but expensive to communicate.
```c
typedef struct { float data[256]; } big_struct;
pvar<big_struct> x;

// This works but transmits 1KB per processor per exchange
pvar<big_struct> neighbor = nbr(0, x);  
```

### Control Flow

StarC is **SPMD**: every processor runs the same program, but control flow may diverge based on per-processor state. Conditions may depend on `pid()`, `coord(dim)`, or `pvar` values, and different processors may take different branches.

The catch is that StarC runs on a TDMA-synchronized network. The TDMA clock makes link timing deterministic, but **it does not make divergent software magically safe**. To keep communication correct, StarC defines a strict rule:

> **Collective Operation Rule:** Any operation that touches the network is a **collective operation** and must be executed in a compatible order by all required participants.
>
> Collective operations include: `nbr`, all `reduce_*`, all `scan_*`, `get`, `send`, `prs`, `pact`, `barrier`, and `sync_dim`.
>
> * **Global collectives** (`reduce_*`, `scan_*`, `barrier`) must be reached by **all processors** in the same sequence.
> * **Edge collectives** (`nbr(dim, ...)`) must be reached by **both endpoints of every edge in that dimension** in the same sequence (same `dim`, same payload size).
>
> Violating this rule is **undefined behavior** (typically deadlock or garbage data).

With that rule in mind, StarC supports two broad kinds of control flow.

---

#### Uniform control flow

Uniform control flow is code where all processors take the same branch and execute the same iteration counts. This is ordinary C control flow that happens to be executed everywhere.

```c
int n = 100;

for (int i = 0; i < n; i++) {
    // All processors execute this loop n times.
    // Loop counter 'i' has the same value on all processors.
}

if (n > 50) {
    // All processors execute this branch (or all skip it).
}

while (n > 0) {
    n--;
    // All processors execute this loop together.
}
```

Uniform control flow is always safe with respect to communication, because it preserves the same collective call ordering across processors.

---

#### Divergent control flow (per-processor branching)

Divergent control flow is allowed. Any processor may take different branches based on per-processor values:

```c
pvar<int> x;

if (x > 100) {
    // Only processors where x > 100 execute this block.
    x = 0;
}
```

This is legal in StarC. There is no special “scalar if” restriction: `if` conditions may depend on `pvar` values.

However, **divergent control flow must still obey the Collective Operation Rule**. In practice:

* Divergence is always safe for **local-only work** (computation, local memory updates, LED updates, host I/O buffering, etc.).
* Divergence is **unsafe** if it causes processors to execute **different sequences of collective operations**.

**Illegal (mismatched collective):**

```c
if (pid() == 0) {
    x = nbr(0, x);   // Only processor 0 calls nbr → mismatch → undefined behavior
}
```

**Legal (balanced collective):**

```c
if (pid() == 0) {
    x = nbr(0, x);
} else {
    x = nbr(0, x);   // Everyone calls nbr(0) exactly once → safe
}
```

**Legal (conditional participation via identity values):**

```c
int active = (x > 100);
int contrib = active ? x : 0;
int sum = reduce_sum(contrib);   // Everyone calls reduce_sum once → safe
```

---

#### The `where` construct

`where (cond) { ... }` is syntactic sugar for an `if` block intended to make “per-processor selection” visually explicit:

```c
where (x > 100) {
    x = 0;
}
```

This is equivalent to:

```c
if (x > 100) {
    x = 0;
}
```

`where` does **not** imply SIMD-style masking in v0.1; it is a readability feature for data-parallel code.

As with `if`, code inside `where` must obey the **Collective Operation Rule**.

---

#### Loops with varying conditions

Loops whose termination depends on per-processor state are allowed, but they are a common source of collective mismatches. The safe pattern is:

1. Use a **uniform** loop bound for the structure (same on all processors), and
2. Use a **global collective** to decide early exit.

```c
pvar<int> has_data;

for (int iter = 0; iter < MAX_ITERS; iter++) {
    int any_active = reduce_or(has_data != 0);
    if (!any_active) break;   // Uniform early exit (same on all processors)

    if (has_data != 0) {
        // Local-only processing is fine here
        has_data = process_step(has_data);
    }

    barrier();  // Optional: reconverge before the next collective-heavy phase
}
```

**Rule of thumb:** if a loop body contains any collective operation, the loop must execute the same number of collective calls in the same order on all processors.

### Function Definitions

Functions can operate on scalars, pvars, or both:

**Functions with scalar parameters:**
```c
int square(int x) {
    return x * x;
}

int result = square(5);  // Normal C function call
```

**Functions with pvar parameters:**
```c
pvar<int> double_value(pvar<int> x) {
    return x * 2;
}

pvar<int> a;
pvar<int> b = double_value(a);  // Each processor calls with its own 'a'
```

**Mixed parameters:**
```c
pvar<int> scale(pvar<int> x, int factor) {
    return x * factor;  // factor is scalar (same on all processors)
}

pvar<int> result = scale(data, 10);
```

**Calling convention:**

Functions execute on all processors simultaneously. Each processor calls the function with its own pvar values:
```c
pvar<int> compute(pvar<int> x) {
    pvar<int> temp = x * x;
    temp = nbr(0, temp);  // Communication inside function
    return temp;
}

pvar<int> y = compute(my_data);
// All processors call compute() in lockstep
// Each processor passes its own my_data
```

**Return values:**

- Functions returning pvars: each processor gets its own result
- Functions returning scalars: all processors get the same result
```c
int max_of_pvar(pvar<int> x) {
    return reduce_max(x);  // Returns scalar (same on all processors)
}

pvar<int> increment(pvar<int> x) {
    return x + 1;  // Returns pvar (different per processor)
}
```

**Restrictions:**

Functions cannot have side effects that break SIMD execution:
```c
// ILLEGAL: different processors would call at different times
pvar<int> bad_function(pvar<int> x) {
    if (x > 0) {  // ERROR: cannot use pvar condition
        return x * 2;
    } else {
        return x;
    }
}

// CORRECT: use where for conditional logic
pvar<int> good_function(pvar<int> x) {
    pvar<int> result = x;
    where (x > 0) {
        result = x * 2;
    }
    return result;
}
```

**Inlining:**

The preprocessor does not automatically inline functions. For performance-critical code, consider using macros or relying on the C compiler's inline optimization:
```c
static inline pvar<int> fast_function(pvar<int> x) {
    return x * x;
}
```

**Recursion:**

Recursion is legal but remember that the call depth is the same on all processors. The recursion is scalar (same depth everywhere), even if operating on pvar data:
```c
pvar<int> factorial(int n, pvar<int> x) {  // n is scalar depth
    if (n <= 1) return x;
    return factorial(n - 1, x * n);
}

pvar<int> result = factorial(5, pid());  // All processors recurse 5 levels
```

### Processor Selection (where)

```c
where (condition) { ... }       // Execute only where condition is true
where (condition) { ... } else { ... }  // With explicit else branch
```

**Example:**
```c
pvar<int> x, y;
where (x > y) {
    x = y;  // Clamp x to y where x exceeds y
}
```

### Communication Primitives

This is where StarC becomes more than just "C with parallel variables." Communication exposes the hypercube topology and the TDMA message-passing scheme.

#### NEWS Communication (Grid Topology)

While `nbr(dim, value)` exchanges data along hypercube dimensions, many algorithms think in terms of 2D grids. NEWS communication provides cardinal-direction exchanges within the 4×4 processor grid on each chip.

**Primitives:**
```c
T news_recv(direction_t dir, T default_value)
void news_send(direction_t dir, T value)
```

**Directions:**
```c
typedef enum {
    NORTH = 0,
    EAST  = 1, 
    SOUTH = 2,
    WEST  = 3
} direction_t;
```

**Mapping to hypercube:**

Each chip has a 4×4 grid of processors with addresses `base + (row * 4 + col)`. NEWS directions map to hypercube dimensions based on grid position:
```c
// Within a 4×4 grid:
// NORTH/SOUTH: dimension determined by row position
// EAST/WEST: dimension determined by column position

// Example for processor at (row=1, col=2):
NORTH → dimension 2  // connects to (row=0, col=2)
SOUTH → dimension 2  // connects to (row=2, col=2)  
EAST  → dimension 0  // connects to (row=1, col=3)
WEST  → dimension 0  // connects to (row=1, col=1)
```

**Edge handling:**

Processors at grid edges can either:
1. Receive a default value (wrap-around disabled)
2. Wrap to the opposite edge (toroidal topology)
3. Connect to neighboring chips (if treating entire machine as mega-grid)
```c
pvar<int> pixel;

// Receive from all four directions (with edge defaults)
pvar<int> n = news_recv(NORTH, 0);
pvar<int> e = news_recv(EAST, 0);
pvar<int> s = news_recv(SOUTH, 0);
pvar<int> w = news_recv(WEST, 0);

// 5-point stencil (common in image processing)
pvar<int> blurred = (pixel * 4 + n + e + s + w) / 8;
```

**Implementation note:**

NEWS is syntactic sugar over `nbr()` with grid-aware dimension mapping. The runtime calculates which hypercube dimension corresponds to each NEWS direction based on the processor's position in its local 4×4 grid.

**When to use NEWS vs nbr:**

- Use NEWS for image processing, cellular automata, stencil operations on 2D grids
- Use `nbr(dim)` for hypercube-aware algorithms, sorting, reductions, arbitrary topology

NEWS is optional - everything NEWS does can be done with `nbr()` and explicit dimension calculation. But it makes grid algorithms cleaner.

#### Neighbor Exchange

```c
T nbr(int dim, T value)
```

Exchange `value` with the neighbor in dimension `dim`. Returns the neighbor's value.

The neighbor in dimension `dim` is the processor whose address differs by exactly one bit - the XOR neighbor. For processor `0x2A3`, the dimension-0 neighbor is `0x2A2`. The dimension-5 neighbor is `0x283`.

**Example:**
```c
pvar<int> x;
x = pid();

pvar<int> neighbor_value;
neighbor_value = nbr(0, x);  // Exchange with dimension-0 neighbor

// Now each processor has its neighbor's original value
// Processor 0x2A3 received the value from 0x2A2
// Processor 0x2A2 received the value from 0x2A3
```

This maps perfectly to the TDMA scheme. During dimension-0's time slot, all processors exchange data with their dimension-0 neighbors. No collisions. Deterministic latency.

#### Remote Read

```c
T prs(addr_t global_addr)
```

Read from a global address. This is "parallel remote reference" - every processor can specify a different address, and reads happen simultaneously across the network.

**Example:**
```c
pvar<addr_t> target;
target = pid() ^ 0x001;  // Each processor targets its dimension-0 neighbor

pvar<int> remote_value;
remote_value = prs(target);  // Read from remote processor
```

Under the hood, this becomes a series of dimension-ordered hops. The runtime routes each read request to its destination, retrieves the value, and routes it back.

#### Remote Write with Combining

```c
void pact(addr_t global_addr, T value, combiner_t op)
```

Write to a global address with a combining operation. If multiple processors write to the same address, the combiner resolves conflicts.

**Example:**
```c
// All processors in the upper half write to processor 0
where (coord(11) == 1) {
    pact(0, 1, COMBINE_SUM);  // Increment processor 0's counter
}
```

Available combiners: `COMBINE_SUM`, `COMBINE_MAX`, `COMBINE_MIN`, `COMBINE_OR`, `COMBINE_AND`.

This is how you implement atomic operations without locks. Multiple writers to the same address don't race—they combine according to the specified operation.

#### General Permutation

```c
T get(pvar<addr_t> source_index)
void send(pvar<addr_t> dest_index, T value)
```

`get` and `send` implement arbitrary permutations. Each processor specifies a source (for get) or destination (for send), and the runtime executes the data movement.

**Example (transpose):**
```c
// Assume 64×64 grid mapped onto hypercube
pvar<int> my_row = pid() / 64;
pvar<int> my_col = pid() % 64;

pvar<addr_t> transpose_addr = my_col * 64 + my_row;

pvar<int> data;
data = get(transpose_addr);  // Fetch from transposed position
```

This is expensive (requires routing through the hypercube), but it's the primitive that makes "pointer chasing" and arbitrary data movement possible.

### Collective Operations

Collective operations combine or distribute data across all processors. These are the bread and butter of data-parallel programming.

#### Reduce

```c
T reduce_sum(pvar<T> value)
T reduce_max(pvar<T> value)
T reduce_min(pvar<T> value)
T reduce_and(pvar<T> value)
T reduce_or(pvar<T> value)
```

Combine values from all processors into a single result. Every processor receives the same result.

**Example:**
```c
pvar<int> local_count;
// ... compute local_count ...

int total = reduce_sum(local_count);  // Sum across all processors
// Now 'total' is the same on every processor
```

Implementation: Tree reduction over the hypercube dimensions. First, processors exchange with dimension-0 neighbors and combine. Then dimension-1. Then dimension-2. After 12 steps, every processor has the global result.

#### Scan (Prefix Sum)

```c
pvar<T> scan_sum(pvar<T> value)
pvar<T> scan_max(pvar<T> value)
pvar<T> scan_min(pvar<T> value)
```

Compute a running total (or max, or min) across processors. Processor `i` receives the sum of values from processors `0..i`.

**Example:**
```c
pvar<int> x;
x = 1;  // Every processor has 1

pvar<int> prefix;
prefix = scan_sum(x);  // Processor 0 gets 1, processor 1 gets 2, processor 2 gets 3, ...
```

This is how you implement parallel compaction, load balancing, and prefix-based algorithms.

#### Spread (Broadcast)

```c
pvar<T> spread(T scalar_value)
```

Broadcast a scalar value to all processors. Typically used to send a result computed on one processor to everyone.

**Example:**
```c
int result_on_zero = reduce_sum(local_values);

pvar<int> everyone_has_it;
everyone_has_it = spread(result_on_zero);  // All processors receive the result
```

#### Rank (Optional)

```c
pvar<int> rank(pvar<T> value)
```

Compute the rank of each processor's value in sorted order. Processor with the smallest value gets rank 0, largest gets rank 4095.

This enables sorting and reordering without explicit data movement.

### Synchronization

```c
void barrier()              // Wait for all processors
void sync_dim(int dim)      // Synchronize on dimension (advanced)
```

`barrier()` is a global synchronization point. All processors must reach the barrier before any can proceed.

In most StarC programs, you don't call `barrier()` explicitly. The runtime inserts barriers automatically around communication operations. But it's available if you need manual control.

### LED Control

```c
void led_set(uint8_t brightness)    // Set this processor's LED (0-255)
uint8_t led_get()                   // Read current LED value
```

Each processor has a memory-mapped LED register that controls its brightness on the 64×64 LED matrix. The slice controller reads these registers and forwards them to the IS31FL3741 LED driver.

**Memory map:**
```
0x2000_0000: LED_VALUE (write-only from processor)
    [7:0] brightness (0 = off, 255 = max)
```

**Example:**
```c
pvar<int> data;
// ... compute something ...

// Visualize which processors have large values
where (data > 100) {
    led_set(255);  // Bright
}
where (data <= 100) {
    led_set(data * 2);  // Dim, proportional to value
}
```

**Hardware implementation:**

The slice controller polls (or receives interrupts from) all 64 processors in its slice, aggregates their LED values into a 64-byte buffer, and sends it to the IS31FL3741 via I²C at 30-60Hz. This data is also passed up the control tree to the root controller for display on the master LED matrix.

Total bandwidth: 4,096 bytes at 60Hz = ~250 KB/s over the control backbone.

**Connection Machine parallel:**

The CM-1 had this exact feature. Each processor had a red LED on the front panel. Hillis used it for debugging (light up processors meeting a condition), visualization (watch sorting algorithms propagate data), and status monitoring (show active vs masked processors). Classic CM-1 demos included:
- Sorting networks - watch data flow through the hypercube
- Cellular automata - Game of Life running on hardware
- Mandelbrot set - each processor computes one pixel
- Bit patterns - verify communication is working

The LED isn't just for show. It's a **debugging primitive**. When processor 2,047 hangs during a reduction, the LED pattern tells you which dimension failed.

**Simulator implementation:**

In the simulator, `led_set()` just updates a field in the processor state:
```c
typedef struct {
    int my_addr;
    uint8_t led_value;  // 0-255 brightness
    // ... other state
} vproc_state_t;

void star_led_set(uint8_t brightness, star_context_t *ctx) {
    vprocs[ctx->my_addr].led_value = brightness;
}
```

The web visualization reads `vprocs[i].led_value` and renders a colored square on the canvas.


## Input/Output

The hypercube needs to exchange data with the host (your laptop/desktop). Processor 0 acts as the I/O coordinator, connected to the host via USB/UART.

### Host-to-Machine Transfer
```c
void load_from_host(pvar<T> *dest, size_t count)
```

Loads `count` values of type `T` from the host. Processor 0 receives data over USB, then distributes it across the machine.

**Example:**
```c
pvar<float> data;

// Host sends 4096 float values
load_from_host(&data, 1);  // Each processor receives one float

// Or load arrays
pvar<float> local_array[1024];
load_from_host(local_array, 1024);  // Each processor receives 1024 floats
```

**Distribution patterns:**

The runtime can distribute data in different patterns:
```c
// Sequential: processor i gets element i
load_sequential(&data, 4096);

// Block: processors 0-63 get block 0, 64-127 get block 1, etc.
load_blocked(&data, 4096, BLOCK_SIZE);

// Scattered: arbitrary mapping defined by host
load_scatter(&data, mapping_table, 4096);
```

### Machine-to-Host Transfer
```c
void store_to_host(pvar<T> *src, size_t count)
```

Sends data from all processors back to the host. Processors send to processor 0, which forwards to the host.

**Example:**
```c
pvar<int> result;
// ... compute result ...

store_to_host(&result, 1);  // Send each processor's result to host
```

**Gather pattern:**
```c
pvar<float> local_results[100];

// Host receives 4096 × 100 = 409,600 values
store_to_host(local_results, 100);
```

### Scalar I/O from Processor 0

For debugging or small data transfer, processor 0 can communicate directly:
```c
void host_printf(const char *fmt, ...)  // Printf to host console
int host_scanf(const char *fmt, ...)    // Read from host stdin
```

**Example:**
```c
if (pid() == 0) {
    int max_value = reduce_max(data);
    host_printf("Maximum value: %d\n", max_value);
}
```

**Blocking semantics:**

`host_printf` and `host_scanf` block only processor 0. Other processors continue executing. Use barriers if you need synchronization:
```c
if (pid() == 0) {
    host_printf("Iteration %d complete\n", iter);
}
barrier();  // Wait for processor 0 to finish I/O
```

### Broadcast from Host

To send a single scalar value from host to all processors:
```c
int host_broadcast_int()
float host_broadcast_float()
```

**Example:**
```c
// Host sends one int, all processors receive it
int threshold = host_broadcast_int();

where (data > threshold) {
    data = 0;
}
```

### Implementation Details

**USB/UART protocol:**

Processor 0 connects to host via FTDI USB-UART bridge. Protocol:
```
HOST → NODE0: [CMD_LOAD] [TYPE] [COUNT] [DATA...]
NODE0 → HOST: [CMD_STORE] [COUNT] [DATA...]
NODE0 → HOST: [CMD_PRINT] [LENGTH] [STRING...]
```

**Distribution algorithm:**

`load_from_host` uses hypercube routing:
1. Processor 0 receives all data from host
2. Processor 0 sends half the data to processor 2048 (dimension 11)
3. Processors 0 and 2048 each send half their data along dimension 10
4. Continue splitting for all 12 dimensions
5. After 12 steps, all processors have their data

This is a broadcast tree, completing in ~5ms for 4,096 values.

**Buffer sizing:**

The runtime allocates buffers in processor 0's memory:
```c
#define MAX_TRANSFER_SIZE (1024 * 1024)  // 1MB
uint8_t transfer_buffer[MAX_TRANSFER_SIZE];
```

Large transfers (> 1MB) must be split into multiple calls.


## Performance Model

Understanding the cost of each operation helps you write efficient StarC programs.

### Communication Costs

**Neighbor exchange** (`nbr`):
- Cost: 1 TDMA phase = 416 μs
- All processors exchange simultaneously
- Deterministic, no collisions

**Example:**
```c
x = nbr(0, x);  // 416 μs
x = nbr(1, x);  // 416 μs
x = nbr(2, x);  // 416 μs
// Total: 1.25 ms for three dimensions
```

**Reduction** (`reduce_sum`, `reduce_max`, etc.):
- Cost: 12 TDMA phases = 12 × 416 μs = 5.0 ms
- Tree algorithm over all dimensions
- All processors receive result

**Scan** (`scan_sum`, etc.):
- Cost: 12 TDMA phases = 5.0 ms
- Similar to reduction but propagates running total

**Permutation** (`get`, `send`):
- Cost: up to 12 hops = 5.0 ms worst case
- Average case: ~6 hops = 2.5 ms
- Depends on Hamming distance between source and destination

**Example - sorting:**
```c
// Bitonic sort: O(log²N) compare-exchange steps
// For N=4096: log²(4096) = 12² = 144 steps
// Each step: one permutation = 5ms
// Total: 144 × 5ms = 720ms
```

### Computation Costs

**Local operations:**
- Arithmetic: ~1-10 cycles (depends on operation)
- At 133 MHz: arithmetic is essentially free compared to communication
- Memory access: ~2-5 cycles

**Rule of thumb:** Computation is **1000× faster** than communication. A single `nbr()` call costs as much as ~55,000 arithmetic operations.

### Optimization Strategies

**1. Minimize dimension hops:**
```c
// Bad: permute, then process, then permute back
data = get(remote_addr);
data = process(data);
send(original_addr, data);
// Cost: 10ms

// Good: process locally, only send result
result = process(local_data);
send(remote_addr, result);
// Cost: 5ms
```

**2. Batch communication:**
```c
// Bad: multiple small messages
for (int i = 0; i < 10; i++) {
    small_value = nbr(0, small_value);  // 10 × 416μs = 4.16ms
}

// Good: one large message
struct batch { int values[10]; };
pvar<struct batch> data;
data = nbr(0, data);  // 416μs (same cost regardless of size up to MTU)
```

**3. Use local computation:**
```c
// Bad: exchange every step
for (int i = 0; i < 100; i++) {
    x = nbr(0, x);  // 416μs × 100 = 41.6ms
}

// Good: compute locally, exchange once
for (int i = 0; i < 100; i++) {
    x = local_compute(x);  // ~1μs × 100
}
x = nbr(0, x);  // 416μs
// Total: 516μs
```

**4. Overlap communication and computation (advanced):**

If the hardware supports it, you can issue a communication operation and do local work while it completes:
```c
// Issue non-blocking exchange
nbr_async(0, x, &handle);

// Do local work
y = expensive_computation(y);

// Wait for exchange to complete
x = nbr_wait(handle);
```

This is not in MVP but planned for v0.2.

### Bandwidth Analysis

**Per-dimension bandwidth:**
- 12 Mbaud UART = 1.5 MB/s
- TDMA phase = 416 μs → ~2400 phases/second
- Per-phase payload: ~256 bytes (limited by UART buffer)
- Effective: 256 bytes × 2400 = 614 KB/s per dimension

**Aggregate bandwidth:**
- 12 dimensions × 614 KB/s = 7.4 MB/s total
- But dimensions are sequential, not parallel (TDMA)
- Realistic sustained: ~2-3 MB/s across all dimensions

**Comparison:**
- GPU (PCIe 4.0): ~32 GB/s
- DDR4 memory: ~25 GB/s  
- Hypercube: ~3 MB/s

The hypercube is **bandwidth-limited**. Algorithm design must minimize data movement. This is by design - the CM-1 had similar characteristics.

### Latency Analysis

**Reduction latency:** 5ms for 4,096 processors
- Compare to GPU: ~10μs for reduction on 10,000 threads
- Hypercube is 500× slower

But:
- GPU requires PCIe transfer: ~1ms for 4KB
- GPU kernel launch overhead: ~10μs
- GPU is optimized for throughput, not latency

For **streaming problems** where you do many reductions in sequence, the hypercube's predictable latency can be an advantage. No contention, no scheduling jitter.

### When the Hypercube Wins

The hypercube is competitive when:
1. **Communication pattern matches topology** (neighbor exchanges, grid stencils)
2. **Computation is communication-bound** (cellular automata, graph traversal)
3. **Deterministic timing is required** (real-time processing, control systems)
4. **Problem size exactly fits** (4,096 is your native granularity)

The hypercube loses when:
- Problem needs high bandwidth (video processing, large matrix ops)
- Irregular communication (random access, pointer chasing)
- Variable workload (some processors much busier than others)

## Edge Cases and Undefined Behavior

### Masked Operations

**All processors masked out:**
```c
where (false) {
    int result = reduce_sum(x);  // What is result?
}
```

**Behavior:** Reduction of empty set returns identity element:
- `reduce_sum`: returns 0
- `reduce_max`: returns -∞ (or `INT_MIN`)
- `reduce_min`: returns +∞ (or `INT_MAX`)
- `reduce_and`: returns all-bits-set
- `reduce_or`: returns 0

All processors receive the same identity value.

**Partial masking:**
```c
where (x > 0) {
    int sum = reduce_sum(x);  // Sum of only positive x values
}
```

Inactive processors contribute identity elements but still participate in communication (for TDMA timing). The result is computed correctly.

### Division and Arithmetic Errors

**Division by zero:**
```c
pvar<int> x = 5;
pvar<int> y = 0;
pvar<int> z = x / y;  // Undefined behavior on processors where y == 0
```

**Behavior:** Follows C semantics - undefined behavior per processor. On RISC-V, typically returns zero or triggers a trap. Use `where` to guard:
```c
where (y != 0) {
    z = x / y;
}
where (y == 0) {
    z = 0;  // Or some other default
}
```

**Floating point exceptions:**

Overflow, underflow, and NaN follow IEEE 754 semantics. Each processor handles its own exceptions independently.

### Out-of-Range Addressing

**Invalid processor address:**
```c
pvar<addr_t> target = 5000;  // Out of range (> 4095)
pvar<int> value = prs(target);  // Undefined
```

**Behavior:** Undefined. Implementation may:
- Wrap modulo 4096
- Return zero
- Trap/assert in debug builds

**Guard with masking:**
```c
where (target < 4096) {
    value = prs(target);
}
```

**Invalid dimension:**
```c
x = nbr(15, x);  // Only dimensions 0-11 exist
```

**Behavior:** Undefined. Implementation may trap or wrap modulo 12.

### Deadlock Scenarios

**Circular dependencies in get/send:**
```c
// Processor A waits for data from B
// Processor B waits for data from A
pvar<addr_t> target = (pid() + 1) % 2;  // 0→1, 1→0
pvar<int> data = get(target);
send(target, data);  // DEADLOCK
```

**Behavior:** Deadlock. Both processors wait forever. The TDMA system cannot detect this. **Don't do this.**

**Safe pattern - use separate phases:**
```c
// Phase 1: everyone sends
send(target, my_data);
barrier();

// Phase 2: everyone receives  
data = get(source);
```

### Resource Limits

**Mask stack overflow:**
```c
// Nesting too deep
where (a) { where (b) { where (c) { where (d) { 
where (e) { where (f) { where (g) { where (h) {
where (i) { where (j) { where (k) { where (l) {
where (m) { where (n) { where (o) { where (p) {
where (q) {  // Overflow if stack depth < 17
```

**Behavior:** Undefined. Implementation may:
- Trap/assert
- Silently wrap (incorrect masking)
- Increase limit dynamically

Current limit: 16 levels (configurable in runtime).

**Memory exhaustion:**
```c
pvar<uint8_t> huge_array[1024 * 1024];  // 1MB per processor
```

Each processor has limited RAM (typically 64-128KB on CH32V307). Large allocations fail. Use dynamic allocation with error checking:
```c
pvar<uint8_t*> array = malloc(size);
if (array == NULL) {
    // Handle allocation failure
}
```

### Communication Failures

**UART bit errors:**

At 12 Mbaud over SlimStack connectors, bit errors can occur. The runtime should use CRC checks:
```c
// If CRC fails on received data
// Behavior: Implementation-defined
// Options: retry, return error code, trap
```

**Phase desynchronization:**

If processor clocks drift or FPGA TDMA controller fails:

**Behavior:** Catastrophic. Communication garbled. No automatic recovery. Requires hardware reset.

Prevention: FPGA generates TDMA clock from crystal oscillator. All processors sync to this. Use watchdog timers to detect desync.

### Unspecified Evaluation Order

**Reduction of non-commutative operations:**
```c
float result = reduce_sum(floating_point_values);
```

Floating-point addition is **not associative** due to rounding. Different reduction tree orders produce different results (within epsilon).

**Behavior:** Unspecified which tree order is used. Results are deterministic for a given implementation but may vary between compiler versions.

### Type Punning

**Reinterpreting pvar bytes:**
```c
pvar<int> x = 0x12345678;
pvar<uint8_t*> ptr = (uint8_t*)&x;  // Pointer to pvar - ILLEGAL
```

**Behavior:** Undefined. Pointers to pvars don't make sense - pvars are distributed values, not memory locations.

**Correct approach - use unions:**
```c
pvar<union { int i; uint8_t bytes[4]; }> data;
data.i = 0x12345678;
pvar<uint8_t> first_byte = data.bytes[0];  // Legal
```

### Recommendations

1. **Guard divisions** with `where` to avoid division by zero
2. **Check array bounds** before indexing with pvars
3. **Avoid circular dependencies** in get/send patterns
4. **Don't nest `where` more than 10 deep** (implementation limit)
5. **Use CRC checks** for critical communication
6. **Test with small processor counts** (e.g., 16) before deploying to 4,096

## The MVP Subset

If you only implement four things, you can still write real programs:

1. **`where` (masking)** - control which processors execute
2. **`nbr(dim, value)` (neighbor exchange)** - move data to adjacent processors
3. **`reduce` and `scan`** - combine values across processors
4. **`get/send` (permutation)** - arbitrary data movement

With these four primitives, you can write:
- Cellular automata (neighbor exchange)
- Image processing (NEWS communication within chips)
- Sorting (scan + permutation)
- Reductions (sum, max, counting)
- Sparse matrix operations (permutation)
- Graph algorithms (routing through hypercube)

The remote-memory primitives (`prs` and `pact`) are the "now we're doing crimes" layer. You can defer those to v0.2.

## Toolchain Architecture

StarC is not a compiler. It's a **source-to-source translator** that rewrites StarC syntax into plain C with runtime library calls.

### Files

```
project/
├── src/
│   ├── algorithm.starc       # Your StarC source
│   └── helpers.starc
├── libstar/
│   ├── runtime.h              # Runtime library header
│   ├── backend_sim/           # Simulator backend (runs on desktop)
│   │   ├── runtime.c
│   │   └── comm_sim.c
│   └── backend_hw/            # Hardware backend (runs on actual nodes)
│       ├── runtime.c
│       ├── comm_tdma.c
│       └── uart_driver.c
└── build/
    ├── algorithm.c            # Generated C code
    └── algorithm.elf          # Compiled binary
```

### Build Pipeline

```
algorithm.starc
    ↓
starc_pp.py (Python preprocessor)
    ↓
algorithm.c (plain C)
    ↓
gcc / riscv-gcc (standard C compiler)
    ↓
algorithm.elf (executable)
```

You compile **twice** with different backends:

1. **Simulator build:** Compile with `backend_sim`, run on your desktop with N virtual processors
2. **Hardware build:** Compile with `backend_hw`, upload to all 4,096 nodes

The simulator is for debugging. Fast iteration. You can run the algorithm with 16 processors on your laptop, step through with gdb, verify correctness. Then compile for hardware and deploy to the actual machine.

### Why Source-to-Source, Not LLVM

You don't need LLVM. You don't need a custom compiler backend. You need a **disciplined rewrite pass** that turns StarC syntax into function calls.

```starc
pvar<int> x;
x = nbr(0, x);
```

becomes:

```c
STAR_PVAR(int, x);
x = star_nbr(0, x, &STAR_CTX);
```

The runtime library (`libstar`) handles everything:
- Maintaining the mask stack
- Coordinating TDMA communication
- Implementing reductions over the hypercube
- Routing messages through dimensions

This approach is **simple** and **reliable**. No yacc. No LLVM IR. No semantic analysis passes. Just controlled text rewriting.

## The Preprocessor

The preprocessor (`starc_pp.py`) is a **tokenizer** that recognizes StarC syntax and rewrites it into C.

### What Gets Rewritten

**Parallel variable declarations:**
```starc
pvar<int> x;
```
becomes:
```c
STAR_PVAR(int, x);
```

**`where` statements:**
```starc
where (x > 100) {
    x = x * 2;
}
```
becomes:
```c
STAR_WHERE_PUSH(x > 100, &STAR_CTX);
{
    x = x * 2;
}
STAR_WHERE_POP(&STAR_CTX);
```

**Communication primitives:**
```starc
y = nbr(0, x);
```
becomes:
```c
y = star_nbr(0, x, &STAR_CTX);
```

### What Stays Plain C

Everything else is normal C:
- Control flow (`if`, `for`, `while`)
- Function definitions
- Struct declarations
- Pointer arithmetic
- Standard library calls

This means StarC programs can use normal C code freely. You can call `malloc`, use `printf` for debugging, include standard headers. StarC is C with extensions, not a completely different language.

### Why Regex Dies Here

A man has a problem. He decides to use regex. Now the man has two problems.

You might think: "I'll just use regex to find `where` keywords and rewrite them."

This works for exactly one week, then you encounter:
```c
char *where = "location";  // Variable named 'where'
printf("where are we?\n");  // String containing 'where'
// where (x > 0) { ... }   // Commented-out where
```

Regex can't distinguish these cases. You need a tokenizer that understands:
- String literals
- Comments
- Keywords vs identifiers
- Block structure

A simple tokenizer is ~200 lines of Python. Fuck your Q-bert swears.

## Runtime Library

The runtime library is where the real work happens. It implements all the StarC primitives on top of the actual hardware (or simulator).

### Mask Stack Management

The runtime maintains a stack of boolean masks. Each `where` statement pushes a mask:

```c
typedef struct {
    bool mask_stack[MAX_DEPTH];
    int  mask_depth;
    int  my_addr;
} star_context_t;

void STAR_WHERE_PUSH(bool condition, star_context_t *ctx) {
    ctx->mask_stack[ctx->mask_depth++] = condition;
}

void STAR_WHERE_POP(star_context_t *ctx) {
    ctx->mask_depth--;
}

bool star_is_active(star_context_t *ctx) {
    for (int i = 0; i < ctx->mask_depth; i++) {
        if (!ctx->mask_stack[i]) return false;
    }
    return true;
}
```

Every operation checks `star_is_active()`. Inactive processors participate in communication (for timing), but don't modify local state.

### `nbr()` Over TDMA

Neighbor exchange maps directly to TDMA phases:

```c
int star_nbr(int dim, int value, star_context_t *ctx) {
    // Calculate neighbor address (XOR)
    int neighbor = ctx->my_addr ^ (1 << dim);
    
    // Determine transmit phase
    bool my_bit = (ctx->my_addr >> dim) & 1;
    int phase = 2 * dim + my_bit;
    
    // Wait for correct phase
    wait_for_phase(phase);
    
    // If I transmit this phase, send
    if (my_bit == 0) {
        uart_send_dim(dim, &value, sizeof(int));
    }
    
    // Wait for opposite phase
    wait_for_phase(phase ^ 1);
    
    // Receive
    int result;
    uart_recv_dim(dim, &result, sizeof(int));
    
    return result;
}
```

The FPGA's TDMA controller handles pin remapping. The runtime just needs to know which phase is active and which UART to use.

### `reduce` and `scan` Tree Algorithms

Reductions happen over a tree spanning the hypercube dimensions:

```c
int star_reduce_sum(int value, star_context_t *ctx) {
    int result = value;
    
    // Tree reduction: combine with neighbor in each dimension
    for (int dim = 0; dim < 12; dim++) {
        int neighbor_value = star_nbr(dim, result, ctx);
        result += neighbor_value;
    }
    
    return result;
}
```

After 12 steps, every processor has the global sum. This works because the hypercube is a spanning tree for any reduction.

Scan is trickier (you need to carefully manage which values propagate up vs down the tree), but the structure is similar.

### `get` and `send` Routing

General permutation requires **dimension-ordered routing**:

```c
int star_get(int source_addr, star_context_t *ctx) {
    int current_addr = ctx->my_addr;
    int data;
    
    if (current_addr == source_addr) {
        // I'm the source, send my data
        data = read_local_memory(source_addr);
    }
    
    // Route through dimensions
    for (int dim = 0; dim < 12; dim++) {
        int delta = current_addr ^ source_addr;
        if (delta & (1 << dim)) {
            // Need to traverse this dimension
            data = star_nbr(dim, data, ctx);
        }
    }
    
    return data;
}
```

Optimizations can batch requests or use smarter routing.

### `prs` and `pact` with Combining

Remote memory with combining is basically `get`/`send` with conflict resolution:

```c
void star_pact(int dest_addr, int value, combiner_t op, star_context_t *ctx) {
    // Route value to destination
    star_send(dest_addr, value, ctx);
    
    // Destination combines all incoming values
    if (ctx->my_addr == dest_addr) {
        int combined = value;
        // Collect from all senders, apply combiner
        // (Implementation depends on knowing how many senders)
        local_memory[dest_addr] = combined;
    }
}
```

The hard part is knowing when all writes have arrived. This requires either a barrier or a count of expected writes.

## Example Programs

### Vector Addition

```starc
pvar<float> A[1024];
pvar<float> B[1024];
pvar<float> C[1024];

for (int i = 0; i < 1024; i++) {
    C[i] = A[i] + B[i];  // Happens on all 4096 processors simultaneously
}
```

This is the simplest data-parallel operation. Every processor adds its local elements of A and B.

### Matrix Multiply (Simplified)

```starc
// Assume 64x64 matrix distributed across processors
pvar<float> A[64];  // My row of A
pvar<float> B[64];  // My column of B
pvar<float> C = 0;

for (int k = 0; k < 64; k++) {
    // Broadcast A[k] within my row
    // Broadcast B[k] within my column
    // (This requires NEWS communication within chips)
    C += A[k] * B[k];
}
```

Full matrix multiply is complex, but this shows the basic structure.

### Parallel Prefix Sum

```starc
pvar<int> x;
// ... initialize x ...

pvar<int> prefix = scan_sum(x);

// Now prefix[i] = sum of x[0..i]
```

One line. The runtime handles the tree communication.

### Bitonic Sort

```starc
pvar<int> key;
// ... initialize keys ...

for (int k = 2; k <= 4096; k *= 2) {
    for (int j = k / 2; j > 0; j /= 2) {
        int partner = pid() ^ j;
        int partner_key = get(partner);
        
        bool ascending = (pid() & k) == 0;
        bool swap = (ascending && key > partner_key) || 
                    (!ascending && key < partner_key);
        
        where (swap) {
            key = partner_key;
        }
    }
}
```

This is a standard bitonic sort, but the compare-exchange happens via `get` and conditional assignment.

### Image Convolution (NEWS)

```starc
// Assume 64x64 image on 64x64 processor grid (one pixel per processor)
pvar<int> pixel;

// 3x3 Gaussian blur
pvar<int> north = news_recv(NORTH);
pvar<int> south = news_recv(SOUTH);
pvar<int> east = news_recv(EAST);
pvar<int> west = news_recv(WEST);

pvar<int> blurred = (pixel * 4 + north + south + east + west) / 8;
```

NEWS communication is a special case of `nbr()` for the 4×4 grid within each chip.

## Comparison to C* and *Lisp

### C* (Thinking Machines C)

C* was the production language for the CM-2. It had:
- `parallel` variables (like `pvar`)
- `where` statements for masking
- Permutation operations (`get`, `send`)
- Virtual processor ratios (map N virtual processors onto M physical)

**What StarC keeps:**
- `pvar` and `where`
- Communication primitives
- Set-centric thinking

**What StarC changes:**
- Simplified syntax (no `parallel` keyword, just `pvar<T>`)
- Explicit topology (hypercube dimensions, not abstract "shapes")
- No virtual processors (at least not in v0.1)

### *Lisp (CM Lisp)

*Lisp (pronounced "star-lisp") was the original CM-1 language. It was Lisp with:
- `xectors` (distributed data)
- `alpha` (parallel map)
- `beta` (parallel reduce)
- Explicit router operations

**What StarC keeps:**
- The xector concept
- Map/reduce style operations

**What StarC changes:**
- C syntax instead of Lisp
- Imperative style instead of functional
- Direct hardware mapping instead of abstraction

StarC is closer to C* than *Lisp, but simpler than both. It's the minimum language needed to program a hypercube without fighting the architecture.

## Current Status

**What works:**
- Preprocessor handles `pvar`, `where`, and primitive calls
- Simulator backend runs on desktop with 16 virtual processors
- `nbr()`, `reduce`, and `scan` work in simulation
- Example programs compile and run

**What's stubbed:**
- Hardware backend (TDMA communication layer)
- `get`/`send` permutation (routing logic exists but untested)
- `prs`/`pact` remote memory
- NEWS communication (needs special handling for 4×4 grids)

**What's planned:**
- Virtual processor ratios (map many VPs onto each physical processor)
- Debugging support (breakpoints, watch expressions)
- Profiling (time spent in each dimension's communication)
- Optimization passes (batch communication, overlap compute and messaging)

## The Point

This machine isn't useful if you can't program it. Building 4,096 processors in a hypercube is impressive, but it's just a curiosity if the only way to use it is hand-writing assembly.

StarC makes the machine programmable. You can write algorithms that actually exploit the architecture:
- Cellular automata that exchange data with neighbors every step
- Matrix operations that broadcast rows and columns
- Sorting that uses the hypercube structure
- Graph algorithms that route messages through dimensions

The goal isn't to build a perfect language. The goal is to build a language that makes the machine useful. StarC does that. It's C with the minimum extensions needed to express hypercube algorithms. The toolchain is simple. The runtime is comprehensible. The examples work.

When you can write a parallel prefix sum in one line, or a bitonic sort in 20 lines, or an image filter that runs on 4,096 processors simultaneously—then the machine stops being a flex and starts being a tool.

And that's the point.

[back to main project page](ThinkinMachine.html)

[main](../)