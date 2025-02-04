# **Acess Main Security Grid**

![Ah Ah Ah! You didn't say the magic word!](/images/run.jpg)

If you’ve ever seen *Jurassic Park*, you know the scene. Samuel L. Jackson’s character sits down to undo Dennis Nedry’s sabotage, only to be met with the ultimate trolling animation: a looping clip of Nedry wagging his finger, smugly reminding you that you "didn't say the magic word."

This is *that* animation. Over and over.

## **What is this?**
*Nedry* is a small application for classic Mac OS (pre-OS 9) that does one thing: it plays the infamous "Ah Ah Ah! You didn’t say the magic word!" animation from *Jurassic Park* on an endless loop. That’s it. No fancy features. No deep functionality.

## **Why?**
Because it’s funny. Because it doesn't already exist. Also, because I wanted an excuse to write code for old-school Mac OS using Metrowerks CodeWarrior Professional 4. This is my first *real* attempt at targeting classic Macintosh systems, and what better way to start than with something completely ridiculous?

## **How it Works**
The code is dead simple. The core logic lives in `Nedry.c`, and the animation is loaded from `Nedry.rsrc`, since everything in classic Mac OS needs a resource fork. QuickTime is required to run the animation, and the installer will refuse to proceed if QuickTime isn’t present.

If you want to see it in action, grab the **NedryInstaller.sit** file from the repo, decompress it, and install. It will set up a folder containing the *Nedry* application and the QuickTime video. Launch the app, sit back, and let Nedry remind you, over and over, that you didn’t say the magic word.

## **Screenshots**
The application running:

![Ah Ah Ah! You didn't say the magic word!](/images/run.jpg)

And of course, it comes with a classic "About" dialog in the Apple menu:

![About image graphic](/images/about.jpg)

## **Where to Get It**
This blog has it installed. Go over to the <a href="https://bbenchoff.github.io/system7/">System 7 version</a> of this site and find it in the Macintosh HD.

If you want it on your mac, everything you need is in the [Nedry GitHub repository](https://github.com/YOUR-REPO-LINK). The source is there if you want to poke around, but honestly, there's not much to it—just a fun little relic of 90s computing nostalgia.

[back](../)
