@echo off
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo MySQL is already running.
) else (
    echo Starting MySQL Server...
    start /b "" "C:\Users\0dani\AppData\Local\Programs\MySQL\bin\mysqld.exe" --console
    echo MySQL Server started on port 3306.
)
