// ============================================================
// AGI-INSPIRED: ANIMATED NPC CLASS (ANIOBJ)
// Based on Sierra's original AGI ANIOBJ structure from ANIOBJ.H
// Supports motion types: NORMAL, WANDER, FOLLOW, MOVETO
// Supports cycling types: NORMAL, ENDLOOP, REVERSE, STOPPED
// ============================================================

class AnimatedNPC {
    /**
     * Create an animated NPC, modeled after AGI's ANIOBJ struct.
     * @param {Object} def - NPC definition
     * @param {string} def.id - Unique identifier
     * @param {number} def.x - Initial X position
     * @param {number} def.y - Initial Y position (baseline, like AGI)
     * @param {Function} def.draw - Draw function: draw(ctx, eng, npc)
     * @param {string} [def.motionType] - 'normal','wander','follow','moveto'
     * @param {number} [def.stepSize] - Pixels per step (AGI stepsize)
     * @param {number} [def.stepTime] - Ms between steps (AGI movefreq scaled)
     * @param {number} [def.cycleTime] - Ms between animation frames (AGI cyclfreq)
     * @param {number} [def.celCount] - Number of animation frames
     * @param {boolean} [def.fixedPriority] - If true, ignores y-sorting
     * @param {number} [def.priority] - Fixed priority value
     * @param {boolean} [def.ignoreBarriers] - If true, walks through barriers
     * @param {boolean} [def.ignoreHorizon] - If true, can go above horizon
     * @param {Object} [def.motionParams] - Parameters for motion type
     */
    constructor(def, _engine) {
        this.id = def.id;
        this.x = def.x || 0;
        this.y = def.y || 310;
        this.drawFn = def.draw;
        this.visible = def.visible !== false;

        // AGI motion system
        this.motionType = def.motionType || 'normal';
        this.stepSize = def.stepSize || 2;
        this.stepTime = def.stepTime || 200;  // ms between moves
        this.stepCounter = 0;
        this.direction = 0; // 0=stopped, 1-8 like AGI (1=N, 2=NE, 3=E, etc.)
        this.blocked = false;
        this.stopped = false;
        this.ignoreBarriers = def.ignoreBarriers || false;
        this.ignoreHorizon = def.ignoreHorizon || false;
        this.fixedPriority = def.fixedPriority || false;
        this.priority = def.priority || 0;

        // AGI facing (auto-select loop based on direction)
        this.facing = def.facing || 'toward'; // 'left','right','toward','away'

        // AGI animation cycling
        this.cycleTime = def.cycleTime || 250;  // ms between frames
        this.cycleCounter = 0;
        this.cel = 0;                           // current frame
        this.celCount = def.celCount || 1;      // total frames
        this.cycleType = def.cycleType || 'normal'; // 'normal','endloop','reverse','stopped'

        // Previous position (for collision/stopped detection)
        this.prevX = this.x;
        this.prevY = this.y;

        // Motion parameters (like AGI parms[])
        this.motionParams = def.motionParams || {};

        // Wander state
        this._wanderDist = 0;
        this._wanderDir = 0;

        // Follow/moveto state
        this._moveTargetX = this.motionParams.targetX || 0;
        this._moveTargetY = this.motionParams.targetY || 0;
        this._onArrival = this.motionParams.onArrival || null;

        // Callback for when NPC is clicked
        this.onClick = def.onClick || null;

        // Optional floor contact shadow: { scale, rx, ry, alpha, offsetY }
        this.shadow = def.shadow || null;
    }
    // AGI direction deltas (0=none, 1=N, 2=NE, 3=E, 4=SE, 5=S, 6=SW, 7=W, 8=NW)
    static xs = [0, 0, 1, 1, 1, 0, -1, -1, -1];
    static ys = [0, -1, -1, 0, 1, 1, 1, 0, -1];

    // AGI-style loop selection tables
    static twoLoop  = [4, 4, 0, 0, 0, 4, 1, 1, 1]; // S,S,R,R,R,S,L,L,L
    static fourLoop = [4, 3, 0, 0, 0, 2, 1, 1, 1]; // S,B,R,R,R,F,L,L,L

    /** AGI-style: compute direction from current position to target. */
    static moveDirection(ox, oy, nx, ny, delta) {
        const newdir = [[8, 1, 2], [7, 0, 3], [6, 5, 4]];
        const idx = (d, threshold) => d <= -threshold ? 0 : d >= threshold ? 2 : 1;
        return newdir[idx(ny - oy, delta)][idx(nx - ox, delta)];
    }

    /** Update the NPC's direction based on motion type (AGI ObjDir). */
    updateDirection(engine) {
        switch (this.motionType) {
            case 'wander':
                this._wander();
                break;
            case 'follow':
                this._follow(engine);
                break;
            case 'moveto':
                this._moveTo(engine);
                break;
        }
    }

    /** AGI-style wander: pick random direction and distance. */
    _wander() {
        if (this._wanderDist <= 0 || this.stopped) {
            this.direction = Math.floor(Math.random() * 9); // 0-8
            this._wanderDist = Math.floor(Math.random() * 30) + 5;
        }
        this._wanderDist -= this.stepSize;
    }

