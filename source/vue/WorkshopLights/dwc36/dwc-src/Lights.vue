<template>
	<v-container :style="secStyle" fluid class="pa-0 lights-page workshop-theme">
		<service-notice />

		<!-- ===== Header: always visible. One row of equal chips (2026-11-03, banner-state.js): the health of the page (page-header),
		     the light state (a dot of its color + a short phrase, no border: a state of the bar) and the outputs pill ("Outputs: 2 of 3",
		     a menu with the three outputs, each with its state and its line of help), then the start-up chip. ===== -->
		<page-header :lead="t.lead" icon="mdi-led-strip-variant" :title="t.title" :loading="!saved && !msgError && !readRefused" :reasons="saved || readRefused ? [] : [{ level: 'warn', text: t.cantRead }]">
			<v-chip small outlined class="wf-state-chip" :style="{ '--wf-dotc': bannerDot, '--wf-dotd': 'inline-block' }" :title="bannerStateHelp">{{ bannerStateText }}</v-chip>
			<v-menu offset-y :close-on-content-click="false">
				<template v-slot:activator="{ on, attrs }">
					<v-chip small outlined class="lights-outputs-chip" :title="t.outputsHelp" v-bind="attrs" v-on="on">
						{{ $t('plugins.WorkshopLights.lights.banner_outputs', { n: bannerOutputs.active, total: bannerOutputs.total }) }}<v-icon x-small right>mdi-chevron-down</v-icon>
					</v-chip>
				</template>
				<v-list dense class="lights-outputs-list">
					<v-list-item v-for="o in bannerOutputs.items" :key="o.id">
						<v-list-item-icon class="mr-3"><v-icon small>{{ o.icon }}</v-icon></v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title><span class="wf-dot lights-output-dot" :class="{ ok: o.on }" aria-hidden="true"></span>{{ $t(o.labelKey) }}</v-list-item-title>
							<v-list-item-subtitle class="lights-output-help">{{ $t(o.helpKey) }}</v-list-item-subtitle>
						</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>
			<template v-slot:startup><startup-panel plugin="WorkshopLights" :defs="rowsStartup" /></template>
		</page-header>


		<!-- the page could not be read because of the session or the role: said here (the save bar is for technicians only) -->
		<session-notice v-if="readRefused && !saved" :kind="readKind" needed="technician" :action="readAction" />

		<!-- ===== Tabs ===== -->
		<div class="st-layout mb-3">
		<side-tabs v-model="tab" :items="tabs" />
		<div class="st-body">
		<locked-cover v-if="lockedTab" :needed="lockedTab" />
		<tab-summary v-else-if="tab === 'summary'" />
		<tab-outputs v-else-if="tab === 'outputs'" />
		<tab-lighting v-else-if="tab === 'lighting' && stripPresent" />
		<tab-states v-else-if="tab === 'states'" />
		<tab-colors v-else-if="tab === 'colors'" />
		<tab-effects v-else-if="tab === 'effects'" />
		<tab-advanced v-else-if="tab === 'advanced'" />
		</div>
		</div>

		<!-- a message of someone who cannot see the save bar (a refused scene, for example) -->
		<session-notice v-if="note && refusal && !atLeast('technician')" :kind="refusal" needed="technician" :action="refusedAction" />
		<session-notice v-else-if="note && msgError && !atLeast('technician')" kind="error" :text="note" />

		<!-- ===== Save ===== -->
		<div v-if="atLeast('technician') && (changed || note)" class="save-bar">
			<session-notice v-if="note && refusal" variant="reason" :kind="refusal" needed="technician" :action="refusedAction" class="mr-3" />
			<span v-else-if="note" class="text-body-2 mr-3" :class="msgError ? 'error--text' : 'success--text'">{{ note }}</span>
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
import LockedCover from './LockedCover.vue' // the cover of a tab the role cannot open (vue/_shared36)
import { refusalCauseNow, refusalNow } from './session-refusal.js' // a refusal told by its cause (vue/_shared36)
import SessionNotice from './SessionNotice.vue' // the notice by cause (vue/_shared36)
import { mapActions } from 'vuex'
import { api } from './workshop-api.js'
import { errorKind, errorText } from './friendly-error.js'
import { ts } from './shared-t.js'
import { exchangeExportJson, exchangeImport } from './data-exchange-ui.js'
import { PROFILE_FORMAT, PROFILE_VERSION, PROFILE_PLUGIN, PROFILE_SPEC, profilePreview } from './profile-exchange.js'
import { lightState, outputsSummary } from './banner-state.js' // the two chips of the page bar (pure)
import { colorScreen } from './colors.js' // screen version of a LED color (vue/_shared)
import TabSummary from './TabSummary.vue'
import TabOutputs from './TabOutputs.vue'
import TabLighting from './TabLighting.vue'
import TabStates from './TabStates.vue'
import TabColors from './TabColors.vue'
import TabEffects from './TabEffects.vue'
import TabAdvanced from './TabAdvanced.vue'
import { copy } from './lights-shared.js'
import { roleMixin } from './role-mixin.js' // what the role sees (vue/_shared)
import { lockedItems, lockedNeed } from './role-view.js'
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
	stateHelp: i18n.t('plugins.WorkshopLights.lights.banner_state_help'),
	outputsHelp: i18n.t('plugins.WorkshopLights.lights.banner_outputs_help'),
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
	profile: {
		noun: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_noun'),
		states: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_row_states'),
		scenes: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_row_scenes'),
		night: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_row_night'),
		nightOn: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_night_on'),
		nightOff: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_night_off'),
		hardware: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_row_hardware'),
		hardwareLoaded: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_hardware_loaded'),
		hardwareKept: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_hardware_kept'),
		notProfile: i18n.t('plugins.WorkshopLights.tabAdvanced.profile_not_profile')
	},
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
	// what the previous person read (the configuration, the refusal they saw) must not stay when the identity changes; onSessionChange reads it again
	sessionData: ['saved', 'form', 'catalog', 'm950', 'm950All', 'msg', 'msgError', 'refused', 'readError', 'countN', 'stripSel', 'copyConfig'],
	sessionErrors: ['msg', 'msgError', 'refused', 'readError'], // what a refusal or a failure said: cleared when the person signs in, out or changes role (role-mixin.js)
	components: { SessionNotice, PageHeader, SideTabs, LockedCover, ServiceNotice: ServiceNotice, StartupPanel: StartupPanel, TabSummary, TabOutputs, TabLighting, TabStates, TabColors, TabEffects, TabAdvanced },
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
			readError: null, // the error of lights.get when it was refused (no session / role); null otherwise. The sentence is computed from it
			refused: null, // { error, action } of the last action (msg) when it was refused: the sentence and the cause are computed, never stored
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
		// what a refusal said is computed from the error it came with: it follows the role and the language (never a stored sentence)
		readKind() {
			void this.identityTick;
			return refusalCauseNow(this.readError);
		},
		readRefused() {
			void this.identityTick;
			return refusalNow(this.readError, 'technician', i18n.t('plugins.WorkshopLights.lights.action_read'));
		},
		readAction() {
			return i18n.t('plugins.WorkshopLights.lights.action_read');
		},
		refusal() {
			void this.identityTick;
			return this.refused ? refusalCauseNow(this.refused.error) : '';
		},
		refusedAction() {
			return this.refused && this.refused.action ? i18n.t(this.refused.action) : '';
		},
		// the line of the last action: its text, or (a refusal) the sentence of its cause
		note() {
			void this.identityTick;
			return this.refused ? refusalNow(this.refused.error, 'technician', this.refusedAction) : this.msg;
		},
		secStyle() {
			return { '--wf-sec': sectionColor(this.tab) }
		},
		// the page bar (banner-state.js): the light state in one line, with the screen version of its color as the dot
		bannerState() {
			return lightState(this.indicator, this.lightOn);
		},
		bannerStateText() {
			const r = this.bannerState;
			return r.key ? this.$t(r.key, r.params) : r.text;
		},
		bannerDot() {
			const hex = this.bannerState.hex;
			return hex ? colorScreen(hex, 'fill') : 'rgba(128, 128, 128, 0.6)';
		},
		// the tooltip: what the chip is, the reason the service gives and the states active at the same time
		bannerStateHelp() {
			const r = this.bannerState;
			return [T.stateHelp, r.reason, r.names.length > 1 ? r.names.join(', ') : ''].filter(Boolean).join('\n');
		},
		// the three outputs and which ones are in use; the on-screen indicator also shows in the side bar and the jog: those plugins are
		// named in its help only when they are there
		bannerOutputs() {
			return outputsSummary(this.form, { bar: pluginActive(this.$store, 'bar'), jog: pluginActive(this.$store, 'jog') });
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
		allTabs() {
			return this.tabsDefinition();
		},
		tabs() {
			// F3-V (2026-10-21): the summary (state of the strip, work light and scenes) is for everybody; the settings tabs are a
			// technician's; Advanced (strip order, Pi pins, board panel, M950) is the administrator's
			const all = this.tabsDefinition();
			// the tabs above the role stay in the list, locked (they open a cover that says why)
			const shown = lockedItems(all, op => this.canDo(op));
			// without an LED strip there is no work light to control
			return this.stripPresent ? shown : shown.filter(k => k.id !== 'lighting');
		},
		// the role that opens the tab now open, or '' when this role may
		lockedTab() {
			return lockedNeed(this.tabsDefinition(), this.tab, op => this.canDo(op));
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
		tabsDefinition() {
			return [
				{ id: 'summary', label: T.tabSummary, icon: 'mdi-view-dashboard-outline' },
				{ id: 'outputs', label: T.tabOutputs, icon: 'mdi-export-variant', min: 'technician' },
				{ id: 'lighting', label: T.tabLighting, icon: 'mdi-lightbulb-on-outline', min: 'technician' },
				{ id: 'states', label: T.tabStates, icon: 'mdi-traffic-light', min: 'technician' },
				{ id: 'colors', label: T.tabColors, icon: 'mdi-palette', min: 'technician' },
				{ id: 'effects', label: T.tabEffects, icon: 'mdi-animation-play', min: 'technician' },
				{ id: 'advanced', label: T.tabAdvanced, icon: 'mdi-tune', min: 'admin' }
			];
		},
		// the person signed in or out, or the role changed: read the configuration again (it may have been refused before)
		onSessionChange() {
			this.load();
		},
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
					this.readError = null;
					this.applyResponse(r);
				}
			} catch (e) {
				// a refusal (no session / role) is said with its cause and stops the loading; only a real failure says "cannot read"
				if (refusalCauseNow(e)) {
					this.readError = e;
				} else {
					this.readError = null;
					this.message(errorKind(e) === 'other' ? T.cantRead : errorText(e, ts), true);
				}
			}
		},
		message(text, error) {
			this.msg = text;
			this.msgError = !!error;
			this.refused = null;
		},
		// a failed action: a refusal (no session / role) is a calm note of its cause, never the red "could not" line
		fail(prefix, e, action) {
			if (!refusalCauseNow(e)) return this.message(prefix + (e.message || e), true);
			this.message('', false);
			this.refused = { error: e, action };
		},
		async save() {
			this.saving = true;
			this.msg = null;
			this.refused = null;
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
				this.fail(T.cantSave, e, 'plugins.WorkshopLights.lights.action_save');
			} finally {
				this.saving = false;
			}
		},
		discard() {
			this.form = copy(this.saved);
			this.msg = null;
			this.refused = null;
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
				this.fail(T.cantApply, e, 'plugins.WorkshopLights.lights.action_apply');
			}
		},
		// export: the whole profile as a file of the exchange standard (envelope of data-exchange.js)
		exportProfile() {
			const r = exchangeExportJson({ format: PROFILE_FORMAT, version: PROFILE_VERSION, plugin: PROFILE_PLUGIN, data: this.form, model: this.model });
			if (!r.ok) this.message(ts('exchange_export_failed'), true);
		},
		// import: the file is checked and shown in a preview (exchange standard); only when the person applies it the service checks it and
		// answers the normalised profile, and it goes to the form WITHOUT saving (review it, then Save)
		importProfile(withHardware) {
			return exchangeImport({
				what: T.profile.noun,
				spec: PROFILE_SPEC,
				model: this.model,
				preview: data => profilePreview(data, withHardware, T.profile),
				apply: async data => {
					try {
						const r = await this.lightsApi('import', { data, hardware: !!withHardware });
						if (!r.ok) {
							throw new Error(this.errorText(r));
						}
						this.applyResponse(r, true);
						this.message(T.profileLoaded, false);
					} catch (e) {
						throw new Error(T.cantApply + (e.message || e));
					}
				},
				notify: (text, ok) => this.message(text, !ok)
			});
		}
	}
};
</script>

<style scoped>
.text-faint {
	color: var(--tp-faint);
}
/* the outputs menu of the page bar: the line of help of each output wraps instead of being cut */
.lights-outputs-list {
	max-width: 420px;
}
.lights-output-help {
	white-space: normal;
}
.lights-output-dot {
	margin-right: 6px;
	vertical-align: middle;
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
