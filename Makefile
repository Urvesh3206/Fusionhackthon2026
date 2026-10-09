.PHONY: all dev build test eval clean

PYTHON = python
VENV_PYTHON = backend/venv/Scripts/python

all: test eval

dev:
	@echo "Starting Tidewatch backend and frontend..."
	@powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'backend/venv/Scripts/python -m uvicorn app.main:app --app-dir backend --port 8000'; Start-Process powershell -ArgumentList '-NoExit', '-Command', 'pnpm --filter tidewatch-frontend run dev'"

build:
	@echo "Building frontend..."
	pnpm --filter tidewatch-frontend run build

test:
	@echo "Running backend test suites..."
	$(VENV_PYTHON) -m pytest backend/tests -v

eval:
	@echo "Running 30-seed Monte Carlo evaluation benchmark..."
	$(VENV_PYTHON) eval.py

clean:
	@echo "Cleaning caches..."
	rmdir /s /q backend\.pytest_cache 2>nul || true
