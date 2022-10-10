---
layout: default


---

## A Nikon Lens Adapter for the Apple Quicktake 150, the First Digital Camera*

Wherin I write a few thousand words on photography without using the word 'boekh'.

![A pile of Quicktake 150s, one with a lens adapter](/images/Quicktakes.jpg)

I'd like to start this by saying the Apple Quicktake was not the _first_ digital camera. People on the Internet would say that honor goes to a Kodak prototype from 1975. If you're looking for a commercial device, the "first digital camera" was a Fuji DS-1P, the Dycam Model 1, Logitech Fotoman, or MegaVision Tessera from 1987 to 1991, or thereabouts. Everyone who claiming one of these devices is the 'first digital camera' is wrong, because that honor actually goes to the [Cromeco Cyclops](https://hackaday.com/2016/04/17/building-the-first-digital-camera/), a digital camera from February, 1975 that could create an image with 32x32 resolution. It's actually a decapsulated DRAM chip and a C-mount lens adapter sold as a kit, but that's the first digital camera, beating the Kodak prototype by a few months.

The Apple Quicktake, though, was the first digital camera anyone could _just buy_. Just go back to 1994 and walk into a Sears, or a Montgomery Ward, or a Babbage's, or an Electronics Boutique, and you could buy a digital camera. It cost $749 back then. You didn't even have to mail order anything.

In any event, that's not what I say whenever someone comes up and asks me what camera I'm using. I just say, 'It's the first digital camera. Made by Apple.' They usually reply, 'oh, cool.'

*********************

## The Quicktake 150 and Lens Adapter

The Quicktake 100 (and Quicktake 150) are digital cameras witha CCD sensor capable of taking pictures at a resolution of 640x480. The camera has a fixed focus, fixed focal length equivalant of 50mm, and auto aperture (ranging from f/2.8 to f/16) and exposure (from 1/30th to 1/175th of a second). The camera can store eight (with the Quicktake 100) or sixteen (Quicktake 150) images at 640x480 resolution, or double the number of pictures at 320x240. There is no LCD screen to show you what your picture looks like, and the only way to view your pictures is to connect the camera (by serial!) to an old computer. This means you need to keep an old pre-OS X Mac around. Something with serial ports. The software to download images does not run on OS 8. The camera has extrodinarly low light sensitivity, and taking pictures in twilight or indoors results in a dull, underexposed image. This is a terrible camera.

**But why?**

Despite the technical shortcomings, the Apple Quicktake does actually produce nice photos, despite itself. I would characterize the images as being like oil paintings, cloistered away in an attic for a century or so, until the varnish oxidizes. It's dull, it's matte, it's a bit desaturated, but it still somehow looks good. Here's an example, comparing a modern smartphone camera (Pixel 2) with the Quicktake 150:

![example photo comparing Pixel 2 with Quicktake 150, photo of camera and powerbook in front of golden gate bridge in fogust](/images/Comparison.jpg)

Other good images can also be captured. Click to embiggen:

<a href="https://www.640by480.com/posts/89/"><img src="https://www.640by480.com/media/Conservatory_Flowers_OpQCuom.jpg" height="200"></a> <a href="https://www.640by480.com/posts/92/"><img src="https://www.640by480.com/media/North_Beach_Cathedral_nTQIrMX.jpg" height="200"></a> <a href="https://www.640by480.com/posts/85/"><img src="https://www.640by480.com/media/Skateboarding_at_Twin_Peaks_FIb8NLA.jpg" height="200"></a> <a href="https://www.640by480.com/posts/70/"><img src="https://www.640by480.com/media/Chinatown_Empty_NQWkLeO.jpg" height="200"></a>

These are good pictures, all things considering. The problem is the lens; there are a few pics I'd like to take where a 50mm equivalent lens is wholly insufficient, and I have a pile of Nikon F-mount lenses sitting around, so I'll have to make an adapter.

**Making an adapter**

The guts of a Quicktake 100/150 camera is the most complicated electronic device I've ever seen. It's a master class in electronic design. Inside, there are two double-sided PCBs, loaded with components. In between those 'main' PCBs are _other_ boards, one of which is the board housing the CCD sensor. Mixed in with all of this are two optical paths, one straight through the camera for the viewfinder, and a second for the camera's optics. There optical path features six lenses and a combined shutter/aperture device. This is an absurdly complex device.

The basic steps in creating a Nikon adapter for a Quicktake are simply opening up the camera, moving the sensor PCB forward though the use of standoffs, removing all optical elements (lenses) from the optical path, and mounting a 3D printed F-mount adapter exactly 46.5mm in front of the sensor. Do that, and you'll be able to take pictures.

![Description of optical path changes](/images/OpticalPath.png)

![a look at the sensor](/images/Sensor.jpg) ![Quicktake disassembled, showing the sensor moved forward](/images/Standoffs.jpg) ![The assembled camera](/images/Assembled.jpg)

While the process is simple, there are a few gotchas in adapting a Quicktake to take larger lenses. The stock power switch is activated by the lens cover, this was simply wired into a small DPDT switch and glued to the interior front of the camera. The lens adapter, like the camera, is fairly complicated, and requires a few cutouts to clear the apeture/shutter motor while still allowing access to the on/off switch:

![3D render of the adapter](/images/adapter.png)

While the adapter is 3D printed, the metal hardware to mount a Nikon lens is not; these parts were taken from an off-the-shelf C-mount to F-mount adapter. The springs and plate simply screw into the plastic (PLA) parts. Because the stock Quicktake optical path includes an IR blocking coating, I had to add a UV IR cut filter to whatever lens I use with this camera.

**What it looks like**

There is exactly one reason why anyone would want to put a Nikon lens on an Apple Quicktake: crop factor. The sensor size of the Quicktake is about 6mm across. Because my Nikon lenses were designed for a 35mm frame, I get a very, very long lens, even using a 50mm Nikkor lens. The effective crop factor is about 7x, meaning the 50mm lens turns into a 350mm lens, making for some very long shots. Or extreme close-ups. Using a long (200mm or greater) lens on the Quicktake means I basically have a telescope. Of course, the light sensitivity and resolution is terrible, so keep that in mind.

These are a few images taken with my Quicktake Nikon adapter:

<a href="https://www.640by480.com/posts/271/"><img src="https://www.640by480.com/media/Image_9_-_82f212f22.jpg" height="300"></a> <a href="https://www.640by480.com/posts/272/"><img src="https://www.640by480.com/media/Image_2_-_82f212f22.jpg" height="300"></a><a href="https://www.640by480.com/posts/285/"><img src="https://www.640by480.com/media/Image_3_-_82f212f22.jpg" height="300"></a><a href="https://www.640by480.com/posts/284/"><img src="https://www.640by480.com/media/Image_2_-_82f212f22_99gT0Y3.jpg" height="300"></a><a href="https://640by480.com/posts/322/"><img src="https://640by480.com/media/moon1.jpg" height="300"></a><a href="https://640by480.com/posts/345/"><img src="https://640by480.com/media/Image_3_-_92F132F22.jpg" height="300"></a><a href="https://640by480.com/posts/360/"><img src="https://640by480.com/media/Image_6_-_92F172F22_yIS48hx.jpg" height="300"></a><a href="https://640by480.com/posts/387/"><img src="https://640by480.com/media/Image_6_-_102F92F22.jpg" height="300"></a>

**Using this bizarre camera**

While the adapter works, the viewfinder doesn't and there's no LCD on the camera showing me how the pctures look. And I'm still beholden to the automatic shutter and aperture. This means I need a way to view the pictures taken by the camera, _live_. For this, I'm using a Powerbook Duo 2300c with System 7.5.5. To take a pictue, I set up the camera, press the button, fiddle with the focus and apeture on the lens, and download the pics to the computer. From there, I select the best pictures and re-shoot, playing with the framing. It's hard, and I had to rebuild a few Powerbook Duo batteries to make this setup portable.

This is sort of the appeal of the Quicktake. Each image is a struggle. Even a stock Quicktake requires an old Mac, and if you want to get those images to the outside world, you should probably find a way to connect that computer to a local FTP server (the easiest way) or sneakernet the pictures on 3.5" floppies (the hard way).

**What this project turned into**

Due to the success of this project, I thought it would be a good idea to share these pics with the world. I initially had an Instagram account for these pics, but I don't want anything to do with Facebook/Meta. So I made my own Instagram clone for vintage digital cameras. [640by480](https://www.640by480.com/) is a simple Django app I made to show off pics taken with vintage digital cameras. My profile [is here](https://www.640by480.com/benchoff/), and all of the _good_ images I've taken with a Quicktake will show up there.

A short writeup on the project [can be seen here.](https://bbenchoff.github.io/pages/InstaClone.html)

The site is reasonably successful, with a few dozen active users in the first weekend. There are actually people uploading pics from their Mavica, and everything works. It's great.

Oh, and because I'm creating a site for vintage digital cameras, it only makes sense that the page should be viewable on vintage computers. It works, but it's not good; IE 3.0 was the first browser to support CSS, and not all the attributes are there. It does, however, load:

![640by480 as viewed on a Powerbook 2300c running Microsoft Internet Explorer 3.0](/images/640by480mac.gif)



[back](../)
