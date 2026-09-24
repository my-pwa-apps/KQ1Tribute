// ============================================================
// CROWN QUEST ENGINE - RENDERING
// The frame: scene, HUD, overlays, title screen and shared lighting.
// These methods extend GameEngine.prototype; js/engine.js owns the state.
// ============================================================

GameEngine.extend({
    createDitherPattern(color1, color2) {
        if (!this._ditherCache) this._ditherCache = {};
        const key = `${color1}_${color2}`;
        if (this._ditherCache[key]) return this._ditherCache[key];

        const pCanvas = document.createElement('canvas');
        pCanvas.width = 2;
        pCanvas.height = 2;
        const pCtx = pCanvas.getContext('2d');
        pCtx.fillStyle = color1;
        pCtx.fillRect(0, 0, 2, 2);
        pCtx.fillStyle = color2;
        pCtx.fillRect(1, 0, 1, 1);
        pCtx.fillRect(0, 1, 1, 1);

        try {
            const pat = this.ctx.createPattern(pCanvas, 'repeat');
            this._ditherCache[key] = pat;
            return pat;
        } catch {
            return color1;
        }
    },

    // ---- Render ----
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        // Prop contacts are re-recorded by each frame's draw calls.
        this._propBases = [];

        // Apply screen shake offset
        const shaking = this.screenShake > 0;
        if (shaking) {
            const shakeX = (Math.random() - 0.5) * this.screenShake * 2;
            const shakeY = (Math.random() - 0.5) * this.screenShake * 2;
            ctx.save();
            ctx.translate(shakeX, shakeY);
        }

        if (this.cutscene) {
            this.drawCutsceneFrame(ctx);
            if (shaking) ctx.restore();
            return;
        }

        if (this.titleScreen) {
            this.drawTitleScreen(ctx);
            if (shaking) ctx.restore();
            return;
        }

        const room = this.rooms[this.currentRoomId];
        this.drawScene(ctx, room);
        if (!this.immersiveView) this.drawHud(ctx, room);

        // Room transition (fade / iris / wipe)
        if (this.roomTransition > 0) {
            this.drawRoomTransition(ctx);
        }

        // Restore screen shake transform before steady overlays
        if (shaking) ctx.restore();

        this.drawPickupSparkle(ctx);
        this.drawSoundCaption(ctx);
    },

    /** Render the active cutscene plus its boundary fades and overlays. */
    drawCutsceneFrame(ctx) {
        const cs = this.cutscene;
        const progress = Math.min(cs.elapsed / cs.duration, 1);
        cs.draw(ctx, this.WIDTH, this.HEIGHT, progress, cs.elapsed);
        // Cutscenes combine scenery with story-critical captions in one draw
        // callback. Keep them at native resolution so small text remains legible.
        // Overlays sit on the screen, not in the scene, so they must not ride
        // the shake transform (and the fade must still cover every edge).
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Sierra-style fade in / out at cutscene boundaries (200ms each)
        const fadeIn = cs.elapsed < 200 ? 1 - cs.elapsed / 200 : 0;
        const remaining = cs.duration - cs.elapsed;
        const fadeOut = remaining < 200 ? 1 - remaining / 200 : 0;
        const fade = Math.max(fadeIn, fadeOut);
        if (fade > 0) {
            ctx.fillStyle = `rgba(0,0,0,${fade})`;
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        }
        // In-cutscene score toast (visible while status bar is hidden)
        if (this.animTimer < this.scoreFlashUntil && this.lastScoreDelta !== 0) {
            const sign = this.lastScoreDelta > 0 ? '+' : '';
            ctx.font = 'bold 14px "Courier New"';
            ctx.fillStyle = this.lastScoreDelta > 0 ? PAL.TEXT_POSITIVE : PAL.TEXT_NEGATIVE;
            ctx.textAlign = 'center';
            ctx.fillText(`${sign}${this.lastScoreDelta} score`, this.WIDTH / 2, 22);
            ctx.textAlign = 'left';
        }
        // Skip hint
        if (cs.skippable && cs.elapsed > 500) {
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'right';
            ctx.fillText('Click to skip', this.WIDTH - 10, this.HEIGHT - 8);
            ctx.textAlign = 'left';
        }
        ctx.restore();
    },

    /** Draw the room art and every Y-sorted actor / foreground layer in it. */
    drawScene(ctx, room) {
        if (room && room.draw) room.draw(ctx, this.WIDTH, this.HEIGHT, this);

        // === AGI-INSPIRED: Y-SORTED RENDERING (OBJLIST priority system) ===
        // Collect all drawable entities with Y-positions, sort back-to-front
        this._drawables.length = 0;
        let poolIndex = 0;
        // Descriptors are pooled: this runs every frame for every visible entity.
        const pushDrawable = (y, type, ref) => {
            let d = this._drawablePool[poolIndex];
            if (!d) { d = { y: 0, type: '', ref: null }; this._drawablePool[poolIndex] = d; }
            poolIndex++;
            d.y = y; d.type = type; d.ref = ref || null;
            this._drawables.push(d);
        };

        // Player
        if (this.playerVisible && !this.dead) {
            pushDrawable(this.playerY, 'player');
        }

        // NPCs
        for (const npc of this.npcs) {
            if (npc.visible) {
                pushDrawable(npc.y, 'npc', npc);
            }
        }

        // Foreground layers registered by rooms
        for (const layer of this.foregroundLayers) {
            pushDrawable(layer.y, 'layer', layer);
        }

        // Sort by Y (lower Y = behind, drawn first — AGI's MakeObjList)
        this._drawables.sort(byDepth);

        // Draw all in sorted order
        for (const d of this._drawables) {
            if (d.type === 'player') this.drawPlayer(ctx);
            else if (d.type === 'npc') {
                if (d.ref.shadow) {
                    const sc = d.ref.shadow.scale || 1;
                    this.drawContactShadow(ctx, d.ref.x, d.ref.y + (d.ref.shadow.offsetY || 0), sc, d.ref.shadow);
                }
                d.ref.draw(ctx, this);
            }
            else d.ref.draw(ctx, this);
        }
        this.applyClassicSceneRaster(ctx);
    },

    /** Resolve room artwork through a hard-edged 320x200 raster. This is not a
     * post-processing filter: it restores the chunky shape language of AGI/EGA art
     * while allowing rooms to use modern Canvas drawing and expanded colour. */
    applyClassicSceneRaster(ctx) {
        const low = this.sceneRasterCtx;
        low.save();
        low.setTransform(1, 0, 0, 1, 0, 0);
        low.clearRect(0, 0, this.sceneRasterCanvas.width, this.sceneRasterCanvas.height);
        low.imageSmoothingEnabled = false;
        low.drawImage(this.canvas, 0, 0, this.WIDTH, this.HEIGHT,
            0, 0, this.sceneRasterCanvas.width, this.sceneRasterCanvas.height);
        low.restore();

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        ctx.drawImage(this.sceneRasterCanvas, 0, 0,
            this.sceneRasterCanvas.width, this.sceneRasterCanvas.height,
            0, 0, this.WIDTH, this.HEIGHT);
        ctx.restore();
    },

    /** Draw status bars, text windows, dialog options and end-game overlays. */
    drawHud(ctx, room) {
        if (!this.classicMode) this.drawHotspotLabel(ctx, room);
        if (this.hotspotReveal) this.drawHotspotReveal(ctx, room);

        // Current action indicator / Sierra status line
        if (!this.dead && !this.won) {
            if (this.classicMode) this.drawClassicStatusBar(ctx);
            else this.drawEnhancedStatusBar(ctx);
        }

        // AGI-inspired: Sierra text window overlay
        this.drawTextWindow(ctx);
        this.drawPortraitWindow(ctx);
        this.drawItemCloseUpWindow(ctx);

        // AGS-inspired: dialog options overlay
        this._drawDialogOptions(ctx);

        if (this.classicMode && !this.textWindow && !this.activeDialog && !this.cutscene) {
            this.drawParserPrompt(ctx);
        }

        if (this.dead) this.drawDeathOverlay(ctx);
        if (this.won) this.drawWinOverlay(ctx);
        if (this.debugGround) this.drawGroundDebug(ctx);
    },

    /** Authoring aid (F9): the walkable band, plus a tick at every ground point
     *  an actor claimed this frame. Anything drawn above its own tick is
     *  floating, which is otherwise only visible by staring at a screenshot. */
    drawGroundDebug(ctx) {
        if (this.walkableArea) {
            ctx.fillStyle = 'rgba(0,200,255,0.10)';
            for (let y = 180; y < this.HEIGHT; y += 4) {
                let runStart = null;
                for (let x = 0; x <= this.WIDTH; x += 4) {
                    const ok = x < this.WIDTH && this.walkableArea(x, y);
                    if (ok && runStart === null) runStart = x;
                    else if (!ok && runStart !== null) {
                        ctx.fillRect(runStart, y, x - runStart, 2);
                        runStart = null;
                    }
                }
            }
        }
        for (const b of this.barriers) {
            if (b.enabled && !b.enabled(this)) continue;
            ctx.strokeStyle = 'rgba(255,80,80,0.7)';
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
        }
        // Declared surfaces, and where each prop claims to touch them
        ctx.font = '9px "Courier New"';
        for (const [id, s] of Object.entries(this.surfaces)) {
            ctx.strokeStyle = '#4dd2ff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = s.x0; x <= s.x1; x += 4) {
                const y = (typeof s.yAt === 'function' ? s.yAt(x) : s.yAt) + 0.5;
                if (x === s.x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.fillStyle = '#4dd2ff';
            ctx.fillText(id, s.x0 + 2, (typeof s.yAt === 'function' ? s.yAt(s.x0) : s.yAt) - 3);
        }
        for (const p of this._propBases) {
            ctx.fillStyle = '#ff8a3d';
            ctx.fillRect(p.x - 4, p.y - 1, 9, 3);
        }
        for (const m of this._groundMarks) {
            ctx.strokeStyle = '#ffe14d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(m.x - 16, m.y + 0.5);
            ctx.lineTo(m.x + 16, m.y + 0.5);
            ctx.moveTo(m.x + 0.5, m.y - 5);
            ctx.lineTo(m.x + 0.5, m.y + 5);
            ctx.stroke();
            ctx.fillStyle = '#ffe14d';
            ctx.font = '9px "Courier New"';
            ctx.fillText(`${Math.round(m.y)}`, m.x + 19, m.y + 3);
        }
        ctx.fillStyle = '#ffe14d';
        ctx.font = '11px "Courier New"';
        ctx.fillText('F9 ground debug', 8, this.HEIGHT - 8);
        this._groundMarks = [];
    },

    /** Sparkle burst when an item is picked up (steady, unaffected by shake). */
    drawPickupSparkle(ctx) {
        if (this.animTimer >= this.pickupSparkleUntil) return;
        const remaining = this.pickupSparkleUntil - this.animTimer;
        const p = 1 - remaining / 480;
        const sx = this.pickupSparkleX;
        const sy = this.pickupSparkleY - p * 12;
        const alpha = 1 - p;
        ctx.fillStyle = `rgba(255,255,180,${alpha})`;
        // four-pixel cross sparkles
        const r = 1 + p * 4;
        ctx.fillRect(sx - r, sy, 2, 2);
        ctx.fillRect(sx + r, sy, 2, 2);
        ctx.fillRect(sx, sy - r, 2, 2);
        ctx.fillRect(sx, sy + r, 2, 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(sx, sy, 2, 2);
    },

    /** Queue a closed-caption for a sound the player cannot hear. */
    showSoundCaption(label) {
        if (!label) return;
        this.soundCaption = { text: `\u266a ${label}`, until: this.animTimer + 1800 };
    },

    /** Draw the sound caption strip (accessibility fallback for audio-only cues). */
    drawSoundCaption(ctx) {
        const cap = this.soundCaption;
        if (!cap || this.animTimer >= cap.until) return;
        const remaining = cap.until - this.animTimer;
        const alpha = Math.min(1, remaining / 400);
        ctx.font = 'bold 11px "Courier New"';
        const textW = ctx.measureText(cap.text).width;
        const boxW = textW + 18;
        const boxX = Math.round((this.WIDTH - boxW) / 2);
        const boxY = this.classicMode ? this.HEIGHT - 62 : this.HEIGHT - 30;
        ctx.fillStyle = `rgba(0,0,0,${0.72 * alpha})`;
        ctx.fillRect(boxX, boxY, boxW, 18);
        ctx.strokeStyle = `rgba(170,170,170,${0.55 * alpha})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, 17);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText(cap.text, this.WIDTH / 2, boxY + 13);
        ctx.textAlign = 'left';
    },

    /** Draw the incoming room transition. Sierra used more than a plain fade:
     *  'iris' opens a circular aperture, 'wipe' slides the darkness away,
     *  'fade' is the classic dissolve to black. `roomTransition` runs 1 -> 0. */
    drawRoomTransition(ctx) {
        const t = this.roomTransition;
        const W = this.WIDTH, H = this.HEIGHT;
        ctx.fillStyle = PAL.OUTLINE;

        switch (this.roomTransitionStyle) {
            case 'iris': {
                // Black everywhere except a growing circle centred on the player.
                const maxR = Math.hypot(W, H) / 2;
                const r = (1 - t) * maxR;
                const cx = Math.min(Math.max(this.playerX, 0), W);
                const cy = Math.min(Math.max(this.playerY - 20, 0), H);
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, W, H);
                ctx.arc(cx, cy, r, 0, Math.PI * 2, true); // reverse winding = hole
                ctx.fill('evenodd');
                ctx.restore();
                break;
            }
            case 'wipe': {
                // Darkness retreats to the right, revealing the scene behind it.
                const x = (1 - t) * W;
                ctx.fillRect(x, 0, W - x, H);
                // Soft leading edge so the wipe doesn't look like a hard tear.
                const grad = ctx.createLinearGradient(x - 24, 0, x, 0);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, 'rgba(0,0,0,1)');
                ctx.fillStyle = grad;
                ctx.fillRect(x - 24, 0, 24, H);
                break;
            }
            default:
                ctx.fillStyle = `rgba(0,0,0,${t})`;
                ctx.fillRect(0, 0, W, H);
        }
    },

    drawClassicStatusBar(ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, this.WIDTH, 16);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 16, this.WIDTH, 1);
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillStyle = '#000000';
        const room = this.rooms[this.currentRoomId];
        const delta = this.animTimer < this.scoreFlashUntil && this.lastScoreDelta !== 0 ? ` +${this.lastScoreDelta}` : '';
        ctx.fillText(`Score:${this.score} of ${this.maxScore}${delta}`, 8, 12);
        ctx.textAlign = 'center';
        ctx.fillText(room ? room.name.toUpperCase() : this.game.shortTitle.toUpperCase(), this.WIDTH / 2, 12);
        ctx.textAlign = 'right';
        const soundStatus = this.sound && this.sound.getStatus ? this.sound.getStatus() : (this.sound && this.sound.muted ? 'off' : 'on');
        ctx.fillText(`Sound:${soundStatus}`, this.WIDTH - 8, 12);
        ctx.textAlign = 'left';
    },

    drawEnhancedStatusBar(ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.WIDTH, 16);
        ctx.fillStyle = '#555555';
        ctx.fillRect(0, 16, this.WIDTH, 1);
        const actionLabel = this.selectedItem
            ? `Use ${this.items[this.selectedItem]?.name || '?'} on...`
            : this.currentAction.charAt(0).toUpperCase() + this.currentAction.slice(1);
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(actionLabel, 8, 12);
        ctx.fillStyle = '#FFFF55';
        ctx.textAlign = 'right';
        const delta = this.animTimer < this.scoreFlashUntil && this.lastScoreDelta !== 0 ? `  +${this.lastScoreDelta}` : '';
        ctx.fillText(`Score: ${this.score} / ${this.maxScore}${delta}`, this.WIDTH - 8, 12);
        ctx.textAlign = 'left';
    },

    drawParserPrompt(ctx) {
        const y = this.HEIGHT - 22;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, this.HEIGHT - 38, this.WIDTH, 38);
        ctx.strokeStyle = '#555555';
        ctx.beginPath();
        ctx.moveTo(0, this.HEIGHT - 38);
        ctx.lineTo(this.WIDTH, this.HEIGHT - 38);
        ctx.stroke();
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillStyle = '#FFFFFF';
        const cursor = Math.floor(this.animTimer / 350) % 2 ? '_' : ' ';
        ctx.fillText(`${this.parserPrompt} ${this.commandLine}${cursor}`, 10, y);
        ctx.font = '9px "Courier New"';
        ctx.fillStyle = '#AAAAAA';
        ctx.textAlign = 'right';
        ctx.fillText('F3=again  F5=save  F7=restore  F10=enhanced  HINT=clue', this.WIDTH - 10, this.HEIGHT - 8);
        ctx.textAlign = 'left';
    },

    // ---- Title Screen ----
    drawTitleScreen(ctx) {
        const W = this.WIDTH, H = this.HEIGHT;
        const t = this.animTimer;

        if (this.game.drawTitleBackdrop) {
            this.game.drawTitleBackdrop(ctx, W, H, this, t);
        } else {
            // Games supply their own title art; this is only the safety net if
            // drawTitleBackdrop is missing.
            ctx.fillStyle = '#101018';
            ctx.fillRect(0, 0, W, H);
        }

        // ---- Title text: big, dramatic, letter-spaced, AGI blink ----
        ctx.textAlign = 'center';

        // Main title with shadow
        ctx.font = 'bold 44px "Courier New"';
        // Drop shadow
        ctx.fillStyle = '#3a1f08';
        ctx.fillText(this.game.title, W / 2 + 3, 58);
        // Main text (AGI-style: 2-frame blink between gold and white)
        const titleBlink = Math.floor(t / 600) % 2;
        ctx.fillStyle = titleBlink ? PAL.GOLD_LIT : '#FFFFFF';
        ctx.fillText(this.game.title, W / 2, 55);

        // Subtitle
        ctx.font = '15px "Courier New"';
        ctx.fillStyle = PAL.GOLD_BASE;
        ctx.fillText(this.game.subtitle, W / 2, 78);

        // Thin decorative line under subtitle
        ctx.strokeStyle = PAL.GOLD_SHADOW;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(160, 86);
        ctx.lineTo(480, 86);
        ctx.stroke();

        // ---- Credits area (bottom third) ----
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = '#d8cdb4';
        ctx.fillText(this.game.creditsLine, W / 2, H - 130);

        ctx.font = '11px "Courier New"';
        ctx.fillStyle = PAL.GOLD_BASE;
        if (this.game.inspirationLine) ctx.fillText(this.game.inspirationLine, W / 2, H - 112);

        ctx.font = '10px "Courier New"';
        ctx.fillStyle = '#8f8570';
        ctx.fillText('Choose your interface. F10 still toggles later.', W / 2, H - 86);

        const classicRect = this.getTitleButtonRect('classic');
        const enhancedRect = this.getTitleButtonRect('enhanced');
        this.drawTitleButton(ctx, classicRect, 'C  CLASSIC PARSER', this.classicMode);
        this.drawTitleButton(ctx, enhancedRect, 'E  ENHANCED CLICK', !this.classicMode);

        const blink = Math.floor(t / 600) % 2;
        ctx.font = '10px "Courier New"';
        ctx.fillStyle = blink ? '#FFFF55' : '#777744';
        ctx.fillText('ENTER starts with the highlighted mode', W / 2, H - 22);

        // Copyright
        ctx.font = '9px "Courier New"';
        ctx.fillStyle = '#555555';
        if (this.game.copyright) ctx.fillText(this.game.copyright, W / 2, H - 8);

        ctx.textAlign = 'left';
    },

    getTitleButtonRect(mode) {
        const y = this.HEIGHT - 60;
        return mode === 'classic'
            ? { x: 132, y, w: 176, h: 24 }
            : { x: 332, y, w: 176, h: 24 };
    },

    drawTitleButton(ctx, rect, label, selected) {
        ctx.fillStyle = selected ? '#4a2e12' : '#241608';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = selected ? PAL.GOLD_LIT : PAL.GOLD_SHADOW;
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
        ctx.font = 'bold 11px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillStyle = selected ? '#FFFFFF' : '#b6ab92';
        ctx.fillText(label, rect.x + rect.w / 2, rect.y + 16);
        ctx.textAlign = 'left';
        ctx.lineWidth = 1;
    },

    // ---- Player Sprite ----
    /**
     * Draw a soft elliptical contact shadow on the floor plane beneath a character.
     * Grounds sprites in the pseudo-3D scenes so they do not appear to float.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx - centre x (character's feet)
     * @param {number} groundY - y of the floor contact point
     * @param {number} scale - character depth scale (radius follows it)
    * @param {Object} [opts] - { rx, ry, alpha, rotation } multipliers/overrides
     */
    drawContactShadow(ctx, cx, groundY, scale, opts) {
        const o = opts || {};
        const rx = (o.rx != null ? o.rx : 6) * scale;
        const ry = (o.ry != null ? o.ry : 1.6) * scale;
        const alpha = o.alpha != null ? o.alpha : 0.28;
        if (rx <= 0 || ry <= 0) return;
        // F9 ground overlay reads these: a shadow is an actor's claim about where
        // it touches the floor, so it is the right thing to audit.
        if (this.debugGround) this._groundMarks.push({ x: cx, y: groundY });
        const light = o.light !== undefined ? o.light : this.sceneLight;
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        if (light) {
            // Lean the puddle away from the light and stretch it with distance,
            // so a character reads as lit by the room rather than by the camera.
            const dx = cx - light.x, dy = groundY - light.y;
            const dist = Math.hypot(dx, dy) || 1;
            const reach = light.strength * Math.min(1.9, 0.45 + dist / 340);
            ctx.translate(cx + (dx / dist) * rx * reach * 1.7, groundY + Math.abs(dy / dist) * ry * reach);
            ctx.rotate(Math.atan2(dy / dist * 0.34, dx / dist));
            ctx.beginPath();
            ctx.ellipse(0, 0, rx * (1 + reach * 0.85), ry, 0, 0, Math.PI * 2);
        } else {
            ctx.beginPath();
            ctx.ellipse(cx, groundY, rx, ry, o.rotation || 0, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    },

    /** Cache a room's static art in an offscreen canvas and blit it thereafter.
     *
     *  Scenery here is procedural: a wood is several ranks of seeded tree
     *  helpers, a turf texture and a few hundred leaf-litter rects. None of it
     *  changes between frames, but every frame paid for all of it, which put the
     *  heaviest rooms over the 16ms frame budget on a fast machine alone.
     *
     *  `key` must encode every piece of state the art depends on, so a room
     *  whose scenery changes composes that state into the key -- for example
     *  `dragon_cave|fire:0` and `dragon_cave|fire:1` cache separately, and the
     *  room picks the key from its own flag. Anything animated (fire, water,
     *  actors) stays outside the layer entirely. */
    staticLayer(key, drawFn, w = this.WIDTH, h = this.HEIGHT) {
        let layer = this._staticLayers.get(key);
        if (layer) {
            // Refresh recency so the eviction below drops genuinely cold rooms.
            this._staticLayers.delete(key);
            this._staticLayers.set(key, layer);
            return layer;
        }
        layer = document.createElement('canvas');
        layer.width = w;
        layer.height = h;
        const lctx = layer.getContext('2d');
        lctx.imageSmoothingEnabled = false;
        drawFn(lctx, w, h, this);
        this._staticLayers.set(key, layer);
        // A 640x400 layer is ~1MB. Keep a few rooms' worth so walking back and
        // forth stays free, but never let this grow without bound.
        while (this._staticLayers.size > 8) {
            const oldest = this._staticLayers.keys().next().value;
            this._staticLayers.delete(oldest);
        }
        return layer;
    },

    /** Soft pool of light on a surface. Rooms call this after painting the floor
     *  so ceiling strips, fires and glowing props actually spill onto the ground.
     *
     *  Rooms animate both radius and alpha, so the cached ramp is built at unit
     *  alpha and keyed on a quantised radius; opacity is applied with
     *  globalAlpha, which is mathematically the same and keeps the cache bounded.
     *  Keying on the raw floats leaked a CanvasGradient every frame. */
    lightPool(ctx, x, y, radius, color, alpha) {
        if (radius <= 0) return;
        const a = alpha == null ? 0.18 : alpha;
        if (a <= 0) return;
        const rgb = color || '255,235,180';
        const r = Math.max(4, Math.round(radius / 4) * 4);
        const key = `${r}|${rgb}`;
        let g = this._lightPoolCache.get(key);
        if (!g) {
            g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            g.addColorStop(0, `rgba(${rgb},1)`);
            g.addColorStop(0.55, `rgba(${rgb},0.35)`);
            g.addColorStop(1, `rgba(${rgb},0)`);
            this._lightPoolCache.set(key, g);
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, a);
        ctx.translate(x, y);
        ctx.fillStyle = g;
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.restore();
    },

    /** Darken the frame edges so the eye is pushed to the centre of the scene.
     *  Clipped below the status bar so the HUD keeps its flat black. */
    vignette(ctx, strength, color) {
        const s = strength == null ? 0.35 : strength;
        if (s <= 0) return;
        const W = this.WIDTH, H = this.HEIGHT, top = 17;
        const rgb = color || '0,0,0';
        // Unit-alpha ramp scaled by globalAlpha, so an animated strength cannot
        // grow the cache.
        let g = this._vignetteCache.get(rgb);
        if (!g) {
            g = ctx.createRadialGradient(W / 2, H * 0.58, H * 0.28, W / 2, H * 0.58, H * 0.95);
            g.addColorStop(0, `rgba(${rgb},0)`);
            g.addColorStop(0.6, `rgba(${rgb},0.35)`);
            g.addColorStop(1, `rgba(${rgb},1)`);
            this._vignetteCache.set(rgb, g);
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, s);
        ctx.beginPath();
        ctx.rect(0, top, W, H - top);
        ctx.clip();
        ctx.fillStyle = g;
        ctx.fillRect(0, top, W, H - top);
        ctx.restore();
    },

    /** Wrap a context so fillRect snaps to whole pixels; edges are rounded rather
     *  than width, so adjacent sprite blocks stay flush instead of gapping. */
    _pixelCtx(ctx) {
        if (!this._pixelCtxProxy || this._pixelCtxTarget !== ctx) {
            const R = Math.round;
            this._pixelCtxTarget = ctx;
            this._pixelCtxProxy = new Proxy(ctx, {
                get: (t, prop) => {
                    if (prop === 'fillRect') {
                        return (a, b, c, d) => {
                            const x0 = R(a), y0 = R(b);
                            t.fillRect(x0, y0, R(a + c) - x0, R(b + d) - y0);
                        };
                    }
                    const value = t[prop];
                    return typeof value === 'function' ? value.bind(t) : value;
                },
                set: (t, prop, value) => { t[prop] = value; return true; }
            });
        }
        return this._pixelCtxProxy;
    },

    /** Wrap a context so the ego's greyscale tunic ramp is remapped to cloth
     *  tones. Colours outside TUNIC_REMAP pass through untouched. */
    _suitCtx(ctx) {
        if (!this._suitCtxProxy || this._suitCtxTarget !== ctx) {
            this._suitCtxTarget = ctx;
            this._suitCtxProxy = new Proxy(ctx, {
                get: (t, prop) => {
                    const value = t[prop];
                    return typeof value === 'function' ? value.bind(t) : value;
                },
                set: (t, prop, value) => {
                    t[prop] = (prop === 'fillStyle' && TUNIC_REMAP[value]) || value;
                    return true;
                }
            });
        }
        return this._suitCtxProxy;
    },

    // ---- Hotspot Label ----
    drawHotspotReveal(ctx, room) {
        if (!room || !room.hotspots || this.dead || this.won) return;
        ctx.save();
        ctx.font = '9px "Courier New"';
        ctx.textAlign = 'center';
        ctx.lineWidth = 1;
        for (const hs of room.hotspots) {
            if (hs.hidden) continue;
            const x = Math.max(1, hs.x);
            const y = Math.max(18, hs.y);
            const right = Math.min(this.WIDTH - 1, hs.x + hs.w);
            const bottom = Math.min(this.HEIGHT - 1, hs.y + hs.h);
            if (right <= x || bottom <= y) continue;
            ctx.fillStyle = 'rgba(255,255,85,0.10)';
            ctx.fillRect(x, y, right - x, bottom - y);
            ctx.strokeStyle = '#FFFF55';
            ctx.strokeRect(x + 0.5, y + 0.5, right - x - 1, bottom - y - 1);
            const name = hs.name || '???';
            const cx = (x + right) / 2;
            const ty = y <= 28 ? bottom + 10 : y - 3;
            const tw = ctx.measureText(name).width;
            ctx.fillStyle = 'rgba(0,0,40,0.85)';
            ctx.fillRect(cx - tw / 2 - 3, ty - 9, tw + 6, 11);
            ctx.fillStyle = '#FFFF55';
            ctx.fillText(name, cx, ty);
        }
        ctx.restore();
    },

    drawHotspotLabel(ctx, room) {
        if (!room || !room.hotspots || this.dead || this.won) return;
        for (let i = room.hotspots.length - 1; i >= 0; i--) {
            const hs = room.hotspots[i];
            if (hs.hidden) continue;
            if (this.mouseX >= hs.x && this.mouseX <= hs.x + hs.w &&
                this.mouseY >= hs.y && this.mouseY <= hs.y + hs.h) {
                const name = hs.name || '???';
                ctx.font = '12px "Courier New"';
                const tw = ctx.measureText(name).width;
                const tx = Math.max(4, Math.min(this.mouseX - tw / 2, this.WIDTH - tw - 12));
                const ty = Math.max(24, this.mouseY - 24);
                // Sierra-style label (EGA blue box)
                ctx.fillStyle = '#0000AA';
                ctx.fillRect(tx - 6, ty - 14, tw + 12, 20);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.strokeRect(tx - 6, ty - 14, tw + 12, 20);
                ctx.fillStyle = '#FFFF55';
                ctx.fillText(name, tx, ty);
                break;
            }
        }
    },

    // ---- Overlays ----
    drawDeathOverlay(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Sierra death panel. Saturated red on saturated blue sits at the same
        // luminance and vibrates, so the headline is bone white over a deep
        // ground and the red is kept for the border only.
        const bx = 100, by = 96, bw = 440, bh = 206;
        ctx.fillStyle = '#1a1030';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#8a1f1f';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
        ctx.strokeStyle = '#6a5a8a';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 6, by + 6, bw - 12, bh - 12);

        ctx.textAlign = 'center';
        ctx.font = 'bold 32px "Courier New"';
        ctx.fillStyle = '#2a0d0d';
        ctx.fillText('YOU DIED', this.WIDTH / 2 + 2, by + 52);
        ctx.fillStyle = '#f2e6e6';
        ctx.fillText('YOU DIED', this.WIDTH / 2, by + 50);

        // Wrap the death message
        ctx.font = '13px "Courier New"';
        ctx.fillStyle = '#FFFFFF';
        const deathMsg = this.message.split(' — ')[0].trim();
        let lineY = by + 80;
        for (const wrapped of this._wrapLines(deathMsg, bw - 40, '13px "Courier New"')) {
            ctx.fillText(wrapped, this.WIDTH / 2, lineY);
            lineY += 18;
        }

        // Sierra's death dialog: the options are real buttons so touch players
        // are never left on a panel they cannot leave.
        ctx.font = '12px "Courier New"';
        ctx.fillStyle = this.restartArmed ? '#FF7777' : '#AAAACC';
        ctx.fillText(this.restartArmed
            ? 'Unsaved progress will be lost. Confirm to restart.'
            : 'Try Again returns you to where you entered this place.', this.WIDTH / 2, by + bh - 50);
        ctx.textAlign = 'left';
        this.drawOverlayButtons(ctx, '#2a1c4a');
    },

    drawWinOverlay(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Sierra-style bordered victory box (EGA blue/yellow)
        const bx = 80, by = 60, bw = 480, bh = 280;
        ctx.fillStyle = '#101a3c';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#FFFF55';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
        ctx.strokeStyle = '#5555FF';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 6, by + 6, bw - 12, bh - 12);

        // A scatter of stars rather than four identical corner marks, which
        // read as a printed certificate.
        let starSeed = 6161;
        const starRnd = () => { starSeed = (starSeed * 16807) % 2147483647; return (starSeed & 0xFFFF) / 0xFFFF; };
        for (let i = 0; i < 18; i++) {
            const edge = i % 2 === 0;
            const sx = bx + 16 + starRnd() * (bw - 34);
            const sy = edge ? by + 16 + starRnd() * 10 : by + bh - 8 - starRnd() * 10;
            const sz = 9 + starRnd() * 8;
            ctx.fillStyle = starRnd() > 0.5 ? '#FFFF55' : '#c9b83a';
            ctx.font = `${sz.toFixed(0)}px "Courier New"`;
            ctx.fillText('\u2605', sx, sy);
        }

        ctx.textAlign = 'center';
        ctx.font = 'bold 30px "Courier New"';
        const congratsBlink = Math.floor(this.animTimer / 400) % 2;
        ctx.fillStyle = congratsBlink ? '#FFFF55' : '#FFFFFF';
        ctx.fillText(this.game.victory.headline, this.WIDTH / 2, by + 55);

        ctx.font = '16px "Courier New"';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.game.victory.subhead, this.WIDTH / 2, by + 95);

        ctx.font = 'bold 18px "Courier New"';
        ctx.fillStyle = '#55FF55';
        ctx.fillText(`Final Score: ${this.score} / ${this.maxScore}`, this.WIDTH / 2, by + 135);

        // Score rating: the game definition supplies tier names and flavor text.
        const pct = this.maxScore > 0 ? this.score / this.maxScore : 0;
        const rank = this.game.victory.ranks.find((tier) => pct >= tier.min) || this.game.victory.ranks[this.game.victory.ranks.length - 1];
        ctx.font = '14px "Courier New"';
        ctx.fillStyle = '#FFFF55';
        ctx.fillText(`Rank: ${rank.title}`, this.WIDTH / 2, by + 160);
        ctx.font = '11px "Courier New"';
        ctx.fillStyle = '#AAAAFF';
        ctx.fillText(rank.flavor, this.WIDTH / 2, by + 178);

        ctx.font = '14px "Courier New"';
        ctx.fillStyle = '#55FFFF';
        this.game.victory.closingLines.slice(0, 2).forEach((line, index) => {
            ctx.fillText(line, this.WIDTH / 2, by + 195 + index * 20);
        });

        ctx.textAlign = 'left';
        this.drawOverlayButtons(ctx, '#101a3c');
    }
});
