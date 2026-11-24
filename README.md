# QuickShow MERN

QuickShow is a movie ticket booking app in development. The current setup runs a React movie storefront, Clerk authentication, and an Express API with account and admin access checks. The project follows [GreatStack’s QuickShow tutorial](https://www.youtube.com/watch?v=Pez37wmUaQM).

## Current status

- **The setup works locally.** Vite serves the QuickShow homepage, and the Express server connects to MongoDB through Mongoose and serves `GET /api/health`. GitHub Actions installs both apps, lints and builds the client, and runs the server test command.
- **Clerk authentication.** The React app has sign-in and sign-up pages plus an account menu. Express verifies the Clerk session for account endpoints and checks the user's Clerk role for admin access.
- **Movie catalog and favorites.** Browse the public storefront, view movie details and trailers, and preview a sample screening. Signed-in users can save and remove movies in their own MongoDB-backed favorites list.
- **Upcoming features.** Live show scheduling, seat booking, Stripe Checkout, and Inngest jobs for Clerk user sync, seat expiry, and email. The Vercel configuration files are in place for deployment.

## Development plan

The roadmap covers all eight branches, what to build on each, and the criteria for merging. [QuickShow development plan (PDF)](docs/quickshow-mern-development-plan.pdf)

## Architecture

QuickShow uses a **client–server architecture**. The React client renders the storefront and admin screens. The Express REST API owns access checks, booking rules, and persistence in MongoDB.

### Frontend — feature-based React

The client uses **React, TypeScript, Vite, and Tailwind CSS v4**. Route-level pages compose features. Each feature keeps its UI, state, and API calls together.

| Path | Responsibility |
| --- | --- |
| [`client/src/main.tsx`](client/src/main.tsx) | Starts React and loads global styles. |
| [`client/src/app/`](client/src/app/) | App shell, providers, route composition, and storefront and admin layouts. Includes public pages and protected account and admin routes. |
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
| [`server/src/routes/`](server/src/routes/) | Map HTTP endpoints to handlers. Health and movie catalog routes are public. Account, favorites, and admin routes require Clerk. |
| [`server/src/middleware/`](server/src/middleware/) | Authentication, admin authorization, and error handling. |
| [`server/src/controllers/`](server/src/controllers/) | Read HTTP requests and format responses. |
| [`server/src/services/`](server/src/services/) | Business rules and provider integrations, including TMDB and Stripe. |
| [`server/src/models/`](server/src/models/) | Mongoose schemas for users, movies, shows, bookings, and favorites. |
| [`server/src/jobs/`](server/src/jobs/) | Inngest entry points for Clerk sync, seat expiry, and notifications. |

A typical feature request flows through a route and any applicable middleware to a controller. The controller calls a service, which uses Mongoose models when it needs to read or write MongoDB data.

## Run locally

Use **Node.js 24 LTS or newer**, npm, and a running local MongoDB instance or a MongoDB Atlas database. Run the following PowerShell commands in two terminals, each starting at the repository root.

Create a **Clerk development instance** and copy its keys into the local `.env` files. Use the same publishable key on both sides. The server secret belongs in `server/.env`. [Clerk React setup](https://clerk.com/docs/react/getting-started/quickstart)

| File | Local values |
| --- | --- |
| `client/.env` | `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL` (default `http://localhost:5000`). |
| `server/.env` | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `FRONTEND_ORIGIN` (default `http://localhost:5173`). |

Copy the `.env.example` file to `.env` in each folder if it doesn't already exist. Set `FRONTEND_ORIGIN` to the exact origin printed by Vite if it uses a different host or port.

**Client**

```powershell
Set-Location client
npm.cmd ci
npm.cmd run dev
```

Open the URL Vite prints to see the QuickShow homepage and its sign-in and sign-up controls.

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

From `server/`, run the Node.js test runner. The auth and catalog tests exercise access checks, movie details, future showtimes, and favorite ownership using controlled Clerk and storage responses. The seat reservation and Stripe webhook tests are still TODOs.

```powershell
npm.cmd test
```

The [CI workflow](.github/workflows/ci.yml) runs on pull requests and pushes to `main`.

### Verify Clerk access locally

1. Sign up two development users and confirm that the account menu appears when signed in.
2. In Clerk, set the admin test user's **private metadata** to `{"role":"admin"}`. Use `{}` for the other user. [Clerk user metadata](https://clerk.com/docs/guides/users/extending)
3. Visit `/my-bookings` while signed out. It should redirect to `/sign-in`. Sign in and confirm you can return to My Bookings.
4. Check `GET /api/users/me` and `GET /api/admin/access`. Both return `401` without a signed-in session. With a valid session, the account endpoint returns the caller's ID and role. The admin endpoint returns `403` for a regular user and `200` for an admin.
5. Visit `/admin` as each user. Confirm the regular user sees an access-denied message and the admin sees the dashboard scaffold.

### Verify the movie catalog locally

1. Open the homepage, select a trailer, and use **Explore movies** to browse the catalog.
2. Open a movie, check its cast, and use **Buy tickets** to jump to the sample showtimes. Select a date and time. Seat booking arrives in a later step.
3. Sign in, add that movie to Favorites, reload the Favorites page, then remove it. Sign in as a second user to confirm favorites belong to each account.
4. Open a detail URL with an unknown ID and confirm it shows **Movie not found**.

The catalog API reads the supplied fixtures from [`server/src/data/sampleCatalog.json`](server/src/data/sampleCatalog.json). It generates future sample showtimes displayed in the Colombo time zone. Catalog endpoints are `GET /api/movies` and `GET /api/movies/:movieId`. Favorites use `GET /api/favorites`, `PUT /api/favorites/:movieId`, and `DELETE /api/favorites/:movieId` with a Clerk session token. Live show data will replace the sample catalog in the admin scheduling step.
