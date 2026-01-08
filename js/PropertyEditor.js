/**
 * PropertyEditor - The "Hacker" Interface
 * Allows the player to modify physics properties of objects via a context menu.
 */

import { COLORS } from './Constants.js';

export class PropertyEditor {
    constructor(game) {
        this.game = game;
        this.active = false; // Initially locked
        this.targetBody = null;
        this.menuElement = null;
        
        this.createMenu();
        this.setupListeners();
    }
    
    unlock() {
        this.active = true;
        // Optionally show a notification
        console.log("System Access: GRANTED");
    }

    createMenu() {
        // Create the context menu DOM element
        const menu = document.createElement('div');
        menu.id = 'prop-editor';
        menu.style.position = 'absolute';
        menu.style.display = 'none';
        menu.style.backgroundColor = '#ECE9D8'; // Windows XP Grey
        menu.style.border = '2px solid #0055EA'; // Blue border
        menu.style.padding = '2px';
        menu.style.boxShadow = '4px 4px 0px rgba(0,0,0,0.5)';
        menu.style.fontFamily = 'Tahoma, sans-serif';
        menu.style.fontSize = '11px';
        menu.style.zIndex = '1000';
        menu.style.minWidth = '150px';
        
        // Header
        const header = document.createElement('div');
        header.innerText = 'Object Properties';
        header.style.background = 'linear-gradient(to right, #0055EA, #3A6EA5)';
        header.style.color = 'white';
        header.style.padding = '2px 4px';
        header.style.marginBottom = '4px';
        header.style.fontWeight = 'bold';
        menu.appendChild(header);

        // Content container
        this.content = document.createElement('div');
        this.content.style.padding = '4px';
        menu.appendChild(this.content);

        document.body.appendChild(menu);
        this.menuElement = menu;
        
        // Hide menu on click elsewhere
        document.addEventListener('click', () => {
            this.menuElement.style.display = 'none';
            this.targetBody = null;
        });
    }

    setupListeners() {
        this.game.canvas.addEventListener('contextmenu', (e) => {
            if (!this.active) return; // Locked at start
            e.preventDefault();

            // Find clicked object
            const mousePos = {
                x: this.game.mouse.x,
                y: this.game.mouse.y
            };
            
            const bodies = Matter.Composite.allBodies(this.game.world);
            const clickedBodies = Matter.Query.point(bodies, mousePos);

            if (clickedBodies.length > 0) {
                // Ignore walls
                const body = clickedBodies.find(b => !b.isStatic);
                if (body) {
                    this.showMenu(e.clientX, e.clientY, body);
                }
            }
        });
        
        // Prevent menu from closing when clicking inside it
        this.menuElement.addEventListener('click', (e) => e.stopPropagation());
    }

    showMenu(screenX, screenY, body) {
        this.targetBody = body;
        this.menuElement.style.left = `${screenX}px`;
        this.menuElement.style.top = `${screenY}px`;
        this.menuElement.style.display = 'block';
        
        this.renderProperties(body);
    }

    renderProperties(body) {
        this.content.innerHTML = ''; // Clear old

        // Properties to edit
        this.addSlider('Mass', body.mass, 1, 100, (val) => {
            Matter.Body.setMass(body, val);
        });

        this.addSlider('Friction', body.frictionAir, 0, 0.5, (val) => {
            body.frictionAir = val;
        }, 0.01);

        this.addSlider('Bounciness', body.restitution, 0, 1.5, (val) => {
            body.restitution = val;
        }, 0.1);
        
        // "Delete" Button (The ultimate power)
        const delBtn = document.createElement('button');
        delBtn.innerText = 'DELETE OBJECT';
        delBtn.style.marginTop = '8px';
        delBtn.style.width = '100%';
        delBtn.style.color = 'red';
        delBtn.onclick = () => {
            Matter.Composite.remove(this.game.world, body);
            // Also remove from window's object list (needs Game reference logic)
            this.game.removeBodyFromWindows(body);
            this.menuElement.style.display = 'none';
        };
        this.content.appendChild(delBtn);
    }

    addSlider(label, currentVal, min, max, onChange, step = 1) {
        const container = document.createElement('div');
        container.style.marginBottom = '4px';
        
        const labelEl = document.createElement('div');
        labelEl.innerText = `${label}: ${currentVal.toFixed(2)}`;
        container.appendChild(labelEl);
        
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = currentVal;
        input.style.width = '100%';
        
        input.oninput = (e) => {
            const val = parseFloat(e.target.value);
            labelEl.innerText = `${label}: ${val.toFixed(2)}`;
            onChange(val);
        };
        
        container.appendChild(input);
        this.content.appendChild(container);
    }
}
