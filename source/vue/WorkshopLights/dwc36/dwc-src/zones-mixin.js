'use strict'

// The geometry of the strip (zones, their order, how many LEDs, which strip
// is shown in the drawing). Used by StripZones.vue and by the tabs that need
// the size of the status zone. The component that uses it injects `lights`
// (the page, Lights.vue) and has `t.zoneName`, `t.stripName`, `t.lighting`,
// `t.status` in its texts.

import { ZONE_COLOR, ZONE_PALETTE } from './lights-shared.js'
import { rgbwCss } from './color.js'
import i18n from '../../i18n'

export default {
	inject: ['lights'],
	computed: {
		form() {
			return this.lights.form;
		},
		// null = main strip; number = index in form.strips_extra
		stripSel: {
			get() {
				return this.lights.stripSel;
			},
			set(v) {
				this.lights.stripSel = v;
			}
		},
		stripX() {
			return this.stripSel === null ? null : this.form.strips_extra[this.stripSel] || null;
		},
		eTab() {
			return this.stripX ? this.stripX.led_strip : this.form.led_strip;
		},
		stateFirst() {
			return this.form.order === 'state_first';
		},
		// ids of all the zones in the strip order (LED 0 = the one at the connector)
		orderZones() {
			const ids = ['state', 'lighting', ...(this.form.zones_extra || []).map(z => z.id)];
			let o = (this.form.order_zones || []).filter(i => ids.includes(i));
			if (!o.length) {
				o = this.stateFirst ? ['state', 'lighting'] : ['lighting', 'state'];
			}
			return o.concat(ids.filter(i => !o.includes(i)));
		},
		zonesOrder() {
			let pos = 0;
			return this.orderZones.map(id => {
				let z;
				if (id === 'lighting') {
					z = { id, name: this.t.lighting, icon: 'mdi-lightbulb-on-outline', field: 'led_start', min: 0, n: Math.max(0, Number(this.form.led_start) || 0) };
				} else if (id === 'state') {
					z = { id, name: this.t.status, icon: 'mdi-traffic-light', field: 'led_count', min: 1, n: Math.max(0, Number(this.form.led_count) || 0) };
				} else {
					const i = this.form.zones_extra.findIndex(x => x.id === id);
					const x = this.form.zones_extra[i];
					z = { id, extra: true, i, x, name: x.name || this.t.zoneName, n: Math.max(0, Number(x.n) || 0), colorId: ZONE_PALETTE[i % ZONE_PALETTE.length] };
				}
				const out = { colorId: ZONE_COLOR[id], ...z, since: pos, until: pos + z.n - 1 };
				pos += z.n;
				return out;
			});
		},
		// zones of the selected strip: the main one (status, lighting, extra) or an additional strip
		zonesTab() {
			if (!this.stripX) {
				return this.zonesOrder;
			}
			let pos = 0;
			return this.stripX.zones.map((x, i) => {
				const n = Math.max(0, Number(x.n) || 0);
				const out = { id: x.id, extra: true, i, x, name: x.name || this.t.zoneName, n, since: pos, until: pos + n - 1, colorId: ZONE_PALETTE[i % ZONE_PALETTE.length] };
				pos += n;
				return out;
			});
		},
		totalTab() {
			return this.zonesTab.reduce((t, z) => t + z.n, 0);
		},
		m950Tab() {
			return this.stripX ? this.lights.m950All[String(this.eTab)] || { line: null, total: null } : this.lights.m950;
		},
		totalFirmwareTab() {
			return this.m950Tab.total || 0;
		},
		m950LineTab() {
			return (this.m950Tab.line || '').split(';')[0].trim();
		},
		totalView() {
			return Math.min(400, Math.max(this.totalTab, this.totalFirmwareTab));
		},
		// the zone that shows the state: the main strip's, a zone of an additional strip, or none
		optionsZoneState() {
			const out = [{ value: 'main', text: i18n.t('plugins.WorkshopLights.stripZones.main_strip_status_zone', { e: this.form.led_strip }) }];
			(this.form.strips_extra || []).forEach(t => {
				(t.zones || []).forEach(z => {
					out.push({ value: t.id + ':' + z.id, text: (t.name || this.t.stripName) + ' (E' + t.led_strip + '): ' + (z.name || this.t.zoneName) });
				});
			});
			out.push({ value: 'none', text: this.t.stateZoneNone });
			return out;
		},
		zoneStateSel() {
			const v = this.form.zone_state || 'main';
			if (!v.includes(':')) {
				return null;
			}
			const [tid, zid] = v.split(':');
			const t = (this.form.strips_extra || []).find(x => x.id === tid);
			const z = t && (t.zones || []).find(x => x.id === zid);
			return z ? { led_strip: t, zone: z } : null;
		},
		// LEDs of the status zone
		nState() {
			const s = this.zoneStateSel;
			return s ? Math.max(1, Number(s.zone.n) || 1) : Math.max(1, Number(this.form.led_count) || 1);
		},
		stateInMain() {
			return (this.form.zone_state || 'main') === 'main' || (this.form.zone_state !== 'none' && !this.zoneStateSel);
		},
		// one colour per LED of the main strip, live
		colorsStrip() {
			const out = [];
			this.lights.secsStrip.forEach(s => {
				for (let i = 0; i < s[2] && out.length < 2000; i++) {
					out.push(this.ledColor(s));
				}
			});
			return out;
		},
		colorsState() {
			const out = [];
			this.lights.secsState.forEach(s => {
				for (let i = 0; i < s[2]; i++) {
					out.push(this.ledColor(s));
				}
			});
			return out;
		}
	},
	methods: {
		// the colour of a LED with its brightness (same as LedStrip.vue)
		ledColor(s) {
			if (!(s[1] > 0)) {
				return 'rgba(40,40,40,0.9)';
			}
			const h = String(s[0]).replace('#', '');
			const a = 0.6 + 0.4 * Math.sqrt(Math.min(1, s[1]));
			return `rgba(${parseInt(h.substr(0, 2), 16)},${parseInt(h.substr(2, 2), 16)},${parseInt(h.substr(4, 2), 16)},${a})`;
		},
		isZoneState(z) {
			const s = this.zoneStateSel;
			return !!(s && this.stripX === s.led_strip && z.x === s.zone);
		},
		colorLed(i) {
			if (i >= this.totalTab) {
				return 'transparent';
			}
			// main strip without unsaved changes: live copy of the real strip
			if (!this.stripX && !this.lights.changed && this.colorsStrip.length === this.totalTab) {
				return this.colorsStrip[i];
			}
			const z = this.zonesTab.find(x => i >= x.since && i <= x.until);
			if (!z) {
				return 'transparent';
			}
			if (z.extra) {
				if (this.stripX && this.isZoneState(z)) {
					return this.colorsState.length === z.n ? this.colorsState[i - z.since] : 'rgba(40,40,40,0.9)';
				}
				return z.x.on !== false ? rgbwCss(z.x.color, z.x.color.p) : 'rgba(40,40,40,0.9)';
			}
			if (z.id === 'lighting') {
				return this.lights.lightOn ? rgbwCss(this.form.light_color, this.form.light_color.p) : 'rgba(40,40,40,0.9)';
			}
			if (!this.stateInMain) {
				return 'rgba(40,40,40,0.9)';
			}
			if (this.colorsState.length === Number(this.form.led_count)) {
				return this.colorsState[i - z.since];
			}
			const c = this.form.mode_colors[this.lights.modeCurrent] || this.form.mode_colors.Laser;
			return rgbwCss(c, 255);
		},
		// the zones of the selected strip, each one with its identification colour
		segmentsIdentify() {
			return this.zonesTab.filter(z => z.n > 0).map(z => {
				const h = z.colorId.replace('#', '');
				return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), z.n];
			});
		},
		// move a zone one place (d = -1 towards the connector, +1 towards the end)
		move(k, d) {
			if (this.stripX) {
				const zs = this.stripX.zones;
				const j = k + d;
				if (j >= 0 && j < zs.length) {
					zs.splice(j, 0, zs.splice(k, 1)[0]);
				}
				return;
			}
			const o = [...this.orderZones];
			const j = k + d;
			if (j < 0 || j >= o.length) {
				return;
			}
			[o[k], o[j]] = [o[j], o[k]];
			this.form.order_zones = o;
			this.form.order = o.indexOf('state') < o.indexOf('lighting') ? 'state_first' : 'lighting_first';
		},
		addZone() {
			const white = { r: 255, u: 255, b: 255, w: 0, p: 255 };
			if (this.stripX) {
				const us = this.stripX.zones.map(z => z.id);
				let n = 1;
				while (us.includes('z' + n)) {
					n++;
				}
				this.stripX.zones.push({ id: 'z' + n, name: this.t.zoneName + ' ' + (this.stripX.zones.length + 1), n: 5, color: { ...white }, on: true });
				return;
			}
			const used = this.form.zones_extra.map(z => z.id);
			let k = 1;
			while (used.includes('z' + k)) {
				k++;
			}
			const id = 'z' + k;
			this.form.zones_extra.push({ id, name: this.t.zoneName + ' ' + (this.form.zones_extra.length + 3), n: 5, color: { ...white }, on: true });
			this.form.order_zones = [...this.orderZones.filter(i => i !== id), id];
		},
		removeZone(i) {
			if (this.stripX) {
				this.stripX.zones.splice(i, 1);
				return;
			}
			const id = this.form.zones_extra[i].id;
			this.form.zones_extra.splice(i, 1);
			this.form.order_zones = this.orderZones.filter(x => x !== id);
		},
		addStrip() {
			const is = [this.form.led_strip, ...this.form.strips_extra.map(t => Number(t.led_strip))];
			let e = 1;
			while (is.includes(e) && e < 9) {
				e++;
			}
			const ids = this.form.strips_extra.map(t => t.id);
			let k = 1;
			while (ids.includes('t' + k)) {
				k++;
			}
			this.form.strips_extra.push({
				id: 't' + k, name: this.t.stripName + ' ' + (this.form.strips_extra.length + 2), led_strip: e,
				output: { kind: 'duet', pin: 20, order: 'GRBW', brightness: 60 },
				zones: [{ id: 'z1', name: this.t.zoneName + ' 1', n: 10, color: { r: 255, u: 255, b: 255, w: 0, p: 255 }, on: true }]
			});
			this.stripSel = this.form.strips_extra.length - 1;
		},
		removeStrip() {
			if (this.stripX) {
				this.form.strips_extra.splice(this.stripSel, 1);
				this.stripSel = null;
			}
		}
	}
};
