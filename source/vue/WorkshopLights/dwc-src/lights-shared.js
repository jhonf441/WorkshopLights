'use strict'

// Helpers shared by the tabs of the Lights and status page (no user-visible
// texts here: every component keeps its own texts in its own `T` object).

export function copy(o) {
	return JSON.parse(JSON.stringify(o));
}

export function toHex(s) {
	return Array.from(new TextEncoder().encode(s)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// RGBW (the strip has a separate white LED) -> approximate screen colour of a
// LED (the white channel adds to the other three)
export function rgbwHex(c) {
	if (!c) {
		return '#000000';
	}
	const w = (c.w || 0) * 0.7;
	const ch = v => Math.min(255, Math.round((v || 0) + w)).toString(16).padStart(2, '0');
	return '#' + ch(c.r) + ch(c.u) + ch(c.b);
}

// Effects a state can have (see dsf/lights_config.py EFFECTS)
export const EFFECTS = ['steady', 'blink_slow', 'blink', 'blink_fast', 'double', 'pulse'];

// CSS class of an effect: the badge and the dots animate by themselves
export function effectClass(effect) {
	return 'lx-' + (EFFECTS.includes(effect) ? effect : 'steady');
}

// Colours of the zones in the strip drawing (identification)
export const ZONE_COLOR = { state: '#29b6f6', lighting: '#ffb300' };
export const ZONE_PALETTE = ['#b400ff', '#00dc5a', '#ff4081', '#ff6d00', '#ffee58', '#2979ff', '#00e5ff', '#8d6e63'];

// Board LEDs: colours of the Duet 3 6HC bill of materials (same order and
// colours as status_light.LEDS_PLACA_DEF)
export const BOARD_LEDS = [
	{ id: 'can', css: '#ff0000' },
	{ id: 'vin', css: '#0000ff' },
	{ id: 'v12', css: '#ff9600' },
	{ id: 'v5', css: '#ff0000' },
	{ id: 'v3_3', css: '#00ff00' }
];
