// The game ships as ordered <script> tags. This is the single list of the
// content modules in load order; the validators check index.html and the
// service worker against it, and against the files actually on disk.
const ROOM_FILES = [
    'js/rooms/house.js',
    'js/rooms/scullery.js',
    'js/rooms/study.js',
    'js/rooms/spell_room.js',
    'js/rooms/crag_path.js',
    'js/rooms/alderhaven.js',
    'js/rooms/harbour_road.js',
    'js/rooms/village_green.js',
    'js/rooms/well_bottom.js',
    'js/rooms/dark_wood.js',
    'js/rooms/troll_bridge.js',
    'js/rooms/cloud_realm.js',
    'js/rooms/dragon_cave.js',
    'js/rooms/amber_tower.js'
];

// Shared modules fill CrownQuest.shared; they register no rooms.
const SHARED_ROOM_FILES = ['js/rooms/house.js', 'js/rooms/alderhaven.js'];

// The engine: the class first, then the systems that extend its prototype.
const ENGINE_FILES = [
    'js/engine.js',
    'js/engine/input.js',
    'js/engine/parser.js',
    'js/engine/narration.js',
    'js/engine/scenes.js',
    'js/engine/world.js',
    'js/engine/render.js',
    'js/engine/player.js',
    'js/engine/saveload.js',
    'js/engine/npc.js'
];

module.exports = { ROOM_FILES, SHARED_ROOM_FILES, ENGINE_FILES };
