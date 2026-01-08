/**
 * AssetGenerator - Handles asset loading
 */

import { COLORS } from './Constants.js';

export class AssetGenerator {
    constructor() {
        this.faceImage = null;
        this.coronaImage = null;
        this.windowAssets = null;
    }
    
    async generate() {
        // Load external images
        await this.loadImage('face', 'assets/face.png');
        await this.loadImage('corona', 'assets/corona.png');
        
        // Keep generating procedural window assets for now
        this.windowAssets = this.generateWindowAssets();
    }
    
    loadImage(key, src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (key === 'face') this.faceImage = img;
                if (key === 'corona') this.coronaImage = img;
                console.log(`Loaded asset: ${key}`);
                resolve();
            };
            img.onerror = () => {
                console.error(`Failed to load asset: ${src}`);
                // Fallback to procedural generation if load fails
                if (key === 'face') this.faceImage = this.generateFace();
                if (key === 'corona') this.coronaImage = this.generateCorona();
                resolve();
            };
            img.src = src;
        });
    }
    
    // ... (Keep existing procedural generators as fallbacks) ...
    
    generateFace() {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 45, 55, 0, 0, Math.PI * 2);
        ctx.fill();
        
        return createImgFromCanvas(canvas);
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
        ctx.beginPath();
        ctx.arc(cx, cy, 80, 0, Math.PI * 2);
        ctx.fill();
        
        return createImgFromCanvas(canvas);
    }
    
    generateWindowAssets() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        return canvas;
    }
}

function createImgFromCanvas(canvas) {
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}
