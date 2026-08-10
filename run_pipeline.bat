@echo off

cd /d "C:\Users\bs806\OneDrive\Desktop\GlobalCameraMap"

powershell.exe -ExecutionPolicy Bypass -File ".\run_pipeline.ps1"

exit /b %ERRORLEVEL%