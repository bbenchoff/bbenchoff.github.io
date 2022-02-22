---
layout: default


---

# 1980 Citicar / Comuta-Car, Restoration

This is an ongoing log of the restoration of a 1980 Comuta-Car, acquired from a Craigslist ad in Fresno.

<a href="https://bbenchoff.github.io/pages/CarPics.html">You can find an image gallery of all the pics here</a>

## Part 0, Acquiring the car

The car was bought [off of Craigslist](/images/Car/Craigslist/Screencap.PNG) in Coarsegold, California, about half an hour north of Fresno. The bill of sale says $200 because eventually this will be in a Lemons rally. Getting it to my SF garage involved driving out to Fresno, picking up a 10' UHaul box truck and car trailer, and bringing it home through Gilroy. 

Tips and tricks for acquiring a Commutacar: [It *barely* fits in the back of a 10-foot UHaul truck](https://bbenchoff.github.io/images/Car/Acquiring/2.jpg). The easiest way to get it home is to rent a 10-foot UHaul, buy some ramps at Harbor Freight, and get three people to push it up into the truck. Without the batteries it only weighs ~700 pounds. No, you don't need a trailer, in fact a citicar does not fit on a the UHaul car trailer because the wheelbase is too narrow.

![Pics from acquiring the car](/images/Car/AcquiringCar.png)

## Part 1, Teardown and I found a motor controller

Week 1 began with getting it up on jack stands. This revealed some [weirdness with the back suspension](https://bbenchoff.github.io/images/Car/Part1/1.png). For some reason, half a leaf spring was bolted to the driver's side suspension. I don't know what's going on there. The [wiring under the dashwas a mess](https://bbenchoff.github.io/images/Car/Part1/5.png), and the 120 Volt input [was highly dangerous](https://twitter.com/BBenchoff/status/1484325182399340554) so that was torn out to be replaced with all new wiring.

During the teardown, I was looking at this weird box right next to the motor. The car still had the original contactors (the old "speed controller"), and I had assumed the previous owner was still trying to use this. Not so, because that weird box [was a brand new motor controller](/images/Car/Part1/7.png). To reiterate, I found an unused motor controller worth $1000 in a car I paid $1000 for. I bought a motor controller and got a free car.

Given the serial number on the unused motor controller, a few parts on the wiring harness, and the oral history of the car from the seller, I think I can put together a reasonably correct history of this car. Sometime after 1993 and before 2000, the car was in Palm Springs where the owner decided a refurbishment was in order. This person had the knowledge to walk into NAPA auto, but not the skills to put those parts together. The last time it was registered was in 2000, after which it was moved to Coarsegold, half an hour north of Fresno. In 2022, I brought it to San Francisco where it is currently undergoing restoration.

![Part 1 Compilation](/images/Car/Part1/Part1.png)

After a few days of reverse-engineering the wiring, we determined the best course of action would be to [tear out all the wires](/images/Car/Part1/8.png) and rebuild the entire electrical system from the ground up. This gave me an oppurtunity to clean out twenty years of detritus in the under-seat compartment. This was a weird, sticky goo that cleaned up with soap and water. I also found a mouse nest inside the ventilation/cooling manifold; this was removed, cleaned in the dishwasher, and reinstalled.

With that done, the project moves onto re-wiring the electrical system. This will be guided in part by the schematics found in the CommtaCar service manual but updated for a modern fuse panel.

## Part 2, Rewiring the dash, or, I know how to hotwire **my** car.

Because the car didn't come with keys -- or rather the last owner couldn't find the keys -- a new ignition switch was in order. The standard ignition switch for the Citicar is a Cole Hersee 9577-BX, in stock at my local O'Reilly Auto for $15.99. The rest of the dash electronics will remain stock, even though I doubt I'll use the charging ammeter on the passenger side of the dash. I'll come up with something for that. Also, I ordered a new lock for the rear hatch, because again, no keys. This was off of Amazon, a 'Disc Tumbler Cam Lock with 7/8" Cylinder'. An inspection behind the door card revealed the door lock will be harder to replace

Rewiring the dash began with simply pulling out _all_ of the old wiring. There was nothing that could be salvaged out of that rat's nest. I ordered a new fuse panel (Eaton / Bussmann 15305-2-2-4) for 10 mini fuses and five SPDT relays. The original wiring used 10 fuses, two DPDT relays, and a blinker module, so everything should work.

Also bought with the fuse panel were a bunch of crimp terminals and various paraphernalia. This was mounted in a new, 3D printed panel [just under the dash](/images/Car/Part2/fusepanel.png). The STLs for the fuse panel [can be found here](https://github.com/bbenchoff/Citicar/tree/main/Fuse%20Panel). 

Because I'm restoring a car in 2022, of course there would be [a shortage of crimp terminals](https://twitter.com/BBenchoff/status/1485104634549071872). There is a 'semiconductor shortage' as I write this, but this doesn't tell the whole truth: we're out of all electronics. The Eaton/Bussmann fuse panel I wanted was out of stock everywhere, so I acquiesced and bought the one with bussed relay contacts. We're out of terminals, and earlier this year I noticed everyone was out of _crystals_. I simply can't buy a 12MHz crystal in the package I need right now. The 'semiconductor shortage' isn't just semiconductors, and it's truly awful.

Wiring the dash started with a new schematic based on the wiring diagram in the Citicar / CommutaCar service manual. The old manual was a confusing joke. The documentation for the turn signal stalk [is a mess](/images/Car/Part2/OldSch.PNG), so I replaced the old turn signal stalk with a new one from a 1977-80 Triumph Spitfire. As a bonus, the high beam switch in the new turn stalk actually works.

With the fuse panel, a new turn signal stalk, a bunch of 14ga wire, and a boatload of connectors, I was ready to rewire the dash. For this, I had to reverse engineer the Citicar service manual schematic, _which was unreadable_. The 'official' Citicar schematic shows all the flasher/relay 'logic' behind the turn signals as happening in a 'Turn Signal Relay Board', which is not documented anywhere. Wires are just _missing_ on the service manual schematic. I had to re-make the schematic. Compare a section of the old and new schematics, both showing the same bits of the entire circuit:

### A comparison between the original service manual schematic, and a schematic done by someone who can draw:

![Compairson between old and my schematic](/images/Car/Part2/SchComp.png)

The difference is stark. The old schematic was unreadable not only because some wires were cut off from many generations of photocopying, but also because a mysterious 'turn signal relay board' that is completely undocumented.

After [a false start](https://twitter.com/ViolenceWorks/status/1493440131448991749) and a few [obviously crossed wires](https://twitter.com/ViolenceWorks/status/1494008660707606529) I was able to get the majority of the dash wiring done. There are a few bits of weirdness to the citicar schematic, though; the headlamps are switched through two switches, the dash switch and the turn stalk. Because of this, only the top position of the dash switch turns on the headlamps, which are then switched through high and low beams with the turn stalk. The 'lower' setting of the dash light switch only activates the running lights, without the headlights. This is _weird_, but I suppose it's DOT compliant, it should be close to what the original wiring should be, and it'll work.

![Part 2 Compilation](/images/Car/Part2/Part2.png)

[With the dash wiring completed](https://twitter.com/ViolenceWorks/status/1494036625461956609), I turn my attention to the power electronics and getting the motor turning. There is also a [soapbox derby](https://www.eventbrite.com/e/sfmomas-soapbox-derby-at-mclaren-park-2022-tickets-265577327937) in town about two months from now, so the goal is to get this thing on the road and compete in the only race this car will ever see. That means fixing the brakes.

![Animated GIF of the tail light](/images/Car/Part2/TailLight.gif)

## Part 3, WTF is a Hesitation Switch?

As noted in Part 1, [this car came with a motor controller](/images/Car/Part1/7.png), a **Curtis 1209-5501** rated for 48V / 450A. While this isn't a newer AC motor controller with regen braking (a future upgrade), it is a __great__ controller built by a company that will rebuild it for $50 if so desired. It should be easy to install, as the controller service manual [shows how everything should be installed](/images/Car/Part3/CurtisControllerDiagram.PNG).

## Body Work

### Paint

![Rendering of possible paint colors](/images/Car/CarColors.png)

### Pop Rivets

The bodywork is made of six monolithic pieces of ABS plastic: the back, two front quarterpanels, two rear quarterpanels, and one gigantic piece forming the front and roof of the car. These are bonded together first with a bit of glue and secondly with pop rivets. _Normal pop rivets won't work_, because the ABS is far too brittle -- in fact, most of the existing major cracks in the body are right where the rivets are.

The manufacturers' solution to this problem was a special type of pop rivet that is softer and expands more than a standard pop rivet. Original, new old stock Citicar rivets are available, but they cost about $0.50 USD each. That's too much. [McMaster-Carr sells these rivets](https://www.mcmaster.com/pop-rivets/blind-rivets-for-soft-materials-6/) for about $0.16 USD each. Here's McMaster's diagram of what they look like installed:

![McMaster Carr Blind Rivet for Soft Material](/images/Car/Rivet.png)

### Door and Window Seals

After acquiring the car, I noticed the door seals had completely rotted away. Inexplicably, the window seals for the back glass were completely intact, and in great condition. From a few forums, I found these were the same seal but could not find a reference to the part number of the seal that had not linkrotted away. The only solution to this problem is to take measurements of the rear window seal and find something similar for the door seals.

[A reasonable facsimile of the original door seals are available in the UK](https://www.sealsdirect.co.uk/shopping.asp?intDepartmentId=68#126)

## Parts and replacements

|Part			|Replacement						|Cost		|
|-----------------------|-------------------------------------------------------|--------------:|
|Rear gas strut 	|Napa / Balkamp BK 8195581				|$28.99		|
|Ignition Switch	|Cole Hersee 9577-BX					|$15.99		|
|Rear Hazard Light	|Peterson Manufacturing V126R Red Clearance Light	|$14.23		|
|Windshield Wiper Blade	|Anco 51-20 / NAPA part number 602050			|$14.37		|
|Turn Signal Stalk	|77-80 Triumph Spitfire / 30968X / LUCAS SQB195		|$36.75		|
|Fuse Panel		|Eaton / Bussmann 15305-2-2-4				|$45.46
|-----------------------|-------------------------------------------------------|---------------|
|			|							|**$119.04**	|


[back](../)
