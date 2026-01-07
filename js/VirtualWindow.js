/**
 * VirtualWindow - A draggable, resizable window that contains its own physics world
 */

import { COLORS, RENDER_WIDTH, RENDER_HEIGHT } from './Game.js';

const TITLE_BAR_HEIGHT = 20;
const BORDER_WIDTH = 3;
const MIN_WIDTH = 100;
const MIN_HEIGHT = 80;
const RESIZE_HANDLE_SIZE = 12;

export class VirtualWindow {
    constructor(x, y, width, height, title, type, game) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.title = title;
        this.type = type; // 'lunar' or 'void'
        this.game = game;
        
        // Physics properties based on type
        if (type === 'lunar') {
            this.gravity = { x: 0, y: 0.0005 }; // 1/6 G
            this.frictionAir = 0.05;
            this.restitution = 0.5;
            this.bgColor = COLORS.SYSTEM_WHITE;
        } else { // void
            this.gravity = { x: 0, y: 0 }; // 0 G
            this.frictionAir = 0;
            this.restitution = 1.0;
            this.bgColor = COLORS.VOID_BLACK;
        }
        
        // Physics bodies
        this.walls = [];
        this.objects = [];
        this.composite = null;
        
        // Drag state
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // Resize state
        this.isResizing = false;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeStartW = 0;
        this.resizeStartH = 0;
        
