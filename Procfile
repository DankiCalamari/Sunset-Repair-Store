release: sh -c "cd backend && python -m alembic upgrade head"
web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT backend.app.main:app
