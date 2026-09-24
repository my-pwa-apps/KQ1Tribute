// ============================================================
// CROWN QUEST ENGINE - NARRATION AND DIALOGUE
// Messages, the Sierra text window and its queue, and dialogue trees.
// These methods extend GameEngine.prototype; js/engine.js owns the state.
// ============================================================

GameEngine.extend({
    showItemCloseUp(item) {
        this.itemCloseUp = item;
        // Always open a fresh window: showTextWindow only reserves room for the
        // art panel while sizing, so dropping the panel onto a stale window
        // paints it over the tail of every line.
        this.showMessage(item.description, { window: true });
        if (item.look) this.runContentHandler(`${item.id} look`, item.look, this.actionScope);
    },

    clearAccessibleDialogOptions() {
        if (this.dom.dialogAccessibilityOptions) {
            this.dom.dialogAccessibilityOptions.textContent = '';
        }
    },

    renderAccessibleDialogOptions(lines) {
        const container = this.dom.dialogAccessibilityOptions;
        if (!container) return;
        container.textContent = '';
        lines.forEach((line, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = line.text;
            button.addEventListener('click', () => this.selectDialogOption(index));
            container.appendChild(button);
        });
        this.announce('Conversation choices available. Use the numbered options or navigate to the conversation choices region.');
    },

    showMessage(text, opts = {}) {
        const displayText = this.classicMode ? this.sierraTrim(text) : text;
        this.message = displayText;
        const el = this.dom.messageText;
        el.textContent = displayText;
        el.parentElement.scrollTop = el.parentElement.scrollHeight;
        const wantsWindow = (this.classicMode || opts.window === true) &&
            !this.titleScreen && !this.cutscene && !this.dead && !this.won;
        // A priority window (a warning, a signpost) is never overwritten: later
        // messages wait behind it, and so does their screen-reader announcement.
        // Sequence narration queues too; its step blocks until the line has
        // been shown and dismissed, so the order is preserved.
        if (this.textWindow && this.textWindow.priority && !opts.priority) {
            this._textQueue.push({ text: displayText, window: wantsWindow, opts });
            return;
        }
        this.announce(displayText);
        if (wantsWindow) {
            this.showTextWindow(displayText, {
                color: '#FFFFFF',
                duration: opts.duration || 0,
                // No width override: showTextWindow narrows the wrap itself when
                // a portrait or item panel has to share the window.
                maxWidth: opts.maxWidth,
                portrait: opts.portrait,
                priority: !!opts.priority
            });
        }
    },

    /** Show a message after whatever the player is reading now. Use for a
     *  consequence that should follow the line that caused it. */
    queueMessage(text, opts = {}) {
        const displayText = this.classicMode ? this.sierraTrim(text) : text;
        this._textQueue.push({ text: displayText, window: true, opts });
    },

    /** Release narration that waited behind a priority window. */
    _flushTextQueue() {
        while (this._textQueue.length && !this.textWindow && !this.activeDialog && !this.cutscene && !this.dead && !this.won) {
            const next = this._textQueue.shift();
            this.announce(next.text);
            if (next.window) {
                this.message = next.text;
                this.dom.messageText.textContent = next.text;
                this.showTextWindow(next.text, { color: '#FFFFFF', duration: next.opts.duration || 0, maxWidth: next.opts.maxWidth, portrait: next.opts.portrait, priority: !!next.opts.priority });
            }
        }
    },

    /** Classic parser mode trims long enhanced-mode prose down to a terse AGI
     *  line. Games supply the substitutions; the engine only applies them. */
    sierraTrim(text) {
        const rewrites = (this.game && this.game.classicRewrites) || null;
        return (rewrites && Object.hasOwn(rewrites, text)) ? rewrites[text] : text;
    },

    // === AGI-INSPIRED: SIERRA TEXT WINDOW (PRINT/TEXTWIN) ===

    /** Show a Sierra-style text window on the canvas (like AGI's Print/Display).
     *  Classic blue box with white border and yellow text. */
    showTextWindow(text, opts) {
        opts = opts || {};
        const ctx = this._measureCtx;
        ctx.font = '13px "Courier New"';

        const portraitId = opts.portrait || (this.activeDialog && ['greeting', 'response'].includes(this.activeDialog.phase) ? this.activeDialog.dialogId : null);
        const hasPortraitOrItem = !!this.itemCloseUp || !!portraitId;

        // Word-wrap text to fit dialogue width
        const maxLineW = opts.maxWidth || (hasPortraitOrItem ? 350 : 420);
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > maxLineW) {
                if (line) lines.push(line);
                line = word;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);

        const lineH = 16;
        const pad = 12;
        const hintH = 20;
        const boxW = maxLineW + pad * 2 + 16 + (hasPortraitOrItem ? 68 : 0);
        const boxH = Math.max(hasPortraitOrItem ? 84 : 0, lines.length * lineH + pad * 2 + hintH);
        const boxX = opts.x !== undefined ? opts.x : Math.round((this.WIDTH - boxW) / 2);
        const boxY = opts.y !== undefined ? opts.y : Math.round((this.HEIGHT - boxH) / 2);

        this.textWindow = {
            text: text,
            lines: lines,
            portrait: portraitId,
            x: boxX, y: boxY, w: boxW, h: boxH,
            timer: 0,
            duration: opts.duration || 0, // 0 = click to dismiss
            priority: !!opts.priority,
            color: opts.color || PAL.TEXT_ACCENT,
            bgColor: opts.bgColor || PAL.WINDOW_BLUE,
            // Typewriter state: number of characters currently revealed.
            reveal: this.textRevealEnabled ? 0 : Infinity,
            revealTotal: lines.reduce((n, l) => n + l.length, 0)
        };
        this.announce(text);
    },

    /** True when the platform reports a reduced-motion accessibility preference. */
    _prefersReducedMotion() {
        try {
            return typeof window !== 'undefined' &&
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    },

    /** True in the deterministic screenshot-capture run, where animation is frozen. */
    _isDeterministicCapture() {
        try {
            return new URLSearchParams(window.location.search).has('visual-test');
        } catch (e) {
            return false;
        }
    },

    /** True once every character of the active text window has been drawn. */
    isTextFullyRevealed() {
        const tw = this.textWindow;
        return !tw || tw.reveal >= tw.revealTotal;
    },

    /** Snap the typewriter to the end of the current text window. */
    completeTextReveal() {
        if (this.textWindow) this.textWindow.reveal = Infinity;
    },

    /** Draw the Sierra-style text window (called during render). */
    drawTextWindow(ctx) {
        if (!this.textWindow) return;
        const tw = this.textWindow;

        // AGI-style print window: white paper, black edge, red inset border.
        ctx.fillStyle = PAL.OUTLINE;
        ctx.fillRect(tw.x, tw.y, tw.w, tw.h);
        ctx.fillStyle = PAL.WINDOW_PAPER;
        ctx.fillRect(tw.x + 2, tw.y + 2, tw.w - 4, tw.h - 4);
        ctx.strokeStyle = PAL.WINDOW_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(tw.x + 7, tw.y + 7, tw.w - 14, tw.h - 14);
        ctx.strokeStyle = PAL.OUTLINE;
        ctx.lineWidth = 1;
        ctx.strokeRect(tw.x + 1, tw.y + 1, tw.w - 2, tw.h - 2);

        // Text (revealed a character at a time, AGI-style)
        ctx.font = 'bold 13px "Courier New"';
        ctx.fillStyle = PAL.WINDOW_INK;
        ctx.textAlign = 'left';
        const startY = tw.y + 14 + 10;
        let budget = tw.reveal;
        for (let i = 0; i < tw.lines.length; i++) {
            const line = tw.lines[i];
            if (budget <= 0) break;
            const shown = budget >= line.length ? line : line.slice(0, Math.floor(budget));
            ctx.fillText(shown, tw.x + 18, startY + i * 16);
            budget -= line.length;
        }

        // Dismiss hint (only when there's no auto-dismiss timer and text has finished)
        if (!tw.duration && this.isTextFullyRevealed()) {
            const blink = Math.floor(this.animTimer / 500) % 2;
            ctx.font = 'bold 11px "Courier New"';
            ctx.fillStyle = blink ? PAL.WINDOW_INK : PAL.WINDOW_HINT_DIM;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('[ Click or press SPACE to continue ]', tw.x + tw.w / 2, tw.y + tw.h - 11);
            ctx.textBaseline = 'alphabetic';
        }

        ctx.textAlign = 'left';
    },

    drawItemCloseUpWindow(ctx) {
        if (!this.itemCloseUp || !this.textWindow) return;
        const tw = this.textWindow;
        const item = this.itemCloseUp;
        // A 56x56 inspection plate at the top right of the text window, framed
        // like an illuminated manuscript initial.
        const boxSize = 56;
        const bx = tw.x + tw.w - boxSize - 16;
        const by = tw.y + 14;

        ctx.fillStyle = '#1c1408';
        ctx.fillRect(bx, by, boxSize, boxSize);
        ctx.strokeStyle = PAL.WOOD_SHADOW;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, boxSize, boxSize);
        ctx.strokeStyle = PAL.GOLD_BASE;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 2, by + 2, boxSize - 4, boxSize - 4);

        ctx.save();
        ctx.beginPath();
        ctx.rect(bx + 3, by + 3, boxSize - 6, boxSize - 6);
        ctx.clip();
        // Item icons live in js/art.js so the engine stays game-agnostic.
        const paint = this.itemArt && Object.hasOwn(this.itemArt, item.id) && this.itemArt[item.id];
        if (paint) {
            paint(ctx, bx + boxSize / 2, by + boxSize / 2, this.animTimer);
        } else {
            ctx.fillStyle = PAL.GOLD_LIT;
            ctx.font = 'bold 24px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('?', bx + boxSize / 2, by + boxSize / 2 + 8);
            ctx.textAlign = 'left';
        }
        ctx.restore();
    },

    drawPortraitWindow(ctx) {
        if (!this.textWindow || !this.textWindow.portrait || this.itemCloseUp) return;
        const tw = this.textWindow;
        const boxSize = 56;
        const bx = tw.x + tw.w - boxSize - 16;
        const by = tw.y + 14;

        ctx.fillStyle = '#120d06';
        ctx.fillRect(bx, by, boxSize, boxSize);
        ctx.strokeStyle = PAL.WOOD_SHADOW;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, boxSize, boxSize);
        ctx.strokeStyle = PAL.GOLD_BASE;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 2, by + 2, boxSize - 4, boxSize - 4);

        const t = this.animTimer;
        const face = {
            blinking: (Math.floor(t / 2000) % 5 === 0) && (t % 2000 < 180),
            // The mouth only moves while the typewriter is still revealing text.
            mouthOpen: !this.isTextFullyRevealed() && (Math.floor(t / 140) % 2 === 0),
            t
        };

        ctx.save();
        ctx.beginPath();
        ctx.rect(bx + 3, by + 3, boxSize - 6, boxSize - 6);
        ctx.clip();
        const paint = this.portraitArt && Object.hasOwn(this.portraitArt, tw.portrait) && this.portraitArt[tw.portrait];
        if (paint) {
            paint(ctx, bx + boxSize / 2, by + boxSize / 2, face);
        } else {
            ctx.fillStyle = '#241a10';
            ctx.fillRect(bx + 3, by + 3, boxSize - 6, boxSize - 6);
            ctx.fillStyle = PAL.STONE_BASE;
            ctx.beginPath();
            ctx.arc(bx + boxSize / 2, by + boxSize / 2 - 2, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PAL.STONE_SHADOW;
            ctx.fillRect(bx + boxSize / 2 - 14, by + boxSize / 2 + 10, 28, 18);
        }
        ctx.restore();
    },

    /** Enhanced mode may act on the dismissing input, but never while the
     *  typewriter is still revealing text or a conversation is in progress. */
    canChainAfterDismiss() {
        return !this.classicMode && !this.activeDialog && this.isTextFullyRevealed();
    },

    dismissTextWindow() {
        // First click/keypress snaps the typewriter to the end rather than
        // dismissing, so fast readers never lose text they haven't seen.
        if (!this.isTextFullyRevealed()) {
            this.completeTextReveal();
            return;
        }
        this.textWindow = null;
        this.itemCloseUp = null;
        // AGS-inspired: advance dialog state if in an active dialog
        if (this.activeDialog) {
            this._advanceDialog();
        }
        this._flushTextQueue();
    },

    // === AGS-INSPIRED: DIALOG TREE SYSTEM (Dialog/DialogTopic) ===

    /** Register a dialog tree.
     *  dialogDef: {
     *    id: string,
     *    topics: [{
     *      id: string,
     *      text: string,                    // NPC greeting / topic intro
     *      options: [{
     *        text: string,                   // option display text
     *        response: string,               // NPC response
     *        action?: function(engine),       // optional callback
     *        nextTopic?: string,              // goto another topic (or null = return to options)
     *        endDialog?: boolean,             // close dialog after this
     *        once?: boolean,                  // disappear after chosen (AGS DFLG_OFFPERM)
     *        condition?: function(engine),    // only show if returns true
     *      }]
     *    }],
     *    startTopic: string                  // id of initial topic
     *  }
     */
    registerDialog(dialogDef) {
        this.dialogs[dialogDef.id] = {
            ...dialogDef,
            chosenOptions: {}  // track which options have been chosen (AGS DFLG_HASBEENCHOSEN)
        };
    },

    restoreDialogChoices(saved = {}) {
        for (const [id, dialog] of Object.entries(this.dialogs)) {
            dialog.chosenOptions = {};
            const choices = saved && Object.hasOwn(saved, id) ? saved[id] : null;
            if (!choices || typeof choices !== 'object' || Array.isArray(choices)) continue;
            for (const topic of dialog.topics) {
                topic.options.forEach((option, index) => {
                    const key = `${topic.id}_${index}`;
                    if (Object.hasOwn(choices, key) && choices[key] === true) dialog.chosenOptions[key] = true;
                });
            }
        }
    },

    /** Start a dialog conversation (AGS Dialog.Start). */
    startDialog(dialogId, topicId) {
        const dlg = this.dialogs[dialogId];
        if (!dlg) return;
        const topic = topicId
            ? dlg.topics.find(t => t.id === topicId)
            : dlg.topics.find(t => t.id === dlg.startTopic);
        if (!topic) return;

        // Show the NPC's greeting as a text window, then show options
        this.activeDialog = {
            dialogId: dialogId,
            topicId: topic.id,
            phase: 'greeting',  // 'greeting' -> 'options' -> 'response' -> back to 'options' or end
            greetingText: topic.text,
            responseText: null,
            pendingAction: null,
            pendingNextTopic: null,
            pendingEnd: false
        };

        if (topic.text) {
            this.showTextWindow(topic.text, { color: '#FFFFFF', duration: 0 });
        } else {
            // No greeting, skip to options
            this.activeDialog.phase = 'options';
            this._showDialogOptions();
        }
    },

    /** Internal: display dialog options as a clickable list (AGS show_dialog_options). */
    _showDialogOptions() {
        const dlg = this.dialogs[this.activeDialog.dialogId];
        const topic = dlg.topics.find(t => t.id === this.activeDialog.topicId);
        if (!topic) { this.activeDialog = null; return; }

        // Filter visible options (respecting once/condition flags)
        const visibleOpts = [];
        for (let i = 0; i < topic.options.length; i++) {
            const opt = topic.options[i];
            // Skip if it was a once-only option and already chosen
            if (opt.once && dlg.chosenOptions[this.activeDialog.topicId + '_' + i]) continue;
            // Skip if condition is specified and not met
            if (opt.condition && !opt.condition(this)) continue;
            visibleOpts.push({ index: i, opt });
        }

        if (visibleOpts.length === 0) {
            // No options available — end dialog
            this.activeDialog = null;
            this.textWindow = null;
            return;
        }

        // Build the dialog options display (AGS-style numbered list in blue box)
        const lines = visibleOpts.map((v, idx) => {
            const chosen = dlg.chosenOptions[this.activeDialog.topicId + '_' + v.index];
            const prefix = (idx + 1) + '. ';
            return { text: prefix + v.opt.text, chosen: !!chosen, optIndex: v.index };
        });

        this.activeDialog.phase = 'options';
        this.activeDialog.visibleOptions = lines;
        this.activeDialog.selectedIndex = 0; // keyboard selection
        this.renderAccessibleDialogOptions(lines);

        // We don't use showTextWindow for this — we render a custom options panel
        this.textWindow = null; // clear any existing text window
    },

    /** Handle dialog option selection (by number key or click). */
    selectDialogOption(displayIndex) {
        if (!this.activeDialog || this.activeDialog.phase !== 'options') return;
        const lines = this.activeDialog.visibleOptions;
        if (displayIndex < 0 || displayIndex >= lines.length) return;

        const dlg = this.dialogs[this.activeDialog.dialogId];
        const topic = dlg.topics.find(t => t.id === this.activeDialog.topicId);
        const optInfo = lines[displayIndex];
        const opt = topic.options[optInfo.optIndex];
        this.clearAccessibleDialogOptions();

        // Mark as chosen (AGS DFLG_HASBEENCHOSEN)
        dlg.chosenOptions[this.activeDialog.topicId + '_' + optInfo.optIndex] = true;
        this.activeDialog.choiceKey = this.activeDialog.topicId + '_' + optInfo.optIndex;

        // Show the player's line first, then NPC response
        if (opt.response) {
            this.activeDialog.phase = 'response';
            this.activeDialog.responseText = opt.response;
            this.activeDialog.pendingAction = opt.action || null;
            this.activeDialog.pendingNextTopic = opt.nextTopic || null;
            this.activeDialog.pendingEnd = !!opt.endDialog;
            this.showTextWindow(opt.response, { color: '#FFFFFF', duration: 0 });
        } else {
            // No response text, execute immediately
            if (opt.action && !this.runDialogAction(opt.action)) return;
            if (opt.endDialog) {
                this.activeDialog = null;
                this.textWindow = null;
            } else if (opt.nextTopic) {
                this.startDialog(this.activeDialog.dialogId, opt.nextTopic);
            } else {
                this._showDialogOptions();
            }
        }
    },

    /** Called when text window is dismissed during active dialog. */
    runDialogAction(action) {
        const dialog = this.activeDialog;
        this.runContentHandler(`${dialog.dialogId} dialogue action`, action, this.actionScope);
        if (!this.lastContentError) return true;
        delete this.dialogs[dialog.dialogId].chosenOptions[dialog.choiceKey];
        this.activeDialog = null;
        this.clearAccessibleDialogOptions();
        return false;
    },

    _advanceDialog() {
        if (!this.activeDialog) return false;

        if (this.activeDialog.phase === 'greeting') {
            // Greeting dismissed — show options
            this.activeDialog.phase = 'options';
            this._showDialogOptions();
            return true;
        }

        if (this.activeDialog.phase === 'response') {
            // Response dismissed — execute action, then next topic or back to options
            const ad = this.activeDialog;
            // The action may open its own window (a treasure found, a warning);
            // it belongs to the story, not to the speaker, and must survive the end.
            ad.phase = 'action';
            if (ad.pendingAction && !this.runDialogAction(ad.pendingAction)) return true;

            if (ad.pendingEnd) {
                this.activeDialog = null;
            } else if (ad.pendingNextTopic) {
                this.startDialog(ad.dialogId, ad.pendingNextTopic);
            } else {
                this._showDialogOptions();
            }
            return true;
        }

        return false;
    },

    /** Compute the dialog options box layout (shared by draw + click). */
    _getDialogBoxRect() {
        if (!this.activeDialog || !this.activeDialog.visibleOptions) return null;
        const lines = this.activeDialog.visibleOptions;
        if (lines.length === 0) return null;
        const lineH = 18;
        const pad = 12;
        // Auto-size width based on longest option text
        const measure = this._measureCtx;
        measure.font = '13px "Courier New"';
        let maxTextW = 200;
        for (const line of lines) {
            const tw = measure.measureText(line.text).width;
            if (tw > maxTextW) maxTextW = tw;
        }
        const boxW = Math.min(560, Math.round(maxTextW) + pad * 2 + 24);
        const boxH = lines.length * lineH + pad * 2 + 4;
        const boxX = Math.round((this.WIDTH - boxW) / 2);
        const boxY = Math.round((this.HEIGHT - boxH) / 2 - 20);
        return { boxX, boxY, boxW, boxH, lineH, pad, startY: boxY + pad + 14 };
    },

    /** Render the dialog options panel (called from render). */
    _drawDialogOptions(ctx) {
        if (!this.activeDialog || this.activeDialog.phase !== 'options') return;
        const lines = this.activeDialog.visibleOptions;
        if (!lines || lines.length === 0) return;
        const r = this._getDialogBoxRect();
        if (!r) return;

        // AGS-style dialog box, dressed to match the game's own chrome.
        ctx.fillStyle = '#2c1c0a';
        ctx.fillRect(r.boxX, r.boxY, r.boxW, r.boxH);
        ctx.strokeStyle = PAL.WINDOW_PAPER;
        ctx.lineWidth = 2;
        ctx.strokeRect(r.boxX + 1, r.boxY + 1, r.boxW - 2, r.boxH - 2);
        ctx.strokeStyle = PAL.GOLD_BASE;
        ctx.lineWidth = 1;
        ctx.strokeRect(r.boxX + 4, r.boxY + 4, r.boxW - 8, r.boxH - 8);

        ctx.font = '13px "Courier New"';
        ctx.textAlign = 'left';
        const sel = this.activeDialog.selectedIndex;

        for (let i = 0; i < lines.length; i++) {
            const isHover = i === sel;
            const isRead = lines[i].chosen;

            // Highlight bar behind selected option
            if (isHover) {
                ctx.fillStyle = 'rgba(217, 164, 65, 0.34)';
                ctx.fillRect(r.boxX + 6, r.startY + i * r.lineH - 13, r.boxW - 12, r.lineH);
            }

            if (isHover) {
                ctx.fillStyle = PAL.GOLD_LIT;
            } else if (isRead) {
                ctx.fillStyle = '#8d8168';
            } else {
                ctx.fillStyle = PAL.WINDOW_PAPER;
            }

            ctx.fillText(lines[i].text, r.boxX + r.pad + 8, r.startY + i * r.lineH);
        }

        // Detect mouse hover over dialog options
        if (this.mouseX >= r.boxX && this.mouseX <= r.boxX + r.boxW &&
            this.mouseY >= r.boxY + r.pad && this.mouseY <= r.boxY + r.pad + lines.length * r.lineH) {
            const hoverIdx = Math.floor((this.mouseY - r.boxY - r.pad) / r.lineH);
            if (hoverIdx >= 0 && hoverIdx < lines.length) {
                this.activeDialog.selectedIndex = hoverIdx;
            }
        }
    }
});
