<template>
	<v-container :style="secStyle" fluid class="pa-0 lights-page workshop-theme">
		<service-notice />

		<!-- ===== Header: always visible, shows the current state ===== -->
		<page-header :lead="t.lead" icon="mdi-led-strip-variant" :title="t.title" :loading="!saved && !msgError" :reasons="saved ? [] : [{ level: 'warn', text: t.cantRead }]">
			<state-badge :ind="indicator" compact class="flex-grow-1" style="min-width:180px" />
			<v-chip small outlined :color="stripPresent ? 'success' : 'grey'" :title="t.chipStripHelp">
				<v-icon small left>mdi-led-strip-variant</v-icon>{{ stripPresent ? t.chipStrip : t.chipNoStrip }}
			</v-chip>
			<v-chip small outlined color="success" :title="chipScreenHelp"><v-icon small left>mdi-monitor-dashboard</v-icon>{{ t.chipScreen }}</v-chip>
			<v-chip small outlined :color="form.leds_board && form.leds_board.active ? 'success' : 'grey'" :title="t.chipBoardHelp">
				<v-icon small left>mdi-chip</v-icon>{{ form.leds_board && form.leds_board.active ? t.chipBoard : t.chipNoBoard }}
			</v-chip>
			<template v-slot:startup><startup-panel plugin="WorkshopLights" :defs="rowsStartup" /></template>
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
			<span v-if="msg" class="text-body-2 mr-3" :class="msgError ? 'error--text' : 'success--text'">{{ msg }}</span>
			<span v-else-if="changed" class="text-body-2 warning--text mr-3">{{ t.unsaved }}</span>
			<v-btn small :disabled="!changed" text class="mr-2" @click="discard()">{{ t.discard }}</v-btn>
			<span v-if="changed && !numbersOk" class="text-body-2 error--text mr-3">{{ t.checkNumbers }}</span>
			<v-btn small color="primary" :disabled="!saved || !changed || !numbersOk" :loading="saving" @click="save()">
				<v-icon left>mdi-content-save</v-icon>{{ t.save }}
			</v-btn>
		</div>
	</v-container>
</template>

<script>
import { sectionColor } from './section-colors.js'
import i18n from '../../i18n'

'use strict'

import ServiceNotice from './ServiceNotice.vue'
import StartupPanel from './StartupPanel.vue' // start-up card (vue/_shared)
import PageHeader from './PageHeader.vue' // header of every page (vue/_shared)
import { rowsLights } from './startup-rows.js'
import SideTabs from './SideTabs.vue'
import { mapActions } from 'vuex'
import { api } from './workshop-api.js'
import { errorKind, errorText } from './friendly-error.js'
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
import { roleMixin } from './role-mixin.js' // what the role sees (vue/_shared)
import { visibleItems } from './role-view.js'
import { pluginOf, pluginActive } from './workshop-ids.js' // Id nuevo o viejo del plugin
import { serviceTexts, serviceDefaultName } from './service-text.js'

// Factory names of scenes, extra zones and strips (WorkshopService lights_config.DEFAULT_NAME_KEYS): a name that is still
// one of them, in either language, is shown (and saved again) in the language of this DWC; a renamed one stays as it is.
const SCENE_NAMES = ['lights_scene_default_name', 'lights_scene_job', 'lights_scene_photo', 'lights_config_inspection', 'lights_scene_dim'];
function defaultNames(c) {
	((c.work_light && c.work_light.scenes) || []).forEach(s => {
		s.name = serviceDefaultName(s.name, SCENE_NAMES);
	});
	(c.zones_extra || []).forEach(z => {
		z.name = serviceDefaultName(z.name, ['lights_zone_default_name']);
	});
	(c.strips_extra || []).forEach(t => {
		t.name = serviceDefaultName(t.name, ['lights_strip_default_name']);
		(t.zones || []).forEach(z => {
			z.name = serviceDefaultName(z.name, ['lights_zone_default_name']);
		});
	});
}

// Every user-visible text of this component is here (one place, to ease the
// later move to translation keys). The tabs have their own T.
const T = {
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
};

const errors = {
	bad_json: 'errBadJson',
	bad_profile: 'errBadProfile',
	no_strip: 'errNoStrip',
	unknown_state: 'errUnknownState',
	unknown_scene: 'errUnknownScene'
};

