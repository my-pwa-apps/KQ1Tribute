// ============================================================
// CROWN QUEST - MORVANE'S HOUSE: SHARED INTERIOR SHELL
// The scullery, study and hidden room sit inside one building, so they share
// a vanishing point and a stone vocabulary. Only the dressing changes.
// ============================================================

CrownQuest.shared.house = (() => {
    const F = perspectiveFrame(640, 150, 490, 52, 258, 300);

    const HOUSE_TONE = {
        void: '#0a0806',
        ceiling: '#1b1409',
        back: '#5b5040',
        backShade: '#463d30',
        leftWall: '#4c4334',
        rightWall: '#3b3428',
        floor: '#332c22',
        floorBands: [['#433a2c', 258, 26], ['#3c3427', 284, 32], ['#332c22', 316, 38], ['#2a251d', 354, 46]]
    };

    /** Ceiling beams racing back toward the vanishing point. Shared by every
     *  room in the house so the roof structure stays continuous. */
    function ceilingBeams(ctx, w) {
        [[60, 205], [220, 275], [420, 345], [580, 415]].forEach(([nx, fx]) => {
            ctx.fillStyle = '#0d0a06';
            ctx.beginPath();
            ctx.moveTo(nx - 11, 0); ctx.lineTo(nx + 11, 0);
            ctx.lineTo(fx + 4, F.BW_T); ctx.lineTo(fx - 4, F.BW_T);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.WOOD_SHADOW;
            ctx.beginPath();
            ctx.moveTo(nx - 9, 0); ctx.lineTo(nx + 9, 0);
            ctx.lineTo(fx + 3, F.BW_T); ctx.lineTo(fx - 3, F.BW_T);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.WOOD_BASE;
            ctx.beginPath();
            ctx.moveTo(nx - 9, 0); ctx.lineTo(nx - 4, 0);
            ctx.lineTo(fx - 1.5, F.BW_T); ctx.lineTo(fx - 3, F.BW_T);
            ctx.closePath(); ctx.fill();
        });
        void w;
    }

    /** Stone dressing on both side walls, drawn through the perspective frame
     *  so courses converge instead of running flat. */
    function houseWalls(ctx, w) {
        drawPerspectiveSurface(ctx, 100, 80, {
            tl: { x: 0, y: 0 }, tr: { x: F.BW_L, y: F.BW_T },
            bl: { x: 0, y: F.EDGE }, br: { x: F.BW_L, y: F.BW_B }
        }, (s) => stoneWall(s, 0, 0, 100, 80, 1201, '#7a6b52', '#5e5240', '#43392c', '#312a20'));
        drawPerspectiveSurface(ctx, 100, 80, {
            tl: { x: w, y: 0 }, tr: { x: F.BW_R, y: F.BW_T },
            bl: { x: w, y: F.EDGE }, br: { x: F.BW_R, y: F.BW_B }
        }, (s) => stoneWall(s, 0, 0, 100, 80, 3307, '#63563f', '#4a4132', '#352e23', '#272119'));
        stoneWall(ctx, F.BW_L, F.BW_T, F.BW_R - F.BW_L, F.BW_B - F.BW_T, 5501,
            '#7f7057', '#5f5341', '#443a2d', '#322b21');
    }

    /** Worn flagstones. Courses compress with distance AND their joints run to
     *  the back wall, so the stones lie down. Axis-aligned rectangles at a fixed
     *  pitch read as brickwork stood on end, however the courses are spaced. */
    function flagstones(ctx, w, h) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, F.EDGE); ctx.lineTo(F.BW_L, F.BW_B); ctx.lineTo(F.BW_R, F.BW_B);
        ctx.lineTo(w, F.EDGE); ctx.lineTo(w, h); ctx.lineTo(0, h);
        ctx.closePath();
        ctx.clip();
        // Floor width at a given depth: the back wall foot opens out to the full
        // frame at the near edge, so a joint at fraction t follows that spread.
        const jointX = (y, t) => {
            const d = (y - F.BW_B) / (h - F.BW_B);
            const x0 = F.BW_L * (1 - d);
            const x1 = F.BW_R + (w - F.BW_R) * d;
            return x0 + (x1 - x0) * t;
        };
        const next = seededRandom(8080);
        const COLS = 9;
        let y = F.BW_B;
        let depth = 7;
        let row = 0;
        while (y < h + 20) {
            const y2 = y + depth;
            const shift = row % 2 ? 0.5 / COLS : 0;
            for (let c = -1; c <= COLS; c++) {
                const t1 = c / COLS + shift, t2 = (c + 1) / COLS + shift;
                const ax = jointX(y, t1), bx = jointX(y, t2);
                const cx2 = jointX(y2, t2), dx = jointX(y2, t1);
                const tone = next();
                ctx.globalAlpha = 0.62;
                ctx.fillStyle = tone > 0.72 ? '#4b4438' : (tone > 0.34 ? '#3f3930' : '#332e26');
                ctx.beginPath();
                ctx.moveTo(ax, y); ctx.lineTo(bx, y); ctx.lineTo(cx2, y2); ctx.lineTo(dx, y2);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
                // Joints: a dark near edge on every stone and a lit lip on most,
                // but no full lattice of highlights.
                ctx.strokeStyle = 'rgba(18,15,11,0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(dx, y2 - 0.5); ctx.lineTo(cx2, y2 - 0.5);
                ctx.stroke();
                if (next() > 0.3) {
                    ctx.strokeStyle = 'rgba(122,112,92,0.45)';
                    ctx.beginPath();
                    ctx.moveTo(ax + 1, y + 0.5); ctx.lineTo(bx - 1, y + 0.5);
                    ctx.stroke();
                }
                // Side joint, so the converging columns are legible up close
                if (depth > 10) {
                    ctx.strokeStyle = 'rgba(18,15,11,0.4)';
                    ctx.beginPath();
                    ctx.moveTo(ax, y); ctx.lineTo(dx, y2);
                    ctx.stroke();
                }
                // Wear: a scuff on the odd stone rather than every one
                if (depth > 12 && next() > 0.84) {
                    ctx.fillStyle = 'rgba(74,68,56,0.32)';
                    ctx.beginPath();
                    ctx.ellipse((ax + bx + cx2 + dx) / 4, (y + y2) / 2, (bx - ax) * 0.24, depth * 0.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            y = y2;
            depth *= 1.24;
            row++;
        }
        ctx.restore();
    }

    return { F, HOUSE_TONE, ceilingBeams, houseWalls, flagstones };
})();
