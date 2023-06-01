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

Because the car didn't come with keys -- or rather the last owner couldn't find the keys -- a new ignition switch was in order. The standard ignition switch for the Citicar is a Cole Herse 9577-BX, in stock at my local O'Reilly Auto for $15.99. The rest of the dash electronics will remain stock, even though I doubt I'll use the charging ammeter on the passenger side of the dash. I'll come up with something for that. Also, I ordered a new lock for the rear hatch, because again, no keys. This was off of Amazon, a 'Disc Tumbler Cam Lock with 7/8" Cylinder'. An inspection behind the door card revealed the door lock will be harder to replace

Rewiring the dash began with simply pulling out _all_ of the old wiring. There was nothing that could be salvaged out of that rat's nest. I ordered a new fuse panel (Eaton / Bussmann 15305-2-2-4) for 10 mini fuses and five SPDT relays. The original wiring used 10 fuses, two DPDT relays, and a blinker module, so everything should work.

Also bought with the fuse panel were a bunch of crimp terminals and various paraphernalia. This was mounted in a new, 3D printed panel [just under the dash](/images/Car/Part2/fusepanel.png). The STLs for the fuse panel [can be found here](https://github.com/bbenchoff/Citicar/tree/main/Fuse%20Panel). 

Because I'm restoring a car in 2022, of course there would be [a shortage of crimp terminals](https://twitter.com/BBenchoff/status/1485104634549071872). There is a 'semiconductor shortage' as I write this, but this doesn't tell the whole truth: we're out of all electronics. The Eaton/Bussmann fuse panel I wanted was out of stock everywhere, so I acquiesced and bought the one with bussed relay contacts. We're out of terminals, and earlier this year I noticed everyone was out of _crystals_. I simply can't buy a 12MHz crystal in the package I need right now. The 'semiconductor shortage' isn't just semiconductors, and it's truly awful.

Wiring the dash started with a new schematic based on the wiring diagram in the Citicar / CommutaCar service manual. The old manual was a confusing joke. The documentation for the turn signal stalk [is a mess](/images/Car/Part2/OldSch.PNG), so I replaced the old turn signal stalk with a new one from a 1977-80 Triumph Spitfire. As a bonus, the high beam switch in the new turn stalk actually works.

With the fuse panel, a new turn signal stalk, a bunch of 14ga wire, and a boatload of connectors, I was ready to rewire the dash. For this, I had to reverse engineer the Citicar service manual schematic, _which was unreadable_. The 'official' Citicar schematic shows all the flasher/relay 'logic' behind the turn signals as happening in a 'Turn Signal Relay Board', which is not documented anywhere. Wires are just _missing_ on the service manual schematic. I had to re-make the schematic. Compare a section of the old and new schematics, both showing the same bits of the entire circuit:

### A comparison between the original service manual schematic, and a schematic done by someone who can draw:

![Compairson between old and my schematic](/images/Car/Part2/SchComp.png)

The difference is stark. The old schematic was unreadable not only because some wires were cut off from many generations of photocopying, but also because a mysterious 'turn signal relay board' that is completely undocumented.

After [a false start](https://twitter.com/ViolenceWorks/status/1493440131448991749) and a few [obviously crossed wires](https://twitter.com/ViolenceWorks/status/1494008660707606529) I was able to get the majority of the dash wiring done. There are a few bits of weirdness to the citicar schematic, though; the headlamps are switched through two switches, the dash switch and the turn stalk. Because of this, only the top position of the dash switch turns on the headlamps, which are then switched through high and low beams with the turn stalk. The 'lower' setting of the dash light switch only activates the running lights, without the headlights. This is _weird_, but I suppose it's DOT compliant, it should be close to what the original wiring should be, and it'll work.

![Part 2 Compilation](/images/Car/Part2/TailLightComp.gif)

[With the dash wiring completed](https://twitter.com/ViolenceWorks/status/1494036625461956609), I turn my attention to the power electronics and getting the motor turning. There is also a [soapbox derby](https://www.eventbrite.com/e/sfmomas-soapbox-derby-at-mclaren-park-2022-tickets-265577327937) in town about two months from now, so the goal is to get this thing on the road and compete in the only race this car will ever see. That means fixing the brakes.

## Part 3, Motor Controller Replacement

With the 12V electronics complete, the goal now is to take the car out for a drive around the block, or take it to [Ocean Beach Cars and Coffee](https://norcalcarculture.com/events/ocean-beach-cars-and-coffee/) on the last Sunday of the month. This means working on the high power side of the electronics, and figuring out how the motor controller works.

As noted in Part 1, [this car came with a motor controller](/images/Car/Part1/7.png), a **Curtis 1209-5501** rated for 48V / 450A. Taking notes from the manual for this controller, I [finished the schematic](/images/Car/Part3/tinysch.png) and wired [the whole thing up](/images/Car/Part3/Batteryboxwired.png). Additionally, because I didn't want to deal with the old forward/reverse contactor (it was chooched), I purchased a new F/R contactor off of eBay for $100.

After [wiring everything up according to the controller manual](/images/Car/Part3/CurtisControllerDiagram.PNG), I turned everything on, and.... nothing. The motor didn't spin, and following the troubleshooting steps in the controller manual discovered the controller was faulty. I could have the controller rebuilt for $450, but [another used controller is available on eBay for $200](/images/Car/Part3/ebaycontroller.png). This "new" controller is a slight upgrade over the controller that came with the car -- the eBay controller goes up to 72V. Judging from a few Citicar message board threads and the fact I live in the hilliest city in America, this should be a welcome upgrade.

![The remanufactured controller](/images/Car/Part3/RefurbController.png)

The problem is, when I got the new 72V controller, it didn't work either. I now had two broken motor controllers, and a great lesson on how expensive thrift is. After sending the new controller out for a rebuild for $450, but after that, I had [a working controller](https://twitter.com/ViolenceWorks/status/1511137439137492992). Having a working motor is another story entirely, as covered in Part 5. 

## Part 4, Body repair, bumpers and cosmetic issues

Note this part was done in parallel with parts three and five. The motor and controller is taking a long time to figure out.

When I acquired the car, the body was by no means perfect. No Citicar is; the entire chassis is an aluminum tube frame clad with exactly six ABS plastic panels: four quarter panels, a back panel, and a huge plastic panel for the front and top of the car. All Citicars have at least one large crack next to the windshield, caused by decades of expansion and contraction. Mine has several more cracks, the most notable on the back top corners, with several other major gashes around the car. There are also missing pieces of panels -- on the driver's rear quarterpanel, most of the bottom is missing, and the 'vent' was completely cracked off. The remaining pieces were saved by the previous owner, and I think I've figured out the best way to repair them.

![repaired body panel](/images/Car/Part4/BodyPanelRepair.png)

Since the body panels are ABS plastic, conventional wisdom says acetone is the best solvent to join panels back together. Chemistry says something else, and the ingredients of most ABS 'glue' are 10 parts MEK with one part acetone. The thinking, I think, is the acetone bonds the parts quickly, while the much stronger MEK takes a few days to fully cure. I'm looking for strength, so that's what I went with. To fill any holes in the body, I've come up with a technique that uses plastic welding (a soldering iron and ABS 3D printer filament) with this MEK/acetone solvent. After slightly melting some filament to the body panel, I apply the solvent and let it cure. Sand a few days later and repeat. It is not fast, but there really are no other solutions for fixing a huge plastic panel like this. While the [repaired driver's quarterpanel](/images/Car/Part4/DriverQuarter.png) isn't much to look at now, the entire car will eventually be sanded and painted.

### Oh the bumpers 

While the Citicar had small bumpers made of a piece of wood wrapped in closed-cell foam, the later Commuta-Cars had large protruding bumpers on the front and rear. Despite conventional wisdom, these were not 1970s safety regulation bumpers, at least not the way you would think. Commutacar models added several aluminum beams underneath the seat for rigity and ostensibly impact resistance (lol), and this took up valuable battery space. Instead of putting the batteries under the seat, they had to go somewhere else, and that place was a box under extended bumpers. I'm using fewer batteries, and have wired up all of the high-power electronics under the seat, so these extended bumper battery boxes need to go. They're ugly. Also the closed-cell foam has degraded over the past 40 years and now bare wood is showing.

There are [several references](http://evalbum.com/tech/comutacar/bumper.html) to replacing Citicar bumpers with the bumper from a Mk1 VW Rabbit, and even some references to replacing the bumper on a Commuta-car with a bumper from a Dodge Omni / Plymouth Horizon. I'm going with VW Rabbit bumpers. Both the bumpers need to be from the rear of a Rabbit -- the front bumper has a slight curve to it, whereas the rear bumper will lay flat against the body.

[The ugly front bumper was removed](/images/Car/Part4/AllCombined.png), and is attached to the frame of the car with a large 4"x3" aluminum angle, 0.25" thick. The original mounting for the VW bumper is with a pair of carriage bolts on each end - this will mount the bumper to the aluminum angle. This aluminum angle is mounted to the car using the same holes as the battery box. Unfortunately, mounting the aluminum angle using the same holes as the old bumper will not work -- there simply isn't enough space to turn a wrench. Mounting the bumper in this fashion will be much easier to disassemble in the future while allowing a cut-down battery box to be used, giving the car extended range.

While the bumper and aluminum bracket work wonderfully, the stock endcaps for the VW bumper do not. They stick out down the length of the car, and they're far too massive. I modeled new bumper endcaps in Fusion360 and printed them out in PLA. They will eventually be painted in PlastiDip spray, but even as bare gray PLA they still look great.

<img src="/images/Car/Part4/BumperEndcap.gif" alt="the endcap in Fusion360" height="400"><img src="/images/Car/Part4/BumperEndcapPic.jpg" alt="The finished endcap" height="400">

## Part 5, The Motor Is Broken, or, Barely Getting Out Of The Garage

With the new controller tested and confirmed working, I still couldn't get the motor to turn. I tested _everything_, including the forward/reverse contactor, and everything checked out. The problem had to be the motor itself, and opening the little rubber doors on the motor confirmed this assumption. The brushes for the motor were chooched. Two out of the four brushes were disconnected from their lead wires:

![A broken brush](/images/Car/Part5/ChoochedBrushes.png)

I had two options: replace the brushes ($40) and hope everything else is okay, or replace the entire motor (~$700). Replacing the brushes is much cheaper, but by replacing the motor I could get the power I eventually wanted (about 15HP, up from 6HP in the stock motor).

After pulling the motor out, I had some idea of what the [motor mount and spline looked like](/images/Car/Part5/MotorMountPlate.png). At least now the motor is easy to work on and I can assess my replacement options.

![Motor Teardown](/images/Car/Part5/MotorTeardown.png)

The [new brushes](/images/Car/Part5/MotorBrushes.png) were installed (0.5" x 0.625" x 1.437" carbon brushes, part number 10-506221), and I bolted the motor back onto the diff. Wired everything up again, and..... nothing. Not a damn thing. The controller was confirmed working with the 'motor tester menorah', and the motor was confirmed working by wiring it up [directly to the battery](https://twitter.com/ViolenceWorks/status/1514020800919379969). Hey, at least the new brushes worked. This only meant the forward/reverse contactor as being the problem, which is odd because I can hear it clicking when changing directions on the dash. [Turns out this wasn't sufficient](https://twitter.com/ViolenceWorks/status/1514068438141964290), and I needed a 12V F/R contactor.

A hundred bucks later, and I had a forward/reverse contactor with a 12V coil voltage. The wheels spun, I dropped it down off the jacks, and the car barely inched along. There simply wasn't enough current going to the motor. The car _moved_ and I was able to pull it out of my garage and into the driveway, but there was simply no power. I knew I would need to replace the tires and work on the brakes, so that's the next project. In the meantime, here's proof the car actually got out of the garage:

![The car out of the garage](/images/Car/Part5/ActuallyDrove.jpg)


## Part 6, Tires and Brakes, Brushes and Diffs

The car needed new tires, and there are several options. Citi/Commutacars came with either 480x12, 125/80R12, or 135/80R13 tires, with the tires on mine being 480x12. I found a [20-year old site](https://web.archive.org/web/20220417181505/http://www.scotthull.us/dp/ev/c-carupg.htm) (that's a link to the Internet Archive, you'll thank me later) detailing the possible replacements, and decided to go with the stock solution -- 480x12 tires meant for boat and motorcycle trailers for $150 on Amazon. Yes, the plan is to *eventually* put some nice radials on the car, [possibly even whitewalls](https://twitter.com/ViolenceWorks/status/1515750693553913856), but for now cheap trailer tires will do. Get some valve stems, buy the Ryobi tire pump, and things should go easily. I'll also need to clean and paint the rims and let them sit for a week or so.

Brakes are another matter. While the car nominally came with tires that hold air, it did not come with brakes that work. It did, however, come with a brake drum in the big box 'o parts, and after pulling off the front passenger wheel, I figured out why: [the car did not come with an extra brake drum](https://twitter.com/ViolenceWorks/status/1516608824693587971). When I bought the car, there was no drum on the front passenger brake, and the wheel had three random washers on the studs. This is sketch as fuck.

After draining and bleeding the brake lines, 'squishy' brakes persisted. This problem was eventually identified as a leaky seals on the brake cylinders. The brake cylinder / spider assembly is a Bendix 3203010, and the [torque spider repair kit](https://www.vintagegolfcartparts.com/Item/CU_TrqSpdrReparKit) (BK33-190, EZ 13959-G1) runs about $80. That's for one wheel, and I might as well replace the seals and boots on the other rear wheel while I'm at it. The bleeder screws were replaced (NAPA UP 6446), along with one [torque spider assembly](https://www.vintagegolfcartparts.com/Item/CU_TrqSpiderAssy) (OEM Part number CU 824829, 886875) that had a stripped bleeder screw thread. I'd like to emphesize the brakes are almost entirely rebuilt, with the exception of the master cylinder. The master cylinder works, though, so I think we're good.

![Cleaned rear brake drum](/images/Car/Part6/BrakeClean.png)

The below pic is the disassembled parts of the rear brake drum. Note the pic of the seals -- one is very oblong, this was the seal that was leaking.

![rear brake disassembly, inspection of seals](/images/Car/Part6/brakepartsseals.png)![a blown seal](/images/Car/Part6/blownseal.jpg)

With new seals on the rear wheels, squishy brakes persisted. On further inspection, the seal on the front passenger brake was leaking. Fixing this was a bit trickier; either through decades of decay or my misapplication of torque, the threads for the bleeder valve were partially stripped. I bought a new torque spider for the front passenger brake, and with that bolted on the brakes worked like new. While I'm not impressed with the 'one man' vacuum brake bleeder I have (the girlfriend had to stomp on the brakes while I went around bleeding everything), the brakes now work. In total, the brakes on the car took about a month, with most of that waiting for various tools and parts to arrive. That's not a problem -- now my garage has a few more tools, and I know how to build more brake lines. 


## Part 7, Body off restoration

As noted above, the car came to me with a few broken panels. The Driver's rear quarterpanel was the worst, with a broken vent and a few other pieces broken off. These broken parts came with the car, and I was able to reattach and reinforce them. No problem, really.

However, the car also had many cracks in the body panels. There are cracks along the windshield, just like every other citicar on the planet, there are cracks on the roof, and the top driver's side corner of the rear panel is very broken. All of these cracks can not be easily fixed with the body panels on the car. Additionally, the 'foam' (or whatever it is) around the aluminum space frame has degraded into sticky dust, and I'd like to get that off. And I want to re-paint this thing. The solution to all these problems can be solved by pulling the body panels off the car. I have never seen this done and the plastic is extremely brittle.

In preperation for this, I made replicas of the decals on the citicar. These will eventually be recreated with a vinyl cutter and transfer paper:

![car graphics](/images/Car/Part7/CiticarBodyGraphics.png)

<hr>

## Gauge Cluster & New Dashboard

Eventually, the car will need a new dashboard. The reasoning for this is simply my upgrades are incompatable with the various indicators and gauges on the stock dashboard. For example, the speedometer connects to the motor through a very long cable, this will be eliminated when upgrading to an AC motor. I can not view the charge state of the battery with the existing gauges, and I really don't like the existing hazard switch -- that should be a 'normal' red triangle switch.

<img src="/images/Car/GaugeCluster/LEDBezel.png" alt="Gauge Cluster Assembly" height="400">

So I need a new gauge cluster. I'd like a 'digital' dash. My plan is a LED array, functioning as sort of a multifunction panel. The display is an 18x39 array of 3mm red LEDs -- this high enough resolution for a speedometer, indicator lights, and has the ability to display messages, albeit in excessively large scrolling letters. The gigantic LED array also fits with the aesthetic of the Citicar. It's futuristic for the 1970s and could have been manufactured at the time. The rest of the electronics will be an ARM microprocessor and a CAN transceiver at the bare minimum, able to communicate with the rest of the components in the car.

This was not my first attempt at a gauge cluster. My first version was a gauge cluster made out of an EL display taken from a Sun router made around the year 2000, surrounded by flipdots for a state-of-charge gauge that does not require any power.

<img src="/images/Car/GaugeCluster/1.png" alt="Gauge Cluster Assembly" height="400">
<img src="/images/Car/GaugeCluster/stackup.png" alt="Gauge Cluster Assembly" height="400">

I *made* the first version of the gauge cluster, but I didn't like it. It's just... too weird. A rectangle with rounded corners and a bunch of LEDs fits the aesthetic better, anyway.


### Paint

### Pop Rivets

The bodywork is made of six monolithic pieces of ABS plastic: the back, two front quarterpanels, two rear quarterpanels, and one gigantic piece forming the front and roof of the car. These are bonded together first with a bit of glue and secondly with pop rivets. _Normal pop rivets won't work_, because the ABS is far too brittle -- in fact, most of the existing major cracks in the body are right where the rivets are.

The manufacturers' solution to this problem was a special type of pop rivet that is softer and expands more than a standard pop rivet. Original, new old stock Citicar rivets are available, but they cost about $0.50 USD each. That's too much. [McMaster-Carr sells these rivets](https://www.mcmaster.com/pop-rivets/blind-rivets-for-soft-materials-6/) for about $0.16 USD each. Here's McMaster's diagram of what they look like installed:

![McMaster Carr Blind Rivet for Soft Material](/images/Car/Rivet.png)

### Door and Window Seals

After acquiring the car, I noticed the door seals had completely rotted away. Inexplicably, the window seals for the back glass were completely intact, and in great condition. From a few forums, I found these were the same seal but could not find a reference to the part number of the seal that had not linkrotted away. The only solution to this problem is to take measurements of the rear window seal and find something similar for the door seals.

[A reasonable facsimile of the original door seals are available in the UK](https://www.sealsdirect.co.uk/shopping.asp?intDepartmentId=68#126)

## Parts and replacements

|Part				|Replacement							|Cost			|
|-----------------------|-----------------------------------------------------|--------------:|
|Rear glass gas strut 	|Napa / Balkamp BK 8195581					|$28.99		|
|Shock Absorber		|Monroe #94037 / NAPA PNS 94037				|$30.69		|
|Ignition Switch	|Cole Hersee 9577-BX							|$15.99		|
|Rear Hazard Light	|Peterson Manufacturing V126R Red Clearance Light	|$14.23		|
|Windshield Wiper Blade	|Anco 51-20 / NAPA part number 602050			|$14.37		|
|Turn Signal Stalk	|77-80 Triumph Spitfire / 30968X / LUCAS SQB195		|$36.75		|
|Fuse Panel			|Eaton / Bussmann 15305-2-2-4					|$45.46		|
|Direction Contactor	|Albright SW202-142 (ebay)					|$99.99		|
|Replacement Controller |Curtis 1209B-6402						|$219.22		|
|Motor Brushes		|Carbon Brush 0.5" x 0.625" x 1.437" item 10-506221	|$67.60		|
|Brake seal parts		|BK33-190 Torque Spider Repair Kit 				|$77.73		|
|Motor Mount Seal		|Federal Mogul 352352 Steering Gear Pitman Shaft Seal	|$10			|
|-----------------------|-----------------------------------------------------|-----------------|



[back](../)
