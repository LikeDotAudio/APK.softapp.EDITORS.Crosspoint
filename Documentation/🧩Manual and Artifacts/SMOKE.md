# Smoke test — EDITORS.Crosspoint

Is `EDITORS.Crosspoint` deployed? Written by `.apk.scripts/smoke.py` from the module's own shape; what each check means is in that script's header.

← [Wiki home](../README.md)

**✅ PASS** — 3/3 checks, since 2026-11-12 00:27 EST

| Check | Target | Result | Detail |
|---|---|---|---|
| pushed | [APK.softapp.EDITORS.Crosspoint](https://github.com/LikeDotAudio/APK.softapp.EDITORS.Crosspoint.git) | ✅ | HEAD is on origin |
| web | [index.html](https://apk.audio/APK%3ASoftapps/EDITORS/EDITORS.Crosspoint/index.html) | ✅ | HTTP 200 |
| app | `OS/Crosspoint Router` → `PODS/POD.THIN/Softapps/EDITORS/EDITORS.Crosspoint/index.html` | ✅ | present |

Re-run: `python3 .apk.scripts/smoke.py PODS/POD.THIN/Softapps/EDITORS/EDITORS.Crosspoint`

<!-- smoke:sig 0252094f796d since 2026-11-12 00:27 EST -->
