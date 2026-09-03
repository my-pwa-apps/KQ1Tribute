// Crown Quest metadata shared by the browser runtime and validation tools.
(function (root, factory) {
    const content = factory();
    if (typeof module === 'object' && module.exports) module.exports = content;
    else root.CrownQuestContent = content;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => ({
    game: {
        id: 'crown_quest',
        title: 'CROWN QUEST',
        shortTitle: 'Crown Quest',
        subtitle: 'A   F A N T A S Y   A D V E N T U R E',
        creditsLine: 'A modern tribute to Sierra On-Line adventure games',
        inspirationLine: 'Inspired by King\'s Quest I, II and III (1984-1986)',
        copyright: '\u00A9 2026',
        storagePrefix: 'crownquest',
        // Highest score actually achievable in a single playthrough, verified by
        // tests/full-game.spec.js. Keep this in sync when scoring opportunities
        // change, otherwise the status bar advertises points nobody can earn.
        maxScore: 250,
        startRoom: 'scullery',
        startX: 300,
        startY: 322,
        victory: {
            headline: 'LONG LIVE THE KING!',
            subhead: 'Alderhaven is whole again.',
            ranks: [
                { min: 0.95, title: 'Rowan the Unbroken, First of His Name', flavor: 'The ballads will be insufferable. You have earned every verse.' },
                { min: 0.80, title: 'Rowan the Bold', flavor: 'Three treasures, one sorcerer, and not a single wasted step.' },
                { min: 0.60, title: 'Rowan the Fortunate', flavor: 'The realm is saved. Some of it was even on purpose.' },
                { min: 0.35, title: 'Rowan the Stubborn', flavor: 'You did it the hard way, and the hard way remembers you.' },
                { min: 0, title: 'Rowan, Formerly of the Scullery', flavor: 'A crown sits oddly on a head that spent years under a cupboard.' }
            ],
            closingLines: [
                'From the sorcerer\'s scullery to the throne of Alderhaven...',
                'They will tell this one by the fire for a hundred winters.'
            ]
        }
    },
    items: [
        { id: 'bread', name: 'Crust of Bread', description: 'A heel of black bread, hard enough to shoe a horse. A goat would not be fussy.' },
        { id: 'pail', name: 'Wooden Pail', description: 'A battered wooden pail with an iron hoop. You have carried a great deal of water in this.' },
        { id: 'sea_salt', name: 'Pinch of Sea Salt', description: 'Coarse grey salt from the crag\'s own tide pools. The scullery keeps a crock of it.' },
        { id: 'brass_key', name: 'Brass Key', description: 'A small brass key, warm from lying under the hourglass. It opens something Morvane would rather you never saw.' },
        { id: 'raven_feather', name: 'Raven Feather', description: 'A long black feather from Corvus. Held to the light it shows a faint, unpleasant green.' },
        { id: 'spellbook', name: 'Morvane\'s Spellbook', description: 'A thin, evil-tempered book. Only one page will let you read it: STORM IN A THIMBLE — a feather of a black bird, a pinch of salt from the sea, spoken over a circle of chalk.' },
        { id: 'thimble', name: 'Thimble of Storms', description: 'A pewter thimble. Something inside it is furious and very small, and would dearly like to be a gale.' },
        { id: 'rope', name: 'Coil of Rope', description: 'Twenty feet of good hemp rope, smelling of tar and Hattie\'s cart.' },
        { id: 'parchment', name: 'Scrap of Parchment', description: 'Nailed to an oak and weathered nearly blank. One word survives, written backwards in a spidery hand: EBRAHDNEM.' },
        { id: 'ring_of_mist', name: 'Ring of Mist', description: 'A plain grey band that is somehow difficult to look directly at. Fennow says it will make a person no more visible than weather.' },
        { id: 'chest_of_cormac', name: 'Chest of Cormac', description: 'The first treasure of Alderhaven: a small oak chest bound in gold, heavier than any chest its size has any right to be.' },
        { id: 'shield_of_ardor', name: 'Shield of Ardor', description: 'The second treasure of Alderhaven: a round shield of white metal that is faintly, patiently warm.' },
        { id: 'mirror_of_ianthe', name: 'Mirror of Ianthe', description: 'The third treasure of Alderhaven: a hand mirror in a gold frame. It shows you a moment later than you are.' }
    ],
    // Shared progression rules. Dialog trees and room hotspots both reach these
    // transactions, so they must have exactly one implementation.
    rules: {
        /** Fill or empty the pail, keeping the item text honest about its state. */
        setPailWater(e, filled) {
            e.setFlag('pail_full', filled);
            e.items['pail'].name = filled ? 'Pail of Water' : 'Wooden Pail';
            e.items['pail'].description = filled
                ? 'A battered wooden pail, brim full of cold well water and slopping over your boots.'
                : 'A battered wooden pail with an iron hoop. You have carried a great deal of water in this.';
            e.updateInventoryUI();
        },
        /** The goat follows Rowan from room to room once it has been bribed. */
        leadGoat(e) {
            if (e.getFlag('goat_follows')) return;
            e.removeFromInventory('bread');
            e.setFlag('goat_follows');
            e.addScore(5);
            e.updateInventoryUI();
        },
        /** Fennow's gift, reachable from both the snare hotspot and his dialog. */
        giveRingOfMist(e) {
            if (e.getFlag('has_ring')) return;
            e.setFlag('has_ring');
            e.addToInventory('ring_of_mist');
            e.addScore(10);
            e.sound.magicChime();
            e.updateInventoryUI();
        },
        /** The gnome yields the first treasure once his name is spoken aloud. */
        nameTheGnome(e) {
            if (e.getFlag('gnome_named')) return;
            e.setFlag('gnome_named');
            e.addToInventory('chest_of_cormac');
            e.addScore(25);
            e.sound.scoreUp();
            e.updateInventoryUI();
        }
    }
})));