        // Stage timer
        this.stageTimer = 0;
    }
    
    spawnIn(world) {
        // Create composite for this window
        this.composite = Matter.Composite.create();
        Matter.Composite.add(world, this.composite);
        
        // Create boundary walls
        this.updateWalls();
    }
    
    updateWalls() {
        // Remove old walls
        for (const wall of this.walls) {
            Matter.Composite.remove(this.composite, wall);
        }
        this.walls = [];
        
        const contentX = this.x + BORDER_WIDTH;
        const contentY = this.y + TITLE_BAR_HEIGHT;
        const contentW = this.width - BORDER_WIDTH * 2;
        const contentH = this.height - TITLE_BAR_HEIGHT - BORDER_WIDTH;
        
        const wallOptions = {
            isStatic: true,
            restitution: this.restitution,
            friction: 0.1,
            render: { visible: false }
        };
        
        const thickness = 10;
        
        // Top wall
        this.walls.push(Matter.Bodies.rectangle(
            contentX + contentW / 2, contentY - thickness / 2,
            contentW + thickness * 2, thickness,
            wallOptions
        ));
        
        // Bottom wall
        this.walls.push(Matter.Bodies.rectangle(
            contentX + contentW / 2, contentY + contentH + thickness / 2,
            contentW + thickness * 2, thickness,
            wallOptions
        ));
        
        // Left wall
        this.walls.push(Matter.Bodies.rectangle(
            contentX - thickness / 2, contentY + contentH / 2,
            thickness, contentH,
            wallOptions
        ));
        
        // Right wall
        this.walls.push(Matter.Bodies.rectangle(
            contentX + contentW + thickness / 2, contentY + contentH / 2,
            thickness, contentH,
            wallOptions
        ));
        
        for (const wall of this.walls) {
            Matter.Composite.add(this.composite, wall);
        }
    }
    
    spawnObject(label, shape) {
        const contentX = this.x + BORDER_WIDTH;
        const contentY = this.y + TITLE_BAR_HEIGHT;
        const contentW = this.width - BORDER_WIDTH * 2;
        const contentH = this.height - TITLE_BAR_HEIGHT - BORDER_WIDTH;
        
        const centerX = contentX + contentW / 2;
        const centerY = contentY + contentH / 2;
        
        let body;
        const options = {
            label: label,
            frictionAir: this.frictionAir,
            restitution: this.restitution,
            friction: 0.1
        };
        
        if (shape === 'cube') {
            body = Matter.Bodies.rectangle(centerX, centerY, 25, 25, options);
            body.shapeType = 'cube';
        } else if (shape === 'sphere') {
            body = Matter.Bodies.circle(centerX, centerY, 12, options);
            body.shapeType = 'sphere';
        } else if (shape === 'triangle') {
            body = Matter.Bodies.polygon(centerX, centerY, 3, 15, options);
            body.shapeType = 'triangle';
        }
        
        // Give initial velocity based on type
        if (this.type === 'void') {
            Matter.Body.setVelocity(body, { 
                x: (Math.random() - 0.5) * 2, 
                y: (Math.random() - 0.5) * 2 
            });
        }
        
        body.windowType = this.type;
        this.objects.push(body);
        Matter.Composite.add(this.composite, body);
        
        return body;
    }
    
    clearObjects() {
        for (const obj of this.objects) {
            Matter.Composite.remove(this.composite, obj);
        }
        this.objects = [];
        this.stageTimer = 0;
    }
    
    transferObject(obj, toWindow) {
        // Remove from this window
        const idx = this.objects.indexOf(obj);
        if (idx !== -1) {
            this.objects.splice(idx, 1);
            Matter.Composite.remove(this.composite, obj);
        }
        
        // Update physics properties
        obj.frictionAir = toWindow.frictionAir;
        obj.restitution = toWindow.restitution;
        obj.windowType = toWindow.type;
        
        // Add to new window
        toWindow.objects.push(obj);
        Matter.Composite.add(toWindow.composite, obj);
    }
    
    update(deltaTime) {
        // Apply custom gravity to objects
        const toRemove = [];
        
        for (const obj of this.objects) {
            Matter.Body.applyForce(obj, obj.position, {
                x: this.gravity.x * obj.mass,
                y: this.gravity.y * obj.mass
            });
            
            // Check if object is far outside window bounds (lost)
            // Add margin to prevent false positives during transfers
            const margin = 30;
            if (!this.containsPointWithMargin(obj.position.x, obj.position.y, margin)) {
                toRemove.push(obj);
            }
        }
        
        // Remove lost objects
        for (const obj of toRemove) {
            this.onObjectLost(obj);
        }
    }
    
    containsPointWithMargin(px, py, margin) {
        const contentX = this.x + BORDER_WIDTH - margin;
        const contentY = this.y + TITLE_BAR_HEIGHT - margin;
        const contentW = this.width - BORDER_WIDTH * 2 + margin * 2;
        const contentH = this.height - TITLE_BAR_HEIGHT - BORDER_WIDTH + margin * 2;
        
        return px >= contentX && px <= contentX + contentW &&
               py >= contentY && py <= contentY + contentH;
    }
    
    containsPoint(px, py) {
        const contentX = this.x + BORDER_WIDTH;
        const contentY = this.y + TITLE_BAR_HEIGHT;
        const contentW = this.width - BORDER_WIDTH * 2;
        const contentH = this.height - TITLE_BAR_HEIGHT - BORDER_WIDTH;
        
        return px >= contentX && px <= contentX + contentW &&
               py >= contentY && py <= contentY + contentH;
    }
    
    onObjectLost(obj) {
        // Remove from objects
        const idx = this.objects.indexOf(obj);
        if (idx !== -1) {
            this.objects.splice(idx, 1);
            Matter.Composite.remove(this.composite, obj);
        }
        
        // Notify game
        this.game.onObjectLost(obj);
    }
    
    // Hit testing
    hitTestTitleBar(mx, my) {
        return mx >= this.x && mx <= this.x + this.width &&
               my >= this.y && my <= this.y + TITLE_BAR_HEIGHT;
    }
    
    hitTestResize(mx, my) {
        const handleX = this.x + this.width - RESIZE_HANDLE_SIZE;
        const handleY = this.y + this.height - RESIZE_HANDLE_SIZE;
        return mx >= handleX && mx <= this.x + this.width &&
               my >= handleY && my <= this.y + this.height;
    }
    
    // Drag handling
    startDrag(mx, my) {
        this.isDragging = true;
        this.dragOffsetX = mx - this.x;
        this.dragOffsetY = my - this.y;
    }
    
    onDrag(mx, my) {
        if (!this.isDragging) return;
        
        this.x = mx - this.dragOffsetX;
        this.y = my - this.dragOffsetY;
        
        // Clamp to screen
        this.x = Math.max(0, Math.min(RENDER_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(RENDER_HEIGHT - this.height, this.y));
        
        this.updateWalls();
        this.updateObjectPositions();
    }
    
    endDrag() {
        this.isDragging = false;
    }
    
    // Resize handling
    startResize(mx, my) {
        this.isResizing = true;
        this.resizeStartX = mx;
        this.resizeStartY = my;
        this.resizeStartW = this.width;
        this.resizeStartH = this.height;
    }
    
    onResize(mx, my) {
        if (!this.isResizing) return;
        
        const dx = mx - this.resizeStartX;
        const dy = my - this.resizeStartY;
        
        this.width = Math.max(MIN_WIDTH, this.resizeStartW + dx);
        this.height = Math.max(MIN_HEIGHT, this.resizeStartH + dy);
        
        // Clamp to screen
        if (this.x + this.width > RENDER_WIDTH) {
            this.width = RENDER_WIDTH - this.x;
        }
        if (this.y + this.height > RENDER_HEIGHT) {
            this.height = RENDER_HEIGHT - this.y;
        }
        
        this.updateWalls();
    }
    
    endResize() {
        this.isResizing = false;
    }
    
    updateObjectPositions() {
        // When window moves, objects stay in world space
        // Walls will push them if needed
    }
    
    render(ctx) {
        // Draw window frame (XP style, pixelated)
        this.drawWindowFrame(ctx);
        
        // Clip content area
        ctx.save();
        ctx.beginPath();
        ctx.rect(
            this.x + BORDER_WIDTH,
            this.y + TITLE_BAR_HEIGHT,
            this.width - BORDER_WIDTH * 2,
            this.height - TITLE_BAR_HEIGHT - BORDER_WIDTH
        );
        ctx.clip();
        
        // Draw background
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(
            this.x + BORDER_WIDTH,
            this.y + TITLE_BAR_HEIGHT,
            this.width - BORDER_WIDTH * 2,
            this.height - TITLE_BAR_HEIGHT - BORDER_WIDTH
        );
        
        // Draw grid for lunar type
        if (this.type === 'lunar') {
            this.drawGrid(ctx);
        }
        
        // Draw objects
        for (const obj of this.objects) {
            this.drawObject(ctx, obj);
        }
        
        ctx.restore();
    }
    
    drawWindowFrame(ctx) {
        const assets = this.game.assets;
        
        // Outer border (shadow)
        ctx.fillStyle = COLORS.SHADOW_BLUE;
        ctx.fillRect(this.x + 2, this.y + 2, this.width, this.height);
        
        // Main border
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Title bar
        ctx.fillStyle = COLORS.BACKGROUND_BLUE;
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, TITLE_BAR_HEIGHT - 2);
        
        // Title text
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.font = '10px monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.title, this.x + 6, this.y + TITLE_BAR_HEIGHT / 2 + 1);
        
        // Close button (decorative)
        const btnX = this.x + this.width - 16;
        const btnY = this.y + 4;
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.fillRect(btnX, btnY, 12, 12);
        ctx.fillStyle = COLORS.BACKGROUND_BLUE;
        ctx.fillRect(btnX + 2, btnY + 2, 8, 8);
        
        // Resize handle
        ctx.fillStyle = COLORS.SHADOW_BLUE;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j <= i; j++) {
                const px = this.x + this.width - 4 - i * 3;
                const py = this.y + this.height - 4 - j * 3;
                ctx.fillRect(px, py, 2, 2);
            }
        }
    }
    
    drawGrid(ctx) {
        ctx.strokeStyle = COLORS.SHADOW_BLUE;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        
        const startX = this.x + BORDER_WIDTH;
        const startY = this.y + TITLE_BAR_HEIGHT;
        const endX = this.x + this.width - BORDER_WIDTH;
        const endY = this.y + this.height - BORDER_WIDTH;
        const gridSize = 20;
        
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    drawObject(ctx, obj) {
        const pos = obj.position;
        const angle = obj.angle;
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        
        // Determine color based on window type
        const fillColor = this.type === 'void' ? COLORS.SYSTEM_WHITE : COLORS.SHADOW_BLUE;
        const strokeColor = this.type === 'void' ? COLORS.SHADOW_BLUE : COLORS.SYSTEM_WHITE;
        
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        
        if (obj.shapeType === 'cube') {
            ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeRect(-12, -12, 24, 24);
            
            // Dithering pattern
            this.applyDithering(ctx, -12, -12, 24, 24, strokeColor);
        } else if (obj.shapeType === 'sphere') {
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (obj.shapeType === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(13, 10);
            ctx.lineTo(-13, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    applyDithering(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        // Bayer 4x4 dithering pattern
        for (let py = y; py < y + h; py += 4) {
            for (let px = x; px < x + w; px += 4) {
                ctx.fillRect(px + 1, py + 1, 1, 1);
                ctx.fillRect(px + 3, py + 3, 1, 1);
            }
        }
    }
}
