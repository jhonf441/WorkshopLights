'use strict';

// Rows of the start-up card of Lights (vue/_shared/StartupPanel.vue): what the page expects from the machine of
// whoever installs it. Pure function (no imports): tests/startup-plugins.test.js loads it in node.
// A machine without strip is grey ("does not apply"), never an error. The labels are keys of
// plugins.WorkshopLights.startup.*. The light macros belong to the control bar and the jog (the strip is driven by the
// service API, not by macros), so there are no file rows here.
//
// c = { cargado, hayTira, tipoSalida: 'duet' | 'pi', m950Linea: string | null, pinPi: number | null, ledsPlaca: bool }
//   (the SAVED configuration, the one in effect; m950Linea = the M950 line of config.g that the service found)
export function rowsLights(c) {
	if (!c || !c.loaded) return []; // the service did not answer yet: nothing to say (no false red)
	const has = !!c.hasStrip;
	const pi = c.kindOutput === 'pi';
	return [
		{ id: 'strip', state: has ? 'configured' : 'na', label: 'row_strip', what: 'row_strip_what', why: 'row_strip_for', ifMissing: 'row_strip_missing', help: 'row_strip_tip', texts: { configured: 'strip_on', na: 'strip_none' } },
		// strip painted by the Duet: its M950 line in config.g gives the output and the LED count
		{ id: 'm950', applies: has && !pi, state: c.m950Line ? 'configured' : 'missing', label: 'row_m950', what: 'row_m950_what', why: 'row_m950_for', ifMissing: 'row_m950_missing', help: 'row_m950_tip', texts: { configured: 'm950_ok', missing: 'm950_missing', na: 'state_na' } },
		// strip painted by the Pi: it needs a GPIO pin with SPI
		{ id: 'pi_out', applies: has && pi, state: Number.isInteger(c.pinPi) && c.pinPi >= 0 ? 'configured' : 'missing', label: 'row_pi_out', what: 'row_pi_out_what', why: 'row_pi_out_for', ifMissing: 'row_pi_out_missing', help: 'row_pi_out_tip', texts: { configured: 'pi_out_ok', missing: 'pi_out_missing', na: 'state_na' } },
		// the 6HC board LEDs are optional: off = grey
		{ id: 'board', state: c.ledsBoard ? 'configured' : 'na', label: 'row_board', what: 'row_board_what', why: 'row_board_for', ifMissing: 'row_board_missing', help: 'row_board_tip', texts: { configured: 'board_on', na: 'board_off' } }
	];
}
