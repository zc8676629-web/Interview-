$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$nodeModules = Join-Path $repoRoot "node_modules"
if (-not (Test-Path -LiteralPath $nodeModules)) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
}

$envExample = Join-Path $repoRoot ".env.example"
$envFile = Join-Path $repoRoot ".env"
if ((Test-Path -LiteralPath $envExample) -and -not (Test-Path -LiteralPath $envFile)) {
    Copy-Item -LiteralPath $envExample -Destination $envFile
}

$listener = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    try {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
        Start-Sleep -Seconds 1
    } catch {
        throw "failed to stop existing service on port 3000"
    }
}

$buildCommand = "Set-Location -LiteralPath '$repoRoot'; npm run build"
powershell -ExecutionPolicy Bypass -Command $buildCommand
if ($LASTEXITCODE -ne 0) {
    throw "npm run build failed"
}

$command = "Set-Location -LiteralPath '$repoRoot'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $command

Start-Sleep -Seconds 6
Start-Process "http://localhost:3000"
