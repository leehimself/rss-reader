@echo off
chcp 65001 >nul
cd /d %~dp0
echo Starting RSS Reader...
call npx electron .