    /** AGI-style follow: move toward ego. */
    _follow(engine) {
        const endDist = this.motionParams.followDist || 20;
        const dir = AnimatedNPC.moveDirection(
            this.x, this.y,
            engine.playerX, engine.playerY,
            endDist
        );
        if (dir === 0) {
            // Arrived
            this.direction = 0;
            this.motionType = 'normal';
            if (this._onArrival) this._onArrival(engine, this);
            return;
        }
        if (this.stopped) {
            // Blocked — try random direction (AGI follow behavior)
            this.direction = Math.floor(Math.random() * 8) + 1;
            this._wanderDist = Math.floor(Math.random() * 15) + 5;
        } else {
            this.direction = dir;
        }
    }

    /** AGI-style moveto: move toward target coordinates. */
    _moveTo(engine) {
        this.direction = AnimatedNPC.moveDirection(
            this.x, this.y,
            this._moveTargetX, this._moveTargetY,
            this.stepSize
        );
        if (this.direction === 0) {
            this.motionType = 'normal';
            if (this._onArrival) this._onArrival(engine, this);
        }
    }

    /** Start a moveTo motion (like AGI MoveObj). */
    startMoveTo(x, y, onArrival) {
        this.motionType = 'moveto';
        this._moveTargetX = x;
        this._moveTargetY = y;
        this._onArrival = onArrival || null;
    }

    /** Start following ego (like AGI FollowEgo). */
    startFollow(dist, onArrival) {
        this.motionType = 'follow';
        this.motionParams.followDist = dist || 20;
        this._onArrival = onArrival || null;
    }

    /** Start wandering (like AGI StartWander). */
    startWander() {
        this.motionType = 'wander';
        this._wanderDist = 0;
    }

    /** Stop all motion (like AGI StopMotion). */
    stopMotion() {
        this.motionType = 'normal';
        this.direction = 0;
    }

    /** Update facing based on current direction (AGI loop selection). */
    updateFacing() {
        if (this.direction === 0) return;
        const facings = ['toward', 'away', 'right', 'right', 'right', 'toward', 'left', 'left', 'left'];
        this.facing = facings[this.direction];
    }

    /** Advance animation cel (AGI AdvanceCel). */
    advanceCel() {
        const last = this.celCount - 1;
        switch (this.cycleType) {
            case 'normal':
                this.cel = (this.cel + 1) > last ? 0 : this.cel + 1;
                break;
            case 'endloop':
                if (this.cel >= last) {
                    this.cycleType = 'stopped';
                    this.direction = 0;
                } else {
                    this.cel++;
                }
                break;
            case 'reverse':
                this.cel = this.cel > 0 ? this.cel - 1 : last;
                break;
            case 'stopped':
                break;
        }
    }

    /** Main update — called each frame (AGI Animate cycle). */
    update(dt, engine) {
        if (!this.visible) return;

        // Step timing (AGI moveclk)
        this.stepCounter += dt;
        if (this.stepCounter >= this.stepTime) {
            this.stepCounter = 0;

            // Save previous position for stopped detection
            this.prevX = this.x;
            this.prevY = this.y;

            // Update direction based on motion type
            this.updateDirection(engine);

            // Move in current direction
            if (this.direction > 0 && this.direction <= 8) {
                const dx = AnimatedNPC.xs[this.direction];
                const dy = AnimatedNPC.ys[this.direction];
                // Match the player: normalize diagonals and scale the step by depth.
                const diagFactor = (dx !== 0 && dy !== 0) ? Math.SQRT1_2 : 1;
                const depthSpd = engine.depthScaling ? engine.getDepthScale(this.y) : 1;
                const step = this.stepSize * diagFactor * depthSpd;
                const nx = this.x + dx * step;
                const ny = this.y + dy * step;

                // Border check (AGI MOVEOBJS)
                const clampedX = Math.max(30, Math.min(610, nx));
                const horizon = this.ignoreHorizon ? 0 : engine.horizon;
                const clampedY = Math.max(Math.max(horizon, 280), Math.min(370, ny));

                // Barrier check (AGI CanBHere)
                if (this.ignoreBarriers || !engine.collidesBarrier(clampedX, clampedY)) {
                    this.x = clampedX;
                    this.y = clampedY;
                }
            }

            // Stopped detection (AGI STOPPED flag)
            this.stopped = (this.x === this.prevX && this.y === this.prevY);

            // Update facing from direction
            this.updateFacing();
        }

        // Animation cycling (AGI cycleclk)
        if (this.cycleType !== 'stopped' && this.celCount > 1) {
            this.cycleCounter += dt;
            if (this.cycleCounter >= this.cycleTime) {
                this.cycleCounter = 0;
                this.advanceCel();
            }
        }
    }

    /** Draw the NPC — delegates to the custom draw function. */
    draw(ctx, engine) {
        if (!this.visible || !this.drawFn) return;
        this.drawFn(ctx, engine, this);
    }
}
