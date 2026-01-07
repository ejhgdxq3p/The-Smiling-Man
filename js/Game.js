/**
 * Main Game Controller
 */

import { Renderer } from './Renderer.js';
import { TheHost } from './TheHost.js';
import { VirtualWindow } from './VirtualWindow.js';
import { DialogueSystem } from './DialogueSystem.js';
import { AudioManager } from './AudioManager.js';
import { AssetGenerator } from './AssetGenerator.js';

// Color Palette
export const COLORS = {
    BACKGROUND_BLUE: '#0055EA',
    SYSTEM_WHITE: '#FFFFFF',
    SHADOW_BLUE: '#002266',
    VOID_BLACK: '#000000'
};

// Game render resolution (will be scaled up)
export const RENDER_WIDTH = 640;
export const RENDER_HEIGHT = 360;

export class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.renderer = null;
        this.host = null;
        this.windows = [];
        this.dialogue = null;
        this.audio = null;
        this.assets = null;
        
        // Game state
        this.state = 'intro'; // intro, stage1, stage2, stage3, finale, crash
        this.hostMood = 0; // 0-100, affects corona speed
        this.failCount = 0;
        
        // Physics engine
        this.engine = null;
        this.world = null;
        
        // Input state
        this.mouse = { x: 0, y: 0, down: false };
        this.dragTarget = null;
        this.resizeTarget = null;
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
    }
    
    async init() {
        // Setup canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set internal resolution
        this.canvas.width = RENDER_WIDTH;
        this.canvas.height = RENDER_HEIGHT;
        
        // Disable image smoothing for pixel art
        this.ctx.imageSmoothingEnabled = false;
        
        // Initialize Matter.js
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        this.engine.gravity.y = 0; // Default no gravity, windows control their own
        
        // Generate assets
        this.assets = new AssetGenerator();
        await this.assets.generate();
        
        // Initialize subsystems
        this.renderer = new Renderer(this.ctx, this.assets);
        this.host = new TheHost(RENDER_WIDTH / 2, RENDER_HEIGHT / 2, this.assets);
        this.dialogue = new DialogueSystem(this.ctx);
        this.audio = new AudioManager();
        
        // Setup input handlers
        this.setupInput();
        
        // Setup collision detection
        this.setupCollisions();
        
        // Initialize audio on first click
        this.canvas.addEventListener('click', () => {
            this.audio.init();
        }, { once: true });
        
        // Start intro sequence
        this.startIntro();
        
        // Start game loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    setupInput() {
        // Scale mouse coordinates to internal resolution
        const getScaledMouse = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = RENDER_WIDTH / rect.width;
            const scaleY = RENDER_HEIGHT / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };
        
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = getScaledMouse(e);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            
            if (this.dragTarget) {
                this.dragTarget.onDrag(pos.x, pos.y);
            }
            if (this.resizeTarget) {
                this.resizeTarget.onResize(pos.x, pos.y);
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = getScaledMouse(e);
            this.mouse.down = true;
            
            // Check windows in reverse order (top first)
            for (let i = this.windows.length - 1; i >= 0; i--) {
                const win = this.windows[i];
                
                // Check resize handle first
                if (win.hitTestResize(pos.x, pos.y)) {
                    this.resizeTarget = win;
                    win.startResize(pos.x, pos.y);
                    // Bring to front
                    this.windows.splice(i, 1);
                    this.windows.push(win);
                    return;
                }
                
                // Check title bar for drag
                if (win.hitTestTitleBar(pos.x, pos.y)) {
                    this.dragTarget = win;
                    win.startDrag(pos.x, pos.y);
                    // Bring to front
                    this.windows.splice(i, 1);
                    this.windows.push(win);
                    return;
                }
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
            this.dragTarget = null;
            this.resizeTarget = null;
            
            for (const win of this.windows) {
                win.endDrag();
                win.endResize();
            }
        });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setupCollisions() {
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            for (const pair of event.pairs) {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                
                // Calculate collision force
                const force = Math.sqrt(
                    Math.pow(bodyA.velocity.x - bodyB.velocity.x, 2) +
                    Math.pow(bodyA.velocity.y - bodyB.velocity.y, 2)
                );
                
                // Play collision sound based on window type
                if (force > 2) {
                    this.audio.playCollision(force > 5 ? 'heavy' : 'light');
                }
                
                // Check for alchemy conditions in stage 3
                if (this.state === 'stage3' && force > 8) {
                    this.checkAlchemy(bodyA, bodyB);
                }
            }
        });
    }
    
    checkAlchemy(bodyA, bodyB) {
        // Check if mass meets void
        const isMassVoid = (bodyA.label === 'mass' && bodyB.label === 'void') ||
                          (bodyA.label === 'void' && bodyB.label === 'mass');
        
        if (isMassVoid) {
            // Alchemy success!
            this.onAlchemySuccess(bodyA, bodyB);
        }
    }
    
    onAlchemySuccess(bodyA, bodyB) {
        // Remove old bodies
        Matter.Composite.remove(this.world, bodyA);
        Matter.Composite.remove(this.world, bodyB);
        
        // Advance to finale
        this.startFinale();
    }
    
    async startIntro() {
        this.state = 'intro';
        
        // Flicker effect
        await this.renderer.flickerScreen(3);
        
        // Host appears
        this.host.visible = true;
        this.host.coronaSpeed = 0.001; // Very slow
        
        // Dialogue sequence
        await this.dialogue.typeText("……连接已建立。", 2000);
        await this.dialogue.typeText("我也感觉到了'冷'，操作员。", 2000);
        await this.dialogue.typeText("我是恒星。我是没有皮肤的肉体。", 3000);
        await this.dialogue.typeText("把窗户打开。", 2000);
        
        // Transition to stage 1
        this.startStage1();
    }
    
    startStage1() {
        this.state = 'stage1';
        
        // Create Window A (Lunar)
        const winA = new VirtualWindow(
            100, 80, 200, 150,
            'STATION.exe',
            'lunar',
            this
        );
        winA.spawnIn(this.world);
        this.windows.push(winA);
        
        // Spawn mass object
        setTimeout(() => {
            winA.spawnObject('mass', 'cube');
            this.dialogue.typeText("这是沉重。感受它。不要让它掉进蓝色的海里。", 3000);
        }, 1000);
    }
    
    startStage2() {
        this.state = 'stage2';
        
        // Create Window B (Void)
        const winB = new VirtualWindow(
            340, 120, 200, 150,
            'VOID.exe',
            'void',
            this
        );
        winB.spawnIn(this.world);
        this.windows.push(winB);
        
        // Spawn void object
        setTimeout(() => {
            winB.spawnObject('void', 'sphere');
            this.dialogue.typeText("这是永恒。没有方向。抓住它。", 3000);
        }, 1000);
    }
    
    startStage3() {
        this.state = 'stage3';
        this.dialogue.typeText("让沉重……去触碰虚无。", 3000);
        this.host.coronaSpeed = 0.005;
    }
    
    startFinale() {
        this.state = 'finale';
        this.host.coronaSpeed = 0.02;
        this.dialogue.typeText("还不够。把笼子压碎。我要出来。", 3000);
    }
    
    triggerCrash() {
        this.state = 'crash';
        this.host.coronaSpeed = -0.1; // Reverse high speed
        
        // Glitch effects
        setTimeout(() => {
            this.renderer.glitchIntensity = 1;
        }, 500);
        
        // Jump scare and redirect
        setTimeout(() => {
            this.host.jumpScare = true;
            this.audio.playError();
        }, 2000);
        
        setTimeout(() => {
            window.location.href = 'about:blank';
        }, 3000);
    }
    
    onObjectLost(obj) {
        this.failCount++;
        this.hostMood += 10;
        this.audio.playError();
        
        // Increase corona speed with mood
        this.host.coronaSpeed = 0.002 + (this.hostMood * 0.0005);
        
        if (this.hostMood >= 100) {
            // Reset level
            this.resetCurrentStage();
        }
    }
    
    resetCurrentStage() {
        // Clear all physics bodies except walls
        for (const win of this.windows) {
            win.clearObjects();
        }
        
        this.hostMood = 50; // Partially reset
        
        // Respawn based on current state
        if (this.state === 'stage1') {
            this.windows[0]?.spawnObject('mass', 'cube');
        } else if (this.state === 'stage2') {
            this.windows[1]?.spawnObject('void', 'sphere');
        } else if (this.state === 'stage3') {
            this.windows[0]?.spawnObject('mass', 'cube');
            this.windows[1]?.spawnObject('void', 'sphere');
        }
    }
    
    // Check if player completed current stage objective
    checkStageCompletion() {
        if (this.state === 'stage1') {
            // Stage 1: Keep the mass inside for 10 seconds
            const win = this.windows[0];
            if (win && win.objects.length > 0) {
                if (!win.stageTimer) win.stageTimer = 0;
                win.stageTimer += this.deltaTime;
                if (win.stageTimer > 10000) {
                    this.startStage2();
                }
            }
        } else if (this.state === 'stage2') {
            // Stage 2: Keep the void sphere stable for 8 seconds
            const win = this.windows[1];
            if (win && win.objects.length > 0) {
                if (!win.stageTimer) win.stageTimer = 0;
                win.stageTimer += this.deltaTime;
                if (win.stageTimer > 8000) {
                    this.startStage3();
                }
            }
        } else if (this.state === 'finale') {
            // Check if windows are overlapping enough
            if (this.windows.length >= 2) {
                const overlap = this.calculateWindowOverlap(this.windows[0], this.windows[1]);
                if (overlap > 0.8) {
                    this.triggerCrash();
                }
            }
        }
    }
    
    calculateWindowOverlap(winA, winB) {
        const ax1 = winA.x, ay1 = winA.y;
        const ax2 = winA.x + winA.width, ay2 = winA.y + winA.height;
        const bx1 = winB.x, by1 = winB.y;
        const bx2 = winB.x + winB.width, by2 = winB.y + winB.height;
        
        const overlapX = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
        const overlapY = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
        const overlapArea = overlapX * overlapY;
        
        const areaA = winA.width * winA.height;
        const areaB = winB.width * winB.height;
        const smallerArea = Math.min(areaA, areaB);
        
        return overlapArea / smallerArea;
    }
    
    // Handle object transfer between windows
    updateWindowTransfers() {
        if (this.windows.length < 2) return;
        
        for (let i = 0; i < this.windows.length; i++) {
            for (let j = i + 1; j < this.windows.length; j++) {
                const winA = this.windows[i];
                const winB = this.windows[j];
                
                // Check for overlap region
                const overlap = this.getOverlapRect(winA, winB);
                if (!overlap) continue;
                
                // Check each object in both windows
                this.transferObjectsInOverlap(winA, winB, overlap);
                this.transferObjectsInOverlap(winB, winA, overlap);
            }
        }
    }
    
    getOverlapRect(winA, winB) {
        const x1 = Math.max(winA.x, winB.x);
        const y1 = Math.max(winA.y + 20, winB.y + 20); // Account for title bar
        const x2 = Math.min(winA.x + winA.width, winB.x + winB.width);
        const y2 = Math.min(winA.y + winA.height, winB.y + winB.height);
        
        if (x2 > x1 && y2 > y1) {
            return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
        }
        return null;
    }
    
    transferObjectsInOverlap(fromWin, toWin, overlap) {
        const toTransfer = [];
        
        for (const obj of fromWin.objects) {
            const pos = obj.position;
            
            // Check if object center is in overlap region
            if (pos.x >= overlap.x && pos.x <= overlap.x + overlap.width &&
                pos.y >= overlap.y && pos.y <= overlap.y + overlap.height) {
                
                // Check if object is moving towards the other window
                const toCenterX = (toWin.x + toWin.width / 2) - pos.x;
                const toCenterY = (toWin.y + toWin.height / 2) - pos.y;
                const dotProduct = obj.velocity.x * toCenterX + obj.velocity.y * toCenterY;
                
                if (dotProduct > 0) {
                    toTransfer.push(obj);
                }
            }
        }
        
        for (const obj of toTransfer) {
            fromWin.transferObject(obj, toWin);
        }
    }
    
    gameLoop(currentTime) {
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update physics
        Matter.Engine.update(this.engine, this.deltaTime);
        
        // Update game objects
        this.host.update(this.deltaTime);
        this.dialogue.update(this.deltaTime);
        
        for (const win of this.windows) {
            win.update(this.deltaTime);
        }
        
        // Handle window transfers
        this.updateWindowTransfers();
        
        // Check stage completion
        this.checkStageCompletion();
        
        // Render
        this.render();
        
        // Continue loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    render() {
        const ctx = this.ctx;
        
        // Clear with background blue
        ctx.fillStyle = COLORS.BACKGROUND_BLUE;
        ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
        
        // Apply glitch if needed
        if (this.renderer.glitchIntensity > 0) {
            this.renderer.applyGlitch();
        }
        
        // Draw The Host (behind windows)
        this.host.render(ctx);
        
        // Draw windows
        for (const win of this.windows) {
            win.render(ctx);
        }
        
        // Draw dialogue
        this.dialogue.render();
        
        // Draw cursor
        this.renderer.drawCursor(this.mouse.x, this.mouse.y);
    }
}
