param(
  [ValidateSet("patch", "minor", "none")]
  [string]$Bump = "patch",
  [switch]$SkipChecks,
  [switch]$SkipPackage,
  [switch]$SkipCommit,
  [switch]$SkipTag,
  [switch]$SkipPush,
  [switch]$SkipGithubRelease,
  [string]$Highlights = "Routine release pipeline run."
)

$ErrorActionPreference = "Stop"

function Ensure-Command([string]$Name){
  if(-not (Get-Command $Name -ErrorAction SilentlyContinue)){
    throw "Missing required command: $Name"
  }
}

function Bump-Version([string]$Version, [string]$Mode){
  if($Mode -eq "none"){ return $Version }
  $parts = $Version.Split(".")
  if($parts.Count -lt 3){ throw "Invalid semantic version: $Version" }
  $major = [int]$parts[0]
  $minor = [int]$parts[1]
  $patch = [int]$parts[2]
  if($Mode -eq "minor"){
    $minor += 1
    $patch = 0
  } else {
    $patch += 1
  }
  return "$major.$minor.$patch"
}

function Upsert-ReadmeReleaseBlock([string]$ReadmePath, [string]$Version, [string]$Date, [string]$ZipName){
  $start = "<!-- RELEASE:START -->"
  $end = "<!-- RELEASE:END -->"
  $block = @"
$start
## Latest Release
- Version: `$Version`
- Date: `$Date`
- Package: `$ZipName`
- Quick command:
  - `npm run release:full`
$end
"@

  $raw = Get-Content -LiteralPath $ReadmePath -Raw
  if($raw.Contains($start) -and $raw.Contains($end)){
    $pattern = [regex]::Escape($start) + ".*?" + [regex]::Escape($end)
    $newRaw = [regex]::Replace($raw, $pattern, $block, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    Set-Content -LiteralPath $ReadmePath -Value $newRaw -Encoding UTF8
    return
  }

  $append = @"

$block
"@
  Set-Content -LiteralPath $ReadmePath -Value ($raw + $append) -Encoding UTF8
}

Ensure-Command "git"
Ensure-Command "node"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestPath = Join-Path $root "manifest.json"
$changelogPath = Join-Path $root "CHANGELOG.md"
$readmePath = Join-Path $root "README.md"
$packageScript = Join-Path $root "scripts\package_extension.ps1"
$distDir = Join-Path $root "dist"

if(-not (Test-Path -LiteralPath $manifestPath)){ throw "manifest.json not found" }
if(-not (Test-Path -LiteralPath $changelogPath)){ throw "CHANGELOG.md not found" }
if(-not (Test-Path -LiteralPath $readmePath)){ throw "README.md not found" }
if(-not (Test-Path -LiteralPath $packageScript)){ throw "package_extension.ps1 not found" }

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$oldVersion = [string]$manifest.version
if([string]::IsNullOrWhiteSpace($oldVersion)){ throw "manifest.version is empty" }

$newVersion = Bump-Version -Version $oldVersion -Mode $Bump
if($newVersion -ne $oldVersion){
  $manifest.version = $newVersion
  $manifest | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
}

if(-not $SkipChecks){
  Write-Host "[1/6] Run checks..."
  node (Join-Path $root "scripts\manager_smoke_check.mjs")
  if($LASTEXITCODE -ne 0){ throw "manager_smoke_check failed" }
  node (Join-Path $root "scripts\mobile_smoke_check.mjs")
  if($LASTEXITCODE -ne 0){ throw "mobile_smoke_check failed" }
}

$zipName = "N/A"
$zipPath = ""
if(-not $SkipPackage){
  Write-Host "[2/6] Build package zip..."
  New-Item -ItemType Directory -Path $distDir -Force | Out-Null
  powershell -ExecutionPolicy Bypass -File $packageScript -OutDir $distDir -NoCrx
  if($LASTEXITCODE -ne 0){ throw "package_extension.ps1 failed" }

  $zip = Get-ChildItem -LiteralPath $distDir -Filter ("HORD-English-Companion_" + $newVersion + "_*.zip") |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if($zip){
    $zipName = $zip.Name
    $zipPath = $zip.FullName
  } else {
    throw "zip package not found in dist for version $newVersion"
  }
}

$today = Get-Date -Format "yyyy-MM-dd"
Write-Host "[3/6] Update CHANGELOG + README..."
$changelogRaw = Get-Content -LiteralPath $changelogPath -Raw
$header = "[" + $newVersion + "] " + $today
if(-not $changelogRaw.StartsWith($header)){
  $entry = @"
[$newVersion] $today
- Release package: $zipName
- Summary: $Highlights

"@
  Set-Content -LiteralPath $changelogPath -Value ($entry + $changelogRaw) -Encoding UTF8
}

Upsert-ReadmeReleaseBlock -ReadmePath $readmePath -Version $newVersion -Date $today -ZipName $zipName

if(-not $SkipCommit){
  Write-Host "[4/6] Commit release artifacts..."
  git add -- manifest.json CHANGELOG.md README.md scripts/release_full.ps1 package.json docs/release-process.md
  git commit -m ("release: v" + $newVersion)
} else {
  Write-Host "[4/6] Skip commit."
}

if(-not $SkipTag -and -not $SkipCommit){
  Write-Host "[5/6] Tag release..."
  $tag = "v" + $newVersion
  $existingTag = (git tag --list $tag) -join ""
  if([string]::IsNullOrWhiteSpace($existingTag)){
    git tag -a $tag -m ("Release " + $tag)
  } else {
    Write-Host "Tag already exists: $tag (skip create)"
  }
} elseif(-not $SkipCommit) {
  Write-Host "[5/6] Skip tag."
}

if(-not $SkipPush -and -not $SkipCommit){
  Write-Host "[6/6] Push to GitHub..."
  git push origin HEAD
  if(-not $SkipTag){
    git push origin --tags
  }
} elseif(-not $SkipCommit) {
  Write-Host "[6/6] Skip push."
}

if(-not $SkipGithubRelease -and -not [string]::IsNullOrWhiteSpace($zipPath) -and -not $SkipCommit){
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if($gh){
    try{
      $tag = "v" + $newVersion
      $releaseView = gh release view $tag 2>$null
      if($LASTEXITCODE -eq 0){
        gh release upload $tag $zipPath --clobber
      } else {
        gh release create $tag $zipPath --title ("HORD " + $tag) --notes ("- " + $Highlights)
      }
      Write-Host "GitHub Release synced: $tag"
    } catch {
      Write-Warning ("GitHub Release sync skipped: " + $_.Exception.Message)
    }
  } else {
    Write-Host "gh CLI not found; skipped GitHub Release upload."
  }
}

Write-Host "DONE: release pipeline completed (version $newVersion)."
