/**
 * Main Game Controller
 */

import { Renderer } from './Renderer.js';
import { TheHost } from './TheHost.js';
import { VirtualWindow } from './VirtualWindow.js';
import { DialogueSystem } from './DialogueSystem.js';
import { AudioManager } from './AudioManager.js';
import { AssetGenerator } from './AssetGenerator.js';
import { Director } from './Director.js';
import { PropertyEditor } from './PropertyEditor.js';
import { COLORS, RENDER_WIDTH, RENDER_HEIGHT } from './Constants.js';

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
        this.director = null;
        this.propEditor = null;
        
        // Game state
        this.state = 'intro'; 
        this.hostMood = 0; 
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
        
        // Assets
        this.coverImage = null;
    }
    
    async init() {
        // Setup canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = RENDER_WIDTH;
        this.canvas.height = RENDER_HEIGHT;
        this.ctx.imageSmoothingEnabled = false;
        
        // Initialize Matter.js
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        this.engine.gravity.y = 0; 
        
        // Generate/Load assets
        this.assets = new AssetGenerator();
        await this.assets.generate();
        await this.loadCover(); 
        
        // Initialize subsystems
        this.renderer = new Renderer(this.ctx, this.assets);
        this.host = new TheHost(RENDER_WIDTH / 2, RENDER_HEIGHT / 2, this.assets);
        this.dialogue = new DialogueSystem(this.ctx);
        this.audio = new AudioManager();
        this.director = new Director(this);
        this.propEditor = new PropertyEditor(this);
        
        this.setupInput();
        this.setupCollisions();
        
        this.canvas.addEventListener('click', () => {
            this.audio.init();
        }, { once: true });
        
        // Add keyboard listener for cinematic skip
        window.addEventListener('keydown', () => {
            if (this.state === 'cinematic') {
                this.director.closeCinematic();
            }
        });
        
        // Start Game Flow
        this.director.startCinematic();
        
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    loadCover() {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.coverImage = img;
                resolve();
            };
            img.onerror = () => {
                console.warn("Cover image not found, skipping.");
                resolve();
            };
            img.src = 'assets/cover.png';
        });
    }
    
    // --- Flow Control ---
    
    startIntro() {
        this.state = 'intro';
        this.host.visible = false; 
        this.host.faceScale = 1.0; // Reset scale after cinematic
        this.host.coronaScale = 1.0;
        
        const win = new VirtualWindow(
            RENDER_WIDTH / 2 - 50, RENDER_HEIGHT / 2 - 40, 100, 80,
            'INIT.exe', 'lunar', this
        );
        win.bgColor = COLORS.SYSTEM_WHITE;
        win.isIntroWindow = true; 
        win.spawnIn(this.world);
        this.windows = [win];
        
        this.director.startIntro();
    }
    
    startStage1() {
        this.state = 'stage1';
        this.host.visible = true; 
        
        if (this.windows[0]) {
             this.windows[0].destroy(this.world); 
        }
        this.windows = [];
        
        const winA = new VirtualWindow(
            100, 80, 200, 150,
            'STATION.exe',
            'lunar',
            this
        );
        winA.spawnIn(this.world);
        this.windows.push(winA);
        
        setTimeout(() => {
            winA.spawnObject('mass', 'cube');
        }, 1000);
    }
    
    startStage2() {
        this.state = 'stage2';
        this.propEditor.unlock();
        this.dialogue.typeText("System Privileges: ESCALATED (Right-Click Enabled)", 4000);
        
        const winB = new VirtualWindow(
            340, 50, 200, 150,
            'VOID.exe',
            'void',
            this
        );
        winB.spawnIn(this.world);
        this.windows.push(winB);
        
        setTimeout(() => {
            winB.spawnObject('void', 'sphere');
            this.dialogue.typeText("This is Eternity. No direction. Catch it.", 3000);
        }, 1000);
    }
    
    startStage3() {
        this.state = 'stage3';
        this.dialogue.typeText("Let the Heavy... touch the Void.", 3000);
        this.host.coronaSpeed = 0.005;
    }
    
    startFinale() {
        this.state = 'finale';
        this.host.coronaSpeed = 0.02;
        this.dialogue.typeText("Not enough. Crush the cage. I want out.", 3000);
    }
    
    // --- Rendering ---

    render() {
        const ctx = this.ctx;
        
        // Background
        if (this.state === 'cinematic') {
            ctx.fillStyle = '#000000'; // Black for cinematic
        } else {
            ctx.fillStyle = COLORS.BACKGROUND_BLUE;
        }
        ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
        
        // 1. Cover (only in intro)
        if (this.state === 'intro' && this.coverImage) {
            ctx.drawImage(this.coverImage, 0, 0, RENDER_WIDTH, RENDER_HEIGHT);
        }
        
        // 2. Host (if visible)
        this.host.render(ctx);
        
        // 3. Windows
        for (const win of this.windows) {
            win.render(ctx);
        }
        
        // 4. Effects/UI
        if (this.renderer.glitchIntensity > 0) {
            this.renderer.applyGlitch();
        }
        
        // Cinematic Text
        if (this.state === 'cinematic') {
            this.renderer.drawCinematicText(); // Draw CMD Window first
            this.host.render(ctx); // Draw Host ON TOP of the CMD window
        } else {
            this.dialogue.render(); 
        }
        
        this.renderer.drawCursor(this.mouse.x, this.mouse.y);
    }

    setupInput() {
        const getScaledMouse = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = RENDER_WIDTH / rect.width;
            const scaleY = rect.height / RENDER_HEIGHT;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };
        
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = getScaledMouse(e);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            if (this.dragTarget) this.dragTarget.onDrag(pos.x, pos.y);
            if (this.resizeTarget) this.resizeTarget.onResize(pos.x, pos.y);
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            const pos = getScaledMouse(e);
            this.mouse.down = true;
            
            // Interaction for Cinematic Close Button
            if (this.state === 'cinematic' && this.renderer.closeBtnRect) {
                const btn = this.renderer.closeBtnRect;
                if (pos.x >= btn.x && pos.x <= btn.x + btn.w &&
                    pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                    
                    this.director.closeCinematic();
                    return;
                }
            }
            
            for (let i = this.windows.length - 1; i >= 0; i--) {
                const win = this.windows[i];
                if (win.hitTestResize(pos.x, pos.y)) {
                    this.resizeTarget = win;
                    win.startResize(pos.x, pos.y);
                    this.windows.splice(i, 1);
                    this.windows.push(win);
                    return;
                }
                if (win.hitTestTitleBar(pos.x, pos.y)) {
                    win.clickCount = (win.clickCount || 0) + 1;
                    if (win.clickCount > 5) { this.director.forceSkip(); win.clickCount = 0; }
                    this.dragTarget = win;
                    win.startDrag(pos.x, pos.y);
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
            for (const win of this.windows) { win.endDrag(); win.endResize(); }
        });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setupCollisions() {
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            for (const pair of event.pairs) {
                const force = Math.sqrt(
                    Math.pow(pair.bodyA.velocity.x - pair.bodyB.velocity.x, 2) +
                    Math.pow(pair.bodyA.velocity.y - pair.bodyB.velocity.y, 2)
                );
                if (force > 2) this.audio.playCollision(force > 5 ? 'heavy' : 'light');
                if (this.director) this.director.reportCollision(force);
                if (this.state === 'stage3' && force > 8) this.checkAlchemy(pair.bodyA, pair.bodyB);
            }
        });
    }
    
    checkAlchemy(bodyA, bodyB) {
        const isMassVoid = (bodyA.label === 'mass' && bodyB.label === 'void') ||
                          (bodyA.label === 'void' && bodyB.label === 'mass');
        if (isMassVoid) this.onAlchemySuccess(bodyA, bodyB);
    }
    
    onAlchemySuccess(bodyA, bodyB) {
        Matter.Composite.remove(this.world, bodyA);
        Matter.Composite.remove(this.world, bodyB);
        this.startFinale();
    }
    
    triggerCrash() {
        this.state = 'crash';
        this.host.coronaSpeed = -0.1;
        setTimeout(() => { this.renderer.glitchIntensity = 1; }, 500);
        setTimeout(() => { this.host.jumpScare = true; this.audio.playError(); }, 2000);
        setTimeout(() => { window.location.href = 'about:blank'; }, 3000);
    }
    
    onObjectLost(obj) {
        this.failCount++;
        this.hostMood += 10;
        this.audio.playError();
        this.host.coronaSpeed = 0.002 + (this.hostMood * 0.0005);
        if (this.hostMood >= 100) this.resetCurrentStage();
    }
    
    resetCurrentStage() {
        for (const win of this.windows) win.clearObjects();
        this.hostMood = 50;
        if (this.state === 'stage1') this.windows[0]?.spawnObject('mass', 'cube');
        else if (this.state === 'stage2') this.windows[1]?.spawnObject('void', 'sphere');
        else if (this.state === 'stage3') {
            this.windows[0]?.spawnObject('mass', 'cube');
            this.windows[1]?.spawnObject('void', 'sphere');
        }
    }
    
    checkStageCompletion() {
        if (this.state === 'finale') {
            if (this.windows.length >= 2) {
                const overlap = this.calculateWindowOverlap(this.windows[0], this.windows[1]);
                if (overlap > 0.8) this.triggerCrash();
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
        return (overlapX * overlapY) / Math.min(winA.width * winA.height, winB.width * winB.height);
    }
    
    updateWindowTransfers() {
        if (this.windows.length < 2) return;
        for (let i = 0; i < this.windows.length; i++) {
            for (let j = i + 1; j < this.windows.length; j++) {
                const winA = this.windows[i];
                const winB = this.windows[j];
                const overlap = this.getOverlapRect(winA, winB);
                if (!overlap) continue;
                this.transferObjectsInOverlap(winA, winB, overlap);
                this.transferObjectsInOverlap(winB, winA, overlap);
            }
        }
    }
    
    getOverlapRect(winA, winB) {
        const x1 = Math.max(winA.x, winB.x);
        const y1 = Math.max(winA.y + 20, winB.y + 20);
        const x2 = Math.min(winA.x + winA.width, winB.x + winB.width);
        const y2 = Math.min(winA.y + winA.height, winB.y + winB.height);
        if (x2 > x1 && y2 > y1) return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
        return null;
    }
    
    transferObjectsInOverlap(fromWin, toWin, overlap) {
        const toTransfer = [];
        for (const obj of fromWin.objects) {
            const pos = obj.position;
            // Check if object center is in overlap region
            // Simplified check: Allow transfer if center is inside overlap
            if (pos.x >= overlap.x && pos.x <= overlap.x + overlap.width &&
                pos.y >= overlap.y && pos.y <= overlap.y + overlap.height) {
                
                // Avoid rapid oscillation: Check if it's already compatible with target?
                // Or just move it.
                if (obj.windowType !== toWin.type) {
                     toTransfer.push(obj);
                     
                     // Play transfer sound
                     this.dialogue.typeText(`Transfer: ${fromWin.type} -> ${toWin.type}`, 1000);
                }
            }
        }
        for (const obj of toTransfer) fromWin.transferObject(obj, toWin);
    }
    
    gameLoop(currentTime) {
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        Matter.Engine.update(this.engine, this.deltaTime);
        this.host.update(this.deltaTime);
        this.dialogue.update(this.deltaTime);
        this.director.update(this.deltaTime);
        for (const win of this.windows) win.update(this.deltaTime);
        this.updateWindowTransfers();
        this.checkStageCompletion();
        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}
