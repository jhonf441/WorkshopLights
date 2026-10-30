<template>
	<v-container :style="secStyle" fluid class="pa-0 lights-page workshop-theme">
		<service-notice />

		<!-- ===== Header: always visible, shows the current state ===== -->
		<page-header :lead="t.lead" icon="mdi-led-strip-variant" :title="t.title" :loading="!saved && !msgError" :reasons="saved ? [] : [{ level: 'warn', text: t.cantRead }]">
			<state-badge :ind="indicator" compact class="flex-grow-1" style="min-width:180px" />
			<v-chip size="small" variant="outlined" :color="stripPresent ? 'success' : 'grey'" :title="t.chipStripHelp">
				<v-icon size="small" start>mdi-led-strip-variant</v-icon>{{ stripPresent ? t.chipStrip : t.chipNoStrip }}
			</v-chip>
			<v-chip size="small" variant="outlined" color="success" :title="chipScreenHelp"><v-icon size="small" start>mdi-monitor-dashboard</v-icon>{{ t.chipScreen }}</v-chip>
			<v-chip size="small" variant="outlined" :color="form.leds_board && form.leds_board.active ? 'success' : 'grey'" :title="t.chipBoardHelp">
				<v-icon size="small" start>mdi-chip</v-icon>{{ form.leds_board && form.leds_board.active ? t.chipBoard : t.chipNoBoard }}
			</v-chip>
			<template #startup><startup-panel plugin="WorkshopLights" :defs="rowsStartup" /></template>
		</page-header>


		<!-- ===== Tabs ===== -->
		<div class="st-layout mb-3">
		<side-tabs v-model="tab" :items="tabs" />
		<div class="st-body">
		<tab-summary v-if="tab === 'summary'" />
		<tab-outputs v-else-if="tab === 'outputs'" />
		<tab-lighting v-else-if="tab === 'lighting' && stripPresent" />
		<tab-states v-else-if="tab === 'states'" />
		<tab-colors v-else-if="tab === 'colors'" />
		<tab-effects v-else-if="tab === 'effects'" />
		<tab-advanced v-else-if="tab === 'advanced'" />
		</div>
		</div>

		<!-- ===== Save ===== -->
		<div v-if="atLeast('technician') && (changed || msg)" class="save-bar">
			<span v-if="msg" class="text-body-medium mr-3" :class="msgError ? 'text-error' : 'text-success'">{{ msg }}</span>
			<span v-else-if="changed" class="text-body-medium text-warning mr-3">{{ t.unsaved }}</span>
			<v-btn size="small" :disabled="!changed" variant="text" class="mr-2" @click="discard()">{{ t.discard }}</v-btn>
			<span v-if="changed && !numbersOk" class="text-body-medium text-error mr-3">{{ t.checkNumbers }}</span>
			<v-btn size="small" color="primary" :disabled="!saved || !changed || !numbersOk" :loading="saving" @click="save()">
				<v-icon start>mdi-content-save</v-icon>{{ t.save }}
			</v-btn>
		</div>
	</v-container>
</template>

<script setup>
import { sectionColor } from './section-colors.js'
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { i18n, machineModel, modelPlugins } from './dwc-host.js'
import { useRole } from './use-role.js'
import ServiceNotice from './ServiceNotice.vue'
import StartupPanel from './StartupPanel.vue' // start-up card (vue/_shared)
import PageHeader from './PageHeader.vue' // header of every page (vue/_shared)
import { rowsLights } from './startup-rows.js'
import SideTabs from './SideTabs.vue'
import { api } from './workshop-api.js'
import { errorKind, errorText as friendlyErrorText } from './friendly-error.js'
import { ts } from './shared-t.js'
import StateBadge from './StateBadge.vue'
import TabSummary from './TabSummary.vue'
import TabOutputs from './TabOutputs.vue'
import TabLighting from './TabLighting.vue'
import TabStates from './TabStates.vue'
import TabColors from './TabColors.vue'
import TabEffects from './TabEffects.vue'
import TabAdvanced from './TabAdvanced.vue'
import { copy } from './lights-shared.js'
import { visibleItems } from './role-view.js'
import { pluginOf, pluginActive } from './workshop-ids.js' // Id nuevo o viejo del plugin
import { serviceTexts, serviceDefaultName } from './service-text.js'

