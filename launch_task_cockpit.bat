@echo off
title Task Cockpit Launcher

set "VAULT_ROOT=C:\Users\corym\Vault"

:: Navigate to dashboard directory
cd /d "C:\Users\corym\.gemini\antigravity\task_dashboard"

:: Check if server is already responding on port 3001 or 3002
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r1 = Invoke-WebRequest 'http://127.0.0.1:3001/api/tasks' -TimeoutSec 1 -ErrorAction Stop; exit 0 } catch { try { $r2 = Invoke-WebRequest 'http://127.0.0.1:3002/api/tasks' -TimeoutSec 1 -ErrorAction Stop; exit 0 } catch { exit 1 } }" >nul 2>&1

if %errorlevel% equ 0 (
    echo Task Cockpit server is already active!
    goto OPEN_BROWSER
)

:: Boot standalone node server process in minimized window so it survives batch exit
echo Starting Task Cockpit backend server...
start "Task Cockpit Server" /min cmd /c "node server.js"

:: Wait 3 seconds for vault cache pre-warming and port binding
ping -n 4 127.0.0.1 >nul

:OPEN_BROWSER
echo Opening Task Cockpit in browser...
:: Dynamically detect which port (3001 or 3002) is listening and open browser
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = 3001; try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/tasks' -TimeoutSec 2 -ErrorAction Stop; if ($r.StatusCode -eq 200) { $p = 3001 } } catch { $p = 3002 }; Start-Process ('http://localhost:' + $p)"

echo Task Cockpit Launched Successfully!
