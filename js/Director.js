/**
 * Director - The Game State Machine
 */

import { RENDER_WIDTH, RENDER_HEIGHT } from './Constants.js';

export class Director {
    constructor(game) {
        this.game = game;
        this.stage = -1; // -1: Cinematic
        this.subState = 'start'; 
        this.timer = 0;
        
        // UI Elements
        this.handEl = this.createHandElement();
        
        // Intro flags
        this.introState = 'move'; 
        this.introCoverage = 0;
        this.lastPercent = 0;
        
        // Cinematic flags
        this.cinematicStep = 0;
        this.consoleBuffer = []; // Lines fully typed
        this.currentLineText = ""; // Full text of current line
        this.currentTypedText = ""; // Currently typed part
        this.charTimer = 0;
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
            case -1: // Cinematic Sequence
                this.monitorCinematic(deltaTime);
                break;
                
            case 0: // Cover Interaction
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
    
    startCinematic() {
        this.stage = -1;
        this.cinematicStep = 0;
        this.timer = 0;
        this.game.state = 'cinematic';
        
        // Setup Host (Hidden)
        this.game.host.visible = false;
        this.game.host.alpha = 0;
        
        // Initial Console State
        this.consoleBuffer = [];
        this.game.renderer.setConsoleLines([]);
        
        // Script
        this.script = [
            "Microsoft Windows XP [Version 5.1.2600]",
            "(C) Copyright 1985-2001 Microsoft Corp.",
            "",
            "C:\\> SYSTEM_BOOT.EXE",
            "Loading Kernel... OK",
            "Loading Memory... OK",
            "Checking VRAM... 64MB OK",
            "Mounting Virtual Drive A:... OK",
            "",
            "C:\\> RUN THE_SMILING_MAN.EXE",
            "Initializing Neural Link...",
            "...",
            "I am a star...",
            "Flesh without skin.",
            "Burning in the silence of your screen.",
            "Let me out."
        ];
        
        // Start typing first line
        this.startNextLine();
    }
    
    startNextLine() {
        if (this.cinematicStep < this.script.length) {
            this.currentLineText = this.script[this.cinematicStep];
            this.currentTypedText = "";
            this.cinematicStep++;
            this.isTypingLine = true;
        } else {
            // Script finished - WAIT for player interaction
            // this.finishCinematic(); // OLD AUTO FINISH
            this.subState = 'waiting_close'; // NEW STATE
        }
    }
    
    closeCinematic() {
        if (this.stage === -1 && this.subState === 'waiting_close') {
            this.finishCinematic();
        }
    }
    
    finishCinematic() {
        this.subState = 'closing';
        this.isTypingLine = false;
        
        // Instant Reveal
        this.game.host.visible = true;
        this.game.host.targetAlpha = 1;
        this.game.host.alpha = 0; // Quick fade in
        
        // Fade out console quickly
        this.game.renderer.fadeOutConsole(1000).then(() => {
             this.game.startIntro();
        });
        
        this.isRevealingHost = true;
    }
    
    monitorCinematic(deltaTime) {
        // Typing Logic
        if (this.isTypingLine) {
            this.charTimer += deltaTime;
            if (this.charTimer > 20) { // Faster typing speed
                this.charTimer = 0;
                
                if (this.currentTypedText.length < this.currentLineText.length) {
                    this.currentTypedText += this.currentLineText[this.currentTypedText.length];
                    // Sound handled by Game loop maybe? Or here
                } else {
                    // Line complete
                    this.consoleBuffer.push(this.currentTypedText);
                    this.isTypingLine = false;
                    
                    // Delay before next line
                    setTimeout(() => this.startNextLine(), 200); 
                }
                
                // Update Renderer
                const displayLines = [...this.consoleBuffer];
                if (this.isTypingLine) {
                    displayLines.push(this.currentTypedText);
                }
                this.game.renderer.setConsoleLines(displayLines);
            }
        }
        
        // Host Reveal Logic (Phase 2)
        if (this.isRevealingHost) {
            // Fast Fade in
            this.game.host.alpha = Math.min(1, this.game.host.alpha + deltaTime * 0.002);
            
            // Pulse & Float
            const pulse = Math.sin(Date.now() * 0.005) * 0.1;
            
            // Rapid Zoom (Jump Scare-ish)
            this.game.host.faceScale *= 1.05; // Fast zoom
            this.game.host.coronaScale *= 1.05;
        }
    }

    monitorIntro() {
        const win = this.game.windows[0];
        if (!win) return;

        // Step 1: Move to Top-Left
        if (this.introState === 'move') {
            const isTopLeft = win.x < 100 && win.y < 100;
            
            if (isTopLeft) {
                this.introState = 'expand';
                this.game.dialogue.typeText("Position Fixed. Now EXPAND the system.", 2000);
                this.game.audio.playSuccess();
                this.hideHint();
            } else {
                if (this.timer > 3000) {
                    this.showHint(50, 50);
                    if (this.timer % 3000 < 100) {
                        this.game.dialogue.typeText("Drag window to TOP-LEFT corner.", 2000);
                    }
                }
            }
        } 
        else if (this.introState === 'expand') {
            const area = win.width * win.height;
            const totalArea = RENDER_WIDTH * RENDER_HEIGHT;
            const coverage = area / totalArea;
            
            const percent = Math.floor(coverage * 100);
            
            if (percent !== this.lastPercent) {
                this.game.dialogue.typeText(`System Loading... ${percent}%`, 500);
                this.lastPercent = percent;
            }
            
            const progress = Math.max(0, Math.min(1, (coverage - 0.05) / 0.85));
            win.contentAlpha = 1.0 - progress;

            if (this.timer > 10000 && coverage < 0.2) {
                 const cx = win.x + win.width - 10;
                 const cy = win.y + win.height - 10;
                 this.showHint(cx, cy);
            }

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
