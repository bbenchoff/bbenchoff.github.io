# **Benchoff Design Portfolio**  
### **Hardware, Embedded Systems & Strange Projects**

I design, build, and reverse-engineer **hardware, embedded systems, and unconventional tech**. My work spans **low-level firmware, PCB design, industrial design, and creative problem-solving**—whether that’s modernizing a **1970s electric car**, designing a **$15 Linux handheld**, or reverse-engineering **legacy consumer electronics**.

🛠 **What I Do Best:**  
✔ Embedded Systems (RP2040, STM32, AVR, Linux SBCs)  
✔ Hardware & PCB Design (High-Speed, CAN Bus, DAQ, Power Systems)  
✔ Industrial Design & Manufacturing (3D Printing, CNC, Injection Molding)  
✔ Reverse Engineering & Hacking (Legacy Hardware, Retrocomputing, UI/UX)  

<section id="latest-work">
  <h2>🆕 Latest Work</h2>
  <ul class="latest-work-list">
    {% assign sorted_posts = site.pages
         | where_exp: "page", "page.last_modified_at"
         | sort: "last_modified_at"
         | reverse %}
    {% for post in sorted_posts limit:3 %}
    <li class="latest-work-item">
      <div class="latest-work-content">
        <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
        <p class="latest-work-description">{{ post.description }}</p>
      </div>
      <p class="latest-work-date">Last updated on {{ post.last_modified_at | date: "%B %d, %Y" }}</p>
    </li>
    {% endfor %}
  </ul>
</section>

## **📌 Featured Projects**
### 🕵️ **Reverse Engineering**
🔹**[Reverse Engineering Nvidia's SXM2 Socket](https://bbenchoff.github.io/pages/SXM2PCIe.html)** -- Because **I had to do it for another project**<br>
🔹**[Copying 20 year old USB devices](https://bbenchoff.github.io/pages/atapi.html)** -- When you can only find **one on eBay**<br>

### 💻 **Coding Projects**
🔹**[A port of Mbed-TLS for the Classic Macintosh OS 7/8/9](https://bbenchoff.github.io/pages/MacSSL.html)** -- SSL/TLS **for something that was never meant to have it**<br>
🔹**[Embedded SSL and GZIP](https://bbenchoff.github.io/pages/BusTideDisplay.html)** -- Because **you don't need to run everything in Linux**<br>

### 🚗 **Restoring & Modernizing a 1970s EV**
🔹 **[The Citicar Restoration](https://bbenchoff.github.io/pages/Citicar.html)** -- Bringing a **vintage electric car back to life**<br>
🔹 **[Car CAN Bus Conversion](https://bbenchoff.github.io/pages/CANconversion.html)** -- Replacing **all relays & analog systems with a CAN-based network**<br>

### 💻 **Embedded & Open Hardware**
🔹 **[The $15 Linux Machine](https://bbenchoff.github.io/pages/LinuxDevice.html)** -- A fully functional **Linux handheld** for under $15<br>
🔹 **[Isolated Thermocouple Reader](https://bbenchoff.github.io/pages/IsoTherm.html)** -- A **low-cost alternative** to a $2,000 industrial module<br>

### 🔬 **Reverse Engineering & Retro Tech**
🔹 **[BaudBox: A 256-Key ASCII Keyboard](https://bbenchoff.github.io/pages/BaudBox.html)** -- A serial input device for **manual debugging & obscure ASCII characters**<br>
🔹 **[Rebuilding a Zip Drive Tower](https://bbenchoff.github.io/pages/atapi.html)** -- Stacking **fifteen ATAPI Zip-100 drives into a USB RAID array**<br>

### 🎨 **Industrial & UI/UX Design**
🔹 **[Custom Silicone Keyboards](https://bbenchoff.github.io/pages/keyboard.html)** -- Designing **low-cost, high-durability keyboards**<br>
🔹 **[Full-Color Circuit Boards](https://bbenchoff.github.io/pages/colorPCB.html)** -- Experimental **multi-color PCBs beyond standard manufacturing**<br>
🔹 **[Portable Dumb Terminal](https://bbenchoff.github.io/pages/dumb.html)** -- A **VT100-style ANSI terminal** in a pocket-sized form factor<br>

## **📄 About Me & Work**
I specialize in **building functional, practical, and sometimes ridiculous hardware**. My goal is to **design great products**, solve difficult engineering challenges, and push the boundaries of **low-cost, hackable, and open-source hardware**.

📝 **[Download My Resume](https://github.com/bbenchoff/CV/blob/main/Brian%20Benchoff%20-%20Resume.pdf)** | 🔗 **[GitHub](https://github.com/bbenchoff)** | ✉ **[Email Me](mailto:benchoff@gmail.com)** | 🥑 **[Linkedin](https://www.linkedin.com/in/bbenchoff/)**


## **⚡ Want to Work Together?**
I’m open to **collaborations, consulting, and full-time roles** in:  
🔹 **Embedded Systems & Hardware Engineering**  
🔹 **Industrial Design & Product Development**  
🔹 **Automotive and EV**  

💬 **Let’s Talk → [Email Me](mailto:benchoff@gmail.com)**  

---

## **🚀 Bonus: Want Something More Fun?**
[🔄 Switch to System 7 Mode →](https://bbenchoff.github.io/system7) *(For the full retrocomputing experience!)*  

---

## **📷 Gallery**
![1980 Citicar](/images/Car/OceanBeach/Hero.jpg)
![Handheld Linux Thing](/images/SAB-4.png)
![Isolated Thermocouple Device](/images/IsoThermHero.png)
![Quicktake Camera Shot](/images/Quicktake.jpg)
![Handheld Linux Thing](/images/SAB.png)
![A BeBox](/images/BeBox-Small.png)
![RGB Gaming Coaster](/images/RGBGaming-small.jpg)
![Silicone Keyboard](/images/Keyboard-Small.png)
![Tower of Zip drives](/images/Zip-Small.png)
