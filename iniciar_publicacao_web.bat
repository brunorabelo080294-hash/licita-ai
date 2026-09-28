@echo off
title Licita Ai - Publicacao Web Cloudflare
echo ===================================================================
echo               LICITA AI - PUBLICADOR DE ACESSO WEB
echo ===================================================================
echo.
echo Iniciando o tunel seguro Cloudflare para a porta 5173...
echo Seu link publico comecando com https://...trycloudflare.com aparecera abaixo.
echo.
%~dp0cloudflared.exe tunnel --protocol http2 --url http://localhost:5173
pause
