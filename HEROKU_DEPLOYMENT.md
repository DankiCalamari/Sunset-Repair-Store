# Deploying to Heroku

This guide walks through deploying the Sunset Repair Store ERP to Heroku.

## Prerequisites

- [Heroku Account](https://www.heroku.com/)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed and authenticated
- Git repository initialized with all changes committed

## Setup Steps

### 1. Create a Heroku App

```bash
heroku create your-app-name
```

This creates a new Heroku application and adds a `heroku` remote to your Git repository.

### 2. Add Required Heroku Add-ons

#### PostgreSQL Database
```bash
heroku addons:create heroku-postgresql:standard-0 -a your-app-name
```

#### Redis (for caching and background tasks)
```bash
heroku addons:create heroku-redis:premium-0 -a your-app-name
```

**Note:** Start with lower tiers and scale up as needed. See [pricing](https://www.heroku.com/pricing/add-ons).

### 3. Configure Environment Variables

Set all required environment variables in Heroku. Copy values from `.env.example`:

```bash
heroku config:set \
  APP_ENV=production \
  APP_DEBUG=false \
  APP_SECRET_KEY="your-secure-32-character-secret-key" \
  JWT_SECRET_KEY="your-secure-jwt-secret-key" \
  S3_ENDPOINT="https://s3.amazonaws.com" \
  S3_ACCESS_KEY="your-aws-access-key" \
  S3_SECRET_KEY="your-aws-secret-key" \
  S3_BUCKET="your-s3-bucket-name" \
  S3_REGION="us-east-1" \
  S3_USE_SSL="true" \
  CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com" \
  -a your-app-name
```

**Important Security Notes:**
- Generate strong random keys for `APP_SECRET_KEY` and `JWT_SECRET_KEY` (minimum 32 characters)
- Keep these values secret - never commit them to Git
- Use AWS S3 for production file storage (MinIO is dev-only)
- PostgreSQL and Redis URLs are automatically set by Heroku add-ons

### 4. Add a Node.js Buildpack

The app uses Node.js for frontend builds and Python for the backend:

```bash
heroku buildpacks:add heroku/nodejs -a your-app-name
heroku buildpacks:add heroku/python -a your-app-name
```

Verify the order:
```bash
heroku buildpacks -a your-app-name
```

Output should show Node.js before Python.

### 5. Deploy

Commit all changes and push to Heroku:

```bash
git add .
git commit -m "Add Heroku deployment configuration"
git push heroku main
```

(Replace `main` with your branch name if different)

### 6. Initialize Database

After successful deployment, initialize the database schema:

```bash
heroku run "python -m alembic upgrade head" -a your-app-name
heroku run "python -c 'from app.db.session import AsyncSessionLocal; from database.seed import initial_data; import asyncio; asyncio.run(initial_data())'" -a your-app-name
```

Alternatively, seed the database manually:
```bash
heroku pg:psql -a your-app-name < database/schema.sql
heroku pg:psql -a your-app-name < database/seed.sql
```

### 7. Verify Deployment

Check application logs:
```bash
heroku logs --tail -a your-app-name
```

Test the health endpoint:
```bash
curl https://your-app-name.herokuapp.com/health
```

Test API access:
```bash
curl https://your-app-name.herokuapp.com/api/v1/health
```

## Architecture

### Build Process

1. **Node.js Buildpack** (runs first)
   - Installs frontend dependencies: `npm install`
   - Builds React app: `npm run build`
   - Outputs to `frontend/dist/`

2. **Python Buildpack** (runs second)
   - Installs Python dependencies: `pip install -r backend/requirements.txt`
   - Backend is ready to serve

3. **Procfile** (defines how to run the app)
   - **Release**: Runs database migrations
   - **Web**: Starts Gunicorn with Uvicorn worker

### File Serving

- FastAPI serves API routes at `/api/v1/*`
- FastAPI serves built React frontend from `frontend/dist/`
- Static assets are served from `/assets/*`
- All other paths fall back to `index.html` for client-side routing (SPA)

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ENV` | Environment mode | `production` |
| `APP_DEBUG` | Enable debug mode | `false` |
| `APP_SECRET_KEY` | Secret key for sessions (32+ chars) | *generate new* |
| `DATABASE_URL` | PostgreSQL connection (auto-set) | *set by Heroku* |
| `JWT_SECRET_KEY` | JWT signing key (32+ chars) | *generate new* |
| `S3_ENDPOINT` | S3 endpoint URL | `https://s3.amazonaws.com` |
| `S3_ACCESS_KEY` | AWS access key | *from AWS IAM* |
| `S3_SECRET_KEY` | AWS secret key | *from AWS IAM* |
| `S3_BUCKET` | S3 bucket name | `sunset-erp-prod` |
| `S3_REGION` | AWS region | `us-east-1` |
| `S3_USE_SSL` | Use HTTPS for S3 | `true` |
| `REDIS_URL` | Redis connection (auto-set) | *set by Heroku* |
| `CORS_ORIGINS` | Allowed CORS origins | `https://yourdomain.com` |
| `SMTP_HOST` | Email SMTP host | *your provider* |
| `SMTP_PORT` | Email SMTP port | `587` |
| `SMTP_USER` | Email SMTP user | *your account* |
| `SMTP_PASSWORD` | Email SMTP password | *your password* |
| `SMTP_FROM_EMAIL` | Sender email address | `noreply@yourdomain.com` |

## Scaling

### Dyno Types

- **Eco**: Sleeps after 30 min of inactivity (free tier alternative)
- **Standard-1X**: Recommended for production MVP
- **Standard-2X**: For higher traffic
- **Performance**: For enterprise deployments

Scale your dyno:
```bash
heroku dyno:type standard-1x -a your-app-name
```

### Database Scaling

Monitor and upgrade as needed:
```bash
heroku pg:info -a your-app-name
```

## Troubleshooting

### View Logs
```bash
heroku logs --tail -a your-app-name
```

### Common Issues

**App crashes on startup:**
```bash
heroku logs --tail -a your-app-name
# Look for errors in output
```

**Database connection errors:**
```bash
heroku pg:psql -a your-app-name
# Should connect to database successfully
```

**Static files not loading:**
- Ensure `npm run build` completed successfully during build
- Check that `frontend/dist/` exists locally
- Verify `S3_BUCKET` and S3 credentials are correct

**CORS errors:**
- Update `CORS_ORIGINS` environment variable with your domain
- Check browser console for specific allowed origins

### Run Commands

Execute one-off commands:
```bash
# Run migrations manually
heroku run "python -m alembic upgrade head" -a your-app-name

# Access Python shell
heroku run "python -i" -a your-app-name

# Database shell
heroku pg:psql -a your-app-name
```

## Monitoring

### View Application Metrics
```bash
heroku metrics -a your-app-name
```

### Enable log drains for persistent logging
```bash
heroku drains:add syslog://your-log-service.com -a your-app-name
```

## Custom Domain

Set up a custom domain:

```bash
heroku domains:add yourdomain.com -a your-app-name
heroku domains:add www.yourdomain.com -a your-app-name
```

Then update your DNS provider with the provided Heroku DNS target.

## SSL/TLS

Heroku provides automatic SSL/TLS certificates (*.herokuapp.com). For custom domains, use Heroku's Automated Certificate Management (ACM):

```bash
heroku certs:auto:enable -a your-app-name
```

## Additional Resources

- [Heroku Python Support](https://devcenter.heroku.com/articles/python-support)
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Heroku PostgreSQL Documentation](https://devcenter.heroku.com/articles/heroku-postgresql)
- [Heroku Redis Documentation](https://devcenter.heroku.com/articles/heroku-redis)
- [Procfile Reference](https://devcenter.heroku.com/articles/procfile)
