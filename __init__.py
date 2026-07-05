import base64
import io

import numpy as np
import torch
from PIL import Image, ImageFilter


RENDER_SIZE = 512
OUTPUT_SIZE = 1024
BACKGROUND_RGB = np.array([138, 138, 138], dtype=np.float32) / 255.0
SPHERE_RGB = np.array([204, 204, 204], dtype=np.float32) / 255.0
FALLBACK_BRIGHTNESS_OFFSET = 40
FALLBACK_BLUR_RADIUS = 1.5


def _normalize(vec):
    vec = np.asarray(vec, dtype=np.float32)
    norm = np.linalg.norm(vec, axis=-1, keepdims=True)
    norm = np.maximum(norm, 1e-6)
    return vec / norm


def _build_camera_rays(size):
    cam_pos = np.array([0.0, 6.0, 8.0], dtype=np.float32)
    cam_target = np.array([0.0, -0.5, 0.0], dtype=np.float32)
    world_up = np.array([0.0, 1.0, 0.0], dtype=np.float32)

    forward = _normalize(cam_target - cam_pos)
    right = _normalize(np.cross(forward, world_up))
    up = _normalize(np.cross(right, forward))

    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    nx = ((xx + 0.5) / size) * 2.0 - 1.0
    ny = 1.0 - ((yy + 0.5) / size) * 2.0

    scale = np.tan(np.deg2rad(35.0).astype(np.float32) / 2.0)
    dirs = (
        forward[None, None, :]
        + nx[..., None] * scale * right[None, None, :]
        + ny[..., None] * scale * up[None, None, :]
    )
    return cam_pos, _normalize(dirs)


def _intersect_sphere(ray_origin, ray_dirs, center, radius):
    oc = ray_origin[None, None, :] - center[None, None, :]
    half_b = np.sum(ray_dirs * oc, axis=-1)
    c = np.sum(oc * oc, axis=-1) - radius * radius
    disc = half_b * half_b - c
    valid = disc > 0.0
    sqrt_disc = np.zeros_like(disc, dtype=np.float32)
    sqrt_disc[valid] = np.sqrt(disc[valid])

    t = np.full(disc.shape, np.inf, dtype=np.float32)
    near = -half_b - sqrt_disc
    far = -half_b + sqrt_disc
    valid_near = valid & (near > 1e-4)
    valid_far = valid & ~valid_near & (far > 1e-4)
    t[valid_near] = near[valid_near]
    t[valid_far] = far[valid_far]
    return t


def _intersect_plane_y(ray_origin, ray_dirs, plane_y):
    dy = ray_dirs[..., 1]
    t = np.full(dy.shape, np.inf, dtype=np.float32)
    valid = np.abs(dy) > 1e-6
    raw_t = (plane_y - ray_origin[1]) / dy
    t[valid & (raw_t > 1e-4)] = raw_t[valid & (raw_t > 1e-4)]
    return t


def _batched_directional_shadow(points, light_dir, sphere_radius):
    if points.size == 0:
        return np.zeros((0,), dtype=np.float32)

    helper = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    if abs(np.dot(helper, light_dir)) > 0.95:
        helper = np.array([1.0, 0.0, 0.0], dtype=np.float32)

    tangent_a = _normalize(np.cross(light_dir, helper)).reshape(3)
    tangent_b = _normalize(np.cross(light_dir, tangent_a)).reshape(3)
    offsets = [
        (0.0, 0.0),
        (0.055, 0.0),
        (-0.055, 0.0),
        (0.0, 0.055),
        (0.0, -0.055),
    ]

    occlusion = np.zeros((points.shape[0],), dtype=np.float32)

    for off_a, off_b in offsets:
        sample_dir = _normalize(light_dir + tangent_a * off_a + tangent_b * off_b).reshape(3)
        origin = points + sample_dir[None, :] * 0.03
        proj = np.sum(origin * sample_dir[None, :], axis=1)
        c = np.sum(origin * origin, axis=1) - sphere_radius * sphere_radius
        disc = proj * proj - c
        hit = disc > 0.0
        sqrt_disc = np.zeros_like(disc, dtype=np.float32)
        sqrt_disc[hit] = np.sqrt(disc[hit])
        t = -proj - sqrt_disc
        occlusion += (hit & (t > 1e-4)).astype(np.float32)

    return occlusion / float(len(offsets))


