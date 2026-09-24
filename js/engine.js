// ============================================================
// SIERRA-STYLE ADVENTURE ENGINE
// Reusable core for classic parser / point-and-click tribute games
// ============================================================

// Shared colour vocabulary (js/palette.js). Falls back to inline
// values so the engine still renders if the palette fails to load.
const PAL = (typeof window !== 'undefined' && window.CQ_PALETTE) || {
    OUTLINE: '#000000', EDGE_HIGHLIGHT: '#AAAAAA', PANEL_SEAM: '#555555',
    WINDOW_PAPER: '#FFFFFF', WINDOW_BORDER: '#AA0000', WINDOW_INK: '#000000',
    WINDOW_HINT_DIM: '#777777', WINDOW_BLUE: '#0000AA',
    TEXT_PRIMARY: '#FFFFFF', TEXT_ACCENT: '#FFFF55', TEXT_POSITIVE: '#55FF55',
    TEXT_NEGATIVE: '#FF8855', TEXT_MUTED: '#AAAAAA'
};

// Save schema version. Bump only for a breaking layout change, and add a
// migration branch in loadGame when doing so.
const SAVE_VERSION = 1;

// Ego scale. Room architecture is authored large (interior doors run ~200px),
// so the sprite is scaled to sit in Sierra's ego-to-doorway range.
// The ego is a ~5.5-head SCI/VGA-era figure spanning roughly 36 units from
// cowlick to sole, so the scale is tuned to keep him the same on-screen height
// as the older, chunkier 32-unit sprite.
const PLAYER_SPRITE_SCALE = 1.27;

// Auto-walk exit trigger box, and the larger box the player must leave before an
// exit they arrived through can fire again.
const EXIT_TRIGGER_X = 15;
const EXIT_TRIGGER_Y = 10;
const EXIT_REARM_X = 70;
const EXIT_REARM_Y = 55;

// Rowan wears a hand-me-down forest tunic, not court finery. The sprite is
// authored against a neutral greyscale ramp and remapped to cloth tones at draw
// time; keeping this as a lookup (rather than editing ~40 sprite literals)
// keeps every view in step.
const TUNIC_REMAP = {
    '#FFFFFF': '#4f8046',
    '#EEEEEE': '#457340',
    '#DDDDDD': '#3f6b3a',
    '#CCCCCC': '#376033',
    '#BBBBBB': '#31552d',
    '#AAAAAA': '#2a4a27'
};

// Hoisted so the y-sort in the render loop does not allocate a comparator per frame.
const byDepth = (a, b) => a.y - b.y;

