/**
 * DialogueSystem - Typewriter-style dialogue display
 */

import { COLORS, RENDER_WIDTH, RENDER_HEIGHT } from './Constants.js';

export class DialogueSystem {
    constructor(ctx) {
        this.ctx = ctx;
        
        // Current dialogue state
        this.currentText = '';
        this.displayedText = '';
        this.charIndex = 0;
        this.isTyping = false;
        
        // Timing
        this.typeSpeed = 50; // ms per character
        this.lastTypeTime = 0;
        
        // Display
        this.displayTimer = 0;
        this.displayDuration = 0;
        this.fadeAlpha = 0;
        
        // Position
        this.x = RENDER_WIDTH / 2;
        this.y = RENDER_HEIGHT - 50;
        
        // Queue for multiple lines
        this.queue = [];
        this.resolveCallback = null;
    }
    
    typeText(text, duration = 3000) {
        // If immediate update is needed (like percentage), clear current
        if (text.includes('%')) {
             this.currentText = text;
             this.displayedText = text; // Skip typing effect
             this.charIndex = text.length;
             this.isTyping = true;
             this.displayDuration = duration;
             this.displayTimer = 0;
             this.fadeAlpha = 1;
             return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.queue.push({ text, duration, resolve });
            if (!this.isTyping && this.queue.length === 1) {
                this.processQueue();
            }
        });
    }
    
    processQueue() {
        if (this.queue.length === 0) return;
        
        const { text, duration, resolve } = this.queue[0];
        this.currentText = text;
        this.displayedText = '';
        this.charIndex = 0;
        this.isTyping = true;
        this.displayDuration = duration;
        this.displayTimer = 0;
        this.fadeAlpha = 1;
        this.lastTypeTime = Date.now();
        this.resolveCallback = resolve;
    }
    
    update(deltaTime) {
        const now = Date.now();
        
        if (this.isTyping && this.charIndex < this.currentText.length) {
            // Type next character
            if (now - this.lastTypeTime >= this.typeSpeed) {
                this.displayedText += this.currentText[this.charIndex];
                this.charIndex++;
                this.lastTypeTime = now;
                
                // Play typing sound (handled by AudioManager)
            }
        } else if (this.charIndex >= this.currentText.length && this.isTyping) {
            // Finished typing, start display timer
            this.displayTimer += deltaTime;
            
            if (this.displayTimer >= this.displayDuration) {
                // Fade out
                this.fadeAlpha -= deltaTime * 0.002;
                
                if (this.fadeAlpha <= 0) {
                    this.fadeAlpha = 0;
                    this.isTyping = false;
                    this.currentText = '';
                    this.displayedText = '';
                    
                    // Resolve promise and process next in queue
                    if (this.resolveCallback) {
                        this.resolveCallback();
                        this.resolveCallback = null;
                    }
                    this.queue.shift();
                    this.processQueue();
                }
            }
        }
    }
    
    render() {
        if (!this.displayedText) return;
        
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = this.fadeAlpha;
        
        // Draw text box background
        const padding = 10;
        const textWidth = ctx.measureText ? 
            this.measureTextWidth(this.currentText) : 
            this.currentText.length * 8;
        const boxWidth = Math.min(textWidth + padding * 2, RENDER_WIDTH - 40);
        const boxHeight = 30;
        const boxX = this.x - boxWidth / 2;
        const boxY = this.y - boxHeight / 2;
        
        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 34, 102, 0.9)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Border
        ctx.strokeStyle = COLORS.SYSTEM_WHITE;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Text
        ctx.fillStyle = COLORS.SYSTEM_WHITE;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw displayed text
        ctx.fillText(this.displayedText, this.x, this.y);
        
        // Blinking cursor at end
        if (this.charIndex < this.currentText.length || 
            (Math.floor(Date.now() / 500) % 2 === 0)) {
            const cursorX = this.x + this.measureTextWidth(this.displayedText) / 2 + 2;
            if (this.charIndex < this.currentText.length) {
                ctx.fillRect(cursorX, this.y - 5, 6, 10);
            }
        }
        
        ctx.restore();
    }
    
    measureTextWidth(text) {
        // Approximate width for monospace font
        return text.length * 6;
    }
    
    clear() {
        this.queue = [];
        this.isTyping = false;
        this.currentText = '';
        this.displayedText = '';
        this.fadeAlpha = 0;
        if (this.resolveCallback) {
            this.resolveCallback();
            this.resolveCallback = null;
        }
    }
}
