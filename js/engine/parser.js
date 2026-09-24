// ============================================================
// CROWN QUEST ENGINE - PARSER
// The AGI-style command parser: verbs, prepositions, nouns and synonyms.
// These methods extend GameEngine.prototype; js/engine.js owns the state.
// ============================================================

GameEngine.extend({
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
            this.showMessage('Try LOOK, GET object, USE object ON object, GIVE object TO someone, PUT object IN something, WEAR, FILL, SAY words, TALK TO person, INVENTORY, HINT, SAVE, RESTORE. F8 sets text speed, F10 toggles enhanced mode.');
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

        const parsed = this.parseVerbPhrase(this.normalizeParserText(original, true));
        if (!parsed) {
            this.showMessage(this.parserConfusion(command));
            return;
        }
        const room = this.rooms[this.currentRoomId];
        const roomVerb = (verb) => room && room.verbs && Object.hasOwn(room.verbs, verb) ? room.verbs[verb] : null;
        const runRoomVerb = (verb, ...args) => {
            const handler = roomVerb(verb);
            if (!handler) return false;
            this.runContentHandler(`${this.currentRoomId} ${verb}`, handler, this.actionScope, ...args);
            return true;
        };
        // An item used on its own ("wear ring", "fill pail") asks the item.
        const useItemAlone = (item, verb) => {
            const handler = this.items[item.id] && (this.items[item.id][verb] || this.items[item.id].use);
            if (!handler) return false;
            this.runContentHandler(`${item.id} ${verb}`, handler, this.actionScope);
            return true;
        };
        const actOn = (hotspot, verb) => {
            const previousAction = this.currentAction;
            const previousItem = this.selectedItem;
            this.currentAction = verb;
            this.selectedItem = null;
            this.performAction(hotspot);
            this.currentAction = previousAction;
            this.selectedItem = previousItem;
        };

        if (parsed.verb === 'say') {
            if (!parsed.text) { this.showMessage('Say what? Words count for a great deal in some places.'); return; }
            if (!runRoomVerb('say', parsed.text)) this.showMessage(`"${parsed.text.toUpperCase()}," you say. Nothing here seems to have been waiting to hear it.`);
            return;
        }
        if (['cast', 'sail', 'hide'].includes(parsed.verb) && !parsed.object) {
            if (runRoomVerb(parsed.verb)) return;
            const refusals = {
                cast: 'You wave your hands in a way you have seen done. Magic, it turns out, wants more than waving.',
                sail: 'There is nothing here to sail.',
                hide: 'There is nowhere here worth hiding, and nothing here worth hiding from. Yet.'
            };
            this.showMessage(refusals[parsed.verb]);
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
            } else if (target && target.use && (parsed.downward || ['climb', 'enter', 'descend', 'ascend', 'move'].includes(parsed.word))) {
                actOn(target, 'use');
            } else {
                this.showMessage("You'll have to steer your feet yourself.");
            }
            return;
        }

        if (['cast', 'sail', 'hide'].includes(parsed.verb)) {
            const target = this.findParserHotspot(parsed.object);
            if (target) actOn(target, 'use');
            else if (!runRoomVerb(parsed.verb)) this.showMessage(this.parserCantSee(parsed.object));
            return;
        }

        if (['give', 'put', 'wear', 'fill'].includes(parsed.verb)) {
            const item = this.findParserItem(parsed.object);
            if (item) {
                if ((parsed.verb === 'wear' || parsed.verb === 'fill') && useItemAlone(item, parsed.verb)) return;
                const ask = { give: `${parsed.word} ${item.name} to whom?`, put: `${parsed.word} ${item.name} where?`, wear: `You can't wear ${item.name}.`, fill: `Fill ${item.name} from what?` };
                this.showMessage(ask[parsed.verb].charAt(0).toUpperCase() + ask[parsed.verb].slice(1));
                return;
            }
            const target = this.findParserHotspot(parsed.object);
            if (target && parsed.verb === 'give') { this.showMessage(`${parsed.word.charAt(0).toUpperCase() + parsed.word.slice(1)} ${target.name} with what?`); return; }
            this.showMessage(target ? `You don't have ${target.name}.` : this.parserCantSee(parsed.object));
            return;
        }

        if (parsed.verb === 'use' && parsed.instrument && parsed.object) {
            let item = this.findParserItem(parsed.instrument);
            let hotspot = this.findParserHotspot(parsed.object);
            // "use chest with key" names them the other way round.
            if (!item && this.findParserItem(parsed.object)) {
                item = this.findParserItem(parsed.object);
                hotspot = this.findParserHotspot(parsed.instrument);
            }
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
                if (useItemAlone(item, 'use')) return;
                this.selectedItem = item.id;
                this.setAction('use');
                this.selectedItem = item.id;
                this.showMessage(`Use ${item.name} on what?`);
                return;
            }
        }

        const hotspot = this.findParserHotspot(parsed.object);
        if (hotspot) {
            actOn(hotspot, parsed.verb);
            return;
        }

        const item = this.findParserItem(parsed.object);
        if (item && parsed.verb === 'look') {
            this.showItemCloseUp(item);
            return;
        }

        this.showMessage(this.parserCantSee(parsed.object));
    },

    parserConfusion(command) {
        const replies = [
            "That sentence would baffle even a vintage parser, and those things once argued with toddlers.",
            "You can't do that. The game checked twice, then looked embarrassed for you.",
            "The parser considers your request, files it under 'bold but unhelpful,' and moves on.",
            "Try a verb the universe currently supports. LOOK, GET, USE, TALK, and WALK are feeling cooperative."
        ];
        const idx = command.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % replies.length;
        return replies[idx];
    },

    parserNeedsObject(verb) {
        const labels = { look: 'look at', get: 'get', use: 'use', talk: 'talk to', walk: 'walk to' };
        return `${labels[verb] || verb} what? Be specific. The parser is old-fashioned, not psychic.`;
    },

    parserCantSee(objectName) {
        return `You don't see any ${objectName} here. If it is invisible, it is also unhelpful.`;
    },

    normalizeParserText(text, keepPrepositions = false) {
        const filler = keepPrepositions ? /\b(the|a|an|please|some|my|your|his|her|its)\b/g : /\b(the|a|an|at|to|with|please)\b/g;
        return text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(filler, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /** Drop a leading preposition so "under hourglass" names the hourglass. */
    parserNoun(phrase) {
        return (phrase || '').replace(/^(?:(?:at|to|with|in|into|inside|on|onto|under|underneath|behind|beneath|down|up|over|for|about|from|off|around|through|out|of)\s+)+/, '').trim();
    },

    /** Parse an AGI-style sentence. Prepositions are kept so two-object forms
     *  ("give bread to goat", "unlock chest with key", "pour water on fire")
     *  resolve to the same item-on-object dispatch the pointer interface uses. */
    parseVerbPhrase(command) {
        const verbAliases = {
            look: 'look', examine: 'look', inspect: 'look', read: 'look', search: 'look', smell: 'look', listen: 'look', check: 'look', peer: 'look', view: 'look', peek: 'look', scan: 'look', study: 'look', watch: 'look',
            get: 'get', take: 'get', grab: 'get', pick: 'get', pickup: 'get', steal: 'get', acquire: 'get', collect: 'get', retrieve: 'get', snag: 'get', pocket: 'get', obtain: 'get',
            talk: 'talk', speak: 'talk', ask: 'talk', chat: 'talk', converse: 'talk', hail: 'talk', greet: 'talk', question: 'talk', interview: 'talk',
            use: 'use', open: 'use', unlock: 'use', pry: 'use', cut: 'use', push: 'use', press: 'use', touch: 'use', drink: 'use', eat: 'use', shoot: 'use', fire: 'use', activate: 'use', apply: 'use', operate: 'use', turn: 'use', switch: 'use', pull: 'use', flip: 'use',
            lift: 'use', raise: 'use', tilt: 'use', shift: 'use', slide: 'use', tug: 'use', yank: 'use', hold: 'use', brandish: 'use', aim: 'use', point: 'use', reflect: 'use',
            free: 'use', untie: 'use', release: 'use', rescue: 'use', unhook: 'use', loosen: 'use', unsnare: 'use',
            douse: 'use', extinguish: 'use', quench: 'use', knock: 'use',
            give: 'give', feed: 'give', offer: 'give', hand: 'give', show: 'give', bribe: 'give',
            put: 'put', place: 'put', set: 'put', lay: 'put', drop: 'put', insert: 'put', throw: 'put', toss: 'put', pour: 'put', splash: 'put', tie: 'put', attach: 'put', fasten: 'put', hang: 'put', sprinkle: 'put', scatter: 'put', fit: 'put', return: 'put',
            wear: 'wear', don: 'wear',
            fill: 'fill', dip: 'fill',
            hide: 'hide', duck: 'hide', crouch: 'hide',
            say: 'say', utter: 'say', answer: 'say', guess: 'say', whisper: 'say', recite: 'say',
            cast: 'cast', invoke: 'cast', incant: 'cast', conjure: 'cast',
            sail: 'sail', row: 'sail', launch: 'sail',
            go: 'walk', walk: 'walk', enter: 'walk', run: 'walk', step: 'walk', move: 'walk', climb: 'walk', travel: 'walk', head: 'walk', descend: 'walk', ascend: 'walk', leave: 'walk', exit: 'walk'
        };
        const words = command.split(' ');
        const word = words[0];
        let verb = verbAliases[word];
        if (!verb) return null;
        let rest = words.slice(1).join(' ').trim();
        if (word === 'pick' && /^up\b/.test(rest)) rest = rest.slice(2).trim();
        if (verb === 'put' && /^on\b/.test(rest)) { verb = 'wear'; rest = rest.slice(2).trim(); }
        if (word === 'turn' && /^over\b/.test(rest)) rest = rest.slice(4).trim();
        if (verb === 'say') return { verb, word, object: rest, text: rest };
        if (!rest) return { verb, word, object: '' };
        if (verb === 'talk') return { verb, word, object: this.parserNoun(rest.replace(/\s+(?:for|about|of|regarding)\s+.*$/, '')) };

        const splitOn = (re) => {
            const match = rest.match(re);
            if (!match) return null;
            return [this.parserNoun(rest.slice(0, match.index)), this.parserNoun(rest.slice(match.index + match[0].length))];
        };
        if (verb === 'give') {
            const pair = splitOn(/\s+to\s+/) || splitOn(/\s+with\s+/)?.reverse();
            if (pair) return { verb: 'use', word, instrument: pair[0], object: pair[1] };
            return { verb: 'give', word, object: this.parserNoun(rest) };
        }
        if (verb === 'put') {
            const pair = splitOn(/\s+(?:in|into|inside|on|onto|to|over|at|under|around|across|down)\s+/);
            if (pair && pair[0] && pair[1]) return { verb: 'use', word, instrument: pair[0], object: pair[1] };
            return { verb: 'put', word, object: this.parserNoun(rest) };
        }
        if (verb === 'fill') {
            const pair = splitOn(/\s+(?:with|from|in|at)\s+/);
            if (pair && pair[0] && pair[1]) return { verb: 'use', word, instrument: pair[0], object: pair[1] };
            return { verb: 'fill', word, object: this.parserNoun(rest) };
        }
        if (verb === 'use') {
            const on = splitOn(/\s+(?:on|onto|in|into|to|at|toward|towards)\s+/);
            if (on && on[0] && on[1]) return { verb, word, instrument: on[0], object: on[1] };
            const withItem = splitOn(/\s+with\s+/);
            if (withItem && withItem[0] && withItem[1]) return { verb, word, instrument: withItem[1], object: withItem[0] };
        }
        return { verb, word, object: this.parserNoun(rest), downward: /^(?:down|into|in|inside|behind|under|beneath)\b/.test(rest) };
    },

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
    },

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
    },

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
    },

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
    },

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
    },

    describeInventory() {
        if (!this.inventory.length) {
            this.showMessage('You are carrying nothing.');
            return;
        }
        const names = this.inventory.map(id => this.items[id]?.name || id).join(', ');
        this.showMessage(`You are carrying: ${names}.`);
    }
});
