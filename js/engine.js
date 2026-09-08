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
const EXIT_TRIGGER_X = 15, EXIT_TRIGGER_Y = 10;
const EXIT_REARM_X = 70, EXIT_REARM_Y = 55;

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
                this.restart();
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
            if (this.dead || this.won) return;
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
    }

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
    }

    toggleInterfaceMode() {
        this.setInterfaceMode(this.classicMode ? 'enhanced' : 'classic', true);
        this.showMessage(this.classicMode
            ? 'Classic parser interface selected.'
            : 'Enhanced point-and-click interface selected.');
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

    loadInterfacePreference() {
        const saved = this.safeStorageGet(`${this.game.storagePrefix}_interface_mode`);
        if (saved) return saved;
        return window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 'enhanced' : 'classic';
    }

    // === AGS-INSPIRED: TEXT READING SPEED (Game.TextReadingSpeed) ===

    loadTextSpeedPreference() {
        // Capture runs must never animate text, whatever the stored preference.
        if (this._isDeterministicCapture()) return 'instant';
        const saved = this.safeStorageGet(`${this.game.storagePrefix}_text_speed`);
        if (saved && Object.hasOwn(this.textSpeeds, saved)) return saved;
        return this._prefersReducedMotion() ? 'instant' : 'normal';
    }

    setTextSpeed(name, persist) {
        if (!Object.hasOwn(this.textSpeeds, name)) return;
        this.textSpeed = name;
        this.textRevealSpeed = this.textSpeeds[name];
        this.textRevealEnabled = name !== 'instant';
        if (!this.textRevealEnabled) this.completeTextReveal();
        if (persist) this.safeStorageSet(`${this.game.storagePrefix}_text_speed`, name);
        this.updateTextSpeedUI();
    }

    cycleTextSpeed() {
        const order = this.textSpeedOrder;
        const next = order[(order.indexOf(this.textSpeed) + 1) % order.length];
        this.setTextSpeed(next, true);
        this.showMessage(`Text speed: ${next.toUpperCase()}.`);
    }

    updateTextSpeedUI() {
        if (!this.dom || !this.dom.btnTextSpeed) return;
        this.dom.btnTextSpeed.textContent = `Text: ${this.textSpeed.toUpperCase()}`;
        this.dom.btnTextSpeed.title = `Text reading speed: ${this.textSpeed} (F8 to change)`;
    }

    setInterfaceMode(mode, persist) {
        this.classicMode = mode !== 'enhanced';
        if (persist) {
            this.safeStorageSet(`${this.game.storagePrefix}_interface_mode`, this.classicMode ? 'classic' : 'enhanced');
        }
        this.applyInterfaceMode();
    }

    applyInterfaceMode() {
        document.body.classList.toggle('classic-mode', this.classicMode);
        document.body.classList.toggle('enhanced-mode', !this.classicMode);
        document.body.classList.toggle('title-screen', this.titleScreen);
        this.updateLayoutScale();
    }

    updateSoundUI() {
        if (!this.dom.btnMute) return;
        const status = this.sound.getStatus ? this.sound.getStatus() : (this.sound.muted ? 'off' : 'on');
        this.dom.btnMute.textContent = `Sound: ${status.toUpperCase()}`;
        this.dom.btnMute.title = status === 'blocked'
            ? 'Sound is unavailable in this browser'
            : status === 'paused'
                ? 'Sound is paused; activate the page to resume'
                : 'Toggle Sound (M)';
    }

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

    /** Walk-to point that fires an exit when the player walks onto it. */
    exitTriggerPoint(hotspot) {
        return {
            x: hotspot.walkToX !== undefined ? hotspot.walkToX : (hotspot.x + hotspot.w / 2),
            y: hotspot.walkToY !== undefined ? hotspot.walkToY : this.playerY
        };
    }

    isPlayerWithinRearmRange(hotspot) {
        const point = this.exitTriggerPoint(hotspot);
        return Math.abs(this.playerX - point.x) < EXIT_REARM_X &&
            Math.abs(this.playerY - point.y) < EXIT_REARM_Y;
    }

    exitsWithinRearmRange(room) {
        if (!room.hotspots) return [];
        return room.hotspots.filter((hs) => hs.isExit && !hs.hidden && this.isPlayerWithinRearmRange(hs));
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
    }

    showItemCloseUp(item) {
        this.itemCloseUp = item;
        // Always open a fresh window: showTextWindow only reserves room for the
        // art panel while sizing, so dropping the panel onto a stale window
        // paints it over the tail of every line.
        this.showMessage(item.description, { window: true });
        if (item.look) this.runContentHandler(`${item.id} look`, item.look, this.actionScope);
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

    clearAccessibleDialogOptions() {
        if (this.dom.dialogAccessibilityOptions) {
            this.dom.dialogAccessibilityOptions.textContent = '';
        }
    }

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

    showMessage(text, opts = {}) {
        const displayText = this.classicMode ? this.sierraTrim(text) : text;
        this.message = displayText;
        const el = this.dom.messageText;
        el.textContent = displayText;
        this.announce(displayText);
        el.parentElement.scrollTop = el.parentElement.scrollHeight;
        if ((this.classicMode || opts.window === true) &&
            !this.titleScreen && !this.cutscene && !this.dead && !this.won) {
            this.showTextWindow(displayText, {
                color: '#FFFFFF',
                duration: opts.duration || 0,
                // No width override: showTextWindow narrows the wrap itself when
                // a portrait or item panel has to share the window.
                maxWidth: opts.maxWidth,
                portrait: opts.portrait
            });
        }
    }

    /** Classic parser mode trims long enhanced-mode prose down to a terse AGI
     *  line. Games supply the substitutions; the engine only applies them. */
    sierraTrim(text) {
        const rewrites = (this.game && this.game.classicRewrites) || null;
        return (rewrites && Object.hasOwn(rewrites, text)) ? rewrites[text] : text;
    }

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
    }

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
    }

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
    }

    _normalizeSequenceStep(step) {
        if (typeof step === 'function') return { do: step };
        if (typeof step === 'string') return { say: step };
        if (typeof step === 'number') return { wait: step };
        return step || {};
    }

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
    }

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
    }

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
    }

    _snapPlayerTo([x, y]) {
        if (x !== null && x !== undefined) this.playerX = Math.max(30, Math.min(610, x));
        if (y !== null && y !== undefined) this.playerY = Math.max(this.minimumWalkY, Math.min(370, y));
    }

    _endSequence() {
        const seq = this.sequence;
        this.sequence = null;
        this.playerWalking = false;
        this.playerTargetX = null;
        this.playerTargetY = null;
        if (seq && seq.onEnd) seq.onEnd(this);
    }

    /** Trigger screen shake with given intensity (pixels of max offset) */
    shake(intensity) {
        this.screenShake = intensity || 8;
    }

    // ---- Death & Victory ----
    die(msg) {
        this.dead = true;
        this.sound.death();
        this.showMessage(msg + ' \u2014 Press R to restart.');
    }

    victory(msg) {
        this.won = true;
        this.sound.victory();
        this.showMessage(msg);
    }

    restart() {
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

    // ---- Click Handling ----

    /** Activation precedence for a point on the scene, shared by pointer input
     *  and the VR controller ray so immersive play cannot drift from desktop. */
    handleCanvasActivate(x, y) {
        if (this.dead || this.won) return;
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
    }

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
    }

    findHotspot(x, y, room) {
        if (!room.hotspots) return null;
        for (let i = room.hotspots.length - 1; i >= 0; i--) {
            const hs = room.hotspots[i];
            if (hs.hidden) continue;
            if (x >= hs.x && x <= hs.x + hs.w && y >= hs.y && y <= hs.y + hs.h) return hs;
        }
        return null;
    }

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
    }

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
    }

    executeParserCommand(rawCommand) {
        if (this.sequence) return;
        const original = rawCommand.trim();
        const command = this.normalizeParserText(original);
        if (!command) return;

        if (command === 'again' && this.lastCommand) {
            this.executeParserCommand(this.lastCommand);
            return;
        }
        if (['help', 'commands'].includes(command)) {
            this.showMessage('Try LOOK, GET object, USE object ON object, TALK TO person, INVENTORY, HINT, SAVE, RESTORE. F8 sets text speed, F10 toggles enhanced mode.');
            return;
        }
        if (['hint', 'hints', 'clue', 'help me'].includes(command)) {
            this.showHint();
            return;
        }
        if (['enhanced', 'enhanced mode', 'point click', 'point and click'].includes(command)) {
            if (this.classicMode) this.toggleInterfaceMode();
            return;
        }
        if (['classic', 'classic mode', 'parser'].includes(command)) {
            if (!this.classicMode) this.toggleInterfaceMode();
            return;
        }
        if (['inventory', 'inv', 'i'].includes(command)) {
            this.describeInventory();
            return;
        }
        if (['look', 'look room', 'look around', 'l'].includes(command)) {
            const room = this.rooms[this.currentRoomId];
            this.showMessage(room ? room.description : 'You see nothing remarkable.');
            return;
        }
        if (['score', 'status'].includes(command)) {
            this.showMessage(`Your score is ${this.score} of ${this.maxScore}.`);
            return;
        }
        if (['save', 'save game'].includes(command)) {
            this.openSaveModal('save');
            return;
        }
        if (['restore', 'load', 'load game', 'restore game'].includes(command)) {
            this.openSaveModal('load');
            return;
        }

        // Easter egg / classic Sierra actions & sensory verbs
        const firstWord = command.split(' ')[0];
        if (['jump', 'leap'].includes(firstWord)) {
            this.showMessage('You perform an athletic vertical leap. Gravity, unimpressed, returns you promptly.');
            return;
        }
        if (['dance', 'boogie', 'caper'].includes(firstWord)) {
            this.showMessage('You cut a lively galliard. Somewhere, a minstrel quietly retires.');
            return;
        }
        if (['sing', 'chant', 'hum'].includes(firstWord)) {
            this.showMessage(this.game.flavorResponses.sing || 'You sing a stirring verse. Your audience remains unimpressed.');
            return;
        }
        if (['yell', 'scream', 'shout', 'holler'].includes(firstWord)) {
            this.showMessage('You shout. The echo comes back, considers your situation, and offers no advice.');
            return;
        }
        if (['pray', 'worship'].includes(firstWord)) {
            this.showMessage('You murmur a prayer to whatever is listening. A distant bell rings once, which is either an omen or a goat.');
            return;
        }
        if (['swear', 'curse', 'damn', 'shit', 'fuck', 'crap'].includes(firstWord)) {
            this.showMessage('You utter an oath that would curdle milk at forty paces. Nothing improves.');
            return;
        }
        if (['fart', 'burp'].includes(firstWord)) {
            this.showMessage('A sound escapes you. Chivalry weeps.');
            return;
        }
        if (['sleep', 'nap', 'rest'].includes(firstWord)) {
            this.showMessage('There is no time for sleep. The realm is coming apart, and so is your nerve.');
            return;
        }
        if (['scrub', 'sweep', 'mop', 'clean'].includes(firstWord) && !command.includes('with') && !command.includes('on')) {
            this.showMessage(this.game.flavorResponses.clean || 'You consider tidying up. This crisis needs something grander.');
            return;
        }
        if (['swim', 'paddle'].includes(firstWord)) {
            this.showMessage('You paddle your arms enthusiastically. Air remains notoriously difficult to swim through.');
            return;
        }
        if (['die', 'suicide'].includes(firstWord)) {
            this.showMessage('Giving up now would make a very short ballad.');
            return;
        }
        if (['smell', 'sniff'].includes(firstWord)) {
            const restOfCmd = command.slice(firstWord.length).trim();
            if (!restOfCmd || ['room', 'air', 'around', 'here'].includes(restOfCmd)) {
                // Rooms own their own scent line; the engine stays game-agnostic.
                const room = this.rooms[this.currentRoomId];
                this.showMessage((room && room.smell) || 'You smell nothing out of the ordinary.');
                return;
            }
        }
        if (['taste', 'lick'].includes(firstWord)) {
            this.showMessage('Your mother, whoever she was, surely warned you against licking strange things.');
            return;
        }

        const parsed = this.parseVerbPhrase(command);
        if (!parsed) {
            this.showMessage(this.parserConfusion(command));
            return;
        }

        if (!parsed.object) {
            this.showMessage(this.parserNeedsObject(parsed.verb));
            return;
        }

        if (parsed.verb === 'walk') {
            const target = this.findParserHotspot(parsed.object);
            if (target && target.isExit) {
                this.handleClick(target.x + target.w / 2, target.y + target.h / 2);
            } else {
                this.showMessage("You'll have to steer your feet yourself.");
            }
            return;
        }

        if (parsed.verb === 'use' && parsed.instrument && parsed.object) {
            const item = this.findParserItem(parsed.instrument);
            const hotspot = this.findParserHotspot(parsed.object);
            if (!item) {
                this.showMessage("You don't have that.");
                return;
            }
            if (!hotspot) {
                this.showMessage("You don't see that here.");
                return;
            }
            if (hotspot.useItem) this.runContentHandler(`${this.currentRoomId}/${hotspot.name} useItem`, hotspot.useItem, this.actionScope, item.id);
            else {
                const useItemSnarks = [
                    `You attempt to combine ${item.name} with ${hotspot.name}. The natural order offers a stern, polite refusal.`,
                    `Applying ${item.name} to ${hotspot.name} produces no magic, no progress, and no dignity.`,
                    `You wave ${item.name} near ${hotspot.name}. It looks unimpressed.`,
                    `That doesn't seem to do anything except waste daylight you do not have.`
                ];
                const hash = (item.id + (hotspot.name || '')).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
                this.showMessage(useItemSnarks[hash % useItemSnarks.length]);
            }
            return;
        }

        if (parsed.verb === 'use') {
            const item = this.findParserItem(parsed.object);
            if (item) {
                this.selectedItem = item.id;
                this.setAction('use');
                this.selectedItem = item.id;
                this.showMessage(`Use ${item.name} on what?`);
                return;
            }
        }

        const hotspot = this.findParserHotspot(parsed.object);
        if (hotspot) {
            const previousAction = this.currentAction;
            const previousItem = this.selectedItem;
            this.currentAction = parsed.verb;
            this.selectedItem = null;
            this.performAction(hotspot);
            this.currentAction = previousAction;
            this.selectedItem = previousItem;
            return;
        }

        const item = this.findParserItem(parsed.object);
        if (item && parsed.verb === 'look') {
            this.showItemCloseUp(item);
            return;
        }

        this.showMessage(this.parserCantSee(parsed.object));
    }

    parserConfusion(command) {
        const replies = [
            "That sentence would baffle even a vintage parser, and those things once argued with toddlers.",
            "You can't do that. The game checked twice, then looked embarrassed for you.",
            "The parser considers your request, files it under 'bold but unhelpful,' and moves on.",
            "Try a verb the universe currently supports. LOOK, GET, USE, TALK, and WALK are feeling cooperative."
        ];
        const idx = command.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % replies.length;
        return replies[idx];
    }

    parserNeedsObject(verb) {
        const labels = { look: 'look at', get: 'get', use: 'use', talk: 'talk to', walk: 'walk to' };
        return `${labels[verb] || verb} what? Be specific. The parser is old-fashioned, not psychic.`;
    }

    parserCantSee(objectName) {
        return `You don't see any ${objectName} here. If it is invisible, it is also unhelpful.`;
    }

    normalizeParserText(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\b(the|a|an|at|to|with|please)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /** Fold common English plurals so "shelf" matches "shelves", "boxes" matches "box", etc. */
    stemParserWord(word) {
        if (!word || word.length < 4) return word;
        // -ves -> -f (shelves -> shelf, knives -> knife, leaves -> leaf)
        if (word.endsWith('ves')) return word.slice(0, -3) + 'f';
        // -ies -> -y (bodies -> body)
        if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
        // -xes/-ses/-ches/-shes -> drop -es (boxes -> box, dishes -> dish)
        if (word.endsWith('xes') || word.endsWith('ses') || word.endsWith('ches') || word.endsWith('shes')) return word.slice(0, -2);
        // -s -> drop (shelves stays handled above; cards -> card)
        if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
        return word;
    }

    parseVerbPhrase(command) {
        const verbAliases = {
            look: 'look', examine: 'look', inspect: 'look', read: 'look', search: 'look', smell: 'look', listen: 'look', check: 'look', peer: 'look', view: 'look', peek: 'look', scan: 'look',
            get: 'get', take: 'get', grab: 'get', pick: 'get', pickup: 'get', steal: 'get', acquire: 'get', collect: 'get', retrieve: 'get', snag: 'get', pocket: 'get', obtain: 'get',
            talk: 'talk', speak: 'talk', ask: 'talk', chat: 'talk', converse: 'talk', hail: 'talk', greet: 'talk', question: 'talk', interview: 'talk',
            use: 'use', open: 'use', unlock: 'use', pry: 'use', cut: 'use', push: 'use', press: 'use', touch: 'use', drink: 'use', eat: 'use', shoot: 'use', fire: 'use', activate: 'use', apply: 'use', insert: 'use', operate: 'use', turn: 'use', switch: 'use', pull: 'use', flip: 'use',
            go: 'walk', walk: 'walk', enter: 'walk', run: 'walk', step: 'walk', move: 'walk', climb: 'walk', travel: 'walk', head: 'walk'
        };
        const words = command.split(' ');
        let verb = verbAliases[words[0]];
        if (!verb && words[0] === 'pick' && words[1] === 'up') {
            verb = 'get';
            words.splice(1, 1);
        }
        if (!verb) return null;

        const rest = words.slice(1).join(' ').trim();
        if (!rest) return { verb, object: '' };

        if (verb === 'use' && rest.includes(' on ')) {
            const [instrument, object] = rest.split(/\s+on\s+/, 2);
            return { verb, instrument: instrument.trim(), object: object.trim() };
        }
        return { verb, object: rest };
    }

    findParserHotspot(name) {
        const room = this.rooms[this.currentRoomId];
        if (!room || !room.hotspots || !name) return null;
        const target = this.normalizeParserText(name);
        let best = null;
        let bestScore = 0;
        for (let i = room.hotspots.length - 1; i >= 0; i--) {
            const hs = room.hotspots[i];
            if (hs.hidden) continue;
            const hsName = this.normalizeParserText(hs.name || '');
            const desc = this.normalizeParserText(hs.description || '');
            const score = this.parserMatchScore(target, hsName, desc);
            if (score > bestScore) {
                best = hs;
                bestScore = score;
            }
        }
        return bestScore > 0 ? best : null;
    }

    findParserItem(name) {
        const target = this.normalizeParserText(name);
        for (const id of this.inventory) {
            const item = this.items[id];
            if (!item) continue;
            const itemName = this.normalizeParserText(item.name || id);
            const score = this.parserMatchScore(target, itemName, id.replace(/_/g, ' '));
            if (score > 0) return { id, ...item };
        }
        return null;
    }

    parserMatchScore(target, name, description) {
        if (!target) return 0;
        if (name === target) return 100;
        if (name.includes(target) || target.includes(name)) return 80;
        // Match compact (no-space) typings like "notebook" to "note book",
        // "gingerbread" → "ginger bread".
        const compactName = name.replace(/\s+/g, '');
        const compactTarget = target.replace(/\s+/g, '');
        if (compactName && compactTarget && (compactName === compactTarget ||
            compactName.includes(compactTarget) || compactTarget.includes(compactName))) {
            return 75;
        }
        const targetWords = target.split(' ').filter(Boolean);
        const haystack = `${name} ${description || ''}`;
        const haystackWords = haystack.split(/\s+/).filter(Boolean);
        const stemmedHaystack = haystackWords.map(w => this.stemParserWord(w));
        let hits = 0;
        for (const word of targetWords) {
            if (word.length <= 1) continue;
            if (haystack.includes(word)) { hits++; continue; }
            const stem = this.stemParserWord(word);
            if (stem !== word && (haystack.includes(stem) || stemmedHaystack.includes(stem))) { hits++; continue; }
            if (stemmedHaystack.includes(word)) { hits++; continue; }
            // Synonyms (e.g., "tome" → "spell book", "gate" → "portcullis")
            const syns = this.parserSynonyms(word);
            let synHit = false;
            for (const syn of syns) {
                if (haystack.includes(syn)) { synHit = true; break; }
            }
            if (synHit) { hits++; continue; }
        }
        return hits === targetWords.length ? 50 + hits : 0;
    }

    /** Map common player synonyms to words that may appear in hotspot
     *  names/descriptions. The base map is genre-neutral; games extend it via
     *  the `parserSynonyms` entry of the game definition. */
    parserSynonyms(word) {
        const map = {
            light: ['lamp', 'torch', 'lantern', 'candle'],
            lamp: ['light', 'torch', 'lantern'],
            person: ['man', 'woman', 'figure', 'stranger'],
            man: ['person', 'figure', 'stranger'],
            woman: ['person', 'figure', 'lady'],
            corpse: ['body', 'remains'],
            body: ['corpse', 'remains'],
            window: ['view', 'glass', 'casement'],
            book: ['tome', 'volume', 'grimoire', 'ledger'],
            door: ['doorway', 'gate', 'hatch'],
            floor: ['ground', 'flagstones'],
            wall: ['stonework', 'masonry']
        };
        const extra = (this.game && this.game.parserSynonyms) || {};
        const base = Object.hasOwn(map, word) ? map[word] : [];
        const added = Object.hasOwn(extra, word) ? extra[word] : [];
        return base.concat(added);
    }

    describeInventory() {
        if (!this.inventory.length) {
            this.showMessage('You are carrying nothing.');
            return;
        }
        const names = this.inventory.map(id => this.items[id]?.name || id).join(', ');
        this.showMessage(`You are carrying: ${names}.`);
    }

    // === AGI-INSPIRED: PRIORITY/DEPTH SYSTEM (OBJLIST) ===

    /** Register a foreground draw layer (drawn after player if y > player y).
     *  Like AGI's y-sorted object list, lower Y = behind, higher Y = in front. */
    addForegroundLayer(y, drawFn) {
        this.foregroundLayers.push({ y, draw: drawFn });
    }

    clearForegroundLayers() {
        this.foregroundLayers = [];
    }

    // === AGI-INSPIRED: WALKABLE AREA BARRIERS (CONTROL LINES) ===

    /** Add a rectangular barrier the player cannot walk through.
     *  Like AGI priority 0 (unconditional block) control lines. */
    addBarrier(x, y, w, h, enabled = null) {
        const barrier = { x, y, w, h };
        if (enabled) barrier.enabled = enabled;
        this.barriers.push(barrier);
    }

    clearBarriers() {
        this.barriers = [];
    }

    /** Limit the player's baseline to a room-defined floor shape. */
    setWalkableArea(containsPoint, minY = null) {
        this.walkableArea = containsPoint;
        this.walkableMinY = minY;
    }

    get minimumWalkY() {
        return this.walkableMinY ?? Math.max(this.horizon, 280);
    }

    /** Declare a surface props stand on. `yAt` is a number for a flat top, or a
     *  function of x for one that slopes toward the vanishing point. */
    addSurface(id, x0, x1, yAt) {
        this.surfaces[id] = { x0, x1, yAt };
    }

    /** Top of a declared surface at a given x. Props MUST take their base from
     *  this rather than a hand-written constant: a base that does not come from
     *  the surface underneath is how a prop ends up floating above it. */
    surfaceY(id, x) {
        const s = Object.hasOwn(this.surfaces, id) ? this.surfaces[id] : null;
        if (!s) return null;
        return typeof s.yAt === 'function' ? s.yAt(x) : s.yAt;
    }

    /** Place a prop: returns the surface height at `x` and records the contact
     *  so the F9 overlay and the grounding test can both see it. */
    standOn(id, x) {
        const y = this.surfaceY(id, x);
        if (y === null) return null;
        this._propBases.push({ surface: id, x, y });
        return y;
    }

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
    }

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
    }

    setEdgeTransition(edge, callback) {
        // edge: 'left', 'right', 'top', 'bottom'
        this.edgeTransitions[edge] = callback;
    }

    clearEdgeTransitions() {
        this.edgeTransitions = { left: null, right: null, top: null, bottom: null };
    }

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
    }

    // === AGI-INSPIRED: SIERRA TEXT WINDOW (PRINT/TEXTWIN) ===

    /** Show a Sierra-style text window on the canvas (like AGI's Print/Display).
     *  Classic blue box with white border and yellow text. */
    showTextWindow(text, opts) {
        opts = opts || {};
        const ctx = this._measureCtx;
        ctx.font = '13px "Courier New"';

        const portraitId = opts.portrait || (this.activeDialog && this.activeDialog.phase !== 'options' ? this.activeDialog.dialogId : null);
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
            color: opts.color || PAL.TEXT_ACCENT,
            bgColor: opts.bgColor || PAL.WINDOW_BLUE,
            // Typewriter state: number of characters currently revealed.
            reveal: this.textRevealEnabled ? 0 : Infinity,
            revealTotal: lines.reduce((n, l) => n + l.length, 0)
        };
        this.announce(text);
    }

    /** True when the platform reports a reduced-motion accessibility preference. */
    _prefersReducedMotion() {
        try {
            return typeof window !== 'undefined' &&
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    }

    /** True in the deterministic screenshot-capture run, where animation is frozen. */
    _isDeterministicCapture() {
        try {
            return new URLSearchParams(window.location.search).has('visual-test');
        } catch (e) {
            return false;
        }
    }

    /** True once every character of the active text window has been drawn. */
    isTextFullyRevealed() {
        const tw = this.textWindow;
        return !tw || tw.reveal >= tw.revealTotal;
    }

    /** Snap the typewriter to the end of the current text window. */
    completeTextReveal() {
        if (this.textWindow) this.textWindow.reveal = Infinity;
    }

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
    }

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
    }

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
    }

    /** Enhanced mode may act on the dismissing input, but never while the
     *  typewriter is still revealing text or a conversation is in progress. */
    canChainAfterDismiss() {
        return !this.classicMode && !this.activeDialog && this.isTextFullyRevealed();
    }

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
    }

    // === AGI-INSPIRED: ANIMATED NPC OBJECTS (ANIOBJ SYSTEM) ===

    /** Register an NPC with AGI-style properties.
     *  Like AGI's ANIOBJ struct with motion, cycling, priority. */
    addNPC(npcDef) {
        const npc = new AnimatedNPC(npcDef, this);
        this.npcs.push(npc);
        return npc;
    }

    removeNPC(id) {
        this.npcs = this.npcs.filter(n => n.id !== id);
    }

    clearNPCs() {
        this.npcs = [];
    }

    getNPC(id) {
        return this.npcs.find(n => n.id === id) || null;
    }

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
    }

    // === AGS-INSPIRED: DEPTH SCALING (WalkableArea.ScalingNear/Far) ===

    /** Set up perspective depth scaling for the current room.
     *  Characters at nearY get nearScale, at farY get farScale, linearly interpolated.
     *  e.g. setDepthScaling(280, 370, 0.7, 1.0) — smaller at top, full size at bottom */
    setDepthScaling(farY, nearY, farScale, nearScale) {
        this.depthScaling = { farY, nearY, farScale, nearScale };
    }

    /** Declare the room's dominant light so cast shadows lean away from it.
     *  strength 0 keeps the old symmetric puddle; 1 gives a full-length cast. */
    setSceneLight(x, y, strength) {
        this.sceneLight = { x, y, strength: strength == null ? 0.6 : strength };
    }

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
    }

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
    }

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
    }

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
    }

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
    }

    /** Called when text window is dismissed during active dialog. */
    runDialogAction(action) {
        const dialog = this.activeDialog;
        this.runContentHandler(`${dialog.dialogId} dialogue action`, action, this.actionScope);
        if (!this.lastContentError) return true;
        delete this.dialogs[dialog.dialogId].chosenOptions[dialog.choiceKey];
        this.activeDialog = null;
        this.clearAccessibleDialogOptions();
        return false;
    }

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
            if (ad.pendingAction && !this.runDialogAction(ad.pendingAction)) return true;

            if (ad.pendingEnd) {
                this.activeDialog = null;
                this.textWindow = null;
            } else if (ad.pendingNextTopic) {
                this.startDialog(ad.dialogId, ad.pendingNextTopic);
            } else {
                this._showDialogOptions();
            }
            return true;
        }

        return false;
    }

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
    }

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

    // ---- Update Loop ----
    update(dt) {
        const visualTestMode = this.visualTestMode;
        if (!visualTestMode) {
            this.animTimer += dt;
        }

        if (this.dom.saveModal && this.dom.saveModal.classList.contains('open')) return;

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

    /** Queue a closed-caption for a sound the player cannot hear. */
    showSoundCaption(label) {
        if (!label) return;
        this.soundCaption = { text: `\u266a ${label}`, until: this.animTimer + 1800 };
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

    getTitleButtonRect(mode) {
        const y = this.HEIGHT - 60;
        return mode === 'classic'
            ? { x: 132, y, w: 176, h: 24 }
            : { x: 332, y, w: 176, h: 24 };
    }

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
    }

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
    }

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
    }

    pointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

    /** Snapped sprite scale for the ego at a given floor Y. Shared with the
     *  cutscene mini-animations so gameplay and cutscenes stay the same size. */
    playerSpriteScale(y) {
        let s = (1.85 + (y - 280) / 90 * 0.3) * PLAYER_SPRITE_SCALE;
        if (this.depthScaling) s *= this.getDepthScale(y);
        return Math.round(s * 20) / 20;
    }

    /** Front-facing ego cel. Shared by the in-room sprite and every cutscene
     *  mini-animation so the character can never drift between them.
     *  o: { leftLeg, rightLeg, leftBoot, rightBoot, idleFootTap, idleHeadOfs,
    *      shrugPhase, as, armAngle, drawLegs, drawArms } — all optional. */
    drawEgoFront(ctx0, x, y, s, o) {
        // The remap belongs to the cel, not to the caller: cutscenes call this
        // directly, and without it Rowan turns up to his own coronation in the
        // greyscale under-painting instead of his forest tunic.
        const ctx = this._suitCtx(ctx0);
        o = o || {};
        const leftLeg = o.leftLeg || 0, rightLeg = o.rightLeg || 0;
        const leftBoot = o.leftBoot == null ? leftLeg : o.leftBoot;
        const rightBoot = o.rightBoot == null ? rightLeg : o.rightBoot;
        const idleFootTap = o.idleFootTap || 0;
        const idleHeadOfs = o.idleHeadOfs || 0;
        const as = o.as || 0;
        // Cutscene poses raise the arms; the shrug cel doubles as the raised pose.
        const armAngle = o.armAngle || 0;
        const shrugPhase = o.shrugPhase != null ? o.shrugPhase : (armAngle >= 0.7 ? 1 : 0);
        const armOut = armAngle >= 0.25 && armAngle < 0.7 ? Math.round(1.4 * s) : 0;
        const P = PAL.PLAYER;
        // SCI/VGA-era proportions (King's Quest V-VI era): a ~5.5-head figure
        // with a small head, long legs and three tones per material.
        if (o.drawLegs) {
            o.drawLegs(ctx, x, y, s);
        } else {
            // Hose — thigh tapers into calf, dark seam between them
            ctx.fillStyle = P.hose;
            ctx.fillRect(x - 3.6 * s, y - 3 * s, 3.2 * s, 12 * s + leftLeg);
            ctx.fillRect(x + 0.4 * s, y - 3 * s, 3.2 * s, 12 * s + rightLeg);
            ctx.fillStyle = P.hoseHi;
            ctx.fillRect(x - 3.2 * s, y - 2 * s, 1 * s, 10 * s + leftLeg);
            ctx.fillRect(x + 0.8 * s, y - 2 * s, 1 * s, 10 * s + rightLeg);
            ctx.fillStyle = P.hoseLo;
            ctx.fillRect(x - 0.6 * s, y - 3 * s, 1 * s, 12 * s);
            // Cross-gartering: two leather thongs wound over each shin.
            ctx.fillStyle = P.pouchStrap;
            ctx.fillRect(x - 3.6 * s, y + 2.6 * s + leftLeg, 3.2 * s, 0.6 * s);
            ctx.fillRect(x + 0.4 * s, y + 2.6 * s + rightLeg, 3.2 * s, 0.6 * s);
            // Tall travelling boots, cuffed at the calf
            const boot = (bx, bo, tap) => {
                ctx.fillStyle = P.bootDeep;
                ctx.fillRect(bx - 0.2 * s, y + 4.6 * s + bo, 4.3 * s, 7.4 * s);
                ctx.fillStyle = P.boot;
                ctx.fillRect(bx, y + 5 * s + bo, 3.9 * s, 7 * s);
                ctx.fillStyle = P.bootHi;
                ctx.fillRect(bx + 0.3 * s, y + 5.2 * s + bo, 1.1 * s, 6.2 * s);
                ctx.fillStyle = P.bootDeep;
                ctx.fillRect(bx, y + 5 * s + bo, 3.9 * s, 0.9 * s);
                ctx.fillStyle = P.bootHi;
                ctx.fillRect(bx + 0.3 * s, y + 5.1 * s + bo, 3.3 * s, 0.4 * s);
                if (tap) return;
                ctx.fillStyle = P.bootDeep;
                ctx.fillRect(bx - 0.3 * s, y + 11 * s + bo, 4.4 * s, 1 * s);
            };
            boot(x - 4.1 * s, leftBoot, false);
            // Right boot — heel fixed, toe rotates up for the impatient foot tap
            {
                const heelX = x + 0.2 * s;
                const toeRise = idleFootTap > 0 ? idleFootTap : (rightBoot - rightLeg);
                boot(heelX, rightLeg, true);
                ctx.save();
                ctx.transform(1, 0, -toeRise / (2 * s), 1, heelX + 2 * s, y + 9 * s + rightLeg);
                ctx.fillStyle = P.bootDeep;
                ctx.fillRect(-0.3 * s, 2 * s, 2.3 * s, 1 * s);
                ctx.restore();
                ctx.fillStyle = P.bootDeep;
                ctx.fillRect(heelX - 0.3 * s, y + 11 * s + rightLeg, 2.3 * s, 1 * s);
            }
        }
        // Tunic — reaches below the belt as a short skirt, which is what makes
        // the silhouette read as fantasy rather than uniform.
        ctx.fillStyle = '#DDDDDD';
        ctx.fillRect(x - 4 * s, y - 15 * s, 8 * s, 12 * s);
        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(x - 4.6 * s, y - 4.2 * s, 9.2 * s, 5.4 * s);
        // Chest highlight and flank shadow give a rounded, lit body.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 3.4 * s, y - 14.4 * s, 2.6 * s, 10.8 * s);
        ctx.fillStyle = '#AAAAAA';
        ctx.fillRect(x + 2 * s, y - 15 * s, 2 * s, 12 * s);
        ctx.fillRect(x + 2.2 * s, y - 4.2 * s, 2.4 * s, 5.4 * s);
        // Dark edge columns read as a Sierra sprite outline and keep the ego
        // legible against both bright meadow and dark tower stone.
        ctx.fillStyle = P.tunicOutline;
        ctx.fillRect(x - 4 * s, y - 15 * s, 0.8 * s, 12 * s);
        ctx.fillRect(x + 3.2 * s, y - 15 * s, 0.8 * s, 12 * s);
        ctx.fillRect(x - 4.6 * s, y - 4.2 * s, 0.8 * s, 5.4 * s);
        ctx.fillRect(x + 3.8 * s, y - 4.2 * s, 0.8 * s, 5.4 * s);
        ctx.fillRect(x - 4.6 * s, y + 0.5 * s, 9.2 * s, 0.7 * s);
        // Hem embroidery — the one saturated accent on the costume.
        ctx.fillStyle = P.trim;
        ctx.fillRect(x - 3.8 * s, y - 0.4 * s, 7.6 * s, 0.9 * s);
        ctx.fillStyle = P.trimShadow;
        ctx.fillRect(x - 3.8 * s, y + 0.2 * s, 7.6 * s, 0.4 * s);
        // Sloped shoulders, the right one dropped from years of carrying water.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 3.4 * s, y - 15.8 * s, 3 * s, 1 * s);
        ctx.fillRect(x + 0.4 * s, y - 15.4 * s, 3 * s, 1 * s);
        ctx.fillStyle = P.tunicOutline;
        ctx.fillRect(x - 3.4 * s, y - 16.4 * s, 3 * s, 0.7 * s);
        ctx.fillRect(x + 0.4 * s, y - 16 * s, 3 * s, 0.7 * s);
        // Laced collar
        ctx.fillStyle = P.trim;
        ctx.fillRect(x - 2.6 * s, y - 15.8 * s, 5.2 * s, 1.2 * s);
        ctx.fillStyle = P.trimShadow;
        ctx.fillRect(x - 2.6 * s, y - 14.8 * s, 5.2 * s, 0.4 * s);
        ctx.fillStyle = P.tunicOutline;
        ctx.fillRect(x - 0.4 * s, y - 15.6 * s, 0.8 * s, 2.6 * s);
        // Belt, brass buckle and the pouch he keeps everything in
        ctx.fillStyle = P.belt;
        ctx.fillRect(x - 4.2 * s, y - 4.6 * s, 8.4 * s, 1.9 * s);
        ctx.fillStyle = P.buckle;
        ctx.fillRect(x - 1.2 * s, y - 4.5 * s, 2.4 * s, 1.7 * s);
        ctx.fillStyle = P.emblemDark;
        ctx.fillRect(x - 0.5 * s, y - 4.1 * s, 1 * s, 1 * s);
        ctx.fillStyle = P.pouchStrap;
        ctx.fillRect(x - 5.6 * s, y - 4.8 * s, 2.2 * s, 3.6 * s);
        ctx.fillStyle = P.pouch;
        ctx.fillRect(x - 5.3 * s, y - 4.2 * s, 1.7 * s, 2.8 * s);
        ctx.fillStyle = P.buckle;
        ctx.fillRect(x - 5.3 * s, y - 4.2 * s, 1.7 * s, 0.5 * s);
        // A stag device stitched at the breast: the crest of Alderhaven.
        ctx.fillStyle = P.emblem;
        ctx.fillRect(x + 0.9 * s, y - 13.2 * s, 2.3 * s, 2.3 * s);
        ctx.fillStyle = P.emblemDark;
        ctx.fillRect(x + 1.4 * s, y - 12.7 * s, 1.3 * s, 1.3 * s);
        ctx.fillRect(x + 1 * s, y - 13.6 * s, 0.5 * s, 0.6 * s);
        ctx.fillRect(x + 2.6 * s, y - 13.6 * s, 0.5 * s, 0.6 * s);
        // Arms. During his signature shrug they unfold in stepped cels,
        // ending in bare, palms-up hands.
        if (o.drawArms) {
            o.drawArms(ctx, x, y, s);
        } else if (shrugPhase > 0.35) {
            ctx.fillStyle = '#DDDDDD';
            ctx.fillRect(x - 5.8 * s, y - 14.6 * s, 1.8 * s, 5 * s);
            ctx.fillRect(x + 4 * s, y - 14.2 * s, 1.8 * s, 5 * s);
            ctx.fillStyle = P.skin;
            ctx.fillRect(x - 9 * s, y - 10.6 * s, 3.4 * s, 1.8 * s);
            ctx.fillRect(x + 5.6 * s, y - 10.2 * s, 3.4 * s, 1.8 * s);
            ctx.fillRect(x - 11 * s, y - 11.2 * s, 2.2 * s, 2 * s);
            ctx.fillRect(x + 8.8 * s, y - 10.8 * s, 2.2 * s, 2 * s);
            ctx.fillStyle = P.skinDeep;
            ctx.fillRect(x - 11 * s, y - 9.6 * s, 2.2 * s, 0.6 * s);
            ctx.fillRect(x + 8.8 * s, y - 9.2 * s, 2.2 * s, 0.6 * s);
        } else {
            // Short sleeve to the elbow, bare forearm below — outlined against
            // the torso so the limb never merges into the tunic.
            ctx.fillStyle = P.tunicOutline;
            ctx.fillRect(x - 6 * s, y - 14.8 * s, 2.2 * s, 10.8 * s);
            ctx.fillRect(x + 3.8 * s, y - 14.4 * s, 2.2 * s, 10.4 * s);
            ctx.fillStyle = P.skinShadow;
            ctx.fillRect(x - 5.8 * s, y - 14.6 * s, 1.8 * s, 10.4 * s);
            ctx.fillRect(x + 4 * s, y - 14.2 * s, 1.8 * s, 10 * s);
            ctx.fillStyle = P.skin;
            ctx.fillRect(x - 5.8 * s, y - 14.6 * s, 0.9 * s, 10.4 * s);
            ctx.fillRect(x + 4 * s, y - 14.2 * s, 0.9 * s, 10 * s);
            ctx.fillStyle = '#DDDDDD';
            ctx.fillRect(x - 5.8 * s, y - 14.6 * s, 1.8 * s, 5.4 * s);
            ctx.fillRect(x + 4 * s, y - 14.2 * s, 1.8 * s, 5.4 * s);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x - 5.8 * s, y - 14.6 * s, 0.7 * s, 5.4 * s);
            ctx.fillRect(x + 5.1 * s, y - 14.2 * s, 0.7 * s, 5.4 * s);
            ctx.fillStyle = P.trim;
            ctx.fillRect(x - 5.9 * s, y - 9.4 * s, 2 * s, 0.7 * s);
            ctx.fillRect(x + 3.9 * s, y - 9 * s, 2 * s, 0.7 * s);
            ctx.fillStyle = P.skin;
            ctx.fillRect(x - 5.9 * s + as - armOut, y - 4.1 * s, 2 * s, 2.4 * s);
            ctx.fillRect(x + 3.9 * s - as + armOut, y - 3.7 * s, 2 * s, 2.4 * s);
            ctx.fillStyle = P.skinDeep;
            ctx.fillRect(x - 5.9 * s + as - armOut, y - 2.2 * s, 2 * s, 0.7 * s);
            ctx.fillRect(x + 3.9 * s - as + armOut, y - 1.8 * s, 2 * s, 0.7 * s);
        }
        // Neck
        ctx.fillStyle = P.skinShadow;
        ctx.fillRect(x - 1.1 * s, y - 17 * s, 2.2 * s, 1.6 * s);
        // Head: a small VGA-scale skull with stepped cheeks and a soft jaw.
        ctx.fillStyle = P.skin;
        ctx.fillRect(x - 2 * s, y - 22.6 * s, 4 * s, 0.8 * s);
        ctx.fillRect(x - 2.5 * s, y - 21.8 * s, 5 * s, 3.6 * s);
        ctx.fillRect(x - 2 * s, y - 18.2 * s, 4 * s, 1.2 * s);
        ctx.fillStyle = P.skinShadow;
        ctx.fillRect(x - 2 * s, y - 17.2 * s, 4 * s, 0.8 * s);
        ctx.fillRect(x - 2.5 * s, y - 20.2 * s, 0.8 * s, 1.8 * s);
        ctx.fillStyle = '#FFE0B0';
        ctx.fillRect(x - 1.6 * s, y - 21.6 * s, 1.6 * s, 1 * s);
        // Sandy hair spilling out from under the cap.
        ctx.fillStyle = P.hair;
        ctx.fillRect(x - 2.5 * s, y - 22.6 * s, 5 * s, 1.2 * s);
        ctx.fillRect(x - 2.9 * s, y - 21.8 * s, 0.9 * s, 3 * s);
        ctx.fillRect(x + 2 * s, y - 21.8 * s, 0.9 * s, 3 * s);
        ctx.fillStyle = P.hairDark;
        ctx.fillRect(x - 2.9 * s, y - 20 * s, 0.9 * s, 1.2 * s);
        ctx.fillRect(x + 2 * s, y - 20 * s, 0.9 * s, 1.2 * s);
        ctx.fillStyle = P.hairHighlight;
        ctx.fillRect(x - 1.6 * s, y - 22.5 * s, 2.4 * s, 0.6 * s);
        // The red travelling cap with its single white feather is the whole
        // silhouette; without it he is just a boy in green.
        ctx.fillStyle = P.capLo;
        ctx.fillRect(x - 3.2 * s, y - 24.2 * s, 6.4 * s, 1.8 * s);
        ctx.fillStyle = P.cap;
        ctx.fillRect(x - 2.7 * s, y - 25.8 * s, 5.4 * s, 1.8 * s);
        ctx.fillRect(x - 3.2 * s, y - 24.4 * s, 6.4 * s, 1.5 * s);
        ctx.fillStyle = P.capHi;
        ctx.fillRect(x - 2.3 * s, y - 25.6 * s, 2 * s, 1.4 * s);
        ctx.fillRect(x - 3 * s, y - 24.3 * s, 3.4 * s, 0.6 * s);
        ctx.fillStyle = P.capLo;
        ctx.fillRect(x + 1.6 * s, y - 25.6 * s, 1.1 * s, 3.1 * s);
        ctx.fillStyle = P.feather;
        ctx.fillRect(x + 2.6 * s, y - 28.6 * s, 0.8 * s, 3.4 * s);
        ctx.fillRect(x + 3.2 * s, y - 29.4 * s, 0.8 * s, 1.6 * s);
        ctx.fillStyle = P.featherShadow;
        ctx.fillRect(x + 3.2 * s, y - 27.4 * s, 0.6 * s, 1.6 * s);
        // Expressive brows tilt upward at the centre: worried but game.
        ctx.fillStyle = P.brow;
        ctx.fillRect(x - 1.9 * s, y - 21.1 * s, 1.4 * s, 0.5 * s);
        ctx.fillRect(x + 0.5 * s, y - 21.1 * s, 1.4 * s, 0.5 * s);
        // Eyes: small VGA eyes — a lash line, a sliver of white, a pupil.
        ctx.fillStyle = P.eyeWhite;
        ctx.fillRect(x - 1.9 * s, y - 20.3 * s, 1.4 * s, 1.2 * s);
        ctx.fillRect(x + 0.5 * s, y - 20.3 * s, 1.4 * s, 1.2 * s);
        ctx.fillStyle = P.iris;
        ctx.fillRect(x - 1.5 * s + idleHeadOfs * 0.5, y - 20.2 * s, 0.8 * s, 1.1 * s);
        ctx.fillRect(x + 0.7 * s + idleHeadOfs * 0.5, y - 20.2 * s, 0.8 * s, 1.1 * s);
        ctx.fillStyle = '#2A2018';
        ctx.fillRect(x - 1.9 * s, y - 20.4 * s, 1.4 * s, 0.3 * s);
        ctx.fillRect(x + 0.5 * s, y - 20.4 * s, 1.4 * s, 0.3 * s);
        // Nose, freckles and crooked half-smile add personality at rest.
        ctx.fillStyle = P.skinShadow;
        ctx.fillRect(x - 0.4 * s, y - 19.6 * s, 0.8 * s, 1.4 * s);
        ctx.fillStyle = P.hair;
        ctx.fillRect(x - 1.8 * s, y - 18.8 * s, 0.5 * s, 0.5 * s);
        ctx.fillRect(x + 1.3 * s, y - 18.8 * s, 0.5 * s, 0.5 * s);
        ctx.fillStyle = P.smile;
        ctx.fillRect(x - 1.1 * s, y - 18 * s, 2.2 * s, 0.5 * s);
        ctx.fillRect(x + 0.8 * s, y - 18.4 * s, 0.8 * s, 0.5 * s);
        if (shrugPhase > 0.35) {
            // The smile collapses into a tiny "who, me?" mouth.
            ctx.fillStyle = P.skin;
            ctx.fillRect(x - 1.5 * s, y - 18.4 * s, 3 * s, 1.2 * s);
            ctx.fillStyle = P.smile;
            ctx.fillRect(x - 0.4 * s, y - 18 * s, 0.8 * s, 0.8 * s);
        }
    }

    drawPlayer(ctx0) {
        const ctx = this._suitCtx(this._pixelCtx(ctx0));
        const x = Math.round(this.playerX);
        const y = Math.round(this.playerY);
        const dir = this.playerDir;
        const facing = this.playerFacing;
        const walking = this.playerWalking;
        const frame = this.playerFrame;
        // Perspective scale: smaller when further away (low Y)
        const s = this.playerSpriteScale(y);

        // Contact shadow — grounds the sprite on the floor plane so it does not appear to float.
        this.drawContactShadow(ctx, x, y + 12 * s, s);

        if (this.game.drawPlayerSprite) {
            ctx0.save();
            let drawn;
            try {
                drawn = this.game.drawPlayerSprite(ctx0, this);
            } finally {
                ctx0.restore();
            }
            if (drawn) return;
        }

        // Idle animation effects (blink, feettap, eyeroll)
        const idleType = this.idleActive ? this.idleType : null;
        const idleT = this.idleElapsed || 0; // ms into current idle

        // Eye-roll: pupils shift left-then-right-then-center over duration
        let idleHeadOfs = 0;
        if (idleType === 'eyeroll') {
            const p = idleT / this.idleDurations.eyeroll; // 0..1
            if (p < 0.3) idleHeadOfs = Math.round(-1.5 * s);       // look left
            else if (p < 0.6) idleHeadOfs = Math.round(1.5 * s);   // look right
            else idleHeadOfs = 0;                                   // center
        }

        // Foot tap: discrete 2-frame tap — right foot only (impatient)
        let idleFootTap = 0;
        if (idleType === 'feettap') {
            const tapFrame = Math.floor(idleT / 200) % 2; // alternates every 200ms
            idleFootTap = tapFrame === 0 ? 2 * s : 0;
        }

        // Every so often Rowan checks whether anyone else has a plan. Nobody
        // does. The held middle cel gives him a sheepish, palms-up shrug.
        const shrugPhase = idleType === 'shrug'
            ? Math.sin(Math.min(1, idleT / this.idleDurations.shrug) * Math.PI)
            : 0;

        // Blink: eyes close for the duration (drawn later as overlay)

        const frameProgress = walking ? Math.min(this.playerFrameTimer / 110, 0.99) : 0;
        const walkPhase = walking ? ((frame + frameProgress) / 6) * Math.PI * 2 : 0;
        const stride = Math.sin(walkPhase);
        const lift = Math.cos(walkPhase);
        const walkBob = walking ? Math.round(Math.abs(stride) * 0.7 * s) : 0;

        // Leg animation — one foot lifts at a time; neither ever sinks below the
        // ground line at y + 12s, where the contact shadow sits.
        let leftLeg = 0, rightLeg = 0;
        if (walking) {
            const walkCycle = stride * 1.5 * s;
            leftLeg = Math.min(0, walkCycle);
            rightLeg = Math.min(0, -walkCycle);
        }
        // Boot offset — foot tap only moves the boot, not the leg
        const leftBoot = leftLeg;
        let rightBoot = rightLeg;
        if (idleFootTap > 0) rightBoot = -idleFootTap;
        // Hand swing: the shoulders stay put and only the hands travel, so the
        // arms read as swinging rather than sliding up and down the torso.
        const as = walking ? Math.round(stride * 1.2 * s) : 0;

        if (facing === 'toward') {
            // ---- FRONT VIEW (facing camera) ----
            this.drawEgoFront(ctx, x, y, s, {
                leftLeg, rightLeg, leftBoot, rightBoot,
                idleFootTap, idleHeadOfs, shrugPhase, as
            });

        } else if (facing === 'away') {
            // ---- BACK VIEW (facing away from camera) ----
            // Same VGA proportions as the front view, seen from behind.
            const P = PAL.PLAYER;
            ctx.fillStyle = P.hose;
            ctx.fillRect(x - 3.6 * s, y - 3 * s, 3.2 * s, 12 * s + leftLeg);
            ctx.fillRect(x + 0.4 * s, y - 3 * s, 3.2 * s, 12 * s + rightLeg);
            ctx.fillStyle = P.hoseHi;
            ctx.fillRect(x - 3.2 * s, y - 2 * s, 1 * s, 10 * s + leftLeg);
            ctx.fillRect(x + 0.8 * s, y - 2 * s, 1 * s, 10 * s + rightLeg);
            ctx.fillStyle = P.hoseLo;
            ctx.fillRect(x - 0.6 * s, y - 3 * s, 1 * s, 12 * s);
            // Tall boots
            [[x - 4.1 * s, leftLeg], [x + 0.2 * s, rightLeg]].forEach(([bx, bo]) => {
                ctx.fillStyle = P.bootDeep;
                ctx.fillRect(bx - 0.2 * s, y + 4.6 * s + bo, 4.3 * s, 7.4 * s);
                ctx.fillStyle = P.boot;
                ctx.fillRect(bx, y + 5 * s + bo, 3.9 * s, 7 * s);
                ctx.fillStyle = P.bootHi;
                ctx.fillRect(bx + 0.3 * s, y + 5.1 * s + bo, 3.3 * s, 0.4 * s);
                ctx.fillStyle = P.bootDeep;
                ctx.fillRect(bx - 0.3 * s, y + 11 * s + bo, 4.4 * s, 1 * s);
            });
            // Tunic back — one tone darker than the lit front
            ctx.fillStyle = '#CCCCCC';
            ctx.fillRect(x - 4 * s, y - 15 * s, 8 * s, 12 * s);
            ctx.fillRect(x - 4.6 * s, y - 4.2 * s, 9.2 * s, 5.4 * s);
            ctx.fillStyle = '#AAAAAA';
            ctx.fillRect(x + 2 * s, y - 15 * s, 2 * s, 12 * s);
            ctx.fillRect(x + 2.2 * s, y - 4.2 * s, 2.4 * s, 5.4 * s);
            ctx.fillStyle = P.tunicOutline;
            ctx.fillRect(x - 4 * s, y - 15 * s, 0.8 * s, 12 * s);
            ctx.fillRect(x + 3.2 * s, y - 15 * s, 0.8 * s, 12 * s);
            ctx.fillRect(x - 4.6 * s, y - 4.2 * s, 0.8 * s, 5.4 * s);
            ctx.fillRect(x + 3.8 * s, y - 4.2 * s, 0.8 * s, 5.4 * s);
            ctx.fillRect(x - 4.6 * s, y + 0.5 * s, 9.2 * s, 0.7 * s);
            ctx.fillStyle = P.trim;
            ctx.fillRect(x - 3.8 * s, y - 0.4 * s, 7.6 * s, 0.9 * s);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x - 3.4 * s, y - 15.8 * s, 3 * s, 1 * s);
            ctx.fillRect(x + 0.4 * s, y - 15.4 * s, 3 * s, 1 * s);
            ctx.fillStyle = P.tunicOutline;
            ctx.fillRect(x - 3.4 * s, y - 16.4 * s, 3 * s, 0.7 * s);
            ctx.fillRect(x + 0.4 * s, y - 16 * s, 3 * s, 0.7 * s);
            // Back seam
            ctx.fillStyle = '#BBBBBB';
            ctx.fillRect(x - 0.4 * s, y - 14 * s, 0.8 * s, 10 * s);
            // Collar (back)
            ctx.fillStyle = P.trim;
            ctx.fillRect(x - 2.6 * s, y - 15.8 * s, 5.2 * s, 1.2 * s);
            // Belt and pouch
            ctx.fillStyle = P.belt;
            ctx.fillRect(x - 4.2 * s, y - 4.6 * s, 8.4 * s, 1.9 * s);
            ctx.fillStyle = P.pouchStrap;
            ctx.fillRect(x + 3.4 * s, y - 4.8 * s, 2.2 * s, 3.6 * s);
            ctx.fillStyle = P.pouch;
            ctx.fillRect(x + 3.7 * s, y - 4.2 * s, 1.7 * s, 2.8 * s);
            // Arms
            ctx.fillStyle = '#CCCCCC';
            ctx.fillRect(x - 5.8 * s, y - 14.6 * s, 1.8 * s, 5.4 * s);
            ctx.fillRect(x + 4 * s, y - 14.2 * s, 1.8 * s, 5.4 * s);
            ctx.fillStyle = P.trim;
            ctx.fillRect(x - 5.9 * s, y - 9.4 * s, 2 * s, 0.7 * s);
            ctx.fillRect(x + 3.9 * s, y - 9 * s, 2 * s, 0.7 * s);
            ctx.fillStyle = P.skinShadow;
            ctx.fillRect(x - 5.8 * s, y - 8.9 * s, 1.8 * s, 4.7 * s);
            ctx.fillRect(x + 4 * s, y - 8.5 * s, 1.8 * s, 4.3 * s);
            // Hands
            ctx.fillStyle = P.skinShadow;
            ctx.fillRect(x - 5.9 * s + as, y - 4.1 * s, 2 * s, 2.4 * s);
            ctx.fillRect(x + 3.9 * s - as, y - 3.7 * s, 2 * s, 2.4 * s);
            // Neck
            ctx.fillStyle = P.skinShadow;
            ctx.fillRect(x - 1.1 * s, y - 17 * s, 2.2 * s, 1.6 * s);
            // Head (back of head, all hair)
            ctx.fillStyle = P.hair;
            ctx.fillRect(x - 2.5 * s, y - 23 * s, 5 * s, 6.2 * s);
            ctx.fillRect(x - 2.9 * s, y - 22 * s, 0.9 * s, 4.4 * s);
            ctx.fillRect(x + 2 * s, y - 22 * s, 0.9 * s, 4.4 * s);
            ctx.fillStyle = P.hairDark;
            ctx.fillRect(x - 1.8 * s, y - 22.2 * s, 0.8 * s, 5 * s);
            ctx.fillRect(x + 0.2 * s, y - 21.8 * s, 0.8 * s, 4.6 * s);
            // Cap from behind, feather still proud of the silhouette
            ctx.fillStyle = P.capLo;
            ctx.fillRect(x - 3.2 * s, y - 24.2 * s, 6.4 * s, 1.8 * s);
            ctx.fillStyle = P.cap;
            ctx.fillRect(x - 2.7 * s, y - 25.8 * s, 5.4 * s, 1.8 * s);
            ctx.fillRect(x - 3.2 * s, y - 24.4 * s, 6.4 * s, 1.5 * s);
            ctx.fillStyle = P.capLo;
            ctx.fillRect(x - 2.7 * s, y - 23.4 * s, 5.4 * s, 0.5 * s);
            ctx.fillStyle = P.feather;
            ctx.fillRect(x + 2.6 * s, y - 28.6 * s, 0.8 * s, 3.4 * s);
            ctx.fillStyle = P.featherShadow;
            ctx.fillRect(x + 3.2 * s, y - 29.4 * s, 0.8 * s, 1.6 * s);
            // Ears peeking out
            ctx.fillStyle = P.skinShadow;
            ctx.fillRect(x - 3.1 * s, y - 20.4 * s, 0.8 * s, 1.4 * s);
            ctx.fillRect(x + 2.3 * s, y - 20.4 * s, 0.8 * s, 1.4 * s);

        } else {
            // ---- SIDE VIEW (left or right) ----
            // Built from the same rectangles as the front/back views so the
            // character reads as the same person in profile.
            const P = PAL.PLAYER;
            const py = y - walkBob;
            const stridePix = walking ? stride * 2.5 * s : 0;       // hip-to-foot offset
            const liftPix = walking ? Math.max(0, lift) * 2 * s : 0; // toe-off lift on near leg
            const armPix = walking ? -stride * 2.5 * s : 0;         // arm swings opposite leg
            // 'd' is the forward direction in pixels per logical x-unit (so we
            // can write coordinates in a +x = forward layout regardless of facing).
            const d = dir * s;

            // Far leg (back) — the planted leg: its foot stays on the ground
            // line while the body bobs, so the leg lengthens instead.
            ctx.fillStyle = P.hoseLo;
            ctx.fillRect(x - 0.6 * d, py - 3 * s, 2.2 * d, (y + 9 * s) - (py - 3 * s));
            ctx.fillStyle = P.bootDeep;
            ctx.fillRect(x - 1.6 * d - stridePix * 0.4, y + 4.8 * s, 4 * d, 7.2 * s);
            ctx.fillStyle = '#241811';
            ctx.fillRect(x - 1.4 * d - stridePix * 0.4, y + 5 * s, 3.8 * d, 7 * s);

            // Far arm (back) — peeks behind torso, swings opposite the near leg
            ctx.fillStyle = '#AAAAAA';
            ctx.fillRect(x - 0.6 * d, py - 14.4 * s, 2 * d, 5.4 * s);
            ctx.fillStyle = P.skinDeep;
            ctx.fillRect(x - 0.6 * d, py - 9 * s, 2 * d, 4.6 * s);
            ctx.fillRect(x - 0.6 * d - armPix * 0.6, py - 4.4 * s, 2 * d, 2.4 * s);

            // Tunic — same proportions as the front view but narrower because
            // we see the torso edge-on. The hem flares over the hips.
            ctx.fillStyle = '#DDDDDD';
            ctx.fillRect(x - 2.6 * d, py - 15 * s, 6 * d, 12 * s);
            ctx.fillStyle = '#CCCCCC';
            ctx.fillRect(x - 3.1 * d, py - 4.2 * s, 7 * d, 5.4 * s);
            // Shading on the back side of the tunic
            ctx.fillStyle = P.tunicOutline;
            ctx.fillRect(x - 2.6 * d, py - 15 * s, 0.9 * d, 12 * s);
            ctx.fillRect(x - 3.1 * d, py - 4.2 * s, 0.9 * d, 5.4 * s);
            ctx.fillRect(x - 3.1 * d, py + 0.5 * s, 7 * d, 0.7 * s);
            // Front-edge highlight
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x + 2.4 * d, py - 14 * s, 1 * d, 10 * s);
            ctx.fillStyle = P.trim;
            ctx.fillRect(x - 2.4 * d, py - 0.4 * s, 6 * d, 0.9 * s);
            // Slumped rear shoulder — matches the front view's asymmetry.
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x - 2.6 * d, py - 15.8 * s, 3 * d, 1 * s);
            ctx.fillStyle = P.tunicOutline;
            ctx.fillRect(x - 2.6 * d, py - 16.4 * s, 3 * d, 0.7 * s);
            // Collar
            ctx.fillStyle = P.trim;
            ctx.fillRect(x - 2.6 * d, py - 15.8 * s, 6 * d, 1.2 * s);
            // Belt and buckle (buckle on the front of the belt only)
            ctx.fillStyle = P.belt;
            ctx.fillRect(x - 2.9 * d, py - 4.6 * s, 6.6 * d, 1.9 * s);
            ctx.fillStyle = P.buckle;
            ctx.fillRect(x + 1.2 * d, py - 4.5 * s, 1.8 * d, 1.7 * s);
            // Belt pouch keeps the profile silhouette recognisable.
            ctx.fillStyle = P.pouchStrap;
            ctx.fillRect(x - 3.4 * d, py - 4.8 * s, 2 * d, 3.6 * s);
            ctx.fillStyle = P.pouch;
            ctx.fillRect(x - 3.1 * d, py - 4.2 * s, 1.5 * d, 2.8 * s);

            // Near leg (front) — strides forward/back with the cycle. Anchored to
            // the ground reference so the foot plants whenever it is not lifted.
            ctx.fillStyle = P.hose;
            ctx.fillRect(x + 1.2 * d, py - 3 * s, 2.2 * d, (y + 9 * s - liftPix) - (py - 3 * s));
            ctx.fillStyle = P.hoseHi;
            ctx.fillRect(x + 1.6 * d, py - 2 * s, 0.9 * d, (y + 8 * s - liftPix) - (py - 2 * s));
            // Near boot
            ctx.fillStyle = P.bootDeep;
            ctx.fillRect(x + 0.2 * d + stridePix, y + 4.8 * s - liftPix, 4.2 * d, 7.2 * s);
            ctx.fillStyle = P.boot;
            ctx.fillRect(x + 0.4 * d + stridePix, y + 5 * s - liftPix, 3.8 * d, 7 * s);
            ctx.fillStyle = P.bootHi;
            ctx.fillRect(x + 0.7 * d + stridePix, y + 5.1 * s - liftPix, 3.2 * d, 0.4 * s);
            ctx.fillRect(x + 0.7 * d + stridePix, y + 6 * s - liftPix, 1 * d, 5 * s);

            // Near arm — sleeve to the elbow, bare forearm, swings opposite the leg
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x + 2 * d + armPix * 0.4, py - 14.4 * s, 2 * d, 5.4 * s);
            ctx.fillStyle = P.trim;
            ctx.fillRect(x + 2 * d + armPix * 0.4, py - 9.4 * s, 2 * d, 0.7 * s);
            ctx.fillStyle = P.skin;
            ctx.fillRect(x + 2 * d + armPix * 0.7, py - 8.9 * s, 2 * d, 4.9 * s);
            ctx.fillRect(x + 2 * d + armPix, py - 4.1 * s, 2 * d, 2.4 * s);

            // Neck
            ctx.fillStyle = P.skinShadow;
            ctx.fillRect(x - 0.8 * d, py - 17 * s, 2.6 * d, 1.6 * s);
            // Head — small VGA skull in profile, matching the front view's height
            ctx.fillStyle = P.skin;
            ctx.fillRect(x - 1.6 * d, py - 22.6 * s, 4.4 * d, 0.8 * s);
            ctx.fillRect(x - 2.2 * d, py - 21.8 * s, 5.4 * d, 3.6 * s);
            ctx.fillRect(x - 1.6 * d, py - 18.2 * s, 4.4 * d, 1.2 * s);
            // Subtle nose bump on the forward side
            ctx.fillRect(x + 3.2 * d, py - 20 * s, 0.9 * d, 1.6 * s);
            ctx.fillStyle = P.skinShadow;
            ctx.fillRect(x - 1.6 * d, py - 17.2 * s, 4.4 * d, 0.8 * s);
            // Hair, longer at the nape
            ctx.fillStyle = P.hair;
            ctx.fillRect(x - 2.2 * d, py - 22.6 * s, 5.4 * d, 1.2 * s);
            ctx.fillRect(x - 2.8 * d, py - 21.8 * s, 0.9 * d, 4 * s);
            ctx.fillStyle = P.hairDark;
            ctx.fillRect(x - 2.8 * d, py - 19.4 * s, 0.9 * d, 1.6 * s);
            // Cap in profile — the brim juts forward over the brow
            ctx.fillStyle = P.capLo;
            ctx.fillRect(x - 2.9 * d, py - 24.2 * s, 6.6 * d, 1.8 * s);
            ctx.fillStyle = P.cap;
            ctx.fillRect(x - 2.4 * d, py - 25.8 * s, 5 * d, 1.8 * s);
            ctx.fillRect(x - 2.9 * d, py - 24.4 * s, 6.6 * d, 1.5 * s);
            ctx.fillStyle = P.capHi;
            ctx.fillRect(x + 0.4 * d, py - 25.6 * s, 1.8 * d, 1.4 * s);
            ctx.fillStyle = P.feather;
            ctx.fillRect(x - 2.6 * d, py - 28.4 * s, 0.9 * d, 3.2 * s);
            ctx.fillStyle = P.featherShadow;
            ctx.fillRect(x - 3.4 * d, py - 29.2 * s, 0.9 * d, 1.6 * s);
            // Ear
            ctx.fillStyle = P.skinShadow;
            ctx.fillRect(x - 0.6 * d, py - 20.2 * s, 0.9 * d, 1.4 * s);
            // Forward-facing eye
            ctx.fillStyle = P.eyeWhite;
            ctx.fillRect(x + 1.1 * d, py - 20.3 * s, 1.7 * d, 1.5 * s);
            ctx.fillStyle = P.iris;
            ctx.fillRect(x + 1.5 * d, py - 20.3 * s, 1.1 * d, 1.5 * s);
            // Profile brow and crooked grin retain his expression while walking.
            ctx.fillStyle = P.brow;
            ctx.fillRect(x + 1.1 * d, py - 21 * s, 1.8 * d, 0.5 * s);
            ctx.fillStyle = P.smile;
            ctx.fillRect(x + 1.1 * d, py - 18.2 * s, 1.6 * d, 0.5 * s);
        }

        // Idle eye blink overlay — covers eyes with skin color
        if (idleType === 'blink') {
            ctx.fillStyle = PAL.PLAYER.skin;
            if (facing === 'toward') {
                ctx.fillRect(x - 3 * s, y - 15 * s, 2.5 * s, 2 * s);
                ctx.fillRect(x + 0.5 * s, y - 15 * s, 2.5 * s, 2 * s);
            } else if (facing !== 'away') {
                const d = dir * s;
                ctx.fillRect(x + 1.5 * d, y - walkBob - 15 * s, 2 * d, 2 * s);
            }
        }
    }

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
    }

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
    }

    // ---- Overlays ----
    drawDeathOverlay(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Sierra death panel. Saturated red on saturated blue sits at the same
        // luminance and vibrates, so the headline is bone white over a deep
        // ground and the red is kept for the border only.
        const bx = 100, by = 110, bw = 440, bh = 170;
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

        // The prompt stays legible; only the accent brackets blink.
        ctx.font = '14px "Courier New"';
        ctx.fillStyle = '#FFFF55';
        const retryText = 'Press R to try again';
        ctx.fillText(retryText, this.WIDTH / 2, by + bh - 22);
        if (Math.floor(this.animTimer / 700) % 2) {
            const half = ctx.measureText(retryText).width / 2;
            ctx.fillText('\u25b6', this.WIDTH / 2 - half - 14, by + bh - 22);
            ctx.fillText('\u25c0', this.WIDTH / 2 + half + 14, by + bh - 22);
        }
        ctx.textAlign = 'left';
    }

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

        ctx.font = '14px "Courier New"';
        ctx.fillStyle = '#FFFF55';
        const replayText = 'Press R to play again';
        ctx.fillText(replayText, this.WIDTH / 2, by + 260);
        if (Math.floor(this.animTimer / 700) % 2) {
            const half = ctx.measureText(replayText).width / 2;
            ctx.fillText('\u25b6', this.WIDTH / 2 - half - 14, by + 260);
            ctx.fillText('\u25c0', this.WIDTH / 2 + half + 14, by + 260);
        }
        ctx.textAlign = 'left';
    }

    // ---- Save / Load ----
    getSaveKey(slot) { return `${this.game.storagePrefix}_save_${slot}`; }

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
    }

    saveUnavailableReason() {
        if (this.titleScreen) return 'Start the game before saving.';
        if (this.dead) return 'You can\'t save when you\'re dead!';
        if (this.won) return 'Your adventure is already complete. Start a new game to save.';
        if (this.cutscene || this.sequence || this.activeDialog) return 'Finish this scene or conversation before saving. Your previous saves are unchanged.';
        return null;
    }

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
    }

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
            const playerX = Math.max(30, Math.min(610, data.playerX));
            const playerY = Math.max(280, Math.min(370, data.playerY));
            // Filter inventory to known string item IDs
            this.inventory = data.inventory.filter(x => typeof x === 'string' && Object.hasOwn(this.items, x));
            this.score = Math.max(0, Math.min(this.maxScore, Math.floor(data.score)));
            this.flags = safeFlags;
            this.restoreDialogChoices(data.dialogueChoices);
            this.dead = false;
            this.won = false;
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
            this.goToRoom(data.currentRoomId, playerX, playerY, { restoring: true });
            this.playerY = Math.max(this.minimumWalkY, Math.min(370, data.playerY));
            this.disarmedExits = this.exitsWithinRearmRange(this.rooms[this.currentRoomId]);
            // goToRoom resets orientation, so the saved facing is applied after it.
            this.playerDir = data.playerDir === -1 ? -1 : 1;
            this.playerFacing = ['toward', 'away', 'left', 'right'].includes(data.playerFacing)
                ? data.playerFacing : 'toward';
            this.sound.save();
            this.showMessage(`Game loaded from Slot ${slot + 1}.`);
        } catch (err) {
            this.showMessage('Load failed: ' + err.message);
        }
    }

    deleteSave(slot) {
        this.safeStorageRemove(this.getSaveKey(slot));
    }

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
    }

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
    }

    closeSaveModal() {
        this.dom.saveModal.classList.remove('open');
        if (this._modalPrevActiveElement && this._modalPrevActiveElement.focus) {
            this._modalPrevActiveElement.focus();
            this._modalPrevActiveElement = null;
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
    }

    /** Stop the loop and put a legible failure on screen. The whole game is
     *  procedural drawing, so a single bad branch can throw every frame;
     *  continuing would only repaint the same broken frame forever. */
    reportCrash(err) {
        this._loopRunning = false;
        this.lastError = err;
        console.error(`${this.game.shortTitle}: stopped in room`, this.currentRoomId, err);
        const message = `The game hit an unexpected error in "${this.currentRoomId || 'startup'}".`;
        this.announce(message + ' Your saved games are intact. Reload the page to continue.');
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
            ctx.fillText('Reload the page, then press F7 to load your last save.', this.WIDTH / 2, 240);
            ctx.font = '10px "Courier New"';
            ctx.fillText(String(err && err.message ? err.message : err).slice(0, 78), this.WIDTH / 2, 268);
            ctx.textAlign = 'left';
        } catch {
            // The canvas itself is unusable; the announcement above still fired.
        }
    }
}


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
