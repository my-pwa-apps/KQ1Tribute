// ============================================================
// CROWN QUEST ENGINE - CUTSCENES, SEQUENCES, DEATH AND RECOVERY
// Cutscenes, blocking sequences, death, victory, retry and restart.
// These methods extend GameEngine.prototype; js/engine.js owns the state.
// ============================================================

GameEngine.extend({
    // ---- Cutscene System ----
    playCutscene(opts) {
        // opts: { duration, draw(ctx, w, h, progress, elapsed), onEnd(), onAdvance(), skippable }
        this.cutscene = {
            elapsed: 0,
            duration: opts.duration || 3000,
            draw: opts.draw,
            onEnd: opts.onEnd || (() => {}),
            onAdvance: opts.onAdvance || null,
            skippable: opts.skippable !== false
        };
        this.playerVisible = false;
    },

    skipCutscene() {
        if (!this.cutscene) return;
        // Phase-advancing cutscenes: click advances instead of skipping
        if (this.cutscene.onAdvance) {
            this.cutscene.onAdvance();
            return;
        }
        if (this.cutscene.skippable) {
            const onEnd = this.cutscene.onEnd;
            this.cutscene = null;
            this.playerVisible = true;
            onEnd();
        }
    },

    // ---- Blocking Sequences (AGS blocking script / Wait) ----

    /** Run an ordered list of steps that each take time, so scripted beats can
     *  be authored linearly instead of chained through cutscene callbacks.
     *  Player input is locked out until the sequence ends or Escape skips it.
     *  Steps may be written as:
     *    'Some narration.'      -> text window, waits for dismissal
     *    600                    -> wait 600ms
     *    (engine) => {}         -> instant action
     *    { walk: [x, y] }       -> blocking walk (either coordinate may be null)
     *    { say: 'text', portrait?, duration? }
     *    { wait: ms }, { face: 'left' | 'right' | 'away' | 'toward' }, { do: fn } */
    runSequence(steps, opts = {}) {
        if (!Array.isArray(steps) || steps.length === 0) return;
        this.sequence = {
            steps: steps.map((step) => this._normalizeSequenceStep(step)),
            index: -1,
            elapsed: 0,
            skippable: opts.skippable !== false,
            onEnd: opts.onEnd || null
        };
        this.playerWalking = false;
        this.playerTargetX = null;
        this.playerTargetY = null;
        this.pendingAction = null;
        this._advanceSequence();
    },

    _normalizeSequenceStep(step) {
        if (typeof step === 'function') return { do: step };
        if (typeof step === 'string') return { say: step };
        if (typeof step === 'number') return { wait: step };
        return step || {};
    },

    /** Begin the next step; instant steps chain straight through to the one after. */
    _advanceSequence() {
        const seq = this.sequence;
        if (!seq) return;
        seq.index++;
        if (seq.index >= seq.steps.length) { this._endSequence(); return; }
        seq.elapsed = 0;
        const step = seq.steps[seq.index];
        if (step.do) step.do(this.actionScope);
        if (this.sequence !== seq) return; // the step replaced or ended the sequence
        if (step.face) this.playerFacing = step.face;
        if (step.walk) {
            const [wx, wy] = step.walk;
            this.playerTargetX = (wx === null || wx === undefined) ? null : Math.max(30, Math.min(610, wx));
            this.playerTargetY = (wy === null || wy === undefined) ? null : Math.max(this.minimumWalkY, Math.min(370, wy));
            this.playerWalking = true;
            this.pendingAction = null;
        }
        if (step.say) {
            this.showMessage(step.say, { window: true, portrait: step.portrait, duration: step.duration });
        }
        const blocks = (step.walk && this.playerWalking) ||
            (step.say && !!this.textWindow) ||
            (step.wait > 0);
        if (!blocks) this._advanceSequence();
    },

    _updateSequence(dt) {
        const seq = this.sequence;
        if (!seq) return;
        const step = seq.steps[seq.index];
        if (!step) { this._endSequence(); return; }
        seq.elapsed += dt;
        let done;
        if (step.walk) done = !this.playerWalking;
        else if (step.say) done = !this.textWindow;
        else if (step.wait) done = seq.elapsed >= step.wait;
        else done = true;
        if (done) this._advanceSequence();
    },

    /** Skip to the end, still applying every remaining step's side effects so
     *  flags, positions and room changes match a sequence played in full. */
    skipSequence() {
        const seq = this.sequence;
        if (!seq || !seq.skippable) return false;
        this.sequence = null;
        this.textWindow = null;
        for (let i = seq.index; i < seq.steps.length; i++) {
            const step = seq.steps[i];
            if (i > seq.index && step.do) step.do(this.actionScope);
            if (this.sequence) return true; // a skipped step started new scripted action
            if (step.face) this.playerFacing = step.face;
            if (step.walk) this._snapPlayerTo(step.walk);
        }
        this.playerWalking = false;
        this.playerTargetX = null;
        this.playerTargetY = null;
        if (seq.onEnd) seq.onEnd(this);
        return true;
    },

    _snapPlayerTo([x, y]) {
        if (x !== null && x !== undefined) this.playerX = Math.max(30, Math.min(610, x));
        if (y !== null && y !== undefined) this.playerY = Math.max(this.minimumWalkY, Math.min(370, y));
    },

    _endSequence() {
        const seq = this.sequence;
        this.sequence = null;
        this.playerWalking = false;
        this.playerTargetX = null;
        this.playerTargetY = null;
        if (seq && seq.onEnd) seq.onEnd(this);
    },

    /** Trigger screen shake with given intensity (pixels of max offset) */
    shake(intensity) {
        this.screenShake = intensity || 8;
    },

    // ---- Death & Victory ----
    die(msg) {
        this.dead = true;
        this.restartArmed = false;
        this._textQueue = [];
        this.sound.death();
        this.showMessage(msg + ' \u2014 Press T to try again from where you came in, F7 to restore a saved game, or R to restart.');
    },

    victory(msg) {
        this.won = true;
        this.restartArmed = false;
        this.sound.victory();
        this.showMessage(msg);
    },

    /** State as the player arrives in a room, before its onEnter runs, so a
     *  retry replays the arrival exactly as it first happened. */
    _captureArrival(roomId, px, py) {
        const data = this.getSaveData();
        data.currentRoomId = roomId;
        if (px !== undefined) data.playerX = px;
        if (py !== undefined) data.playerY = py;
        return { data, restoring: false };
    },

    /** Make the current moment the death-recovery point, for scripted beats
     *  that change the stakes without changing room. */
    checkpoint() {
        this.retrySnapshot = { data: this.getSaveData(), restoring: true };
    },

    /** Sierra's death dialog offered Restore/Restart; this adds the later
     *  "try again" convenience, labelled as such, without touching saves. */
    tryAgain() {
        if (!this.dead || !this.retrySnapshot) return;
        const snap = this.retrySnapshot;
        this.activeDialog = null;
        this.textWindow = null;
        this.clearAccessibleDialogOptions();
        this._applySaveData(snap.data, { restoring: snap.restoring });
        // Re-entering captured a checkpoint with clamped coordinates; keep the original.
        this.retrySnapshot = snap;
    },

    /** Restarting after a death discards the whole adventure, so it needs a
     *  second press unless there is nothing to lose. */
    requestRestart() {
        if (!this.dead && !this.won) return;
        if (this.won || this.score === 0 || this.restartArmed) {
            this.restart();
            return;
        }
        this.restartArmed = true;
        this.announce('Restart from the very beginning? Everything since your last save will be lost. Press R or choose Restart again to confirm.');
    },

    /** Buttons drawn on the death and victory panels, shared by drawing,
     *  pointer, touch and keyboard so the labels always match the actions. */
    overlayButtons() {
        if (this.dead) {
            const y = 262, w = 128, gap = 12;
            const x0 = this.WIDTH / 2 - (w * 3 + gap * 2) / 2;
            return [
                { id: 'retry', label: 'T: Try Again', enabled: !!this.retrySnapshot },
                { id: 'restore', label: 'F7: Restore', enabled: true },
                { id: 'restart', label: this.restartArmed ? 'R: Confirm' : 'R: Restart', enabled: true }
            ].map((b, i) => Object.assign(b, { x: x0 + i * (w + gap), y, w, h: 26 }));
        }
        if (this.won) return [{ id: 'restart', label: 'R: Play Again', enabled: true, x: this.WIDTH / 2 - 90, y: 288, w: 180, h: 24 }];
        return [];
    },

    handleOverlayActivate(x, y) {
        const hit = this.overlayButtons().find((b) => b.enabled && this.pointInRect(x, y, b));
        if (!hit) return;
        this.sound.uiClick();
        if (hit.id === 'retry') this.tryAgain();
        else if (hit.id === 'restore') this.openSaveModal('load');
        else if (hit.id === 'restart') this.requestRestart();
    },

    drawOverlayButtons(ctx, fill) {
        ctx.textAlign = 'center';
        ctx.font = '13px "Courier New"';
        for (const b of this.overlayButtons()) {
            ctx.fillStyle = '#05030a';
            ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
            ctx.fillStyle = b.enabled ? fill : '#2a2a2a';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = b.enabled ? '#FFFF55' : '#555555';
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
            ctx.fillStyle = b.enabled ? '#FFFF55' : '#777777';
            ctx.fillText(b.label, b.x + b.w / 2, b.y + 17);
        }
        ctx.textAlign = 'left';
    },

    restart() {
        this.restartArmed = false;
        this.retrySnapshot = null;
        this._textQueue = [];
        this.textWindow = null;
        this.inventory = [];
        this.restoreDialogChoices();
        this.resetItemMetadata();
        this.score = 0;
        this.lastScoreDelta = 0;
        this.scoreFlashUntil = 0;
        this.pickupSparkleUntil = 0;
        this.flags = {};
        this.dead = false;
        this.won = false;
        this.titleScreen = false;
        this.selectedItem = null;
        this.cutscene = null;
        this.sequence = null;
        this.roomTransition = 0;
        this.roomTransitionStyle = 'fade';
        this.screenShake = 0;
        this.playerVisible = true;
        this.playerFacing = 'toward';
        this.playerTargetX = null;
        this.playerTargetY = null;
        this.soundCaption = null;
        this.playerWalking = false;
        this.pendingAction = null;
        this.sound.stopAmbient();
        this.setAction('walk');
        this.updateInventoryUI();
        if (this.game.startRoom) {
            this.goToRoom(this.game.startRoom, this.game.startX, this.game.startY);
        }
    }
});
