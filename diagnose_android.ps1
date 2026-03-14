# Android SDK Diagnostic Script for Expo

Write-Host "--- Android SDK Diagnostics ---" -ForegroundColor Cyan

$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$adbPath = Join-Path $sdkPath "platform-tools\adb.exe"

# 1. Check SDK Root
if (Test-Path $sdkPath) {
    Write-Host "[OK] Android SDK found at $sdkPath" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Android SDK NOT found at $sdkPath" -ForegroundColor Red
    Write-Host "Please install Android Studio and the Android SDK." -ForegroundColor Yellow
}

# 2. Check platform-tools and adb
if (Test-Path $adbPath) {
    Write-Host "[OK] adb.exe found at $adbPath" -ForegroundColor Green
} else {
    Write-Host "[ERROR] adb.exe NOT found at $adbPath" -ForegroundColor Red
    Write-Host "This is why you're getting 'The system cannot find the path specified.'" -ForegroundColor Cyan
    Write-Host "Action: Open Android Studio -> SDK Manager -> SDK Tools -> Check 'Android SDK Platform-Tools' and click Apply." -ForegroundColor Yellow
}

# 3. Check ANDROID_HOME
if ($env:ANDROID_HOME -eq $sdkPath) {
    Write-Host "[OK] ANDROID_HOME is correctly set." -ForegroundColor Green
} else {
    Write-Host "[WARNING] ANDROID_HOME is not set or points elsewhere ($env:ANDROID_HOME)" -ForegroundColor Yellow
    Write-Host "Action: Set ANDROID_HOME to $sdkPath in your System Environment Variables." -ForegroundColor Cyan
}

# 4. Check PATH
if ($env:PATH -like "*platform-tools*") {
    Write-Host "[OK] platform-tools is in your PATH." -ForegroundColor Green
} else {
    Write-Host "[WARNING] platform-tools is NOT in your PATH." -ForegroundColor Yellow
    Write-Host "Action: Add $sdkPath\platform-tools to your PATH." -ForegroundColor Cyan
}

Write-Host "--- End of Diagnostics ---" -ForegroundColor Cyan
