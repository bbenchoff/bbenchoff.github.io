---
layout: default


---

## Art Installation of Circuit Boards

This was an art installtion for the 2019 Hackaday Conference. It's a wall-sized PCB, with connectors to attach _other_ PCBs, namely <a href="https://hackaday.com/2019/03/20/introducing-the-shitty-add-on-v1-69bis-standard/">Shitty Add-Ons</a>.

![Shitty Add On Wall](/images/SAOwall.jpg)


These Shitty Add-Ons (SAOs) are small PCBs produced conference attendees, and they all needed a place to blink. I created a wall for these SAOs.

The 'wall' is made up of eight panels, with each panel ~800mm on the long side. Connections between the panels are Molex connectors providing 5VDC and Ground. The connectors are ganged together in groups of 10, with a single voltage regulator stepping down the voltage to 3.3V. Electrically, this is the simplest way to do this; most of the connectors are electrically isolated from each other, and a failure in one does not bring down the entire wall. Total current draw at the end of the conference was under 3A @ 5V.

![Power supply](/images/SAOPower.jpg)

Files are available in the [relevant repository](https://github.com/bbenchoff/ShittyWall).

[back](../)
