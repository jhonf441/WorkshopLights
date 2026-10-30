'use strict'

// The geometry of the strip (zones, their order, how many LEDs, which strip
// is shown in the drawing). Used by StripZones.vue (composable of DWC 3.7, formerly a mixin). The component that uses it
// is a child of Lights.vue, which provides `lights` (the page), and passes its texts `t` (`t.zoneName`, `t.stripName`,
// `t.lighting`, `t.status`, `t.stateZoneNone`).

import { computed, inject } from 'vue'
import { ZONE_COLOR, ZONE_PALETTE } from './lights-shared.js'
import { rgbwCss } from './color.js'
import { i18n } from './dwc-host.js'

// geometry of the open strip: which zones it has, in which order, how many LEDs, what the board says
function useZoneGeometry(lights, t) {
	const form = computed(() => lights.form)
	// null = main strip; number = index in form.strips_extra
	const stripSel = computed({
		get: () => lights.stripSel,
		set: v => { lights.stripSel = v }
	})
	const stripX = computed(() => (stripSel.value === null ? null : form.value.strips_extra[stripSel.value] || null))
	const eTab = computed(() => (stripX.value ? stripX.value.led_strip : form.value.led_strip))
	const stateFirst = computed(() => form.value.order === 'state_first')
	// ids of all the zones in the strip order (LED 0 = the one at the connector)
	const orderZones = computed(() => {
		const ids = ['state', 'lighting', ...(form.value.zones_extra || []).map(z => z.id)]
		let o = (form.value.order_zones || []).filter(i => ids.includes(i))
		if (!o.length) {
			o = stateFirst.value ? ['state', 'lighting'] : ['lighting', 'state']
		}
		return o.concat(ids.filter(i => !o.includes(i)))
	})
	const zonesOrder = computed(() => {
		let pos = 0
		return orderZones.value.map(id => {
			let z
			if (id === 'lighting') {
				z = { id, name: t.lighting, icon: 'mdi-lightbulb-on-outline', field: 'led_start', min: 0, n: Math.max(0, Number(form.value.led_start) || 0) }
			} else if (id === 'state') {
				z = { id, name: t.status, icon: 'mdi-traffic-light', field: 'led_count', min: 1, n: Math.max(0, Number(form.value.led_count) || 0) }
			} else {
				const i = form.value.zones_extra.findIndex(x => x.id === id)
				const x = form.value.zones_extra[i]
				z = { id, extra: true, i, x, name: x.name || t.zoneName, n: Math.max(0, Number(x.n) || 0), colorId: ZONE_PALETTE[i % ZONE_PALETTE.length] }
			}
			const out = { colorId: ZONE_COLOR[id], ...z, since: pos, until: pos + z.n - 1 }
			pos += z.n
			return out
		})
	})
	// zones of the selected strip: the main one (status, lighting, extra) or an additional strip
	const zonesTab = computed(() => {
		if (!stripX.value) {
			return zonesOrder.value
		}
		let pos = 0
		return stripX.value.zones.map((x, i) => {
			const n = Math.max(0, Number(x.n) || 0)
			const out = { id: x.id, extra: true, i, x, name: x.name || t.zoneName, n, since: pos, until: pos + n - 1, colorId: ZONE_PALETTE[i % ZONE_PALETTE.length] }
			pos += n
			return out
		})
	})
	const totalTab = computed(() => zonesTab.value.reduce((s, z) => s + z.n, 0))
	const m950Tab = computed(() => (stripX.value ? lights.m950All[String(eTab.value)] || { line: null, total: null } : lights.m950))
	const totalFirmwareTab = computed(() => m950Tab.value.total || 0)
	const m950LineTab = computed(() => (m950Tab.value.line || '').split(';')[0].trim())
	const totalView = computed(() => Math.min(400, Math.max(totalTab.value, totalFirmwareTab.value)))
	// the zone that shows the state: the main strip's, a zone of an additional strip, or none
	const optionsZoneState = computed(() => {
		const out = [{ value: 'main', text: i18n.t('plugins.WorkshopLights.stripZones.main_strip_status_zone', { e: form.value.led_strip }) }]
		;(form.value.strips_extra || []).forEach(s => {
			(s.zones || []).forEach(z => {
				out.push({ value: s.id + ':' + z.id, text: (s.name || t.stripName) + ' (E' + s.led_strip + '): ' + (z.name || t.zoneName) })
			})
		})
		out.push({ value: 'none', text: t.stateZoneNone })
		return out
	})
	const zoneStateSel = computed(() => {
		const v = form.value.zone_state || 'main'
		if (!v.includes(':')) {
			return null
		}
		const [tid, zid] = v.split(':')
		const s = (form.value.strips_extra || []).find(x => x.id === tid)
		const z = s && (s.zones || []).find(x => x.id === zid)
		return z ? { led_strip: s, zone: z } : null
	})
	// LEDs of the status zone
	const nState = computed(() => {
		const s = zoneStateSel.value
		return s ? Math.max(1, Number(s.zone.n) || 1) : Math.max(1, Number(form.value.led_count) || 1)
	})
	const stateInMain = computed(() => (form.value.zone_state || 'main') === 'main' || (form.value.zone_state !== 'none' && !zoneStateSel.value))

	return {
		form, stripSel, stripX, eTab, orderZones, zonesOrder, zonesTab, totalTab, m950Tab, totalFirmwareTab, m950LineTab, totalView,
		optionsZoneState, zoneStateSel, nState, stateInMain
	}
}

