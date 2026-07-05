# Third-Party Notices

## Project Origins

`ComfyUI-TY-OrbitSphereLight` was developed as a standalone TY node by combining and extending ideas from two upstream sources:

1. `Sphere-Light-Render-ComfyUI`
   - upstream repository: `https://github.com/eric-venti-seeds/Sphere-Light-Render-ComfyUI`
   - used as the visual baseline and adaptation source for the clean sphere-light render workflow

2. `comfyui_gaussian_splat`
   - local TY plugin by TANG
   - used as the interaction reference for the orbit-style gizmo and node-side control experience

## Attribution Scope

- This repository is not a mirror of either upstream project.
- The TY node was rebuilt as a separate standalone ComfyUI custom node with its own node name, category, frontend widget behavior, and packaging structure.
- The final goal of this project is to preserve the clean rendered output style while replacing the interaction model with a more intuitive TY orbit controller.

## License Note

At the time this repository was prepared locally on `2026-07-05`, the local checkout and GitHub page for `Sphere-Light-Render-ComfyUI` did not expose a separate `LICENSE` file in the source tree available here.

Before publishing this project publicly as a final open-source release, verify the upstream license or permission status for any directly adapted portions, or replace those portions with independently reimplemented code if needed.
