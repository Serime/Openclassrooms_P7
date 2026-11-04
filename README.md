# Orion CRM

A simplified Customer Relationship Management (CRM) application built with the MERN stack (modernized with TypeScript, Vite, and Prisma).

## Architecture

This project follows a monorepo structure with separate frontend and backend applications:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js 22 + Express 5 + TypeScript + Prisma

## Prerequisites

- **Node.js** >= 22.0.0
- **npm** >= 10.0.0

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd p7-dfsjs
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` if needed (default values should work for local development).

### 4. Initialize the database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Install frontend dependencies

```bash
cd ../client
npm install
```

### 6. Configure frontend environment

```bash
cp .env.example .env
```

## Running with Docker Compose

Requirements: Docker Engine 24+ with the Compose plugin (or Docker Desktop).

```bash
docker compose up -d --build
```

- Application: `http://localhost:4200` (nginx serves the front-end and proxies `/api` to the back-end)
- Health check: `http://localhost:4200/api/health`
- The back-end port is not published on the host; it is only reachable through nginx.
- Data is stored in the `orion-crm_db-data` volume and survives `docker compose down`. Prisma migrations are applied automatically when the back-end starts.

Useful variables (in the shell or a `.env` file next to `docker-compose.yml`):

| Variable | Default | Purpose |
|---|---|---|
| `TAG` | `latest` | image tag to build or run |
| `CLIENT_PORT` | `4200` | host port of the application |

```bash
docker compose ps
docker compose logs -f server
docker compose down
docker compose down -v
```

`docker compose down -v` also deletes the database volume.

## CI/CD pipeline

All automation lives in `.github/workflows/ci.yml`.

| Job | Runs on | What it does |
|---|---|---|
| Back-end | every run (Node 22, plus Node 24 nightly) | `npm ci`, `prisma generate`, lint, `tsc` build, Vitest with coverage |
| Front-end | every run (Node 22, plus Node 24 nightly) | `npm ci`, lint, type check, Vitest with coverage, Vite build |
| Dependency audit | every run | `npm audit --omit=dev --audit-level=high` for each app |
| SonarQube Cloud | pull requests, `main`, release tags, nightly | static analysis and quality gate |
| Docker images and smoke test | every run | builds both images, starts the stack, runs `scripts/smoke-test.sh`, checks data persistence, backup and restore; Grype image scan nightly |
| Image publication | push to `main` or `v*.*.*` tag | pushes `ghcr.io/serime/orion-crm-{server,client}:sha-<commit>` |
| Validation deployment | after publication | pulls the published images, starts them, runs the smoke test, then promotes the tags (`main` and `latest`, or `X.Y.Z` and `X.Y` for a release) |

Triggers: push on any branch, pull request to `main`, release tag `vX.Y.Z`, nightly at 02:00 UTC, manual run (`gh workflow run CI`).

Secrets and variables: `SONAR_TOKEN` (repository secret), `SONAR_ORGANIZATION` and `SONAR_PROJECT_KEY` (repository variables). Image publication uses the built-in `GITHUB_TOKEN`.

## Deployment

Published images are public on GitHub Container Registry. To deploy or update a machine, choose a tag (`latest`, `sha-<commit>` or a release `X.Y.Z`):

```bash
export TAG=latest
docker compose pull
docker compose up -d --no-build --wait
sh scripts/smoke-test.sh
```

Order: back up the database, pull the images, start the stack (the back-end applies the migrations and must be healthy before nginx starts), run the smoke test.

Rollback: run the same commands with the tag of the last stable version, for example `TAG=sha-3241247`. The database volume is kept across deployments; migrations are applied automatically at start-up. Going back before a migration requires restoring the backup taken before the deployment.

## Backup and restore

The only data to protect is the SQLite database in the `db-data` volume. `scripts/backup-db.sh` takes a consistent copy while the application is running (`VACUUM INTO`), stores it in `./backups/orion-<UTC timestamp>.db` and keeps the 14 most recent files (`BACKUP_DIR` and `KEEP` override these defaults). The `backups/` folder is ignored by git.

```bash
sh scripts/backup-db.sh
sh scripts/restore-db.sh backups/orion-20261104T092929Z.db
```

`restore-db.sh` checks the file, stops the stack, replaces the database and restarts the stack; migrations bring an older backup up to the current schema. Run the backup daily and before every deployment, for example with cron on the target machine:

```bash
0 2 * * * cd /opt/orion-crm && sh scripts/backup-db.sh >> /var/log/orion-backup.log 2>&1
```

Copy `backups/` to another disk or storage regularly. The CI job "Images Docker et smoke test" runs a backup, deletes the volume, restores it and checks the data on every run.

## Releases