const { atLeast, canDo } = useRole() // what the role sees (vue/_shared)

// Factory names of scenes, extra zones and strips (WorkshopService lights_config.DEFAULT_NAME_KEYS): a name that is still
// one of them, in either language, is shown (and saved again) in the language of this DWC; a renamed one stays as it is.
const SCENE_NAMES = ['lights_scene_default_name', 'lights_scene_job', 'lights_scene_photo', 'lights_config_inspection', 'lights_scene_dim']
function defaultNames(c) {
	((c.work_light && c.work_light.scenes) || []).forEach(s => {
		s.name = serviceDefaultName(s.name, SCENE_NAMES)
	});
	(c.zones_extra || []).forEach(z => {
		z.name = serviceDefaultName(z.name, ['lights_zone_default_name'])
	});
	(c.strips_extra || []).forEach(x => {
		x.name = serviceDefaultName(x.name, ['lights_strip_default_name']);
		(x.zones || []).forEach(z => {
			z.name = serviceDefaultName(z.name, ['lights_zone_default_name'])
		})
	})
}

// Every user-visible text of this component is here (one place, to ease the
// later move to translation keys). The tabs have their own t.
const t = {
	title: i18n.t('plugins.WorkshopLights.common.lights_and_status'),
	lead: i18n.t('plugins.WorkshopLights.common.lead'),
	intro: i18n.t('plugins.WorkshopLights.lights.here_you_decide_how_what_the'),
	chipStrip: i18n.t('plugins.WorkshopLights.common.led_strip'),
	chipNoStrip: i18n.t('plugins.WorkshopLights.lights.no_led_strip'),
	chipStripHelp: i18n.t('plugins.WorkshopLights.lights.output_1_the_led_strip_connected'),
	chipScreen: i18n.t('plugins.WorkshopLights.common.on_screen_indicator'),
	chipScreenHelp: i18n.t('plugins.WorkshopLights.lights.output_2_the_indicator_of_this'),
	chipBoard: i18n.t('plugins.WorkshopLights.common.board_leds'),
	chipNoBoard: i18n.t('plugins.WorkshopLights.lights.board_leds_off'),
	chipBoardHelp: i18n.t('plugins.WorkshopLights.lights.output_3_a_copy_of_the'),
	tabSummary: i18n.t('plugins.WorkshopLights.lights.summary'),
	tabOutputs: i18n.t('plugins.WorkshopLights.lights.outputs'),
	tabLighting: i18n.t('plugins.WorkshopLights.lights.lighting'),
	tabStates: i18n.t('plugins.WorkshopLights.lights.states'),
	tabColors: i18n.t('plugins.WorkshopLights.lights.modes_and_colors'),
	tabEffects: i18n.t('plugins.WorkshopLights.lights.animations_and_effects'),
	tabAdvanced: i18n.t('plugins.WorkshopLights.lights.advanced'),
	unsaved: i18n.t('plugins.WorkshopLights.lights.there_are_unsaved_changes'),
	discard: i18n.t('plugins.WorkshopLights.lights.discard'),
	checkNumbers: i18n.t('plugins.WorkshopLights.lights.check_the_led_counts_and_that'),
	save: i18n.t('plugins.WorkshopLights.lights.save_and_apply'),
	saved: i18n.t('plugins.WorkshopLights.lights.saved_and_applied'),
	cantRead: i18n.t('plugins.WorkshopLights.lights.couldn_t_read_the_configuration_is'),
	cantSave: i18n.t('plugins.WorkshopLights.lights.could_not_save'),
	cantApply: i18n.t('plugins.WorkshopLights.common.could_not_apply'),
	cantTest: i18n.t('plugins.WorkshopLights.common.the_test_failed'),
	profileLoaded: i18n.t('plugins.WorkshopLights.lights.profile_loaded_review_the_changes_and'),
	errBadJson: i18n.t('plugins.WorkshopLights.lights.the_file_is_not_a_valid'),
	errBadProfile: i18n.t('plugins.WorkshopLights.lights.the_file_does_not_look_like'),
	errNoStrip: i18n.t('plugins.WorkshopLights.lights.this_machine_has_no_led_strip'),
	errUnknownState: i18n.t('plugins.WorkshopLights.lights.that_state_does_not_exist'),
	errUnknownScene: i18n.t('plugins.WorkshopLights.lights.that_scene_does_not_exist')
}