class GameEngine {
    constructor(gameDefinition = {}) {
        this.game = this.createGameDefinition(gameDefinition);
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.WIDTH = 640;
        this.HEIGHT = 400;
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Classic Sierra backgrounds were authored around 320x200 and then
        // displayed with hard-edged pixels. Rooms remain convenient to author
        // at 640x400, but this buffer gives the finished scenery that same
        // deliberate two-pixel raster without soft CSS scaling. Actors share
        // that raster; UI and portraits are drawn afterward to stay legible.
        this.sceneRasterScale = 2;
        this.sceneRasterCanvas = document.createElement('canvas');
        this.sceneRasterCanvas.width = this.WIDTH / this.sceneRasterScale;
        this.sceneRasterCanvas.height = this.HEIGHT / this.sceneRasterScale;
        this.sceneRasterCtx = this.sceneRasterCanvas.getContext('2d');
        this.sceneRasterCtx.imageSmoothingEnabled = false;
        this.dom = {
            messageText: document.getElementById('message-text'),
            inventoryItems: document.getElementById('inventory-items'),
            saveModal: document.getElementById('save-modal'),
            modalTitle: document.getElementById('modal-title'),
            slotList: document.getElementById('slot-list'),
            saveModalClose: document.getElementById('save-modal-close'),
            btnSave: document.getElementById('btn-save'),
            btnLoad: document.getElementById('btn-load'),
            btnHint: document.getElementById('btn-hint'),
            btnScan: document.getElementById('btn-scan'),
            btnMute: document.getElementById('btn-mute'),
            btnTextSpeed: document.getElementById('btn-text-speed'),
            btnTools: document.getElementById('btn-tools'),
            touchParser: document.getElementById('touch-parser'),
            touchParserInput: document.getElementById('touch-parser-input'),
            btnEnhanced: document.getElementById('btn-enhanced'),
            accessibility: document.getElementById('canvas-accessibility'),
            sayModal: document.getElementById('say-modal'),
            sayForm: document.getElementById('say-form'),
            sayInput: document.getElementById('say-input'),
            sayTitle: document.getElementById('say-title'),
            sayCancel: document.getElementById('say-cancel'),
            dialogAccessibilityOptions: document.getElementById('dialog-accessibility-options')
        };
        this.actionButtons = Array.from(document.querySelectorAll('.action-btn'));

        // Game state
        this.rooms = {};
        this.items = {};
        this.itemDefaults = {};
        // Inventory close-up and speaker portrait art, supplied by js/art.js.
        this.itemArt = {};
        this.portraitArt = {};
        this.currentRoomId = null;
        this.inventory = [];
        this.score = 0;
        this.maxScore = this.game.maxScore;
        this.lastScoreDelta = 0;
        this.scoreFlashUntil = 0;
        this.pickupSparkleX = 0;
        this.pickupSparkleY = 0;
        this.pickupSparkleUntil = 0;
        this.flags = {};
        this.dead = false;
        this.won = false;
        this.titleScreen = true;
        // Death recovery: the state as the player last arrived in a room (or
        // last restored), and whether a destructive restart awaits confirmation.
        this.retrySnapshot = null;
        this.restartArmed = false;
        // Narration waiting behind a priority window (see showMessage).
        this._textQueue = [];

        // Player
        this.playerX = 320;
        this.playerY = 310;
        this.playerTargetX = null;
        this.playerTargetY = null;
        this.playerDir = 1;
        this.playerFacing = 'toward'; // 'left','right','toward','away'
        this.playerWalking = false;
        this.playerFrame = 0;
        this.playerFrameTimer = 0;
        this.playerVisible = true;
        this.playerSpeed = 3;

        // Action system
        this.currentAction = 'walk';
        this.hotspotReveal = false;
        this.selectedItem = null;
        this.pendingAction = null;
        this.classicMode = this.loadInterfacePreference() !== 'enhanced';
        this.commandLine = '';
        this.lastCommand = '';
        this.parserPrompt = '>';

        // Arrow key state
        this.keysDown = {};

        // Mouse
        this.mouseX = 0;
        this.mouseY = 0;

        // Message
        this.message = '';

        // Timing
        this.lastTime = 0;
        this.animTimer = 0;

        // Cutscene system
        this.cutscene = null; // { elapsed, duration, draw, onEnd }

        // Blocking scripted sequence (AGS blocking script / Wait)
        this.sequence = null; // { steps, index, elapsed, skippable, onEnd }

        // Room transition fade
        this.roomTransition = 0;
        this.roomTransitionStyle = 'fade'; // 'fade' | 'iris' | 'wipe'
        this.exitCooldown = 0;
        this.disarmedExits = [];

        // Reusable drawables array for Y-sorted rendering (avoid per-frame allocation)
        this._drawables = [];

        this.sound = this.game.sound || (this.game.soundFactory ? this.game.soundFactory() : new SoundEngine());
        this.sound.onStateChange = () => this.updateSoundUI();
        // Caption significant sounds the player cannot hear, so muted and
        // hearing-impaired players still receive the audio-only feedback.
        this.sound.onInaudibleCue = (label) => this.showSoundCaption(label);
        this.soundCaption = null; // { text, until }

        // Cached once: the query string cannot change without a reload, and the
        // update loop must not allocate a URLSearchParams every frame.
        this.visualTestMode = typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).has('visual-test');
        this._loopRunning = false;
        this._listeners = [];
        this.vrActive = false;
        this.immersiveView = false;
        this.vr = null;
        this._lightPoolCache = new Map();
        this._vignetteCache = new Map();
        this._staticLayers = new Map();
        // Text measurement happens outside the render pass (word wrap, dialog
        // hit-testing). Measuring on the visible context leaves ctx.font dirty.
        this._measureCtx = document.createElement('canvas').getContext('2d');
        this._wrapCache = new Map();
        this._drawablePool = [];

        // Screen shake (intensity decays over time)
        this.screenShake = 0;
        this.screenShakeDecay = 0.003; // per ms

        // === AGI-INSPIRED SYSTEMS ===

        // Horizon line (AGI default: 36 out of 168; scaled to 400px → ~86)
        // Objects above horizon can't walk there (unless ignoring horizon)
        this.horizon = 240; // Default: top of walkable area

        // Priority/depth foreground layers (AGI OBJLIST y-sorting)
        // Rooms can register draw callbacks that render AFTER the player
        // based on Y-position, giving proper depth occlusion
        this.foregroundLayers = []; // { y, draw(ctx, eng) }
        this.debugGround = false;   // F9: show the walkable band and actor ground anchors
        this._groundMarks = [];

        // Horizontal surfaces props stand on (shelf, desk, hearthstone). Declared
        // once per room so the art, the hotspot and the F9 overlay read one line.
        this.surfaces = {};
        this._propBases = [];

