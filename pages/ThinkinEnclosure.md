---
layout: default
title: "The Enclosure: Mechanical Design and Airflow Analysis"
description: "The 10-inch cube chassis, fan selection, and a first-principles impedance calculation for the card cage."
keywords: ["mechanical engineering", "thermal design", "CFD", "airflow", "Connection Machine"]
author: "Brian Benchoff"
date: 2025-04-18
last_modified_at: 2025-04-18
image: "/images/ConnM/CMSocialCard.png"
---

<style>
.calc-table {
    border-collapse: collapse;
    font-family: monospace;
    font-size: 14px;
    margin: 1rem auto;
    width: 100%;
}
.calc-table th,
.calc-table td {
    border: 1px solid #ddd;
    padding: 6px 10px;
    text-align: center;
}
.calc-table th {
    background-color: #f5f5f5;
    font-weight: bold;
}
.calc-table td:first-child {
    text-align: left;
}
.callout {
    border-left: 4px solid #2563eb;
    background: #f8fafc;
    padding: 0.75rem 1rem;
    margin: 1rem 0;
}
</style>

# The Enclosure: Mechanical Design and Airflow Analysis

The Thinking Machine's chassis is a 10-inch (254mm) aluminum cube. Inside that cube live 16 Slice boards (4,096 compute nodes), one Zynq controller board, a front-panel LED display, and four 92mm fans. The entire machine dissipates a few hundred watts at peak and must stay cool enough to keep the CH32V203s and AG32s well under their commercial-grade junction limits.

This page covers the mechanical design of the enclosure and the airflow analysis that picked the fans. Most hobbyist builds would skip the airflow math, ignore the computational fluid dynamics, and throw a bigger fan at the problem. This machine _does_ computational fluid dynamics, but I can't turn it on until I figure out how to cool the damn machine. So that leaves figuring out the 

The math is worth doing once, both because the card cage turns out to be a genuinely non-trivial airflow system and because the answer informs the grille design — which is the easiest thing to get wrong after the fact.

## The 10-Inch Cube

The chassis is a 254mm × 254mm × 254mm aluminum cube. The dimension is chosen to accommodate the card cage with margin for the controller board, PSU, backplane, and cable routing, while keeping the overall footprint compact enough to sit on a desk alongside a monitor. Sixteen Slice boards stack vertically with a half-inch (12.7mm) pitch, giving a card cage that's ~200mm × 200mm × ~200mm deep.


### Air Pathways

There are three PVC-sheet grilles in the enclosure:

1. **Two side intake grilles** — one on each side face, each 200mm × 200mm.
2. **One rear exhaust grille** — 200mm × 200mm, with the four 92mm fans mounted directly behind it.

Airflow path: **room air → two side grilles (parallel intake)  → through the card cage gaps → fan plenum → rear grille (exhaust) → room**.

Each grille is 0.2mm PVC sheet, sold on Amazon as "PVC Dustproof Magnetic Dust Filter Cover, PC Mesh Grill with Magnetic Frame Strip Computer Cooler Fan Dust Filter for Computer PC Case, Black". It's 0.15mm thick with 1mm diameter holes on a hexagonal pattern: 1.75mm row spacing, adjacent rows offset by half a pitch. This is the standard staggered perforation pattern that gives the highest open-area ratio for a given hole size and web thickness.

<div class="callout">
<strong>Geometric note:</strong> Four 92mm fans arranged in a 2×2 block occupy a 184×184mm footprint, which fits comfortably inside the 200×200mm rear grille with ~8mm of margin per side. There's no contraction loss to worry about in the fan plenum — the fan face and the grille face are essentially coplanar and coincident. The rear grille's only job is dust filtration and finger protection; the impedance it adds is a consequence of the 30% open-area ratio of the PVC, not of any geometric mismatch with the fan array.
</div>

## Fan Selection