const errors = {
	bad_json: 'errBadJson',
	bad_profile: 'errBadProfile',
	no_strip: 'errNoStrip',
	unknown_state: 'errUnknownState',
	unknown_scene: 'errUnknownScene'
}

const TAB_IDS = ['summary', 'outputs', 'lighting', 'states', 'colors', 'effects', 'advanced']

// plugin data may come as a Map (DWC 3.7) or as a plain object
function prop(o, k) {
	return o && typeof o.get === 'function' ? o.get(k) : o ? o[k] : undefined
}

// the form of the page before the service answers
const FORM_EMPTY = {
	strip: { present: true }, active: true, virtual: false, led_strip: 0, led_start: 10, led_count: 10, order: 'lighting_first',
	zones_extra: [], order_zones: [], strips_extra: [], zone_state: 'main',
	light_color: { r: 0, u: 0, b: 255, w: 255, p: 255 }, idle_brightness: 40,
	mode_colors: { Laser: { r: 140, u: 0, b: 255, w: 0 }, CNC: { r: 0, u: 0, b: 255, w: 0 }, FFF: { r: 0, u: 255, b: 0, w: 0 } },
	effects_in_job: 'without_effects', state_colors: {}, states: {}, order_states: [], combine: { mode: 'priority', turn_s: 1.5, si_no_fit: 'turns' },
	animation: { active: true, kind: 'bar', color: { r: 0, u: 180, b: 255, w: 0 }, step: 6 },
	effects: { end_job: { active: true, color: { r: 0, u: 255, b: 0, w: 0 }, times: 3 }, blink_pause: true, jog_free_always: true },
	leds_board: { active: false, leds: ['can', 'vin', 'v12', 'v5', 'v3_3'], brightness: 120, vin_min: 4.5, v12_min: 6, with_lighting: 'keep', can_blink: 'fault' },
	strip_state: { active: false, groups: ['board', 'final', 'probes', 'fans', 'heaters', 'laser', 'outputs'] },
	output: { kind: 'duet', pin: 20, order: 'GRBW', brightness: 60 },
	work_light: { scenes: [], scene: '', auto_off: { enabled: false, minutes: 30 }, auto_on_job: false },
	night: { enabled: false, from: '22:00', to: '07:00', level: 25, include_work_light: true },
	power: { ma_per_channel: 20, limit_ma: 0 }, pi_hot_c: 75, live_quiet_s: 60
}

function tabSaved() {
	try {
		const v = window.localStorage.getItem('lightsTab')
		return TAB_IDS.includes(v) ? v : 'summary'
	} catch (e) {
		return 'summary'
	}
}

const tab = ref(tabSaved())
const saved = ref(null)
const form = ref(copy(FORM_EMPTY))
const catalog = ref({})
const m950 = ref({ line: null, total: null })
const m950All = ref({})
const saving = ref(false)
const msg = ref(null)
const msgError = ref(false)
const countN = ref(37)
const stripEnlarged = ref(false)
const stripSel = ref(null) // null = main strip; number = index in form.strips_extra
const testing = ref(null)
const armed = ref(null)
let armedTimer = null
const applyingM950 = ref(false)
const requestRestart = ref(false)
const copyConfig = ref('')
const busyLight = ref(false)
const busyState = ref(false)
const busyZone = ref(null)
const testingState = ref(null)

