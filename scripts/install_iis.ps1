# Automated Silent IIS Installer Script for POS Web API
param(
    [string]$ApiDirectory = "",
    [int]$Port = 5000,
    [string]$SiteName = "PosApiSite",
    [string]$AppPoolName = "PosApiPool"
)

$ErrorActionPreference = "Continue"

Write-Host "=================================================="
Write-Host "Starting Automated IIS Setup for POS Web API..."
Write-Host "=================================================="

# Resolve API Directory
if ([string]::IsNullOrWhiteSpace($ApiDirectory)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    $ApiDirectory = Join-Path $scriptDir "..\api"
}
$ApiDirectory = [System.IO.Path]::GetFullPath($ApiDirectory)
Write-Host "Target API Directory: $ApiDirectory"

# 1. Enable Required IIS Windows Features
Write-Host "[1/5] Checking Windows IIS Features..."
$iisFeatures = @(
    "IIS-WebServerRole",
    "IIS-WebServer",
    "IIS-CommonHttpFeatures",
    "IIS-StaticContent",
    "IIS-DefaultDocument",
    "IIS-DirectoryBrowsing",
    "IIS-HttpErrors",
    "IIS-ApplicationDevelopment",
    "IIS-ASPNET45",
    "IIS-NetFxExtensibility45",
    "IIS-ISAPIExtensions",
    "IIS-ISAPIFilter",
    "IIS-HealthAndDiagnostics",
    "IIS-HttpLogging",
    "IIS-Security",
    "IIS-RequestFiltering",
    "IIS-Performance",
    "IIS-HttpCompressionStatic",
    "IIS-WebServerManagementTools",
    "IIS-ManagementConsole",
    "IIS-ManagementScriptingTools",
    "IIS-WebSockets"
)

try {
    if (Get-Command "Enable-WindowsOptionalFeature" -ErrorAction SilentlyContinue) {
        foreach ($feature in $iisFeatures) {
            $state = Get-WindowsOptionalFeature -Online -FeatureName $feature -ErrorAction SilentlyContinue
            if ($state -and $state.State -ne "Enabled") {
                Write-Host "Enabling IIS feature: $feature..."
                Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart -ErrorAction SilentlyContinue | Out-Null
            }
        }
    } elseif (Get-Command "Install-WindowsFeature" -ErrorAction SilentlyContinue) {
        $featuresToInstall = @("Web-Server", "Web-Mgmt-Console", "Web-Scripting-Tools", "Web-WebSockets", "Web-Asp-Net45")
        Install-WindowsFeature -Name $featuresToInstall -IncludeManagementTools -ErrorAction SilentlyContinue | Out-Null
    }
} catch {
    Write-Warning "Failed to enable some IIS features via PowerShell cmdlet: $_"
}

# Ensure WebAdministration module is imported
Import-Module WebAdministration -ErrorAction SilentlyContinue

# 2. Verify ASP.NET Core Module
Write-Host "[2/5] Checking ASP.NET Core Module in IIS..."
$aspNetCoreModuleInstalled = $false
if (Test-Path "HKLM:\SOFTWARE\Microsoft\IIS Extensions\IIS AspNetCore Module V2") {
    $aspNetCoreModuleInstalled = $true
} elseif (Test-Path "$env:SystemRoot\System32\inetsrv\aspnetcorev2.dll") {
    $aspNetCoreModuleInstalled = $true
}

if ($aspNetCoreModuleInstalled) {
    Write-Host "ASP.NET Core Hosting Module V2 is detected."
} else {
    Write-Warning "ASP.NET Core Module V2 was not detected in IIS. Ensure the .NET 8 Hosting Bundle is installed on this machine."
}

# Create API Directory & Logs Directory if missing
if (-not (Test-Path $ApiDirectory)) {
    New-Item -ItemType Directory -Force -Path $ApiDirectory | Out-Null
}
$logsDir = Join-Path $ApiDirectory "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
}

# 3. Create / Configure IIS Application Pool
Write-Host "[3/5] Configuring IIS Application Pool '$AppPoolName'..."
if (Test-Path "IIS:\AppPools\$AppPoolName") {
    Write-Host "Application Pool '$AppPoolName' already exists."
} else {
    Write-Host "Creating Application Pool '$AppPoolName'..."
    New-Item -Path "IIS:\AppPools\$AppPoolName" | Out-Null
}

# Set No Managed Code & Performance Settings
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name "managedRuntimeVersion" -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name "enable32BitAppOnWin64" -Value $false
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name "processModel.idleTimeout" -Value ([TimeSpan]::FromMinutes(0))
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name "recycling.periodicRestart.time" -Value ([TimeSpan]::FromMinutes(0))
try {
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name "startMode" -Value "AlwaysRunning" -ErrorAction SilentlyContinue
} catch {}

# 4. Create / Configure IIS Website
Write-Host "[4/5] Configuring IIS Website '$SiteName' on Port $Port..."
if (Test-Path "IIS:\Sites\$SiteName") {
    Write-Host "Website '$SiteName' already exists. Updating settings..."
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name "physicalPath" -Value $ApiDirectory
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name "applicationPool" -Value $AppPoolName
} else {
    Write-Host "Creating Website '$SiteName' bound to port $Port..."
    New-Item -Path "IIS:\Sites\$SiteName" -Bindings @{protocol="http"; bindingInformation="*:${Port}:"} -PhysicalPath $ApiDirectory | Out-Null
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name "applicationPool" -Value $AppPoolName
}

# Ensure site is started
Start-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
Start-Website -Name $SiteName -ErrorAction SilentlyContinue

# 5. Set NTFS Folder Permissions
Write-Host "[5/5] Granting NTFS Folder Permissions to $ApiDirectory..."
try {
    icacls "$ApiDirectory" /grant "IIS_IUSRS:(OI)(CI)F" /T /Q /C | Out-Null
    icacls "$ApiDirectory" /grant "NT AUTHORITY\NETWORK SERVICE:(OI)(CI)F" /T /Q /C | Out-Null
    icacls "$ApiDirectory" /grant "IIS AppPool\$AppPoolName:(OI)(CI)F" /T /Q /C | Out-Null
} catch {
    Write-Warning "Failed to set ICACLS permissions: $_"
}

# 6. Configure Windows Firewall Rule
Write-Host "Configuring Windows Firewall inbound rule for port $Port..."
$firewallRuleName = "POS API IIS Port $Port"
if (Get-Command "Get-NetFirewallRule" -ErrorAction SilentlyContinue) {
    $existingRule = Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        Write-Host "Creating inbound firewall rule '$firewallRuleName'..."
        New-NetFirewallRule -DisplayName $firewallRuleName -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Enabled True -Profile Any | Out-Null
    } else {
        Write-Host "Firewall rule '$firewallRuleName' already exists."
    }
} else {
    netsh advfirewall firewall add rule name="$firewallRuleName" dir=in action=allow protocol=TCP localport=$Port | Out-Null
}

Write-Host "=================================================="
Write-Host "IIS Setup Completed Successfully for POS Web API!"
Write-Host "Website URL: http://localhost:$Port"
Write-Host "=================================================="
