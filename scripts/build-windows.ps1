# AskPlex Build Script for Windows
# Creates shortcuts and wrapper scripts in bin/ directory

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BinDir = Join-Path $ProjectRoot "bin"

Write-Host "=== AskPlex Windows Build Script ===" -ForegroundColor Cyan
Write-Host "Project Root: $ProjectRoot"

# Create bin directory
if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir | Out-Null
    Write-Host "Created bin/ directory" -ForegroundColor Green
}

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\server"
npm install --silent
Set-Location "$ProjectRoot\mcp-server"
npm install --silent
Write-Host "Dependencies installed" -ForegroundColor Green

# Create askplex.cmd (CLI wrapper)
$CliWrapper = @"
@echo off
node "$ProjectRoot\cli\askplex.js" %*
"@
$CliWrapper | Out-File -FilePath "$BinDir\askplex.cmd" -Encoding ASCII
Write-Host "Created bin\askplex.cmd" -ForegroundColor Green

# Create askplex-server.cmd (Server wrapper)
$ServerWrapper = @"
@echo off
echo Starting AskPlex Bridge Server...
cd /d "$ProjectRoot\server"
node server.js
"@
$ServerWrapper | Out-File -FilePath "$BinDir\askplex-server.cmd" -Encoding ASCII
Write-Host "Created bin\askplex-server.cmd" -ForegroundColor Green

# Create Desktop Shortcut
$CreateShortcut = Read-Host "`nCreate desktop shortcut for server? (y/n)"
if ($CreateShortcut -eq "y") {
    $Desktop = [Environment]::GetFolderPath("Desktop")
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$Desktop\AskPlex Server.lnk")
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-NoExit -Command `"cd '$ProjectRoot\server'; node server.js`""
    $Shortcut.WorkingDirectory = "$ProjectRoot\server"
    $Shortcut.WindowStyle = 7  # Minimized
    $Shortcut.Save()
    Write-Host "Created desktop shortcut: AskPlex Server.lnk" -ForegroundColor Green
}

# Create Startup Shortcut (auto-start on login)
$CreateStartup = Read-Host "Auto-start server on Windows login? (y/n)"
if ($CreateStartup -eq "y") {
    $StartupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$StartupFolder\AskPlex Server.lnk")
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-WindowStyle Hidden -Command `"cd '$ProjectRoot\server'; node server.js`""
    $Shortcut.WorkingDirectory = "$ProjectRoot\server"
    $Shortcut.Save()
    Write-Host "Created startup shortcut (server will auto-start on login)" -ForegroundColor Green
}

# Add bin to PATH suggestion
Write-Host "`n=== Build Complete ===" -ForegroundColor Cyan
Write-Host "`nTo use askplex from anywhere, add bin/ to your PATH:"
Write-Host "  `$env:PATH += `";$BinDir`"" -ForegroundColor Yellow
Write-Host "`nOr run directly:"
Write-Host "  $BinDir\askplex.cmd --new `"your question`"" -ForegroundColor Yellow
Write-Host "  $BinDir\askplex-server.cmd" -ForegroundColor Yellow

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Load Chrome extension from: $ProjectRoot\extension"
Write-Host "2. Open https://www.perplexity.ai/ in Chrome"
Write-Host "3. Start server: $BinDir\askplex-server.cmd"
Write-Host "4. Test: $BinDir\askplex.cmd --new `"what is 2+2?`""