// the on-screen indicator also shows in the side bar and the jog: those plugins are named only when they are there
const chipScreenHelp = computed(() => {
	const k = 'plugins.WorkshopLights.lights.output_2_the_indicator_of_this'
	return i18n.t(k + (pluginActive('bar') ? '' : '_no_bar') + (pluginActive('jog') ? '' : '_no_jog'))
})
// who paints the strip: the Pi (strip over SPI that replaces the Duet's) or the Duet. With the Pi every effect is
// complete; the Duet strip cannot follow the double flash and the pulse (each frame is a set of codes to the board).
const piPaints = computed(() => {
	const g = form.value && form.value.output
	return !!(g && g.kind === 'pi')
})
const stripPresent = computed(() => !!(form.value.strip && form.value.strip.present))
const secStyle = computed(() => ({ '--wf-sec': sectionColor(tab.value) }))
const model = computed(() => machineModel())
const pluginData = computed(() => {
	const p = pluginOf(modelPlugins(), 'service')
	return (p && p.data) || {}
})
// the service publishes its texts as {key, params}: they are shown in the language of this DWC
const read = computed(() => {
	const d = pluginData.value
	return k => serviceTexts(prop(d, k))
})
// plugin data statusIndicator: the current state, the active ones, why
const indicator = computed(() => {
	const i = read.value('statusIndicator')
	if (i && i.state) {
		return i
	}
	// a service from before the redesign: only the text and the colour
	const txt = read.value('statusLightText')
	return txt ? { state: { id: 'base', name: txt, hex: read.value('statusLightColor') || '#616161', effect: 'steady' }, active: [], reason: '' } : null
})
// plugin data lightsInfo: history, power, night dimming, board LEDs
const info = computed(() => read.value('lightsInfo') || {})
const lightOn = computed(() => !!read.value('lightOn'))
const statusAuto = computed(() => {
	const v = read.value('statusLightAuto')
	return v == null ? true : !!v
})
// [[hex, level 0..1, count], ...] of the whole strip, as painted
const secsStrip = computed(() => {
	const s = read.value('ledStrip')
	return s && Array.isArray(s.secs) ? s.secs.filter(x => x[2] > 0) : []
})
const secsState = computed(() => {
	const secs = read.value('statusLightSecs')
	return Array.isArray(secs) ? secs.filter(s => s[2] > 0) : []
})
const modeCurrent = computed(() => (model.value.state && model.value.state.machineMode) || 'Laser')
const machineStill = computed(() => {
	const s = model.value.state && model.value.state.status
	return !['processing', 'paused', 'pausing', 'resuming', 'simulating', 'busy', 'cancelling'].includes(s)
})
const changed = computed(() => !!saved.value && JSON.stringify(form.value) !== JSON.stringify(saved.value))
// no empty / invalid LED count (it used to break the config)
const numbersOk = computed(() => {
	const ent = (v, min) => v !== '' && v !== null && Number.isInteger(Number(v)) && Number(v) >= min
	const f = form.value
	const strips = f.strips_extra || []
	const is = [f.led_strip, ...strips.map(x => Number(x.led_strip))]
	return ent(f.led_start, 0) && ent(f.led_count, 1) && (f.zones_extra || []).every(z => ent(z.n, 1))
		&& strips.every(x => ent(x.led_strip, 0) && Number(x.led_strip) <= 9 && x.zones.every(z => ent(z.n, 1)))
		&& new Set(is.map(Number)).size === is.length
})
// start-up card: the SAVED configuration (what is in effect), once the service has answered
const rowsStartup = computed(() => {
	const g = saved.value
	return rowsLights({
		loaded: !!g,
		hasStrip: !!(g && g.strip && g.strip.present),
		kindOutput: g && g.output ? g.output.kind : 'duet',
		m950Line: m950.value.line,
		pinPi: g && g.output ? g.output.pin : null,
		ledsBoard: !!(g && g.leds_board && g.leds_board.active)
	})
})
const tabs = computed(() => {
	// F3-V (2026-10-21): the summary (state of the strip, work light and scenes) is for everybody; the settings tabs are a
	// technician's; Advanced (strip order, Pi pins, board panel, M950) is the administrator's
	const all = [
		{ id: 'summary', label: t.tabSummary, icon: 'mdi-view-dashboard-outline' },
		{ id: 'outputs', label: t.tabOutputs, icon: 'mdi-export-variant', min: 'technician' },
		{ id: 'lighting', label: t.tabLighting, icon: 'mdi-lightbulb-on-outline', min: 'technician' },
		{ id: 'states', label: t.tabStates, icon: 'mdi-traffic-light', min: 'technician' },
		{ id: 'colors', label: t.tabColors, icon: 'mdi-palette', min: 'technician' },
		{ id: 'effects', label: t.tabEffects, icon: 'mdi-animation-play', min: 'technician' },
		{ id: 'advanced', label: t.tabAdvanced, icon: 'mdi-tune', min: 'admin' }
	]
	const shown = visibleItems(all, op => canDo(op))
	// without an LED strip there is no work light to control
	return stripPresent.value ? shown : shown.filter(k => k.id !== 'lighting')
})

