# Heroku Deployment Configuration - Summary

## Files Created/Modified for Heroku Deployment

### New Files Created

#### 1. **Procfile**
Defines how Heroku runs your application:
- **Release phase**: Runs database migrations before app starts
- **Web process**: Starts Gunicorn with Uvicorn worker on the port assigned by Heroku

#### 2. **runtime.txt**
Specifies Python version: `3.12.3`
Ensures consistency between local development and Heroku environment.

#### 3. **.slugignore**
Lists files/directories Heroku should ignore during deployment (similar to .gitignore):
- Documentation files
- Test files
- Database seed files
- Node modules

#### 4. **package.json** (root level)
- Declares Node.js and Python version requirements
- Provides build script for frontend compilation
- Enables Heroku to detect and properly build both frontend and backend

#### 5. **HEROKU_DEPLOYMENT.md**
Comprehensive deployment guide with:
- Step-by-step setup instructions
- Environment variable reference
- Troubleshooting guide
- Scaling and monitoring information

### Modified Files

#### 1. **backend/requirements.txt**
✅ Added: `gunicorn==23.0.0`
- Required for production web server (Heroku doesn't provide uWSGI)
- Used by Procfile to serve the application

#### 2. **backend/app/core/config.py**
✅ Added `get_database_url` property
- Converts Heroku PostgreSQL URL format (`postgres://`) to asyncpg format (`postgresql+asyncpg://`)
- Handles both Heroku and local development environments

#### 3. **backend/app/db/session.py**
✅ Updated to use `get_database_url` instead of raw `database_url`
- Ensures proper database URL handling for Heroku PostgreSQL

#### 4. **backend/app/main.py**
✅ Added imports for serving static files:
- `Path`, `os` for file path handling
- `StaticFiles`, `FileResponse` for serving frontend

✅ Added static file serving logic:
- Mounts `/assets` directory for static assets
- Implements SPA catch-all route that falls back to `index.html`
- Prevents interference with API routes

## How It Works

### Deployment Flow

1. **Build Phase**
   - Node.js buildpack runs `npm install` and `npm run build` in frontend/
   - Frontend builds to `frontend/dist/`
   - Python buildpack installs `backend/requirements.txt`

2. **Release Phase**
   - Runs database migrations: `python -m alembic upgrade head`

3. **Runtime Phase**
   - Gunicorn starts with Uvicorn worker
   - FastAPI serves both API and frontend
   - Backend creates engine with correct database URL

### Request Routing

```
Request to https://your-app.herokuapp.com/
    ├─ /api/v1/* → FastAPI API routes
    ├─ /health → Health check endpoint
    ├─ /assets/* → Static frontend assets
    └─ /* → Falls back to frontend/dist/index.html (SPA routing)
```

## Required Heroku Add-ons

1. **Heroku PostgreSQL** - Database service
2. **Heroku Redis** - Caching and background tasks (optional but recommended)

These automatically set:
- `DATABASE_URL` environment variable
- `REDIS_URL` environment variable

## Key Configuration Points

### Database Migration
- **Automatic**: Runs in Release phase via Procfile
- **Manual**: `heroku run "python -m alembic upgrade head"`

### Frontend Static Files
- Built during Node.js buildpack phase
- Served by FastAPI from `frontend/dist/`
- SPA routing handled by fallback to `index.html`

### Environment Variables
See `HEROKU_DEPLOYMENT.md` for complete list. Key points:
- Secrets must be 32+ characters
- Use AWS S3 for production file storage
- CORS_ORIGINS must include your domain

### Buildpack Order
Critical! Must be:
1. `heroku/nodejs` (builds frontend first)
2. `heroku/python` (builds backend second)

## Next Steps

1. Review **HEROKU_DEPLOYMENT.md** for detailed deployment steps
2. Generate secure random keys for `APP_SECRET_KEY` and `JWT_SECRET_KEY`
3. Set up AWS S3 bucket for production file storage
4. Configure all environment variables in Heroku
5. Deploy with `git push heroku main`

## Testing Locally

Test the production setup locally:

```bash
# Build frontend
cd frontend && npm run build

# Set environment variables
export APP_ENV=production
export APP_DEBUG=false
# ... set other variables

# Run backend with Gunicorn
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app
```

Then visit: http://localhost:8000

## Troubleshooting

**Frontend not loading:**
- Check that `frontend/dist/` exists and contains `index.html`
- Verify S3 configuration for asset loading
- Check browser console for specific errors

**API errors:**
- Check database connection: `heroku pg:psql`
- Check Redis connection in Heroku logs
- Verify all environment variables are set correctly

**Migration errors:**
- Run manually: `heroku run "python -m alembic upgrade head"`
- Check schema compatibility with target database version

For more help, see **HEROKU_DEPLOYMENT.md** troubleshooting section.
