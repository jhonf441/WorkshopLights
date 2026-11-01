// profile-exchange.js -- the lighting profile as a file of the exchange standard (docs-internal/DATA-EXCHANGE.md): its format, and the
// preview a person sees before the file is loaded. Pure: the texts come in as arguments, so it is the same file on both DWC lines
// and testable with node --test (vue/WorkshopLights/test/profile-exchange.test.js).
'use strict'

export const PROFILE_FORMAT = 'workshop-lights-profile'
export const PROFILE_VERSION = 1
export const PROFILE_PLUGIN = 'WorkshopLights'
export const PROFILE_SPEC = { format: PROFILE_FORMAT, versions: [PROFILE_VERSION], plugins: [PROFILE_PLUGIN] }

// What a profile has to hold: the keys WorkshopService (lights.import) looks for. The service has the last word; this only
// keeps a file that is plainly not a profile from reaching it.
const PROFILE_KEYS = ['states', 'mode_colors', 'light_color', 'animation', 'effects']

function count(v) {
	if (Array.isArray(v)) return v.length
	return v && typeof v === 'object' ? Object.keys(v).length : 0
}

export function isProfile(data) {
	return !!data && typeof data === 'object' && !Array.isArray(data) && PROFILE_KEYS.some(k => k in data)
}

// The preview of a file that was read: what it holds and what would be loaded. It changes nothing.
// labels: { states, scenes, night, nightOn, nightOff, hardware, hardwareLoaded, hardwareKept, notProfile }
export function profilePreview(data, withHardware, labels) {
	if (!isProfile(data)) return { rows: [], blockers: [labels.notProfile] }
	const rows = []
	if ('states' in data) rows.push({ label: labels.states, value: String(count(data.states)) })
	if (data.work_light && data.work_light.scenes) rows.push({ label: labels.scenes, value: String(count(data.work_light.scenes)) })
	if (data.night && typeof data.night === 'object') rows.push({ label: labels.night, value: data.night.enabled ? labels.nightOn : labels.nightOff })
	rows.push({ label: labels.hardware, value: withHardware ? labels.hardwareLoaded : labels.hardwareKept })
	return { rows }
}
