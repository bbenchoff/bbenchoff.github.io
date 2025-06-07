---
layout: default
title: "TauCompression"
description: "Hardware engineering and PCB design documentation by Brian Benchoff"
keywords: ["hardware engineering", "PCB design", "electronics", "reverse engineering"]
author: "Brian Benchoff"
date: 2000-09-11
last_modified_at: 2000-09-11
image: "/images/default.jpg"
---


## An idea I've had for a few decades now

Compute, storage, and bandwidth. Pick any two and you can do something cool. Early multimedia PCs had powerful CPUs and plenty of local storage on CDs but no connection to the Internet. So we got Myst and Microsoft Encarta. Thin clients flip that equation with fast network pipes and decent CPUs, but no storage. This pattern shows up everywhere in computing history. If you have two of these resources, you can usually fake the third through clever engineering—compress harder, cache locally, stream dynamically, whatever it takes.

An idea I've had for a few decades now is, "In 300 years, how would extra-solar human civilizations communicate with Earth?". Since this is 300 years in the future, we can assume both sides will have effectively infinite compute and storage. But bandwidth between another star and Earth will be severely limited; inverse-square law and all of that. For example, the Voyager spacecraft could communicate with controllers at around seven kilobits per second just after leaving Earth. Now, decades later, the best we can do is forty bits per second. Bandwidth goes down as distance increase, or something like that.

I propose, in this incredibly nerdy, far-future sci-fi world building exercise, that forty bits per second is fine. We can compress a lot of data if we have infinite compute, infinite storage, and have some sort of dictionary that's full of normal data, a well-studied mathematical constant, and some way of extracting digits in base-16. We actually have this. It's pi. No I'm not crazy, this is just something where the math _works_, and I've been kicking this around in my head for decades now. It's time to either build this or forget about it.


[back](../)
