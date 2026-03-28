<p align="center">
  <img src="https://images.squarespace-cdn.com/content/v1/62f5262a0b58c94a255a69ba/3039a9b7-41a9-4298-8ebf-db3ebfe25f22/HH+%28black%29%402x.png?format=1500w" alt="Hardian Health" width="250"/>
</p>

<br/>

# Hardian Health Regulatory Map

An interactive world map visualising medical device regulatory frameworks by country. Built for [hardianhealth.com](https://hardianhealth.com).

## Stack

![React](https://img.shields.io/badge/React_19-A37AF5?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5BCFFF?style=flat-square&logo=vite&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-49DAB0?style=flat-square&logo=leaflet&logoColor=white)

- [React 19](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Leaflet](https://leafletjs.com/) + [React Leaflet](https://react-leaflet.js.org/)
- [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Install dependencies
```bash
npm install
```

### Run locally
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for production
```bash
npm run build
```

### Deploy to GitHub Pages
```bash
npm run deploy
```

## Data

Country regulatory data is stored in `src/data/regulatoryData.json`. World map geometry is loaded from `public/countries.geo.json`.

## Live Site

[https://www.hardianhealth.com/regulatory-world-map](https://www.hardianhealth.com/regulatory-world-map)

## Licence

© 2026 Hardian Health. The regulatory data and content in this repository is licensed under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

You are free to share and adapt the material for **non-commercial purposes**, provided you give appropriate credit to Hardian Health and link back to [hardianhealth.com](https://hardianhealth.com).

The underlying source code is provided for reference and may not be used for commercial purposes without prior written permission.
