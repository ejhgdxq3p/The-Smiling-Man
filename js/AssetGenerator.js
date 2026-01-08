/**
 * AssetGenerator - Procedurally generates all pixel art assets
 */

import { COLORS } from './Constants.js';

export class AssetGenerator {
    constructor() {
        this.faceImage = null;
        this.coronaImage = null;
        this.windowAssets = null;
    }
    
    async generate() {
        this.faceImage = this.generateFace();
        this.coronaImage = this.generateCorona();
        this.windowAssets = this.generateWindowAssets();
    }
    
    generateFace() {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Clear
        ctx.clearRect(0, 0, size, size);
        
        const cx = size / 2;
        const cy = size / 2;
        
        // Face shape (oval)
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 45, 55, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Shadows with dithering
        this.applyDithering(ctx, cx - 45, cy - 20, 20, 40, COLORS.SHADOW_BLUE, 0.3);
        this.applyDithering(ctx, cx + 25, cy - 20, 20, 40, COLORS.SHADOW_BLUE, 0.3);
        
        // Eyes - hollow, unsettling
        ctx.fillStyle = COLORS.BACKGROUND_BLUE;
        
        // Left eye
        ctx.beginPath();
        ctx.ellipse(cx - 15, cy - 12, 8, 5, -0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.ellipse(cx + 15, cy - 12, 8, 5, 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye highlights (small white dots)
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.fillRect(cx - 18, cy - 14, 2, 2);
        ctx.fillRect(cx + 12, cy - 14, 2, 2);
        
        // Nose
        ctx.strokeStyle = COLORS.SHADOW_BLUE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx - 3, cy + 8);
        ctx.lineTo(cx + 3, cy + 8);
        ctx.stroke();
        
        // Mouth - the unsettling smile
        ctx.strokeStyle = COLORS.BACKGROUND_BLUE;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy + 15, 25, 0.3, Math.PI - 0.3);
        ctx.stroke();
        
        // Teeth hints
        ctx.fillStyle = COLORS.SHADOW_BLUE;
        for (let i = -3; i <= 3; i++) {
            ctx.fillRect(cx + i * 6, cy + 22, 1, 8);
        }
        
        // Wrinkle lines (age/creepiness)
        ctx.strokeStyle = COLORS.SHADOW_BLUE;
        ctx.lineWidth = 1;
        
        // Forehead lines
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy - 40);
        ctx.quadraticCurveTo(cx, cy - 45, cx + 20, cy - 40);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 35);
        ctx.quadraticCurveTo(cx, cy - 38, cx + 18, cy - 35);
        ctx.stroke();
        
        // Create image
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }
    
    generateCorona() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, size, size);
        
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        
        // Industrial saw blade / gear corona
        const innerRadius = 65;
        const outerRadius = 120;
        const teeth = 32;
        
        // Main gear shape
        ctx.beginPath();
        for (let i = 0; i < teeth; i++) {
            const angle1 = (i / teeth) * Math.PI * 2;
            const angle2 = ((i + 0.3) / teeth) * Math.PI * 2;
            const angle3 = ((i + 0.5) / teeth) * Math.PI * 2;
            const angle4 = ((i + 0.8) / teeth) * Math.PI * 2;
            
            // Inner point
            const x1 = cx + Math.cos(angle1) * innerRadius;
            const y1 = cy + Math.sin(angle1) * innerRadius;
            
            // Rising edge
            const x2 = cx + Math.cos(angle2) * outerRadius;
            const y2 = cy + Math.sin(angle2) * outerRadius;
            
            // Outer flat
            const x3 = cx + Math.cos(angle3) * outerRadius;
            const y3 = cy + Math.sin(angle3) * outerRadius;
            
            // Falling edge
            const x4 = cx + Math.cos(angle4) * innerRadius;
            const y4 = cy + Math.sin(angle4) * innerRadius;
            
            if (i === 0) {
                ctx.moveTo(x1, y1);
            }
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
        }
        ctx.closePath();
        ctx.fill();
        
        // Inner detail ring
        ctx.strokeStyle = COLORS.SHADOW_BLUE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius - 5, 0, Math.PI * 2);
        ctx.stroke();
        
        // Cut out center hole
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius - 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        // Add some industrial details (bolts)
        ctx.fillStyle = COLORS.SHADOW_BLUE;
        const boltRadius = innerRadius - 20;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const bx = cx + Math.cos(angle) * boltRadius;
            const by = cy + Math.sin(angle) * boltRadius;
            ctx.beginPath();
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }
    
    generateWindowAssets() {
        // Generate 9-slice window frame assets
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // We'll draw window corners and edges here
        // For simplicity, we're drawing directly in VirtualWindow
        
        return canvas;
    }
    
    applyDithering(ctx, x, y, w, h, color, density = 0.5) {
        const prevFill = ctx.fillStyle;
        ctx.fillStyle = color;
        
        // Bayer 4x4 dithering
        const bayerMatrix = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ];
        
        const threshold = density * 16;
        
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const bayerValue = bayerMatrix[Math.floor(py) % 4][Math.floor(px) % 4];
                if (bayerValue < threshold) {
                    ctx.fillRect(Math.floor(x + px), Math.floor(y + py), 1, 1);
                }
            }
        }
        
        ctx.fillStyle = prevFill;
    }
    
    generatePropsSheet() {
        // Generate simple geometric shapes with dithering
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 128, 64);
        
        // Cube (32x32)
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.fillRect(4, 4, 24, 24);
        this.applyDithering(ctx, 4, 4, 24, 24, COLORS.SHADOW_BLUE, 0.2);
        ctx.strokeStyle = COLORS.SHADOW_BLUE;
        ctx.strokeRect(4, 4, 24, 24);
        
        // Sphere (32x32) at x=32
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.beginPath();
        ctx.arc(48 + 12, 16, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Triangle (32x32) at x=64
        ctx.beginPath();
        ctx.moveTo(96, 4);
        ctx.lineTo(112, 28);
        ctx.lineTo(80, 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }
}
