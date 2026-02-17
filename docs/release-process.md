# HORD Release Process

## One-command full release

```powershell
npm.cmd run release:full
```

This pipeline does:
1. Bump `manifest.json` version (default: patch).
2. Run smoke checks (`manager` + `mobile`).
3. Build extension zip into `dist/`.
4. Update `CHANGELOG.md` (new top entry).
5. Update `README.md` latest-release block.
6. Commit + tag + push to GitHub.
7. Try GitHub Release upload (if `gh` CLI is installed and authenticated).

## Dry run (local only, no push/release)

```powershell
npm.cmd run release:full:nopush
```

## Advanced options

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\release_full.ps1" -Bump patch
powershell -ExecutionPolicy Bypass -File "scripts\release_full.ps1" -Bump minor
powershell -ExecutionPolicy Bypass -File "scripts\release_full.ps1" -Bump none
```

Optional flags:
- `-SkipChecks`
- `-SkipPackage`
- `-SkipCommit`
- `-SkipTag`
- `-SkipPush`
- `-SkipGithubRelease`
- `-Highlights "your release summary"`
