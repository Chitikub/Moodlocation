# MoodLocation

[ภาษาไทย](README.md) | **English**

MoodLocation is a web application that recommends places based on a user's mood, needs, and location. Users can discover nearby places, view place details and maps, manage favorites and visit history, and contact administrators through real-time chat.

## Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Run with Docker Compose](#run-with-docker-compose)
- [API Overview](#api-overview)

## Features

- Sign up and log in with email/password or Google, verify email, and reset passwords
- Search for nearby places and view details using Google Maps Platform
- Analyze user text and mood to suggest place searches with Groq AI
- Manage favorites, visit history, and user profiles
- Contact administrators through real-time chat rooms powered by Socket.IO
- Manage users, announcements, and contact rooms as an administrator
- Store uploaded images with Supabase Storage when configured

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, DaisyUI |
| Backend | Node.js 22, Express 4 |
| Database | PostgreSQL, Sequelize 6 |
| Real-time and cache | Socket.IO, Redis, Socket.IO Redis Adapter |
| Maps and places | Google Maps JavaScript API, Google Maps Places API |
| Mood analysis | Groq API (`groq-sdk`) |
| File storage | Supabase Storage (optional configuration) |
| Container deployment | Docker, Docker Compose, Nginx |

## Project Structure

```text
Moodlocation/
├── Backend/
│   ├── config/          # Database and Supabase configuration
│   ├── controllers/     # API business logic
│   ├── lib/             # Socket.IO and Redis integration
│   ├── middleware/      # Authentication and upload middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── utils/           # Emotion and place-category helpers
│   ├── uploads/         # Locally uploaded files
│   └── server.js        # Backend entry point
├── Frontend/
│   ├── public/          # Static assets
│   └── src/
│       ├── api/         # Axios configuration
│       ├── components/  # Reusable UI components
│       ├── data/        # Supporting data
│       ├── pages/       # User and administrator pages
│       ├── Routers/     # Frontend route definitions
│       ├── App.jsx      # Root component
│       └── main.jsx     # Frontend entry point
├── docker-compose.yml   # Frontend, Backend, PostgreSQL, Redis, and pgAdmin
├── README.md            # Thai documentation
└── README.en.md         # English documentation
```

## Local Development

### Prerequisites

- Node.js 22 and npm
- A running PostgreSQL instance
- Google Maps and Groq API keys for place search and mood analysis
- Redis is optional for local development; Socket.IO falls back to in-memory storage when Redis is not configured

### 1. Configure and run the Backend

Create `Backend/.env` and set the values described in [Environment Variables](#environment-variables). Then install dependencies and start the API:

```bash
cd Backend
npm install
npm run dev
```

The Backend runs at `http://localhost:5000`. Check `http://localhost:5000/` for its health response. On startup, it connects to PostgreSQL and synchronizes Sequelize models.

### 2. Configure and run the Frontend

Create `Frontend/.env` with the Backend URLs and frontend keys:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_IMAGE_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

Install dependencies and start Vite:

```bash
cd Frontend
npm install --legacy-peer-deps
npm run dev
```

Open the URL printed by Vite in the terminal (usually `http://localhost:5173`). Add this origin to the Backend's `CORS_ORIGIN` value.

Additional Frontend checks:

```bash
npm run lint
npm run build
```

## Environment Variables

### Backend (`Backend/.env`)

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=moodlocation
DB_USER=postgres
DB_PASSWORD=your-local-db-password
DB_SSL=false

JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=qwen/qwen3.8-27b

# Optional: Socket.IO and caching with Redis
REDIS_URL=redis://localhost:6379

# Optional: Supabase Storage
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-key
```

`DATABASE_URL` can be used instead of `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` when a provider supplies a connection string. Set `DB_SSL` according to the database provider's requirements.

Google sign-in requires the same OAuth Client ID in Backend's `GOOGLE_CLIENT_ID` and Frontend's `VITE_GOOGLE_CLIENT_ID`. Add the web origin to the allowed origins in Google Cloud Console.

### Frontend (`Frontend/.env`)

The Frontend reads `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `VITE_IMAGE_BASE_URL`, `VITE_GOOGLE_MAPS_API_KEY`, and `VITE_GOOGLE_CLIENT_ID`. Values prefixed with `VITE_` are embedded in the client build, so do not put Backend secrets in the Frontend environment.

## Run with Docker Compose

The root Compose file reads configuration from a root-level `.env` file. Create it before starting the services. At minimum, set the database values and the secrets/API keys required by the features you plan to use. For example:

```env
DB_NAME=moodlocation_db
DB_USER=postgres
DB_PASSWORD=replace-with-a-local-password
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
FRONTEND_URL=http://localhost:8080

GROQ_API_KEY=your-groq-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_IMAGE_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

Use the same `DB_NAME` for PostgreSQL and the Backend. Their Compose defaults currently differ, so explicitly setting it avoids a database-name mismatch.

Google sign-in can be configured for local development as described above. The current Compose configuration does not pass `VITE_GOOGLE_CLIENT_ID` into the Frontend build, so Google sign-in is not available in the Frontend image built by Compose.

Start the services:

```bash
docker compose up --build
```

When the containers are ready:

- Web application: `http://localhost:8080`
- Backend API: `http://localhost:5000`
- pgAdmin: `http://localhost:5050`
- PostgreSQL from the host: `localhost:5433`
- Redis: `localhost:6379`

Stop the services while keeping named volumes:

```bash
docker compose down
```

Do not commit `.env` files containing real credentials.

## API Overview

The API uses the `/api/v1` prefix:

| Prefix | Purpose |
| --- | --- |
| `/auth` | Registration, login, Google sign-in, email verification, and password reset |
| `/maps` | Place search and place details |
| `/ai` | Mood analysis and place-search suggestions |
| `/favorites` | Add or remove favorites and list saved places |
| `/history` | Create, view, and delete visit history |
| `/users` | Update profiles and change passwords |
| `/contact` | Create contact rooms and manage chat messages |
| `/admin` | Administrator user management |
| `/announcements` | View announcements and administrator management |

Example endpoints:

```text
GET  /api/v1/maps/search
GET  /api/v1/maps/details/:place_id
POST /api/v1/ai/analyze-emotion
GET  /api/v1/favorites
POST /api/v1/favorites/toggle
GET  /api/v1/history
```

Chat uses the REST API under `/api/v1/contact` together with Socket.IO for real-time communication.
