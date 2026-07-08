@echo off
title People's Priorities - Launcher & Health Check
setlocal enabledelayedexpansion

echo ===================================================
echo   People's Priorities - Smart Startup Engine
echo ===================================================
echo.

:: 1. Check Git
echo [1/5] Checking Git installation...
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Git is not installed on this system.
    echo Please install Git from https://git-scm.com/
) else (
    echo [OK] Git is installed.
    if not exist .git (
        echo [INFO] Git repository not initialized. Initializing now...
        git init
        git add .
        git commit -m "Initial commit: People's Priorities Platform"
        echo [OK] Git initialized and initial commit created.
    ) else (
        echo [OK] Git repository already initialized.
    )
)
echo.

:: 2. Check Node.js & npm
echo [2/5] Checking Node.js and npm...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js (v18+ recommended) from https://nodejs.org/
    pause
    exit /b 1
)
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo [OK] Node.js Version: %NODE_VER%
echo [OK] npm Version: %NPM_VER%
echo.

:: 3. Verify Environment File (.env.local)
echo [3/5] Checking environment variables...
if not exist .env.local (
    echo [WARNING] .env.local file is missing!
    if exist .env.example (
        echo [INFO] Copying .env.example to .env.local...
        copy .env.example .env.local >nul
    ) else (
        echo [INFO] Creating a default .env.local template...
        (
            echo # Supabase Credentials
            echo NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
            echo NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
            echo.
            echo # Gemini API Key
            echo GEMINI_API_KEY=your-gemini-key
        ) > .env.local
    )
    echo [OK] Created .env.local. Please open and edit with your API keys if needed.
) else (
    echo [OK] .env.local exists.
)
echo.

:: 4. Verify & Install Node Dependencies
echo [4/5] Verifying dependencies...
if not exist node_modules (
    echo [INFO] node_modules directory not found. Running npm install...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [WARNING] npm install failed. Retrying with legacy-peer-deps...
        call npm install --legacy-peer-deps
        if !ERRORLEVEL! neq 0 (
            echo [ERROR] Dependency installation failed! Trying clean install...
            call npm cache clean --force
            call npm install
        )
    )
) else (
    echo [OK] node_modules folder exists.
)
echo.

:: 5. Launch Development Server
echo [5/5] Launching Next.js development server...
echo ---------------------------------------------------
echo Dev server will start at: http://localhost:3000
echo Press Ctrl+C to stop the server.
echo ---------------------------------------------------
echo.

call npm run dev
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Next.js dev server crashed with exit code %ERRORLEVEL%.
    echo [INFO] Attempting to auto-fix and rebuild...
    
    :: Common crash reason: Next.js Cache corruption
    if exist .next (
        echo [INFO] Clearing Next.js build cache (.next)...
        rd /s /q .next
    )
    
    echo [INFO] Re-running dev server...
    call npm run dev
)

pause