// colour of every LED of the drawing and the identification segments
function useZoneColors(lights, g) {
	const { form, stripX, totalTab, zonesTab, zoneStateSel, stateInMain } = g
	// the colour of a LED with its brightness (same as LedStrip.vue)
	function ledColor(s) {
		if (!(s[1] > 0)) {
			return 'rgba(40,40,40,0.9)'
		}
		const h = String(s[0]).replace('#', '')
		const a = 0.6 + 0.4 * Math.sqrt(Math.min(1, s[1]))
		return `rgba(${parseInt(h.substr(0, 2), 16)},${parseInt(h.substr(2, 2), 16)},${parseInt(h.substr(4, 2), 16)},${a})`
	}
	// one colour per LED of the main strip, live
	const colorsStrip = computed(() => {
		const out = []
		lights.secsStrip.forEach(s => {
			for (let i = 0; i < s[2] && out.length < 2000; i++) {
				out.push(ledColor(s))
			}
		})
		return out
	})
	const colorsState = computed(() => {
		const out = []
		lights.secsState.forEach(s => {
			for (let i = 0; i < s[2]; i++) {
				out.push(ledColor(s))
			}
		})
		return out
	})
	function isZoneState(z) {
		const s = zoneStateSel.value
		return !!(s && stripX.value === s.led_strip && z.x === s.zone)
	}
	function colorLed(i) {
		if (i >= totalTab.value) {
			return 'transparent'
		}
		// main strip without unsaved changes: live copy of the real strip
		if (!stripX.value && !lights.changed && colorsStrip.value.length === totalTab.value) {
			return colorsStrip.value[i]
		}
		const z = zonesTab.value.find(x => i >= x.since && i <= x.until)
		if (!z) {
			return 'transparent'
		}
		if (z.extra) {
			if (stripX.value && isZoneState(z)) {
				return colorsState.value.length === z.n ? colorsState.value[i - z.since] : 'rgba(40,40,40,0.9)'
			}
			return z.x.on !== false ? rgbwCss(z.x.color, z.x.color.p) : 'rgba(40,40,40,0.9)'
		}
		if (z.id === 'lighting') {
			return lights.lightOn ? rgbwCss(form.value.light_color, form.value.light_color.p) : 'rgba(40,40,40,0.9)'
		}
		if (!stateInMain.value) {
			return 'rgba(40,40,40,0.9)'
		}
		if (colorsState.value.length === Number(form.value.led_count)) {
			return colorsState.value[i - z.since]
		}
		const c = form.value.mode_colors[lights.modeCurrent] || form.value.mode_colors.Laser
		return rgbwCss(c, 255)
	}
	// the zones of the selected strip, each one with its identification colour
	function segmentsIdentify() {
		return zonesTab.value.filter(z => z.n > 0).map(z => {
			const h = z.colorId.replace('#', '')
			return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), z.n]
		})
	}
	return { colorsStrip, colorsState, ledColor, isZoneState, colorLed, segmentsIdentify }
}

