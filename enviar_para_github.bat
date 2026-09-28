@echo off
chcp 65001 > nul
echo ========================================================
echo   ENVIANDO LICITA AI PARA O GITHUB...
echo ========================================================
" C:\Users\Bruno\.gemini\antigravity\scratch\licita-ai\tools\git\cmd\git.exe\ remote remove origin 2>nul
\C:\Users\Bruno\.gemini\antigravity\scratch\licita-ai\tools\git\cmd\git.exe\ remote add origin https://github.com/brunorabelo080294-hash/licita-ai.git
\C:\Users\Bruno\.gemini\antigravity\scratch\licita-ai\tools\git\cmd\git.exe\ push -u origin main
echo ========================================================
echo CONCLUIDO! VERIFIQUE NO GITHUB E NO RENDER.
echo ========================================================
pause
