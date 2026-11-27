'use strict'

// Pure logic of "Add the strip to the configuration" (Lights > Advanced > zone order and extra strips).
// The service side (WorkshopService, branch service-ui-led-strip; docs: informes/rediseno-ui-service/arquitectura/CAMBIO-CONFIG-INCLUDE.md):
//   machine.led.get {}                       operator    -> {strips, pins: [{pin, free, dedicated, used_by: {file, line, text}|null}], types, next_strip, max_leds}
//   machine.led.preview {spec}               technician  -> {lines, files, warnings, errors: [{code, field, where}]}   (writes nothing)
//   machine.config.plan {kind, values:{spec}} technician -> {plan_id, files, warnings}
//   machine.config.apply {plan_id, kind}     level 3 confirmation (shown by api()) -> {applied, snapshot, restart_needed}
// spec = {strip, pin, leds, type: 'rgbw' | 'rgb'}

export const KIND_LED_STRIP = 'config.led_strip'
export const OPS_LED = Object.freeze({ get: 'machine.led.get', preview: 'machine.led.preview', plan: 'machine.config.plan', apply: 'machine.config.apply' })
export const DEFAULT_LEDS = 10
export const DEFAULT_TYPE = 'rgbw'

function obj(v) {
	return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
}

function list(v) {
	return Array.isArray(v) ? v : []
}

function where(w) {
	const o = obj(w)
	return o.file ? { file: String(o.file), line: Number(o.line) || 0, text: String(o.text || '') } : null
}

// machine.led.get as the page uses it
export function normalizeLed(raw) {
	const r = obj(raw)
	const types = list(r.types).map(x => String(obj(x).id || '')).filter(Boolean)
	return {
		pins: list(r.pins).map(p => ({ pin: String(obj(p).pin || ''), free: obj(p).free !== false, dedicated: obj(p).dedicated === true, usedBy: where(obj(p).used_by) })).filter(p => p.pin),
		types: types.length ? types : ['rgbw', 'rgb'],
		defaultType: String(r.default_type || DEFAULT_TYPE),
		nextStrip: Number.isInteger(Number(r.next_strip)) ? Number(r.next_strip) : null,
		maxLeds: Number(r.max_leds) > 0 ? Number(r.max_leds) : 400
	}
}

// the free pin to preselect: the dedicated connector first, then the first free one; '' when none is free
export function firstFreePin(pins) {
	const free = list(pins).filter(p => p.free)
	const d = free.find(p => p.dedicated)
	return d ? d.pin : free.length ? free[0].pin : ''
}

// machine.led.preview as the page uses it
export function normalizePreview(raw) {
	const r = obj(raw)
	return {
		lines: list(r.lines).map(String),
		files: list(r.files).map(String),
		warnings: list(r.warnings).map(String),
		errors: list(r.errors).map(e => ({ code: String(obj(e).code || obj(e).reason || 'values'), field: String(obj(e).field || ''), where: where(obj(e).where) }))
	}
}

// the refusal of the service (422 invalid_args) as a field error: ApiError.body.error = {reason, field, where, message}
export function errorOf(err) {
	const e = obj(obj(err && err.body).error)
	return { code: String(e.reason || e.code || (err && err.code) || 'error'), field: String(e.field || ''), where: where(e.where), message: String(e.message || (err && err.message) || '') }
}

// the spec sent to the service
export function buildSpec(d) {
	return { strip: Number(d.strip), pin: String(d.pin || ''), leds: Math.round(Number(d.leds)), type: d.type || DEFAULT_TYPE }
}

// the person can still change a field: is the draft complete enough to ask for the preview?
export function specReady(d, maxLeds) {
	const s = buildSpec(d)
	return Number.isInteger(s.strip) && s.strip >= 0 && !!s.pin && Number.isInteger(s.leds) && s.leds >= 1 && s.leds <= (maxLeds || 400)
}
