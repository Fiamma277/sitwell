@echo off
chcp 65001 >nul
title SitWell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-sitwell.ps1"

