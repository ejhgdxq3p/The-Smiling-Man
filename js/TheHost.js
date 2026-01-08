/**
 * TheHost - The Smiling Man (Sun Entity)
 * A cosmic horror entity with a smiling face and rotating corona
 */

import { COLORS } from './Constants.js';

export class TheHost {
    constructor(x, y, assets) {
        this.x = x;
        this.y = y;
        this.assets = assets;
        
        // Visibility
        this.visible = false;
        this.alpha = 0;
        this.targetAlpha = 0.7;
        
        // Corona rotation
        this.coronaAngle = 0;
        this.coronaSpeed = 0.001; // Radians per ms
        this.coronaScale = 1;
        
        // Face properties
        this.faceScale = 1;
        this.faceOffsetY = 0;
        
        // Mood/emotion state
        this.mood = 0; // 0 = calm, 100 = enraged
        
        // Jump scare state
        this.jumpScare = false;
        this.jumpScareScale = 1;
        
        // Glitch effect
        this.glitchTimer = 0;
        this.glitchOffset = { x: 0, y: 0 };
    }
    
    update(deltaTime) {
        if (!this.visible) return;
        
        // Fade in
        if (this.alpha < this.targetAlpha) {
            this.alpha += deltaTime * 0.001;
            this.alpha = Math.min(this.alpha, this.targetAlpha);
        }
        
        // Rotate corona
        this.coronaAngle += this.coronaSpeed * deltaTime;
        
        // Corona pulsing based on mood
        if (this.mood > 50) {
            this.coronaScale = 1 + Math.sin(Date.now() * 0.01) * 0.05 * (this.mood / 100);
        }
        
        // Glitch effect when mood is high
        if (this.mood > 70) {
            this.glitchTimer += deltaTime;
            if (this.glitchTimer > 100) {
                this.glitchTimer = 0;
                this.glitchOffset.x = (Math.random() - 0.5) * (this.mood / 20);
                this.glitchOffset.y = (Math.random() - 0.5) * (this.mood / 20);
            }
        } else {
            this.glitchOffset.x = 0;
            this.glitchOffset.y = 0;
        }
        
        // Jump scare animation
        if (this.jumpScare) {
            this.jumpScareScale = Math.min(this.jumpScareScale + deltaTime * 0.01, 5);
            this.alpha = 1;
        }
    }
    
    render(ctx) {
        if (!this.visible && !this.jumpScare) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        const drawX = this.x + this.glitchOffset.x;
        const drawY = this.y + this.glitchOffset.y;
        
        // Draw corona (behind face)
        this.renderCorona(ctx, drawX, drawY);
        
        // Draw face
        this.renderFace(ctx, drawX, drawY);
        
        ctx.restore();
    }
    
    renderCorona(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.coronaAngle);
        ctx.scale(this.coronaScale * (this.jumpScare ? this.jumpScareScale : 1), 
                  this.coronaScale * (this.jumpScare ? this.jumpScareScale : 1));
        
        if (this.assets.coronaImage) {
            const size = 180;
            ctx.drawImage(this.assets.coronaImage, -size/2, -size/2, size, size);
        } else {
            // Fallback: draw procedural corona
            this.drawProceduralCorona(ctx);
        }
        
        ctx.restore();
    }
    
    renderFace(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y + this.faceOffsetY);
        const scale = this.faceScale * (this.jumpScare ? this.jumpScareScale : 1);
        ctx.scale(scale, scale);
        
        if (this.assets.faceImage) {
            const size = 80;
            ctx.drawImage(this.assets.faceImage, -size/2, -size/2, size, size);
        } else {
            // Fallback: draw procedural face
            this.drawProceduralFace(ctx);
        }
        
        ctx.restore();
    }
    
    drawProceduralCorona(ctx) {
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        
        // Draw gear-like corona with saw teeth
        const innerRadius = 50;
        const outerRadius = 90;
        const teeth = 24;
        
        ctx.beginPath();
        for (let i = 0; i < teeth; i++) {
            const angle1 = (i / teeth) * Math.PI * 2;
            const angle2 = ((i + 0.5) / teeth) * Math.PI * 2;
            
            const x1 = Math.cos(angle1) * innerRadius;
            const y1 = Math.sin(angle1) * innerRadius;
            const x2 = Math.cos(angle2) * outerRadius;
            const y2 = Math.sin(angle2) * outerRadius;
            
            if (i === 0) {
                ctx.moveTo(x1, y1);
            }
            ctx.lineTo(x2, y2);
            
            const angle3 = ((i + 1) / teeth) * Math.PI * 2;
            const x3 = Math.cos(angle3) * innerRadius;
            const y3 = Math.sin(angle3) * innerRadius;
            ctx.lineTo(x3, y3);
        }
        ctx.closePath();
        ctx.fill();
        
        // Cut out center
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius - 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
    
    drawProceduralFace(ctx) {
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        
        // Face outline (oval)
        ctx.beginPath();
        ctx.ellipse(0, 0, 35, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes (dark voids)
        ctx.fillStyle = COLORS.BACKGROUND_BLUE;
        
        // Left eye
        ctx.beginPath();
        ctx.ellipse(-12, -10, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.ellipse(12, -10, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Smiling mouth
        ctx.strokeStyle = COLORS.BACKGROUND_BLUE;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 8, 18, 0.2, Math.PI - 0.2);
        ctx.stroke();
        
        // Nose (simple line)
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
        
        // Add creepy details
        if (this.mood > 30) {
            // Cracks
            ctx.strokeStyle = COLORS.SHADOW_BLUE;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-20, -30);
            ctx.lineTo(-15, -15);
            ctx.lineTo(-18, 0);
            ctx.stroke();
        }
    }
    
    setMood(value) {
        this.mood = Math.max(0, Math.min(100, value));
        
        // Adjust corona speed based on mood
        if (this.mood < 30) {
            this.coronaSpeed = 0.001;
        } else if (this.mood < 60) {
            this.coronaSpeed = 0.003;
        } else if (this.mood < 80) {
            this.coronaSpeed = 0.008;
        } else {
            this.coronaSpeed = 0.015 + (Math.random() - 0.5) * 0.005; // Erratic
        }
    }
    
    triggerJumpScare() {
        this.jumpScare = true;
        this.targetAlpha = 1;
        this.coronaSpeed = -0.1; // Reverse fast
    }
}
