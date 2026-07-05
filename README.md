# ComfyUI-TY-OrbitSphereLight

`TY Orbit Sphere Light` is a standalone ComfyUI custom node for generating clean sphere-based relighting reference images with an in-node orbit gizmo.

## What This Node Does

This plugin is designed for a very specific workflow:

- keep the final render look close to the clean sphere output style used by `Sphere-Light-Render-ComfyUI`
- replace the less direct control experience with a more visual TY orbit-style gizmo
- keep all helper handles inside the node preview only
- keep the exported `IMAGE` clean, without rings, guides, or control points

The result is a dedicated TY relighting node that is easier to control during editing while still behaving like a clean render utility in ComfyUI workflows.

## Main Features

- sphere-centered preview inside the node
- draggable orbit handles for `azimuth`, `elevation`, and `intensity`
- clean render output with no gizmo artifacts
- offline frontend bundle with local `three.min.js`
- backend fallback render path for API or headless execution
- standalone packaging that does not overwrite the original upstream plugins

## Inputs

- `azimuth`: `0..360`
- `elevation`: `-30..90`
- `intensity`: `0.2..3.0`
- `render_b64`: internal hidden preview buffer used by the node frontend

## Output

- `render`: clean `IMAGE` output

## Output Rules

- The gizmo is shown only inside the node preview.
- The final output image must stay clean.
- The gray background, sphere composition, and shadow presentation are intended to stay aligned with the TY target style for this node.

## Render Paths

### ComfyUI canvas mode

- the frontend widget renders the preview sphere and interaction gizmos
- the preview writes an internal hidden render buffer back to the node

### API or headless mode

- when `render_b64` is empty or unavailable, the Python fallback renderer is used automatically
- this keeps the node usable from workflow apps, API calls, or headless automation

## Project Origins And Credits

This node was created by combining and extending ideas from two sources:

### 1. Sphere-Light-Render-ComfyUI

- upstream repository: `https://github.com/eric-venti-seeds/Sphere-Light-Render-ComfyUI`
- used as the visual baseline and adaptation source for the clean sphere-light render behavior

### 2. comfyui_gaussian_splat

- TY local plugin by TANG
- used as the interaction reference for the orbit-style handle experience and node-side control ergonomics

## What Is New In The TY Version

Compared with the original sphere-light plugin, this TY version adds:

- a new standalone node name: `TY Orbit Sphere Light`
- a new node class: `TYOrbitSphereLightNode`
- a TY category path: `TY/Relight`
- a preview-only gizmo layer with separate red, blue, and yellow controls
- hidden preview buffering so helper graphics never enter the final output image
- a more direct in-node control experience for relighting direction and strength

## What This Repository Does Not Do

- it does not overwrite `Sphere-Light-Render-ComfyUI`
- it does not require deleting or replacing the upstream plugin
- it does not intentionally change the final clean render into a stylized UI image

## Install

### Folder install

1. Copy `ComfyUI-TY-OrbitSphereLight` into `ComfyUI/custom_nodes/`
2. Restart ComfyUI

### Git install

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/supart/ComfyUI-TY-OrbitSphereLight.git
```

Then restart ComfyUI.

## Verify

After ComfyUI starts:

1. Add `TY Orbit Sphere Light`
2. Confirm the node appears under `TY/Relight`
3. Confirm the node preview shows the sphere and three colored handles
4. Confirm the output image does not contain any gizmo graphics
5. Confirm API execution still works when the hidden preview buffer is absent

## Included Files

- `__init__.py`: node registration and backend fallback renderer
- `js/ty_orbit_sphere_light_widget.js`: frontend preview and gizmo logic
- `js/vendor/three.min.js`: bundled Three.js runtime for offline use
- `examples/ty_orbit_sphere_light_basic_workflow.json`: minimal workflow example
- `README.zh-CN.md`: Chinese documentation
- `THIRD_PARTY_NOTICES.md`: source attribution and upstream notice

## Paired Frontend

This node can also be paired with the TY frontend page:

- `http://127.0.0.1:3000/ty-light-ref.html`

## Important Upstream Notice

Please read [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

At the time this repository was prepared locally on `2026-07-05`, the local checkout and current GitHub page for `Sphere-Light-Render-ComfyUI` did not expose a separate `LICENSE` file in the source tree available here.

Before a final public release, verify upstream permission or replace any directly adapted portions with independently reimplemented code if needed.
