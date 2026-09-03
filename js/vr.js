import * as THREE from './vendor/three.module.min.js';

const ROOM_WIDTH = 640;
const ROOM_HEIGHT = 400;
const WALL_HEIGHT_PX = 300;
const CEILING_HEIGHT_PX = 120;
const FLOOR_TOP_PX = 260;
const FLOOR_HEIGHT_PX = ROOM_HEIGHT - FLOOR_TOP_PX;
const WALL_RADIUS = 4;
const WALL_ARC = Math.PI;
const WALL_BOTTOM = 0;
const WALL_TOP = 3.5;
const FLOOR_WIDTH = 8;
const FLOOR_DEPTH = 7;
const FLOOR_BACK = -4;
const FLOOR_FRONT = FLOOR_BACK + FLOOR_DEPTH;
const MOVE_DEAD_ZONE = 0.28;

class VRSystem {
    constructor(engine) {
        this.engine = engine;
        this.supported = false;
        this.session = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.baseReferenceSpace = null;
        this.controllers = [];
        this.controllerRays = [];
        this.pointedHotspot = null;
        this.pointedCanvas = null;
        this.previousButtons = [[], []];
        this.previousInventoryAxis = [0, 0];
        this.actionIndex = 0;
        this.actions = ['walk', 'look', 'get', 'use', 'talk'];
        this.lastRoomId = null;
        this.hotspotMarkers = [];
        this.originalCanvas = null;
        this.originalContext = null;
        this.originalPlayerVisible = true;
        this.lastHudSignature = '';

        this.roomCanvas = document.createElement('canvas');
        this.roomCanvas.width = ROOM_WIDTH;
        this.roomCanvas.height = ROOM_HEIGHT;
        this.roomContext = this.roomCanvas.getContext('2d');
        this.wallCanvas = document.createElement('canvas');
        this.wallCanvas.width = ROOM_WIDTH;
        this.wallCanvas.height = WALL_HEIGHT_PX;
        this.wallContext = this.wallCanvas.getContext('2d');
        this.floorCanvas = document.createElement('canvas');
        this.floorCanvas.width = ROOM_WIDTH;
        this.floorCanvas.height = FLOOR_HEIGHT_PX;
        this.floorContext = this.floorCanvas.getContext('2d');
        this.ceilingCanvas = document.createElement('canvas');
        this.ceilingCanvas.width = ROOM_WIDTH;
        this.ceilingCanvas.height = CEILING_HEIGHT_PX;
        this.ceilingContext = this.ceilingCanvas.getContext('2d');
        this.hudCanvas = document.createElement('canvas');
        this.hudCanvas.width = 1024;
        this.hudCanvas.height = 256;
        this.hudContext = this.hudCanvas.getContext('2d');

        this._checkSupport();
    }

    async _checkSupport() {
        if (!navigator.xr) return;
        try {
            this.supported = await navigator.xr.isSessionSupported('immersive-vr');
            if (this.supported) this._addLaunchButton();
        } catch (error) {
            console.warn('WebXR capability check failed:', error);
        }
    }

    _addLaunchButton() {
        if (document.getElementById('btn-vr')) return;
        const button = document.createElement('button');
        button.id = 'btn-vr';
        button.className = 'save-btn vr-launch-btn';
        button.type = 'button';
        button.title = 'Enter first-person VR';
        button.textContent = 'Enter VR';
        button.onclick = () => this.enter();
        document.body.appendChild(button);
    }