const TAB_IDS = ['summary', 'outputs', 'lighting', 'states', 'colors', 'effects', 'advanced'];

// plugin data may come as a Map-like object or as a plain object
function prop(o, k) {
	return o && typeof o.get === 'function' ? o.get(k) : o ? o[k] : undefined;
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
};

export default {
	mixins: [roleMixin],
	components: { PageHeader, SideTabs, ServiceNotice: ServiceNotice, StartupPanel: StartupPanel, StateBadge, TabSummary, TabOutputs, TabLighting, TabStates, TabColors, TabEffects, TabAdvanced },
	provide() {
		// the tabs read and change the page through this object
		return { lights: this };
	},
	data() {
		return {
			t: T,
			tab: this.tabSaved(),
			saved: null,
			form: copy(FORM_EMPTY),
			catalog: {},
			m950: { line: null, total: null },
			m950All: {},
			saving: false,
			msg: null,
			msgError: false,
			countN: 37,
			stripEnlarged: false,
			stripSel: null, // null = main strip; number = index in form.strips_extra
			testing: null,
			armed: null,
			armedTimer: null,
			applyingM950: false,
			requestRestart: false,
			copyConfig: '',
			busyLight: false,
			busyState: false,
			busyZone: null,
			testingState: null
		};
	},
	computed: {
		secStyle() {
			return { '--wf-sec': sectionColor(this.tab) }
		},
		// the on-screen indicator also shows in the side bar and the jog: those plugins are named only when they are there
		chipScreenHelp() {
			const k = 'plugins.WorkshopLights.lights.output_2_the_indicator_of_this';
			return this.$t(k + (pluginActive(this.$store, 'bar') ? '' : '_no_bar') + (pluginActive(this.$store, 'jog') ? '' : '_no_jog'));
		},
		// who paints the strip: the Pi (strip over SPI that replaces the Duet's) or the Duet. With the Pi every effect is
		// complete; the Duet strip cannot follow the double flash and the pulse (each frame is a set of codes to the board).
		piPaints() {
			const g = this.form && this.form.output;
			return !!(g && g.kind === 'pi');
		},
		// start-up card: the SAVED configuration (what is in effect), once the service has answered
		rowsStartup() {
			const g = this.saved;
			return rowsLights({
				loaded: !!g,
				hasStrip: !!(g && g.strip && g.strip.present),
				kindOutput: g && g.output ? g.output.kind : 'duet',
				m950Line: this.m950.line,
				pinPi: g && g.output ? g.output.pin : null,
				ledsBoard: !!(g && g.leds_board && g.leds_board.active)
			});
		},
		tabs() {
			// F3-V (2026-10-21): the summary (state of the strip, work light and scenes) is for everybody; the settings tabs are a
			// technician's; Advanced (strip order, Pi pins, board panel, M950) is the administrator's
			const all = [
				{ id: 'summary', label: T.tabSummary, icon: 'mdi-view-dashboard-outline' },
				{ id: 'outputs', label: T.tabOutputs, icon: 'mdi-export-variant', min: 'technician' },
				{ id: 'lighting', label: T.tabLighting, icon: 'mdi-lightbulb-on-outline', min: 'technician' },
				{ id: 'states', label: T.tabStates, icon: 'mdi-traffic-light', min: 'technician' },
				{ id: 'colors', label: T.tabColors, icon: 'mdi-palette', min: 'technician' },
				{ id: 'effects', label: T.tabEffects, icon: 'mdi-animation-play', min: 'technician' },
				{ id: 'advanced', label: T.tabAdvanced, icon: 'mdi-tune', min: 'admin' }
			];
			const shown = visibleItems(all, op => this.canDo(op));
			// without an LED strip there is no work light to control
			return this.stripPresent ? shown : shown.filter(k => k.id !== 'lighting');
		},
		stripPresent() {
			return !!(this.form.strip && this.form.strip.present);
		},
		model() {
			return this.$store.state.machine.model;
		},
		pluginData() {
			const p = pluginOf(this.model.plugins, 'service');
			return (p && p.data) || {};
		},
		read() {
			// the service publishes its texts as {key, params}: they are shown in the language of this DWC
			const d = this.pluginData;
			return k => serviceTexts(prop(d, k));
		},
		// plugin data statusIndicator: the current state, the active ones, why
		indicator() {
			const i = this.read('statusIndicator');
			if (i && i.state) {
				return i;
			}
			// a service from before the redesign: only the text and the colour
			const txt = this.read('statusLightText');
			return txt ? { state: { id: 'base', name: txt, hex: this.read('statusLightColor') || '#616161', effect: 'steady' }, active: [], reason: '' } : null;
		},
		// plugin data lightsInfo: history, power, night dimming, board LEDs
		info() {
			return this.read('lightsInfo') || {};
		},
		lightOn() {
			return !!this.read('lightOn');
		},
		statusAuto() {
			const v = this.read('statusLightAuto');
			return v == null ? true : !!v;
		},
		// [[hex, level 0..1, count], ...] of the whole strip, as painted
		secsStrip() {
			const t = this.read('ledStrip');
			return t && Array.isArray(t.secs) ? t.secs.filter(s => s[2] > 0) : [];
		},
		secsState() {
			const secs = this.read('statusLightSecs');
			return Array.isArray(secs) ? secs.filter(s => s[2] > 0) : [];
		},
		modeCurrent() {
			return (this.model.state && this.model.state.machineMode) || 'Laser';
		},
		machineStill() {
			const s = this.model.state && this.model.state.status;
			return !['processing', 'paused', 'pausing', 'resuming', 'simulating', 'busy', 'cancelling'].includes(s);
		},
		changed() {
			return !!this.saved && JSON.stringify(this.form) !== JSON.stringify(this.saved);
		},
		// no empty / invalid LED count (it used to break the config)
		numbersOk() {
			const ent = (v, min) => v !== '' && v !== null && Number.isInteger(Number(v)) && Number(v) >= min;
			const strips = this.form.strips_extra || [];
			const is = [this.form.led_strip, ...strips.map(x => Number(x.led_strip))];
			return ent(this.form.led_start, 0) && ent(this.form.led_count, 1) && (this.form.zones_extra || []).every(z => ent(z.n, 1))
				&& strips.every(x => ent(x.led_strip, 0) && Number(x.led_strip) <= 9 && x.zones.every(z => ent(z.n, 1)))
				&& new Set(is.map(Number)).size === is.length;
		}
	},
	watch: {
		// a tab the role does not see (a tab remembered by the browser, or the role changed) falls back to the summary
		tabs: {
			immediate: true,
			handler(list) {
				if (!list.some(x => x.id === this.tab)) {
					this.tab = 'summary';
				}
			}
		},
		tab(v) {
			try {
				window.localStorage.setItem('lightsTab', v);
			} catch (e) { /* private window: not remembered */ }
		},
		// no strip: the lighting tab disappears
		stripPresent(v) {
			if (!v && this.tab === 'lighting') {
				this.tab = 'summary';
			}
			if (!v) {
				this.stripSel = null;
			}
		}
	},
	mounted() {
		this.load();
	},
	beforeDestroy() {
		clearTimeout(this.armedTimer);
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		tabSaved() {
			try {
				const v = window.localStorage.getItem('lightsTab');
				return TAB_IDS.includes(v) ? v : 'summary';
			} catch (e) {
				return 'summary';
			}
		},
		errorText(r) {
			const k = errors[r && r.code];
			return k ? T[k] : (r && r.error) || '';
		},
		// API of WorkshopService: lights.<op> with named arguments (JSON objects go
		// as they are, up to 1 MB). Answers the JSON of the service.
		async lightsApi(op, args) {
			return await api('lights.' + op, args || {});
		},
		applyResponse(r, onlyForm) {
			const c = r.config;
			// the plain LED on a Pi pin is gone: a saved led_pin is ignored (and not sent back)
			delete c.led_pin;
			defaultNames(c);
			this.form = copy(c);
			if (!onlyForm) {
				this.saved = copy(c);
				this.m950 = r.m950 || { line: null, total: null };
				this.m950All = r.m950_all || {};
				this.countN = this.m950.total || this.totalForm();
			}
			if (r.catalog) {
				this.catalog = r.catalog; // the state names come in the language this page asked for
			}
		},
		totalForm() {
			return (Number(this.form.led_start) || 0) + (Number(this.form.led_count) || 0) + (this.form.zones_extra || []).reduce((s, z) => s + (Number(z.n) || 0), 0);
		},
		async load() {
			try {
				const r = await this.lightsApi('get');
				if (r.ok) {
					this.applyResponse(r);
				}
			} catch (e) {
				// without a session the reason is the sign-in, not a service that is down
				this.message(errorKind(e) === 'other' ? T.cantRead : errorText(e, ts), true);
			}
		},
		message(text, error) {
			this.msg = text;
			this.msgError = !!error;
		},
		async save() {
			this.saving = true;
			this.msg = null;
			try {
				const r = await this.lightsApi('save', { config: this.form });
				if (!r.ok) {
					throw new Error(this.errorText(r));
				}
				this.applyResponse(r);
				// the work light, if on, takes the new colour
				if (this.lightOn) {
					await api('light.set', { on: true });
				}
				this.message(T.saved, false);
			} catch (e) {
				this.message(T.cantSave + (e.message || e), true);
			} finally {
				this.saving = false;
			}
		},
		discard() {
			this.form = copy(this.saved);
			this.msg = null;
		},
		// double tap: the first arms, the second does it (4 s)
		arm(that, fn) {
			if (this.armed === that) {
				this.armed = null;
				clearTimeout(this.armedTimer);
				fn();
				return;
			}
			this.armed = that;
			clearTimeout(this.armedTimer);
			this.armedTimer = setTimeout(() => { this.armed = null; }, 4000);
		},
		async waitfor(ms) {
			await new Promise(r => setTimeout(r, ms));
		},
		// "Test this state": the service shows it for ~6 s on the chosen outputs,
		// with the colour and effect on screen (even if not saved yet)
		async testState(id) {
			const e = this.form.states[id];
			const salidas = ['strip', 'screen', 'board'].filter(o => e.outputs[o] && (o !== 'strip' || this.stripPresent));
			this.testingState = id;
			try {
				const r = await this.lightsApi('test_state', { state: id, seconds: 6, outputs: salidas.length ? salidas : ['screen'], data: { color: e.color, effect: e.effect } });
				if (!r.ok) {
					throw new Error(this.errorText(r));
				}
				await this.waitfor(6500);
			} catch (err) {
				this.message(T.cantTest + (err.message || err), true);
			} finally {
				this.testingState = null;
			}
		},
		// plain API call with a wait and an error message (tests, animations, previews)
		async invoke(that, op, args, ms, textError) {
			this.testing = that;
			try {
				const r = await this.lightsApi(op, args);
				if (r && r.ok === false) {
					throw new Error(this.errorText(r));
				}
				await this.waitfor(ms);
			} catch (e) {
				this.message(textError + (e.message || e), true);
			} finally {
				this.testing = null;
			}
		},
		async changeLight(v) {
			this.busyLight = true;
			try {
				await api('light.set', { on: !!v });
			} finally {
				this.busyLight = false;
			}
		},
		async changeState(v) {
			this.busyState = true;
			try {
				await api('statuslight.set', { on: !!v });
			} finally {
				this.busyState = false;
			}
		},
		// work light scene, one tap (a saved scene, or a colour from the picker)
		async applyScene(sc) {
			try {
				const r = await this.lightsApi('scene', sc.id ? { scene: sc.id } : { color: sc.color });
				if (!r.ok) {
					throw new Error(this.errorText(r));
				}
				this.form.light_color = copy(r.config.light_color);
				this.saved.light_color = copy(r.config.light_color);
				this.form.work_light.scene = r.config.work_light.scene;
				this.saved.work_light.scene = r.config.work_light.scene;
			} catch (e) {
				this.message(T.cantApply + (e.message || e), true);
			}
		},
		// export: the whole profile as a JSON file
		exportProfile() {
			const obj = { kind: 'workshop-lights-profile', version: 1, exported: new Date().toISOString(), config: this.form };
			const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = 'lights-profile.json';
			document.body.appendChild(a);
			a.click();
			setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
		},
		// import: the service checks the file and answers the normalised profile;
		// it goes to the form WITHOUT saving (review it, then Save)
		async importProfile(text, withHardware) {
			try {
				const obj = JSON.parse(text);
				const r = await this.lightsApi('import', { data: obj, hardware: !!withHardware });
				if (!r.ok) {
					throw new Error(this.errorText(r));
				}
				this.applyResponse(r, true);
				this.message(T.profileLoaded, false);
			} catch (e) {
				this.message(e instanceof SyntaxError ? T.errBadJson : T.cantApply + (e.message || e), true);
			}
		}
	}
};
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
