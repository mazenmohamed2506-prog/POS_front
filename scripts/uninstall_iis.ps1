# Automated IIS Uninstaller Script for POS Web API
param(
    [int]$Port = 5000,
    [string]$SiteName = "PosApiSite",
    [string]$AppPoolName = "PosApiPool"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=================================================="
Write-Host "Starting IIS Cleanup for POS Web API..."
Write-Host "=================================================="

Import-Module WebAdministration -ErrorAction SilentlyContinue

# Stop and Remove Website
if (Test-Path "IIS:\Sites\$SiteName") {
    Write-Host "Stopping and removing website '$SiteName'..."
    Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
    Remove-Website -Name $SiteName -ErrorAction SilentlyContinue
}

# Stop and Remove AppPool
if (Test-Path "IIS:\AppPools\$AppPoolName") {
    Write-Host "Stopping and removing application pool '$AppPoolName'..."
    Stop-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
    Remove-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
}

# Remove Firewall Rule
$firewallRuleName = "POS API IIS Port $Port"
Write-Host "Removing firewall rule '$firewallRuleName'..."
if (Get-Command "Remove-NetFirewallRule" -ErrorAction SilentlyContinue) {
    Remove-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue
} else {
    netsh advfirewall firewall delete rule name="$firewallRuleName" | Out-Null
}

Write-Host "=================================================="
Write-Host "IIS Cleanup Completed for POS Web API."
Write-Host "=================================================="
