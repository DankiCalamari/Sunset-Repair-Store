# Login Issue - Troubleshooting Guide

## Problem
Setup says it's already completed but you can't login.

## Root Cause
- A business was previously created during setup, so the system says setup is complete
- BUT the user credentials that were created during that setup are either:
  1. Lost (you didn't save them)
  2. Incorrect
  3. The user account never got created properly

## Solutions

### Solution 1: Check What Users Exist (Quick Diagnostic)

Run the diagnostic tool:
```bash
cd /path/to/SunsetRepairStore
python3 db_diagnostic.py --check-users
```

This will show you:
- All businesses in the system
- All user accounts that exist
- Their email addresses and roles

### Solution 2: Create a New Test User

If you know there's a business but no users (or wrong users):

```bash
python3 db_diagnostic.py --create-test-user test@example.com password123
```

Then login with:
- Email: `test@example.com`
- Password: `password123`

### Solution 3: Complete Reset (Nuclear Option)

If you want to start completely fresh:

#### Option A: Using Docker (Recommended)
```bash
# Stop containers and remove volumes
docker compose down -v

# Restart - database will be fresh
docker compose up -d

# Now setup should be available at:
# http://localhost:5173/setup
```

#### Option B: Using the Diagnostic Tool
```bash
python3 db_diagnostic.py --reset-db
```

Follow the prompts and then:
1. Restart the backend: `docker compose restart api`
2. Go to http://localhost:5173/setup
3. Complete the setup form with your business and owner account details

### Solution 4: Direct Database Check

Connect directly to PostgreSQL:

```bash
# Connect to database
psql -U sunset -d sunset_erp -h localhost

# See all businesses
SELECT id, name, slug, created_at FROM businesses;

# See all users
SELECT id, email, full_name, role, is_active, created_at FROM users;

# See if there's a mismatch
SELECT b.name, u.email, u.role FROM businesses b
LEFT JOIN users u ON u.business_id = b.id;
```

## Common Issues & Fixes

### Issue: "Setup already completed" but no users exist
**Fix**: Run `python3 db_diagnostic.py --create-test-user user@example.com password123`

### Issue: Setup says complete, user exists, but login fails with "Invalid email or password"
**Possible causes**:
1. Typo in password
2. User is inactive (is_active = false)
3. Password hash corruption

**Fix**: Try recreating the user:
```bash
python3 db_diagnostic.py --create-test-user mynewuser@example.com NewPassword123
```

### Issue: Frontend says "Cannot reach the API"
**Fix**: Make sure backend is running:
```bash
docker compose logs api
docker compose up -d api
```

## Prevention for Next Time

When you complete setup:
1. **Save your credentials** somewhere safe (password manager)
2. **Screenshot the credentials** shown after setup
3. **Keep setup email** if sent

## Need More Help?

Check logs:
```bash
# API logs
docker compose logs api -f

# Database logs
docker compose logs db -f

# Frontend build errors
docker compose logs frontend -f
```

