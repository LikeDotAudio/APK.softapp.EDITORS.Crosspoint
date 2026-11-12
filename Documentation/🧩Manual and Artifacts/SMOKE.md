# Smoke test — EDITORS.Crosspoint

Is `EDITORS.Crosspoint` deployed? Written by `.apk.scripts/smoke.py` from the module's own shape; what each check means is in that script's header.

← [Wiki home](../README.md)

**❌ FAIL** — 2/3 checks, since 2026-11-12 00:16 EST

| Check | Target | Result | Detail |
|---|---|---|---|
| pushed | [APK.softapp.EDITORS.Crosspoint](https://github.com/LikeDotAudio/APK.softapp.EDITORS.Crosspoint.git) | ❌ | 1 commit(s) not pushed |
| web | [index.html](https://apk.audio/APK%3ASoftapps/EDITORS/EDITORS.Crosspoint/index.html) | ✅ | HTTP 200 |
| app | `OS/Crosspoint Router` → `PODS/POD.THIN/Softapps/EDITORS/EDITORS.Crosspoint/index.html` | ✅ | present |

Re-run: `python3 .apk.scripts/smoke.py PODS/POD.THIN/Softapps/EDITORS/EDITORS.Crosspoint`

<!-- smoke:sig 9ce4d69d0179 since 2026-11-12 00:16 EST -->