// edits of the zones and strips of the form
function useZoneEdits(g, t) {
	const { form, stripSel, stripX, orderZones } = g
	// move a zone one place (d = -1 towards the connector, +1 towards the end)
	function move(k, d) {
		if (stripX.value) {
			const zs = stripX.value.zones
			const j = k + d
			if (j >= 0 && j < zs.length) {
				zs.splice(j, 0, zs.splice(k, 1)[0])
			}
			return
		}
		const o = [...orderZones.value]
		const j = k + d
		if (j < 0 || j >= o.length) {
			return
		}
		;[o[k], o[j]] = [o[j], o[k]]
		form.value.order_zones = o
		form.value.order = o.indexOf('state') < o.indexOf('lighting') ? 'state_first' : 'lighting_first'
	}
	function addZone() {
		const white = { r: 255, u: 255, b: 255, w: 0, p: 255 }
		if (stripX.value) {
			const us = stripX.value.zones.map(z => z.id)
			let n = 1
			while (us.includes('z' + n)) {
				n++
			}
			stripX.value.zones.push({ id: 'z' + n, name: t.zoneName + ' ' + (stripX.value.zones.length + 1), n: 5, color: { ...white }, on: true })
			return
		}
		const used = form.value.zones_extra.map(z => z.id)
		let k = 1
		while (used.includes('z' + k)) {
			k++
		}
		const id = 'z' + k
		form.value.zones_extra.push({ id, name: t.zoneName + ' ' + (form.value.zones_extra.length + 3), n: 5, color: { ...white }, on: true })
		form.value.order_zones = [...orderZones.value.filter(i => i !== id), id]
	}
	function removeZone(i) {
		if (stripX.value) {
			stripX.value.zones.splice(i, 1)
			return
		}
		const id = form.value.zones_extra[i].id
		form.value.zones_extra.splice(i, 1)
		form.value.order_zones = orderZones.value.filter(x => x !== id)
	}
	function addStrip() {
		const is = [form.value.led_strip, ...form.value.strips_extra.map(s => Number(s.led_strip))]
		let e = 1
		while (is.includes(e) && e < 9) {
			e++
		}
		const ids = form.value.strips_extra.map(s => s.id)
		let k = 1
		while (ids.includes('t' + k)) {
			k++
		}
		form.value.strips_extra.push({
			id: 't' + k, name: t.stripName + ' ' + (form.value.strips_extra.length + 2), led_strip: e,
			output: { kind: 'duet', pin: 20, order: 'GRBW', brightness: 60 },
			zones: [{ id: 'z1', name: t.zoneName + ' 1', n: 10, color: { r: 255, u: 255, b: 255, w: 0, p: 255 }, on: true }]
		})
		stripSel.value = form.value.strips_extra.length - 1
	}
	function removeStrip() {
		if (stripX.value) {
			form.value.strips_extra.splice(stripSel.value, 1)
			stripSel.value = null
		}
	}
	function selectStrip(i) {
		stripSel.value = i
	}

	return { move, addZone, removeZone, addStrip, removeStrip, selectStrip }
}

export function useZones(t) {
	const lights = inject('lights')
	const g = useZoneGeometry(lights, t)
	const c = useZoneColors(lights, g)
	const e = useZoneEdits(g, t)
	return { lights, ...g, ...c, ...e }
}
