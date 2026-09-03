// ============================================================
// Crown Quest - MODULE REGISTRY
// ------------------------------------------------------------
// The game ships as ordered <script> tags with no bundler, so room
// files cannot import the engine: they are parsed before it exists.
// Each room file registers a factory here instead, and the bootstrap
// in game.js drains the queue once the engine has been constructed.
// ============================================================

window.CrownQuest = window.CrownQuest || {
    _roomModules: [],

    /** Queue a group of rooms. `fn` receives the live engine instance. */
    defineRooms(fn) {
        if (typeof fn !== 'function') throw new TypeError('defineRooms expects a function');
        this._roomModules.push(fn);
    },

    /** Run every queued room module against the engine. */
    installRooms(engine) {
        for (const fn of this._roomModules) fn(engine);
        return this._roomModules.length;
    }
};
