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
        
        // Draw corona (BEHIND face)
        this.renderCorona(ctx, drawX, drawY);
        
        // Draw face (FRONT)
        this.renderFace(ctx, drawX, drawY);
        
        ctx.restore();
    }
    
    renderCorona(ctx, x, y) {
        const img = this.assets.coronaImage;
        if (!img) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.coronaAngle);
        
        const scale = this.coronaScale * (this.jumpScare ? this.jumpScareScale : 1) * 0.6; // Scale down a bit to fit screen
        ctx.scale(scale, scale);
        
        // Draw centered
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        ctx.restore();
    }
    
    renderFace(ctx, x, y) {
        const img = this.assets.faceImage;
        if (!img) return;

        ctx.save();
        ctx.translate(x, y + this.faceOffsetY);
        
        const scale = this.faceScale * (this.jumpScare ? this.jumpScareScale : 1) * 0.6;
        ctx.scale(scale, scale);
        
        // Draw centered
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        ctx.restore();
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
