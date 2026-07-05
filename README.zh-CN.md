# ComfyUI-TY-OrbitSphereLight

`TY Orbit Sphere Light` 是一个独立的 ComfyUI 自定义节点，用来生成干净的球体打光参考图，并在节点内部提供更直观的轨道式操控手柄。

## 这个节点的定位

这个插件服务的是一个很明确的目标：

- 保留 `Sphere-Light-Render-ComfyUI` 那种干净的球体打光输出风格
- 把操控方式改成更直观的 TY 轨道手柄交互
- 手柄、环线、辅助线只显示在节点预览里
- 最终导出的 `IMAGE` 必须保持干净，不能把 UI 控件画进结果图

所以它本质上是一个更适合实际调光操作的 TY 重打光节点，而不是一个把 UI 元素直接渲染进图片的展示插件。

## 主要特性

- 节点内部显示球体预览
- 可拖拽控制 `azimuth`、`elevation`、`intensity`
- 最终输出图像不带任何手柄或轨道
- 前端使用本地内置 `three.min.js`，支持离线使用
- API / headless 模式下带 Python fallback 渲染
- 独立插件目录，不覆盖原始插件

## 输入参数

- `azimuth`: `0..360`
- `elevation`: `-30..90`
- `intensity`: `0.2..3.0`
- `render_b64`: 节点前端内部使用的隐藏预览缓冲字段

## 输出参数

- `render`: 干净的 `IMAGE` 输出

## 输出规则

- 手柄只在节点预览里显示
- 最终导出的图片必须保持干净
- 背景、球体构图、阴影表现都以这个 TY 节点当前目标风格为准

## 渲染路径

### 1. ComfyUI 画布模式

- 节点前端负责渲染球体预览和交互手柄
- 预览结果会回写到节点内部隐藏字段

### 2. API / 无前端模式

- 当 `render_b64` 为空或不可用时，自动启用 Python fallback 渲染
- 这样外部工作流、API 调用、headless 场景也能正常出图

## 项目来源与致谢

这个 TY 节点不是凭空从零来的，而是基于两个来源做了组合和改造：

### 1. Sphere-Light-Render-ComfyUI

- 上游仓库：`https://github.com/eric-venti-seeds/Sphere-Light-Render-ComfyUI`
- 这个插件提供了球体打光参考图的基础视觉方向，也是本项目做干净输出风格时的重要参考和改造来源

### 2. comfyui_gaussian_splat

- 这是 TANG 本地的 TY 插件
- 本项目借用了它更直观的轨道式操控思路，来重做节点内部的手柄交互体验

## TY 版本新增了什么

相对原始球体打光插件，这个 TY 版本新增了：

- 独立的新节点名：`TY Orbit Sphere Light`
- 独立的新类名：`TYOrbitSphereLightNode`
- 独立分类：`TY/Relight`
- 红、蓝、黄三组预览态控制手柄
- 预览层和最终输出层分离，确保 UI 不进入结果图
- 更适合实际调光操作的节点内控制体验

## 这个仓库不做什么

- 不覆盖原始 `Sphere-Light-Render-ComfyUI`
- 不要求你删除原插件
- 不会故意把最终输出图改成带 UI 的展示图

## 安装方式

### 方式一：文件夹安装

1. 把 `ComfyUI-TY-OrbitSphereLight` 复制到 `ComfyUI/custom_nodes/`
2. 重启 ComfyUI

### 方式二：Git 安装

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/supart/ComfyUI-TY-OrbitSphereLight.git
```

然后重启 ComfyUI。

## 启动后检查项

1. 添加 `TY Orbit Sphere Light`
2. 确认节点出现在 `TY/Relight`
3. 确认节点预览里能看到球体和三色手柄
4. 确认最终输出图片里没有任何手柄图形
5. 确认在没有隐藏预览缓冲字段时，API 模式也能正常执行

## 仓库包含的文件

- `__init__.py`: 节点注册和后端 fallback 渲染
- `js/ty_orbit_sphere_light_widget.js`: 前端预览和手柄逻辑
- `js/vendor/three.min.js`: 内置 Three.js 运行时
- `examples/ty_orbit_sphere_light_basic_workflow.json`: 最小示例工作流
- `README.md`: 英文说明
- `THIRD_PARTY_NOTICES.md`: 来源说明和上游注意事项

## 配套前端页

这个节点也可以和 TY 的前端页配合使用：

- `http://127.0.0.1:3000/ty-light-ref.html`

## 重要说明

请同时阅读 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

在 `2026-07-05` 本地整理这个仓库时，`Sphere-Light-Render-ComfyUI` 的本地检出目录和当前 GitHub 页面里都没有看到单独的 `LICENSE` 文件。

所以在最终公开上传之前，建议先确认上游授权/许可状态；如果里面有直接改造过来的代码部分，也建议在必要时替换成独立重写版本，再做正式公开发布。
