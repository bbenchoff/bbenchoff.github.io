---
layout: default
title: "GitRez: A GitHub Client for Classic Mac OS"
description: "A native GitHub Desktop client for Classic Mac OS (System 7-9) with resource fork preservation for vintage Mac development"
keywords: ["Classic Mac OS", "GitHub client", "resource fork", "version control", "System 7", "vintage computing", "Mac development", "Git"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2025-003-15
image: "/images/GitHubBoxArt.png"
---
![Github box art](/images/GitHubBoxArt.png){: loading="lazy" alt="Github box art"}

## GitRez, A Classic Mac GitHub Client

I'm building a GitHub Desktop client for Classic Mac OS, allowing vintage Mac enthusiasts to participate in modern version control without leaving their beloved System 7-9 environment. With my hobby of writing software that _should_ exist for the classic Mac environment, like [Nedry](https://github.com/bbenchoff/Nedry), the program everybody saw in _Jurassic Park_, and a native client for my [Instagram-like thing for vintage digital cameras](https://640by480.com/), I need some sort of version control.

### Current state of the art for version control

Version and source control schemes have existed since before the Macintosh. [MacCVS](maccvs.org) is probably the most popular version control system for Pre-OSX Macs, having been developed at Netscape back in the day. The incredible jcs created [Amend](https://jcs.org/amend), a reversion control system for System 6 Macs. Other classic Mac devs have taken to using [Netatalk](https://netatalk.io/) as a version control system by mounting a Mac drive on a Linux box and using Git with _that_.

These are all good solutions, Amend especially, but I want something different. MacCVS operates on a model created before the age of "The Cloud". This system requires means I would need to run a CVS server in my house, on a Linux box and lacks integration with GitHub or other contemporary collaboration platforms. Amend, though impressive for System 6, has limited branching capabilities and no connectivity to modern repositories. The Netatalk approach, like MacCVS, also requires maintaining a separate Linux server and also involves switching contexts between systems rather than working purely on the Mac.

What's missing is a truly native GitHub client that brings modern distributed version control directly to Classic Mac OS - one that preserves resource forks while allowing seamless interaction with the world's largest code hosting platform. This project aims to bridge that gap, giving vintage Mac developers the ability to participate in contemporary open source communities while remaining fully within their preferred classic environment.

### The Resource Fork Challenge

The fundamental challenge of bringing Git to classic Mac OS lies in the dual-fork architecture of Mac files. While modern systems use a single data stream per file, classic Mac OS uses two parallel streams:

1. **Data Fork**: The primary content of the file
2. **Resource Fork**: Structured data like icons, sounds, UI elements, and critical application information. This is what you would create or modify with ResEdit.

Git was made for *nix and has no concept of resource forks. However, anyone reading this page will note something interesting -- Linux can _somehow_ support resource forks, because you can 'host' Git on a classic Mac through Netatalk. Netatalk manages to preserve resource forks when using Git because it acts as a translation layer between two fundamentally different file systems. When a Classic Mac connects to a Netatalk server over Apple Filing Protocol (AFP), the server stores Mac files in a special format on the Linux side that preserves both forks. Typically, this involves storing the data fork as the main file and the resource fork as a hidden file. When Git on the Linux machine tracks these files, it's tracking both components without even realizing it's preserving Mac-specific structures.

This solution is elegant in its simplicity—the Mac sees normal dual-fork files over AFP, while Git sees standard Unix files—but it requires maintaining a separate Linux server that's always accessible. My GitHub client takes inspiration from this approach but internalizes the process. Instead of relying on Netatalk to handle the translation, the client itself will split files into data and resource components when pushing to GitHub and seamlessly recombine them when pulling changes. This preserves the full fidelity of Mac files while allowing direct integration with GitHub's API, all without leaving the Classic Mac environment or requiring external servers.


### Transparent Fork Handling

My GitHub client solves this with a technique I call "transparent fork preservation." The process works like this:

#### When Pushing to GitHub:

1. For each file with a resource fork, the client creates two files:
   - `filename` - Contains the original data fork
   - `filename.rsrc` - Contains the resource fork data

2. A manifest file tracks which files have associated resource forks

3. Both files are committed to the repository

#### When Pulling from GitHub:

1. Regular files are handled normally
2. When finding a `.rsrc` file, the client:
   - Locates the corresponding data file
   - Creates a new Mac file with both forks
   - Writes the appropriate content to each fork
   - Deletes the separate `.rsrc` file from the local filesystem

This happens automatically behind the scenes, so the user only sees normal Mac files with both forks intact.

### Implementation Details

The client uses File Manager and Resource Manager calls to split and recombine forks:

```c
// Reading a resource fork
short refNum;
Handle rsrcData;
long rsrcLength;

FSpOpenRF(&fileSpec, fsRdPerm, &refNum);
GetEOF(refNum, &rsrcLength);
rsrcData = NewHandle(rsrcLength);
HLock(rsrcData);
FSRead(refNum, &rsrcLength, *rsrcData);
// Now rsrcData contains the complete resource fork
```

This approach solves what would otherwise be a fundamental incompatibility between classic Mac OS and GitHub.

### Networking Implementation

Connecting to GitHub's API requires modern TLS support not native to classic Mac OS. I'm embedding wolfSSL to enable secure HTTPS connections, making it possible to authenticate with GitHub and perform all the necessary API operations.

The client uses a modified version of OpenTransport with TLS support to communicate with GitHub's REST API endpoints. This approach avoids needing to port Git itself, which would be significantly more complex.

### User Interface

<img src="/images/GitHubClientUI.png" alt="GitHub Client UI" align="left" hspace="10" width="350">

The interface reflects the classic Mac OS aesthetic while providing modern Git workflow capabilities:

- Repository clone/creation
- Commit history browser
- File change viewer with basic diff capabilities
- Branch management
- Commit creation with message editing

The UI is built with the Appearance Manager and PowerPlant framework, supporting both 68k and PowerPC Macs via a fat binary.

### Current Status

This is a work in progress. I've implemented the fork splitting/recombination system and basic API connectivity. The UI and full GitHub API integration are in development. My plan is to open-source the client once it reaches a usable state.

This project demonstrates that vintage computing doesn't have to mean isolation from modern development practices. Classic Mac developers can participate in contemporary collaborative coding while preserving the unique qualities of our favorite classic operating system.

![Mac Octocat](/images/MacOctocat.png){: loading="lazy" alt="Mac Octocat"}

[back](../)