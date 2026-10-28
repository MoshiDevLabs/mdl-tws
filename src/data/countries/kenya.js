// Kenya (KE) Complete Country Profile — High-Precision National Boundary, Great Rift Lakes,
// 16 Mountain Massifs, 27 Dedicated Kenyan Open-Meteo Stations, 9 Regional Hubs, 9 River Basins & 3D Landmarks

export const KENYA_GEO = {
  // c: Mainland Kenya high-precision boundary + Lamu/Pate/Manda Island rings [lon, lat, ...]
  c: [
    [
      // Indian Ocean Coast: Vanga (TZ border) -> Diani -> Mombasa -> Kilifi -> Malindi -> Ungwana Bay -> Lamu -> Ras Kiamboni
      39.22, -4.67, 39.38, -4.52, 39.52, -4.35, 39.61, -4.18, 39.68, -4.05, 39.75, -3.92,
      39.85, -3.63, 39.96, -3.38, 40.12, -3.22, 40.14, -3.02, 40.26, -2.78, 40.58, -2.52,
      40.82, -2.35, 40.96, -2.18, 41.22, -1.96, 41.42, -1.78, 41.56, -1.66,
      // Somalia Border: Ras Kiamboni -> Liboi -> El Wak -> Mandera tri-point
      41.25, -1.25, 40.99, -0.85, 40.99, -0.35, 40.99, 0.15, 40.99, 0.85, 40.99, 1.45,
      40.99, 2.15, 40.99, 2.78, 41.32, 3.18, 41.58, 3.55, 41.86, 3.94,
      // Ethiopia Border: Mandera -> Takaba -> Moyale -> Forole -> North Horr -> Lake Turkana North (Todenyang)
      41.25, 3.96, 40.65, 4.12, 40.15, 4.22, 39.65, 3.85, 39.05, 3.52, 38.48, 3.62,
      37.95, 3.75, 37.35, 4.08, 36.82, 4.35, 36.22, 4.45, 35.92, 4.58, 35.55, 4.88,
      35.15, 4.92, 34.48, 4.35, 34.05, 4.18,
      // Uganda Border: Loima / Turkana Escarpment -> Pokot -> Mt. Elgon -> Malaba -> Busia -> Lake Victoria
      34.35, 3.65, 34.55, 3.12, 34.78, 2.55, 34.92, 1.98, 34.82, 1.52, 34.55, 1.14,
      34.38, 0.78, 34.12, 0.52, 33.98, 0.22, 33.95, -0.15, 34.02, -0.58, 34.08, -1.0,
      // Tanzania Border: Muhuru Bay -> Migori -> Maasai Mara -> Loita -> Lake Natron -> Namanga -> Kilimanjaro North -> Taveta -> Vanga
      34.48, -1.22, 34.95, -1.48, 35.42, -1.72, 35.92, -1.98, 36.42, -2.25, 36.78, -2.55,
      37.15, -2.82, 37.52, -3.02, 37.72, -3.38, 37.68, -3.65, 38.12, -3.92, 38.65, -4.25,
      39.22, -4.67,
    ],
    // Lamu & Pate Archipelago Island Ring
    [40.82, -2.32, 41.05, -2.26, 41.18, -2.06, 41.08, -1.98, 40.85, -2.14, 40.82, -2.32],
    // Wasini / Funzi Southern Coral Island Ring
    [39.32, -4.68, 39.44, -4.64, 39.46, -4.56, 39.35, -4.58, 39.32, -4.68],
  ],

  // l: Inland Great Rift & Victoria Lakes [lon, lat, ...]
  l: [
    // 1. Lake Turkana (The Jade Sea — Northern Rift Valley)
    [
      35.92, 4.52, 36.18, 4.42, 36.25, 4.05, 36.28, 3.65, 36.38, 3.22, 36.52, 2.78,
      36.68, 2.42, 36.55, 2.38, 36.32, 2.65, 36.12, 3.05, 35.95, 3.45, 35.88, 3.92,
      35.86, 4.28, 35.92, 4.52,
    ],
    // 2. Lake Victoria (Kenyan Sector & Winam / Kavirondo Gulf at Kisumu)
    [
      33.98, 0.2, 34.18, 0.12, 34.38, -0.05, 34.76, -0.1, 34.78, -0.25, 34.55, -0.35,
      34.35, -0.42, 34.18, -0.68, 34.08, -0.98, 33.95, -0.85, 33.92, -0.35, 33.98, 0.2,
    ],
    // 3. Lake Naivasha (Central Rift Valley Freshwater Lake)
    [36.28, -0.72, 36.42, -0.72, 36.44, -0.84, 36.3, -0.84, 36.28, -0.72],
    // 4. Lake Nakuru & Lake Elementaita (Rift Soda Lakes)
    [36.04, -0.32, 36.14, -0.32, 36.15, -0.45, 36.05, -0.45, 36.04, -0.32],
    // 5. Lake Baringo & Lake Bogoria
    [36.0, 0.68, 36.14, 0.68, 36.15, 0.52, 36.02, 0.52, 36.0, 0.68],
  ],

  // r: Regional Subdivision Lines
  r: [],
};

