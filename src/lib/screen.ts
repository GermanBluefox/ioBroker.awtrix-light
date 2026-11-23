import type { AwtrixApi } from './api';

/**
 * The commands of the family "screen" of the shared catalog of ioBroker.assistant (its HELP.md), mapped onto the
 * notification of the firmware: show {kind: 'text'} → /api/notify, hide → /api/notify/dismiss.
 */

/** What show can put on the clock */
export const SCREEN_KINDS = ['text'];

/** Every kind of the catalog; the others are answered with NOT_SUPPORTED */
const CATALOG_KINDS = ['image', 'url', 'camera', 'chart', 'text', 'view', 'place', 'qr'];

/** Fields of the catalog that are not passed on to the firmware as they are */
const CATALOG_FIELDS = ['kind', 'screen', 'room', 'seconds', 'severity', 'title'];

/** The text color of a severity, when the message gives none */
const SEVERITY_COLORS: Record<string, string> = { warning: '#FFFF00', alert: '#FF0000' };

export type ScreenError = { error: string; reason: string; candidates?: string[] };

/** The clock of this instance as screen.getScreens lists it */
export type Screen = { id: string; name: string; online: boolean; kinds: string[] };

/**
 * The notification of a catalog show {kind: 'text', text, icon?, severity?, seconds?, title?, screen?, room?}.
 *
 * @param message the message of show
 * @param screen this clock
 */
export function showApp(message: Record<string, any>, screen: Screen): { app?: AwtrixApi.App; error?: ScreenError } {
    const kind = typeof message.kind === 'string' ? message.kind.trim() : '';
    if (!kind) {
        return { error: { error: 'kind missing: text', reason: 'BAD_REQUEST' } };
    }
    if (kind !== 'text') {
        return {
            error: {
                error: CATALOG_KINDS.includes(kind)
                    ? `the clock cannot show the kind "${kind}", only text`
                    : `unknown kind "${kind}": text`,
                reason: 'NOT_SUPPORTED',
            },
        };
    }
    const failure = matchScreen(message, screen);
    if (failure) {
        return { error: failure };
    }
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    if (!text) {
        return { error: { error: 'text missing', reason: 'BAD_REQUEST' } };
    }
    // Options of the firmware (color, repeat, rainbow, sound, stack, wakeup ...) pass on, as with notification
    const app: AwtrixApi.App & Record<string, unknown> = Object.fromEntries(
        Object.entries(message).filter(([key, v]) => v !== null && !CATALOG_FIELDS.includes(key)),
    );
    const title = typeof message.title === 'string' ? message.title.trim() : '';
    app.text = title ? `${title}: ${text}` : text;
    if (message.severity !== undefined) {
        const severity = String(message.severity);
        if (!['info', 'warning', 'alert'].includes(severity)) {
            return {
                error: { error: `unknown severity "${severity}": info, warning or alert`, reason: 'BAD_REQUEST' },
            };
        }
        if (SEVERITY_COLORS[severity] && app.color === undefined) {
            app.color = SEVERITY_COLORS[severity];
        }
        if (severity === 'alert' && app.wakeup === undefined) {
            // an alert switches the display on
            app.wakeup = true;
        }
    }
    if (message.seconds !== undefined && message.seconds !== null && message.seconds !== '') {
        const seconds = Number(message.seconds);
        if (!Number.isFinite(seconds) || seconds < 0) {
            return { error: { error: 'seconds must be 0 or more', reason: 'BAD_REQUEST' } };
        }
        if (seconds === 0) {
            // until hide (or the middle button)
            app.hold = true;
        } else {
            app.duration = seconds;
        }
    }
    // as notification: repeat and duration <= 0 are left out
    if (app.repeat !== undefined && app.repeat <= 0) {
        delete app.repeat;
    }
    if (app.duration !== undefined && app.duration <= 0) {
        delete app.duration;
    }
    return { app };
}

/**
 * Whether the screen (and room) of a message mean this clock: one instance is one clock.
 *
 * @param message the message of show or hide
 * @param screen this clock
 * @returns the failure, or null
 */
export function matchScreen(message: Record<string, any>, screen: Screen): ScreenError | null {
    const wanted = typeof message.screen === 'string' ? message.screen.trim().toLowerCase() : '';
    if (wanted) {
        return wanted === screen.id.toLowerCase() || wanted === screen.name.toLowerCase()
            ? null
            : { error: `no clock "${message.screen}" in ${screen.id}`, reason: 'NOT_FOUND', candidates: [screen.name] };
    }
    if (typeof message.room === 'string' && message.room.trim()) {
        return {
            error: 'the clock has no room: give screen (see getScreens)',
            reason: 'NOT_SUPPORTED',
            candidates: [screen.name],
        };
    }
    return null;
}

/**
 * The text of a failed request, never the error object: an AxiosError carries the HTTP credentials of the device.
 *
 * @param error what the request rejected with
 */
export function errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
