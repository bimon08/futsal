# Futsal Manager ⚽

A fast, mobile-friendly, local-first Progressive Web App (PWA) designed for managing futsal court bookings, 24-hour schedules, and payment statuses.

## Features

- 🕒 **24-Hour Court Management**: Full 24-hour daily timeline (Night, Morning, Afternoon, Evening) with drag-adjustable time section boundaries.
- 💳 **Simplified Payment Tracking**: Instant Paid / Unpaid toggle with clear visual status indicators.
- 📱 **Progressive Web App (PWA)**:
  - Installable to desktop or mobile home screen with one tap (`Install App` button).
  - Standalone app experience without browser URL bars.
  - Offline-ready caching with custom Service Worker.
- 💾 **Local-First Storage**: Instant reactivity with persistent `localStorage` synchronization.
- 🎨 **Modern Dark UI**: Designed with Tailwind CSS v4, Lucide icons, and smooth micro-interactions.

## Getting Started

Run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Components**: [Base UI](https://base-ui.com/) & [shadcn/ui](https://ui.shadcn.com/)
