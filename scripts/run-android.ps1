. "$PSScriptRoot\android-env.ps1"

$env:EXPO_NO_TELEMETRY = '1'
$env:HOME = (Get-Location).Path
$env:USERPROFILE = (Get-Location).Path

npx expo run:android