        // Dominant light source for the current room. Drives the direction and
        // length of cast shadows so characters sit in the scene's lighting.
        this.sceneLight = null; // { x, y, strength }

        // Walkable area barriers (AGI priority 0/1 control lines)
        // Rooms can define rectangular barriers the player can't cross
        this.barriers = []; // { x, y, w, h }
        this.walkableArea = null;

        // Edge transitions (AGI EGOEDGE / NEWROOM)
        // Rooms can define what happens when ego hits screen edges
        this.edgeTransitions = { left: null, right: null, top: null, bottom: null };

        // Animated NPC objects (AGI ANIOBJ system)
        this.npcs = []; // AnimatedNPC instances

        // Sierra-style text window (drawn on canvas, AGI PRINT/TEXTWIN)
        this.textWindow = null; // { text, x, y, w, h, timer, duration }

        // Typewriter reveal for text windows (AGI's character-at-a-time PRINT).
        // Reading speed is a player setting (AGS Game.TextReadingSpeed); the
        // default respects reduced-motion and deterministic capture runs.
        this.textSpeeds = { slow: 25, normal: 55, fast: 110, instant: Infinity };
        this.textSpeedOrder = ['slow', 'normal', 'fast', 'instant'];
        this.textSpeed = 'normal';
        this.textRevealSpeed = 55; // characters per second
        this.textRevealEnabled = true;
        this.setTextSpeed(this.loadTextSpeedPreference(), false);

        // === AGS-INSPIRED SYSTEMS ===

        // Player idle animation (AGS Character.IdleView / IdleDelay)
        // After standing still for idleDelay ms, a random idle anim plays,
        // then a random pause before the next one. Limited to blink/feettap/eyeroll.
        this.idleTimer = 0;          // ms since player last moved
        this.idleDelay = 4000;       // ms before first idle anim
        this.idleActive = false;     // whether an idle anim is currently playing
        this.idleType = null;        // 'blink' | 'feettap' | 'eyeroll'
        this.idleElapsed = 0;        // ms into the current idle animation
        this.idlePauseTimer = 0;     // ms remaining in pause between idles
        this.idleTypes = ['blink', 'feettap', 'eyeroll', 'shrug'];
        this.idleDurations = { blink: 250, feettap: 1800, eyeroll: 1400, shrug: 1600 };

        // Dialog tree system (AGS Dialog / DialogTopic / DialogOptions)
        this.dialogs = {};           // registered dialog trees { id: DialogTree }
        this.activeDialog = null;    // currently displayed dialog (or null)

        // Depth scaling (AGS WalkableArea.ScalingNear / ScalingFar)
        // Characters scale smaller when further away (near top of walkable area)
        this.depthScaling = null;    // { nearY, farY, nearScale, farScale } or null to disable