// a tab the role does not see (a tab remembered by the browser, or the role changed) falls back to the summary
watch(tabs, list => {
	if (!list.some(x => x.id === tab.value)) {
		tab.value = 'summary'
	}
}, { immediate: true })
watch(tab, v => {
	try {
		window.localStorage.setItem('lightsTab', v)
	} catch (e) { /* private window: not remembered */ }
})
// no strip: the lighting tab disappears
watch(stripPresent, v => {
	if (!v && tab.value === 'lighting') {
		tab.value = 'summary'
	}
	if (!v) {
		stripSel.value = null
	}
})

onMounted(() => load())
onBeforeUnmount(() => clearTimeout(armedTimer))

function errorText(r) {
	const k = errors[r && r.code]
	return k ? t[k] : (r && r.error) || ''
}
// API of WorkshopService: lights.<op> with named arguments (JSON objects go
// as they are, up to 1 MB). Answers the JSON of the service.
async function lightsApi(op, args) {
	return await api('lights.' + op, args || {})
}
function totalForm() {
	return (Number(form.value.led_start) || 0) + (Number(form.value.led_count) || 0) + (form.value.zones_extra || []).reduce((s, z) => s + (Number(z.n) || 0), 0)
}
function applyResponse(r, onlyForm) {
	const c = r.config
	// the plain LED on a Pi pin is gone: a saved led_pin is ignored (and not sent back)
	delete c.led_pin
	defaultNames(c)
	form.value = copy(c)
	if (!onlyForm) {
		saved.value = copy(c)
		m950.value = r.m950 || { line: null, total: null }
		m950All.value = r.m950_all || {}
		countN.value = m950.value.total || totalForm()
	}
	if (r.catalog) {
		catalog.value = r.catalog // the state names come in the language this page asked for
	}
}
function message(text, error) {
	msg.value = text
	msgError.value = !!error
}
async function load() {
	try {
		const r = await lightsApi('get')
		if (r.ok) {
			applyResponse(r)
		}
	} catch (e) {
		// without a session the reason is the sign-in, not a service that is down
		message(errorKind(e) === 'other' ? t.cantRead : friendlyErrorText(e, ts), true)
	}
}
async function save() {
	saving.value = true
	msg.value = null
	try {
		const r = await lightsApi('save', { config: form.value })
		if (!r.ok) {
			throw new Error(errorText(r))
		}
		applyResponse(r)
		// the work light, if on, takes the new colour
		if (lightOn.value) {
			await api('light.set', { on: true })
		}
		message(t.saved, false)
	} catch (e) {
		message(t.cantSave + (e.message || e), true)
	} finally {
		saving.value = false
	}
}
function discard() {
	form.value = copy(saved.value)
	msg.value = null
}
// double tap: the first arms, the second does it (4 s)
function arm(that, fn) {
	if (armed.value === that) {
		armed.value = null
		clearTimeout(armedTimer)
		fn()
		return
	}
	armed.value = that
	clearTimeout(armedTimer)
	armedTimer = setTimeout(() => { armed.value = null }, 4000)
}
async function waitfor(ms) {
	await new Promise(r => setTimeout(r, ms))
}
// "Test this state": the service shows it for ~6 s on the chosen outputs,
// with the colour and effect on screen (even if not saved yet)
async function testState(id) {
	const e = form.value.states[id]
	const outputs = ['strip', 'screen', 'board'].filter(o => e.outputs[o] && (o !== 'strip' || stripPresent.value))
	testingState.value = id
	try {
		const r = await lightsApi('test_state', { state: id, seconds: 6, outputs: outputs.length ? outputs : ['screen'], data: { color: e.color, effect: e.effect } })
		if (!r.ok) {
			throw new Error(errorText(r))
		}
		await waitfor(6500)
	} catch (err) {
		message(t.cantTest + (err.message || err), true)
	} finally {
		testingState.value = null
	}
}
// plain API call with a wait and an error message (tests, animations, previews)
async function invoke(that, op, args, ms, textError) {
	testing.value = that
	try {
		const r = await lightsApi(op, args)
		if (r && r.ok === false) {
			throw new Error(errorText(r))
		}
		await waitfor(ms)
	} catch (e) {
		message(textError + (e.message || e), true)
	} finally {
		testing.value = null
	}
}
async function changeLight(v) {
	busyLight.value = true
	try {
		await api('light.set', { on: !!v })
	} finally {
		busyLight.value = false
	}
}
async function changeState(v) {
	busyState.value = true
	try {
		await api('statuslight.set', { on: !!v })
	} finally {
		busyState.value = false
	}
}
// work light scene, one tap (a saved scene, or a colour from the picker)
async function applyScene(sc) {
	try {
		const r = await lightsApi('scene', sc.id ? { scene: sc.id } : { color: sc.color })
		if (!r.ok) {
			throw new Error(errorText(r))
		}
		form.value.light_color = copy(r.config.light_color)
		saved.value.light_color = copy(r.config.light_color)
		form.value.work_light.scene = r.config.work_light.scene
		saved.value.work_light.scene = r.config.work_light.scene
	} catch (e) {
		message(t.cantApply + (e.message || e), true)
	}
}
// export: the whole profile as a JSON file
function exportProfile() {
	const obj = { kind: 'workshop-lights-profile', version: 1, exported: new Date().toISOString(), config: form.value }
	const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = 'lights-profile.json'
	document.body.appendChild(a)
	a.click()
	setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
}
// import: the service checks the file and answers the normalised profile;
// it goes to the form WITHOUT saving (review it, then Save)
async function importProfile(text, withHardware) {
	try {
		const obj = JSON.parse(text)
		const r = await lightsApi('import', { data: obj, hardware: !!withHardware })
		if (!r.ok) {
			throw new Error(errorText(r))
		}
		applyResponse(r, true)
		message(t.profileLoaded, false)
	} catch (e) {
		message(e instanceof SyntaxError ? t.errBadJson : t.cantApply + (e.message || e), true)
	}
}

// the tabs read and change the page through this object (refs and computeds are unwrapped by reactive)
provide('lights', reactive({
	tab, saved, form, catalog, m950, m950All, saving, msg, msgError, countN, stripEnlarged, stripSel, testing, armed, applyingM950,
	requestRestart, copyConfig, busyLight, busyState, busyZone, testingState,
	piPaints, stripPresent, model, read, indicator, info, lightOn, statusAuto, secsStrip, secsState, modeCurrent, machineStill, changed,
	canDo, atLeast, errorText, lightsApi, totalForm, applyResponse, message, load, save, discard, arm, testState, invoke, changeLight,
	changeState, applyScene, exportProfile, importProfile
}))
</script>

<style scoped>
.text-faint {
	color: var(--tp-faint);
}
/* below DWC's top bar (64 px), above the rest of the page */
.lights-fixed {
	position: sticky;
	top: 64px;
	z-index: 5;
}
.save-bar {
	position: sticky;
	bottom: 0;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-wrap: wrap;
	padding: 10px 16px;
	background: var(--tp-bar, rgba(30, 30, 30, 0.96));
	border-top: 1px solid rgba(128, 128, 128, 0.25);
	border-radius: 4px;
}
</style>
