// ============================================================
// CROWN QUEST ENGINE - THE EGO
// Rowan's cel: front, side and back views share one measurement frame.
// These methods extend GameEngine.prototype; js/engine.js owns the state.
// ============================================================

GameEngine.extend({
    /** Snapped sprite scale for the ego at a given floor Y. Shared with the
     *  cutscene mini-animations so gameplay and cutscenes stay the same size. */
    playerSpriteScale(y) {
        let s = (1.85 + (y - 280) / 90 * 0.3) * PLAYER_SPRITE_SCALE;
        if (this.depthScaling) s *= this.getDepthScale(y);
        return Math.round(s * 20) / 20;
    },

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
    },

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
});
