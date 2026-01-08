/**
 * Director - The Game State Machine
 */

import { RENDER_WIDTH, RENDER_HEIGHT } from './Constants.js';

export class Director {
    constructor(game) {
        this.game = game;
        this.stage = 0; 
        this.subState = 'start'; // start, active, complete
        this.timer = 0;
        
        // UI Elements
        this.handEl = this.createHandElement();
        
        // Intro specific flags
        this.introState = 'move'; // 'move' -> 'expand'
        this.introCoverage = 0;
        this.lastPercent = 0;
    }

    createHandElement() {
        let el = document.getElementById('tutorial-hand');
        if (!el) {
            el = document.createElement('div');
            el.id = 'tutorial-hand';
            el.style.position = 'absolute';
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.backgroundColor = 'white';
            el.style.border = '2px solid blue';
            el.style.borderRadius = '50%';
            el.style.pointerEvents = 'none';
            el.style.display = 'none';
            el.style.zIndex = '2000';
            el.style.boxShadow = '0 0 10px white';
            document.body.appendChild(el);
        }
        return el;
    }

    update(deltaTime) {
        this.timer += deltaTime;

        switch (this.stage) {
            case 0: // Intro Sequence
                if (this.subState === 'active') {
                     this.monitorIntro();
                }
                break;

            case 1: // Stage 1
                if (this.subState === 'active') {
                    this.monitorStage1();
                }
                break;

            case 2: // Stage 2
                if (this.subState === 'active') {
                    this.monitorStage2();
                }
                break;
        }
    }

    monitorIntro() {
        const win = this.game.windows[0];
        if (!win) return;

        // Step 1: Move to Top-Left
        if (this.introState === 'move') {
            // Check if window is roughly in top-left quadrant
            const isTopLeft = win.x < 100 && win.y < 100;
            
            if (isTopLeft) {
                this.introState = 'expand';
                this.game.dialogue.typeText("Position Fixed. Now EXPAND the system.", 2000);
                this.game.audio.playSuccess();
                this.hideHint();
            } else {
                // Hint logic for moving
                if (this.timer > 3000) {
                    this.showHint(50, 50); // Point to top-left destination
                    if (this.timer % 3000 < 100) {
                        this.game.dialogue.typeText("Drag window to TOP-LEFT corner.", 2000);
                    }
                }
            }
        } 
        // Step 2: Expand to Cover Screen
        else if (this.introState === 'expand') {
            const area = win.width * win.height;
            const totalArea = RENDER_WIDTH * RENDER_HEIGHT;
            const coverage = area / totalArea;
            
            // Calculate percentage (0-100)
            const percent = Math.floor(coverage * 100);
            
            // Sync alpha with coverage: 
            // 5% coverage = 1.0 alpha (opaque white)
            // 90% coverage = 0.0 alpha (transparent)
            const progress = Math.max(0, Math.min(1, (coverage - 0.05) / 0.85));
            win.contentAlpha = 1.0 - progress;
            
            // Text feedback only on change
            if (percent !== this.lastPercent) {
                this.game.dialogue.typeText(`System Loading... ${percent}%`, 500);
                this.lastPercent = percent;
            }

            // Hint logic for expanding
            if (this.timer > 10000 && coverage < 0.2) {
                 const cx = win.x + win.width - 10;
                 const cy = win.y + win.height - 10;
                 this.showHint(cx, cy);
            }

            // Check Success
            if (coverage > 0.9) {
                this.triggerIntroCompletion();
            }
        }
    }

    monitorStage1() {
        const winA = this.game.windows[0];
        if (!winA) return;

        const targetY = RENDER_HEIGHT - winA.height - 20;
        const currentY = winA.y;

        if (this.timer > 4000 && currentY < targetY - 50) {
             const cx = winA.x + winA.width / 2;
             const cy = winA.y + winA.height + 30;
             this.showHint(cx, cy);
             
             if (Math.floor(this.timer / 3000) % 2 === 0 && !this.game.dialogue.isTyping) {
                 this.game.dialogue.typeText("Down... down... to the bottom.", 2000);
             }
        } else {
            this.hideHint();
        }

        if (currentY > targetY - 30) {
            this.triggerStage1Completion();
        }
    }

    monitorStage2() {
        const winB = this.game.windows[1];
        if (!winB) return;
        
        if (this.timer > 4000 && winB.objects.length > 0) {
             const obj = winB.objects[0];
             this.showHint(obj.position.x, obj.position.y);
             
             if (Math.floor(this.timer / 4000) % 2 === 0 && !this.game.dialogue.isTyping) {
                 this.game.dialogue.typeText("Right-click object -> DELETE.", 2000);
             }
        } else {
            this.hideHint();
        }

        if (winB.objects.length === 0) {
            this.triggerStage2Completion();
        }
    }
    
    showHint(x, y) {
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = rect.width / RENDER_WIDTH;
        const scaleY = rect.height / RENDER_HEIGHT;
        
        this.handEl.style.left = `${rect.left + x * scaleX}px`;
        this.handEl.style.top = `${rect.top + y * scaleY}px`;
        this.handEl.style.display = 'block';
    }
    
    hideHint() {
        this.handEl.style.display = 'none';
    }

    startIntro() {
        this.stage = 0;
        this.subState = 'active';
        this.timer = 0;
        this.introState = 'move';
        
        this.game.dialogue.typeText("Drag the window to align system.", 99999);
    }

    triggerIntroCompletion() {
        this.subState = 'complete';
        this.game.dialogue.clear(); 
        this.game.audio.playSuccess();
        
        this.game.renderer.flickerScreen(2);
        
        // This will destroy INIT.exe and spawn STATION.exe
        this.game.startStage1(); 
        
        this.stage = 1;
        this.subState = 'active';
        this.timer = 0;
    }

    triggerStage1Completion() {
        this.subState = 'complete';
        this.game.audio.playCollision('heavy');
        this.game.host.setMood(20);
        this.hideHint();
        
        this.game.dialogue.typeText("Heavy. It hurts. I like it.", 2000)
            .then(() => {
                this.stage = 2;
                this.subState = 'active';
                this.timer = 0;
                this.game.startStage2();
            });
    }

    triggerStage2Completion() {
        this.subState = 'complete';
        this.game.audio.playSuccess();
        this.hideHint();
        
        this.game.dialogue.typeText("Cleaned. You own it now.", 3000)
            .then(() => {
                this.game.dialogue.typeText("Now, rewrite the rules.", 3000);
                this.stage = 3;
                this.subState = 'active';
                this.game.startStage3();
            });
    }
    
    reportCollision(force) {}
}
