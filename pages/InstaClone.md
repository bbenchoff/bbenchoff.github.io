---
layout: default
title: "640by480.com — A Photo Board for Old Digital Cameras"
description: "A custom photo-sharing site built with Django, designed around the 640x480 aesthetic of mid-90s digital cameras. Has a REST API, accepts native Apple QuickTake .qtk raw files, and is reachable from Classic Mac OS 7 and Apple II clients."
keywords: ["640by480", "vintage digital camera", "digicam", "Apple QuickTake", "Sony Mavica", "Django", "REST API", "Apple II", "Classic Mac OS 7", "indie web", "small web", "photo sharing"]
author: "Brian Benchoff"
date: 2022-08-03
last_modified_at: 2022-08-03
image: "/images/640screencap.png"
---

## 640by480.com

I built a photo board to get off Zuck's Hot Rock for Lizard People. It's at [640by480.com](https://640by480.com/). What started as a refuge from algorithmic feeds has turned into something I didn't quite expect: a small protocol bridge between mid-90s hardware and the modern web.

![Screencap of 640by480.com](/images/640screencap.png){: loading="lazy" alt="Screenshot of 640by480.com — a grid of low-resolution photos from vintage digital cameras"}

### The premise

Posts on the site are capped at 640×480. That's the native resolution of cameras like the Apple QuickTake 100/150, the Sony Mavica FD-7, the Casio QV-10 — the consumer digital cameras of the mid-90s, the ones that made "digital photography" feel possible before it felt unavoidable.

### What it actually is

The stack is Django 3.2, SQLite, Apache + mod_wsgi, a single Linode. Photos auto-resize into three variants (original, 640px detail, 250px thumbnail). Users sign up, post photos with descriptions, comment, follow each other's profiles. The site has a `<table>`-based thumbnail grid, default browser fonts, and zero JavaScript on the homepage. It looks like 1999 because it's *for* photos that look like 1999. You can navigate the whole thing in Lynx.

What makes it interesting isn't the social part. It's the **API**.

### The protocol bridge

`640by480.com/api/` is a full REST API with token auth, [documented at `/api-docs/`](https://640by480.com/api-docs/). CRUD on posts and comments. Filter by camera. List the canonical 23 cameras the system recognizes. Every endpoint is rate-limited (DRF throttles), every authenticated user can read and write.

The reason this matters isn't because REST APIs are exciting — they're not — it's because **the API is what makes the site reachable by hardware that the modern web has forgotten**. Specifically:

- **A Classic Mac OS 7/8/9 client** I built for an old PowerBook. It speaks modern TLS via a shim and posts photos to the site over HTTPS. Write-up [here](https://bbenchoff.github.io/pages/MacSSL.html).
- **[An Apple II QuickTake client](https://www.colino.net/wordpress/en/quicktake-for-apple-ii/)** Colin Leroy-Mira built. Yes, an Apple II, talking to a Django site in 2026.

The Apple II part is the killer. Colin had already written the QuickTake serial protocol code (in 6502 assembly, optimized to within an inch of its life — [he wrote about that too](https://www.colino.net/wordpress/en/archives/2025/09/28/optimizing-a-6502-image-decoder-from-70-minutes-to-1-minute/)). His client needed somewhere to upload photos, and we ended up emailing back and forth about the API while I added the features his client needed.

**The server now accepts native Apple QuickTake `.qtk` raw files directly**. The Apple II doesn't have to decode the proprietary RADC compression locally — it just transfers the bytes, and the server decodes them via LibRaw (which inherited its QuickTake decoder from dcraw, written by Dave Coffin starting in 1997). A 1995 camera, a 1996 file format, a 1996-era computer, and a 2022 Django site, all in the same upload flow. Each one doing the thing it's best at.

### What it's NOT

It's not trying to be Instagram. Well, it _is_, just in a, "if Len, of Steal My Sunshine fame, announced their new album _You Can't Stop The Bum Rush_ on Instagram." The grid is anonymous on purpose,  you don't see who took which photo until you click through to the post page. There's no algorithm. There's no "like" button. There's no view counter. In 1999, those ideas had yet to be invented by the people who would make the world terrible. There's a feed and there are individual photos. That's it.

It's also not trying to scale. SQLite. One server. No CDN. If it ever gets popular enough to break, that's a *me* problem and I'll deal with it. The point of the site is to exist quietly and persistently for the small group of people who care about this exact niche.

### What's there now

A non-exhaustive list of what currently works:

- Upload formats: JPEG, PNG, GIF, HEIC (iPhone), MPO (Pixel HDR+), and **native Apple QuickTake `.qtk` raw**
- Image preview + rotate-before-posting in the upload form
- **Cameras as a first-class entity** — `/cameras/` browses by camera with a live JS filter, each post detail shows the camera attribution in the byline, the upload form auto-fills the camera when you drop in a `.qtk` file (it sniffs the magic bytes — `qktt` for QuickTake 100, `qktn` for 150)
- Comment system, user profiles, edit + delete your own posts (with media-file cleanup)
- Full REST API, self-hosted docs at `/api-docs/`
- Levenshtein-based camera typeahead on the upload form so you don't accidentally create a fourth spelling of "Sony Mavica FD-91"
- Rate-limited everywhere relevant (6 uploads/min/user, 5 login attempts/min/IP)
- Decompression-bomb protection (50 MP cap on raw decode)

### I miss the Internet

The internet used to have lots of small sites, built by individual people, with strange constraints and obvious authorship and no growth targets. Then it had a long Instagram-shaped phase where everything looked the same. Now there's a quiet resurgence of constraint-driven small sites. neocities, the indieweb, glass.photo, marginalia search, the Gemini protocol scene. 640by480 belongs in there. Not because the world needs another social photo site, but because someone with a working QuickTake 150 needs somewhere to put those photos that isn't owned by a company that thinks of him as inventory.

If you have an old digital camera and want to participate, the site is at [640by480.com](https://640by480.com/). The API docs are at [/api-docs/](https://640by480.com/api-docs/). If you want to build a client for some other vintage machine, email me — I'll list it on the [/clients/](https://640by480.com/clients/) page.

[back](../)