The baseline choice was the **Noctua NF-A9 PWM** (46 CFM free-air, 2.3 mmH₂O static pressure, 1.2W). The Noctua is the standard aspirational choice for any quiet electronics enclosure — it's whisper-silent at full duty, draws almost no power, and has a 150,000-hour MTBF. Four of them would have been quieter than a laptop.

The problem became apparent when calculating the system impedance (below): the card cage + perforated-PVC grilles present about 40 Pa of pressure drop at the operating point. A single Noctua can produce at most 22.6 Pa. Four Noctuas *in parallel* can still only produce 22.6 Pa — parallel fans add CFM, not static pressure. The Noctua was being asked to push against more pressure than its curve could deliver at its natural quiet-operating RPM.

The replacement is the **Sanyo Denki San Ace 9GA0912P4G001** (62 CFM, 7.8 mmH₂O, 14.76W). The 9GA has 3.4× the static pressure headroom of the Noctua and 35% more CFM. This buys robust operation at low PWM duty — the whole point is to run the fans quiet under typical load and only scream on boot or during thermal excursions.

The tradeoff is well-documented by the spec sheet and under-documented by the spec sheet at the same time:

<div class="callout">
<strong>A brief lived-experience note on the San Ace:</strong> the spec sheet really does not prepare you for it. "50 dBA" is a number on a page; spinning one up on the bench is a different category of experience. A single 9GA at full duty is a shop-vac — four of them in a sealed aluminum chassis is not something you want to sit next to without hearing protection.

The saving grace is that at <strong>10% PWM duty the 9GA is entirely tolerable</strong>, and bench testing shows that 10% through the card cage still provides more than sufficient airflow. The fan has enormous headroom; idle operation uses almost none of it. This is actually better than it sounds, because the PL-enforced fail-safe — fans default to 100% until the R5 PID loop takes over — turns boot into a piece of theater. Power on, all four 9GAs immediately scream up to full duty like a jet on the apron, and then within a second or two of the R5 coming alive, the PID loop drops them to 10% and the room goes quiet. It's an inadvertently great demo moment: the machine announces itself, then settles.
</div>

## Airflow Analysis from First Principles

The system has three impedance components in series/parallel:
1. Two side intake grilles (parallel — each sees half of total flow)
2. The card cage itself (16 parallel channels between Slice boards)
3. The rear exhaust grille (series — sees full flow)

The goal is to find the operating point: the intersection of the fan curve (ΔP vs Q, from the manufacturer datasheet) and the system curve (ΔP vs Q, calculated from geometry). That intersection tells you how much air actually moves at full fan duty.

**Air properties at 25°C:** ρ = 1.184 kg/m³, ν = 1.56 × 10⁻⁵ m²/s.

### 1. Card cage impedance

The card cage is 16 Slice boards at 12.7mm pitch, leaving ~8mm clear gaps between boards (accounting for PCB thickness and component height). Each gap is a rectangular channel 8mm × 200mm, 200mm deep in the flow direction. Sixteen of these channels run in parallel, sharing the total flow.

Hydraulic diameter of each channel:

D_h = 2·h·w / (h + w) = 2 × 0.008 × 0.2 / (0.008 + 0.2) = **15.4 mm**

Total parallel cross-section: A_cage = 16 × 0.008 × 0.2 = **0.0256 m²**

At a trial flow Q = 0.2 m³/s (roughly 420 CFM), per-gap velocity v = 7.8 m/s. Reynolds number:

Re = v·D_h / ν = 7.8 × 0.0154 / 1.56e-5 = **7,680** (turbulent)

Blasius friction factor for smooth duct at this Re:

f = 0.316 · Re⁻⁰·²⁵ ≈ **0.034**

Friction pressure drop for each channel:

ΔP_friction = f · (L/D_h) · (ρv²/2) = 0.034 × (0.2/0.0154) × (1.184 × 60.8 / 2) = **16 Pa**

Plus entrance and exit minor losses (K ≈ 1.5 combined for abrupt entry + abrupt expansion at exit):

