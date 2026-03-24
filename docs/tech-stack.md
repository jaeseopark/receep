# Tech Stack

## Core Technologies

### Backend

1. Language: Python 3.13.
2. Web framework: FastAPI.
3. Auth helpers: `fastapi_jwt_auth`, `pyjwt`, `bcrypt`, `pyotp`.
4. ORM: SQLAlchemy 2.x.
5. Database driver: `psycopg2-binary`.
6. Server: Uvicorn.

### Frontend

1. Language: TypeScript.
2. UI framework: Preact (with React-compatible packages where needed).
3. Build tool: Vite.
4. State management: `@preact/signals`.
5. Routing: `react-router-dom`.
6. HTTP client: Axios.

### Infrastructure

1. Reverse proxy: nginx.
2. Containers: Docker-based workflows.
3. Database: PostgreSQL.

## Notable Library Choices

1. `react-hook-form` for form handling.
2. `react-hot-toast` for user notifications.
3. `react-dropzone` for file intake UX.
4. `date-fns` for date logic.
5. `react-pivottable` for report-style data exploration.

## Runtime Environment Variables

Backend reads these environment variables:

1. `POSTGRES_PASSWORD`.
2. `JWT_KEY`.
3. `SIGNUP` (`OPEN`, `CLOSED`, or `INVITE_ONLY`).
4. `TOTP_ENABLED` (`1` enables TOTP checks).

For networking and deployment behavior, see [deployment.md](deployment.md).
