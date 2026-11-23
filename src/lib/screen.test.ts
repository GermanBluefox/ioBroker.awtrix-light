/// <reference types="mocha" />
// mocha runs this (test:ts); its types come with @iobroker/testing, node:assert instead of chai (no types)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COMMANDS, HELP } from './help';
import { errorText, matchScreen, showApp, type Screen } from './screen';

const SCREEN: Screen = { id: 'awtrix-light.0', name: 'awtrix_ab12cd', online: true, kinds: ['text'] };

describe('help', () => {
    it('lists every command of onMessage once', () => {
        const source = readFileSync(join(__dirname, '..', 'awtrix-light.ts'), 'utf8');
        const start = source.indexOf('private onMessage(');
        const end = source.indexOf('private async setApiConnected(');
        const names = [...source.slice(start, end).matchAll(/command === '([^']+)'/g)].map(m => m[1]);
        assert.deepEqual(COMMANDS.map(c => c.command).sort(), [...new Set(names)].sort());
    });

    it('marks the commands of the shared catalog and names them', () => {
        const marked = Object.fromEntries(COMMANDS.filter(c => c.standard).map(c => [c.command, c]));
        assert.deepEqual(Object.keys(marked), ['getScreens', 'show', 'hide']);
        for (const [command, c] of Object.entries(marked)) {
            assert.equal(c.standard, `screen.${command}`);
            assert.equal(c.write, command !== 'getScreens');
            assert.ok(HELP.includes(c.standard), c.standard);
            assert.ok(HELP.includes(`- ${command} {`), `- ${command} {`);
        }
    });
});

describe('screen.show', () => {
    it('makes a notification of a text', () => {
        assert.deepEqual(showApp({ kind: 'text', text: 'Waschmaschine fertig' }, SCREEN), {
            app: { text: 'Waschmaschine fertig' },
        });
        const { app } = showApp(
            { kind: 'text', text: 'Tür offen', title: 'Flur', icon: '1234', seconds: 20, severity: 'warning' },
            SCREEN,
        );
        assert.deepEqual(app, { text: 'Flur: Tür offen', icon: '1234', duration: 20, color: '#FFFF00' });
    });

    it('holds the text with seconds 0, an alert in red and on a dark display', () => {
        const { app } = showApp(
            { kind: 'text', text: 'Rauch', seconds: 0, severity: 'alert', screen: 'AWTRIX_ab12cd' },
            SCREEN,
        );
        assert.deepEqual(app, { text: 'Rauch', hold: true, color: '#FF0000', wakeup: true });
    });

    it('passes the options of notification on, the own color wins', () => {
        const { app } = showApp(
            { kind: 'text', text: 'x', severity: 'alert', color: '#00FF00', rainbow: true, repeat: 0, sound: null },
            SCREEN,
        );
        assert.deepEqual(app, { text: 'x', color: '#00FF00', rainbow: true, wakeup: true });
    });

    it('refuses with the codes of the catalog', () => {
        const reason = (message: Record<string, unknown>): string | undefined => showApp(message, SCREEN).error?.reason;
        assert.equal(reason({ text: 'x' }), 'BAD_REQUEST');
        assert.equal(reason({ kind: 'text' }), 'BAD_REQUEST');
        assert.equal(reason({ kind: 'image', image: 'https://x/y.png' }), 'NOT_SUPPORTED');
        assert.equal(reason({ kind: 'text', text: 'x', severity: 'loud' }), 'BAD_REQUEST');
        assert.equal(reason({ kind: 'text', text: 'x', seconds: -1 }), 'BAD_REQUEST');
        assert.equal(reason({ kind: 'text', text: 'x', screen: 'awtrix-light.1' }), 'NOT_FOUND');
        assert.equal(reason({ kind: 'text', text: 'x', room: 'enum.rooms.kitchen' }), 'NOT_SUPPORTED');
        assert.deepEqual(showApp({ kind: 'text', text: 'x', screen: 'nope' }, SCREEN).error?.candidates, [
            'awtrix_ab12cd',
        ]);
    });
});

describe('screen.hide', () => {
    it('takes this clock by id or name, or none', () => {
        assert.equal(matchScreen({}, SCREEN), null);
        assert.equal(matchScreen({ screen: 'awtrix-light.0' }, SCREEN), null);
        assert.equal(matchScreen({ screen: 'kitchen' }, SCREEN)?.reason, 'NOT_FOUND');
    });

    it('answers the text of a failed request, never the error object with the credentials', () => {
        const error = Object.assign(new Error('Request failed with status code 401'), {
            config: { auth: { username: 'u', password: 'secret' } },
        });
        assert.equal(errorText(error), 'Request failed with status code 401');
        assert.equal(errorText('timeout'), 'timeout');
    });
});
