import { app } from "../../scripts/app.js";

const LOCAL_THREE_URL = new URL("./vendor/three.min.js", import.meta.url).href;

const INTENSITY_MIN = 0.2;
const INTENSITY_MAX = 3.0;
const INTENSITY_T_MIN = 0.22;
const INTENSITY_T_MAX = 0.88;
const INTENSITY_AXIS_SCALE = 1.85;
const AZIMUTH_RING_RX = 0.3;
const AZIMUTH_RING_RY = 0.18;

const OVERLAY = {
  center: { x: 0, y: 0, z: 0 },
  ringY: 0,
  azimuthRadius: 1.7,
  elevationRadius: 1.55,
  elevationPlaneX: -1.35,
  lightVisualRadius: 2.55,
  cameraPos: { x: 4.2, y: 3.2, z: 4.2 },
  cameraTarget: { x: 0, y: -0.2, z: 0 },
  fov: 45,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAzimuth(value) {
  let angle = Number(value);
  angle = ((angle % 360) + 360) % 360;
  return angle;
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function vec3Add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Mul(v, scalar) {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

function vec3Dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vec3Norm(v) {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-6) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function loadThree() {
  return new Promise((resolve, reject) => {
    if (window.THREE) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = LOCAL_THREE_URL;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function buildCleanRenderScene() {
  const R = window.THREE;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const renderer = new R.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = R.PCFSoftShadowMap;
  renderer.setSize(512, 512, false);
  renderer.setClearColor(0x8a8a8a);
  renderer.outputEncoding = R.sRGBEncoding;

  const scene = new R.Scene();
  scene.background = new R.Color(0x8a8a8a);

  const camera = new R.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 6, 8);
  camera.lookAt(0, -0.5, 0);

  const plane = new R.Mesh(
    new R.PlaneGeometry(100, 100),
    new R.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1, metalness: 0 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  plane.receiveShadow = true;
  scene.add(plane);

  const sphere = new R.Mesh(
    new R.SphereGeometry(1, 64, 64),
    new R.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0 })
  );
  sphere.position.y = 0;
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);

  scene.add(new R.AmbientLight(0xffffff, 0.2));

  const dirLight = new R.DirectionalLight(0xffffff, 1.5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -8;
  dirLight.shadow.camera.right = 8;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -8;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.radius = 2;
  scene.add(dirLight);

  // This scene intentionally stays "clean" so the exported IMAGE matches
  // the original Sphere-Light-Render visual style without gizmos.
  return { renderer, scene, camera, dirLight, canvas };
}

function findWidget(node, name) {
  return node.widgets?.find((widget) => widget?.name === name) || null;
}

function getWidgetValue(node, name, fallback) {
  const widget = findWidget(node, name);
  if (!widget) return fallback;
  const value = Number(widget.value);
  return Number.isFinite(value) ? value : fallback;
}

function setWidgetValue(node, name, value) {
  const widget = findWidget(node, name);
  if (!widget) return;
  widget.value = value;
  widget.callback?.(value);
}

function requestNodeRedraw(node) {
  node?.setDirtyCanvas?.(true, true);
  app?.graph?.setDirtyCanvas?.(true, true);
}

function getVisibleWidgetHeight(node, widget) {
  const width = node.size?.[0] || 320;
  if (widget.hidden || widget.type === "hidden") return 0;
  if (typeof widget.computeSize === "function") {
    const size = widget.computeSize(width);
    if (Array.isArray(size) && Number.isFinite(size[1])) {
      return size[1];
    }
  }
  return globalThis.LiteGraph?.NODE_WIDGET_HEIGHT ?? 20;
}

function getTopWidgetsHeight(node) {
  let height = (globalThis.LiteGraph?.NODE_TITLE_HEIGHT ?? 30) + 8;
  for (const widget of node.widgets ?? []) {
    if (!widget) continue;
    height += getVisibleWidgetHeight(node, widget) + 4;
  }
  return height;
}

function getPreviewRect(node) {
  const nodeWidth = Math.max(node.size?.[0] || 320, 320);
  const nodeHeight = Math.max(node.size?.[1] || 420, 420);
  const topHeight = getTopWidgetsHeight(node);
  const availableWidth = nodeWidth - 24;
  const availableHeight = nodeHeight - topHeight - 16;
  const side = Math.max(Math.min(availableWidth, availableHeight), 160);
  return {
    x: (nodeWidth - side) / 2,
    y: topHeight,
    side,
  };
}

function getNodePose(node) {
  return {
    azimuth: normalizeAzimuth(getWidgetValue(node, "azimuth", 0)),
    elevation: clamp(getWidgetValue(node, "elevation", 45), -30, 90),
    intensity: clamp(getWidgetValue(node, "intensity", 1.5), INTENSITY_MIN, INTENSITY_MAX),
  };
}

function projectPoint(projection, point) {
  const view = vec3Sub(point, projection.camPos);
  const xCam = vec3Dot(view, projection.right);
  const yCam = vec3Dot(view, projection.up);
  const zCam = vec3Dot(view, projection.forward);
  if (zCam <= 0.05) return null;
  return {
    x: projection.cx + (xCam / zCam) * projection.focal,
    y: projection.cy - (yCam / zCam) * projection.focal,
    z: zCam,
  };
}

function getAzimuthHandlePoint(rect, center2D, azimuthDeg) {
  const azimuthRad = toRadians(azimuthDeg);
  if (!rect || !center2D) return null;
  const rx = rect.side * AZIMUTH_RING_RX;
  const ry = rect.side * AZIMUTH_RING_RY;
  return {
    // azimuth = 0 starts at the bottom-center of the ring.
    x: center2D.x + rx * Math.sin(azimuthRad),
    y: center2D.y + ry * Math.cos(azimuthRad),
  };
}

function getIntensityAxisEndPoint(center2D, elevationArcCenter2D) {
  if (!center2D || !elevationArcCenter2D) return null;
  return {
    x: center2D.x + (elevationArcCenter2D.x - center2D.x) * INTENSITY_AXIS_SCALE,
    y: center2D.y + (elevationArcCenter2D.y - center2D.y) * INTENSITY_AXIS_SCALE,
  };
}

function solveAzimuthFromHandlePosition(state, localPos) {
  if (!state || !Array.isArray(localPos) || localPos.length < 2) {
    return null;
  }

  const [targetX, targetY] = localPos;
  let bestAzimuth = state.pose.azimuth;
  let bestDistanceSq = Infinity;

  for (let azimuth = 0; azimuth < 360; azimuth += 1) {
    const handle = getAzimuthHandlePoint(state.rect, state.center2D, azimuth);
    if (!handle) continue;
    const dx = handle.x - targetX;
    const dy = handle.y - targetY;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestAzimuth = azimuth;
    }
  }

  return bestAzimuth;
}

function screenPointToRay(projection, localPos) {
  if (!projection || !Array.isArray(localPos) || localPos.length < 2) return null;
  const [x, y] = localPos;
  const nx = (x - projection.cx) / projection.focal;
  const ny = (projection.cy - y) / projection.focal;
  const dir = vec3Norm(
    vec3Add(
      vec3Add(vec3Mul(projection.right, nx), vec3Mul(projection.up, ny)),
      projection.forward
    )
  );
  return { origin: projection.camPos, dir };
}

function rayPlaneIntersection(ray, planeNormal, planePoint) {
  if (!ray) return null;
  const denom = vec3Dot(ray.dir, planeNormal);
  if (Math.abs(denom) < 1e-6) return null;
  const t = vec3Dot(vec3Sub(planePoint, ray.origin), planeNormal) / denom;
  if (!Number.isFinite(t) || t <= 0) return null;
  return vec3Add(ray.origin, vec3Mul(ray.dir, t));
}

function drawRoundClip(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

function drawHandle(ctx, x, y, radius, fill, glow, isActive = false) {
  ctx.save();
  const glowRadius = isActive ? radius * 2.2 : radius * 1.7;
  const gradient = ctx.createRadialGradient(x, y, radius * 0.25, x, y, glowRadius);
  gradient.addColorStop(0, glow);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, isActive ? radius * 1.08 : radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPolyline(ctx, points, color, width) {
  const valid = points.filter(Boolean);
  if (valid.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(valid[0].x, valid[0].y);
  for (let i = 1; i < valid.length; i += 1) {
    ctx.lineTo(valid[i].x, valid[i].y);
  }
  ctx.stroke();
}

function buildOverlayState(node, rect) {
  const pose = getNodePose(node);
  const center = OVERLAY.center;
  const azimuthRad = toRadians(pose.azimuth);
  const elevationRad = toRadians(pose.elevation);

  const cameraPos = OVERLAY.cameraPos;
  const cameraTarget = OVERLAY.cameraTarget;
  const forward = vec3Norm(vec3Sub(cameraTarget, cameraPos));
  const right = vec3Norm(vec3Cross(forward, { x: 0, y: 1, z: 0 }));
  const up = vec3Cross(right, forward);

  const previewCx = rect.x + rect.side * 0.5;
  const previewCy = rect.y + rect.side * 0.5;
  const focal = (rect.side * 0.5) / Math.tan(toRadians(OVERLAY.fov) * 0.5);

  const projection = {
    camPos: cameraPos,
    forward,
    right,
    up,
    focal,
    cx: previewCx,
    cy: previewCy,
  };

  const lightWorld = {
    x: OVERLAY.lightVisualRadius * Math.cos(elevationRad) * Math.sin(azimuthRad),
    y: OVERLAY.lightVisualRadius * Math.sin(elevationRad),
    z: OVERLAY.lightVisualRadius * Math.cos(elevationRad) * Math.cos(azimuthRad),
  };

  const elevationHandleWorld = {
    x: OVERLAY.elevationPlaneX,
    y: OVERLAY.elevationRadius * Math.sin(elevationRad),
    z: OVERLAY.elevationRadius * Math.cos(elevationRad),
  };

  const intensityNorm = (pose.intensity - INTENSITY_MIN) / (INTENSITY_MAX - INTENSITY_MIN);
  const intensityT =
    INTENSITY_T_MIN + (1 - intensityNorm) * (INTENSITY_T_MAX - INTENSITY_T_MIN);

  const ringPoints = [];

  const elevationArcPoints = [];
  for (let i = 0; i <= 48; i += 1) {
    const angle = toRadians(-30 + (120 * i) / 48);
    elevationArcPoints.push(
      projectPoint(projection, {
        x: OVERLAY.elevationPlaneX,
        y: OVERLAY.elevationRadius * Math.sin(angle),
        z: OVERLAY.elevationRadius * Math.cos(angle),
      })
    );
  }

  const center2D = projectPoint(projection, center);
  const light2D = projectPoint(projection, lightWorld);
  const elevationHandle2D = projectPoint(projection, elevationHandleWorld);
  const elevationArcCenter2D = projectPoint(projection, {
    x: OVERLAY.elevationPlaneX,
    y: center.y,
    z: center.z,
  });

  if (!center2D || !light2D || !elevationHandle2D || !elevationArcCenter2D) {
    return null;
  }

  const intensityAxisEnd2D = getIntensityAxisEndPoint(center2D, elevationArcCenter2D);
  if (!intensityAxisEnd2D) {
    return null;
  }
  const intensityHandle2D = {
    x: lerp(center2D.x, intensityAxisEnd2D.x, intensityT),
    y: lerp(center2D.y, intensityAxisEnd2D.y, intensityT),
  };

  const azimuthHandle2D = getAzimuthHandlePoint(rect, center2D, pose.azimuth);
  if (!azimuthHandle2D) {
    return null;
  }

  ringPoints.length = 0;
  for (let i = 0; i <= 80; i += 1) {
    const point = getAzimuthHandlePoint(rect, center2D, (360 * i) / 80);
    if (point) {
      ringPoints.push(point);
    }
  }

  return {
    rect,
    pose,
    centerWorld: center,
    projection,
    center2D,
    light2D,
    elevationArcCenter2D,
    intensityAxisEnd2D,
    ringPoints,
    elevationArcPoints,
    handles: {
      azimuth: { x: azimuthHandle2D.x, y: azimuthHandle2D.y, r: 9 },
      elevation: { x: elevationHandle2D.x, y: elevationHandle2D.y, r: 9 },
      intensity: { x: intensityHandle2D.x, y: intensityHandle2D.y, r: 9 },
    },
  };
}

function drawOverlay(ctx, node, state) {
  const isActive = node._tyOrbitDragMode;
  const rect = state.rect;

  // The gizmo overlay is preview-only. Nothing drawn here is written into render_b64.
  ctx.save();
  drawRoundClip(ctx, rect.x, rect.y, rect.side, rect.side, 8);
  ctx.clip();

  drawPolyline(ctx, state.ringPoints, "rgba(233, 61, 130, 0.88)", 3.2);
  drawPolyline(ctx, state.elevationArcPoints, "rgba(0, 255, 208, 0.88)", 3.2);

  ctx.strokeStyle = "rgba(255, 184, 0, 0.88)";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(state.center2D.x, state.center2D.y);
  ctx.lineTo(state.intensityAxisEnd2D.x, state.intensityAxisEnd2D.y);
  ctx.stroke();

  drawHandle(
    ctx,
    state.handles.azimuth.x,
    state.handles.azimuth.y,
    state.handles.azimuth.r,
    "#E93D82",
    "rgba(233, 61, 130, 0.36)",
    isActive === "azimuth"
  );
  drawHandle(
    ctx,
    state.handles.elevation.x,
    state.handles.elevation.y,
    state.handles.elevation.r,
    "#00FFD0",
    "rgba(0, 255, 208, 0.36)",
    isActive === "elevation"
  );
  drawHandle(
    ctx,
    state.handles.intensity.x,
    state.handles.intensity.y,
    state.handles.intensity.r,
    "#FFB800",
    "rgba(255, 184, 0, 0.38)",
    isActive === "intensity"
  );

  ctx.restore();
}

function drawPreview(node, ctx) {
  const rect = getPreviewRect(node);
  node._tyOrbitOverlayState = buildOverlayState(node, rect);

  ctx.save();
  drawRoundClip(ctx, rect.x, rect.y, rect.side, rect.side, 8);
  ctx.clip();

  if (node._tyOrbitReady && node._tyOrbitCanvas) {
    ctx.drawImage(node._tyOrbitCanvas, rect.x, rect.y, rect.side, rect.side);
  }

  ctx.restore();

  if (node._tyOrbitOverlayState) {
    drawOverlay(ctx, node, node._tyOrbitOverlayState);
  }
}

function hitTest(node, localPos) {
  const state = node._tyOrbitOverlayState;
  if (!state || !Array.isArray(localPos) || localPos.length < 2) return null;
  const [x, y] = localPos;

  for (const [name, handle] of Object.entries(state.handles)) {
    const dx = x - handle.x;
    const dy = y - handle.y;
    if (dx * dx + dy * dy <= handle.r * handle.r) {
      return name;
    }
  }

  const rect = state.rect;
  if (x >= rect.x && x <= rect.x + rect.side && y >= rect.y && y <= rect.y + rect.side) {
    return "preview";
  }
  return null;
}

function writePose(node, nextPose) {
  setWidgetValue(node, "azimuth", Math.round(normalizeAzimuth(nextPose.azimuth)));
  setWidgetValue(node, "elevation", Math.round(clamp(nextPose.elevation, -30, 90)));
  setWidgetValue(
    node,
    "intensity",
    Math.round(clamp(nextPose.intensity, INTENSITY_MIN, INTENSITY_MAX) * 10) / 10
  );
  requestNodeRedraw(node);
}

function updateAzimuth(node, localPos) {
  const state = node._tyOrbitOverlayState;
  const azimuth = solveAzimuthFromHandlePosition(state, localPos);
  if (azimuth === null) return;
  const pose = getNodePose(node);
  writePose(node, { ...pose, azimuth });
}

function updateElevation(node, localPos) {
  const state = node._tyOrbitOverlayState;
  if (!state) return;

  let elevation = null;
  const ray = screenPointToRay(state.projection, localPos);
  const hit = rayPlaneIntersection(
    ray,
    { x: 1, y: 0, z: 0 },
    { x: OVERLAY.elevationPlaneX, y: 0, z: 0 }
  );
  if (hit) {
    elevation = clamp(toDegrees(Math.atan2(hit.y, hit.z)), -30, 90);
  }

  if (elevation === null && Array.isArray(localPos) && localPos.length >= 2) {
    const [x, y] = localPos;
    const dx = x - state.elevationArcCenter2D.x;
    const dy = state.elevationArcCenter2D.y - y;
    elevation = clamp(toDegrees(Math.atan2(dy, dx)), -30, 90);
  }

  if (elevation === null) return;
  const pose = getNodePose(node);
  writePose(node, { ...pose, elevation });
}

function updateIntensity(node, localPos) {
  const state = node._tyOrbitOverlayState;
  if (!state || !Array.isArray(localPos) || localPos.length < 2) return;
  const [x, y] = localPos;

  const axisX = state.intensityAxisEnd2D.x - state.center2D.x;
  const axisY = state.intensityAxisEnd2D.y - state.center2D.y;
  const axisLenSq = axisX * axisX + axisY * axisY;
  if (axisLenSq < 1) return;

  const proj =
    ((x - state.center2D.x) * axisX + (y - state.center2D.y) * axisY) / axisLenSq;
  const t = clamp(proj, INTENSITY_T_MIN, INTENSITY_T_MAX);
  const norm = 1 - (t - INTENSITY_T_MIN) / (INTENSITY_T_MAX - INTENSITY_T_MIN);
  const intensity = INTENSITY_MIN + norm * (INTENSITY_MAX - INTENSITY_MIN);

  const pose = getNodePose(node);
  writePose(node, { ...pose, intensity });
}

app.registerExtension({
  name: "Comfy.TYOrbitSphereLight",

  async nodeCreated(node) {
    if (node.comfyClass !== "TYOrbitSphereLightNode") return;

    await loadThree();

    const renderCtx = buildCleanRenderScene();
    node._tyOrbitRenderCtx = renderCtx;
    node._tyOrbitCanvas = renderCtx.canvas;
    node._tyOrbitReady = false;
    node._tyOrbitOverlayState = null;
    node._tyOrbitDragMode = null;

    const doRender = () => {
      const azimuth = getWidgetValue(node, "azimuth", 0);
      const elevation = getWidgetValue(node, "elevation", 45);
      const intensity = getWidgetValue(node, "intensity", 1.5);

      const az = toRadians(azimuth);
      const el = toRadians(elevation);
      const radius = 10;

      renderCtx.dirLight.position.set(
        radius * Math.cos(el) * Math.sin(az),
        radius * Math.sin(el),
        radius * Math.cos(el) * Math.cos(az)
      );
      renderCtx.dirLight.intensity = intensity;
      renderCtx.renderer.shadowMap.needsUpdate = true;
      renderCtx.renderer.render(renderCtx.scene, renderCtx.camera);

      const renderWidget = findWidget(node, "render_b64");
      if (renderWidget) {
        renderWidget.value = renderCtx.canvas.toDataURL("image/png");
      }

      node._tyOrbitReady = true;
      requestNodeRedraw(node);
    };

    let renderTimer = null;
    const scheduleRender = () => {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(doRender, 30);
    };

    const hookSliders = () => {
      for (const name of ["azimuth", "elevation", "intensity"]) {
        const widget = findWidget(node, name);
        if (!widget || widget._tyOrbitHooked) continue;
        widget._tyOrbitHooked = true;
        const originalCallback = widget.callback;
        widget.callback = function callback(value, ...args) {
          originalCallback?.call(this, value, ...args);
          scheduleRender();
        };
      }
    };

    const refreshSelectionIfNeeded = () => {
      if (!node.is_selected || !app?.canvas?.selectNode) return;
      app.canvas.selectNode(null);
      app.canvas.selectNode(node, false);
    };

    const hideRenderWidget = () => {
      const widget = findWidget(node, "render_b64");
      if (!widget || widget._tyOrbitHidden) return;
      widget._tyOrbitHidden = true;
      widget.computeSize = () => [0, 0];
      widget.draw = () => {};
      widget.type = "hidden";

      const input = node.inputs?.find((entry) => entry?.name === "render_b64");
      if (input) {
        input.hidden = true;
      }
    };

    const originalOnDrawForeground = node.onDrawForeground?.bind(node);
    node.onDrawForeground = function onDrawForeground(ctx) {
      drawPreview(this, ctx);
      return originalOnDrawForeground?.(ctx);
    };

    const originalOnMouseDown = node.onMouseDown?.bind(node);
    node.onMouseDown = function onMouseDown(event, localPos, graphCanvas) {
      const hit = hitTest(this, localPos);
      if (hit === "azimuth") {
        this._tyOrbitDragMode = "azimuth";
        updateAzimuth(this, localPos);
        return true;
      }
      if (hit === "elevation") {
        this._tyOrbitDragMode = "elevation";
        updateElevation(this, localPos);
        return true;
      }
      if (hit === "intensity") {
        this._tyOrbitDragMode = "intensity";
        updateIntensity(this, localPos);
        return true;
      }
      return originalOnMouseDown?.(event, localPos, graphCanvas);
    };

    const originalOnMouseMove = node.onMouseMove?.bind(node);
    node.onMouseMove = function onMouseMove(event, localPos, graphCanvas) {
      if (this._tyOrbitDragMode && event?.buttons === 0) {
        this._tyOrbitDragMode = null;
      }
      if (this._tyOrbitDragMode === "azimuth") {
        updateAzimuth(this, localPos);
        return true;
      }
      if (this._tyOrbitDragMode === "elevation") {
        updateElevation(this, localPos);
        return true;
      }
      if (this._tyOrbitDragMode === "intensity") {
        updateIntensity(this, localPos);
        return true;
      }
      return originalOnMouseMove?.(event, localPos, graphCanvas);
    };

    const originalOnMouseUp = node.onMouseUp?.bind(node);
    node.onMouseUp = function onMouseUp(...args) {
      this._tyOrbitDragMode = null;
      return originalOnMouseUp?.(...args);
    };

    const originalOnMouseWheel = node.onMouseWheel?.bind(node);
    node.onMouseWheel = function onMouseWheel(event, localPos, graphCanvas) {
      if (hitTest(this, localPos) === "preview") {
        return true;
      }
      return originalOnMouseWheel?.(event, localPos, graphCanvas);
    };

    const originalOnResize = node.onResize?.bind(node);
    node.onResize = function onResize(size) {
      size[0] = Math.max(size[0], 340);
      const previewSide = clamp(size[0] - 24, 180, 360);
      const minHeight = getTopWidgetsHeight(this) + previewSide + 16;
      size[1] = Math.max(size[1], minHeight);
      requestNodeRedraw(this);
      return originalOnResize?.(size);
    };

    const originalOnRemoved = node.onRemoved?.bind(node);
    node.onRemoved = function onRemoved(...args) {
      clearTimeout(renderTimer);
      this._tyOrbitRenderCtx?.renderer?.dispose?.();
      this._tyOrbitRenderCtx = null;
      this._tyOrbitCanvas = null;
      this._tyOrbitOverlayState = null;
      return originalOnRemoved?.(...args);
    };

    setTimeout(() => {
      hideRenderWidget();
      hookSliders();
      doRender();
      const rect = getPreviewRect(node);
      const minHeight = getTopWidgetsHeight(node) + rect.side + 16;
      node.setSize?.([Math.max(node.size?.[0] || 340, 340), Math.max(node.size?.[1] || minHeight, minHeight)]);
    }, 50);

    setTimeout(() => {
      hideRenderWidget();
      hookSliders();
      requestNodeRedraw(node);
      refreshSelectionIfNeeded();
    }, 300);
  },
});
