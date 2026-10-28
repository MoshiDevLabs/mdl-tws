// Tanzania (TZ) Complete Country Profile — Boundaries, 20 Peaks, 27 Live Stations, 9 Regions, 9 Rivers & Landmarks
import { GEO } from '../geo.js';

export const TANZANIA_PROFILE = {
  id: 'tz',
  name: 'Tanzania',
  flag: '🇹🇿',
  agency: 'TMA · SYNOPTIC ATLAS',
  agencyFull: 'Tanzania Meteorological Authority (TMA)',
  subtitle: 'Tanzania 3D Interactive Weather & Basin System',
  timezone: 'Africa%2FDar_es_Salaam',
  centerLon: 35.0,
  centerLat: -6.3,
  scale: 8.5,
  lonMin: 27.0,
  lonSpan: 16.0,
  latMax: 1.7,
  latSpan: 16.0,
  geo: GEO,

  // 20 Topographic Gaussian Massifs [lon, lat, amp, sigma]
  peaks: [
    [37.35, -3.07, 7.6, 1.85], // Mt Kilimanjaro (Kibo & Mawenzi)
    [36.75, -3.24, 4.4, 1.35], // Mt Meru
    [35.55, -3.18, 3.6, 3.4],  // Ngorongoro Crater Highlands
    [35.4, -4.44, 3.0, 1.4],   // Mt Hanang
    [38.35, -4.75, 3.1, 1.9],  // Usambara Mountains
    [37.75, -4.15, 2.7, 1.6],  // Pare Mountains
    [37.66, -7.1, 3.3, 1.95],  // Uluguru Mountains
    [36.5, -7.8, 3.2, 2.8],    // Udzungwa Escarpment
    [35.5, -8.5, 3.8, 4.6],    // Southern Highlands (Iringa / Njombe)
    [33.75, -9.15, 4.9, 2.7],  // Mt Rungwe & Kipengere Range
    [35.65, -10.68, 2.8, 4.2], // Matengo / Songea Highlands
    [37.8, -10.4, 1.85, 5.5],  // Ruvuma / Tunduru Southern Uplands
    [39.5, -10.2, 1.6, 3.2],   // Makonde Plateau (Mtwara / Newala)
    [38.0, -8.6, 1.45, 5.0],   // Selous / Nyerere Miombo Uplands
    [31.2, -7.8, 2.7, 4.2],    // Ufipa Plateau (Sumbawanga)
    [31.1, -6.2, 2.1, 4.5],    // Katavi / Mpanda Western Plateau
    [30.1, -4.6, 2.4, 3.2],    // Mahale / Kigoma Escarpment
    [32.1, -3.6, 1.85, 5.2],   // Geita / Kahama / Biharamulo Uplands
    [33.5, -5.5, 1.85, 14.0],  // Central East African Plateau
    [35.8, -5.8, 1.55, 9.5],   // Dodoma / Maasai Steppe Uplands
  ],

  // Synoptic Climate Anomaly Centers [lon, lat]
  climateCenters: {
    ne: [38.2, -4.5],
    vic: [32.5, -2.5],
    dar: [39.0, -7.0],
    sw: [33.0, -9.0],
    mt: [38.0, -10.5],
    cen: [35.8, -6.1],
    coast: [39.3, -6.8],
    shire: [36.8, -8.2],
  },

  // Cyclone eye trajectory parameters
  cycloneTrack: {
    startLon: 42.2,
    lonDelta: -4.6,
    baseLat: -8.4,
    latArc: 1.15,
  },

  // 9 Primary Regional Stations [name, lon, lat, note, elevM]
  regions: [
    ['Moshi', 37.34, -3.35, 'Kilimanjaro slopes & Pare foothills', 890],
    ['Tanga', 39.1, -5.07, 'Northern coast & Pangani basin', 45],
    ['Dar es Salaam', 39.28, -6.82, 'Coastal metropolis & Msimbazi basin', 24],
    ['Morogoro', 37.66, -6.82, 'Uluguru slopes & Kilombero valley', 510],
    ['Dodoma', 35.74, -6.17, 'Central semi-arid plateau capital', 1120],
    ['Mwanza', 32.9, -2.52, 'Lake Victoria southern shoreline', 1140],
    ['Kigoma', 29.63, -4.88, 'Lake Tanganyika eastern escarpment', 780],
    ['Mbeya', 33.46, -8.9, 'Southern Highlands agricultural belt', 1700],
    ['Mtwara', 40.18, -10.27, 'Southern coast & Ruvuma basin', 110],
  ],

  // 3D Diorama Metadata & Camera Vantages for the 9 Regional Stations
  landmarkMeta: [
    {
      idx: 0,
      city: 'Moshi',
      landmarkName: 'Kibo Crater & Uhuru Peak (5,895m)',
      archName: 'Foothills Coffee Estates & Moshi Town',
      basinLabel: 'Pangani Headwaters',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.06, thOff: 0.2 },
        landmark: { dx: 0.4, dz: -2.2, d: 13.5, ph: 0.96, thOff: -0.35 },
        basin: { dx: -0.8, dz: 2.5, d: 24.0, ph: 0.88, thOff: 0.5 },
      },
    },
    {
      idx: 1,
      city: 'Tanga',
      landmarkName: 'Tanga Deep-Water Jetty & Dhows',
      archName: 'Harbor Front & Sisal Estates',
      basinLabel: 'Pangani Estuary & Bay',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.0, ph: 1.05, thOff: 0.3 },
        landmark: { dx: 0.9, dz: 0.3, d: 11.8, ph: 1.12, thOff: 0.75 },
        basin: { dx: -1.2, dz: 1.8, d: 23.0, ph: 0.9, thOff: 0.1 },
      },
    },
    {
      idx: 2,
      city: 'Dar es Salaam',
      landmarkName: 'Tanzanite Bridge & Port Cranes',
      archName: 'Kivukoni CBD Towers & Harbor',
      basinLabel: 'Msimbazi & Coastal Basin',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.05, thOff: 0.35 },
        landmark: { dx: 0.85, dz: -0.35, d: 11.5, ph: 1.14, thOff: 0.85 },
        basin: { dx: -1.4, dz: 0.8, d: 24.0, ph: 0.88, thOff: -0.2 },
      },
    },
    {
      idx: 3,
      city: 'Morogoro',
      landmarkName: 'Uluguru Met Tower & SGR Viaduct',
      archName: 'Morogoro Municipality & Mindu Dam',
      basinLabel: 'Ngerengere / Ruvu Catchment',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.04, thOff: 0.15 },
        landmark: { dx: 0.5, dz: 0.6, d: 12.2, ph: 1.08, thOff: -0.4 },
        basin: { dx: 1.2, dz: -1.0, d: 23.5, ph: 0.88, thOff: 0.3 },
      },
    },
    {
      idx: 4,
      city: 'Dodoma',
      landmarkName: 'Bunge Parliament Rotunda Dome',
      archName: 'Government City & Nyerere Square',
      basinLabel: 'Central Plateau Semiarid Basin',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.0, ph: 1.06, thOff: 0.25 },
        landmark: { dx: 0.25, dz: 0.15, d: 11.2, ph: 1.14, thOff: -0.3 },
        basin: { dx: 0.8, dz: 1.4, d: 24.0, ph: 0.86, thOff: 0.6 },
      },
    },
    {
      idx: 5,
      city: 'Mwanza',
      landmarkName: 'Bismarck Rock & Victoria Ferries',
      archName: 'Rock City Granite Hills & Port',
      basinLabel: 'Lake Victoria Southern Gulf',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.04, thOff: -0.25 },
        landmark: { dx: -0.6, dz: -0.5, d: 11.5, ph: 1.12, thOff: -0.75 },
        basin: { dx: -1.5, dz: -1.2, d: 24.0, ph: 0.88, thOff: -0.4 },
      },
    },
    {
      idx: 6,
      city: 'Kigoma',
      landmarkName: 'MV Liemba Berth & Railway Terminus',
      archName: 'Kigoma Bay Deep-Water Port',
      basinLabel: 'Lake Tanganyika & Malagarasi',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.04, thOff: -0.45 },
        landmark: { dx: -0.7, dz: 0.2, d: 11.8, ph: 1.12, thOff: -0.9 },
        basin: { dx: 1.2, dz: 1.5, d: 24.0, ph: 0.88, thOff: -0.2 },
      },
    },
    {
      idx: 7,
      city: 'Mbeya',
      landmarkName: 'Loleza Escarpment & Ngozi Rim',
      archName: 'Southern Highlands Tea Terraces',
      basinLabel: 'Great Ruaha & Songwe Headwaters',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.5, ph: 1.02, thOff: 0.2 },
        landmark: { dx: 0.5, dz: 0.7, d: 12.5, ph: 1.08, thOff: -0.35 },
        basin: { dx: 1.8, dz: -1.2, d: 24.5, ph: 0.86, thOff: 0.45 },
      },
    },
    {
      idx: 8,
      city: 'Mtwara',
      landmarkName: 'Mtwara LNG Terminal & Deep Harbor',
      archName: 'Shangani Peninsula & Port Jetty',
      basinLabel: 'Ruvuma Estuary & Southern Coast',
      vantages: {
        skyline: { dx: 0, dz: 0, d: 15.0, ph: 1.06, thOff: 0.4 },
        landmark: { dx: 0.7, dz: 0.25, d: 11.5, ph: 1.12, thOff: 0.85 },
        basin: { dx: -1.0, dz: 1.6, d: 23.5, ph: 0.88, thOff: 0.15 },
      },
    },
  ],

  geoLabels: [
    ['Mt. Kilimanjaro · 5,895 m', 37.35, -3.07, 4.4, 'peak'],
    ['Mt. Meru · 4,562 m', 36.75, -3.24, 3.1, 'peak'],
    ['Ngorongoro Crater', 35.58, -3.18, 2.6, 'peak'],
    ['Serengeti National Park', 34.8, -2.4, 1.4, 'land'],
    ['Rufiji River Delta', 39.15, -7.85, 0.7, 'lake'],
    ['Lake Victoria', 32.7, -1.9, 0.8, 'lake'],
    ['Lake Tanganyika', 29.9, -6.4, 0.8, 'lake'],
    ['Lake Nyasa', 34.5, -10.8, 0.8, 'lake'],
    ['Zanzibar (Unguja)', 39.35, -6.15, 0.9, 'island'],
    ['Indian Ocean', 41.1, -7.5, 0.6, 'ocean'],
  ],

  towns: [
    ['Arusha', 36.68, -3.37, 1.4],
    ['Iringa', 35.69, -7.77, 1.0],
    ['Songea', 35.66, -10.68, 0.95],
    ['Singida', 34.76, -4.82, 0.9],
    ['Tabora', 32.8, -5.02, 1.05],
    ['Lindi', 39.71, -9.99, 0.85],
    ['Bukoba', 31.81, -1.33, 0.95],
    ['Musoma', 33.8, -1.5, 0.85],
    ['Sumbawanga', 31.62, -7.97, 0.9],
    ['Shinyanga', 33.42, -3.66, 0.95],
    ['Babati (Hanang)', 35.75, -4.22, 0.85],
    ['Njombe', 34.77, -9.34, 0.85],
    ['Mpanda', 31.07, -6.35, 0.8],
    ['Kilwa Masoko', 39.51, -8.91, 0.8],
    ['Bagamoyo', 38.9, -6.44, 0.9],
    ['Same', 37.75, -4.07, 0.75],
    ['Korogwe', 38.45, -5.15, 0.8],
    ['Zanzibar City', 39.2, -6.16, 1.35],
  ],

  // 27 Dedicated Tanzanian Open-Meteo Stations (first 9 match regions[0..8])
  stations27: [
    { name: 'Moshi', lon: 37.34, lat: -3.35, baseTemp: 26.5 },
    { name: 'Tanga', lon: 39.1, lat: -5.07, baseTemp: 29.2 },
    { name: 'Dar es Salaam', lon: 39.28, lat: -6.82, baseTemp: 29.6 },
    { name: 'Morogoro', lon: 37.66, lat: -6.82, baseTemp: 28.2 },
    { name: 'Dodoma', lon: 35.74, lat: -6.17, baseTemp: 27.8 },
    { name: 'Mwanza', lon: 32.9, lat: -2.52, baseTemp: 26.8 },
    { name: 'Kigoma', lon: 29.63, lat: -4.88, baseTemp: 27.0 },
    { name: 'Mbeya', lon: 33.46, lat: -8.9, baseTemp: 22.4 },
    { name: 'Mtwara', lon: 40.18, lat: -10.27, baseTemp: 29.4 },
    { name: 'Arusha', lon: 36.68, lat: -3.37, baseTemp: 24.8 },
    { name: 'Zanzibar', lon: 39.2, lat: -6.16, baseTemp: 29.5 },
    { name: 'Pemba', lon: 39.77, lat: -5.25, baseTemp: 29.2 },
    { name: 'Mafia Island', lon: 39.67, lat: -7.91, baseTemp: 29.4 },
    { name: 'Iringa', lon: 35.69, lat: -7.77, baseTemp: 23.8 },
    { name: 'Tabora', lon: 32.8, lat: -5.02, baseTemp: 28.4 },
    { name: 'Songea', lon: 35.66, lat: -10.68, baseTemp: 25.2 },
    { name: 'Bukoba', lon: 31.81, lat: -1.33, baseTemp: 25.0 },
    { name: 'Musoma', lon: 33.8, lat: -1.5, baseTemp: 26.4 },
    { name: 'Sumbawanga', lon: 31.62, lat: -7.97, baseTemp: 23.5 },
    { name: 'Lindi', lon: 39.71, lat: -9.99, baseTemp: 29.4 },
    { name: 'Singida', lon: 34.76, lat: -4.82, baseTemp: 26.8 },
    { name: 'Shinyanga', lon: 33.42, lat: -3.66, baseTemp: 28.0 },
    { name: 'Babati', lon: 35.75, lat: -4.22, baseTemp: 25.0 },
    { name: 'Njombe', lon: 34.77, lat: -9.34, baseTemp: 20.5 },
    { name: 'Mpanda', lon: 31.07, lat: -6.35, baseTemp: 27.2 },
    { name: 'Kilwa Masoko', lon: 39.51, lat: -8.91, baseTemp: 29.4 },
    { name: 'Same', lon: 37.75, lat: -4.07, baseTemp: 27.2 },
  ],

  // Major Urban Hubs for Instanced 3D Skylines [lon, lat, buildingCount, maxHeight, radius]
  cityHubs: [
    [39.28, -6.82, 240, 2.6, 2.2],
    [39.2, -6.16, 110, 1.35, 1.2],
    [36.68, -3.37, 130, 1.55, 1.5],
    [32.9, -2.52, 135, 1.6, 1.5],
    [35.74, -6.17, 125, 1.45, 1.6],
    [39.1, -5.07, 95, 1.25, 1.2],
    [33.46, -8.9, 105, 1.3, 1.4],
    [37.66, -6.82, 95, 1.2, 1.3],
    [37.34, -3.35, 90, 1.2, 1.2],
    [29.63, -4.88, 75, 1.1, 1.1],
    [40.18, -10.27, 75, 1.1, 1.1],
  ],

  // 5 Trunk Transport Corridors
  corridors: [
    [
      [39.28, -6.82],
      [38.6, -6.72],
      [37.66, -6.82],
      [36.6, -6.45],
      [35.74, -6.17],
      [34.76, -4.82],
      [33.8, -4.9],
      [32.8, -5.02],
      [31.3, -5.05],
      [29.63, -4.88],
    ],
    [
      [38.6, -6.72],
      [38.45, -5.15],
      [37.75, -4.07],
      [37.34, -3.35],
      [36.68, -3.37],
    ],
    [
      [37.66, -6.82],
      [36.7, -7.4],
      [35.69, -7.77],
      [34.77, -9.34],
      [33.46, -8.9],
    ],
    [
      [34.76, -4.82],
      [33.42, -3.66],
      [32.9, -2.52],
    ],
    [
      [39.28, -6.82],
      [39.15, -7.85],
      [39.51, -8.91],
      [39.71, -9.99],
      [40.18, -10.27],
    ],
  ],

  // 9 Major Tanzanian River Basins
  rivers: [
    {
      id: 0,
      name: 'Rufiji & Kilombero River Basin',
      basinName: 'Rufiji Basin',
      catchmentKm2: '177,429 km²',
      lengthKm: '600 km',
      outlet: 'Indian Ocean at Mafia Channel / Rufiji Delta',
      hydro: 'Julius Nyerere Hydropower Project (2,115 MW / JNHPP), Stiegler’s Gorge',
      significance:
        'Tanzania’s largest river basin, draining 20% of the entire country. High flood risk during El Niño.',
      width: 0.42,
      pts: [
        [35.2, -9.2],
        [35.85, -8.85],
        [36.45, -8.35],
        [36.95, -7.95],
        [37.55, -7.85],
        [38.25, -7.9],
        [38.85, -7.92],
        [39.32, -7.95],
      ],
    },
    {
      id: 1,
      name: 'Great Ruaha River',
      basinName: 'Rufiji Sub-Basin',
      catchmentKm2: '83,970 km²',
      lengthKm: '475 km',
      outlet: 'Confluence with Rufiji River in Selous',
      hydro: 'Mtera Reservoir Dam (80 MW) & Kidatu Hydroelectric Plant (204 MW)',
      significance:
        'Southern Highlands & Usangu wetlands lifeline; vital for Ruaha National Park wildlife & national power grid.',
      width: 0.32,
      pts: [
        [33.85, -8.85],
        [34.45, -8.4],
        [34.95, -7.85],
        [35.65, -7.45],
        [36.45, -7.5],
        [37.15, -7.65],
        [37.55, -7.85],
      ],
    },
    {
      id: 2,
      name: 'Pangani River Basin',
      basinName: 'Pangani Basin',
      catchmentKm2: '43,650 km²',
      lengthKm: '500 km',
      outlet: 'Indian Ocean at Pangani / Tanga Bay',
      hydro: 'Nyumba ya Mungu Reservoir (8 MW), Hale (21 MW), New Pangani Falls (68 MW)',
      significance:
        'Fed by glacial meltwaters from Mt. Kilimanjaro (5,895m) and Mt. Meru. Intensive agricultural irrigation.',
      width: 0.3,
      pts: [
        [37.15, -3.38],
        [37.45, -3.75],
        [37.65, -4.35],
        [38.05, -4.85],
        [38.55, -5.18],
        [38.98, -5.42],
      ],
    },
    {
      id: 3,
      name: 'Wami River',
      basinName: 'Wami-Ruvu Basin',
      catchmentKm2: '43,946 km²',
      lengthKm: '450 km',
      outlet: 'Indian Ocean at Saadani National Park',
      hydro: 'Proposed Kinyasungwe flood control reservoirs',
      significance:
        'Connects semi-arid Dodoma / Kaguru mountains to the Indian Ocean through Saadani coastal mangroves.',
      width: 0.25,
      pts: [
        [36.4, -6.15],
        [37.1, -6.28],
        [37.85, -6.25],
        [38.45, -6.18],
        [38.85, -6.12],
      ],
    },
    {
      id: 4,
      name: 'Ruvu River',
      basinName: 'Wami-Ruvu Basin',
      catchmentKm2: '17,700 km²',
      lengthKm: '316 km',
      outlet: 'Indian Ocean at Bagamoyo',
      hydro: 'Kidunda Dam & Upper/Lower Ruvu Water Treatment Plants',
      significance:
        'Primary freshwater lifeline supplying over 75% of Dar es Salaam’s metropolitan water demand.',
      width: 0.26,
      pts: [
        [37.65, -7.05],
        [38.05, -6.85],
        [38.45, -6.68],
        [38.75, -6.52],
        [38.9, -6.42],
      ],
    },
    {
      id: 5,
      name: 'Ruvuma River',
      basinName: 'Ruvuma & Southern Coast Basin',
      catchmentKm2: '155,500 km²',
      lengthKm: '800 km',
      outlet: 'Indian Ocean north of Cape Delgado (Mtwara)',
      hydro: 'Unity Bridge transboundary gauging corridor',
      significance:
        'Forms the southern international border between Tanzania and Mozambique; drains Songea & Makonde plateau.',
      width: 0.34,
      pts: [
        [35.45, -10.95],
        [36.35, -11.25],
        [37.35, -11.35],
        [38.35, -11.25],
        [39.25, -10.85],
        [39.85, -10.58],
        [40.38, -10.48],
      ],
    },
    {
      id: 6,
      name: 'Malagarasi River',
      basinName: 'Lake Tanganyika Basin',
      catchmentKm2: '130,000 km²',
      lengthKm: '475 km',
      outlet: 'Lake Tanganyika south of Kigoma (Ilagala Delta)',
      hydro: 'Igamba Falls Hydroelectric Project & Malagarasi-Muyovozi Ramsar Wetland',
      significance:
        'Tanzania’s second-longest river and the largest tributary feeding Lake Tanganyika (Congo River watershed).',
      width: 0.34,
      pts: [
        [30.95, -3.85],
        [31.25, -4.45],
        [31.15, -5.05],
        [30.65, -5.18],
        [30.15, -5.18],
        [29.8, -5.22],
      ],
    },
    {
      id: 7,
      name: 'Kagera River',
      basinName: 'Lake Victoria / Nile Headwaters',
      catchmentKm2: '60,000 km²',
      lengthKm: '597 km',
      outlet: 'Lake Victoria north of Bukoba',
      hydro: 'Rusumo Falls Regional Hydroelectric Project (80 MW)',
      significance:
        'The most distant headstream of the Nile River, flowing north along the Rwanda/Tanzania border into Lake Victoria.',
      width: 0.3,
      pts: [
        [30.55, -2.38],
        [30.78, -1.75],
        [30.92, -1.25],
        [31.38, -1.18],
        [31.78, -1.25],
      ],
    },
    {
      id: 8,
      name: 'Mara River',
      basinName: 'Lake Victoria Basin',
      catchmentKm2: '13,504 km²',
      lengthKm: '395 km',
      outlet: 'Lake Victoria at Musoma (Mara Bay Wetland)',
      hydro: 'Serengeti-Mara ecological flow reserve',
      significance:
        'Iconic transboundary river crossing the Serengeti National Park; world-famous Great Migration crossing.',
      width: 0.25,
      pts: [
        [35.15, -1.45],
        [34.75, -1.55],
        [34.25, -1.58],
        [33.85, -1.52],
      ],
    },
  ],
};
