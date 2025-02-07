---
layout: default


---
## SFMTA API Data Collection and Analysis

<div style="width: 100%; height: 600px;">
<iframe src="/assets/pages/stops_routes_map.html" width="100%" height="100%" frameborder="0"></iframe>
</div>

This project explores and processes the dataset available from [511.org](https://511.org/) focusing on the San Francisco Municipal Transportation Agency (SFMTA) public transit system. The goal was to create a comprehensive database of every transit stop in San Francisco, including bus stops, cable car stops, and subway stations, supporting my [multi-stop bus tracker](https://bbenchoff.github.io/pages/BusTideDisplay.html) project.

### Data Collection

The project consists of several key datasets:

- **stops.xml**: Contains every transit stop in San Francisco, including:
  - Geographic coordinates (latitude/longitude)
  - Stop descriptions (street intersections)
  - Stop IDs
  
- **lines.xml**: A complete catalog of all bus, train, and cable car routes
  - The [714 BART Early Bird](https://www.sfmta.com/routes/714-bart-early-bird) exists. I didn't know that.
  - Used to determine which route graphics to create for the bus tracker
  
- **Routes folder**: Individual JSON files for each SFMTA route containing:
  - All stops on the route
  - Inbound/outbound designation
  - Terminus information

### Interactive Map Implementation

To make this data useful for the Multi-stop bus tracker project, I developed an interactive map that combines all three datasets. The map:

- Displays every transit stop in San Francisco
- Shows stop details on click:
  - Stop name
  - Stop ID
  - All routes serving that stop
  - Direction/terminus information
- Helps users easily identify stop IDs for programming the bus tracker

### Key Findings

Analysis of the data revealed several insights about San Francisco's transit system:

The SFMTA API uses cable cars just like the tourists do. The dumb (tourist) way to use a cable car is to line up at the terminus and wait your turn for a cable car. The smart (local) way to use a cable car is to walk one block up the hill and get on the next car. The cable car operators know this, and do not fill the cars to capacity at the terminus; they leave space for locals.

The physical reality of the universe is reflected in the API data and pulling expected departures from the cable car terminus stops. It's a 58 year wait for a cable car at the terminus (no, really, I've seen an estimated arrival in 58 years at the Market and Powell turnaround), but if you walk a block up the street, the next car will be there in a few minutes.

Other interesting bits include:

- The busiest stops are (obviously) concentrated along Market Street between 3rd Street and the Embarcadero
- The 714 bus exists! It runs from 4am to 5am on weekdays
- A lot of stops aren't used. The dataset behind the API could use some cleanup.

The processed data is available as stops_routes_data.csv, which includes:
- Stop numbers
- Stop descriptions
- Number of routes serving each stop

All code and data files are available in the [project repository](https://github.com/bbenchoff/sfmta-api).

[back](../)
