param(
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$sitwellRoot = Split-Path -Parent $PSScriptRoot
$siteUrl = "http://localhost:3000/"

function Show-ErrorMessage {
    param([string]$Message)

    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            $Message,
            "SitWell could not start",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
    }
    catch {
        Write-Host $Message
        Read-Host "Press Enter to close"
    }
}

function Test-SitWellRunning {
    try {
        $response = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 1
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    }
    catch {
        return $false
    }
}

try {
    if (-not (Test-Path -LiteralPath (Join-Path $sitwellRoot "package.json"))) {
        throw "SitWell project files were not found. Keep the launcher inside the project folder."
    }

    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw "Node.js was not found. Install Node.js, then try again."
    }

    if (-not (Test-Path -LiteralPath (Join-Path $sitwellRoot "node_modules"))) {
        throw "Project dependencies are missing. Run npm install in the project folder, then try again."
    }

    if ($CheckOnly) {
        Write-Host "SitWell local startup check passed."
        exit 0
    }

    if (-not (Test-SitWellRunning)) {
        Write-Host "Starting SitWell. Please wait..."
        Start-Process -FilePath "cmd.exe" `
            -ArgumentList "/c", "npm run dev" `
            -WorkingDirectory $sitwellRoot `
            -WindowStyle Hidden

        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Milliseconds 500
            if (Test-SitWellRunning) {
                $ready = $true
                break
            }
        }

        if (-not $ready) {
            throw "SitWell timed out while starting. Make sure port 3000 is available."
        }
    }

    Start-Process $siteUrl
}
catch {
    Show-ErrorMessage $_.Exception.Message
    exit 1
}
