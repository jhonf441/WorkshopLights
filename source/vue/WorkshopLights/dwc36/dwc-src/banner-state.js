'use strict'

// The page bar of Lights and status (2026-11-03): ONE state chip (a dot of the color of the status light + a short phrase) and ONE
// outputs chip ("Outputs: 2 of 3" that opens the list of the three outputs). The decisions are here, pure: no Vue, no store, no i18n.
// Texts are keys of the catalog of the plugin (plugins.WorkshopLights.<section>.<key>) that the page translates; the name of a state
// comes already translated by the service. Both DWC lines carry this file byte for byte (dwc36/test/banner-state.test.js checks it).

// a key of the catalog of the plugin, by section and name
function key(section, name) {
	return 'plugins.WorkshopLights.' + section + '.' + name
}

// lightState(ind, lightOn): what the status light shows now, in one line.
//   ind     = plugin data statusIndicator of the service ({ state: { id, name, hex, effect }, active: [...], reason, test }), or null
//   lightOn = plugin data lightOn (the work light is on)
// Answers { hex, key, params, text, names, reason }: the phrase is t(key, params) when `key` is set, else `text` (the name of the state
// as the service says it); `hex` is the LED color of the state (null = nothing lit: a neutral dot); `names` the active states and
// `reason` the sentence of the service, both for the tooltip.
export function lightState(ind, lightOn) {
	const st = ind && ind.state
	if (!st) {
		return { hex: null, key: key('stateBadge', 'no_status_light_data'), params: {}, text: '', names: [], reason: '' }
	}
	// the automatic status is off and the zone stands for the work light (service status_light: state id 'lighting')
	if (st.id === 'lighting') {
		return lightOn
			? { hex: st.hex || null, key: key('lights', 'banner_lighting_auto_off'), params: {}, text: '', names: [], reason: '' }
			: { hex: null, key: key('lights', 'banner_lights_off'), params: {}, text: '', names: [], reason: '' }
	}
	const active = Array.isArray(ind.active) ? ind.active : []
	const more = Math.max(0, active.length - 1)
	const k = ind.test ? key('lights', 'banner_state_test') : more > 0 ? key('lights', 'banner_state_more') : ''
	return { hex: st.hex || null, key: k, params: { name: st.name, n: more }, text: st.name || '', names: active.map(a => a.name), reason: ind.reason || '' }
}

// outputsSummary(form, plugins): the three outputs of the status and which ones are in use.
//   form    = the configuration of the page (strip.present, leds_board.active)
//   plugins = { bar, jog }: the plugins the on-screen indicator also shows in; the help names them only when they are there
// Answers { active, total, items: [{ id, on, icon, labelKey, helpKey }] } with the texts the chips of the bar used to carry.
export function outputsSummary(form, plugins) {
	const f = form || {}
	const p = plugins || {}
	const strip = !!(f.strip && f.strip.present)
	const board = !!(f.leds_board && f.leds_board.active)
	const items = [
		{ id: 'strip', on: strip, icon: 'mdi-led-strip-variant', labelKey: strip ? key('common', 'led_strip') : key('lights', 'no_led_strip'), helpKey: key('lights', 'output_1_the_led_strip_connected') },
		{ id: 'screen', on: true, icon: 'mdi-monitor-dashboard', labelKey: key('common', 'on_screen_indicator'), helpKey: key('lights', 'output_2_the_indicator_of_this' + (p.bar ? '' : '_no_bar') + (p.jog ? '' : '_no_jog')) },
		{ id: 'board', on: board, icon: 'mdi-chip', labelKey: board ? key('common', 'board_leds') : key('lights', 'board_leds_off'), helpKey: key('lights', 'output_3_a_copy_of_the') }
	]
	return { active: items.filter(x => x.on).length, total: items.length, items }
}
