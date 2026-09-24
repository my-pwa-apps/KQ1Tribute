// ============================================================
// CROWN QUEST ENGINE - INPUT
// Keyboard, pointer and touch input, interface preferences, the text
// prompt, and the verb dispatch every input path shares.
// These methods extend GameEngine.prototype; js/engine.js owns the state.
// ============================================================

GameEngine.extend({
    setupInput() {
        this._on(this.canvas, 'click', (e) => {
            this.sound.init();
            if (this.cutscene) {
                this.skipCutscene();
                return;
            }
            if (this.titleScreen) {
                const coords = this.getCanvasCoords(e);
                this.handleTitleInput(coords.x, coords.y);
                return;
            }
            const coords = this.getCanvasCoords(e);
            this.handleCanvasActivate(coords.x, coords.y);
        });

        this._on(this.canvas, 'mousemove', (e) => {
            const coords = this.getCanvasCoords(e);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
        });

        this.actionButtons.forEach(btn => {
            this._on(btn, 'click', () => this.setAction(btn.dataset.action));
        });

        this._on(document, 'keydown', (e) => {
            // The text prompt owns the keyboard: its input takes the letters.
            if (this.isTextPromptOpen()) {
                if (e.key === 'Escape') this.closeTextPrompt();
                return;
            }
            this.keysDown[e.key] = true;
            this.sound.init().finally(() => this.updateSoundUI());

            // Focus trapping inside modal
            if (this.dom.saveModal.classList.contains('open')) {
                if (e.key === 'Tab') {
                    const focusables = Array.from(this.dom.saveModal.querySelectorAll('button, [tabindex]:not([tabindex="-1"])'));
                    if (focusables.length > 0) {
                        const first = focusables[0];
                        const last = focusables[focusables.length - 1];
                        if (e.shiftKey) {
                            if (document.activeElement === first) {
                                e.preventDefault();
                                last.focus();
                            }
                        } else {
                            if (document.activeElement === last) {
                                e.preventDefault();
                                first.focus();
                            }
                        }
                    }
                }
            }

            if (e.key === 'F10') {
                e.preventDefault();
                this.toggleInterfaceMode();
                return;
            }
            if (e.key === 'F2') {
                e.preventDefault();
                this.toggleHotspotReveal();
                return;
            }
            if (e.key === 'F9') {
                e.preventDefault();
                this.debugGround = !this.debugGround;
                this._groundMarks = [];
                return;
            }
            if (e.key === 'F8') {
                e.preventDefault();
                this.cycleTextSpeed();
                return;
            }
            if (this.titleScreen) {
                this.handleTitleKey(e);
                return;
            }
            if (this.cutscene) {
                if (this.cutscene.onAdvance || e.key === ' ' || e.key === 'Escape' || e.key === 'Enter') {
                    this.skipCutscene();
                }
                return;
            }
            // A blocking sequence owns input: only advance its text or skip it.
            if (this.sequence) {
                if (e.key === 'Escape') this.skipSequence();
                else if (this.textWindow && (e.key === ' ' || e.key === 'Enter')) this.dismissTextWindow();
                return;
            }
            // AGS-inspired: dialog option keyboard selection
            if (this.activeDialog && this.activeDialog.phase === 'options') {
                const lines = this.activeDialog.visibleOptions;
                if (lines && lines.length > 0) {
                    // Number keys 1-9 select options directly (AGS numbered options)
                    if (e.key >= '1' && e.key <= '9') {
                        const idx = parseInt(e.key) - 1;
                        if (idx < lines.length) {
                            this.sound.uiClick();
                            this.selectDialogOption(idx);
                        }
                        return;
                    }
                    // Arrow keys navigate
                    if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.activeDialog.selectedIndex = Math.max(0, (this.activeDialog.selectedIndex || 0) - 1);
                        return;
                    }
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        this.activeDialog.selectedIndex = Math.min(lines.length - 1, (this.activeDialog.selectedIndex || 0) + 1);
                        return;
                    }
                    // Enter confirms selection
                    if (e.key === 'Enter' || e.key === ' ') {
                        this.sound.uiClick();
                        this.selectDialogOption(this.activeDialog.selectedIndex || 0);
                        return;
                    }
                    // Escape closes dialog
                    if (e.key === 'Escape') {
                        this.activeDialog = null;
                        this.textWindow = null;
                        this.clearAccessibleDialogOptions();
                        return;
                    }
                }
                return;
            }
            // AGI-inspired: dismiss text window with Enter/Space/Escape
            if (this.textWindow && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) {
                this.dismissTextWindow();
                return;
            }
            if (this.handleClassicKey(e)) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
            }
            if ((e.key === 'r' || e.key === 'R') && (this.dead || this.won)) {
                this.requestRestart();
                return;
            }
            if ((e.key === 't' || e.key === 'T') && this.dead) {
                this.tryAgain();
                return;
            }
            if (e.key === 'F5') { e.preventDefault(); this.openSaveModal('save'); }
            if (e.key === 'F7') { e.preventDefault(); this.openSaveModal('load'); }
            if (e.key === 'Escape') this.closeSaveModal();
            if (this.dom.saveModal.classList.contains('open')) return;
            if (e.key === 'l') this.setAction('look');
            if (e.key === 'g') this.setAction('get');
            if (e.key === 'u') this.setAction('use');
            if (e.key === 't') this.setAction('talk');
            if (e.key === 'w') this.setAction('walk');
            if (e.key === 'm' || e.key === 'M') {
                if (!this.dead && !this.won && !this.titleScreen) {
                    this.sound.toggleMute();
                    this.updateSoundUI();
                }
            }
        });

        this._on(document, 'keyup', (e) => {
            delete this.keysDown[e.key];
        });

        // Clear stuck keys when window loses focus
        this._on(window, 'blur', () => {
            this.keysDown = {};
        });

        this._on(window, 'resize', () => this.updateLayoutScale());
        this._on(window, 'orientationchange', () => this.updateLayoutScale());

        if (this.dom.btnSave) this._on(this.dom.btnSave, 'click', () => this.openSaveModal('save'));
        if (this.dom.btnLoad) this._on(this.dom.btnLoad, 'click', () => this.openSaveModal('load'));
        if (this.dom.btnHint) this._on(this.dom.btnHint, 'click', () => this.showHint());
        if (this.dom.btnScan) this._on(this.dom.btnScan, 'click', () => this.toggleHotspotReveal());
        if (this.dom.btnTools) {
            this._on(this.dom.btnTools, 'click', () => {
                const bar = this.dom.btnTools.parentElement;
                const expanded = bar.classList.toggle('tools-open');
                this.dom.btnTools.setAttribute('aria-expanded', String(expanded));
            });
        }
        if (this.dom.btnMute) {
            this._on(this.dom.btnMute, 'click', () => {
                this.sound.init().finally(() => this.updateSoundUI());
                this.sound.toggleMute();
                this.updateSoundUI();
            });
        }
        if (this.dom.btnTextSpeed) {
            this._on(this.dom.btnTextSpeed, 'click', () => this.cycleTextSpeed());
        }
        this._on(this.dom.saveModalClose, 'click', () => this.closeSaveModal());
        this._on(this.dom.saveModal, 'click', (e) => {
            if (e.target === this.dom.saveModal) this.closeSaveModal();
        });
        if (this.dom.touchParser) {
            this._on(this.dom.touchParser, 'submit', (e) => {
                e.preventDefault();
                if (this.titleScreen || this.dead || this.won) return;
                const command = this.dom.touchParserInput.value.trim();
                if (!command) return;
                this.lastCommand = command;
                this.commandLine = '';
                this.dom.touchParserInput.value = '';
                this.executeParserCommand(command);
                this.dom.touchParserInput.focus();
            });
        }
        if (this.dom.btnEnhanced) {
            this._on(this.dom.btnEnhanced, 'click', () => this.setInterfaceMode('enhanced', true));
        }
        if (this.dom.sayForm) {
            this._on(this.dom.sayForm, 'submit', (e) => {
                e.preventDefault();
                const text = this.dom.sayInput.value.trim();
                const onSubmit = this._textPromptSubmit;
                this.closeTextPrompt();
                if (text && onSubmit) onSubmit(text);
            });
            this._on(this.dom.sayCancel, 'click', () => this.closeTextPrompt());
        }

        // Touch support for canvas
        this._on(this.canvas, 'touchstart', (e) => {
            e.preventDefault();
            this.sound.init();
            const touch = e.touches[0];
            const coords = this.getCanvasCoords(touch);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
            if (this.cutscene) { this.skipCutscene(); return; }
            if (this.titleScreen) {
                this.handleTitleInput(coords.x, coords.y);
                return;
            }
            if (this.dead || this.won) { this.handleOverlayActivate(coords.x, coords.y); return; }
            if (this.sequence) {
                if (this.textWindow) this.dismissTextWindow();
                return;
            }
            // Handle dialog options (same as click handler)
            if (this.activeDialog && this.activeDialog.phase === 'options') {
                const r = this._getDialogBoxRect();
                if (r) {
                    const lines = this.activeDialog.visibleOptions;
                    if (coords.x >= r.boxX && coords.x <= r.boxX + r.boxW &&
                        coords.y >= r.boxY + r.pad && coords.y <= r.boxY + r.pad + lines.length * r.lineH) {
                        const idx = Math.floor((coords.y - r.boxY - r.pad) / r.lineH);
                        if (idx >= 0 && idx < lines.length) {
                            this.sound.uiClick();
                            this.selectDialogOption(idx);
                        }
                    }
                }
                return;
            }
            if (this.textWindow) {
                if (!this.canChainAfterDismiss()) { this.dismissTextWindow(); return; }
                this.dismissTextWindow();
            }
            this.handleClick(coords.x, coords.y);
        }, { passive: false });

        this._on(this.canvas, 'touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const coords = this.getCanvasCoords(touch);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
        }, { passive: false });

        // D-pad touch controls
        const dpadBtns = {
            'dpad-up': 'ArrowUp', 'dpad-down': 'ArrowDown',
            'dpad-left': 'ArrowLeft', 'dpad-right': 'ArrowRight'
        };
        for (const [id, key] of Object.entries(dpadBtns)) {
            const btn = document.getElementById(id);
            if (!btn) continue;
            const press = (ev) => { ev.preventDefault(); this.keysDown[key] = true; };
            const release = (ev) => { ev.preventDefault(); delete this.keysDown[key]; };
            this._on(btn, 'touchstart', press, { passive: false });
            this._on(btn, 'touchend', release, { passive: false });
            this._on(btn, 'touchcancel', release, { passive: false });
            this._on(btn, 'mousedown', press);
            this._on(btn, 'mouseup', release);
            this._on(btn, 'mouseleave', release);
        }
    },

    handleClassicKey(e) {
        if (!this.classicMode || this.dom.saveModal.classList.contains('open')) return false;
        if (this.dead || this.won || this.titleScreen) return false;
        if (e.ctrlKey || e.altKey || e.metaKey) return false;

        if (e.key === 'Enter') {
            e.preventDefault();
            const command = this.commandLine.trim();
            if (command) {
                this.lastCommand = command;
                this.commandLine = '';
                this.executeParserCommand(command);
            }
            return true;
        }
        if (e.key === 'Backspace') {
            e.preventDefault();
            this.commandLine = this.commandLine.slice(0, -1);
            return true;
        }
        if (e.key === 'F3') {
            e.preventDefault();
            this.commandLine = this.lastCommand;
            return true;
        }
        if (e.key === 'Escape') {
            this.commandLine = '';
            return false;
        }
        if (e.key.length === 1 && !e.key.match(/[\r\n\t]/)) {
            e.preventDefault();
            if (this.commandLine.length < 64) this.commandLine += e.key.toUpperCase();
            return true;
        }
        return false;
    },

    /** Ask the player to type a phrase (a name, a password). Works in both
     *  interfaces and on touch, where the classic command line is not shown. */
    promptText(question, onSubmit) {
        if (!this.dom.sayModal) return;
        this._textPromptSubmit = onSubmit;
        this._textPromptReturnFocus = document.activeElement;
        this.dom.sayTitle.textContent = question;
        this.dom.sayInput.value = '';
        this.dom.sayModal.classList.add('open');
        this.keysDown = {};
        this.announce(question);
        this.dom.sayInput.focus();
    },

    isTextPromptOpen() {
        return !!(this.dom.sayModal && this.dom.sayModal.classList.contains('open'));
    },

    closeTextPrompt() {
        if (!this.isTextPromptOpen()) return;
        this.dom.sayModal.classList.remove('open');
        this._textPromptSubmit = null;
        const back = this._textPromptReturnFocus;
        this._textPromptReturnFocus = null;
        if (back && typeof back.focus === 'function') back.focus();
    },

    toggleInterfaceMode() {
        this.setInterfaceMode(this.classicMode ? 'enhanced' : 'classic', true);
        this.showMessage(this.classicMode
            ? 'Classic parser interface selected.'
            : 'Enhanced point-and-click interface selected.');
    },

    loadInterfacePreference() {
        const saved = this.safeStorageGet(`${this.game.storagePrefix}_interface_mode`);
        if (saved) return saved;
        return window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 'enhanced' : 'classic';
    },

    // === AGS-INSPIRED: TEXT READING SPEED (Game.TextReadingSpeed) ===

    loadTextSpeedPreference() {
        // Capture runs must never animate text, whatever the stored preference.
        if (this._isDeterministicCapture()) return 'instant';
        const saved = this.safeStorageGet(`${this.game.storagePrefix}_text_speed`);
        if (saved && Object.hasOwn(this.textSpeeds, saved)) return saved;
        return this._prefersReducedMotion() ? 'instant' : 'normal';
    },

    setTextSpeed(name, persist) {
        if (!Object.hasOwn(this.textSpeeds, name)) return;
        this.textSpeed = name;
        this.textRevealSpeed = this.textSpeeds[name];
        this.textRevealEnabled = name !== 'instant';
        if (!this.textRevealEnabled) this.completeTextReveal();
        if (persist) this.safeStorageSet(`${this.game.storagePrefix}_text_speed`, name);
        this.updateTextSpeedUI();
    },

    cycleTextSpeed() {
        const order = this.textSpeedOrder;
        const next = order[(order.indexOf(this.textSpeed) + 1) % order.length];
        this.setTextSpeed(next, true);
        this.showMessage(`Text speed: ${next.toUpperCase()}.`);
    },

    updateTextSpeedUI() {
        if (!this.dom || !this.dom.btnTextSpeed) return;
        this.dom.btnTextSpeed.textContent = `Text: ${this.textSpeed.toUpperCase()}`;
        this.dom.btnTextSpeed.title = `Text reading speed: ${this.textSpeed} (F8 to change)`;
    },

    setInterfaceMode(mode, persist) {
        this.classicMode = mode !== 'enhanced';
        if (persist) {
            this.safeStorageSet(`${this.game.storagePrefix}_interface_mode`, this.classicMode ? 'classic' : 'enhanced');
        }
        this.applyInterfaceMode();
    },

    applyInterfaceMode() {
        document.body.classList.toggle('classic-mode', this.classicMode);
        document.body.classList.toggle('enhanced-mode', !this.classicMode);
        document.body.classList.toggle('title-screen', this.titleScreen);
        this.updateLayoutScale();
    },

    updateSoundUI() {
        if (!this.dom.btnMute) return;
        const status = this.sound.getStatus ? this.sound.getStatus() : (this.sound.muted ? 'off' : 'on');
        this.dom.btnMute.textContent = `Sound: ${status.toUpperCase()}`;
        this.dom.btnMute.title = status === 'blocked'
            ? 'Sound is unavailable in this browser'
            : status === 'paused'
                ? 'Sound is paused; activate the page to resume'
                : 'Toggle Sound (M)';
    },

    handleInventoryClick(itemId) {
        const item = this.items[itemId];
        if (!item) return;
        if (this.currentAction === 'look') {
            this.showItemCloseUp(item);
        } else if (this.currentAction === 'use') {
            this.selectedItem = (this.selectedItem === itemId) ? null : itemId;
            if (this.selectedItem) this.showMessage(`Using ${item.name}. Click on something to use it with.`);
            this.updateInventoryUI();
        } else {
            this.setAction('use');
            this.selectedItem = itemId;
            this.showMessage(`Selected ${item.name}. Click somewhere to use it.`);
            this.updateInventoryUI();
        }
    },

    // ---- Click Handling ----

    /** Activation precedence for a point on the scene, shared by pointer input
     *  and the VR controller ray so immersive play cannot drift from desktop. */
    handleCanvasActivate(x, y) {
        if (this.dead || this.won) { this.handleOverlayActivate(x, y); return; }
        // A blocking sequence owns input: clicking only advances its narration.
        if (this.sequence) {
            if (this.textWindow) this.dismissTextWindow();
            return;
        }
        // AGS-inspired: dialog options click handling
        if (this.activeDialog && this.activeDialog.phase === 'options') {
            const r = this._getDialogBoxRect();
            if (r) {
                const lines = this.activeDialog.visibleOptions;
                if (x >= r.boxX && x <= r.boxX + r.boxW &&
                    y >= r.boxY + r.pad && y <= r.boxY + r.pad + lines.length * r.lineH) {
                    const idx = Math.floor((y - r.boxY - r.pad) / r.lineH);
                    if (idx >= 0 && idx < lines.length) {
                        this.sound.uiClick();
                        this.selectDialogOption(idx);
                    }
                }
            }
            return;
        }
        // Classic keeps the deliberate AGI dismissal cadence. Enhanced mode
        // dismisses the response and processes the same actionable click,
        // but only when the player has actually finished reading it.
        if (this.textWindow) {
            if (!this.canChainAfterDismiss()) { this.dismissTextWindow(); return; }
            this.dismissTextWindow();
        }
        this.handleClick(x, y);
    },

    handleClick(x, y) {
        const room = this.rooms[this.currentRoomId];
        if (!room) return;
        const hotspot = this.findHotspot(x, y, room);

        if (this.currentAction === 'walk') {
            if (hotspot && hotspot.walk) {
                this.runContentHandler(`${this.currentRoomId}/${hotspot.name} walk`, hotspot.walk, this.actionScope);
            } else if (hotspot && hotspot.isExit) {
                this.playerTargetX = hotspot.walkToX !== undefined ? hotspot.walkToX : (hotspot.x + hotspot.w / 2);
                this.playerTargetY = hotspot.walkToY !== undefined ? hotspot.walkToY : null;
                this.playerWalking = true;
                this.pendingAction = () => {
                    if (hotspot.onExit) this.runContentHandler(`${this.currentRoomId}/${hotspot.name} exit`, hotspot.onExit, this.actionScope);
                };
            } else if (y > Math.min(240, this.minimumWalkY)) {
                this.playerTargetX = Math.max(30, Math.min(610, x));
                this.playerTargetY = Math.max(this.minimumWalkY, Math.min(370, y));
                this.playerWalking = true;
                this.pendingAction = null;
            } else if (hotspot) {
                // Clicking an object above the floor while walking gives its look response.
                const previousAction = this.currentAction;
                this.currentAction = 'look';
                this.performAction(hotspot);
                this.currentAction = previousAction;
            }
        } else {
            if (hotspot) {
                this.performAction(hotspot);
            } else {
                this.sound.error();
                this.showMessage("Nothing interesting there.");
            }
        }
    },

    findHotspot(x, y, room) {
        if (!room.hotspots) return null;
        for (let i = room.hotspots.length - 1; i >= 0; i--) {
            const hs = room.hotspots[i];
            if (hs.hidden) continue;
            if (x >= hs.x && x <= hs.x + hs.w && y >= hs.y && y <= hs.y + hs.h) return hs;
        }
        return null;
    },

    /** Run a content-supplied handler. Room and dialog code runs from event
     *  listeners, where a throw is swallowed by the browser and the player just
     *  sees nothing happen; this turns that into a visible, reportable failure. */
    runContentHandler(label, fn, ...args) {
        this.lastContentError = null;
        try {
            return fn(...args);
        } catch (err) {
            this.lastContentError = err;
            console.error(`${this.game.shortTitle}: ${label} failed`, err);
            this.sound.error();
            const detail = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ? ` [${label}]` : '';
            this.showMessage('Something in the world refuses to cooperate. That is a fault in the game, not in you.' + detail, { window: true });
            return undefined;
        }
    },

    performAction(hotspot) {
        const action = this.currentAction;
        const scope = this.actionScope;
        const where = `${this.currentRoomId}/${hotspot.name || 'hotspot'}`;
        if (action === 'use' && this.selectedItem) {
            if (hotspot.useItem) {
                this.runContentHandler(`${where} useItem`, hotspot.useItem, scope, this.selectedItem);
            } else {
                const itemObj = this.items[this.selectedItem];
                const itemName = itemObj ? itemObj.name : 'that';
                const hsName = hotspot.name || 'that';
                const useItemSnarks = [
                    `You attempt to combine ${itemName} with ${hsName}. The natural order offers a stern, polite refusal.`,
                    `Applying ${itemName} to ${hsName} produces no magic, no progress, and no dignity.`,
                    `You wave ${itemName} near ${hsName}. It looks unimpressed.`,
                    `That doesn't seem to do anything except waste daylight you do not have.`
                ];
                const hash = (this.selectedItem + hsName).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
                this.sound.error();
                this.showMessage(useItemSnarks[hash % useItemSnarks.length], { window: true });
            }
            return;
        }
        const handler = hotspot[action] ||
            (action === 'use' && hotspot.isExit ? hotspot.onExit : null);
        if (handler) {
            this.runContentHandler(`${where} ${action}`, handler, scope);
        } else if (hotspot.isExit && action !== 'look') {
            // Exits only define onExit, so without this they fall through to
            // generic snark that never tells the player it is a way out.
            this.showMessage(`${hotspot.name || 'That'} is a way out — you would have to walk there.`, { window: true });
        } else {
            const hsName = hotspot.name || 'that';
            const hash = (hsName + action).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
            const snarks = {
                look: [
                    hotspot.description || "You inspect it carefully. It's magnificent in its sheer lack of significance.",
                    hotspot.description || "You stare intently at it. It gazes back with inanimate indifference.",
                    hotspot.description || "Yep, that's definitely what it appears to be. Further analysis yields nothing."
                ],
                get: [
                    `You reach for ${hsName}, but good sense (and the weight of it) intervene.`,
                    `You attempt to stuff ${hsName} into your belt pouch. The pouch politely declines.`,
                    `Taking ${hsName} seems a fine idea until you notice it is firmly attached to the world.`
                ],
                use: [
                    `You fiddle with ${hsName} briefly. Nothing enchanted happens.`,
                    (this.game.flavorResponses.useTechnique || 'You apply your finest technique to {object}. Nothing happens, but you look remarkably focused.').replaceAll('{object}', hsName),
                    `You push, pull, and poke at ${hsName}. It resolutely resists your enthusiasm.`
                ],
                talk: [
                    `You offer a warm greeting to ${hsName}. It maintains a dignified, stony silence.`,
                    `You strike up a friendly conversation with ${hsName}. It's a decidedly one-sided affair.`,
                    `You whisper sweet nothings to ${hsName}. Nothing happens, but you feel slightly foolish.`
                ]
            };
            const list = snarks[action] || ["Nothing happens."];
            this.sound.error();
            this.showMessage(list[hash % list.length], { window: true });
        }
    },

    handleTitleInput(x, y) {
        const classicRect = this.getTitleButtonRect('classic');
        const enhancedRect = this.getTitleButtonRect('enhanced');
        if (this.pointInRect(x, y, classicRect)) {
            this.setInterfaceMode('classic', true);
            this.startNewGame();
            return;
        }
        if (this.pointInRect(x, y, enhancedRect)) {
            this.setInterfaceMode('enhanced', true);
            this.startNewGame();
            return;
        }
        this.startNewGame();
    },

    handleTitleKey(e) {
        if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            this.setInterfaceMode('classic', true);
            this.startNewGame();
            return;
        }
        if (e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            this.setInterfaceMode('enhanced', true);
            this.startNewGame();
            return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.setInterfaceMode(this.classicMode ? 'enhanced' : 'classic', true);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.startNewGame();
        }
    },

    pointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    },

    /** Scale the fixed 640x400 stage up to the viewport, preserving aspect ratio.
     *  Skipped during deterministic capture so screenshot baselines stay 1:1. */
    updateLayoutScale() {
        const container = document.getElementById('game-container');
        if (!container || this._isDeterministicCapture()) return;
        const chrome = Math.max(0, container.offsetHeight - this.canvas.offsetHeight);
        const maxByHeight = (window.innerHeight - chrome) * (this.WIDTH / this.HEIGHT);
        const width = Math.max(320, Math.min(window.innerWidth, maxByHeight));
        container.style.width = Math.floor(width) + 'px';
    }
});