        this.setupInput();
        this.applyInterfaceMode();
    }

    createGameDefinition(definition) {
        const victory = definition.victory || {};
        return {
            id: definition.id || 'sierra_tribute',
            title: definition.title || 'ADVENTURE GAME',
            shortTitle: definition.shortTitle || definition.title || 'ADVENTURE GAME',
            subtitle: definition.subtitle || 'A   S I E R R A - S T Y L E   A D V E N T U R E',
            creditsLine: definition.creditsLine || 'A modern tribute to classic adventure games',
            inspirationLine: definition.inspirationLine || '',
            copyright: definition.copyright || '',
            storagePrefix: definition.storagePrefix || definition.id || 'sierra_tribute',
            maxScore: definition.maxScore ?? 100,
            startRoom: definition.startRoom || null,
            startX: definition.startX ?? 320,
            startY: definition.startY ?? 310,
            onStart: definition.onStart || null,
            drawTitleBackdrop: definition.drawTitleBackdrop || null,
            drawPlayerSprite: definition.drawPlayerSprite || null,
            parserSynonyms: definition.parserSynonyms || null,
            classicRewrites: definition.classicRewrites || null,
            flavorResponses: definition.flavorResponses || {},
            sound: definition.sound || null,
            soundFactory: definition.soundFactory || null,
            victory: {
                headline: victory.headline || 'CONGRATULATIONS!',
                subhead: victory.subhead || 'You have completed the adventure!',
                closingLines: victory.closingLines || ['Your story will be told wherever players still save early and often.'],
                ranks: victory.ranks && victory.ranks.length ? victory.ranks : [
                    { min: 0.95, title: 'Legend', flavor: 'That was a proper adventure-game performance.' },
                    { min: 0.80, title: 'Hero', flavor: 'Elegant, efficient, and only occasionally reckless.' },
                    { min: 0.60, title: 'Adventurer', flavor: 'You solved the important parts. Mostly on purpose.' },
                    { min: 0.35, title: 'Explorer', flavor: 'You arrived with questions and left with slightly fewer.' },
                    { min: 0, title: 'Survivor', flavor: 'You won. Technically, that is the best kind of won.' }
                ]
            }
        };
    }

    // ---- Input ----
    getCanvasCoords(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.WIDTH / rect.width;
        const scaleY = this.HEIGHT / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    /** Attach a listener and remember it so destroy() can detach it again.
     *  Listeners on elements the engine itself creates are not tracked: they
     *  are discarded together with their element. */
    _on(target, type, handler, options) {
        if (!target) return;
        target.addEventListener(type, handler, options);
        this._listeners.push({ target, type, handler, options });
    }

    /** Detach every tracked listener and stop the render loop. Required before
     *  replacing one engine instance with another on the same page. */
    destroy() {
        this._loopRunning = false;
        if (this.vr) this.vr.destroy();
        for (const { target, type, handler, options } of this._listeners) {
            target.removeEventListener(type, handler, options);
        }
        this._listeners.length = 0;
        // dispose() also closes the AudioContext; stopAmbient alone leaks one
        // audio graph per replaced engine instance.
        if (this.sound && this.sound.dispose) this.sound.dispose();
        else if (this.sound && this.sound.stopAmbient) this.sound.stopAmbient();
        this.cutscene = null;
        this.sequence = null;
        // Each cached room layer holds a 640x400 backing store; a replaced
        // engine that keeps them alive leaks megabytes.
        this._staticLayers.clear();
        this._lightPoolCache.clear();
        this._vignetteCache.clear();
        if (typeof window !== 'undefined' && window.engine === this) delete window.engine;
    }

    safeStorageGet(key) {
        try {
            return typeof localStorage !== 'undefined' && localStorage ? localStorage.getItem(key) : null;
        } catch {
            return null;
        }
    }

    safeStorageSet(key, val) {
        try {
            if (typeof localStorage !== 'undefined' && localStorage) {
                localStorage.setItem(key, val);
                return true;
            }
        } catch {}
        return false;
    }

    safeStorageRemove(key) {
        try {
            if (typeof localStorage !== 'undefined' && localStorage) {
                localStorage.removeItem(key);
                return true;
            }
        } catch {}
        return false;
    }

    setAction(action) {
        this.currentAction = action;
        this.sound.uiClick();
        this.selectedItem = null;
        this.actionButtons.forEach(b => b.classList.remove('active'));
        const btn = this.actionButtons.find((button) => button.dataset.action === action);
        if (btn) btn.classList.add('active');
        this.updateInventoryUI();
    }

    // ---- Room Management ----
    registerRoom(room) { this.rooms[room.id] = room; }
    registerItem(item) {
        this.items[item.id] = item;
        this.itemDefaults[item.id] = { name: item.name, description: item.description };
    }

    resetItemMetadata() {
        for (const [id, defaults] of Object.entries(this.itemDefaults)) Object.assign(this.items[id], defaults);
    }

    startNewGame() {
        this.titleScreen = false;
        this.setInterfaceMode(this.classicMode ? 'classic' : 'enhanced', true);
        this.announce('Opening sequence started. Press Space or tap the game to advance narration.');
        this.sound.gameStart();
        const startHook = this.onGameStart || this.game.onStart;
        if (startHook) {
            startHook(this);
        } else if (this.game.startRoom) {
            this.goToRoom(this.game.startRoom, this.game.startX, this.game.startY);
        } else {
            console.error('No start room configured for game:', this.game.id);
        }
    }

    goToRoom(roomId, px, py, context = {}) {
        const room = this.rooms[roomId];
        if (!room) { console.error('Room not found:', roomId); return; }
        // Arrival is the death-recovery checkpoint. Restores record their own.
        if (!context.restoring) this.retrySnapshot = this._captureArrival(roomId, px, py);
        const cameFromAnotherRoom = !!this.currentRoomId && this.currentRoomId !== roomId;
        this.roomTransition = 1.0; // Start fade-in
        // Rooms may pick a Sierra transition: 'fade' (default), 'iris' or 'wipe'.
        this.roomTransitionStyle = room.transition || 'fade';
        this.exitCooldown = 500; // Prevent immediate re-exit when spawning near an exit
        this.sound.roomTransition();
        this.sound.stopAmbient(); // Stop ambient from previous room
        this.clearRoomState(); // AGI-inspired: clear per-room state
        this.currentRoomId = roomId;
        if (px !== undefined) this.playerX = px;
        if (py !== undefined) this.playerY = py;
        this.playerWalking = false;
        this.playerTargetX = null;
        this.playerTargetY = null;
        this.playerFacing = 'toward';
        this.pendingAction = null;
        if (room.onEnter) room.onEnter(this, context);
        // Doorways the player arrives on top of stay disarmed until they step clear,
        // so walking forward out of a door cannot bounce straight back through it.
        this.disarmedExits = cameFromAnotherRoom ? this.exitsWithinRearmRange(room) : [];
        this.showMessage(room.description);
    }

    // ---- Inventory ----
    addToInventory(itemId) {
        if (!this.inventory.includes(itemId)) {
            this.inventory.push(itemId);
            this.sound.pickup();
            this.pickupSparkleX = this.playerX;
            this.pickupSparkleY = this.playerY - 18;
            this.pickupSparkleUntil = this.animTimer + 480;
            this.updateInventoryUI();
        }
    }

    removeFromInventory(itemId) {
        this.inventory = this.inventory.filter(i => i !== itemId);
        if (this.selectedItem === itemId) this.selectedItem = null;
        this.updateInventoryUI();
    }

    hasItem(id) { return this.inventory.includes(id); }

    updateInventoryUI() {
        const container = this.dom.inventoryItems;
        container.innerHTML = '';
        this.inventory.forEach(itemId => {
            const item = this.items[itemId];
            if (!item) return;
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'inv-item' + (this.selectedItem === itemId ? ' selected' : '');
            el.textContent = item.name;
            el.setAttribute('aria-pressed', this.selectedItem === itemId ? 'true' : 'false');
            el.addEventListener('click', () => this.handleInventoryClick(itemId));
            container.appendChild(el);
        });
    }

    // ---- Score & Flags ----
    /** Wrapped lines for fixed overlay text. Overlays redraw every frame while
     *  their text never changes, so the measurement is memoised. */
    _wrapLines(text, maxWidth, font) {
        const key = `${font}|${maxWidth}|${text}`;
        const cached = this._wrapCache.get(key);
        if (cached) return cached;
        const measure = this._measureCtx;
        measure.font = font;
        const lines = [];
        let line = '';
        for (const word of String(text).split(' ')) {
            const test = line ? line + ' ' + word : word;
            if (line && measure.measureText(test).width > maxWidth) {
                lines.push(line);
                line = word;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        this._wrapCache.set(key, lines);
        return lines;
    }

    addScore(pts) {
        this.score = Math.min(this.score + pts, this.maxScore);
        this.lastScoreDelta = pts;
        this.scoreFlashUntil = this.animTimer + 1600;
        this.sound.scoreUp();
    }

    setFlag(f, v) { this.flags[f] = (v === undefined) ? true : v; }    getFlag(f) { return this.flags[f] ?? false; }
    /** Numeric counter state. Avoids the `false + 1` coercion getFlag would force. */
    getCounter(f) { const v = this.flags[f]; return typeof v === 'number' ? v : 0; }

    /** Touch devices have no hover, so object discovery needs an explicit toggle. */
    toggleHotspotReveal() {
        if (this.titleScreen || this.dead || this.won) return;
        this.hotspotReveal = !this.hotspotReveal;
        if (this.dom.btnScan) {
            this.dom.btnScan.setAttribute('aria-pressed', String(this.hotspotReveal));
            this.dom.btnScan.textContent = this.hotspotReveal ? 'Objects: ON' : 'Objects';
        }
        this.showMessage(this.hotspotReveal
            ? 'Interactive objects are highlighted. Press F2 or Objects again to hide them.'
            : 'Object highlighting off.');
    }

    // ---- Hint System ----
    // Each room may declare a `hint` string (or function returning a string).
    // Hint use is tracked separately and never changes adventure score.
    showHint() {
        const room = this.rooms[this.currentRoomId];
        if (!room) return;
        const raw = (typeof room.hint === 'function') ? room.hint(this) : room.hint;
        const text = raw || 'No hint available here. Try looking around, talking to anyone present, and combining what you have.';
        const countFlag = `hint_count_${this.currentRoomId}`;
        this.setFlag(countFlag, this.getFlag(countFlag) + 1);
        this.showMessage('HINT: ' + text);
    }

    // ---- Messages ----
    announce(text) {
        if (!this.dom.accessibility || !text) return;
        this.dom.accessibility.textContent = text;
    }

    /** Engine facade handed to hotspot handlers so the narration they emit opens
     *  the Sierra text window, without a transient instance flag. */
    get actionScope() {
        if (!this._actionScope) {
            this._actionScope = new Proxy(this, {
                get: (target, prop) => {
                    if (prop === 'showMessage') {
                        return (text, opts) => target.showMessage(text, { window: true, ...opts });
                    }
                    const value = target[prop];
                    return typeof value === 'function' ? value.bind(target) : value;
                }
            });
        }
        return this._actionScope;
    }

    get minimumWalkY() {
        return this.walkableMinY ?? Math.max(this.horizon, 280);
    }

    // ---- Update Loop ----
    update(dt) {
        const visualTestMode = this.visualTestMode;
        if (!visualTestMode) {
            this.animTimer += dt;
        }

        if (this.dom.saveModal && this.dom.saveModal.classList.contains('open')) return;
        if (this.isTextPromptOpen()) return;

        // Cutscene update
        if (this.cutscene) {
            this.cutscene.elapsed += dt;
            if (this.cutscene.elapsed >= this.cutscene.duration) {
                const onEnd = this.cutscene.onEnd;
                this.cutscene = null;
                this.playerVisible = true;
                onEnd();
            }
            return;
        }

        if (this.dead || this.won || this.titleScreen) return;
        // The save/load modal is a blocking UI: timers and NPCs must not advance
        // behind it, or the desert exposure clock can kill the player mid-save.
        if (this.dom.saveModal && this.dom.saveModal.classList.contains('open')) return;
        if (visualTestMode) {
            // Deterministic capture mode: never let the room-transition fade linger,
            // otherwise loaded rooms render as a full-black overlay frame.
            this.roomTransition = 0;
            return;
        }

        // Decrement exit cooldown unconditionally
        if (this.exitCooldown > 0) this.exitCooldown -= dt;

        // Snapshot the baseline so exits and edges can be tested once per frame
        // after whichever movement branch ran below.
        const preMoveX = this.playerX, preMoveY = this.playerY;
        const preMoveRoom = this.currentRoomId;

        // Arrow key walking
        const arrowLeft = this.keysDown['ArrowLeft'];
        const arrowRight = this.keysDown['ArrowRight'];
        const arrowUp = this.keysDown['ArrowUp'];
        const arrowDown = this.keysDown['ArrowDown'];
        if (!this.sequence && (arrowLeft || arrowRight || arrowUp || arrowDown)) {
            // Cancel any click-walk
            this.playerTargetX = null;
            this.playerTargetY = null;
            this.pendingAction = null;
            this.playerWalking = true;
            // Determine facing (AGI-style: 8 directions mapped to 4 loops)
            if (arrowLeft && arrowUp) { this.playerFacing = 'left'; this.playerDir = -1; }
            else if (arrowRight && arrowUp) { this.playerFacing = 'right'; this.playerDir = 1; }
            else if (arrowLeft && arrowDown) { this.playerFacing = 'left'; this.playerDir = -1; }
            else if (arrowRight && arrowDown) { this.playerFacing = 'right'; this.playerDir = 1; }
            else if (arrowLeft) { this.playerFacing = 'left'; this.playerDir = -1; }
            else if (arrowRight) { this.playerFacing = 'right'; this.playerDir = 1; }
            else if (arrowUp) { this.playerFacing = 'away'; }
            else if (arrowDown) { this.playerFacing = 'toward'; }
            // Move X (AGI-style: check barriers before committing)
            // AGS-inspired: scale walk speed by depth for perspective realism
            const depthSpd = this.depthScaling ? this.getDepthScale(this.playerY) : 1;
            const spd = this.playerSpeed * depthSpd * dt / (1000 / 60);
            // Normalize diagonal movement to prevent ~1.41x speed boost
            const movingX = arrowLeft || arrowRight;
            const movingY = arrowUp || arrowDown;
            const diagFactor = (movingX && movingY) ? Math.SQRT1_2 : 1;
            const startX = this.playerX;
            const startY = this.playerY;
            const yDir = arrowUp ? -1 : 1;
            const minY = this.minimumWalkY;
            const newX = movingX ? Math.max(30, Math.min(610, startX + spd * diagFactor * this.playerDir)) : startX;
            const newY = movingY ? Math.max(minY, Math.min(370, startY + spd * diagFactor * yDir)) : startY;
            if (!this.collidesBarrier(newX, newY)) {
                this.playerX = newX;
                this.playerY = newY;
            } else if (movingX && !this.collidesBarrier(newX, startY)) {
                this.playerX = newX;
            } else if (movingY && !this.collidesBarrier(startX, newY)) {
                this.playerY = newY;
            }
            this.playerFrameTimer += dt * depthSpd;
            if (this.playerFrameTimer > 110) {
                this.playerFrame = (this.playerFrame + 1) % 6;
                this.playerFrameTimer = 0;
                if (this.playerFrame === 0 || this.playerFrame === 3) this.sound.footstep();
            }
        }
        // Click-target walking
        else if (this.playerWalking && (this.playerTargetX !== null || this.playerTargetY !== null)) {
            const dx = this.playerTargetX !== null ? this.playerTargetX - this.playerX : 0;
            const dy = this.playerTargetY !== null ? this.playerTargetY - this.playerY : 0;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // AGS-inspired: scale walk speed by depth for perspective realism
            const depthSpd = this.depthScaling ? this.getDepthScale(this.playerY) : 1;
            const spd = this.playerSpeed * depthSpd * dt / (1000 / 60);
            if (dist <= spd) {
                const targetX = this.playerTargetX ?? this.playerX;
                const targetY = this.playerTargetY ?? this.playerY;
                const blocked = this.collidesBarrier(targetX, targetY);
                if (!blocked) {
                    this.playerX = targetX;
                    this.playerY = targetY;
                } else this.pendingAction = null;
                this.playerWalking = false;
                this.playerTargetX = null;
                this.playerTargetY = null;
                this.playerFacing = 'toward';
                if (this.pendingAction) {
                    const act = this.pendingAction;
                    this.pendingAction = null;
                    act();
                }
            } else {
                // Determine primary direction for facing
                if (Math.abs(dx) >= Math.abs(dy)) {
                    this.playerDir = dx > 0 ? 1 : -1;
                    this.playerFacing = dx > 0 ? 'right' : 'left';
                } else {
                    this.playerFacing = dy < 0 ? 'away' : 'toward';
                }
                // Move proportionally
                const mx = (dx / dist) * spd;
                const my = (dy / dist) * spd;
                const newPX = Math.max(30, Math.min(610, this.playerX + mx));
                const minY = this.minimumWalkY;
                const newPY = Math.max(minY, Math.min(370, this.playerY + my));
                // AGI-inspired: check barriers before committing move
                if (!this.collidesBarrier(newPX, newPY)) {
                    this.playerX = newPX;
                    this.playerY = newPY;
                } else if (!this.collidesBarrier(newPX, this.playerY)) {
                    // Slide along X only (like AGI allowing partial movement)
                    this.playerX = newPX;
                } else if (!this.collidesBarrier(this.playerX, newPY)) {
                    // Slide along Y only
                    this.playerY = newPY;
                } else {
                    // Completely blocked — stop walking (AGI sets BLOCKED flag)
                    this.playerWalking = false;
                    this.playerTargetX = null;
                    this.playerTargetY = null;
                }
                this.playerFrameTimer += dt * depthSpd;
                if (this.playerFrameTimer > 110) {
                    this.playerFrame = (this.playerFrame + 1) % 6;
                    this.playerFrameTimer = 0;
                    if (this.playerFrame === 0 || this.playerFrame === 3) this.sound.footstep();
                }
            }
        } else {
            // No arrow keys and no click-walk target — player is standing still
            this.playerWalking = false;
            this.playerFrame = 0;

            // AGS-inspired: player idle animation (randomized one-shot with pauses)
            this.idleTimer += dt;
            if (this.idleActive) {
                // Currently playing an idle animation — advance it
                this.idleElapsed += dt;
                if (this.idleElapsed >= this.idleDurations[this.idleType]) {
                    // Animation finished — enter random pause before next
                    this.idleActive = false;
                    this.idleType = null;
                    this.idlePauseTimer = 3000 + Math.random() * 5000; // 3-8s pause
                }
            } else if (this.idleTimer >= this.idleDelay) {
                // Idle delay met, but in pause between anims
                if (this.idlePauseTimer > 0) {
                    this.idlePauseTimer -= dt;
                } else {
                    // Pick a random idle animation and start it
                    this.idleActive = true;
                    this.idleType = this.idleTypes[Math.floor(Math.random() * this.idleTypes.length)];
                    this.idleElapsed = 0;
                }
            }
        }

        // One exit/edge test per frame, for arrow keys and click-to-walk alike.
        // Skipped if a handler above already changed room, so a fresh room's
        // exits cannot fire on the same frame the player arrived.
        if (this.currentRoomId === preMoveRoom &&
            (this.playerX !== preMoveX || this.playerY !== preMoveY)) {
            this.checkExitTriggers();
            if (this.currentRoomId === preMoveRoom) this.checkEdgeTransitions();
        }

        // Reset idle timer when player moves (AGS reset_character_idling_time)
        if (this.playerWalking || arrowLeft || arrowRight || arrowUp || arrowDown) {
            this.idleTimer = 0;
            this.idleActive = false;
            this.idleType = null;
            this.idleElapsed = 0;
            this.idlePauseTimer = 0;
        }

        const room = this.rooms[this.currentRoomId];
        if (room && room.onUpdate && this.currentRoomId === preMoveRoom &&
            !this.cutscene && !this.sequence && !this.textWindow && !this.activeDialog &&
            !this.dead && !this.won && !this.titleScreen) {
            room.onUpdate(this, dt);
        }

        // AGI-inspired: update NPCs (motion, cycling, collision)
        for (const npc of this.npcs) {
            npc.update(dt, this);
        }

        // AGI-inspired: advance typewriter reveal, then dismiss timed text windows
        if (this.textWindow) {
            if (this.textWindow.reveal < this.textWindow.revealTotal) {
                this.textWindow.reveal += (dt / 1000) * this.textRevealSpeed;
            }
            if (this.textWindow.duration > 0) {
                this.textWindow.timer += dt;
                if (this.textWindow.timer >= this.textWindow.duration) {
                    this.textWindow = null;
                }
            }
        }
        if (!this.textWindow && this._textQueue.length) this._flushTextQueue();

        // AGS-inspired: advance the active blocking sequence
        if (this.sequence) this._updateSequence(dt);

        // Room transition fade
        if (this.roomTransition > 0) {
            this.roomTransition = Math.max(0, this.roomTransition - dt * 0.002);
        }

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake = Math.max(0, this.screenShake - dt * this.screenShakeDecay);
        }
    }

    // ---- Immersive VR ----
    initVR() {
        if (this.vr || typeof window === 'undefined') return;
        if (window.VRSystem) {
            this.vr = new window.VRSystem(this);
            return;
        }
        this._on(window, 'CrownQuest-vr-ready', () => this.initVR(), { once: true });
    }

    // ---- Game Loop ----
    start() {
        // A second start() would run two rAF loops against one lastTime.
        if (this._loopRunning) return;
        this._loopRunning = true;
        this.initVR();
        this.updateLayoutScale();

        const loop = (timestamp) => {
            if (!this._loopRunning) return;
            try {
                if (!this.vrActive) {
                    const dt = Math.min(timestamp - this.lastTime, 100);
                    this.lastTime = timestamp;
                    this.update(dt);
                    this.render();
                }
            } catch (err) {
                // An unhandled throw used to skip the requestAnimationFrame at
                // the foot of this function, freezing the game on the last good
                // frame with nothing on screen to explain it.
                this.reportCrash(err);
                return;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        this._resumeAfterCrash();
    }

    /** Stop the loop and put a legible failure on screen. The whole game is
     *  procedural drawing, so a single bad branch can throw every frame;
     *  continuing would only repaint the same broken frame forever. */
    reportCrash(err) {
        this._loopRunning = false;
        this.lastError = err;
        console.error(`${this.game.shortTitle}: stopped in room`, this.currentRoomId, err);
        const message = `The game hit an unexpected error in "${this.currentRoomId || 'startup'}".`;
        const recovery = this._crashRecoveryPlan();
        this.announce(`${message} Your saved games are intact. ${recovery.line}`);
        try {
            const ctx = this.ctx;
            ctx.fillStyle = 'rgba(10,7,4,0.92)';
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
            ctx.strokeStyle = PAL.GOLD_SHADOW;
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 110, this.WIDTH - 80, 180);
            ctx.textAlign = 'center';
            ctx.fillStyle = PAL.GOLD_LIT;
            ctx.font = 'bold 20px "Courier New"';
            ctx.fillText('THE TALE BREAKS OFF', this.WIDTH / 2, 152);
            ctx.font = '13px "Courier New"';
            ctx.fillStyle = PAL.WINDOW_PAPER;
            ctx.fillText(message, this.WIDTH / 2, 186);
            ctx.fillText('Your saved games are intact.', this.WIDTH / 2, 210);
            ctx.fillStyle = PAL.TEXT_MUTED;
            ctx.font = '12px "Courier New"';
            ctx.fillText(recovery.line, this.WIDTH / 2, 240);
            ctx.font = '10px "Courier New"';
            ctx.fillText(String(err && err.message ? err.message : err).slice(0, 78), this.WIDTH / 2, 268);
            ctx.textAlign = 'left';
        } catch {
            // The canvas itself is unusable; the announcement above still fired.
        }
        this._armCrashRecovery(recovery.slot);
    }

    /** Install a subsystem's methods. Each lives in js/engine/<system>.js and is
     *  loaded after this file, so the class stays the single owner of state. */
    static extend(methods) {
        const descriptors = Object.getOwnPropertyDescriptors(methods);
        for (const descriptor of Object.values(descriptors)) descriptor.enumerable = false;
        Object.defineProperties(this.prototype, descriptors);
    }
}
