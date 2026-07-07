# ReverseCode Arena

A web platform for hosting reverse engineering contests. Participants analyze compiled executables and write equivalent Python solutions.

## Architecture

```
┌────────────┐     ┌────────────┐     ┌──────────────┐
│  Frontend   │────▶│   Backend   │────▶│   Sandbox    │
│  :3000      │     │  :8000      │     │  :8080       │
│  React+Vite │     │  FastAPI    │     │  Python      │
│  Tailwind   │     │  Motor      │     │  subprocess  │
│  Monaco     │     │  JWT Auth   │     │  RLIMIT      │
└────────────┘     └─────┬───────┘     └──────────────┘
                         │
               ┌─────────┴──────────┐
               │                    │
         ┌─────▼─────┐       ┌──────▼─────┐
         │  MongoDB   │       │   Redis    │
         │  :27017    │       │  :6379     │
         └───────────┘       └────────────┘
```

## Quick Start

```bash
docker-compose up --build -d
```

| Service    | URL                                       |
|------------|-------------------------------------------|
| Frontend   | `http://localhost:3000`                   |
| Backend    | `http://localhost:8000/docs` (Swagger)    |
| MongoDB    | `mongodb://localhost:27017`               |

**Default admin credentials:** `admin` / `weguysfromcodingninjas`

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (dark theme)
- **Monaco Editor** (code editing with syntax highlighting)
- **Zustand** (state management)
- **React Router** (client-side routing)

### Backend
- **Python 3.11** + **FastAPI**
- **Motor** (async MongoDB driver)
- **PyJWT** (JWT auth)
- **Uvicorn** + **WatchFiles** (hot reload)

### Infrastructure
- **Docker Compose** (5 containers)
- **Nginx** (static file serving + API proxy)
- **MongoDB** (primary database)
- **Redis** (optional, for caching)
- **Sandbox container** (isolated code execution with `RLIMIT_CPU`/`RLIMIT_AS`)

## Features

### Admin
- Create/manage contests (draft → running → ended)
- Upload compiled executables (`.exe`, `.out`, `.bin`)
- Upload test cases (CSV/JSON bulk import)
- View participants, submissions, leaderboard
- Dashboard with contest statistics
- Register other admins

### Participant
- Join active contests by selecting from a dropdown
- Code editor with Monaco (Python, syntax highlighting)
- Run code with custom input
- Submit code for judging against hidden test cases
- View submission results (passed/failed test case details)
- Real-time leaderboard (WebSocket)

### Judge
- Submissions run against a compiled C executable in a sandbox
- CPU time limit (`RLIMIT_CPU`) and memory limit (`RLIMIT_AS`)
- stdout/stderr capture
- Test case comparison (exact match after stripping whitespace)
- Leaderboard auto-update via WebSocket broadcast

## API Endpoints

### Auth
| Method | Path                    | Description          |
|--------|-------------------------|----------------------|
| POST   | `/api/auth/admin/login` | Admin login          |
| POST   | `/api/auth/admin/register` | Register admin    |
| GET    | `/api/auth/admin/me`    | Current admin info   |

### Contests
| Method | Path                                  | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/contests/public/active`         | List running contests    |
| POST   | `/api/contests`                       | Create contest (admin)   |
| GET    | `/api/contests`                       | List contests (admin)    |
| GET    | `/api/contests/{id}`                  | Get contest (admin)      |
| PUT    | `/api/contests/{id}`                  | Update contest (admin)   |
| DELETE | `/api/contests/{id}`                  | Delete contest (admin)   |
| POST   | `/api/contests/{id}/start`            | Start contest (admin)    |
| POST   | `/api/contests/{id}/end`              | End contest (admin)      |
| POST   | `/api/contests/{id}/executable`       | Upload executable        |
| GET    | `/api/contests/{id}/status`           | Contest status           |

### Participants
| Method | Path                                    | Description              |
|--------|-----------------------------------------|--------------------------|
| POST   | `/api/participants/join`                | Join contest             |
| GET    | `/api/participants/contest/{id}`        | List participants (admin)|
| GET    | `/api/participants/contest/{id}/me`     | Get my participation     |

### Problems
| Method | Path                              | Description          |
|--------|-----------------------------------|----------------------|
| POST   | `/api/problems`                   | Create problem       |
| GET    | `/api/problems/contest/{id}`      | List problems        |
| GET    | `/api/problems/{id}`              | Get problem          |

### Test Cases
| Method | Path                                | Description            |
|--------|-------------------------------------|------------------------|
| POST   | `/api/testcases`                    | Create test case       |
| POST   | `/api/testcases/bulk`               | Bulk upload (CSV/JSON) |
| GET    | `/api/testcases/problem/{id}`       | List test cases        |
| DELETE | `/api/testcases/{id}`               | Delete test case       |

### Submissions
| Method | Path                                      | Description            |
|--------|-------------------------------------------|------------------------|
| POST   | `/api/submissions/run`                    | Run code (custom)      |
| POST   | `/api/submissions/submit`                 | Submit for judging     |
| GET    | `/api/submissions/participant/{id}`       | List my submissions    |
| GET    | `/api/submissions/{id}`                   | Get submission detail  |

### Leaderboard
| Method | Path                                      | Description            |
|--------|-------------------------------------------|------------------------|
| GET    | `/api/leaderboard/contest/{id}`           | Get leaderboard        |
| WS     | `/ws/contests/{id}/leaderboard`           | Real-time updates      |

## Test Case Format

### CSV
```csv
input,expected_output,test_order,is_sample
5,Odd,0,true
10,Even,1,true
100,Special,2,false
```

### JSON
```json
[
  {"input": "5", "expected_output": "Odd", "test_order": 0, "is_sample": true},
  {"input": "10", "expected_output": "Even", "test_order": 1, "is_sample": true}
]
```

## Environment Variables

| Variable              | Default                                    | Description          |
|-----------------------|--------------------------------------------|----------------------|
| `MONGODB_URL`         | `mongodb://mongodb:27017`                  | MongoDB connection   |
| `REDIS_URL`           | `redis://redis:6379`                       | Redis connection     |
| `JWT_SECRET_KEY`      | `your-super-secret-key-change-in-production` | JWT signing key    |
| `CORS_ORIGINS`        | `["http://localhost:3000"]`                | Allowed origins      |
| `DEBUG`               | `True`                                     | Debug mode           |
| `UPLOAD_DIR`          | `./uploads`                                | Executable storage   |
