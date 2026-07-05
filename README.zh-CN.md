# ComfyUI-TY-OrbitSphereLight

`TY Orbit Sphere Light` 是一个独立的 ComfyUI 自定义节点，用来生成干净的球体打光参考图。

## 节点定位

这个节点把两类能力结合到了一起：

- 保留 `Sphere-Light-Render-ComfyUI` 的最终出图风格
- 引入更直观的环绕式手柄交互体验

最终效果是：

- 节点内部可见球体预览
- 可拖拽控制 `azimuth`、`elevation`、`intensity`
- 最终输出图像中不包含手柄、轨道、辅助线

## 最终输出约束

- 输出图必须是干净球体图
- 手柄只在 ComfyUI 节点预览中显示
- 背景、球体、地面、阴影风格保持与原球体打光插件一致

## 输入参数

- `azimuth`: `0..360`
- `elevation`: `-30..90`
- `intensity`: `0.2..3.0`
- `render_b64`: 内部隐藏缓冲字段，仅用于节点前端预览

## 输出参数

- `render`: 干净的 `IMAGE` 输出

## 运行模式

### 1. ComfyUI 画布模式

- 节点前端会在预览区渲染球体和手柄
- 同步回写隐藏的 `render_b64`

### 2. API / 无前端模式

- 当 `render_b64` 为空时，自动走 Python 后端 fallback 渲染
- 适合外部前端、自动化流程、headless 调用

## Workflow 保存行为

- `render_b64` 在 ComfyUI 右侧参数栏中隐藏
- `render_b64` 不会写入 workflow 的 `widgets_values`
- 保存后的 workflow 只保留数值参数，避免带入大段 base64

## 安装方法

### 方式一：文件夹安装

1. 把 `ComfyUI-TY-OrbitSphereLight` 复制到 `ComfyUI/custom_nodes/`
2. 重启 ComfyUI

### 方式二：压缩包安装

1. 使用打包文件 `ComfyUI-TY-OrbitSphereLight.zip`
2. 解压到 `ComfyUI/custom_nodes/`
3. 重启 ComfyUI

## 使用步骤

1. 在 ComfyUI 中添加 `TY Orbit Sphere Light`
2. 在分类 `TY/Relight` 下找到节点
3. 通过滑条或节点预览中的三色手柄调节参数
4. 将 `render` 输出连接到后续节点或 `SaveImage`

## 验证要点

启动后建议检查：

1. 节点预览区是否显示球体和三色手柄
2. 右侧栏是否只显示 `azimuth`、`elevation`、`intensity`
3. 输出图里是否完全没有手柄和轨道
4. 保存并重开 workflow 后参数是否恢复正常

## 示例 Workflow

可直接参考：

- [examples/ty_orbit_sphere_light_basic_workflow.json](examples/ty_orbit_sphere_light_basic_workflow.json)

这个示例包含：

- `TY Orbit Sphere Light`
- `SaveImage`
- 一条最小可运行连接

## 文件说明

- `__init__.py`: 节点注册与后端 fallback 渲染
- `js/ty_orbit_sphere_light_widget.js`: 节点前端预览与手柄逻辑
- `js/vendor/three.min.js`: 内置 Three.js，支持离线使用

## 附带资源

- `README.md`: 英文安装与说明
- `CHANGELOG.md`: 当前版本改动记录
- `examples/ty_orbit_sphere_light_basic_workflow.json`: 最小可运行 workflow 示例

## 配套前端页

如果你同时使用这套 TY 前端工具，也可以直接打开：

- `http://127.0.0.1:3000/ty-light-ref.html`

这个独立页会调用 `ty-orbit-sphere-light` workflow app，生成与节点输出规则一致的干净球体参考图。

## 备注

- 不会覆盖或修改原 `Sphere-Light-Render-ComfyUI`
- 可与原插件同时安装
- 如果你同时使用配套前端工具，可以直接通过独立页生成参考图
