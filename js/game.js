/* ======================================================
   King's Quest: The Darkened Mirror — Game Initialization
   Entry point: ties engine, rooms, and audio together
   ====================================================== */

(function () {
    'use strict';

    // Wait for DOM
    window.addEventListener('DOMContentLoaded', () => {
        // Create game engine
        const engine = new GameEngine();

        // Register all rooms
        registerAllRooms(engine);

        // Set starting room
        engine.state.currentRoom = 'throneRoom';
        engine.player.x = 160;
        engine.player.y = 140;

        // Start the game loop
        engine.start();

        // Log startup
        console.log('King\'s Quest: The Darkened Mirror');
        console.log('================================');
        console.log('A Sierra Online tribute game');
        console.log('');
        console.log('Controls:');
        console.log('  Click   — Walk / interact');
        console.log('  1-5     — Select verb (Walk, Look, Get, Use, Talk)');
        console.log('  I / 6   — Open inventory');
        console.log('  ESC     — Close inventory');
        console.log('');
        console.log('Puzzle hint: Find the three gems and restore the Magic Mirror!');
        console.log('  1. Sapphire of Wisdom   — Crystal Cavern');
        console.log('  2. Ruby of Courage       — Dragon\'s Lair');
        console.log('  3. Emerald of Compassion — Enchanted Lake');
    });

})();
