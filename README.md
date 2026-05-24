# Mindes

A hierarchical task manager built as a PWA + Android app. Designed for personal use — fast, offline-capable, and mobile-first.

## Features

- **Projects** — each project is a card with color, description, deadline and priority
- **Task tree** — unlimited nesting: navigate into any task and see its subtasks
- **Branch stats** — desktop sidebar shows progress, priority breakdown and upcoming deadlines
- **Today / Archive overlays** — quickly see overdue, today's and this-week's tasks across all projects
- **Repeat tasks** — daily, weekly, monthly or custom intervals; deadline auto-advances on completion
- **Checklists** — per-task sub-items with progress bar
- **Reminders** — push notifications via the Web Notifications API
- **Background image** — set a custom background via URL
- **Dark / Light theme** — persisted, flash-free on load
- **PWA** — installable, works offline, service worker with stale-while-revalidate caching
- **Android** — packaged with Capacitor

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18 + Vite |
| Data | Firebase Firestore (offline persistence) |
| Auth | Firebase Auth (Google) |
| PWA | Custom service worker |
| Android | Capacitor 6 |
| Hosting | Firebase Hosting |

## Project structure

```
src/
  App.jsx              # Router + auth shell
  Mindmap.jsx          # Task tree view (main feature)
  ProjectsHome.jsx     # Projects grid + overlays
  BackgroundPanel.jsx  # Background picker
  utils.js             # Pure functions & tree helpers
  hooks.js             # Shared React hooks
  background.js        # Background URL persistence
  sync.js              # Firestore real-time sync
  auth.js              # Firebase Auth wrapper
  theme.js             # Dark/light theme + hook
  notifications.js     # Web Push scheduling
  firebase.js          # Firebase init
```

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/mindes.git
cd mindes
npm install

# 2. Set up Firebase
cp .env.example .env.local
# Fill in your Firebase project keys

# 3. Run dev server
npm run dev

# 4. Build for web
npm run build
```

## Notes

- Developed locally as a personal productivity tool; repository created after reaching a stable MVP
- Firebase Storage intentionally not used — background images stored as URLs in Firestore (stays on free tier)
- Firestore security rules restrict every user to their own data only
