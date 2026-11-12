@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node serve.mjs
  goto end
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 serve.py
  goto end
)
where python >nul 2>nul
if not errorlevel 1 (
  python serve.py
  goto end
)
echo 请安装 Node.js 或 Python 后再次打开。也可将 dist 文件夹放到静态网站服务器使用。
pause
:end
