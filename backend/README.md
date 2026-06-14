# iSON Xperiences HR Analytics API

Production-ready REST API backend for the iSON HR Analytics & Attrition Prediction platform.

## Stack

- **FastAPI** + **SQLAlchemy 2.0** + **PostgreSQL 15**
- **JWT** authentication with refresh tokens
- **RBAC** aligned with the React frontend (`AuthContext.tsx`)
- **Docker Compose** for local development

## Quick start (Docker)

```bash
cd backend
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

## Quick start (local)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
# Start PostgreSQL locally, then:
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

## Demo credentials

| Email | Password | Role |
|-------|----------|------|
| admin@ison.com | password123 | admin |
| manager@ison.com | password123 | hr-manager |
| analyst@ison.com | password123 | hr-analyst |
| head@ison.com | password123 | department-head |

## Phase 1 endpoints

### Phase 2 — ML & Risk
- `GET /api/v1/models` — List ML models
- `POST /api/v1/models/{id}/predict` — Run predictions
- `POST /api/v1/models/{id}/retrain` — Retrain with scikit-learn
- `GET /api/v1/predictions/at-risk` — At-risk employees
- `GET /api/v1/risk/*` — Risk analytics

### Phase 3 — Operations
- `GET /api/v1/reports/*` — Reports & forecasting
- `GET /api/v1/engagement/*` — Engagement analytics
- `GET/POST /api/v1/surveys` — Surveys
- `GET/PATCH /api/v1/alerts` — Alerts & detection
- `GET /api/v1/retention/strategies` — Retention decisions
- `POST /api/v1/pipelines/run` — Data processing
- `GET /api/v1/benchmarks/*` — Industry benchmarks
- `GET/PATCH /api/v1/settings/security` — Settings

## Frontend integration

Add to the React app `.env`:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

All responses use camelCase JSON:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "total": 100 } }
```

## Tests

```bash
pytest
```

## Project structure

```
backend/
├── app/
│   ├── api/v1/          # Route handlers
│   ├── core/            # Security, permissions, responses
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   └── main.py
├── scripts/seed.py      # Database seeding
├── tests/
├── docker-compose.yml
└── requirements.txt
```

## Next steps

- Wire React frontend to API endpoints (replace `mockBackend.ts` / `mockData.ts`)
- Add Celery workers for async ML retraining and report generation
- Deploy with Docker Compose in production
