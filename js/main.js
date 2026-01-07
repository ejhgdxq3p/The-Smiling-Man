/**
 * The Smiling Man - Main Entry Point
 * A meta/physics puzzle/narrative horror game
 */

import { Game } from './Game.js';

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', () => {
    // Create and start the game
    const game = new Game();
    game.init();
});
