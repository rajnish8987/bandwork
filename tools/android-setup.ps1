# Installs a private copy of Java and the Android SDK for building the APK.
# Nothing is added to PATH or to Windows settings, and the whole thing can be
# removed by deleting the folder below. About 3 GB, more with the emulator.
# It shows the Android SDK licence terms and asks you to accept them.

param([switch]$WithEmulator)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$root = Join-Path $env:LOCALAPPDATA 'BandworkAndroid'
$jdk = Join-Path $root 'jdk'
$sdk = Join-Path $root 'sdk'
New-Item -ItemType Directory -Force $root, $sdk | Out-Null

if (-not (Test-Path (Join-Path $jdk 'bin\java.exe'))) {
  Write-Host 'Downloading Java 21...'
  $zip = Join-Path $root 'jdk.zip'
  Invoke-WebRequest 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse' -OutFile $zip
  $unpacked = Join-Path $root 'jdk-unpacked'
  Expand-Archive $zip $unpacked -Force
  Move-Item (Get-ChildItem $unpacked -Directory | Select-Object -First 1).FullName $jdk
  Remove-Item $zip, $unpacked -Recurse -Force
}

$latest = Join-Path $sdk 'cmdline-tools\latest'
if (-not (Test-Path (Join-Path $latest 'bin\sdkmanager.bat'))) {
  Write-Host 'Downloading the Android command line tools...'
  $page = Invoke-WebRequest 'https://developer.android.com/studio' -UseBasicParsing
  $file = [regex]::Match($page.Content, 'commandlinetools-win-\d+_latest\.zip').Value
  if (-not $file) { throw 'Could not find the command line tools on the Android download page.' }
  $zip = Join-Path $root 'tools.zip'
  Invoke-WebRequest "https://dl.google.com/android/repository/$file" -OutFile $zip
  $unpacked = Join-Path $root 'tools-unpacked'
  Expand-Archive $zip $unpacked -Force
  New-Item -ItemType Directory -Force (Split-Path $latest) | Out-Null
  Move-Item (Join-Path $unpacked 'cmdline-tools') $latest
  Remove-Item $zip, $unpacked -Recurse -Force
}

$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = $sdk
$manager = Join-Path $latest 'bin\sdkmanager.bat'

$packages = @('platform-tools', 'platforms;android-36', 'build-tools;35.0.0')
if ($WithEmulator) { $packages += @('emulator', 'system-images;android-35;google_apis;x86_64') }
$ErrorActionPreference = 'Continue' # sdkmanager writes routine notices to stderr

Write-Host ''
Write-Host 'Android will now show its licence terms. Read them, and type y to accept each one.'
& $manager --licenses

Write-Host "Installing: $($packages -join ', ')"
& $manager @packages

$installed = (& $manager --list_installed 2>$null) -join "`n"
$missing = $packages | Where-Object { -not $installed.Contains($_) }
if ($missing) { throw "These Android packages did not install: $($missing -join ', '). Did you accept the licences?" }
Write-Host "Android tools are ready in $root"