ΔP_minor = 1.5 × (ρv²/2) = 1.5 × 36 = **54 Pa**

Total cage drop at Q = 0.2 m³/s: **~70 Pa**.

Since turbulent losses scale as v² and v scales with Q, the cage impedance is quadratic in Q:

**ΔP_cage(Q) ≈ 1,750 · Q²** (Pa, Q in m³/s)

### 2. Grille impedance

The perforated PVC grilles are thin-plate orifices. Open-area ratio first:

Hex pattern, 1.75mm nearest-neighbor spacing, 1mm hole diameter:
- Unit cell area per hole = p² × √3/2 = 3.0625 × 0.866 = **2.65 mm²**
- Hole area = π × 0.25 = **0.785 mm²**
- **β = 0.296 ≈ 30% open**

For thin-plate orifices (t/d = 0.2 for this grille), the vena contracta is not recovered and the discharge coefficient is **Cd ≈ 0.63** (sharp-edged orifice regime).

The standard orifice equation, rearranged for ΔP as a function of volumetric flow through the grille:

ΔP_grille(Q) = (Q / (Cd · A_hole))² · ρ/2 · (1 − β²)

For each 200×200 grille:
- A_face = 0.04 m²
- A_hole = β · A_face = 0.012 m²
- Cd · A_hole = 0.63 × 0.012 = 0.00756 m²
- ρ(1−β²)/2 = 1.184 × 0.912 / 2 = 0.540

**k_grille = 0.540 / 0.00756² = 9,425 Pa·s²/m⁶** per grille.

Side grilles are in parallel; each sees Q/2, so the effective impedance seen by the total flow Q is:

ΔP_sides(Q) = 9,425 · (Q/2)² = **2,356 · Q²**

The rear grille is in series with the fans and sees the full Q:

ΔP_rear(Q) = **9,425 · Q²**

### 3. Operating point

Total system curve:

**ΔP_sys(Q) = (2,356 + 1,750 + 9,425) · Q² = 13,531 · Q²**

Fan curve, four San Ace 9GAs in parallel (linearized). Parallel fans add CFM capacity but not static pressure, so Q_free = 4 × 62 = 248 CFM = 0.117 m³/s, ΔP_max = 76.5 Pa:

ΔP_fan(Q) = 76.5 · (1 − Q/0.117) = 76.5 − 654 · Q  (Pa)

Set equal:

13,531·Q² + 654·Q − 76.5 = 0

Quadratic solution: Q = **0.0548 m³/s = 116 CFM**, at **ΔP = 41 Pa (4.1 mmH₂O)**.

### Impedance breakdown at operating point

<table class="calc-table">
<tr><th>Component</th><th>ΔP contribution</th><th>% of total</th></tr>
<tr><td>Side grilles (parallel, Q/2 each)</td><td>7.1 Pa total</td><td>17%</td></tr>
<tr><td>Card cage (16 parallel gaps)</td><td>5.3 Pa</td><td>13%</td></tr>
<tr><td>Rear grille (full Q)</td><td>28.3 Pa</td><td>70%</td></tr>
<tr><td><strong>System total</strong></td><td><strong>40.6 Pa</strong></td><td>100%</td></tr>
</table>

**The rear grille eats 70% of the impedance.** The card cage — which you might intuitively expect to be the dominant restriction, given 16 parallel 8mm channels — is only 13% of the loss. This is counter-intuitive but correct: a cage with 16 parallel channels has a large total cross-section (256 cm²), while a single grille has only a small open area (120 cm² through the holes). The rear grille is physically the smallest aperture in the system.

Note the fraction of free-air capacity actually being delivered: 116 CFM out of 248 CFM rated = 47%. Parallel fans don't scale linearly against a fixed system curve, so going from four fans to ten would only push the operating point to ~140 CFM, not 4× higher. The impedance dominates. Picking four fans is the right call: you get most of the airflow that ten fans would deliver, at 40% of the power and 4 dB less noise.

