$sdk = 'C:\Users\ishaa\AppData\Local\Android\Sdk'

if (-not (Test-Path $sdk)) {
  Write-Error "Android SDK not found at $sdk"
  exit 1
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk

$paths = @(
  "$sdk\platform-tools",
  "$sdk\emulator",
  "$sdk\cmdline-tools\latest\bin"
)

foreach ($pathEntry in $paths) {
  if ((Test-Path $pathEntry) -and -not (($env:Path -split ';') -contains $pathEntry)) {
    $env:Path = "$pathEntry;$env:Path"
  }
}
