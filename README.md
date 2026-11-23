# QuickShow MERN

A full-stack movie ticket booking project based on [GreatStack’s QuickShow tutorial](https://www.youtube.com/watch?v=Pez37wmUaQM). The starter includes a React client and an Express API connected to MongoDB.

- `client/` contains the React app, built with TypeScript, Vite, and Tailwind CSS v4.
- `server/` contains the Express API and Mongoose connection.

## Project structure

```text
client/src/
├── main.tsx       # React entry point
├── vite-env.d.ts  # Vite client types
├── app/           # App shell and global styles
│   ├── App.tsx
│   ├── AppProviders.tsx
│   ├── AppRoutes.tsx
│   ├── layouts/
│   └── index.css
├── pages/         # Customer and admin screens
├── features/      # Auth, movies, seat booking, and admin code
└── shared/        # HTTP client, assets, formatting, and reusable UI

server/src/
├── config/        # MongoDB connection
├── controllers/   # Request handlers for app features
├── jobs/          # Inngest jobs
├── middleware/    # Authentication and authorization
├── models/        # Mongoose schemas and models
├── routes/        # Express routers, starting with the health endpoint
├── services/      # Integrations such as TMDB and Stripe
├── app.js         # Configures Express and mounts routes
└── index.js       # Connects to MongoDB and starts the server
```

The homepage and health endpoint are working. The rest of the tree contains starter files for feature branches. UI pages have basic headings, and the server tests are marked TODO until their features are implemented.

## Run locally

Use Node.js 24 LTS or newer, npm, and a running local MongoDB instance or MongoDB Atlas database.

From the repository root, start the client in one PowerShell terminal.

```powershell
Set-Location client
npm.cmd ci
npm.cmd run dev
```

Open the URL printed by Vite. The page displays **QuickShow**.

From the repository root, start the API in a second PowerShell terminal.

```powershell
Set-Location server
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Copy the example file once. Its default URI points to a local MongoDB instance. If you use Atlas, set `MONGODB_URI` in `server/.env` to your Atlas connection string. The `.env` file is ignored by Git.

## Verify the setup

With the API running, run the health check in PowerShell. The response should show `status` as `ok` and `database` as `connected`.

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

From `client/`, run the lint, type, and production build checks.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```
