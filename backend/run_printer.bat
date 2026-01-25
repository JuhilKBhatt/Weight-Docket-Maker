@echo off
setlocal enabledelayedexpansion

:: --- CONFIG ---
:: Use the hardcoded name for Task Scheduler stability
set "PRINTER_NAME=HP8C43C2 (HP Photosmart 5520 series)"
set "SUMATRA_EXE=SumatraPDF.exe"

:: Set absolute path to current directory to avoid OneDrive confusion
set "BASE_DIR=%~dp0"
set "SPOOL_DIR=%BASE_DIR%print_spool"
set "PROC_DIR=%BASE_DIR%print_spool\processing"
set "ERROR_DIR=%BASE_DIR%print_spool\errors"

:: Ensure folders exist
if not exist "%SPOOL_DIR%" mkdir "%SPOOL_DIR%"
if not exist "%PROC_DIR%" mkdir "%PROC_DIR%"
if not exist "%ERROR_DIR%" mkdir "%ERROR_DIR%"

cls
echo --------------------------------------------------
echo 🖨️  Async Watcher started.
echo    Printer:  %PRINTER_NAME%
echo    Folder:   %SPOOL_DIR%
echo --------------------------------------------------
echo [%TIME%] 🔍 Scanning for files...

:loop
:: 1. CLAIM FILES (Only if they aren't being used by another process)
if exist "%SPOOL_DIR%\*.pdf" (
    for %%f in ("%SPOOL_DIR%\*.pdf") do (
        :: Try to rename the file to itself to see if it's locked by OneDrive
        ren "%%f" "%%~nxf" >nul 2>&1
        if !errorlevel! equ 0 (
            echo [%TIME%] 📥 Queued: %%~nxf
            move /y "%%f" "%PROC_DIR%\" >nul 2>&1
        )
    )
)

:: 2. PROCESS QUEUE
if exist "%PROC_DIR%\*.pdf" (
    for %%f in ("%PROC_DIR%\*.pdf") do (
        set "fname=%%~nxf"
        
        :: Simple Quantity Check (Looks for Qty-X in name)
        set "COPIES=1"
        echo !fname! | findstr /i "Qty-" >nul
        if !errorlevel! equ 0 (
            for /f "tokens=2 delims=-" %%a in ("!fname!") do (
                set "val=%%a"
                set "COPIES=!val:~0,1!"
            )
        )

        echo [%TIME%] 🖨️  Printing !COPIES! copies...

        :: Print via Sumatra
        for /l %%i in (1,1,!COPIES!) do (
            "%BASE_DIR%%SUMATRA_EXE%" -print-to "%PRINTER_NAME%" -silent "%PROC_DIR%\!fname!"
        )

        if !errorlevel! equ 0 (
            timeout /t 2 >nul
            del /f /q "%PROC_DIR%\!fname!"
            echo [%TIME%] ✅ Done.
        ) else (
            echo [%TIME%] ❌ Error.
            move /y "%PROC_DIR%\!fname!" "%ERROR_DIR%\" >nul
        )
    )
)

timeout /t 3 >nul
goto loop