def _render_backend_fallback(azimuth, elevation, intensity):
    cam_pos, ray_dirs = _build_camera_rays(RENDER_SIZE)
    sphere_center = np.array([0.0, 0.0, 0.0], dtype=np.float32)
    sphere_radius = 1.0
    plane_y = -1.0

    az = np.deg2rad(np.float32(azimuth))
    el = np.deg2rad(np.float32(elevation))
    light_pos = np.array(
        [
            10.0 * np.cos(el) * np.sin(az),
            10.0 * np.sin(el),
            10.0 * np.cos(el) * np.cos(az),
        ],
        dtype=np.float32,
    )
    light_dir = _normalize(light_pos).reshape(3)

    sphere_t = _intersect_sphere(cam_pos, ray_dirs, sphere_center, sphere_radius)
    plane_t = _intersect_plane_y(cam_pos, ray_dirs, plane_y)

    image = np.broadcast_to(BACKGROUND_RGB, (RENDER_SIZE, RENDER_SIZE, 3)).copy()

    sphere_hit = np.isfinite(sphere_t) & (sphere_t <= plane_t)
    plane_hit = np.isfinite(plane_t) & ~sphere_hit

    if np.any(sphere_hit):
        sphere_points = cam_pos[None, None, :] + ray_dirs * sphere_t[..., None]
        sphere_points_hit = sphere_points[sphere_hit]
        normals_hit = _normalize(sphere_points_hit - sphere_center[None, :])
        view_dir_hit = _normalize(cam_pos[None, :] - sphere_points_hit)

        diffuse = np.clip(np.sum(normals_hit * light_dir[None, :], axis=1), 0.0, 1.0)
        half_vec = _normalize(light_dir[None, :] + view_dir_hit)
        specular = np.clip(np.sum(normals_hit * half_vec, axis=1), 0.0, 1.0) ** 28.0

        ambient = 0.2
        diffuse_term = 0.68 * diffuse * float(intensity)
        specular_term = 0.14 * specular * min(float(intensity), 2.0)
        sphere_color = SPHERE_RGB[None, :] * np.clip((ambient + diffuse_term)[:, None], 0.0, 1.35)
        sphere_color = np.clip(sphere_color + specular_term[:, None], 0.0, 1.0)
        image[sphere_hit] = sphere_color

    if np.any(plane_hit):
        plane_points = cam_pos[None, None, :] + ray_dirs * plane_t[..., None]
        plane_points_hit = plane_points[plane_hit]
        occlusion = _batched_directional_shadow(plane_points_hit, light_dir, sphere_radius)
        shadow_strength = 0.42 + 0.18 * min(float(intensity) / 3.0, 1.0)
        plane_color = BACKGROUND_RGB[None, :] * (1.0 - shadow_strength * occlusion[:, None])
        image[plane_hit] = np.clip(plane_color, 0.0, 1.0)

    rgb = np.clip(image * 255.0, 0.0, 255.0).astype(np.uint8)
    img = Image.fromarray(rgb, mode="RGB").resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)

    # Match the original Sphere-Light-Render output feel more closely:
    # keep the backend fallback slightly brighter and softer than the raw analytic render.
    img = img.filter(ImageFilter.GaussianBlur(radius=FALLBACK_BLUR_RADIUS))
    img = img.point(lambda value: min(255, value + FALLBACK_BRIGHTNESS_OFFSET))
    return img


class TYOrbitSphereLightNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "azimuth": (
                    "FLOAT",
                    {
                        "default": 0.0,
                        "min": 0.0,
                        "max": 360.0,
                        "step": 1.0,
                        "display": "slider",
                    },
                ),
                "elevation": (
                    "FLOAT",
                    {
                        "default": 45.0,
                        "min": -30.0,
                        "max": 90.0,
                        "step": 1.0,
                        "display": "slider",
                    },
                ),
                "intensity": (
                    "FLOAT",
                    {
                        "default": 1.5,
                        "min": 0.2,
                        "max": 3.0,
                        "step": 0.1,
                        "display": "slider",
                    },
                ),
            },
            "optional": {
                "render_b64": ("STRING", {"default": "", "multiline": False}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("render",)
    FUNCTION = "execute"
    CATEGORY = "TY/Relight"
    OUTPUT_NODE = False
    DESCRIPTION = (
        "Interactive TY sphere light controller. "
        "The node preview shows draggable gizmos, but the output image stays clean."
    )

    def execute(self, azimuth, elevation, intensity, render_b64=""):
        if render_b64 and render_b64.startswith("data:image"):
            try:
                _, data = render_b64.split(",", 1)
                img_bytes = base64.b64decode(data)
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                img = img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
            except Exception as exc:
                print(f"[TYOrbitSphereLightNode] Error decoding render image: {exc}")
                img = _render_backend_fallback(azimuth, elevation, intensity)
        else:
            img = _render_backend_fallback(azimuth, elevation, intensity)

        arr = np.array(img).astype(np.float32) / 255.0
        tensor = torch.from_numpy(arr).unsqueeze(0)
        return (tensor,)


NODE_CLASS_MAPPINGS = {
    "TYOrbitSphereLightNode": TYOrbitSphereLightNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TYOrbitSphereLightNode": "TY Orbit Sphere Light",
}

WEB_DIRECTORY = "./js"
