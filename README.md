# ComfyUI-TY-OrbitSphereLight

`TY Orbit Sphere Light` is an independent ComfyUI custom node for generating clean sphere-based relighting reference images.

## Overview

This node combines:

- the clean output style of `Sphere-Light-Render-ComfyUI`
- a more intuitive orbital gizmo interaction style inspired by `comfyui_gaussian_splat`

The result is a new standalone TY node with:

- a sphere-centered preview
- draggable handles for `azimuth`, `elevation`, and `intensity`
- no handles, rings, or guides in the final output image

## Final Output Rules

- The exported `IMAGE` stays clean.
- The gizmo is visible only inside the ComfyUI node preview.
- The output keeps the original gray background, sphere, floor, and shadow look.

## Inputs

- `azimuth`: `0..360`
- `elevation`: `-30..90`
- `intensity`: `0.2..3.0`
- `render_b64`: internal hidden buffer used by the node preview render path

## Output

- `render`: clean `IMAGE` reference without preview controls

## Render Paths

- ComfyUI canvas mode:
  - the frontend preview renders the sphere and writes a hidden render buffer
- API or headless workflow mode:
  - the Python fallback renderer is used automatically when `render_b64` is empty

## Workflow Serialization

- `render_b64` is hidden in the ComfyUI sidebar
- `render_b64` is not saved into workflow `widgets_values`
- saved workflows only keep the numeric controls needed to reopen the node cleanly

## Install

### Option 1: Folder Install

1. Copy `ComfyUI-TY-OrbitSphereLight` into `ComfyUI/custom_nodes/`
2. Restart ComfyUI

### Option 2: Zip Install

1. Use the packaged file `ComfyUI-TY-OrbitSphereLight.zip`
2. Extract it into `ComfyUI/custom_nodes/`
3. Restart ComfyUI

## Verify

After ComfyUI starts:

1. Add `TY Orbit Sphere Light`
2. Confirm the node appears under category `TY/Relight`
3. Confirm the node preview shows the sphere and the three colored handles
4. Confirm the right sidebar only shows `azimuth`, `elevation`, and `intensity`
5. Confirm the final output image does not contain any gizmo graphics

## Files

- `__init__.py`: node registration and backend fallback renderer
- `js/ty_orbit_sphere_light_widget.js`: ComfyUI frontend preview and gizmo logic
- `js/vendor/three.min.js`: bundled Three.js runtime for offline use

## Bundled Extras

- `README.zh-CN.md`: Chinese install and usage guide
- `examples/ty_orbit_sphere_light_basic_workflow.json`: minimal workflow example with `SaveImage`

## Frontend Pairing

This node can also be used from the paired TY frontend page at:

- `http://127.0.0.1:3000/ty-light-ref.html`

That page calls the `ty-orbit-sphere-light` workflow app and keeps the final render clean, matching the node output rules.

## Notes

- No extra Python packages are required beyond the normal ComfyUI image stack.
- The original `Sphere-Light-Render-ComfyUI` plugin is not modified.
- This plugin is designed to coexist with the original node as a separate TY node.
