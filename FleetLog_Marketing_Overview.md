# FleetLog — Company Vehicle Scheduler

**Modern, real‑time fleet management for growing companies.**

FleetLog is a cloud‑based vehicle scheduling system that eliminates the chaos of pen‑and‑paper logs, scattered spreadsheets, and miscommunication. It gives your entire team a single source of truth for trip requests, approvals, vehicle assignment, and driver tracking — accessible from any device with a browser.

---

## Why Your Company Needs FleetLog

| Pain Point | FleetLog Solution |
|---|---|
| Double‑booked vehicles | Real‑time conflict detection prevents overlapping trips |
| Lost paper logs | All trips stored securely in the cloud via Firebase |
| No visibility on fleet usage | Dashboard with live stats, calendar view, and vehicle/driver reports |
| Manual Excel reports | One‑click Excel export with 4 professionally formatted sheets |
| No backup | Google Sheets sync for instant online backup |
| Slow approval workflows | Role‑based access — Admin manages, Staff requests |

---

## Key Features & Advantages

### 1. Real‑Time Dashboard
- **At‑a‑glance stats** — Total trips, active today, upcoming, vehicles in use
- **Interactive calendar** — Month view with color‑coded trips, filterable by vehicle, driver, and status
- **Upcoming trips table** — Next 6 trips, always visible

### 2. Intelligent Trip Scheduling
- **Conflict detection** — Warns instantly if a vehicle or driver is already booked
- **Smart suggestions** — Auto‑completes existing vehicle names, drivers, and locations
- **Status lifecycle** — Scheduled → Ongoing → Completed / Cancelled

### 3. Role‑Based Access Control
| Role | Permissions |
|---|---|
| **Admin** | Full control — create, edit, update status, delete trips; access setup & configuration |
| **Staff** | Create trips, view all records, update trip status |

*First user automatically becomes Admin. No complicated setup.*

### 4. Powerful Reporting & Export
- **Excel Export** — 4 sheets with professional styling:
  - Summary (trip counts, vehicle & driver stats)
  - Trip Log (all trips with color‑coded status)
  - Vehicle Stats (per‑vehicle trip counts & drivers)
  - Driver Stats (per‑driver trip counts & vehicles)
- **Google Sheets Sync** — Automated online backup to your Google Sheet

### 5. Reliable Cloud Infrastructure
- **Firebase backend** — Google‑hosted, auto‑scaling, secure
- **Email/password authentication** — Built‑in, no third‑party dependencies
- **Real‑time sync** — Changes reflect instantly across all users
- **Dark mode** — Easy on the eyes, persists across sessions

---

## Who Is It For?

| Department | How They Benefit |
|---|---|
| **Operations** | Schedule vehicles & drivers without conflicts |
| **Admin / HR** | Track fleet usage, generate reports for audits |
| **Drivers** | See assigned trips, know their schedule |
| **Management** | Get visibility into fleet utilization |

---

## Technical Highlights

- **Frontend:** React 19 + Vite 8 — fast, modern SPA
- **Backend:** Firebase Firestore (NoSQL) + Firebase Auth
- **Export:** XLSX with full styling (xlsx-js-style)
- **Deployment:** Ready for Vercel / Firebase Hosting
- **Cross‑platform:** Works on desktop, tablet, and mobile browsers

---

## Getting Started

1. Deploy the app (Vercel, Firebase Hosting, or any static host)
2. Register the first account — automatically becomes **Admin**
3. Start adding trips — the team can see them immediately
4. Generate reports or sync to Google Sheets for backup

---

*FleetLog — simplifing fleet management, one trip at a time.*
