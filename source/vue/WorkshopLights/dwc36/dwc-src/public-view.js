'use strict'

// Note 8 of the owner (2026-11-23): the state of the lights is reading, so anybody at the machine sees it, with or without a session.
// The service publishes a sanitized read-only view as plugin data `lightsView` (WorkshopService docs/PUBLIC-STATE.md, version 1); signed
// out, lights.get answers 401, so the summary is painted from that view. Pure: the view -> the parts of the page form the summary reads,
// on top of `base` (the empty form). What the view does not carry keeps the value of `base`. This form is never saved: saving needs a
// session and the save bar is not shown without one.

const SIDES = ['duet', 'pi']

function color(c) {
	const o = c && typeof c === 'object' ? c : {}
	return { r: Number(o.r) || 0, u: Number(o.u) || 0, b: Number(o.b) || 0, w: Number(o.w) || 0, p: o.p == null ? 255 : Number(o.p) || 0 }
}

function zone(z) {
	return { id: String((z && z.id) || ''), name: String((z && z.name) || ''), on: !!(z && z.on), color: color(z && z.color) }
}

function hhmm(v, fallback) {
	return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : fallback
}

// view (lightsView) + base (a form) -> a new form, or null when there is no view of a version this page reads
export function formFromPublicView(view, base) {
	if (!view || typeof view !== 'object' || view.v !== 1) return null
	const c = JSON.parse(JSON.stringify(base || {}))
	c.strip = Object.assign({}, c.strip, { present: !!view.strip })
	if (SIDES.indexOf(view.output) >= 0) c.output = Object.assign({}, c.output, { kind: view.output })
	const wl = view.work_light && typeof view.work_light === 'object' ? view.work_light : {}
	const wlBase = c.work_light || {}
	c.work_light = Object.assign({}, wlBase, {
		scene: typeof wl.scene === 'string' ? wl.scene : '',
		scenes: Array.isArray(wl.scenes) ? wl.scenes.map(s => ({ id: String((s && s.id) || ''), name: String((s && s.name) || ''), color: color(s && s.color) })) : [],
		auto_on_job: !!wl.auto_on_job,
		auto_off: Object.assign({}, wlBase.auto_off, { enabled: !!wl.auto_off })
	})
	c.zones_extra = Array.isArray(view.zones) ? view.zones.map(zone) : []
	c.strips_extra = Array.isArray(view.strips)
		? view.strips.map(t => ({ id: String((t && t.id) || ''), name: String((t && t.name) || ''), output: SIDES.indexOf(t && t.output) >= 0 ? t.output : 'duet', zones: Array.isArray(t && t.zones) ? t.zones.map(zone) : [] }))
		: []
	if (view.night && typeof view.night === 'object') {
		const n = c.night || {}
		c.night = Object.assign({}, n, { enabled: !!view.night.enabled, from: hhmm(view.night.from, n.from), to: hhmm(view.night.to, n.to), level: Number.isFinite(Number(view.night.level)) ? Number(view.night.level) : n.level })
	}
	c.leds_board = Object.assign({}, c.leds_board, { active: !!view.leds_board })
	c.power = Object.assign({}, c.power, { limit_ma: Math.max(0, Number(view.power_limit_ma) || 0) })
	return c
}