    _initScene() {
        if (this.renderer) return true;

        const canvas = document.createElement('canvas');
        canvas.id = 'vr-gl-canvas';
        canvas.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(canvas);

        try {
            this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        } catch (error) {
            console.error('Unable to initialize the VR renderer:', error);
            canvas.remove();
            return false;
        }
        this.renderer.xr.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x02020c);
        this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 40);
        this.camera.position.set(0, 1.65, 0);
        this.scene.add(this.camera);

        this.wallTexture = this._canvasTexture(this.wallCanvas);
        const wallGeometry = new THREE.CylinderGeometry(
            WALL_RADIUS, WALL_RADIUS, WALL_TOP - WALL_BOTTOM, 64, 1, true,
            Math.PI / 2, WALL_ARC
        );
        const wallMaterial = new THREE.MeshBasicMaterial({
            map: this.wallTexture,
            side: THREE.BackSide,
            toneMapped: false
        });
        this.wall = new THREE.Mesh(wallGeometry, wallMaterial);
        this.wall.position.y = (WALL_TOP + WALL_BOTTOM) / 2;
        this.wall.userData.surface = 'wall';
        this.scene.add(this.wall);

        this.floorTexture = this._canvasTexture(this.floorCanvas);
        const floorMaterial = new THREE.MeshBasicMaterial({
            map: this.floorTexture,
            side: THREE.DoubleSide,
            toneMapped: false
        });
        this.floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_WIDTH, FLOOR_DEPTH), floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.set(0, 0, (FLOOR_BACK + FLOOR_FRONT) / 2);
        this.floor.userData.surface = 'floor';
        this.scene.add(this.floor);

        this.ceilingTexture = this._canvasTexture(this.ceilingCanvas);
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(FLOOR_WIDTH, FLOOR_DEPTH),
            new THREE.MeshBasicMaterial({
                map: this.ceilingTexture,
                color: 0x777788,
                side: THREE.DoubleSide,
                toneMapped: false
            })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, WALL_TOP, (FLOOR_BACK + FLOOR_FRONT) / 2);
        this.scene.add(ceiling);

        this.markerGroup = new THREE.Group();
        this.scene.add(this.markerGroup);
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 12;

        this.hudTexture = this._canvasTexture(this.hudCanvas);
        const hudMaterial = new THREE.MeshBasicMaterial({
            map: this.hudTexture,
            transparent: true,
            depthTest: false,
            toneMapped: false
        });
        this.hud = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), hudMaterial);
        this.hud.renderOrder = 100;
        this.scene.add(this.hud);

        for (let index = 0; index < 2; index++) {
            const controller = this.renderer.xr.getController(index);
            const rayGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -1)
            ]);
            const ray = new THREE.Line(rayGeometry, new THREE.LineBasicMaterial({ color: 0x55aaff }));
            ray.scale.z = 5;
            controller.add(ray);
            this.scene.add(controller);
            this.controllers.push(controller);
            this.controllerRays.push(ray);
        }

        return true;
    }

    _canvasTexture(canvas) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        return texture;
    }

    async enter() {
        if (!this.supported || this.session) return;
        if (!this._initScene()) {
            this.engine.showMessage('VR could not start because WebGL is unavailable.');
            return;
        }

        try {
            const session = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor'],
                optionalFeatures: ['bounded-floor', 'hand-tracking']
            });
            this.session = session;
            session.addEventListener('end', () => this._onSessionEnd(), { once: true });
            await this.renderer.xr.setSession(session);
            this.baseReferenceSpace = await session.requestReferenceSpace('local-floor');
            this.renderer.xr.setReferenceSpace(this.baseReferenceSpace);

            this._activateFirstPersonState();
            this.lastRoomId = null;
            this._setButtonState(true);
            this.engine.showMessage('You are Wilkins. Left stick walks. Trigger acts. Grip changes action. B looks.');
            this.renderer.setAnimationLoop((timestamp, frame) => this._frame(timestamp, frame));
        } catch (error) {
            console.error('Unable to enter immersive VR:', error);
            this.engine.showMessage('VR session failed: ' + error.message);
            this.session = null;
        }
    }

    async exit() {
        if (!this.session) return;
        try {
            await this.session.end();
        } catch (error) {
            console.warn('VR session did not close cleanly:', error);
            this._onSessionEnd();
        }
    }

    destroy() {
        if (this.session) this.session.end().catch(() => this._onSessionEnd());
        const button = document.getElementById('btn-vr');
        if (button) button.remove();
        this._disposeScene();
        if (this.renderer) {
            this.renderer.setAnimationLoop(null);
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        this.renderer = null;
    }

    /** Release GPU-side scene resources; renderer.dispose() does not free these. */
    _disposeScene() {
        if (!this.scene) return;
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (!material) continue;
                if (material.map) material.map.dispose();
                material.dispose();
            }
        });
        this.scene.clear();
        this.scene = null;
        this.camera = null;
        this.hotspotMarkers = [];
    }

    _onSessionEnd() {
        if (this.renderer) this.renderer.setAnimationLoop(null);
        this._clearMovementKeys();
        this.session = null;
        this.baseReferenceSpace = null;
        this._restoreDesktopState();
        this._setButtonState(false);
        this.engine.render();
    }

    _activateFirstPersonState() {
        if (this.originalCanvas) return;
        this.originalCanvas = this.engine.canvas;
        this.originalContext = this.engine.ctx;
        this.originalPlayerVisible = this.engine.playerVisible;
        this.engine.canvas = this.roomCanvas;
        this.engine.ctx = this.roomContext;
        this.engine.vrActive = true;
        this.engine.immersiveView = true;
        this.engine.playerVisible = false;
    }

    _restoreDesktopState() {
        if (this.originalCanvas) {
            this.engine.canvas = this.originalCanvas;
            this.engine.ctx = this.originalContext;
        }
        this.engine.vrActive = false;
        this.engine.immersiveView = false;
        this.engine.playerVisible = this.originalPlayerVisible;
        this.originalCanvas = null;
        this.originalContext = null;
    }

    _setButtonState(active) {
        const button = document.getElementById('btn-vr');
        if (!button) return;
        button.textContent = active ? 'Exit VR' : 'Enter VR';
        button.classList.toggle('active', active);
        button.onclick = active ? () => this.exit() : () => this.enter();
    }

    _frame(timestamp, frame) {
        if (!this.session || !frame) return;
        const dt = Math.min(Math.max(timestamp - this.engine.lastTime, 0), 100);
        this.engine.lastTime = timestamp;

        this._processControllers(frame);
        this.engine.update(dt);
        this.engine.playerVisible = false;
        this.engine.render();
        this._updateRoomTextures();
        this._updateReferenceSpace();
        this._updateHotspotMarkers();
        this._updateHud();
        this._positionHud();
        this.renderer.render(this.scene, this.camera);
    }

    _updateRoomTextures() {
        this.wallContext.clearRect(0, 0, ROOM_WIDTH, WALL_HEIGHT_PX);
        this.wallContext.drawImage(this.roomCanvas, 0, 0, ROOM_WIDTH, WALL_HEIGHT_PX,
            0, 0, ROOM_WIDTH, WALL_HEIGHT_PX);
        this.floorContext.clearRect(0, 0, ROOM_WIDTH, FLOOR_HEIGHT_PX);
        this.floorContext.drawImage(this.roomCanvas, 0, FLOOR_TOP_PX, ROOM_WIDTH, FLOOR_HEIGHT_PX,
            0, 0, ROOM_WIDTH, FLOOR_HEIGHT_PX);
        this.ceilingContext.clearRect(0, 0, ROOM_WIDTH, CEILING_HEIGHT_PX);
        // Mirrored and dimmed: drawn upright it reads as a second copy of the
        // room hanging overhead instead of an overhead surface.
        this.ceilingContext.save();
        this.ceilingContext.translate(0, CEILING_HEIGHT_PX);
        this.ceilingContext.scale(1, -1);
        this.ceilingContext.drawImage(this.roomCanvas, 0, 0, ROOM_WIDTH, CEILING_HEIGHT_PX,
            0, 0, ROOM_WIDTH, CEILING_HEIGHT_PX);
        this.ceilingContext.restore();
        this.ceilingContext.fillStyle = 'rgba(2, 2, 12, 0.55)';
        this.ceilingContext.fillRect(0, 0, ROOM_WIDTH, CEILING_HEIGHT_PX);
        this.wallTexture.needsUpdate = true;
        this.floorTexture.needsUpdate = true;
        this.ceilingTexture.needsUpdate = true;
    }

    _updateReferenceSpace() {
        if (!this.baseReferenceSpace || typeof XRRigidTransform === 'undefined') return;
        const x = ((this.engine.playerX - 320) / 290) * 1.8;
        const z = -1.3 + ((this.engine.playerY - 280) / 90) * 2.6;
        const offset = new XRRigidTransform({ x, y: 0, z }).inverse;
        this.renderer.xr.setReferenceSpace(this.baseReferenceSpace.getOffsetReferenceSpace(offset));
    }

    _positionHud() {
        const xrCamera = this.renderer.xr.getCamera(this.camera);
        xrCamera.getWorldPosition(this.hud.position);
        xrCamera.getWorldQuaternion(this.hud.quaternion);
        this.hud.translateY(-0.42);
        this.hud.translateZ(-1.15);
    }

    _updateHud() {
        const item = this.engine.selectedItem ? this.engine.items[this.engine.selectedItem]?.name : '';
        const inventory = this.engine.inventory
            .map((id) => this.engine.items[id]?.name || id)
            .join(', ');
        const state = this.engine.dead ? 'dead' : (this.engine.won ? 'won' : '');
        const signature = [
            this.engine.currentAction, this.engine.score, item,
            this.engine.message, inventory, state
        ].join('|');
        if (signature === this.lastHudSignature) return;
        this.lastHudSignature = signature;
        const ctx = this.hudContext;
        ctx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        ctx.fillStyle = 'rgba(0, 0, 48, 0.86)';
        ctx.fillRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        ctx.strokeStyle = '#7777ff';
        ctx.lineWidth = 5;
        ctx.strokeRect(3, 3, this.hudCanvas.width - 6, this.hudCanvas.height - 6);
        ctx.font = '40px "Courier New"';
        ctx.fillStyle = '#ffff55';
        ctx.fillText(this.engine.currentAction.toUpperCase(), 28, 52);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#55ffff';
        ctx.fillText(`SCORE ${this.engine.score}/${this.engine.maxScore}`, 996, 52);
        ctx.textAlign = 'left';
        ctx.font = '34px "Courier New"';
        ctx.fillStyle = state === 'dead' ? '#ff8855' : '#ffffff';
        const prompt = state === 'dead' ? 'You died. Press A to try again.'
            : (state === 'won' ? 'You won! Press A to play again.' : null);
        this._wrapText(ctx, prompt || this.engine.message || 'Explore the room.', 28, 102, 968, 38, 2);
        // Desktop shows a persistent inventory bar; VR players otherwise have no
        // way to see what they are carrying.
        ctx.font = '26px "Courier New"';
        ctx.fillStyle = item ? '#55ff55' : '#aab0d0';
        const carried = inventory || 'nothing yet';
        this._wrapText(ctx, item ? `USING ${item}  |  CARRYING ${carried}` : `CARRYING ${carried}`,
            28, 208, 968, 30, 2);
        this.hudTexture.needsUpdate = true;
    }

    _wrapText(ctx, text, x, y, width, lineHeight, maxLines) {
        const words = text.split(/\s+/);
        let line = '';
        let lineIndex = 0;
        for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (line && ctx.measureText(test).width > width) {
                ctx.fillText(line, x, y + lineIndex * lineHeight);
                line = word;
                lineIndex++;
                if (lineIndex >= maxLines) return;
            } else {
                line = test;
            }
        }
        if (line && lineIndex < maxLines) ctx.fillText(line, x, y + lineIndex * lineHeight);
    }

    _processControllers(_frame) {
        this.pointedHotspot = null;
        this.pointedCanvas = null;
        const sources = Array.from(this.session.inputSources || []);
        const xrCamera = this.renderer.xr.getCamera(this.camera);
        const movementSource = sources.find((source) => source.handedness === 'left' && source.gamepad);
        this._applyLocomotion(movementSource, xrCamera);

        for (let index = 0; index < this.controllers.length; index++) {
            const controller = this.controllers[index];
            const source = sources[index];
            if (!source) continue;
            const hit = this._controllerHit(controller);
            const canvasPoint = hit ? this._intersectionToCanvas(hit) : null;
            const room = this.engine.rooms[this.engine.currentRoomId];
            const hotspot = room && canvasPoint ?
                this.engine.findHotspot(canvasPoint.x, canvasPoint.y, room) : null;
            if (hit && !this.pointedCanvas) {
                this.pointedCanvas = canvasPoint;
                this.pointedHotspot = hotspot;
            }
            this.controllerRays[index].material.color.set(hit ? 0x55ff77 : 0x55aaff);
            this.controllerRays[index].scale.z = hit ? hit.distance : 5;
            this._processButtons(index, source, canvasPoint);
        }
    }

    _applyLocomotion(source, xrCamera) {
        if (!source || !source.gamepad || this.engine.titleScreen || this.engine.cutscene ||
            this.engine.dead || this.engine.won) {
            this._clearMovementKeys();
            return;
        }
        const axes = source.gamepad.axes || [];
        const axisOffset = axes.length >= 4 ? 2 : 0;
        const stickX = axes[axisOffset] || 0;
        const stickY = axes[axisOffset + 1] || 0;
        if (Math.hypot(stickX, stickY) < MOVE_DEAD_ZONE) {
            this._clearMovementKeys();
            return;
        }

        const forward = new THREE.Vector3();
        xrCamera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
        forward.normalize();
        const right = new THREE.Vector3(-forward.z, 0, forward.x);
        const movement = right.multiplyScalar(stickX).add(forward.multiplyScalar(-stickY));
        this._setMovementKeys(movement.x, movement.z);
    }

    _setMovementKeys(worldX, worldZ) {
        this.engine.keysDown.ArrowLeft = worldX < -MOVE_DEAD_ZONE;
        this.engine.keysDown.ArrowRight = worldX > MOVE_DEAD_ZONE;
        this.engine.keysDown.ArrowUp = worldZ < -MOVE_DEAD_ZONE;
        this.engine.keysDown.ArrowDown = worldZ > MOVE_DEAD_ZONE;
    }

    _clearMovementKeys() {
        this.engine.keysDown.ArrowLeft = false;
        this.engine.keysDown.ArrowRight = false;
        this.engine.keysDown.ArrowUp = false;
        this.engine.keysDown.ArrowDown = false;
    }

    _processButtons(index, source, canvasPoint) {
        const gamepad = source.gamepad;
        if (!gamepad) return;
        const buttons = gamepad.buttons || [];
        const pressed = (buttonIndex) => !!buttons[buttonIndex]?.pressed;
        const edge = (buttonIndex) => pressed(buttonIndex) && !this.previousButtons[index][buttonIndex];

        if (edge(0)) this._activate(canvasPoint);
        if (edge(1)) this._cycleAction();
        // Thumbstick click is otherwise unused; desktop has a hint button and VR
        // players would otherwise have no way to reach the hint system.
        if (edge(3)) this._showHint();
        if (edge(4)) this._confirm();
        if (edge(5)) this._quickLook(canvasPoint);
        this._cycleInventory(index, source);
        this.previousButtons[index] = buttons.map((button) => !!button.pressed);
    }

    _cycleInventory(index, source) {
        if (source.handedness !== 'right' || this.engine.currentAction !== 'use' ||
            !this.engine.inventory.length) return;
        const axes = source.gamepad.axes || [];
        const axisOffset = axes.length >= 4 ? 2 : 0;
        const axis = axes[axisOffset] || 0;
        const crossed = Math.abs(axis) > 0.65 && Math.abs(this.previousInventoryAxis[index]) <= 0.65;
        if (crossed) {
            const inventory = this.engine.inventory;
            const current = inventory.indexOf(this.engine.selectedItem);
            const next = (current + (axis > 0 ? 1 : -1) + inventory.length) % inventory.length;
            this.engine.selectedItem = inventory[next];
            this.engine.updateInventoryUI();
            this.engine.showMessage('Using: ' + (this.engine.items[inventory[next]]?.name || inventory[next]));
        }
        this.previousInventoryAxis[index] = axis;
    }

    _controllerHit(controller) {
        this.raycaster.setFromXRController(controller);
        return this.raycaster.intersectObjects([this.wall, this.floor], false)[0] || null;
    }

    _intersectionToCanvas(intersection) {
        const point = intersection.point;
        if (intersection.object === this.wall) {
            const angle = Math.atan2(point.x, -point.z);
            const x = ((angle + WALL_ARC / 2) / WALL_ARC) * ROOM_WIDTH;
            const y = ((WALL_TOP - point.y) / (WALL_TOP - WALL_BOTTOM)) * WALL_HEIGHT_PX;
            return { x: this._clamp(x, 0, ROOM_WIDTH), y: this._clamp(y, 0, WALL_HEIGHT_PX) };
        }
        if (intersection.object === this.floor) {
            const x = ((point.x + FLOOR_WIDTH / 2) / FLOOR_WIDTH) * ROOM_WIDTH;
            const y = FLOOR_TOP_PX + ((point.z - FLOOR_BACK) / FLOOR_DEPTH) * FLOOR_HEIGHT_PX;
            return { x: this._clamp(x, 0, ROOM_WIDTH), y: this._clamp(y, FLOOR_TOP_PX, ROOM_HEIGHT) };
        }
        return null;
    }

    _activate(canvasPoint) {
        this.engine.sound.init();
        if (this._confirm()) return;
        if (!canvasPoint) return;
        this.engine.handleCanvasActivate(canvasPoint.x, canvasPoint.y);
        this.engine.playerVisible = false;
    }

    _confirm() {
        if (this.engine.titleScreen) {
            // Must go through startNewGame so the intro/start hook runs in VR too.
            this.engine.startNewGame();
            this.engine.playerVisible = false;
            return true;
        }
        if (this.engine.cutscene) {
            this.engine.skipCutscene();
            this.engine.playerVisible = false;
            return true;
        }
        if (this.engine.dead || this.engine.won) {
            this.engine.restart();
            this.engine.playerVisible = false;
            return true;
        }
        return false;
    }

    _quickLook(canvasPoint) {
        if (!canvasPoint || this.engine.titleScreen || this.engine.cutscene) return;
        const action = this.engine.currentAction;
        this.engine.currentAction = 'look';
        this.engine.handleCanvasActivate(canvasPoint.x, canvasPoint.y);
        this.engine.currentAction = action;
        this.engine.playerVisible = false;
    }

    _cycleAction() {
        this.actionIndex = (this.actionIndex + 1) % this.actions.length;
        this.engine.setAction(this.actions[this.actionIndex]);
    }

    _showHint() {
        if (this.engine.titleScreen || this.engine.cutscene ||
            this.engine.dead || this.engine.won) return;
        this.engine.showHint();
        this.engine.playerVisible = false;
    }

    _updateHotspotMarkers() {
        const room = this.engine.rooms[this.engine.currentRoomId];
        if (!room) return;
        const visible = room.hotspots.filter((hotspot) => !hotspot.hidden);
        if (this.lastRoomId !== this.engine.currentRoomId || this.hotspotMarkers.length !== visible.length) {
            this.lastRoomId = this.engine.currentRoomId;
            this.markerGroup.clear();
            this.hotspotMarkers = visible.map((hotspot) => {
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(0.035, 8, 6),
                    new THREE.MeshBasicMaterial({
                        color: hotspot.isExit ? 0x44ff66 : hotspot.talk ? 0xffcc44 : 0x66aaff,
                        transparent: true,
                        opacity: 0.45,
                        depthTest: false
                    })
                );
                marker.userData.hotspot = hotspot;
                marker.position.copy(this._canvasToWorld(
                    hotspot.x + hotspot.w / 2,
                    hotspot.y + hotspot.h / 2
                ));
                this.markerGroup.add(marker);
                return marker;
            });
        }
        const pulse = 0.75 + Math.sin(performance.now() * 0.004) * 0.2;
        for (const marker of this.hotspotMarkers) {
            marker.scale.setScalar(marker.userData.hotspot === this.pointedHotspot ? 2.2 : pulse);
            marker.material.opacity = marker.userData.hotspot === this.pointedHotspot ? 1 : 0.45;
        }
    }

    _canvasToWorld(x, y) {
        if (y >= FLOOR_TOP_PX) {
            return new THREE.Vector3(
                (x / ROOM_WIDTH) * FLOOR_WIDTH - FLOOR_WIDTH / 2,
                0.035,
                FLOOR_BACK + ((y - FLOOR_TOP_PX) / FLOOR_HEIGHT_PX) * FLOOR_DEPTH
            );
        }
        const angle = -WALL_ARC / 2 + (x / ROOM_WIDTH) * WALL_ARC;
        return new THREE.Vector3(
            WALL_RADIUS * Math.sin(angle) * 0.985,
            WALL_TOP - (y / WALL_HEIGHT_PX) * (WALL_TOP - WALL_BOTTOM),
            -WALL_RADIUS * Math.cos(angle) * 0.985
        );
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}

window.VRSystem = VRSystem;
window.dispatchEvent(new Event('CrownQuest-vr-ready'));

export { VRSystem };
