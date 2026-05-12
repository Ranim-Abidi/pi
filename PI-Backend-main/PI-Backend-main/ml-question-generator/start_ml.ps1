$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

# Point the service to the existing dataset stored in the Angular project.
$env:QUESTIONS_DATA_DIR = "C:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove\src\app\Nesrineai\data"

Write-Host "Starting AI Question Generator (FastAPI) on http://127.0.0.1:8000"
python -m uvicorn api:app --host 127.0.0.1 --port 8000

