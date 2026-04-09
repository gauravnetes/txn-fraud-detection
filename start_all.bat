@echo off
echo Starting tx.verify microservices...

echo [1/5] Starting ML Engine on port :8001...
start "tx.verify - ML Engine" cmd /k "cd 2-ml-engine && .venv\Scripts\python.exe main.py"

echo [2/5] Starting Graph Engine on port :8002...
start "tx.verify - Graph Engine" cmd /k "cd 3-graph-engine && .venv\Scripts\python.exe main.py"

echo [3/5] Starting Reasoning Engine on port :8003...
start "tx.verify - Reasoning Engine" cmd /k "cd 4-reasoning-engine && .venv\Scripts\python.exe main.py"

echo [4/5] Starting Go Gateway on port :8080...
start "tx.verify - Go Gateway" cmd /k "cd 1-gateway-service && go run ."

echo [5/5] Starting Frontend on port :3000...
start "tx.verify - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All 5 services launched!
echo Wait 10 seconds, then open http://localhost:3000
echo.
