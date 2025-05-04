@echo off
set PORT=51822
set TOKEN=mysecrettoken
cd "C:\path\to\project"
start /min node server.js
pause
REM this is a simple batch file to start the server (requires node.js and node modules installed)