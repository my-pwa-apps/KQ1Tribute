// ============================================================
// CROWN QUEST ENGINE - ROOM GEOMETRY
// Depth layers, barriers, walkable floors, surfaces, exits, edges and NPCs.
// These methods extend GameEngine.prototype; js/engine.js owns the state.
// ============================================================

GameEngine.extend({
    /** Walk-to point that fires an exit when the player walks onto it. */
    exitTriggerPoint(hotspot) {
        return {
            x: hotspot.walkToX !== undefined ? hotspot.walkToX : (hotspot.x + hotspot.w / 2),
            y: hotspot.walkToY !== undefined ? hotspot.walkToY : this.playerY
        };
    },

    isPlayerWithinRearmRange(hotspot) {
        const point = this.exitTriggerPoint(hotspot);
        return Math.abs(this.playerX - point.x) < EXIT_REARM_X &&
            Math.abs(this.playerY - point.y) < EXIT_REARM_Y;
    },

    exitsWithinRearmRange(room) {
        if (!room.hotspots) return [];
        return room.hotspots.filter((hs) => hs.isExit && !hs.hidden && this.isPlayerWithinRearmRange(hs));
    },

    // === AGI-INSPIRED: PRIORITY/DEPTH SYSTEM (OBJLIST) ===

    /** Register a foreground draw layer (drawn after player if y > player y).
     *  Like AGI's y-sorted object list, lower Y = behind, higher Y = in front. */
    addForegroundLayer(y, drawFn) {
        this.foregroundLayers.push({ y, draw: drawFn });
    },

    clearForegroundLayers() {
        this.foregroundLayers = [];
    },

    // === AGI-INSPIRED: WALKABLE AREA BARRIERS (CONTROL LINES) ===

    /** Add a rectangular barrier the player cannot walk through.
     *  Like AGI priority 0 (unconditional block) control lines. */
    addBarrier(x, y, w, h, enabled = null) {
        const barrier = { x, y, w, h };
        if (enabled) barrier.enabled = enabled;
        this.barriers.push(barrier);
    },

    clearBarriers() {
        this.barriers = [];
    },

    /** Limit the player's baseline to a room-defined floor shape. */
    setWalkableArea(containsPoint, minY = null) {
        this.walkableArea = containsPoint;
        this.walkableMinY = minY;
    },

    /** Declare a surface props stand on. `yAt` is a number for a flat top, or a
     *  function of x for one that slopes toward the vanishing point. */
    addSurface(id, x0, x1, yAt) {
        this.surfaces[id] = { x0, x1, yAt };
    },

    /** Top of a declared surface at a given x. Props MUST take their base from
     *  this rather than a hand-written constant: a base that does not come from
     *  the surface underneath is how a prop ends up floating above it. */
    surfaceY(id, x) {
        const s = Object.hasOwn(this.surfaces, id) ? this.surfaces[id] : null;
        if (!s) return null;
        return typeof s.yAt === 'function' ? s.yAt(x) : s.yAt;
    },

    /** Place a prop: returns the surface height at `x` and records the contact
     *  so the F9 overlay and the grounding test can both see it. */
    standOn(id, x) {
        const y = this.surfaceY(id, x);
        if (y === null) return null;
        this._propBases.push({ surface: id, x, y });
        return y;
    },

    /** Check if a position collides with any barrier (AGI CanBHere).
     *  Tests the player's baseline (feet position). */
    collidesBarrier(px, py) {
        // Player baseline is roughly a 14px-wide line at foot level
        const halfW = 7;
        if (this.walkableArea &&
            (!this.walkableArea(px - halfW, py) || !this.walkableArea(px + halfW, py))) {
            return true;
        }
        for (const b of this.barriers) {
            if (b.enabled && !b.enabled(this)) continue;
            if (px + halfW > b.x && px - halfW < b.x + b.w &&
                py >= b.y && py <= b.y + b.h) {
                return true;
            }
        }
        return false;
    },

    // === AGI-INSPIRED: EDGE TRANSITIONS (EGOEDGE/NEWROOM) ===

    /** Set what happens when ego hits a screen edge.
     *  Like AGI's var[EGOEDGE] triggering room changes. */
    /** Fire an exit whose walk-to point the player has just reached. Must run
     *  for click-to-walk as well as arrow keys, or a mouse-only player can
     *  never leave a room except by clicking the exit hotspot itself. */
    checkExitTriggers() {
        if (this.exitCooldown > 0) return;
        const room = this.rooms[this.currentRoomId];
        if (!room || !room.hotspots) return;
        for (let i = room.hotspots.length - 1; i >= 0; i--) {
            const hs = room.hotspots[i];
            if (!hs.isExit || hs.hidden) continue;
            if (this.disarmedExits.includes(hs)) {
                if (!this.isPlayerWithinRearmRange(hs)) {
                    this.disarmedExits = this.disarmedExits.filter((exit) => exit !== hs);
                }
                continue;
            }
            const point = this.exitTriggerPoint(hs);
            if (Math.abs(this.playerX - point.x) < EXIT_TRIGGER_X &&
                Math.abs(this.playerY - point.y) < EXIT_TRIGGER_Y) {
                if (hs.onExit) {
                    this.playerWalking = false;
                    this.playerTargetX = null;
                    this.playerTargetY = null;
                    this.runContentHandler(`${this.currentRoomId}/${hs.name} exit`, hs.onExit, this.actionScope);
                }
                return;
            }
        }
    },

    setEdgeTransition(edge, callback) {
        // edge: 'left', 'right', 'top', 'bottom'
        this.edgeTransitions[edge] = callback;
    },

    clearEdgeTransitions() {
        this.edgeTransitions = { left: null, right: null, top: null, bottom: null };
    },

    checkEdgeTransitions() {
        if (this.exitCooldown > 0) return;
        const margin = 5;
        if (this.playerX <= 30 + margin && this.edgeTransitions.left) {
            this.runContentHandler(`${this.currentRoomId} left edge`, this.edgeTransitions.left, this.actionScope);
        } else if (this.playerX >= 610 - margin && this.edgeTransitions.right) {
            this.runContentHandler(`${this.currentRoomId} right edge`, this.edgeTransitions.right, this.actionScope);
        } else if (this.playerY <= this.horizon + margin && this.edgeTransitions.top) {
            this.runContentHandler(`${this.currentRoomId} top edge`, this.edgeTransitions.top, this.actionScope);
        } else if (this.playerY >= 370 - margin && this.edgeTransitions.bottom) {
            this.runContentHandler(`${this.currentRoomId} bottom edge`, this.edgeTransitions.bottom, this.actionScope);
        }
    },

    // === AGI-INSPIRED: ANIMATED NPC OBJECTS (ANIOBJ SYSTEM) ===

    /** Register an NPC with AGI-style properties.
     *  Like AGI's ANIOBJ struct with motion, cycling, priority. */
    addNPC(npcDef) {
        const npc = new AnimatedNPC(npcDef, this);
        this.npcs.push(npc);
        return npc;
    },

    removeNPC(id) {
        this.npcs = this.npcs.filter(n => n.id !== id);
    },

    clearNPCs() {
        this.npcs = [];
    },

    getNPC(id) {
        return this.npcs.find(n => n.id === id) || null;
    },

    // === AGI-INSPIRED: ROOM SETUP HELPERS ===

    /** Called by goToRoom — clears per-room AGI state */
    clearRoomState() {
        this.clearForegroundLayers();
        this.clearBarriers();
        this.walkableArea = null;
        this.walkableMinY = null;
        this.surfaces = {};
        this._propBases = [];
        this.clearEdgeTransitions();
        this.clearNPCs();
        this.sceneLight = null;
        this.textWindow = null;
        this.activeDialog = null;
        this.clearAccessibleDialogOptions();
        this.depthScaling = null;
        // Reset idle animation so it starts fresh in new room
        this.idleTimer = 0;
        this.idleActive = false;
        this.idleType = null;
        this.idleElapsed = 0;
        this.idlePauseTimer = 0;
    },

    // === AGS-INSPIRED: DEPTH SCALING (WalkableArea.ScalingNear/Far) ===

    /** Set up perspective depth scaling for the current room.
     *  Characters at nearY get nearScale, at farY get farScale, linearly interpolated.
     *  e.g. setDepthScaling(280, 370, 0.7, 1.0) — smaller at top, full size at bottom */
    setDepthScaling(farY, nearY, farScale, nearScale) {
        this.depthScaling = { farY, nearY, farScale, nearScale };
    },

    /** Declare the room's dominant light so cast shadows lean away from it.
     *  strength 0 keeps the old symmetric puddle; 1 gives a full-length cast. */
    setSceneLight(x, y, strength) {
        this.sceneLight = { x, y, strength: strength == null ? 0.6 : strength };
    },

    /** Get the depth scale factor for a given Y position (AGS get_area_scaling). */
    getDepthScale(y) {
        if (!this.depthScaling) return 1.0;
        const ds = this.depthScaling;
        if (y <= ds.farY) return ds.farScale;
        if (y >= ds.nearY) return ds.nearScale;
        if (ds.nearY === ds.farY) return ds.nearScale;
        const t = (y - ds.farY) / (ds.nearY - ds.farY);
        const scale = ds.farScale + t * (ds.nearScale - ds.farScale);
        return Math.round(scale * 20) / 20;
    }
});
