# Database Reset Instructions

If you cannot login because setup was previously completed but you don't have the credentials, follow these steps to reset:

## Option 1: Reset via Docker (Recommended)

```bash
# 1. Stop and remove the database container
docker compose down -v

# 2. Restart services (this will recreate the database with fresh schema)
docker compose up -d

# 3. The database will be reset and you can now run setup again at:
# http://localhost:5173/setup
```

## Option 2: Manual Database Reset (if Docker isn't available)

```bash
# 1. Connect to PostgreSQL
psql -U sunset -d sunset_erp -h localhost

# 2. Drop all tables and recreate schema
# Run all commands from: database/schema.sql

# 3. Restart the API server
docker compose restart api
```

## Option 3: Check if User Exists in Database

If you want to verify credentials exist in the database:

```bash
# Connect to the database
psql -U sunset -d sunset_erp -h localhost

# List users
SELECT id, email, full_name, role, is_active FROM users;

# List businesses
SELECT id, name, slug FROM businesses;
```

## After Reset

Once the database is reset:
1. Navigate to http://localhost:5173/setup
2. Fill in your business and owner account details
3. You'll be immediately logged in with your new credentials
