@echo off
setlocal enabledelayedexpansion

:: --- CONFIG ---
set "SUMATRA_EXE=SumatraPDF.exe"
set "SPOOL_DIR=print_spool"
set "PROC_DIR=print_spool\processing"
set "ERROR_DIR=print_spool\errors"

:: Ensure folders exist
if not exist "%SPOOL_DIR%" mkdir "%SPOOL_DIR%"
if not exist "%PROC_DIR%" mkdir "%PROC_DIR%"
if not exist "%ERROR_DIR%" mkdir "%ERROR_DIR%"

:: DETECT PRINTER
echo 🔍 Detecting default printer...
for /f "tokens=*" %%p in ('powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -ExpandProperty Name"') do set "PRINTER_NAME=%%p"

if "%PRINTER_NAME%"=="" (
    echo ❌ [ERROR] No default printer found!
    pause
    exit
)

cls
echo --------------------------------------------------
echo 🖨️  Async Watcher started.
echo    Printer:  %PRINTER_NAME%
echo    Watching: %SPOOL_DIR%
echo    Queueing: %PROC_DIR%
echo    Quality:  Draft (Ink Saver)
echo --------------------------------------------------
echo.

:loop
:: 1. CLAIM FILES
if exist "%SPOOL_DIR%\*.pdf" (
    for %%f in ("%SPOOL_DIR%\*.pdf") do (
        set "full_name=%%~nxf"
        move /y "%%f" "%PROC_DIR%\" >nul 2>&1
        echo 📥 Queued: !full_name!
    )
)

:: 2. PROCESS QUEUE
if exist "%PROC_DIR%\*.pdf" (
    for %%f in ("%PROC_DIR%\*.pdf") do (
        set "fname=%%~nxf"
        
        :: Get Copy Count
        for /f "tokens=*" %%c in ('powershell -NoProfile -Command "if ('!fname!' -match 'Qty-(\d+)') { $matches[1] } else { 1 }"') do set "COPIES=%%c"

        echo 🖨️  Printing !COPIES! copies of !fname!...

        :: Run Print Command
        for /l %%i in (1,1,!COPIES!) do (
            ".\%SUMATRA_EXE%" -print-to "%PRINTER_NAME%" -silent "%PROC_DIR%\!fname!"
        )

        if !errorlevel! equ 0 (
            timeout /t 1 >nul
            del /f /q "%PROC_DIR%\!fname!"
        ) else (
            echo ❌ [ERROR] Printing failed for !fname!
            move /y "%PROC_DIR%\!fname!" "%ERROR_DIR%\" >nul
        )
    )
)

timeout /t 2 >nul
goto loop