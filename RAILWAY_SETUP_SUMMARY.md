# Railway Deployment Setup - Summary

## Why Railway Over Heroku?

| Feature | Railway | Heroku |
|---------|---------|--------|
| **Free Credit** | $5/month | None |
| **Min Cost (production)** | $5-20/month | $87-105/month |
| **App Sleep** | Never | Eco tier sleeps |
| **Setup Time** | ~10 min | ~30 min |
| **Build System** | Dockerfile | Buildpacks |
| **Database Cost** | Included in compute | $50+/month separate |
| **Redis Cost** | Included in compute | $30+/month separate |

## Files Created/Modified

### New Files
1. **Dockerfile** (root level)
   - Multi-stage build: Node.js frontend → Python backend
   - Builds frontend, copies to backend, serves both
   - Optimized for Railway deployment

2. **railway.json**
   - Railway configuration file
   - Specifies Dockerfile build method
   - Minimal, simple configuration

3. **RAILWAY_DEPLOYMENT.md**
   - Complete Railway deployment guide
   - Environment variable reference
   - Monitoring and scaling instructions

## How It Works

### Build Process
1. **Stage 1**: Node.js builds React app → `frontend/dist/`
2. **Stage 2**: Python installs dependencies, copies backend + built frontend
3. **Result**: Single Docker image with everything needed

### Deployment
1. Connect Railway to GitHub (or push via CLI)
2. Railway auto-detects `Dockerfile`
3. Builds image and deploys
4. Database services (PostgreSQL, Redis) auto-integrate

### URL Format
```
https://your-app-name-production.up.railway.app/
```

## Quick Deploy (GitHub)

1. Go to [railway.app](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub"
3. Select repository
4. Add PostgreSQL + Redis services
5. Set environment variables
6. Done! ✅

## Quick Deploy (CLI)

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

## Environment Variables to Set

**Secrets** (must generate strong keys):
- `APP_SECRET_KEY` - 32+ character random string
- `JWT_SECRET_KEY` - 32+ character random string

**AWS S3** (for file storage):
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`

**Email** (optional):
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

**CORS**:
- `CORS_ORIGINS` - Your domain(s)

**Auto-set by Railway**:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis)

## Database Migration

One-time setup:
```bash
railway run python -m alembic upgrade head
```

## Key Advantages

✅ **Cost**: 4-8x cheaper than Heroku  
✅ **Speed**: 10 minutes to deploy  
✅ **Reliability**: Apps never sleep  
✅ **Simplicity**: Dockerfile auto-detected  
✅ **Scaling**: Auto-scale resources  
✅ **SSL**: Automatic certificates  
✅ **Free Credit**: $5/month to start  

## Can Still Keep Heroku Setup

- `Procfile` (not used by Railway)
- `runtime.txt` (not used by Railway)
- `package.json` scripts

These won't interfere with Railway deployment. You can switch between platforms if needed.

## Next Steps

1. Read [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for detailed instructions
2. Sign up at [railway.app](https://railway.app/)
3. Deploy within 10 minutes
4. Optional: Remove Heroku files later if not needed

## Deployment Timeline

| Step | Time | Notes |
|------|------|-------|
| Sign up | 2 min | Free account |
| Connect repo | 2 min | GitHub OAuth |
| Add services | 2 min | PostgreSQL + Redis |
| Set variables | 2 min | Copy from .env.example |
| Deploy | 3-5 min | First build |
| Migrate DB | 1 min | railway run command |
| **Total** | **~15 min** | App live! |
