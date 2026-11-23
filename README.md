# QuickShow MERN

QuickShow is a movie ticket booking app in development. The current setup runs a React homepage and an Express API that reports MongoDB connection health. The project follows [GreatStack’s QuickShow tutorial](https://www.youtube.com/watch?v=Pez37wmUaQM).

## Current status

- **The setup works locally.** Vite serves the QuickShow homepage, and the Express server connects to MongoDB through Mongoose and serves `GET /api/health`. GitHub Actions installs both apps, lints and builds the client, and runs the server test command.
- **Later branches will implement the scaffolded features.** These include Clerk sign-in and admin access, the movie catalog and favorites, show scheduling, seat booking, Stripe Checkout, and Inngest jobs for seat expiry and email. The three server feature tests are marked TODO. The Vercel configuration files are in place for the deployment step.

## Architecture

QuickShow uses a **client–server architecture**. The React client renders the storefront and admin screens. The Express REST API owns access checks, booking rules, and persistence in MongoDB.

### Frontend — feature-based React

The client uses **React, TypeScript, Vite, and Tailwind CSS v4**. Route-level pages compose features. Each feature keeps its UI, state, and API calls together.

| Path | Responsibility |
| --- | --- |
| [`client/src/main.tsx`](client/src/main.tsx) | Starts React and loads global styles. |
| [`client/src/app/`](client/src/app/) | App shell, providers, route composition, and storefront and admin layouts. The starter renders `Home.tsx`. |
| [`client/src/pages/`](client/src/pages/) | Customer and admin screens. |
| [`client/src/features/`](client/src/features/) | Feature-specific code for auth, movies, seat booking, and admin. |
| [`client/src/shared/`](client/src/shared/) | Reusable UI, base HTTP client, assets, and formatting helpers. |

Application and page code compose features. Features can use `shared/` for reusable code.

### Backend — layered Express monolith

The server uses **Node.js, JavaScript, Express, Mongoose, and MongoDB**. One Express application contains the API. Its code is organized by responsibility.

| Path | Responsibility |
| --- | --- |
| [`server/src/index.js`](server/src/index.js) and [`app.js`](server/src/app.js) | Connect to MongoDB, start the server, and mount HTTP routes. |
| [`server/src/config/`](server/src/config/) | Database connection and environment configuration. |
| [`server/src/routes/`](server/src/routes/) | Map HTTP endpoints to handlers. The starter mounts the health route. |
| [`server/src/middleware/`](server/src/middleware/) | Authentication, admin authorization, and error handling. |
| [`server/src/controllers/`](server/src/controllers/) | Read HTTP requests and format responses. |
| [`server/src/services/`](server/src/services/) | Business rules and provider integrations, including TMDB and Stripe. |
| [`server/src/models/`](server/src/models/) | Mongoose schemas for users, movies, shows, and bookings. |
| [`server/src/jobs/`](server/src/jobs/) | Inngest entry points for Clerk sync, seat expiry, and notifications. |

A typical feature request flows through a route and any applicable middleware to a controller. The controller calls a service, which uses Mongoose models when it needs to read or write MongoDB data.

## Run locally

Use **Node.js 24 LTS or newer**, npm, and a running local MongoDB instance or a MongoDB Atlas database. Run the following PowerShell commands in two terminals, each starting at the repository root.

**Client**

```powershell
Set-Location client
npm.cmd ci
npm.cmd run dev
```

Open the URL Vite prints to see the QuickShow homepage. [`client/.env.example`](client/.env.example) lists the public API URL and Clerk publishable key used by later features.

**API**

```powershell
Set-Location server
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
npm.cmd run dev
```

[`server/.env.example`](server/.env.example) defaults to port `5000` and the `quickshow` database on local MongoDB. For Atlas, set `MONGODB_URI` in `server/.env` to your Atlas connection string before starting the API. Git ignores local `.env` files.

## Verification

With the API running, check its MongoDB connection. The default endpoint returns HTTP `200` with `status: ok` and `database: connected` when the database is connected.

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

From `client/`, run lint, TypeScript checking, and the production build. The build also runs the type check.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

From `server/`, run the Node.js test runner. The admin access, seat reservation, and Stripe webhook cases are registered as TODOs.

```powershell
npm.cmd test
```

The [CI workflow](.github/workflows/ci.yml) runs on pull requests and pushes to `main`.
