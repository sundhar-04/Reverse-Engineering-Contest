.PHONY: setup dev build test clean

setup:
	cd frontend && npm install
	cd backend && pip install -r requirements.txt
	cd docker && docker build -t reversecode-sandbox .

dev:
	docker-compose up

dev-backend:
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	cd frontend && npm run dev

build:
	docker-compose build

test:
	cd backend && pytest
	cd frontend && npm run test

lint:
	cd frontend && npm run lint

clean:
	docker-compose down -v
	rm -rf frontend/node_modules backend/__pycache__

seed:
	cd backend && python scripts/seed_db.py

sandbox-build:
	cd docker && docker build -t reversecode-sandbox .
