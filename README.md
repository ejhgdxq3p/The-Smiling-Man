# 笑面人 (The Smiling Man)

A meta/physics puzzle/narrative horror game built with HTML5 Canvas and Matter.js.

## 游戏概述 (Game Overview)

玩家在一个模拟的、极简的蓝色操作系统界面中，面对一个被称为"笑面人"（太阳）的古神实体。通过操控两个具有不同物理法则的"浏览器窗口"作为容器，玩家需要完成实体下达的荒谬指令。

## 运行游戏 (How to Run)

由于使用了 ES6 模块，需要通过本地服务器运行：

### 方法 1: Python
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### 方法 2: Node.js
```bash
npx serve
```

### 方法 3: VS Code
安装 "Live Server" 扩展，右键点击 index.html 选择 "Open with Live Server"

然后在浏览器中访问 `http://localhost:8000`

## 操作说明 (Controls)

- **拖拽窗口标题栏**: 移动窗口位置
- **拖拽窗口右下角**: 调整窗口大小
- **重叠窗口**: 物体可以在重叠区域传递

## 技术栈 (Tech Stack)

- HTML5 Canvas
- Matter.js (物理引擎)
- Web Audio API (程序化音效)
- 纯 JavaScript (ES6 模块)

## 美术风格 (Art Style)

- 蓝白双色极简主义
- 像素艺术风格
- 伪 Windows XP UI
- Bayer 抖动阴影

## 色彩规范 (Color Palette)

- 主色 (Background Blue): `#0055EA`
- 高光 (System White): `#FFFFFF`
- 阴影 (Shadow Blue): `#002266`
- 虚空 (Void Black): `#000000`
