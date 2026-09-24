// ============================================================
// CROWN QUEST - ALDERHAVEN: SHARED EXTERIOR HELPERS
// The goat that follows Rowan, the daylight sky every exterior shares, and
// the troll bridge geometry its art and walkable area are both built from.
// ============================================================

CrownQuest.shared.alderhaven = (() => {

    /** The goat trails Rowan from room to room once bribed. One helper draws it
     *  in every room so it never becomes two different animals. */
    function followingGoat(e, gx, groundY, scale) {
        if (!e.getFlag('goat_follows')) return;
        e.addForegroundLayer(groundY, (ctx, eng) => {
            if (eng.currentRoomId === 'troll_bridge' && eng.sequence && eng.bridgeEncounter) return;
            eng.drawContactShadow(ctx, gx, groundY, 1, { rx: 30 * scale, ry: 6 * scale, alpha: 0.26 });
            drawGoat(ctx, gx, groundY, scale, eng.playerX > gx ? 1 : -1, false, eng.animTimer);
        });
    }

    // Where the following goat stands in each room: its art and its hotspot.
    const GOAT_AT = {
        harbour_road: [210, 358, 1.05],
        village_green: [200, 356, 1.2],
        dark_wood: [150, 358, 1.15],
        troll_bridge: [120, 366, 1.1]
    };

    function goatHotspot(engine, gx, groundY, scale) {
        return {
            name: 'your goat', x: gx - 30 * scale, y: groundY - 40 * scale, w: 60 * scale, h: 42 * scale, walkToX: gx + 50,
            get description() { return engine.getFlag('troll_routed')
                ? 'The goat that put a troll in a river. It shows no sign of knowing this was unusual.'
                : 'The goat trails at your heel, chewing on nothing in particular and watching the world for things to disagree with.'; },
            talk: (e) => e.showMessage(e.getFlag('troll_routed')
                ? '"Maa," says the goat. You decide to hear it as modesty.'
                : '"Maa," says the goat, in the tone of an animal that has heard better arguments and eaten most of them.'),
            get: (e) => e.showMessage('You try to pick up the goat. The goat has views about this, and you put it down again.'),
            useItem: (e) => e.showMessage('The goat sniffs it and looks at you as if you had forgotten something important about goats. It has already had your bread.'),
            get hidden() { return !engine.getFlag('goat_follows') || !!engine.bridgeEncounter; }
        };
    }

    /** Shared Alderhaven daylight sky. Every exterior in the act uses it so the
     *  time of day never jumps between adjacent screens. */
    function alderhavenSky(ctx, w, horizonY, eng, seed) {
        skyBands(ctx, 0, 0, w, horizonY, ['#4a6ea8', '#7a9cc6', '#a8c2dc', '#cfdeea']);
        const next = seededRandom(seed || 606);
        for (let i = 0; i < 6; i++) {
            const cx = next() * w + Math.sin(eng.animTimer / 11000 + i) * 16;
            const cy = 20 + next() * (horizonY * 0.5);
            const cw = 30 + next() * 34;
            ctx.fillStyle = 'rgba(244,248,252,0.62)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, cw, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - cw * 0.6, cy + 5, cw * 0.5, 7, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + cw * 0.62, cy + 4, cw * 0.44, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(178,196,216,0.5)';
            ctx.beginPath();
            ctx.ellipse(cx + 4, cy + 8, cw * 0.9, 4.4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // The gorge runs across the screen and the span runs away from the viewer,
    // so the far wall faces the camera. The art and the walkable area are both
    // built from these numbers, which is what stops them drifting apart.
    const FAR_LIP = 206, NEAR_LIP = 330;
    const SPAN = { nearX: 332, nearY: 348, nearHalf: 28, farX: 322, farY: 206, farHalf: 8 };
    const spanX = (t) => SPAN.nearX + (SPAN.farX - SPAN.nearX) * t;
    const spanHalf = (t) => SPAN.nearHalf + (SPAN.farHalf - SPAN.nearHalf) * t;

    function bridgeCrossing(e) {
        return e.playerY > 204
            ? [{ walk: [null, 354] }, { walk: [332, 354] }, { walk: [322, 196] }]
            : [{ walk: [null, 196] }, { walk: [322, 196] }, { walk: [332, 354] }];
    }

    return { followingGoat, GOAT_AT, goatHotspot, alderhavenSky, FAR_LIP, NEAR_LIP, SPAN, spanX, spanHalf, bridgeCrossing };
})();
