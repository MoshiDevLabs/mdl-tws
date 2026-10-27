# Mdl TWS — Tanzania 3D Synoptic Weather & Hydrological Atlas

![Version](https://img.shields.io/badge/version-3.0.0-28c7b8?style=flat-square)
![Three.js](https://img.shields.io/badge/Three.js-r186%20%7C%20WebGL2-0b1724?style=flat-square&logo=threedotjs&logoColor=28c7b8)
![Vite](https://img.shields.io/badge/Vite-8.3-0b1724?style=flat-square&logo=vite&logoColor=e59a3c)
![Open-Meteo](https://img.shields.io/badge/Telemetry-Open--Meteo%20Live%20API-28c7b8?style=flat-square)
![Shaders](https://img.shields.io/badge/GLSL-Custom%20PBR%20%26%20Ocean%20Shaders-e0533c?style=flat-square)

> **Real-time East African meteorological telemetry, 3D topographic & satellite relief, hydrological river-basin modeling, and El Niño / Tropical Cyclone climate simulation built with Three.js, Custom GLSL Shaders & WebGL2.**

---

## 🌍 What This Project Is

**Mdl TWS (Tanzania 3D Interactive Weather System)** is an interactive 3D meteorological and hydrological field instrument built to model, monitor, and visualize **Tanzania’s complex climate dynamics**—from live hourly station observations across 27 cities to extreme seasonal anomalies driven by **El Niño**, the **Positive Indian Ocean Dipole (IOD)**, and **Southwest Indian Ocean Tropical Cyclones** (such as Cyclone Hidaya and Cyclone Kenneth).

Rather than presenting flat 2D weather maps, **Mdl TWS** renders a living, physically lit 3D digital twin of Tanzania—complete with satellite-blended terrain relief, Gerstner-wave Indian Ocean shaders, 9 interactive river catchment basins, 24-hour diurnal solar/night cycles, and procedural 3D regional landmark dioramas—so researchers, hydrologists, planners, and citizens can see *where* moisture converges, *which* river basins swell, and *how* topography shapes East African weather.

---

## 🎯 Purpose & Real-World Use Cases ("What It Was Built For")

1. **Hydrological & Flood Risk Intelligence**:
   - Models rainfall anomalies and river swelling across Tanzania’s 9 primary drainage catchments, including the **Rufiji & Kilombero Basin** (`Julius Nyerere Hydropower Project / JNHPP`), **Great Ruaha** (`Mtera & Kidatu Dams`), **Pangani**, and **Wami-Ruvu** water supply systems.
2. **El Niño & Indian Ocean Dipole (IOD) Teleconnection Analysis**:
   - Demonstrates how coupled sea-surface temperature (SST) anomalies in the Niño 3.4 Pacific region and Western Indian Ocean amplify Tanzania’s `Vuli` (Oct–Dec) and `Masika` (Mar–May) rains while driving humid thermal surges.
3. **Coastal Tropical Cyclone Preparedness**:
   - Simulates tropical cyclone tracks across the Mafia Channel and southern Swahili coast (**Dar es Salaam, Kibiti, Kilwa, Lindi, Mtwara**), visualizing eyewall wind fields, storm surge zones, and coastal infrastructure exposure.
4. **Urban Micro-Climate & Infrastructure Visualization**:
   - Combines 3D regional city dioramas with local wind-rose anemometers, heat-index calculations, and diurnal temperature profiles to inspect urban heat islands and coastal drainage bottlenecks (such as the Msimbazi Valley in Dar es Salaam).
5. **Interactive Climate & Geographic Education**:
   - Provides an intuitive, zero-install browser experience for exploring Tanzania’s topography—from **Mt. Kilimanjaro (`5,895 m`)** and the **East African Rift Escarpments** to **Lakes Victoria, Tanganyika, and Nyasa**.

---

## 🛠️ Technology Stack & Engineering ("What We Used to Create It")

| Layer | Technology / Technique | How It Is Used in Mdl TWS |
| :--- | :--- | :--- |
| **3D Rendering Engine** | **Three.js (`v0.186`) & WebGL2** | Scene graph, `PerspectiveCamera` with physical inertia/momentum damping, PCF soft shadow mapping, and `Raycaster` 3D picking. |
| **Build & Bundler** | **Vite (`v8.3`) + ES Modules** | Instant HMR development server and tree-shaken production bundling with zero framework overhead. |
| **Custom GLSL Shaders** | **GLSL Vertex & Fragment Shaders (`onBeforeCompile` & `ShaderMaterial`)** | • **Indian Ocean**: Multi-wave Gerstner displacement, shoreline foam, caustics, Fresnel reflections & GGX solar specular glint.<br>• **Terrain Surface**: Dynamic lake water ripples, Kilimanjaro snowline, hypsometric contours & thermal heat-shimmer.<br>• **3D Cities & Trees**: Procedural illuminated facade window grids at night (`uNight`) & vertex-shader wind sway on 7,200+ trees. |
| **Post-Processing Pipeline** | **`EffectComposer` + `UnrealBloomPass` + Custom Grade Shader + `OutputPass`** | Subtle HDR bloom on sunlit water/beacons, atmospheric contrast/vignette grading, and **ACES Filmic Tone Mapping**. |
| **Live Telemetry & GIS Data** | **Open-Meteo Multi-Station REST API + Custom GeoJSON Polygons** | Fetches real-time temperature, apparent heat index, precipitation (`mm/h`), WMO weather codes, cloud cover (`%`), and wind vectors across **27 Tanzanian stations**, interpolated via **Inverse-Distance Weighting (IDW)** + lapse-rate elevation correction. |
| **Satellite & DEM Relief** | **Esri World Imagery / EOX Sentinel-2 + Sobel Normal Map Baking** | Composites live satellite imagery tiles over a procedural 1024×1024 biome texture and bakes a 512×512 Sobel normal map from 20 Gaussian mountain peaks + Fractional Brownian Motion (`fBm`) & ridged multifractal noise. |
| **GPU Instancing & Perf** | **`THREE.InstancedMesh` + TypedArray Ring Buffers** | Renders ~1,600 3D buildings and ~7,200 montane/acacia trees in just **3 draw calls**, with zero-allocation `Float32Array` particle updates for smooth 60fps performance across wide hardware profiles. |
| **UI & Design System** | **Vanilla HTML5 / CSS3 + 2D HTML5 Canvas Instruments** | **"Tanzanian Synoptic Atlas" Field Instrument** aesthetic using `Space Grotesk`, `IBM Plex Sans`, and tabular `JetBrains Mono` with custom 2D Canvas wind-rose anemometers, teleconnection diagrams, and dual-axis sparklines. |

---

## ✨ Key Capabilities & Features

### 1. 📡 Live Open-Meteo Telemetry (27 Tanzanian Stations)
- Fetches real-time meteorological observations and 24-hour diurnal profiles across **27 stations** spanning Tanzania’s coastal plains, central plateau, Great Lakes, and highland massifs.
- Performs continuous **Inverse-Distance Weighted (IDW)** spatial interpolation across the 3D terrain mesh coupled with environmental lapse-rate elevation adjustments (`-6.5°C / 1,000 m`).
- Automatically gates 3D rain curtains, storm cloud decks, and lightning flashes to stations experiencing active precipitation (`mm/h`) and high cloud cover.

### 2. 🌊 Multi-Scenario Climate & Disaster Simulation
Switch seamlessly between live observations and extreme climate scenarios:
- **● Live Now**: Real-time station telemetry, wind vectors, cloud cover, and 24-hour station trajectory curves.
- **🌊 El Niño + IOD**: Simulates the October–March (`Vuli` to `Masika`) teleconnection where warm Niño 3.4 Pacific waters and a positive Western Indian Ocean Dipole pump intense moisture into East Africa—triggering coastal and Rufiji/Kilombero basin floods alongside `+1.5°C` to `+4.2°C` thermal anomalies.
- **🌀 Cyclone Landfall**: Models a Category 2–3 Southwest Indian Ocean tropical cyclone tracking across the Mafia Channel toward Dar es Salaam, Kibiti, Kilwa, and Mtwara with a rotating 3D eyewall vortex, `145+ km/h` wind streamlines, and coastal storm surge.

### 3. 🏛️ 3D Regional Dioramas & Landmarks (Area-Click Intelligence)
Clicking any of the **9 primary regional stations** flies the camera into a close-up **3D Regional Diorama** with distance-based Level of Detail (LOD), a **3D Ground Anemometer Wind Compass Ring**, and three curated camera vantage angles (`City Skyline`, `3D Landmark`, `Basin Overview`):

| Station | Coordinates & Elev | Procedural 3D Landmark Diorama | Primary Hydrological Basin |
| :--- | :--- | :--- | :--- |
| **Moshi** | `3.35°S, 37.34°E` · `890m` | **Kibo Volcanic Crater Rim & Uhuru Peak (`5,895m`)** + Foothill Coffee Terraces | Pangani Headwaters |
| **Tanga** | `5.07°S, 39.10°E` · `25m` | **Tanga Deep-Water Harbor Jetty, Port Cranes & Swahili Dhows** | Pangani Estuary & Bay |
| **Dar es Salaam** | `6.82°S, 39.28°E` · `24m` | **Tanzanite Cable-Stayed Bridge, PSPF/TPA Twin Towers, BoT Skybridge & Port Gantry Cranes** | Msimbazi & Coastal Basin |
| **Morogoro** | `6.82°S, 37.66°E` · `510m` | **Uluguru Mountain Met/Radio Tower & SGR Electric Railway Viaduct** | Ngerengere / Ruvu Catchment |
| **Dodoma** | `6.17°S, 35.74°E` · `1,120m` | **Bunge (Parliament) Stepped Rotunda Copper Dome & Government City Wings** | Central Plateau Semiarid Basin |
| **Mwanza** | `2.52°S, 32.90°E` · `1,140m` | **Bismarck Rock Balanced Granite Inselbergs & Lake Victoria Ferry Pier** | Lake Victoria Southern Gulf |
| **Kigoma** | `4.88°S, 29.63°E` · `775m` | **MV Liemba Steamer Berth & Historic Central Line Railway Terminus** | Lake Tanganyika & Malagarasi |
| **Mbeya** | `8.90°S, 33.46°E` · `1,700m` | **Loleza Rift Escarpment, Ngozi Volcanic Crater Lake & Highland Tea Terraces** | Great Ruaha & Songwe Headwaters |
| **Mtwara** | `10.27°S, 40.18°E` · `35m` | **Mtwara Natural Deep-Water Jetty, Tanker Berth & LNG Storage Tanks** | Ruvuma Estuary & Southern Coast |

### 4. 🏞️ Interactive Hydrological River Basins (9 Major Catchments)
Click any river ribbon directly on the 3D terrain—or browse the **Basins (9)** tab in the right dock—to inspect catchment area (`km²`), mainstem length (`km`), key hydroelectric infrastructure, estuary outlets, and live flood-swelling status:
1. **Rufiji & Kilombero Basin** (`177,429 km²` · Julius Nyerere Hydropower Project / JNHPP `2,115 MW`)
2. **Great Ruaha River** (`83,970 km²` · Mtera & Kidatu Dams)
3. **Pangani River Basin** (`43,650 km²` · Nyumba ya Mungu & New Pangani Falls)
4. **Wami River** (`43,946 km²` · Saadani Estuary)
5. **Ruvu River** (`17,700 km²` · Kidunda & Lower Ruvu Dar Water Supply)
6. **Ruvuma River** (`155,500 km²` · Southern Border & Rovuma Delta)
7. **Malagarasi River** (`130,000 km²` · Igamba Falls & Lake Tanganyika Confluence)
8. **Kagera River** (`60,000 km²` · Rusumo Falls Hydroelectric Project `80 MW`)
9. **Mara River** (`13,504 km²` · Serengeti Migration Lifeline)

### 5. 🧭 "Field Instrument" Synoptic UI & Point-Probe Cards
- **Region Dossier Modal**: Displays tabular precipitation/moisture rates, air temperature & heat index, an interactive **2D Compass Wind Rose Anemometer**, a **Basin Saturation Index Gauge**, and a **24-Hour / 6-Month Trajectory Chart**.
- **Interactive Terrain Point-Probe**: Clicking *any* coordinate on the 3D map drops a field probe pin and opens a floating **Terrain Probe Card** with exact `lat/lon`, elevation (`m`), ecological biome classification, interpolated temperature, rainfall, and wind vector.
- **24-Hour Diurnal Solar & Night Cycle**: Scrub the time-of-day slider (`00:00` – `24:00`) or enable **Auto ▶** to watch the sun arc across the sky, warm golden-hour reflections glisten on the Indian Ocean and Great Lakes, and illuminated window grids light up Tanzanian cities at night.
- **Integrated-GPU Quality Toggle (`Quality: High / Fast`)**: Dynamically adjusts pixel ratio, soft shadow maps, and terrain update intervals for smooth 60fps performance on both dedicated GPUs and integrated graphics.

---

## 🏗️ Project Architecture

```text
mdl-tws/
├── index.html               # Synoptic Atlas HUD, Dock tabs, Region/River/Probe modals
├── package.json             # Vite + Three.js dependencies & scripts
└── src/
    ├── main.js              # WebGL renderer, camera inertia controller, raycasting & main loop
    ├── style.css            # "Tanzanian Synoptic Atlas" Field Instrument design system
    ├── data/
    │   ├── geo.js           # High-resolution Tanzania coastline, border & Great Lakes polygons
    │   ├── climate.js       # El Niño/IOD & Cyclone physical models, lapse rates & coordinates
    │   └── liveWeather.js   # Open-Meteo 27-station live API fetcher & IDW spatial interpolator
    ├── world/
    │   ├── terrain.js       # 23k-vertex relief mesh, Sobel normal map & lake/snow/contour shaders
    │   ├── satellite.js     # Procedural biome relief + Esri/EOX satellite imagery tile compositor
    │   ├── environment.js   # Gerstner-wave Indian Ocean shader, caustics & Doppler radar sweep
    │   ├── rivers.js        # 9 terrain-draped river ribbons with flood swelling & hit proxies
    │   ├── details.js       # Instanced 3D city skylines, montane/acacia trees & trunk corridors
    │   ├── landmarks.js     # Procedural 3D regional landmarks, vessels & focused wind-vane ring
    │   ├── markers.js       # Distance-adaptive station pins & collision-free screen-space labels
    │   ├── weather.js       # Cumulonimbus clouds, branching lightning, cyclone vortex & streamlines
    │   ├── sky.js           # 24h diurnal sun/moon arc, atmospheric sky gradient & starfield
    │   └── noise.js         # Seeded PRNG, Fractional Brownian Motion (fBm) & ridged multifractal noise
    ├── render/
    │   └── post.js          # UnrealBloomPass + custom atmospheric grading & ACES Filmic pipeline
    └── ui/
        └── hud.js           # Telemetry readouts, wind rose canvas, sparklines & modal controllers
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `v18+` and **npm**

### Installation & Local Development
```bash
# 1. Clone the repository
git clone https://github.com/MoshiDevLabs/mdl-tws.git
cd mdl-tws

# 2. Install dependencies
npm install

# 3. Start the local Vite development server
npm run dev
```

### Production Build
```bash
# Build minified production bundle into dist/
npm run build

# Preview production build locally
npm run preview
```

---

## 🎮 Controls & URL Deep-Linking

### Mouse, Touch & Keyboard Controls
| Input | Action |
| :--- | :--- |
| **Left-Drag / 1-Finger Drag** | Orbit camera around target with physical coasting inertia |
| **Right-Drag / Shift + Drag** | Pan across Tanzania (`lat/lon` plane) |
| **Scroll Wheel / 2-Finger Pinch** | Zoom from synoptic satellite overview down to 3D city skylines |
| **Click City Pin / Label** | Fly to 3D Regional Diorama & open Station Dossier |
| **Click River Ribbon** | Fly to River Catchment & open Hydrological Basin Dossier |
| **Click Any Terrain Spot** | Drop 3D Field Probe & open Point-Forecast Card |
| **`Space`** | Play / Pause seasonal timeline (`El Niño` & `Cyclone` modes) |
| **`←` / `→` Arrow Keys** | Step backward / forward by month (`Oct` → `Mar`) |
| **`H`** | Minimize / Restore right Instrument Dock |
| **`Esc`** | Close active Region, River, or Probe modal |

### URL Query Deep-Linking
Share direct links to specific scenarios, cities, 3D landmark camera angles, or river basins:
- **Focus Dar es Salaam Skyline**: `?focus=2&vantage=skyline`
- **Inspect Dodoma Parliament 3D Landmark**: `?focus=4&vantage=landmark`
- **Simulate El Niño Floods on Rufiji River Basin**: `?sc=elnino&river=0`
- **Simulate Cyclone Landfall**: `?sc=cyclone`

---

## 📜 Data Sources, Attribution & License
- **Live Meteorological Telemetry**: Powered by the [Open-Meteo API](https://open-meteo.com/) across 27 Tanzanian station coordinates.
- **Satellite Imagery Layer**: Blended with Esri World Imagery / EOX Sentinel-2 cloudless tiles.
- **Advisory Notice**: Follow official **Tanzania Meteorological Authority (TMA)** bulletins for operational severe weather warnings.

---

## 🤝 Contributors & Credits
- **Lead Developer & Creator**: **[MoshiDevLabs](https://github.com/MoshiDevLabs)**
- **AI Architecture, Shaders & Engineering Co-Contributors**: **Gemini** & **Claude Sonnet (Thinking)**

