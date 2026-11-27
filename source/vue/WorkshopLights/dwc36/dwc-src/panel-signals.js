// Pure logic of the board signals panel (Advanced tab, screens only): what icon each category has, how a signal text from the service
// is split in a short name + detail (+ the board it belongs to), and the state of a signal with a second channel besides colour.

// one icon per category (MDI), used in the group heading and in every cell
export const GROUP_ICONS = {
	board: 'mdi-chip',
	final: 'mdi-electric-switch',
	probes: 'mdi-crosshairs',
	fans: 'mdi-fan',
	heaters: 'mdi-fire',
	laser: 'mdi-laser-pointer',
	outputs: 'mdi-toggle-switch'
};

export function groupIcon(id) {
	return GROUP_ICONS[id] || 'mdi-circle-medium';
}

// the service marks a real problem (a heater fault, a board that stopped answering); a red colour alone is not one (the board LEDs are red)
export function isFault(x) {
	return x.fault === true || /FALLA|FAULT|no contesta|not answering/i.test(x.label || '');
}

// "active" = the board reports something on (dim green / violet are the idle states)
export function isActive(x) {
	return x.level > 0.3;
}

// 'fault' | 'on' | 'off': the state is also written and drawn with an icon, never colour alone
export function signalState(x) {
	return isFault(x) ? 'fault' : isActive(x) ? 'on' : 'off';
}

export const STATE_ICONS = { fault: 'mdi-alert-circle', on: 'mdi-check-circle', off: 'mdi-circle-outline' };

// The service publishes one text per signal ("Main board: STATUS (CAN communication) (fast blink: ...)", "Endstop X: not triggered",
// "Fan 2: 0 %"). Split it: name (short, bold), detail (grey, under it) and, for the board LEDs, the board it belongs to.
export function splitLabel(x) {
	const label = String(x.label || '');
	const i = label.indexOf(': ');
	if (i < 0) {
		return { name: label, detail: '', board: '' };
	}
	const head = label.slice(0, i);
	const rest = label.slice(i + 2);
	if (x.group === 'board' && /^(board_|can_|vin_)/.test(x.id || '')) {
		const j = rest.indexOf(' (');
		return { name: j < 0 ? rest : rest.slice(0, j), detail: j < 0 ? '' : rest.slice(j + 1), board: head };
	}
	return { name: head, detail: rest, board: '' };
}

// faults first, the rest in the order the service gave (stable)
export function faultsFirst(list) {
	return list.map((x, k) => ({ x, k })).sort((a, b) => (isFault(b.x) - isFault(a.x)) || (a.k - b.k)).map(o => o.x);
}
