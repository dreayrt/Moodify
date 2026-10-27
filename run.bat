@echo off
title Moodify Frontend (Next.js - Port 3000)
echo ====================================================
echo Dang khoi dong Moodify Frontend (Next.js)...
echo ====================================================
cd /d "%~dp0"
if not exist "node_modules\" (
    echo Chua tim thay thu vien node_modules, dang tien hanh npm install...
    call npm install
)
call npm run dev
pause

