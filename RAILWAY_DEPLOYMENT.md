# Deploying to Railway.app

Railway is one of the easiest and cheapest ways to deploy modern applications. This guide walks through deploying the Sunset Repair Store ERP to Railway.

## Why Railway?

- ✅ **$5/month free credit** (real free tier, apps never sleep)
- ✅ **Easy deployment** - just `git push` or connect GitHub
- ✅ Native support for PostgreSQL, Redis, Node.js, Python
- ✅ Simple environment variables and secrets management
- ✅ Automatic SSL certificates for custom domains
- ✅ Excellent dashboard and logging
- 💰 After free credit: ~$5-20/month for typical usage

## Prerequisites

- [Railway Account](https://railway.app/) (free sign-up)
- Git repository initialized with all changes committed
- (Optional) [Railway CLI](https://docs.railway.app/guides/cli) for local development

## Setup Steps

### 1. Create Railway Account & Project

1. Go to [railway.app](https://railway.app/)
2. Sign up (GitHub login recommended)
3. Create a new project
4. Select "Deploy from GitHub" or "Deploy from Git" (via CLI)

### Option A: Deploy from GitHub (Easiest)

1. Click "Deploy from GitHub"
2. Authorize Railway to access your repositories
3. Select the `SunsetRepairStore` repository
4. Railway auto-detects the Dockerfile and deploys

### Option B: Deploy from Git CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create and deploy
cd c:\Users\calam\Desktop\SunsetRepairStore
railway init
railway up
```

### 2. Create Database Services

Railway makes adding services simple. In the Railway dashboard:

#### Add PostgreSQL
1. Click "Add Service" 
2. Select "PostgreSQL"
3. Railway automatically:
   - Creates the database
   - Sets `DATABASE_URL` environment variable
   - Handles backups and updates

#### Add Redis (optional but recommended)
1. Click "Add Service"
2. Select "Redis"
3. Railway automatically sets `REDIS_URL` environment variable

### 3. Configure Environment Variables

In Railway dashboard → Variables tab, set these variables:

```
APP_ENV=production
APP_DEBUG=false
APP_SECRET_KEY=REPLACE_WITH_SECURE_32_CHAR_SECRET_KEY_MIN_32_CHARS
JWT_SECRET_KEY=REPLACE_WITH_SECURE_JWT_SECRET_MIN_32_CHARS
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=REPLACE_WITH_AWS_ACCESS_KEY
S3_SECRET_KEY=REPLACE_WITH_AWS_SECRET_KEY
S3_BUCKET=REPLACE_WITH_S3_BUCKET_NAME
S3_REGION=us-east-1
S3_USE_SSL=true
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SMTP_HOST=REPLACE_WITH_SMTP_HOST
SMTP_PORT=587
SMTP_USER=REPLACE_WITH_SMTP_USER
SMTP_PASSWORD=REPLACE_WITH_SMTP_PASSWORD
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

**Important:**
- Generate strong random keys (32+ characters)
- Never commit secrets to Git
- Use AWS S3 for production file storage
- `DATABASE_URL` and `REDIS_URL` are automatically set by Railway

### 4. Deploy

Once services are added and variables are configured:

1. **If using GitHub:** Push to main branch
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push origin main
   ```

2. **If using CLI:**
   ```bash
   railway up
   ```

Railway will automatically build and deploy your application.

### 5. Initialize Database

Railway provides a button to execute one-off commands. In the dashboard:

1. Go to your project → Deployments tab
2. Click "New" → "Task"
3. Run migration:
   ```bash
   python -m alembic upgrade head
   ```

Or use Railway CLI:
```bash
railway run python -m alembic upgrade head
```

### 6. Verify Deployment

1. Get your Railway URL from the dashboard
2. Test health endpoint:
   ```bash
   curl https://your-railway-app.up.railway.app/health
   ```

3. Test API:
   ```bash
   curl https://your-railway-app.up.railway.app/api/v1/health
   ```

4. Visit frontend in browser

## Architecture

### Build Process

The `Dockerfile` (multi-stage build):
1. **Stage 1 (Frontend)**: Builds React app → `frontend/dist/`
2. **Stage 2 (Backend)**: 
   - Installs Python dependencies
   - Copies backend code
   - Copies built frontend from Stage 1
   - Ready to serve both API and frontend

### Request Routing

```
Request to https://your-app.up.railway.app/
    ├─ /api/v1/* → FastAPI API routes
    ├─ /health → Health check endpoint
    ├─ /assets/* → Static frontend assets
    └─ /* → Falls back to frontend/dist/index.html (SPA routing)
```

## Custom Domain

1. In Railway dashboard → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Railway provides CNAME record to add to your DNS provider
5. Update `CORS_ORIGINS` variable with your domain

SSL certificate is automatic!

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ENV` | Environment mode | `production` |
| `APP_DEBUG` | Enable debug mode | `false` |
| `APP_SECRET_KEY` | Secret key for sessions (32+ chars) | *generate new* |
| `DATABASE_URL` | PostgreSQL connection (auto-set) | *set by Railway* |
| `JWT_SECRET_KEY` | JWT signing key (32+ chars) | *generate new* |
| `S3_ENDPOINT` | S3 endpoint URL | `https://s3.amazonaws.com` |
| `S3_ACCESS_KEY` | AWS access key | *from AWS IAM* |
| `S3_SECRET_KEY` | AWS secret key | *from AWS IAM* |
| `S3_BUCKET` | S3 bucket name | `sunset-erp-prod` |
| `S3_REGION` | AWS region | `us-east-1` |
| `S3_USE_SSL` | Use HTTPS for S3 | `true` |
| `REDIS_URL` | Redis connection (auto-set) | *set by Railway* |
| `CORS_ORIGINS` | Allowed CORS origins | `https://yourdomain.com` |

## Scaling & Costs

### How Railway Charges

- **Compute**: $0.000579/hour per vCPU (shared)
- **Memory**: $0.0000463/GB/hour
- **Disk**: $0.10/GB/month

### Typical Monthly Costs

| Component | Usage | Cost |
|-----------|-------|------|
| Web service | 2 vCPU + 2GB RAM | $7-10 |
| PostgreSQL | 5GB | $2-5 |
| Redis | 1GB | $1-2 |
| Free credit | - | -$5 |
| **Total** | | **$5-12** |

### Scale Up

As your app grows, you can increase resources in the dashboard. Railway scales smoothly without downtime.

## Monitoring & Debugging

### View Logs
```bash
railway logs
```

Or in dashboard → Logs tab (real-time streaming)

### Check Database
```bash
railway run psql $DATABASE_URL
```

### Monitor Performance
Railway dashboard shows CPU, memory, and network metrics

### Common Issues

**App crashes on startup:**
```bash
railway logs --tail
# Look for error messages
```

**Database connection errors:**
```bash
railway run psql $DATABASE_URL
# Should connect successfully
```

**Frontend not loading:**
- Check `npm run build` completed in Docker build logs
- Verify `S3_BUCKET` and S3 credentials
- Check browser console for specific errors

**CORS errors:**
- Update `CORS_ORIGINS` with your domain
- Check Railway dashboard for environment variables

## CI/CD Integration

### Auto-Deploy on Push

If using GitHub:
1. Connect your GitHub repository
2. Railway auto-deploys on every push to main branch
3. Set up deployment protection: Settings → Deploy Protection

### Manual Deployments

Use Railway CLI to deploy at any time:
```bash
railway up
```

## Data Persistence

- **PostgreSQL**: Automatically backed up daily by Railway
- **Redis**: Data persists but is ephemeral (not backed up)
- **Files**: Store in AWS S3 (not on Railway)

### Backup Strategy

1. Use AWS S3 for all user-uploaded files
2. Set up AWS S3 automated backups
3. Enable PostgreSQL backup snapshots in Railway settings

## Production Checklist

- [ ] All environment variables set
- [ ] Database initialized and migrated
- [ ] CORS_ORIGINS updated with your domain
- [ ] AWS S3 bucket created and configured
- [ ] SSL certificate issued (automatic)
- [ ] Custom domain configured (if using)
- [ ] Health endpoints tested
- [ ] Logging configured
- [ ] Backup strategy implemented
- [ ] Admin user created in database

## Helpful Commands

```bash
# View deployment status
railway status

# Execute one-off command
railway run python -m alembic upgrade head

# Connect to database
railway run psql $DATABASE_URL

# View environment variables
railway variables

# View logs
railway logs --tail

# Redeploy current version
railway deploy
```

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Pricing](https://railway.app/pricing)
- [Railway Support](https://railway.app/support)
- [FastAPI + Railway Guide](https://docs.railway.app/guides/fastapi)

## Switching Away from Heroku?

If you previously had Heroku setup:
1. The Heroku `Procfile` is no longer needed (Railway uses `railway.json` and Dockerfile)
2. The `runtime.txt` is no longer needed
3. Everything else remains compatible
4. You can keep Heroku configs as backup

## Next Steps

1. Sign up at [railway.app](https://railway.app/)
2. Connect GitHub repository
3. Add PostgreSQL and Redis services
4. Set environment variables
5. Deploy and test!

The entire process takes ~10 minutes and you'll have a production app running with $5/month free credit.