## Thermal Consequences

At the operating point (116 CFM), the mass flow is 0.065 kg/s. For air at constant pressure, the cooling capacity as a function of allowable temperature rise is:

Q_cool = ṁ · c_p · ΔT = 0.065 × 1005 × ΔT

For a 400W peak heat load:

ΔT = 400 / (0.065 × 1005) = **6.1°C**

That's a 23°C intake to 29°C exhaust. Cards live in ~26°C air on average. Completely within every silicon-grade device's operating range.

Scaling with PWM duty (fan affinity laws: Q ∝ N, ΔP_max ∝ N²; operating point moves linearly along the system curve with RPM fraction):

<table class="calc-table">
<tr><th>PWM duty</th><th>Est. RPM</th><th>CFM</th><th>ΔT @ 400W peak</th><th>ΔT @ 200W typical</th></tr>
<tr><td>100%</td><td>100%</td><td>116</td><td>6°C</td><td>3°C</td></tr>
<tr><td>50%</td><td>55%</td><td>64</td><td>11°C</td><td>5.5°C</td></tr>
<tr><td>30%</td><td>35%</td><td>41</td><td>17°C</td><td>8.5°C</td></tr>
<tr><td>10%</td><td>25% (min startup)</td><td>29</td><td>24°C</td><td>12°C</td></tr>
</table>

10% PWM is fine for typical 200W-ish load. At sustained 400W peak with fans pinned to 10%, the exhaust would hit 47°C — warm but not dangerous. In practice the R5 PID loop spins fans up to 20–30% under real compute load, which keeps the machine in the 6–11°C rise regime.

## Why Not Noctuas? The Static Pressure Argument

Running the same calculation with four Noctua NF-A9 PWM (46 CFM each, 22.6 Pa max). Q_free = 4 × 46 = 184 CFM = 0.0868 m³/s:

ΔP_fan(Q) = 22.6 · (1 − Q/0.0868) = 22.6 − 260 · Q

13,531·Q² + 260·Q − 22.6 = 0 → **Q = 69 CFM at 17 Pa**

<table class="calc-table">
<tr><th>PWM duty</th><th>Noctua CFM</th><th>ΔT @ 400W</th><th>Sanyo CFM</th><th>ΔT @ 400W</th></tr>
<tr><td>100%</td><td>69</td><td>10°C</td><td>116</td><td>6°C</td></tr>
<tr><td>50%</td><td>38</td><td>19°C</td><td>64</td><td>11°C</td></tr>
<tr><td>30%</td><td>24</td><td>30°C</td><td>41</td><td>17°C</td></tr>
<tr><td>10%</td><td>17</td><td>42°C</td><td>29</td><td>24°C</td></tr>
</table>

The Noctuas *would have worked* under typical load. At 100% duty they deliver enough airflow for a 10°C rise at peak — acceptable if tight. The problem is the low-duty behavior.

**Static pressure scales as RPM². At 25% RPM, a Noctua produces only 1.4 Pa of head.** The system impedance at that flow is ~15 Pa. The fan can't overcome the grille + cage, so it effectively stalls against the backpressure — rotating but not moving meaningful air. You can't actually run a Noctua-based system at "quiet idle" through this chassis; you'd need to hold the fans at ≥40% PWM just to maintain flow, which is in the Noctua's natural whisper-quiet regime anyway.

The Sanyo at 25% RPM still produces 4.8 Pa of head, which is enough to overcome the cage+grille and keep ~29 CFM of real flow moving. That's the single reason to accept the noise, power, and reliability penalty of the 9GA: **static pressure headroom at low duty**.

Quantifying the tradeoff:

