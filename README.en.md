<p align="center">
  <img src="src/assets/logo.svg" width="112" alt="Day Garden logo">
</p>

<h1 align="center">Day Garden</h1>

<p align="center"><a href="README.md">简体中文</a> · English</p>

<p align="center"><strong>Weather, classical poetry, seasonal phenology, and daily habits in a quiet, lightweight personal dashboard.</strong></p>

<p align="center">
  <a href="https://day-garden.pages.dev/"><img src="https://img.shields.io/badge/Website-Cloudflare%20Pages-f38020?style=flat&amp;logo=cloudflare&amp;logoColor=white" alt="Website: Cloudflare Pages"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-f59e0b?style=flat" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Vue-3-42b883?style=flat&amp;logo=vuedotjs&amp;logoColor=white" alt="Vue: 3">
</p>

<p align="center">
  <a href="https://day-garden.pages.dev/">Live Demo</a> · <a href="#local-development">Quick Start</a> · <a href="LICENSE">License</a>
</p>

## Highlights

- **Aesthetic UI**: Frosted-glass cards, sage green / soft peach / subtle lavender palettes, botanical illustrations, fully responsive mobile drawer, and dark mode.
- **7-Day Weather Forecast**: Previous 2 days, today, and the next 4 days, with apparent temperature, precipitation probability, and UV index. Graceful fallback to cached or sample data when network requests fail.
- **Dynamic 3D Weather Canvas (three.js / WebGL)**: Sky at the top, earth at the bottom, life in between. Sky canopy renders realistic celestial motions: sun rising and setting according to local city times, moon phases, volumetric clouds, rain, snow, wind, mist, lightning, starry skies, and meteors. The garden floor features distant mountains, meandering streams, wooden cottages with warm lights, seasonal trees, and wildlife with 3D kinematic behaviors. Automatically throttles pixel ratio on mobile and falls back to 2D canvas when WebGL is unavailable.
- **105 Classical Poems**: Curated and recommended by solar terms and seasons, complete with full text, commentary, seasonal filters, and favorites.
- **47 Botanical & Phenological Guides**: Year-round coverage of plants, phenology, observation tips, and habitats.
- **Wellness & Daily Rituals**: 44 health reminders, 28 lifestyle recommendations, 116 workout suggestions, 103 quotes, 155 cultural sights, and 3 daily habits with persistent tracking across calendar dates.
- **Cloudflare Ecosystem Backend**: Seamless account login via Google OAuth or Email/Password, backed by Cloudflare Pages `_worker.js` and Cloudflare D1 serverless database.
- **1-Click Bilingual Switching**: Seamlessly toggle between Simplified Chinese and English via top navbar button or mobile drawer quick settings (`[L]` shortcut).

## Local Development

```powershell
npm ci
npm run db:local
# Create local .dev.vars with PASSWORD_PEPPER and optional OAuth credentials
npm run build      # Build frontend and Pages Functions _worker.js
npm run dev:cloud  # Cloudflare Pages + local D1 on port 8787
npm run dev        # Vue dev server on port 5180 with /api proxy
```

## License

[MIT](LICENSE)
