# This script sets ANDROID_HOME and updates the User Path permanently.
# Run this in a PowerShell window as Administrator for best results.

$androidPath = "C:\Users\Admin\AppData\Local\Android\Sdk"

if (Test-Path $androidPath) {
    Write-Host "Found Android SDK at $androidPath" -ForegroundColor Green
    
    # Set ANDROID_HOME for the current user
    [Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidPath, "User")
    Write-Host "Set ANDROID_HOME environment variable." -ForegroundColor Cyan
    
    # Update Path for the current user
    $oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $extraPaths = @(
        "$androidPath\platform-tools",
        "$androidPath\emulator"
    )
    
    $newPath = $oldPath
    foreach ($p in $extraPaths) {
        if ($oldPath -notlike "*$p*") {
            $newPath = "$newPath;$p"
            Write-Host "Adding $p to Path." -ForegroundColor Cyan
        }
    }
    
    if ($newPath -ne $oldPath) {
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "Path updated successfully." -ForegroundColor Green
    } else {
        Write-Host "Paths already exist in your environment." -ForegroundColor Yellow
    }
    
    Write-Host "`nIMPORTANT: Please RESTART your terminal/IDEs for changes to take effect." -ForegroundColor Magenta
} else {
    Write-Host "Error: Could not find Android SDK at $androidPath" -ForegroundColor Red
}
