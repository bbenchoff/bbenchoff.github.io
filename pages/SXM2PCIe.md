---
layout: default

description: Open-source pinout, schematic, and footprint for NVIDIA SXM2 to PCIe adapter.
---

# Reverse Engineering the Nvidia SXM2 Socket

*Want to drop a surplus V100 into a consumer PC?* The missing puzzle piece is a public SXM2 pinout.  Below I document the **full 100 Gb/s-capable pin map, schematic, and KiCad footprint**, all open-source.

**Note: all the files are hosted [in a Github repo](https://github.com/bbenchoff/SXM2toPCIe)**

<p class="callout-sidebar">
<strong>LEGAL NOTICE:</strong><br>
Nvidia’s SXM documentation is only released under mutual NDA. The pinout shown here was derived <strong>solely</strong> from publicly purchased hardware, non-destructive continuity probing, and electrical measurement, which is lawful reverse-engineering under U.S. and many other jurisdictions’ fair use and interoperability exemptions e.g. 17 U.S.C. § 107, 17 U.S.C. § 1201(f), and Directive 2009/24/EC Art. 6. No confidential documents were accessed or breached, and no trademark or trade-secret rights are waived or implied. For concerns regarding copyright or trade secrets, please contact benchoff@gmail.com.
</p>


For another project, it was necessary for me to acquire the pinout for Nvidia's [SXM2 socket](https://en.wikipedia.org/wiki/SXM_(socket)). This is a high-bandwidth mezzanine connector used in Nvidia datacenter GPUs. The SXM2 "standard" is quite old at the time of this writing (mid-2025), but details of this connector, including a pinout or even mechanical drawings, are still locked under NDAs at Nvidia's behest.

Therefore, to get the details on this pinout, I had to do it the old-fashioned way. I had to reverse engineer it.

The basis of this reverse engineering came from a PCIe SXM2 carrier board that can be found on the Chinese parts of the internet. My carrier board is effectively identical to [this carrier board purchased by l4rz](https://l4rz.net/running-nvidia-sxm-gpus-in-consumer-pcs/). It contains everything needed: an SXM2 footprint with a single Amphenol Meg-Array connector, and power is delivered by two 2x3 PCIe power headers. There's some circuitry on the back for a fan PWM controller, but not much else. The NVLink connector -- the second Meg-Array connector -- is not populated, because this card is only meant for a single SXM2 module.

Because of the simplicity of this circuit, it really is __mostly__ only a matter of testing the continuity of all the pins with a multimeter. __Mostly__.

## The Pinout

**__Again, all of the files needed to build your own SXM2 to PCIe adapter are [in a Github repo](https://github.com/bbenchoff/SXM2toPCIe).__**

This is, to the best of my ability, the pinout for an SXM2 module:

![Graphic of the SXM2 pinout](/images/SXM2Pinout.png)

Also in table format:

<!-- ▸▸ SXM2 pin map – drop-in block ▸▸ -->
<style>
/* --- pinout styles (scoped to this post) --- */
.pinout-wrap   {margin:1.5rem 0; font-size:0.9rem;}
.pinout-flex   {display:flex; flex-wrap:wrap; gap:1rem;}
.pinout-table  {border-collapse:collapse; table-layout:fixed;}
.pinout-table caption{font-weight:700; margin-bottom:.25rem;}
.pinout-table th,
.pinout-table td{border:1px solid #444; padding:4px 6px; text-align:center; white-space:nowrap;}
.pinout-table thead th{background:#222; color:#fff; position:sticky; top:0;}
.pinout-table tbody tr:nth-child(even){background:#f7f7f7;}
@media(max-width:600px){.pinout-flex{flex-direction:column;} .pinout-table{font-size:0.8rem;}}
</style>

<details class="pinout-wrap">
<summary><strong>📑 Full SXM2 pin map (40 × 10) – click to view</strong></summary>

<div class="pinout-flex">
<!-- Rows 1-20 -->
<table class="pinout-table">
  <caption>Rows 1 – 20</caption>
  <thead><tr><th>Row</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>G</th><th>H</th><th>J</th><th>K</th></tr></thead>
  <tbody>
    <tr><th>1</th><td>GND</td><td>PERp1</td><td>GND</td><td>PERp2</td><td>GND</td><td>GND</td><td>PETp0</td><td>GND</td><td>PETp2</td><td>GND</td></tr>
    <tr><th>2</th><td>PERp0</td><td>PERn1</td><td>PERp3</td><td>PERn2</td><td>GND</td><td>GND</td><td>PETn0</td><td>PETp1</td><td>PETn2</td><td>PETp3</td></tr>
    <tr><th>3</th><td>PERn0</td><td>GND</td><td>PERn3</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>PETn1</td><td>GND</td><td>PETn3</td></tr>
    <tr><th>4</th><td>GND</td><td>PERp4</td><td>GND</td><td>PERp5</td><td>GND</td><td>GND</td><td>PETp4</td><td>GND</td><td>PETp5</td><td>GND</td></tr>
    <tr><th>5</th><td>PERp7</td><td>PERn4</td><td>PERp6</td><td>PERn5</td><td>GND</td><td>GND</td><td>PETn4</td><td>PETp7</td><td>PETn5</td><td>PETp6</td></tr>
    <tr><th>6</th><td>PERn7</td><td>GND</td><td>PERn6</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>PETn7</td><td>GND</td><td>PETn6</td></tr>
    <tr><th>7</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>REFCLK+</td><td>REFCLK-</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>8</th><td>PERp8</td><td>GND</td><td>PERp10</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>PETp9</td><td>GND</td><td>PETp10</td></tr>
    <tr><th>9</th><td>PERn8</td><td>PERp9</td><td>PERn10</td><td>PERp11</td><td>GND</td><td>GND</td><td>PETp8</td><td>PETn9</td><td>PETp11</td><td>PETn10</td></tr>
    <tr><th>10</th><td>GND</td><td>PERn9</td><td>GND</td><td>PERn11</td><td>GND</td><td>GND</td><td>PETn8</td><td>GND</td><td>PETn11</td><td>GND</td></tr>
    <tr><th>11</th><td>PERp12</td><td>GND</td><td>PERp13</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>PETp12</td><td>GND</td><td>PETp13</td></tr>
    <tr><th>12</th><td>PERn12</td><td>PERp15</td><td>PERn13</td><td>PERp14</td><td>GND</td><td>GND</td><td>PETp15</td><td>PETn12</td><td>PETp14</td><td>PETn13</td></tr>
    <tr><th>13</th><td>GND</td><td>PERn15</td><td>GND</td><td>PERn14</td><td>GND</td><td>GND</td><td>PETn15</td><td>GND</td><td>PETn14</td><td>GND</td></tr>
    <tr><th>14</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>15</th><td>NC</td><td>GND</td><td>NC</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>NC</td><td>GND</td><td>NC</td></tr>
    <tr><th>16</th><td>NC</td><td>NC</td><td>NC</td><td>NC</td><td>GND</td><td>GND</td><td>NC</td><td>NC</td><td>NC</td><td>NC</td></tr>
    <tr><th>17</th><td>GND</td><td>NC</td><td>GND</td><td>NC</td><td>GND</td><td>GND</td><td>NC</td><td>GND</td><td>NC</td><td>GND</td></tr>
    <tr><th>18</th><td>NC</td><td>GND</td><td>NC</td><td>GND</td><td>/PERST</td><td>NC</td><td>GND</td><td>NC</td><td>GND</td><td>Prot/Cathode</td></tr>
    <tr><th>19</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>NC</td><td>GND</td><td>Prot/GND</td></tr>
    <tr><th>20</th><td>NC</td><td>NC</td><td>NC</td><td>NC</td><td>NC</td><td>NC</td><td>NC</td><td>NC</td><td>NC</td><td>NC</td></tr>
  </tbody>
</table>

<!-- Rows 21-40 -->
<table class="pinout-table">
  <caption>Rows 21 – 40</caption>
  <thead><tr><th>Row</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>G</th><th>H</th><th>J</th><th>K</th></tr></thead>
  <tbody>
    <tr><th>21</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>22</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>23</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>24</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>25</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>26</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>27</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>28</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>29</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>30</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>31</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>32</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>33</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>34</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>35</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>36</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>37</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>38</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
    <tr><th>39</th><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td><td>GND</td></tr>
    <tr><th>40</th><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td><td>12V</td></tr>
  </tbody>
</table>
</div>
</details>

## The Temperature Sensor That Wasn't

Apart from the fan controller circuitry on the back of the card, there is one other small piece of active electronics on this card: a mysterious SOT-23-3 component positioned right behind the PCIe Meg-Array connector.

![The Temperature Sensor Chip](/images/TempSensorChip.jpg)
![Schematic of the Temperature Sensor](/images/TempSensorSch.png)

At first glance, the circuit topology was deceiving. An SOT-23-3 package with a 10k pull-up resistor to 3.3V, connected to undocumented SXM2 pins K18 and K19? My initial assumption was a temperature sensor - perhaps an analog output thermistor or similar monitoring device. The pinout seemed to match: power, ground, and output.

The component bears the marking "X06L" with "1F" rotated 90 degrees - a code that doesn't appear in any of the standard SMD marking databases, including smdmarkingcodes.com or LCSC's extensive catalog. Without documentation, I had to resort to reverse engineering.

### Initial testing: it's not a temperature sensor

My first round of testing quickly disproved the temperature sensor theory. With the component powered in-circuit, I subjected it to temperature extremes - ice cubes and hot air at 100°C - with no change in output voltage. What I did discover was far more interesting: the output voltage tracked the input voltage with a consistent ~0.4V drop:

* 2.5V In -> 2.13V Out
* 3.3V In -> 2.93V Out
* 3.9V In -> 3.5V Out

This behavior immediately suggested a diode, not an active component.

### Detailed Characterization

After desoldering the component for thorough testing, I confirmed my suspicions. Diode mode measurements revealed:

* Pin 2 to Pin 3: 0.54V forward drop
* All other pin combinations: Open circuit
* Pin 1: Completely unconnected internally

This is the unmistakable signature of a single diode in an SOT-23-3 package, where pin 1 serves only as a mechanical support. To identify the specific type, I performed a forward voltage vs. current characterization:

| Resistor Value | Measured VF | Calculated Current | Notes |
|----------------|-------------|-------------------|-------|
| 33kΩ           | 0.482V      | 0.085mA          | Very low current |
| 3.3kΩ          | 0.521V      | 0.842mA          | Close to 1mA |
| 680Ω           | 0.549V      | 4.049mA          | ~4mA |
| 330Ω           | 0.563V      | 8.294mA          | ~8mA |
| 150Ω           | 0.576V      | 18.16mA          | ~18mA |

The key observations is a very low forward voltage, highly suggesting a BAT54 series Schottky diode.

These measurements perfectly match the characteristics of a low VF Schottky diode, most likely a BAT54 or equivalent. The "X06L" marking is almost certainly a house code from a Chinese manufacturer for this common jellybean part.

### Circuit Function

The actual circuit is elegantly simple: a Schottky diode drops the 3.3V auxiliary power from the PCIe slot by ~0.4V before feeding it to the SXM2 module's K18 pin. The 10k resistor provides a pull-up to ensure a defined state when unpowered. Without NVIDIA's proprietary SXM2 documentation, the exact purpose remains speculative, but likely candidates include protection, preventing reverse current flow from the GPU module, or signal conditioning, creating a logic level offset for internal monitoring.

For anyone repairing these adapters, a BAT54 Schottky diode in SOT-23-3 package is a perfect replacement. Connect it with the anode to the 10k resistor node and cathode to K18, leaving pin 1 unconnected. The specific variant (BAT54S, BAT54A, etc.) doesn't matter as long as it has similar forward voltage characteristics.

### Finding the correct part

Even though I can characterize this part and infer its function -- as well as make a reasonable copy of it for my own board -- I still can not find a drop-in compatible replacement. The standard BAT54 from Vishay, in SOT-23-3 packaging, has Pin 2 as NC, Pin 1 as the Anode, and Pin 3 as the Cathode. My part has Pin 1 as NC, Pin 2 as the Anode, and Pin 3 as the Cathode. A complete search of Schottkys on LCSC returned no parts that match this configuration. As such, I opted to replace the mystery SOT-23 package with a two-pin SOD-123 package (LCSC Part C549277). The schematic I'm using is below:

![The corrected, reversed engineered 'protection' schematic](/images/SXMProtectionCircuit.png)

If you know this isn't correct or have a better idea, PRs are welcome [on this projet's Github](https://github.com/bbenchoff/SXM2toPCIe).

## The Actual Schematic

After mapping GND, 12V, the PCIe lanes, and the mysterious circuit, there were 32 unconnected pins in the Meg-Array connector, in rows 15 through 20, with the entirety of row 20 being disconnected. This required much more thorough investigations and continuity tracing. The `PERST#` signal was found on E18, but no JTAG or other connections were found.

Interesting things of note: The SMBUS/I2C signals on the PCIe connector are unconnected, as is the JTAG signals. I don't know what to tell you about this, except I know this card works, therefore my reverse engineering attempt should. There is no 3.3V rail from the PCIe card going to the SXM2 socket. Again, your guess is as good as mine. That leaves 31 individual pins in the SXM connector unmapped, or probably unconnected. I do not know where these pins lead, although they probably connect to the __other__ Meg-Array for the NVlLink signals.

Other than the connections from the SXM module to the PCIe card edge, there is another, single connection in between PCIe card pins: The `PRSNT1#` must connect to the farthest `PRSNT2#` pin. Since this is an x16 card, this means pin A1 is connected to pin B81.

The following is the complete schematic, with files also [available on my Github](https://github.com/bbenchoff/SXM2toPCIe):

![The complete schematic](/images/SXMSchematic.png)


## The Mechanical Footprint

Finally, the mechanical part of the build. The actual footprint.

The footprint itself is just two Meg-Array connectors, but one is left unpopulated. Easy enough. The __hard__ part is the mechanical portion. The SXM2 module is fastened to the board with eight individual M3 screws. These are M3 SMD standoffs, soldered to the opposite side of the board. Other than that, it's a standard PCIe x16 card.

![Render of the board, both sides](/images/SXM2Render.png)

Because I don't have a coordinate measuring machine or optical comparator in my pocket, I used a pair of digital calipers to measure the footprint of all the features of the board. By carefully referencing all of the measurements from the SMD M3 standoffs (and between the standoffs themselves), I eventually got the correct footprint. This, surprisingly, worked. All of the features of my SXM2 socket mate with the SXM2 module. You can do a lot with a pair of digital calipers.

![board in KiCad](/images/SXM2Board.png)

All work for this project is [available on my Github](https://github.com/bbenchoff/SXM2toPCIe).

[back](../)
