// ============================================================
// CROWN QUEST - SHARED COLOUR PALETTE
// ------------------------------------------------------------
// Central colour vocabulary for the engine and game content.
//
// New art should prefer these names over raw hex so the game keeps
// one coherent colour signature. The EGA block below is the
// period-accurate reference ramp; the named entries are the
// game's own extended fantasy signature built around it.
// ============================================================

(function (global) {
    'use strict';

    // The canonical IBM EGA 16-colour hardware palette. Kept as a
    // reference ramp for art that wants to stay period-accurate.
    const EGA = {
        BLACK: '#000000',
        BLUE: '#0000AA',
        GREEN: '#00AA00',
        CYAN: '#00AAAA',
        RED: '#AA0000',
        MAGENTA: '#AA00AA',
        BROWN: '#AA5500',
        LIGHT_GRAY: '#AAAAAA',
        DARK_GRAY: '#555555',
        BRIGHT_BLUE: '#5555FF',
        BRIGHT_GREEN: '#55FF55',
        BRIGHT_CYAN: '#55FFFF',
        BRIGHT_RED: '#FF5555',
        BRIGHT_MAGENTA: '#FF55FF',
        YELLOW: '#FFFF55',
        WHITE: '#FFFFFF'
    };

    const PALETTE = {
        EGA,

        // ---- Structural / line work ----
        OUTLINE: '#0b0a10',
        EDGE_HIGHLIGHT: '#c9bfa4',
        EDGE_SHADOW: '#1d1a24',
        PANEL_SEAM: '#4a4034',

        // ---- Masonry (castle, tower, keep) ----
        STONE_LIT: '#9a917f',
        STONE_BASE: '#7b7263',
        STONE_SHADOW: '#544d43',
        STONE_DEEP: '#332f29',
        MORTAR: '#413b33',

        // ---- Timber and joinery ----
        WOOD_LIT: '#8a6134',
        WOOD_BASE: '#6a4726',
        WOOD_SHADOW: '#422c18',
        WOOD_DEEP: '#2a1c0f',

        // ---- Foliage and landscape ----
        LEAF_LIT: '#5f9c46',
        LEAF_BASE: '#3f7431',
        LEAF_SHADOW: '#27501f',
        LEAF_DEEP: '#173414',
        GRASS_LIT: '#6aa84f',
        GRASS_BASE: '#4a8038',
        GRASS_SHADOW: '#2f5626',
        EARTH_LIT: '#8b6a45',
        EARTH_BASE: '#65492e',
        EARTH_SHADOW: '#41301e',

        // ---- Sky ramps (used as dither pairs, never as gradients) ----
        SKY_HIGH: '#2f5fa8',
        SKY_MID: '#5a8ecb',
        SKY_LOW: '#9fc4e4',
        SKY_HAZE: '#c9dcec',
        DUSK_HIGH: '#2a2350',
        DUSK_MID: '#6a4470',
        DUSK_LOW: '#c97a53',
        NIGHT_HIGH: '#0a0a20',
        NIGHT_MID: '#141a38',
        NIGHT_LOW: '#26304f',

        // ---- Water ----
        WATER_LIT: '#6fb4c9',
        WATER_BASE: '#3d7f9c',
        WATER_SHADOW: '#22506c',
        WATER_DEEP: '#132f45',

        // ---- Torch / hearth light ----
        FLAME_CORE: '#fff2b0',
        FLAME_MID: '#f4a437',
        FLAME_EDGE: '#c1541c',
        EMBER: '#7a2410',

        // ---- Sorcery accents (Morvane, wards, enchantments) ----
        ARCANE_BRIGHT: '#b98cff',
        ARCANE_MID: '#7a4fd0',
        ARCANE_DEEP: '#3b1f6e',
        VENOM: '#7fe36a',

        // ---- Treasure ----
        GOLD_LIT: '#ffe28a',
        GOLD_BASE: '#d9a441',
        GOLD_SHADOW: '#8a6516',
        SILVER_LIT: '#e6ecf2',
        SILVER_BASE: '#a9b3c0',
        SILVER_SHADOW: '#5f6a78',

        // ---- Sierra text window (AGI print box) ----
        WINDOW_PAPER: '#f4ecd8',
        WINDOW_BORDER: '#7a4a1f',
        WINDOW_INK: '#1b1408',
        WINDOW_HINT_DIM: '#7a6a52',
        WINDOW_BLUE: '#2a3f7a',

        // ---- HUD / status text ----
        TEXT_PRIMARY: '#FFFFFF',
        TEXT_ACCENT: '#FFFF55',
        TEXT_POSITIVE: '#8de06a',
        TEXT_NEGATIVE: '#FF8855',
        TEXT_MUTED: '#b6ab92',

        // ---- Player sprite ----
        // Rowan wears a hand-me-down forest tunic, brown hose and a red
        // travelling cap. Values here match the TUNIC_REMAP ramp applied in
        // js/engine.js drawPlayer.
        PLAYER: {
            tunic: '#3f6b3a',
            tunicHi: '#4f8046',
            tunicHi2: '#5d9151',
            tunicLo: '#33582f',
            tunicLo2: '#2a4a27',
            tunicDeep: '#20391f',
            tunicOutline: '#14210f',
            trim: '#e3d7b4',
            trimShadow: '#b6a883',
            hose: '#7a5a3c',
            hoseHi: '#96714d',
            hoseLo: '#5f462e',
            belt: '#3b2616',
            buckle: '#d9a441',
            pouch: '#7a4a1f',
            pouchStrap: '#4a2c11',
            boot: '#2f2015',
            bootDeep: '#1a1109',
            bootHi: '#553d26',
            skin: '#FFCC88',
            skinShadow: '#EEBB77',
            skinDeep: '#cc9955',
            hair: '#c0812f',
            hairDark: '#8a5518',
            hairHighlight: '#e0a94a',
            brow: '#8a5518',
            smile: '#994422',
            iris: '#4477CC',
            eyeWhite: '#F2F0E2',
            cap: '#a8321f',
            capHi: '#c8492c',
            capLo: '#761c0f',
            feather: '#f4ecd8',
            featherShadow: '#c2b79a',
            emblem: '#d9a441',
            emblemDark: '#8a6516'
        }
    };

    global.CQ_PALETTE = PALETTE;
})(typeof window !== 'undefined' ? window : globalThis);
