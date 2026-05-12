$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$env:PYTHONIOENCODING = "utf-8"
Write-Host "Formation ML on http://127.0.0.1:8000 (UTF-8 console for Windows)"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
