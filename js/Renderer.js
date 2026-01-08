/**
 * Renderer - Handles visual effects and rendering utilities
 */

import { COLORS, RENDER_WIDTH, RENDER_HEIGHT } from './Constants.js';

export class Renderer {
    constructor(ctx, assets) {
        this.ctx = ctx;
        this.assets = assets;
        
        // Effects state
        this.glitchIntensity = 0;
        this.flickerAlpha = 0;
        
        // Console / Terminal State
        this.consoleLines = []; 
        this.consoleAlpha = 1;  
    }
    
    // ... (Keep existing flicker/glitch methods) ...
    
    async flickerScreen(count) {
        for (let i = 0; i < count; i++) {
            await this.flicker();
            await this.delay(200 + Math.random() * 300);
        }
    }
    
    flicker() {
        return new Promise((resolve) => {
            const ctx = this.ctx;
            const startTime = Date.now();
            const duration = 100;
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress < 1) {
                    this.flickerAlpha = Math.random() * 0.5;
                    requestAnimationFrame(animate);
                } else {
                    this.flickerAlpha = 0;
                    resolve();
                }
            };
            animate();
        });
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    applyGlitch() {
        if (this.glitchIntensity <= 0) return;
        const ctx = this.ctx;
        const intensity = this.glitchIntensity;
        const sliceCount = Math.floor(5 + intensity * 10);
        const sliceHeight = RENDER_HEIGHT / sliceCount;
        for (let i = 0; i < sliceCount; i++) {
            if (Math.random() < intensity * 0.3) {
                const y = i * sliceHeight;
                const offset = (Math.random() - 0.5) * intensity * 20;
                try {
                    const imageData = ctx.getImageData(0, y, RENDER_WIDTH, sliceHeight);
                    ctx.putImageData(imageData, offset, y);
                } catch (e) {}
            }
        }
    }
    
    drawCursor(x, y) {
        const ctx = this.ctx;
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 12);
        ctx.lineTo(x + 4, y + 9);
        ctx.lineTo(x + 7, y + 14);
        ctx.lineTo(x + 9, y + 13);
        ctx.lineTo(x + 6, y + 8);
        ctx.lineTo(x + 10, y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = COLORS.SHADOW_BLUE;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    setConsoleLines(lines) {
        this.consoleLines = lines;
    }
    
    fadeOutConsole(duration) {
        const startTime = Date.now();
        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                if (progress < 1) {
                    this.consoleAlpha = 1 - progress;
                    requestAnimationFrame(animate);
                } else {
                    this.consoleAlpha = 0;
                    resolve();
                }
            };
            animate();
        });
    }

    drawCinematicText() {
        // Draw CMD Window
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = this.consoleAlpha;
        
        // Window Position
        const winX = 40;
        const winY = 30;
        const winW = RENDER_WIDTH - 80;
        const winH = RENDER_HEIGHT - 60;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(winX + 4, winY + 4, winW, winH);
        
        // Main Body (Match Theme Blue)
        ctx.fillStyle = COLORS.BACKGROUND_BLUE;
        ctx.fillRect(winX, winY, winW, winH);
        ctx.strokeStyle = COLORS.SYSTEM_WHITE;
        ctx.lineWidth = 1;
        ctx.strokeRect(winX, winY, winW, winH);
        
        // Title Bar
        const titleH = 18;
        ctx.fillStyle = COLORS.SYSTEM_WHITE; // White bar
        ctx.fillRect(winX, winY, winW, titleH);
        
        ctx.fillStyle = COLORS.BACKGROUND_BLUE;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText("C:\\WINDOWS\\system32\\cmd.exe", winX + 6, winY + titleH/2);
        
        // Close Button [X]
        const btnSize = 12;
        const btnX = winX + winW - btnSize - 3;
        const btnY = winY + 3;
        
        // Save button rect for hit testing in Game.js
        this.closeBtnRect = { x: btnX, y: btnY, w: btnSize, h: btnSize };
        
        ctx.strokeStyle = COLORS.BACKGROUND_BLUE;
        ctx.strokeRect(btnX, btnY, btnSize, btnSize);
        ctx.beginPath();
        ctx.moveTo(btnX + 2, btnY + 2);
        ctx.lineTo(btnX + btnSize - 2, btnY + btnSize - 2);
        ctx.moveTo(btnX + btnSize - 2, btnY + 2);
        ctx.lineTo(btnX + 2, btnY + btnSize - 2);
        ctx.stroke();

        // Content
        // Ensure text stays within window
        ctx.beginPath();
        ctx.rect(winX, winY + titleH, winW, winH - titleH);
        ctx.clip();
        
        ctx.fillStyle = '#CCCCCC'; // Light Grey Text
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const padding = 10;
        const lineHeight = 16;
        const startX = winX + padding;
        const startY = winY + titleH + padding;
        
        this.consoleLines.forEach((line, i) => {
            ctx.fillText(line, startX, startY + i * lineHeight);
        });
        
        // Blinking Cursor
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            const lastLine = this.consoleLines[this.consoleLines.length - 1] || "";
            const width = ctx.measureText(lastLine).width;
            const cursorY = startY + (Math.max(0, this.consoleLines.length - 1)) * lineHeight;
            ctx.fillRect(startX + width + 2, cursorY, 8, 12);
        }
        
        ctx.restore();
    }
}
