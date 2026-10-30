'use strict'

// RGBW -> approximate screen color (white adds to the three channels)
export function rgbwCss(c, brightness) {
	if (!c) {
		return '#000';
	}
	const k = (brightness == null ? 255 : brightness) / 255;
	const ch = v => Math.min(255, Math.round((v + (c.w || 0) * 0.8) * (0.25 + 0.75 * k)));
	return `rgb(${ch(c.r || 0)}, ${ch(c.u || 0)}, ${ch(c.b || 0)})`;
}
