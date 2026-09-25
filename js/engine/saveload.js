// ============================================================
// CROWN QUEST ENGINE - SAVE AND RESTORE
// Save slots, validation, restoration and the save/load modal.
// These methods extend GameEngine.prototype; js/engine.js owns the state.
// ============================================================

GameEngine.extend({
    // ---- Save / Load ----
    getSaveKey(slot) { return `${this.game.storagePrefix}_save_${slot}`; },

    getSaveData() {
        return {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            currentRoomId: this.currentRoomId,
            playerX: this.playerX,
            playerY: this.playerY,
            playerDir: this.playerDir,
            playerFacing: this.playerFacing,
            inventory: [...this.inventory],
            score: this.score,
            flags: JSON.parse(JSON.stringify(this.flags)),
            dialogueChoices: Object.fromEntries(
                Object.entries(this.dialogs).map(([id, dialog]) => [id, { ...dialog.chosenOptions }])
            ),
            itemNames: Object.fromEntries(
                Object.entries(this.items).map(([k, v]) => [k, { name: v.name, description: v.description }])
            )
        };
    },

    saveUnavailableReason() {
        if (this.titleScreen) return 'Start the game before saving.';
        if (this.dead) return 'You can\'t save when you\'re dead!';
        if (this.won) return 'Your adventure is already complete. Start a new game to save.';
        if (this.cutscene || this.sequence || this.activeDialog) return 'Finish this scene or conversation before saving. Your previous saves are unchanged.';
        return null;
    },

    saveGame(slot) {
        const unavailable = this.saveUnavailableReason();
        if (unavailable) { this.showMessage(unavailable); return; }
        try {
            const data = this.getSaveData();
            const ok = this.safeStorageSet(this.getSaveKey(slot), JSON.stringify(data));
            if (!ok) throw new Error('Local storage not writable');
            this.sound.save();
            this.showMessage(`Game saved to Slot ${slot + 1}.`);
        } catch (err) {
            this.showMessage('Save failed: ' + err.message);
        }
    },

    loadGame(slot) {
        try {
            const raw = this.safeStorageGet(this.getSaveKey(slot));
            if (!raw) { this.showMessage('That slot is empty.'); return; }
            const data = JSON.parse(raw);
            // Validate save data structure
            if (!data || typeof data !== 'object' ||
                typeof data.currentRoomId !== 'string' ||
                !Array.isArray(data.inventory) ||
                typeof data.score !== 'number' ||
                typeof data.flags !== 'object' || data.flags === null || Array.isArray(data.flags)) {
                this.showMessage('Save data is corrupted.'); return;
            }
            if (data.version !== undefined && data.version !== SAVE_VERSION) {
                this.showMessage('That save was written by a different version of the game.'); return;
            }
            // Own-property checks only: '__proto__' and 'constructor' resolve
            // through the prototype chain and would pass a plain lookup.
            if (!Object.hasOwn(this.rooms, data.currentRoomId) ||
                !Number.isFinite(data.playerX) ||
                !Number.isFinite(data.playerY)) {
                this.showMessage('Save data is corrupted.'); return;
            }
            // Sanitize flags against prototype pollution
            const safeFlags = {};
            for (const [k, v] of Object.entries(data.flags)) {
                if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
                    safeFlags[k] = v;
                }
            }
            this._applySaveData(Object.assign({}, data, { flags: safeFlags }), { restoring: true });
            this.retrySnapshot = { data: this.getSaveData(), restoring: true };
            this.sound.save();
            this.showMessage(`Game loaded from Slot ${slot + 1}.`);
        } catch (err) {
            this.showMessage('Load failed: ' + err.message);
        }
    },

    /** Apply validated state. Restores rebuild the room without fresh-entry
     *  resets; a death retry replays the arrival as a genuine entry. */
    _applySaveData(data, context) {
        const restoring = !!context.restoring;
        this._textQueue = [];
        this.textWindow = null;
        const playerX = Math.max(30, Math.min(610, data.playerX));
        const playerY = Math.max(280, Math.min(370, data.playerY));
        // Filter inventory to known string item IDs
        this.inventory = data.inventory.filter(x => typeof x === 'string' && Object.hasOwn(this.items, x));
        this.score = Math.max(0, Math.min(this.maxScore, Math.floor(data.score)));
        this.flags = JSON.parse(JSON.stringify(data.flags));
        this.restoreDialogChoices(data.dialogueChoices);
        this.dead = false;
        this.won = false;
        this.restartArmed = false;
        this.titleScreen = false;
        this.selectedItem = null;
        this.cutscene = null;
        this.sequence = null;
        this.roomTransition = 0;
        this.playerVisible = true;
        this.playerWalking = false;
        this.playerTargetX = null;
        this.playerTargetY = null;
        this.pendingAction = null;
        this.playerDir = data.playerDir === -1 ? -1 : 1;
        this.playerFacing = ['toward', 'away', 'left', 'right'].includes(data.playerFacing)
            ? data.playerFacing : 'toward';
        this.screenShake = 0;
        this.resetItemMetadata();
        // Restore modified item names/descriptions
        if (data.itemNames) {
            for (const [id, info] of Object.entries(data.itemNames)) {
                if (Object.hasOwn(this.items, id) &&
                    info &&
                    typeof info.name === 'string' &&
                    typeof info.description === 'string') {
                    this.items[id].name = info.name;
                    this.items[id].description = info.description;
                }
            }
        }
        this.setAction('walk');
        this.updateInventoryUI();
        this.goToRoom(data.currentRoomId, playerX, playerY, { restoring });
        this.playerY = Math.max(this.minimumWalkY, Math.min(370, data.playerY));
        this._stepOntoFloor();
        this.disarmedExits = this.exitsWithinRearmRange(this.rooms[this.currentRoomId]);
        if (restoring) {
            // goToRoom resets orientation, so the saved facing is applied after it.
            this.playerDir = data.playerDir === -1 ? -1 : 1;
            this.playerFacing = ['toward', 'away', 'left', 'right'].includes(data.playerFacing)
                ? data.playerFacing : 'toward';
        }
    },

    /** A position saved against one room layout (procedural or painted) can
     *  fall outside another's floor. Step to the nearest walkable point on the
     *  same column, so a restore never leaves the player unable to move. */
    _stepOntoFloor() {
        const area = this.walkableArea;
        if (!area || area(this.playerX, this.playerY)) return;
        for (let d = 2; d <= 200; d += 2) {
            for (const y of [this.playerY - d, this.playerY + d]) {
                if (y >= this.minimumWalkY && y <= 370 && area(this.playerX, y)) { this.playerY = y; return; }
            }
        }
    },

    deleteSave(slot) {
        this.safeStorageRemove(this.getSaveKey(slot));
    },

    getSlotInfo(slot) {
        try {
            const raw = this.safeStorageGet(this.getSaveKey(slot));
            if (!raw) return null;
            const data = JSON.parse(raw);
            const room = Object.hasOwn(this.rooms, data.currentRoomId) ? this.rooms[data.currentRoomId] : null;
            const date = new Date(data.timestamp);
            return {
                room: room ? room.name : data.currentRoomId,
                score: data.score || 0,
                date: date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        } catch { return null; }
    },

    openSaveModal(mode) {
        // Refuse at the entry point rather than after a slot is chosen, so the
        // player is never walked into a modal that cannot do anything.
        if (mode === 'save') {
            const unavailable = this.saveUnavailableReason();
            if (unavailable) { this.showMessage(unavailable); return; }
        }
        const modal = this.dom.saveModal;
        this.dom.modalTitle.textContent = mode === 'save' ? 'Save Game' : 'Load Game';
        const list = this.dom.slotList;
        list.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const info = this.getSlotInfo(i);
            const row = document.createElement('div');
            row.className = 'slot-row';
            const infoDiv = document.createElement('div');
            infoDiv.className = 'slot-info';
            if (info) {
                const nameDiv = document.createElement('div');
                nameDiv.className = 'slot-name';
                nameDiv.textContent = `Slot ${i + 1}: ${info.room}`;
                const detailDiv = document.createElement('div');
                detailDiv.className = 'slot-detail';
                detailDiv.textContent = `Score: ${info.score}/${this.maxScore} \u2022 ${info.date}`;
                infoDiv.appendChild(nameDiv);
                infoDiv.appendChild(detailDiv);
            } else {
                const nameDiv = document.createElement('div');
                nameDiv.className = 'slot-name';
                nameDiv.textContent = `Slot ${i + 1}`;
                const detailDiv = document.createElement('div');
                detailDiv.className = 'slot-detail';
                detailDiv.textContent = '\u2014 Empty \u2014';
                infoDiv.appendChild(nameDiv);
                infoDiv.appendChild(detailDiv);
            }
            row.appendChild(infoDiv);
            const actionBtn = document.createElement('button');
            actionBtn.className = 'slot-action';
            actionBtn.textContent = mode === 'save' ? 'Save' : 'Load';
            if (mode === 'load' && !info) actionBtn.style.opacity = '0.3';
            actionBtn.addEventListener('click', () => {
                if (mode === 'save') {
                    this.saveGame(i);
                } else {
                    if (!info) return;
                    this.loadGame(i);
                }
                this.closeSaveModal();
            });
            row.appendChild(actionBtn);
            if (info) {
                const delBtn = document.createElement('button');
                delBtn.className = 'slot-action delete';
                delBtn.textContent = 'X';
                delBtn.title = 'Delete save';
                delBtn.addEventListener('click', () => {
                    this.deleteSave(i);
                    this.openSaveModal(mode);
                });
                row.appendChild(delBtn);
            }
            list.appendChild(row);
        }
        modal.classList.add('open');
        this._modalPrevActiveElement = document.activeElement;
        const firstBtn = modal.querySelector('button');
        if (firstBtn) firstBtn.focus();
    },

    closeSaveModal() {
        this.dom.saveModal.classList.remove('open');
        if (this._modalPrevActiveElement && this._modalPrevActiveElement.focus) {
            this._modalPrevActiveElement.focus();
            this._modalPrevActiveElement = null;
        }
    },

    /** The newest save slot, so a crash can offer it by name. */
    latestSaveSlot() {
        let best = null;
        for (let slot = 0; slot < 5; slot++) {
            try {
                const raw = this.safeStorageGet(this.getSaveKey(slot));
                const data = raw ? JSON.parse(raw) : null;
                if (data && Number.isFinite(data.timestamp) && (!best || data.timestamp > best.timestamp)) {
                    best = { slot, timestamp: data.timestamp };
                }
            } catch { /* a corrupt slot is simply not offered */ }
        }
        return best ? best.slot : null;
    },

    _crashRecoveryPlan() {
        const slot = this.latestSaveSlot();
        const info = slot === null ? null : this.getSlotInfo(slot);
        return {
            slot,
            line: info
                ? `Press R or tap to reload and restore Slot ${slot + 1} (${info.room}, ${info.score} points).`
                : 'Press R or tap to reload the game and begin again.'
        };
    },

    /** One keypress or tap reloads and resumes from the newest save. Nothing is
     *  loaded silently: the panel names the slot before the player chooses it. */
    _armCrashRecovery(slot) {
        if (typeof window === 'undefined' || this._crashRecoveryArmed) return;
        this._crashRecoveryArmed = true;
        const resume = () => {
            try { window.sessionStorage.setItem(`${this.game.storagePrefix}_resume`, slot === null ? 'none' : String(slot)); } catch { /* reload still helps */ }
            window.location.reload();
        };
        const onKey = (e) => { if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') resume(); };
        document.addEventListener('keydown', onKey);
        this.canvas.addEventListener('click', resume);
        this.canvas.addEventListener('touchstart', resume);
    },

    /** After a crash reload, restore the slot the player chose on the panel. */
    _resumeAfterCrash() {
        let requested = null;
        try {
            const key = `${this.game.storagePrefix}_resume`;
            requested = window.sessionStorage.getItem(key);
            window.sessionStorage.removeItem(key);
        } catch { return; }
        if (requested === null || requested === 'none') return;
        const slot = Number(requested);
        if (Number.isInteger(slot) && slot >= 0 && slot < 5) this.loadGame(slot);
    }
});
