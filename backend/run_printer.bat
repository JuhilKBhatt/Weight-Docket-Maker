@echo off
REM ./backend/run_printer.bat
set "SPOOL_DIR=print_spool"
set "PROC_DIR=%SPOOL_DIR%\processing"

if not exist "%SPOOL_DIR%" mkdir "%SPOOL_DIR%"
if not exist "%PROC_DIR%" mkdir "%PROC_DIR%"

echo --------------------------------------------------
echo   Async Printer Watcher (Windows)
echo   1. Monitoring: %SPOOL_DIR%
echo   2. Processing: %PROC_DIR%
echo --------------------------------------------------

:loop
REM 1. INSTANTLY CLAIM FILES
REM Move all PDFs to processing folder so UI unblocks immediately
if exist "%SPOOL_DIR%\*.pdf" (
    move /y "%SPOOL_DIR%\*.pdf" "%PROC_DIR%\" >nul 2>&1
    echo [Queue] Moved new files to processing...
)

REM 2. PROCESS QUEUE SEQUENTIALLY
if exist "%PROC_DIR%\*.pdf" (
    for %%f in ("%PROC_DIR%\*.pdf") do (
        echo [Print] Processing: %%~nxf
        
        REM Powershell: Extract copies -> Print -> Sleep
        powershell -NoProfile -Command ^
            "$f='%%f'; " ^
            "$n='%%~nxf'; " ^
            "if ($n -match 'Qty-(\d+)') { $copies=[int]$matches[1] } else { $copies=1 }; " ^
            "Write-Host '       Sending' $copies 'copies to spooler...'; " ^
            "1..$copies | ForEach-Object { " ^
            "   Start-Process -FilePath $f -Verb Print -PassThru | ForEach-Object { Start-Sleep -Seconds 6 } " ^
            "}"

        REM Delete from processing folder
        del "%%f"
        echo [Done] Finished %%~nxf
    )
)

REM Check every 2 seconds
timeout /t 2 /nobreak >nul
goto loop