Versioning follows [SemVer](https://semver.org): `vMAJOR.MINOR.PATCH`, with optional release candidates `vMAJOR.MINOR.PATCH-rc.N`. Releases are cut from `main` only; there are no release branches.

Creating a release is the only manual step: tag a commit of `main` and push the tag.

```bash
git tag -a v1.1.0-rc.1 -m "Orion CRM 1.1.0-rc.1"
git push origin v1.1.0-rc.1
```

`.github/workflows/release.yml` then:

1. checks the tag format and that the tagged commit belongs to `main`;
2. runs the tests and builds both applications;
3. packages `orion-crm-server-vX.Y.Z.tar.gz` (compiled back-end, Prisma schema and migrations) and `orion-crm-client-vX.Y.Z.tar.gz` (static front-end), with `SHA256SUMS.txt`, and rejects archives containing `.env` files, databases, source maps or `node_modules`;
4. starts the application from the archives on a clean runner;
5. publishes the GitHub release with notes generated from the commit messages (a release candidate is marked as pre-release).

The same tag makes `ci.yml` publish the Docker images `X.Y.Z` and `X.Y` (only `X.Y.Z-rc.N` for a release candidate).

Running the back-end from a release archive (Node.js 22):

```bash
tar -xzf orion-crm-server-vX.Y.Z.tar.gz
cd orion-crm-server-X.Y.Z
npm ci --omit=dev --ignore-scripts
npm run prisma:generate
cp .env.example .env
npm run prisma:deploy
node dist/index.js
```

The front-end archive contains static files to serve with any web server that proxies `/api` to the back-end (see `client/nginx.conf`).

## Monitoring with ELK

A separate Compose file runs Elasticsearch, Logstash, Kibana (8.19) and Filebeat on a developer machine. It is not part of the CI/CD pipeline. Allow about 4 GB of memory for Docker.

```bash
docker compose up -d
docker compose -f docker-compose-elk.yml up -d
```

- Kibana: `http://localhost:5601`, dashboards **Orion CRM - Supervision** (application logs) and **Orion CRM - Pipeline et DORA** (DORA metrics and pipeline KPIs), imported automatically by the `kibana-setup` service
- Elasticsearch: `http://localhost:9200`, indices `orion-logs-YYYY.MM.DD`
- Both ports are bound to `127.0.0.1` only; security is disabled for local use.

How logs flow:

1. The back-end writes one JSON line per event with Winston (`http_request` with method, path, status and duration; `unhandled_error`; `client_log` for errors reported by the browser through `POST /api/client-logs`).
2. nginx writes its access log as JSON (status, path, request time).
3. Filebeat reads the Docker logs of the `orion-crm` containers and sends them to Logstash.
4. Logstash parses the JSON, normalises the fields (`service`, `log.level`, `event.action`, `http.*`) and indexes them in Elasticsearch.
5. A second Logstash pipeline polls the public GitHub API (workflow runs every 5 minutes, deployments) and SonarQube Cloud (every 30 minutes) to index pipeline durations, results, lead time, deployments and quality measures.

```bash
docker compose -f docker-compose-elk.yml ps
docker compose -f docker-compose-elk.yml down
docker compose -f docker-compose-elk.yml down -v
```

## Running the Application

### Start the backend server

```bash
cd server
npm run dev
```

The API will be available at `http://localhost:8080`

### Start the frontend application

In a new terminal:

```bash
cd client
npm run dev
```

The application will be available at `http://localhost:4200`

## Available Scripts

### Backend (server/)

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

### Frontend (client/)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Lint code

## Project Structure

```
p7-dfsjs-starter/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client services
│   │   ├── types/         # TypeScript type definitions
│   │   ├── App.tsx        # Main App component
│   │   └── main.tsx       # Application entry point
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── server/                # Backend Express application
│   ├── src/
│   │   ├── controllers/   # Route handlers (HTTP layer)
│   │   ├── services/      # Business logic layer
│   │   ├── repositories/  # Data access layer
│   │   ├── models/        # Data models and schemas
│   │   ├── routes/        # API route definitions
│   │   └── index.ts       # Server entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
└── README.md
```

## Features

- **Dashboard**: View statistics and overview
- **Contacts Management**: Create, read, update, and delete contacts
- **Organizations Management**: Manage companies and link them to contacts
- **RESTful API**: Well-structured backend with Controller-Service-Repository pattern
- **Type Safety**: Full TypeScript support on frontend and backend
- **Modern UI**: Tailwind CSS with responsive design

## API Endpoints

### Organizations

- `GET /api/organizations` - Get all organizations
- `GET /api/organizations/:id` - Get organization by ID
- `POST /api/organizations` - Create new organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `GET /api/organizations/stats` - Get organization statistics

### Contacts

- `GET /api/contacts` - Get all contacts
- `GET /api/contacts/:id` - Get contact by ID
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/contacts/stats` - Get contact statistics

## Technology Stack

### Frontend

- **React 19**: Modern React with Hooks
- **TypeScript 5.x**: Static typing
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack Query**: Data fetching and caching
- **Axios**: HTTP client
- **React Router**: Client-side routing
- **Zustand**: Lightweight state management

### Backend

- **Node.js 22 LTS**: JavaScript runtime
- **Express 5**: Web framework
- **TypeScript 5.x**: Static typing
- **Prisma**: Modern ORM
- **SQLite**: Development database
- **Zod**: Runtime type validation
- **Vitest**: Testing framework

## Development Guidelines

### Code Style

- Use **TypeScript strict mode**
- No `any` types allowed
- Use **functional components** and hooks (no class components)
- Use `async/await` for asynchronous operations (no callbacks)
- Follow the **Controller-Service-Repository** pattern on the backend

### Architecture Principles

- **Separation of Concerns**: Clear separation between UI, business logic, and data access
- **Type Safety**: Define interfaces/types for all data structures
- **Custom Hooks**: Extract complex logic into reusable hooks
- **API Layer**: Centralized API calls in service files
- **Validation**: Use Zod schemas for input validation

## License

MIT
