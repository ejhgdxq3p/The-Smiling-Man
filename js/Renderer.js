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
        this.scanlineOffset = 0;
    }
    
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
        
        // Random horizontal shifts
        const sliceCount = Math.floor(5 + intensity * 10);
        const sliceHeight = RENDER_HEIGHT / sliceCount;
        
        for (let i = 0; i < sliceCount; i++) {
            if (Math.random() < intensity * 0.3) {
                const y = i * sliceHeight;
                const offset = (Math.random() - 0.5) * intensity * 20;
                
                // Get image data and shift
                try {
                    const imageData = ctx.getImageData(0, y, RENDER_WIDTH, sliceHeight);
                    ctx.putImageData(imageData, offset, y);
                } catch (e) {
                    // Security error on some browsers
                }
            }
        }
        
        // Color channel separation
        if (intensity > 0.5) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = intensity * 0.2;
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(2, 0, RENDER_WIDTH, RENDER_HEIGHT);
            ctx.fillStyle = '#0000FF';
            ctx.fillRect(-2, 0, RENDER_WIDTH, RENDER_HEIGHT);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }
        
        // Scanlines
        this.drawScanlines(intensity);
    }
    
    drawScanlines(intensity = 0.3) {
        const ctx = this.ctx;
        ctx.fillStyle = `rgba(0, 0, 0, ${intensity * 0.2})`;
        
        for (let y = 0; y < RENDER_HEIGHT; y += 2) {
            ctx.fillRect(0, y, RENDER_WIDTH, 1);
        }
    }
    
    drawCursor(x, y) {
        const ctx = this.ctx;
        
        // Simple pixel cursor
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        
        // Arrow shape
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
        
        // Outline
        ctx.strokeStyle = COLORS.SHADOW_BLUE;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    drawDitheredRect(x, y, w, h, color1, color2, density = 0.5) {
        const ctx = this.ctx;
        
        // Fill base color
        ctx.fillStyle = color1;
        ctx.fillRect(x, y, w, h);
        
        // Apply Bayer dithering
        ctx.fillStyle = color2;
        const bayerMatrix = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ];
        
        const threshold = density * 16;
        
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const bayerValue = bayerMatrix[py % 4][px % 4];
                if (bayerValue < threshold) {
                    ctx.fillRect(x + px, y + py, 1, 1);
                }
            }
        }
    }
    
    drawPixelText(text, x, y, color = COLORS.SYSTEM_WHITE, size = 8) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.font = `${size}px monospace`;
        ctx.textBaseline = 'top';
        
        // Shadow
        ctx.fillStyle = COLORS.SHADOW_BLUE;
        ctx.fillText(text, x + 1, y + 1);
        
        // Main text
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }
}