<table class="calc-table">
<tr><th></th><th>Noctua NF-A9 × 4</th><th>Sanyo 9GA × 4</th></tr>
<tr><td>Noise (full duty)</td><td>~28 dBA</td><td>~56 dBA</td></tr>
<tr><td>Power (full duty)</td><td>4.8 W</td><td>59 W</td></tr>
<tr><td>MTBF</td><td>150,000 hr</td><td>70,000 hr</td></tr>
<tr><td>Peak CFM (free-air)</td><td>184</td><td>248</td></tr>
<tr><td>Operating-point CFM</td><td>69</td><td>116</td></tr>
<tr><td>Low-duty usable?</td><td>No — stalls &lt; 40% PWM</td><td>Yes — works at 10% PWM</td></tr>
<tr><td>Boot-theater moment</td><td>None</td><td>Spectacular</td></tr>
</table>

## Easy Wins and Future Changes

### Enlarge the rear grille

The rear grille dominates the impedance because it's the smallest aperture in the system. Enlarging it to 254×254mm (full back panel) would increase face area by 1.6× and drop its k by (1/1.6)² = 0.39. That's the equivalent of going to 50% open area without touching the hole pattern.

Projected operating point with 254×254 rear grille: **~140 CFM**, ~20% improvement. Roughly 2°C lower ΔT at every duty cycle. Nice but not transformative — the 200×200 grille is already good enough given the thermal margin.

### Open the hole pattern

Going from 30% open to 50% open (1mm holes on 1.35mm hex pitch, or 1.3mm holes on 1.75mm pitch) would drop the rear grille k from 9,425 to ~2,800. Combined with the larger face area, operating point would approach 165 CFM.

Practical constraint: webs between holes get thin. At 30% open (current), webs are 0.75mm. At 50% open with the tighter pitch, webs are 0.35–0.45mm, which is structurally marginal for 0.2mm PVC. Thermal cycling would warp it; fan pressure pulses would induce buzz. 40% open (1.55mm pitch, 1mm holes, 0.55mm webs) is a reasonable compromise.

### Don't bother with thermal CFD

The temptation with a machine like this is to run a CFD simulation of the full chassis. It's not worth the time. The thermal margin is so large that any plausible geometry gives a ΔT of 3–10°C at peak. CFD would add 0.5°C of precision to an answer that's already "obviously fine."

The impedance calculation above is the valuable model. It takes an afternoon on paper, gets within 25% of reality, and tells you the one thing CFD can't easily tell you: which aperture is the bottleneck, and how much the operating point changes if you fix it. A $40 differential manometer clipped across the chassis after assembly will validate the number to within 20% of the prediction, and the fix — if needed — is to enlarge a grille.

## Build Summary

- **Chassis:** 254mm aluminum cube, matte black finish, interior chassis rails for card-cage standoffs and fan mounts.
- **Grilles:** 0.2mm laser-cut PVC, 1mm holes on 1.75mm hex pitch, 30% open area. Two on the side intakes, one on the rear exhaust. Rear grille sized at 200×200mm in current revision; 254×254mm recommended for next revision.
- **Fans:** Four Sanyo Denki San Ace 9GA0912P4G001 (92×92×25mm, 62 CFM, 7.8 mmH₂O, 14.76W each). Arranged in a 2×2 block directly behind the rear grille. Total fan power: 59W at full duty.
- **Fan control:** 4-pin PWM driven by the Zynq PL fabric, with tachometer feedback to the R5 BMC for PID control and fail-safe (100% duty on thermal fault or kernel hang).
- **Operating point:** 116 CFM through the card cage at 100% duty; 29 CFM at 10% duty.
- **Thermal headroom:** 6°C rise at 400W peak at 100% duty. 12–24°C rise at 10% duty depending on compute load.
- **Noise floor:** ~56 dBA at full tilt (shop-vac territory); tolerable at ≤ 30% PWM.

The machine is not going to cook. At 100% duty the air inside the chassis is replaced every ~300 ms — faster than convection can set up a thermal gradient. You're not cooling by airflow at that point, you're cooling by forced mixing, and the internal air temperature is functionally the intake air temperature plus a few degrees, regardless of what the silicon is doing.