export const KENYA_PROFILE = {
  id: 'ke',
  name: 'Kenya',
  flag: '🇰🇪',
  agency: 'KMD · SYNOPTIC ATLAS',
  agencyFull: 'Kenya Meteorological Department (KMD)',
  subtitle: 'Kenya 3D Interactive Weather & Basin System',
  timezone: 'Africa%2FNairobi',
  centerLon: 37.9,
  centerLat: 0.4,
  scale: 8.5,
  lonMin: 29.9,
  lonSpan: 16.0,
  latMax: 8.4,
  latSpan: 16.0,
  geo: KENYA_GEO,

  // 16 Major Topographic Gaussian Massifs across Kenya [lon, lat, amp, sigma]
  peaks: [
    [37.31, -0.15, 7.2, 1.85], // Mt. Kenya (Batian & Nelion — 5,199m)
    [34.55, 1.14, 5.4, 1.75],  // Mt. Elgon (Wagagai / Koitobos — 4,321m)
    [36.65, -0.42, 4.9, 1.95], // Aberdare Range / Oldoinyo Lesatima (4,001m)
    [35.45, 1.15, 4.2, 1.85],  // Cherangany Hills (3,581m)
    [35.75, -0.55, 4.1, 3.2],  // Mau Escarpment & Complex (3,098m)
    [35.25, 0.45, 3.2, 3.4],   // Uasin Gishu & Nandi Escarpment (Eldoret / Kapsabet)
    [36.85, -1.25, 2.8, 3.2],  // Nairobi / Kiambu / Ngong Highland Plateau (1,850m)
    [37.35, -1.55, 2.4, 2.2],  // Machakos & Mbooni Hills
    [37.88, -2.68, 2.5, 1.8],  // Chyulu Hills Volcanic Field
    [38.35, -3.4, 2.8, 1.65],  // Taita Hills (Vuria Peak — 2,228m)
    [37.35, 1.25, 3.1, 2.2],   // Mathews Range (Ldoinyo Lenkiyio) & Ndoto Mountains
    [36.92, 2.75, 2.9, 1.55],  // Mt. Kulal Biosphere Reserve (2,285m)
    [37.97, 2.32, 2.7, 1.75],  // Marsabit Shield Volcano (1,707m)
    [35.65, -1.45, 2.3, 3.5],  // Loita Hills & Maasai Mara Uplands
    [36.85, 0.25, 2.5, 3.8],   // Laikipia Plateau (Nanyuki / Rumuruti)
    [40.15, 3.45, 1.7, 4.2],   // Moyale / Ethiopian Foothill Escarpment
  ],

  // Kenyan Synoptic Climate Anomaly Centers [lon, lat]
  climateCenters: {
    ne: [40.2, 1.2],     // Garissa / Wajir / Tana Floodplain (Strong El Niño deluge center)
    vic: [34.75, -0.1],  // Lake Victoria / Kisumu / Nzoia Basin convergence
    dar: [39.7, -3.9],   // Mombasa / Malindi / Lamu Swahili Coast monsoon belt
    sw: [35.5, 3.2],     // Turkana / Lodwar Northwest Rift
    mt: [40.1, -3.2],    // Sabaki / Lower Tana Estuary
    cen: [37.1, -0.4],   // Central Highlands (Nairobi / Nyeri / Meru)
    coast: [39.8, -3.6], // Kilifi / Mombasa Coastal Strip
    shire: [38.5, -0.5], // Middle Tana / Kitui Semi-Arid Belt
  },

  // Cyclone eye trajectory parameters (tracking toward Mombasa / Malindi / Lamu coast)
  cycloneTrack: {
    startLon: 43.4,
    lonDelta: -4.2,
    baseLat: -3.8,
    latArc: 0.95,
  },

  // 9 Primary Kenyan Regional Stations [name, lon, lat, note, elevM]
  regions: [
    ['Nairobi', 36.82, -1.29, 'Highland capital & Athi headwaters', 1795],
    ['Mombasa', 39.67, -4.04, 'Indian Ocean port & coastal island', 18],
    ['Kisumu', 34.76, -0.09, 'Lake Victoria Winam Gulf & Kano plains', 1131],
    ['Nakuru', 36.08, -0.3, 'Central Rift Valley & Menengai crater', 1850],
    ['Eldoret', 35.27, 0.52, 'Uasin Gishu plateau & Cherangany slopes', 2090],
    ['Nyeri (Mt. Kenya)', 36.95, -0.42, 'Mt. Kenya & Aberdare tea/coffee belt', 1760],
    ['Garissa', 39.64, -0.45, 'Middle Tana River basin & arid plains', 150],
    ['Lodwar (Turkana)', 35.6, 3.12, 'Turkwel basin & Jade Sea rift valley', 500],
    ['Malindi & Lamu', 40.12, -3.22, 'Sabaki estuary & northern Swahili coast', 12],
  ],

  // 3D Diorama Metadata & Camera Vantages for the 9 Kenyan Regional Stations
  landmarkMeta: [
    {
      idx: 0,
      city: 'Nairobi',
      landmarkName: 'KICC Helipad Tower & Expressway',
      archName: 'Upper Hill / CBD Skyline & Uhuru Park',
      basinLabel: 'Nairobi / Athi-Galana Headwaters',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.05, thOff: 0.25 },
        landmark: { dx: 0.25, dz: -0.15, d: 11.5, ph: 1.12, thOff: -0.35 },
        basin: { dx: 1.2, dz: 1.0, d: 24.0, ph: 0.88, thOff: 0.45 },
      },
    },
    {
      idx: 1,
      city: 'Mombasa',
      landmarkName: 'Kilindini Port Cranes & Mombasa Tusks',
      archName: 'Mombasa Island, Fort Jesus & Harbor',
      basinLabel: 'Tudor Creek & Coastal Indian Ocean',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.0, ph: 1.06, thOff: 0.35 },
        landmark: { dx: 0.75, dz: 0.25, d: 11.5, ph: 1.14, thOff: 0.8 },
        basin: { dx: -1.1, dz: 1.4, d: 23.5, ph: 0.88, thOff: 0.15 },
      },
    },
    {
      idx: 2,
      city: 'Kisumu',
      landmarkName: 'Winam Gulf Pier & Kit Mikayi Tor',
      archName: 'Kisumu Port & Kano Floodplain',
      basinLabel: 'Lake Victoria & Nyando / Sondu Basin',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.04, thOff: -0.3 },
        landmark: { dx: -0.55, dz: 0.2, d: 11.8, ph: 1.12, thOff: -0.75 },
        basin: { dx: -1.4, dz: 0.8, d: 24.0, ph: 0.88, thOff: -0.4 },
      },
    },
    {
      idx: 3,
      city: 'Nakuru',
      landmarkName: 'Menengai Volcanic Caldera & Flamingo Lake',
      archName: 'Rift Valley Floor & Geothermal Steam Field',
      basinLabel: 'Central Rift Endorheic Lake Basin',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.04, thOff: 0.2 },
        landmark: { dx: 0.35, dz: -0.45, d: 12.2, ph: 1.08, thOff: -0.35 },
        basin: { dx: 0.8, dz: 1.2, d: 23.5, ph: 0.86, thOff: 0.4 },
      },
    },
    {
      idx: 4,
      city: 'Eldoret',
      landmarkName: 'Kerio Escarpment & Highland Grain Silos',
      archName: 'Uasin Gishu Plateau & Rift Rim',
      basinLabel: 'Sosiani / Nzoia Upper Catchment',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.0, ph: 1.05, thOff: 0.2 },
        landmark: { dx: 0.4, dz: 0.2, d: 11.8, ph: 1.1, thOff: -0.3 },
        basin: { dx: -1.0, dz: 1.2, d: 23.5, ph: 0.88, thOff: 0.5 },
      },
    },
    {
      idx: 5,
      city: 'Nyeri (Mt. Kenya)',
      landmarkName: 'Batian & Nelion Peaks (5,199m) & Tea Estates',
      archName: 'Central Highlands & Aberdare Slopes',
      basinLabel: 'Upper Tana & Ewaso Ng’iro Headwaters',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.04, thOff: 0.15 },
        landmark: { dx: 1.2, dz: -1.1, d: 13.5, ph: 0.96, thOff: -0.45 },
        basin: { dx: 1.4, dz: 1.2, d: 24.0, ph: 0.88, thOff: 0.35 },
      },
    },
    {
      idx: 6,
      city: 'Garissa',
      landmarkName: 'Tana River Bridge & Garissa Solar Array',
      archName: 'Tana River Floodplain & Rangeland Hub',
      basinLabel: 'Middle Tana Alluvial Basin',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.0, ph: 1.06, thOff: 0.3 },
        landmark: { dx: 0.45, dz: 0.25, d: 11.8, ph: 1.12, thOff: 0.65 },
        basin: { dx: -0.8, dz: 1.5, d: 23.5, ph: 0.88, thOff: 0.2 },
      },
    },
    {
      idx: 7,
      city: 'Lodwar (Turkana)',
      landmarkName: 'Turkana Wind Farm & Central Island Crater',
      archName: 'Jade Sea Shoreline & Turkwel Oasis',
      basinLabel: 'Turkwel & Lake Turkana Rift Basin',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.04, thOff: 0.25 },
        landmark: { dx: 0.8, dz: -0.4, d: 12.5, ph: 1.08, thOff: 0.55 },
        basin: { dx: 1.6, dz: -1.2, d: 24.5, ph: 0.86, thOff: 0.15 },
      },
    },
    {
      idx: 8,
      city: 'Malindi & Lamu',
      landmarkName: 'Vasco da Gama Pillar & Swahili Dhows',
      archName: 'Sabaki River Mouth & Coral Coast',
      basinLabel: 'Athi-Galana-Sabaki Estuary',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.0, ph: 1.06, thOff: 0.4 },
        landmark: { dx: 0.7, dz: 0.2, d: 11.5, ph: 1.12, thOff: 0.85 },
        basin: { dx: -1.0, dz: 1.4, d: 23.5, ph: 0.88, thOff: 0.15 },
      },
    },
  ],

  geoLabels: [
    ['Mt. Kenya · 5,199 m', 37.31, -0.15, 4.4, 'peak'],
    ['Mt. Elgon · 4,321 m', 34.55, 1.14, 3.3, 'peak'],
    ['Aberdare Range · 4,001 m', 36.65, -0.42, 3.0, 'peak'],
    ['Maasai Mara Reserve', 35.15, -1.45, 1.5, 'land'],
    ['Tsavo National Park', 38.55, -2.95, 1.2, 'land'],
    ['Lake Turkana (Jade Sea)', 36.25, 3.45, 0.9, 'lake'],
    ['Lake Victoria (Winam Gulf)', 34.35, -0.25, 0.9, 'lake'],
    ['Great Rift Valley', 36.15, 0.45, 1.6, 'land'],
    ['Lamu Archipelago', 40.98, -2.22, 0.9, 'island'],
    ['Indian Ocean', 41.2, -3.5, 0.6, 'ocean'],
  ],

  towns: [
    ['Thika', 37.07, -1.03, 1.2],
    ['Machakos', 37.26, -1.52, 1.05],
    ['Meru', 37.65, 0.05, 1.1],
    ['Embu', 37.45, -0.53, 1.0],
    ['Nanyuki', 37.07, 0.02, 1.0],
    ['Naivasha', 36.43, -0.72, 1.1],
    ['Narok', 35.87, -1.08, 0.95],
    ['Kericho', 35.28, -0.37, 1.05],
    ['Kakamega', 34.75, 0.28, 1.1],
    ['Kitale', 35.0, 1.02, 1.0],
    ['Bungoma', 34.56, 0.57, 1.0],
    ['Voi', 38.56, -3.39, 0.9],
    ['Kilifi', 39.85, -3.63, 1.0],
    ['Lamu', 40.9, -2.27, 0.95],
    ['Wajir', 40.06, 1.75, 0.85],
    ['Mandera', 41.86, 3.94, 0.85],
    ['Marsabit', 37.99, 2.33, 0.85],
    ['Isiolo', 37.58, 0.35, 0.95],
  ],

  // 27 Dedicated Kenyan Open-Meteo Stations (first 9 match regions[0..8])
  stations27: [
    { name: 'Nairobi', lon: 36.82, lat: -1.29, baseTemp: 23.8 },
    { name: 'Mombasa', lon: 39.67, lat: -4.04, baseTemp: 29.8 },
    { name: 'Kisumu', lon: 34.76, lat: -0.09, baseTemp: 27.6 },
    { name: 'Nakuru', lon: 36.08, lat: -0.3, baseTemp: 24.2 },
    { name: 'Eldoret', lon: 35.27, lat: 0.52, baseTemp: 22.0 },
    { name: 'Nyeri', lon: 36.95, lat: -0.42, baseTemp: 22.5 },
    { name: 'Garissa', lon: 39.64, lat: -0.45, baseTemp: 33.4 },
    { name: 'Lodwar', lon: 35.6, lat: 3.12, baseTemp: 34.2 },
    { name: 'Malindi', lon: 40.12, lat: -3.22, baseTemp: 29.6 },
    { name: 'Thika', lon: 37.07, lat: -1.03, baseTemp: 25.0 },
    { name: 'Machakos', lon: 37.26, lat: -1.52, baseTemp: 24.5 },
    { name: 'Meru', lon: 37.65, lat: 0.05, baseTemp: 23.5 },
    { name: 'Embu', lon: 37.45, lat: -0.53, baseTemp: 24.2 },
    { name: 'Nanyuki', lon: 37.07, lat: 0.02, baseTemp: 21.8 },
    { name: 'Naivasha', lon: 36.43, lat: -0.72, baseTemp: 23.6 },
    { name: 'Narok', lon: 35.87, lat: -1.08, baseTemp: 23.2 },
    { name: 'Kericho', lon: 35.28, lat: -0.37, baseTemp: 21.6 },
    { name: 'Kakamega', lon: 34.75, lat: 0.28, baseTemp: 25.8 },
    { name: 'Kitale', lon: 35.0, lat: 1.02, baseTemp: 23.4 },
    { name: 'Bungoma', lon: 34.56, lat: 0.57, baseTemp: 25.6 },
    { name: 'Voi', lon: 38.56, lat: -3.39, baseTemp: 29.0 },
    { name: 'Kilifi', lon: 39.85, lat: -3.63, baseTemp: 29.5 },
    { name: 'Lamu', lon: 40.9, lat: -2.27, baseTemp: 29.8 },
    { name: 'Wajir', lon: 40.06, lat: 1.75, baseTemp: 33.8 },
    { name: 'Mandera', lon: 41.86, lat: 3.94, baseTemp: 34.5 },
    { name: 'Marsabit', lon: 37.99, lat: 2.33, baseTemp: 25.2 },
    { name: 'Isiolo', lon: 37.58, lat: 0.35, baseTemp: 28.4 },
  ],

  // Major Kenyan Urban Hubs for Instanced 3D Skylines [lon, lat, buildingCount, maxHeight, radius]
  cityHubs: [
    [36.82, -1.29, 260, 2.75, 2.3], // Nairobi (Upper Hill / Westlands / CBD high-rises)
    [39.67, -4.04, 150, 1.85, 1.6], // Mombasa
    [34.76, -0.09, 125, 1.5, 1.5],  // Kisumu
    [36.08, -0.3, 120, 1.45, 1.5],  // Nakuru
    [35.27, 0.52, 110, 1.4, 1.4],   // Eldoret
    [36.95, -0.42, 85, 1.15, 1.2],  // Nyeri
    [40.12, -3.22, 85, 1.15, 1.2],  // Malindi
    [39.64, -0.45, 75, 1.05, 1.1],  // Garissa
    [35.6, 3.12, 65, 0.95, 1.0],    // Lodwar
  ],

  // 5 Major Kenyan Transport & SGR Corridors
  corridors: [
    // 1. SGR & Northern Corridor: Mombasa -> Voi -> Mtito Andei -> Machakos -> Nairobi -> Naivasha -> Nakuru -> Eldoret -> Kisumu
    [
      [39.67, -4.04],
      [38.56, -3.39],
      [38.16, -2.69],
      [37.26, -1.52],
      [36.82, -1.29],
      [36.43, -0.72],
      [36.08, -0.3],
      [35.27, 0.52],
      [34.76, -0.09],
    ],
    // 2. Great North A2 Trans-African Highway: Nairobi -> Thika -> Nyeri -> Nanyuki -> Isiolo -> Marsabit -> Moyale
    [
      [36.82, -1.29],
      [37.07, -1.03],
      [36.95, -0.42],
      [37.07, 0.02],
      [37.58, 0.35],
      [37.99, 2.33],
      [39.05, 3.52],
    ],
    // 3. Eastern A3 Garissa-Wajir-Mandera Corridor
    [
      [37.07, -1.03],
      [38.05, -0.95],
      [39.64, -0.45],
      [40.06, 1.75],
      [41.86, 3.94],
    ],
    // 4. Western Rift A1 Highway: Nakuru -> Eldoret -> Kitale -> Kapenguria -> Lodwar -> Lokichoggio
    [
      [35.27, 0.52],
      [35.0, 1.02],
      [35.12, 1.65],
      [35.45, 2.35],
      [35.6, 3.12],
      [34.35, 4.2],
    ],
    // 5. Coastal B8 Highway: Vanga -> Mombasa -> Kilifi -> Malindi -> Garsen -> Lamu
    [
      [39.22, -4.67],
      [39.67, -4.04],
      [39.85, -3.63],
      [40.12, -3.22],
      [40.12, -2.27],
      [40.9, -2.27],
    ],
  ],

  // 9 Major Kenyan River Basins
  rivers: [
    {
      id: 0,
      name: 'Tana River Basin',
      basinName: 'Tana Catchment',
      catchmentKm2: '126,026 km²',
      lengthKm: '1,000 km',
      outlet: 'Indian Ocean at Ungwana / Kipini Bay (Tana Delta)',
      hydro: 'Seven Forks Hydro Cascade (Masinga, Kamburu, Gitaru, Kindaruma, Kiambere — 600+ MW)',
      significance:
        'Kenya’s longest and most vital river system, fed by Mt. Kenya and the Aberdares; generates over 50% of Kenya’s hydroelectricity.',
      width: 0.42,
      pts: [
        [36.85, -0.45],
        [37.35, -0.75],
        [37.95, -0.55],
        [38.75, -0.15],
        [39.64, -0.45],
        [40.05, -1.35],
        [40.12, -2.15],
        [40.52, -2.55],
      ],
    },
    {
      id: 1,
      name: 'Athi-Galana-Sabaki River',
      basinName: 'Athi Catchment',
      catchmentKm2: '70,000 km²',
      lengthKm: '390 km',
      outlet: 'Indian Ocean north of Malindi (Sabaki Estuary)',
      hydro: 'Thwake Multipurpose Dam & Mzima Springs Pipeline',
      significance:
        'Kenya’s second-longest river; drains Nairobi metropolitan basin across Tsavo East & Lugard Falls to the Swahili coast.',
      width: 0.36,
      pts: [
        [36.75, -1.32],
        [37.18, -1.45],
        [37.75, -2.05],
        [38.35, -2.68],
        [38.95, -3.05],
        [39.55, -3.15],
        [40.14, -3.16],
      ],
    },
    {
      id: 2,
      name: 'Ewaso Ng’iro North Basin',
      basinName: 'Ewaso Ng’iro North Catchment',
      catchmentKm2: '210,226 km²',
      lengthKm: '700 km',
      outlet: 'Lorian Swamp & Habaswein Arid Basin',
      hydro: 'Samburu / Buffalo Springs ecological lifeline & Archers Post gauge',
      significance:
        'Drains the northern slopes of Mt. Kenya and the Aberdare Range across Laikipia and Samburu into the arid northeast.',
      width: 0.32,
      pts: [
        [36.55, -0.15],
        [36.95, 0.35],
        [37.58, 0.62],
        [38.35, 0.85],
        [39.15, 0.95],
        [39.65, 1.05],
      ],
    },
    {
      id: 3,
      name: 'Nzoia River',
      basinName: 'Lake Victoria North Basin',
      catchmentKm2: '12,903 km²',
      lengthKm: '257 km',
      outlet: 'Lake Victoria at Port Victoria (Budalangi)',
      hydro: 'Lower Nzoia Flood Dykes & Webuye Falls',
      significance:
        'Drains Mt. Elgon and the Cherangany Hills into Lake Victoria; critical western agricultural watershed and Budalangi flood zone.',
      width: 0.3,
      pts: [
        [35.25, 0.95],
        [34.95, 0.72],
        [34.65, 0.52],
        [34.32, 0.32],
        [34.02, 0.12],
      ],
    },
    {
      id: 4,
      name: 'Yala River',
      basinName: 'Lake Victoria Basin',
      catchmentKm2: '3,351 km²',
      lengthKm: '219 km',
      outlet: 'Lake Victoria via Yala Swamp Papyrus Wetland',
      hydro: 'Ndanu Falls & Yala Swamp Reclamation Weir',
      significance:
        'Rises in the Nandi Escarpment and Kakamega rainforest, feeding Kenya’s largest freshwater papyrus wetland.',
      width: 0.25,
      pts: [
        [35.18, 0.22],
        [34.82, 0.15],
        [34.45, 0.08],
        [34.08, 0.02],
      ],
    },
    {
      id: 5,
      name: 'Sondu-Miriu & Nyando Rivers',
      basinName: 'Lake Victoria Winam Gulf Basin',
      catchmentKm2: '6,950 km²',
      lengthKm: '148 km',
      outlet: 'Winam Gulf of Lake Victoria (Kano Plains / Nyakach)',
      hydro: 'Sondu-Miriu (60 MW) & Sang’oro (21 MW) Hydroelectric Plants',
      significance:
        'Fed by the Mau Forest Complex; powers western Kenya’s grid while driving seasonal Kano Plains inundation during El Niño.',
      width: 0.27,
      pts: [
        [35.62, -0.48],
        [35.28, -0.38],
        [35.02, -0.32],
        [34.78, -0.25],
      ],
    },
    {
      id: 6,
      name: 'Mara River (Kenyan Upper Basin)',
      basinName: 'Transboundary Mara-Victoria Basin',
      catchmentKm2: '13,504 km²',
      lengthKm: '395 km',
      outlet: 'Crosses Maasai Mara into Serengeti & Lake Victoria',
      hydro: 'Enapuiyapui Swamp Mau Forest Source & Mara Bridge Gauge',
      significance:
        'Perennial lifeline of the Maasai Mara National Reserve, rising in the Mau Escarpment at 2,900m.',
      width: 0.28,
      pts: [
        [35.72, -0.68],
        [35.48, -0.98],
        [35.22, -1.28],
        [35.02, -1.52],
      ],
    },
    {
      id: 7,
      name: 'Turkwel & Kerio River Basin',
      basinName: 'Rift Valley / Lake Turkana Basin',
      catchmentKm2: '23,900 km²',
      lengthKm: '340 km',
      outlet: 'Lake Turkana Delta east of Lodwar',
      hydro: 'Turkwel Gorge Arch Dam (106 MW — Kenya’s tallest dam)',
      significance:
        'Flows north from Mt. Elgon and the Cherangany Escarpment through the arid Turkana Rift into the Jade Sea.',
      width: 0.32,
      pts: [
        [34.75, 1.18],
        [35.25, 1.65],
        [35.38, 2.25],
        [35.6, 3.12],
        [36.08, 3.08],
      ],
    },
    {
      id: 8,
      name: 'Daua River Basin',
      basinName: 'Jubba-Daua Tri-Border Basin',
      catchmentKm2: '34,000 km²',
      lengthKm: '450 km',
      outlet: 'Confluence at Mandera (Kenya–Ethiopia–Somalia Border)',
      hydro: 'Mandera border flood control & irrigation schemes',
      significance:
        'vital perennial river along Kenya’s far northeastern border in Mandera County.',
      width: 0.26,
      pts: [
        [39.85, 3.98],
        [40.55, 4.08],
        [41.25, 3.95],
        [41.85, 3.94],
      ],
    },
  ],
};
