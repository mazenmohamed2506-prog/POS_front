# ──────────────────────────────────────────────────────────────
# install_sqlexpress.ps1 — Silent SQL Server Express 2022 Installer
# Called by the NSIS installer when SQLEXPRESS instance is not found.
# ──────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

$installerUrl = "https://download.microsoft.com/download/3/8/d/38de7036-2433-4a70-8abf-5571e8cb2209/SQLEXPR_x64_ENU.exe"
$downloadDir  = Join-Path $env:TEMP "POS_SqlSetup"
$installerExe = Join-Path $downloadDir "SQLEXPR_x64_ENU.exe"
$extractDir   = Join-Path $downloadDir "SqlExtracted"

Write-Host "==================================================="
Write-Host " POS — Silent SQL Server Express 2022 Installation"
Write-Host "==================================================="

# ──────── Step 1: Download if not already cached ────────
if (-not (Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
}

if (-not (Test-Path $installerExe)) {
    Write-Host "[1/3] Downloading SQL Server Express 2022..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($installerUrl, $installerExe)
        Write-Host "Download complete: $installerExe"
    }
    catch {
        Write-Warning "Download failed: $_"
        Write-Warning "Please install SQL Server Express manually from: https://www.microsoft.com/en-us/sql-server/sql-server-downloads"
        exit 1
    }
} else {
    Write-Host "[1/3] SQL Server Express installer already cached."
}

# ──────── Step 2: Extract the self-extracting archive ────────
Write-Host "[2/3] Extracting installer..."
if (-not (Test-Path $extractDir)) {
    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
}

$extractArgs = "/qs /x:`"$extractDir`""
Start-Process -FilePath $installerExe -ArgumentList $extractArgs -Wait -NoNewWindow

$setupExe = Join-Path $extractDir "setup.exe"
if (-not (Test-Path $setupExe)) {
    # Some versions extract into a subfolder
    $setupExe = Get-ChildItem -Path $extractDir -Recurse -Filter "setup.exe" | Select-Object -First 1 -ExpandProperty FullName
}

if (-not $setupExe -or -not (Test-Path $setupExe)) {
    Write-Warning "Could not locate setup.exe after extraction."
    exit 1
}

# ──────── Step 3: Run silent install ────────
Write-Host "[3/3] Installing SQL Server Express silently..."

$installArgs = @(
    "/Q",                                           # Quiet mode
    "/ACTION=Install",
    "/FEATURES=SQLENGINE",
    "/INSTANCENAME=SQLEXPRESS",
    "/SQLSVCSTARTUPTYPE=Automatic",
    "/SQLSYSADMINACCOUNTS=`"BUILTIN\Administrators`"",
    "/SECURITYMODE=SQL",
    "/SAPWD=`"POS_Temp_2024!`"",                    # SA password (SQL auth fallback)
    "/TCPENABLED=1",
    "/NPENABLED=1",
    "/BROWSERSVCSTARTUPTYPE=Automatic",
    "/IACCEPTSQLSERVERLICENSETERMS"
)

$argString = $installArgs -join " "
Write-Host "Running: $setupExe $argString"

$proc = Start-Process -FilePath $setupExe -ArgumentList $argString -Wait -PassThru -NoNewWindow

if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 3010) {
    Write-Host "==================================================="
    Write-Host " SQL Server Express installed successfully!"
    Write-Host " Exit code: $($proc.ExitCode)"
    Write-Host "==================================================="
} else {
    Write-Warning "SQL Server Express installation exited with code: $($proc.ExitCode)"
    Write-Warning "Check the SQL Server setup log for details."
}

# ──────── Cleanup ────────
Write-Host "Cleaning up temporary files..."
try {
    Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue
} catch { }

exit $proc.ExitCode
