@echo off
REM ./run_printer.bat
echo Starting Printer Watcher for Docker...
echo Waiting for PDF files in .\backend\print_spool...

:loop
REM Find any PDF starting with PRINT_
if exist ".\backend\print_spool\PRINT_*.pdf" (
    for %%f in (".\backend\print_spool\PRINT_*.pdf") do (
        echo Found %%f - Printing...
        
        REM Extract copies is hard in pure Batch, simplified to print 1 copy loop here 
        REM or call a powershell helper for advanced logic.
        REM For simplicity, we just trigger the print verb:
        
        powershell -Command "Start-Process -FilePath '%%f' -Verb Print -PassThru | %%{sleep 5;}"
        
        REM Delete file so we don't print it again
        del "%%f"
        echo Done.
    )
)
REM Check every 3 seconds
timeout /t 3 /nobreak >nul
goto loop