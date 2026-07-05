# Changelog

## 2026-07-05

- Created the standalone `ComfyUI-TY-OrbitSphereLight` custom node.
- Added `TY Orbit Sphere Light` / `TYOrbitSphereLightNode` under `TY/Relight`.
- Kept final render output aligned with the original `Sphere-Light-Render-ComfyUI` look.
- Added a node-only gizmo preview with orbit handles for `azimuth`, `elevation`, and `intensity`.
- Hid `render_b64` from the ComfyUI sidebar and workflow serialization.
- Added backend fallback rendering for API or headless use when the frontend preview buffer is unavailable.
- Bundled `three.min.js` locally for offline installation.
- Added `README.zh-CN.md` and a minimal example workflow.
- Added paired frontend support through the TY light reference page and fixed clean download filenames.
