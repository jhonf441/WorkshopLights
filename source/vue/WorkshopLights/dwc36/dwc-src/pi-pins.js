// Pure logic of the "Strip on the Pi" section (Advanced tab): which pins of the Pi can drive a strip and why the others cannot.
// Data comes from the service (lights.pi_pins): pines = [{ gpio, funcion, libre, motivo, strip_spi }], tiras = [...].
// strip_spi = true when the pin is the data pin (MOSI) of an SPI bus that is on and not used by anything else.

// state of one pin for one strip. usedByOther = gpio numbers chosen by the OTHER strips.
// reason: 'ok' | 'taken' (another strip uses it) | 'busy' (something else uses it) | 'no_strip' (free, but a strip cannot work there)
export function pinState(p, usedByOther) {
	if ((usedByOther || []).includes(p.gpio)) {
		return { ok: false, reason: 'taken' };
	}
	if (p.strip_spi) {
		return { ok: true, reason: 'ok' };
	}
	return { ok: false, reason: p.free ? 'no_strip' : 'busy' };
}

// the strips of the form (main first, then the extra ones)
export function stripRows(form) {
	const rows = [{ key: 'main', main: true, x: form, index: null }];
	(form.strips_extra || []).forEach((x, i) => rows.push({ key: x.id || 'extra' + i, main: false, x, index: i }));
	return rows;
}

// pins already chosen by every strip except `x`
export function pinsOfOthers(form, x) {
	return stripRows(form).map(r => r.x).filter(o => o !== x && o.output && o.output.kind === 'pi').map(o => o.output.pin);
}

// 'unread' (the list did not arrive), 'empty' (the Pi offers no pin at all), 'none' (pins exist, none can drive a strip), 'some'
export function pinsSummary(pins, read) {
	if (!read) {
		return 'unread';
	}
	if (!pins || !pins.length) {
		return 'empty';
	}
	return pins.some(p => p.strip_spi) ? 'some' : 'none';
}

// the pin to select when the person turns the Pi output on: keep the current one if it works, else the first that works, else null
export function pinToSelect(pins, current, usedByOther) {
	const ok = (pins || []).filter(p => pinState(p, usedByOther).ok);
	if (ok.some(p => p.gpio === current)) {
		return current;
	}
	return ok.length ? ok[0].gpio : null;
}

// can the switch be turned on? Only if some pin is usable by this strip (turning it off is always possible)
export function canEnable(pins, usedByOther) {
	return (pins || []).some(p => pinState(p, usedByOther).ok);
}

// one-line description of a strip output for the Outputs tab: { kind: 'duet' } or { kind: 'pi', pin: 20 }
export function outputLabel(output) {
	return output && output.kind === 'pi' ? { kind: 'pi', pin: output.pin } : { kind: 'duet', pin: null };
}

// the pins grouped by reason (the list shows a group once, not one repeated line per pin):
// 'busy' (used by the system), 'free' (free but a strip does not work there), 'valid' (the data pin of an active, free SPI bus)
export function pinGroupsOf(pins) {
	const list = pins || [];
	const groups = [
		{ id: 'valid', pins: list.filter(p => p.strip_spi) },
		{ id: 'free', pins: list.filter(p => !p.strip_spi && p.free) },
		{ id: 'busy', pins: list.filter(p => !p.strip_spi && !p.free) }
	];
	return groups.filter(g => g.pins.length);
}

// the command that enables the SPI bus a strip can use, to be pasted in a terminal ON the Pi (it backs up config.txt first).
// 'spi1' = the usual case (DSF talks to the Duet over SPI 0): overlay spi1-1cs gives the bus SPI 1 (MOSI = GPIO20).
// 'spi0' = DSF uses SPI 1: the free bus is SPI 0 (dtparam=spi=on, MOSI = GPIO10).
export function enableCommandOf(bus) {
	const line = bus === 'spi0' ? 'dtparam=spi=on' : 'dtoverlay=spi1-1cs';
	return "sudo cp /boot/firmware/config.txt /boot/firmware/config.txt.bak-$(date +%Y%m%d) && echo '" + line + "' | sudo tee -a /boot/firmware/config.txt && sudo reboot";
}
