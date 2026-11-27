<template>
	<div>
		<!-- ===== Strip order and zones ===== -->
		<div v-if="lights.stripPresent" class="wf-group">
			<div class="help-tip-row mb-1"><h4 class="wf-group-title mb-0"><v-icon small class="mr-1">mdi-swap-horizontal</v-icon>{{ t.orderTitle }}</h4>
				</div>
				<help-line class="mb-2" :text="t.orderWhat" />
			<strip-zones part="order" />
		</div>

		<!-- ===== Strip on the Pi: enable it and choose the pin of each strip ===== -->
		<div v-if="lights.stripPresent" class="wf-group">
			<div class="help-tip-row mb-1"><h4 class="wf-group-title mb-0"><v-icon small class="mr-1">mdi-raspberry-pi</v-icon>{{ $t('plugins.WorkshopLights.tabAdvanced.pi_section_title') }}</h4>
				</div>
				<help-line class="mb-2" :text="$t('plugins.WorkshopLights.tabAdvanced.pi_section_what')" />
			<pi-outputs />
		</div>

		<!-- ===== Board signals panel (screens only) ===== -->
		<div class="wf-group">
			<div class="help-tip-row mb-1"><h4 class="wf-group-title mb-0"><v-icon small class="mr-1">mdi-monitor-dashboard</v-icon>{{ t.panelTitle }}</h4>
				</div>
				<help-line class="mb-2" :text="t.panelWhat + ' ' + t.panelLimits" />
			<v-switch v-model="form.strip_state.active" :label="t.panelSwitch" dense hide-details class="mt-0" />
			<template v-if="form.strip_state.active">
				<div class="group-title mt-3">{{ t.panelShows }}</div>
				<div class="d-flex flex-wrap" style="gap:4px 20px">
					<v-checkbox v-for="g in groups" :key="g.id" v-model="form.strip_state.groups" :value="g.id" :label="g.name" dense hide-details class="mt-0" />
				</div>
				<div class="d-flex flex-wrap align-center mt-3" style="gap:8px 16px">
					<div class="group-title mb-0">{{ t.panelLive }}</div>
					<v-chip
						small label :color="faults ? 'error' : 'success'" dark :outlined="faults > 0 && !onlyFaults" class="panel-live"
						:title="faults ? (onlyFaults ? $t('plugins.WorkshopLights.tabAdvanced.panel_show_all') : $t('plugins.WorkshopLights.tabAdvanced.panel_show_faults')) : ''"
						:aria-pressed="faults ? String(onlyFaults) : null" :ripple="faults > 0" @click="faults ? (onlyFaults = !onlyFaults) : null"
					>
						<v-icon small left>{{ faults ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
						{{ faults ? $t('plugins.WorkshopLights.tabAdvanced.panel_faults', { n: faults }) : $t('plugins.WorkshopLights.tabAdvanced.panel_summary', { n: activeCount, m: secs.length }) }}
						<span v-if="faults" class="ml-1">({{ onlyFaults ? $t('plugins.WorkshopLights.tabAdvanced.panel_show_all') : $t('plugins.WorkshopLights.tabAdvanced.panel_show_faults') }})</span>
					</v-chip>
					<v-spacer />
					<v-checkbox v-model="onlyActive" :label="$t('plugins.WorkshopLights.tabAdvanced.panel_only_active')" dense hide-details class="mt-0 pt-0" />
					<v-btn-toggle v-model="view" mandatory dense>
						<v-btn small value="list" :title="$t('plugins.WorkshopLights.tabAdvanced.panel_view_list')"><v-icon small>mdi-format-list-bulleted</v-icon></v-btn>
						<v-btn small value="dots" :title="$t('plugins.WorkshopLights.tabAdvanced.panel_view_dots')"><v-icon small>mdi-dots-grid</v-icon></v-btn>
					</v-btn-toggle>
				</div>
				<div v-if="!secs.length" class="text-body-2 text-faint mt-2">{{ t.panelNoData }}</div>
				<div v-else-if="view === 'dots'" class="mt-2">
					<div class="te-strip" @touchstart.passive="touch" @touchmove.passive="touch">
						<template v-for="(g, gi) in groupedDots">
							<span v-if="gi > 0" :key="'sep' + g.id" class="te-sep" />
							<span
								v-for="x in g.secs" :key="x.id" class="te-led" :data-te="x.id"
								:class="[{ 'te-sel': sel === x.id, 'te-led-fault': isFault(x) }, x.blink > 0 && x.level > 0 ? 'lx-blink' : '']"
								:style="ledStyle(x)" :title="x.label" @mouseenter="sel = x.id" @click="sel = x.id"
							/>
						</template>
					</div>
					<div v-if="!groupedDots.length" class="text-body-2 text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.panel_nothing_active') }}</div>
					<div class="text-body-2 mt-2 te-label">{{ label || t.panelHint }}</div>
				</div>
				<div v-else class="mt-2">
						<div v-for="g in groupedShown" :key="g.id" class="te-grupo mb-3">
							<div class="te-group-cab">
								<v-icon small class="mr-2">{{ groupIcon(g.id) }}</v-icon>
								<span class="te-group-name">{{ t.groups[g.id] || g.id }}</span>
								<span class="te-count">{{ $t('plugins.WorkshopLights.tabAdvanced.panel_summary', { n: g.active, m: g.secs.length }) }}</span>
							</div>
							<div class="te-list">
								<div v-for="x in g.secs" :key="x.id" class="te-item" :class="['is-' + stateOf(x)]" :title="x.label">
									<span class="te-point" :class="x.blink > 0 && x.level > 0 ? 'lx-blink' : ''" :style="ledStyle(x)" />
									<v-icon small class="te-cat">{{ groupIcon(x.group) }}</v-icon>
									<span class="te-text">
										<span class="te-name-row">
											<span class="te-name">{{ parts(x).name }}</span>
											<span v-if="parts(x).board" class="te-board">{{ parts(x).board }}</span>
										</span>
										<span class="te-detail">{{ parts(x).detail || '\u00a0' }}</span>
									</span>
									<span class="te-state"><v-icon small>{{ stateIcon(x) }}</v-icon>{{ stateText(x) }}</span>
								</div>
							</div>
						</div>
					<div v-if="!groupedShown.length" class="text-body-2 text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.panel_nothing_active') }}</div>
				</div>
				<div v-if="read && !read.ok" class="text-caption warning--text mt-1">{{ t.panelNoRead }}</div>
			</template>
		</div>

		<!-- ===== Fallback ===== -->
		<div class="wf-group">
			<div class="help-tip-row mb-1"><h4 class="wf-group-title mb-0"><v-icon small class="mr-1">mdi-shield-check-outline</v-icon>{{ t.fallbackTitle }}</h4>
				</div>
				<help-line class="mb-2" :text="t.stopping" />
			<div class="text-body-2 text-faint">{{ lights.stripPresent ? t.fallbackStrip : t.fallbackNoStrip }}</div>
		</div>

		<!-- ===== Profile ===== -->
		<div class="wf-group">
			<h4 class="wf-group-title"><v-icon small class="mr-1">mdi-file-export-outline</v-icon>{{ t.profileTitle }}</h4>
			<div class="text-caption text-faint mb-3">{{ t.profileWhat }}</div>
			<div class="d-flex flex-wrap align-center" style="gap:12px">
				<v-btn small outlined @click="lights.exportProfile()"><v-icon small left>mdi-download</v-icon>{{ t.export }}</v-btn>
				<v-btn small outlined :disabled="!importAllowed" @click="lights.importProfile(withHardware)"><v-icon small left>mdi-upload</v-icon>{{ t.import }}</v-btn>
				<div class="help-tip-row"><v-checkbox v-model="withHardware" dense class="mt-0 pt-0" hide-details :label="t.withHardware" /></div>
			</div>
				<help-line class="mt-2" :text="t.withHardwareHelp" />
			<lock-reason :ops="importOps" min="technician" class="mt-2" :subject="$t('plugins.WorkshopLights.subjects.import_lights')" />
		</div>

		<!-- one help for the section, at its foot (FAMILIA-REDISENO 3, C4): it used to open the tab -->
		<help-guide class="mt-3"><p class="mb-0">{{ t.intro }}</p></help-guide>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import StripZones from './StripZones.vue'
import PiOutputs from './PiOutputs.vue'
import HelpLine from './HelpLine.vue' // vue/_shared36
import LockReason from './LockReason.vue' // vue/_shared36
import { IMPORT_OPS, groupAllowed } from './access-groups.js'
import { api } from './workshop-api.js'
import HelpGuide from './HelpGuide.vue' // vue/_shared36
import { groupIcon, isFault, isActive, signalState, splitLabel, faultsFirst, STATE_ICONS } from './panel-signals.js'

// Every user-visible text of this component is here.
const VIEW_KEY = 'workshopLightsPanelView'

const T = {
	intro: i18n.t('plugins.WorkshopLights.tabAdvanced.things_that_almost_never_need_touching'),
	orderTitle: i18n.t('plugins.WorkshopLights.tabAdvanced.zone_order_and_additional_strips'),
	orderWhat: i18n.t('plugins.WorkshopLights.tabAdvanced.a_strip_is_painted_in_order'),
	panelTitle: i18n.t('plugins.WorkshopLights.tabAdvanced.board_signals_panel_screens_only'),
	panelWhat: i18n.t('plugins.WorkshopLights.tabAdvanced.a_panel_that_only_exists_on'),
	panelSwitch: i18n.t('plugins.WorkshopLights.tabAdvanced.show_the_signals_panel'),
	panelShows: i18n.t('plugins.WorkshopLights.tabAdvanced.what_it_shows'),
	panelLive: i18n.t('plugins.WorkshopLights.tabAdvanced.live'),
	panelHint: i18n.t('plugins.WorkshopLights.tabAdvanced.tap_a_dot_or_hover_over'),
	panelNoData: i18n.t('plugins.WorkshopLights.tabAdvanced.no_data_yet_save_and_wait'),
	panelNoRead: i18n.t('plugins.WorkshopLights.tabAdvanced.the_service_could_not_read_the'),
	panelLimits: i18n.t('plugins.WorkshopLights.tabAdvanced.what_cannot_be_read_from_the'),
	groups: { board: i18n.t('plugins.WorkshopLights.common.board_leds'), final: i18n.t('plugins.WorkshopLights.tabAdvanced.endstops'), probes: i18n.t('plugins.WorkshopLights.tabAdvanced.probes_and_bltouch'), fans: i18n.t('plugins.WorkshopLights.tabAdvanced.fans'), heaters: i18n.t('plugins.WorkshopLights.tabAdvanced.heaters'), laser: i18n.t('plugins.WorkshopLights.tabAdvanced.laser_and_spindle'), outputs: i18n.t('plugins.WorkshopLights.tabAdvanced.outputs_m42') },
	fallbackTitle: i18n.t('plugins.WorkshopLights.tabAdvanced.if_something_fails'),
	fallbackStrip: i18n.t('plugins.WorkshopLights.tabAdvanced.the_service_tells_the_board_every'),
	fallbackNoStrip: i18n.t('plugins.WorkshopLights.tabAdvanced.without_a_strip_there_is_nothing'),
	stopping: i18n.t('plugins.WorkshopLights.tabAdvanced.if_you_stop_or_disable_workshop'),
	profileTitle: i18n.t('plugins.WorkshopLights.tabAdvanced.lighting_profile'),
	profileWhat: i18n.t('plugins.WorkshopLights.tabAdvanced.export_saves_all_the_colors_states'),
	export: i18n.t('plugins.WorkshopLights.tabAdvanced.export_profile'),
	import: i18n.t('plugins.WorkshopLights.tabAdvanced.import_profile'),
	withHardware: i18n.t('plugins.WorkshopLights.tabAdvanced.also_include_the_strip_led_counts'),
	withHardwareHelp: i18n.t('plugins.WorkshopLights.tabAdvanced.leave_it_off_to_move_a')
};

export default {
	components: { HelpLine, HelpGuide, StripZones, PiOutputs, LockReason },
	inject: ['lights'],
	data() {
		return { t: T, sel: null, withHardware: false, onlyActive: false, onlyFaults: false, view: this.readView(), importOps: IMPORT_OPS };
	},
	computed: {
		// import a profile: the answer of the service (the table of the role until it answers)
		importAllowed() {
			return groupAllowed(IMPORT_OPS, op => this.lights.canDo(op));
		},
		form() {
			return this.lights.form;
		},
		groups() {
			return Object.keys(T.groups).map(id => ({ id, name: T.groups[id] }));
		},
		// board signals panel published by the service (ledStrip.stripState)
		read() {
			const t = this.lights.read('ledStrip');
			const te = t && (typeof t.get === 'function' ? t.get('stripState') : t.stripState);
			return te && Array.isArray(te.secs) ? te : null;
		},
		secs() {
			return this.read ? this.read.secs : [];
		},
		grouped() {
			const out = [];
			this.secs.forEach(x => {
				let g = out[out.length - 1];
				if (!g || g.id !== x.group) {
					g = { id: x.group, secs: [] };
					out.push(g);
				}
				g.secs.push(x);
			});
			return out;
		},
		// "active" = the board reports something on (dim green / violet are the idle states)
		activeCount() {
			return this.secs.filter(x => this.isActive(x)).length;
		},
		faults() {
			return this.secs.filter(x => this.isFault(x)).length;
		},
		// groups with their count (of ALL their signals) and the signals to draw: faults first; "only faults" / "only what is active" filter
		groupedShown() {
			return this.grouped
				.map(g => ({ id: g.id, active: g.secs.filter(x => this.isActive(x)).length, secs: faultsFirst(this.visible(g.secs)) }))
				.filter(g => g.secs.length);
		},
		// dots view with "only active": a group with nothing on is not drawn at all (the service already
		// leaves out what is not configured for the mode in use, e.g. heaters without a sensor in Laser / CNC)
		groupedDots() {
			return this.grouped.filter(g => this.visible(g.secs).length).map(g => ({ id: g.id, secs: this.visible(g.secs) }));
		},
		label() {
			const x = this.secs.find(y => y.id === this.sel);
			return x ? x.label : '';
		}
	},
	watch: {
		view(v) {
			try {
				localStorage.setItem(VIEW_KEY, v);
			} catch (e) {
				/* not critical */
			}
		}
	},
	// The service works out the board signals panel only while this tab is open (dsf/viewers.py, topic
	// lights_board): every 10 s, only if the browser tab is visible.
	mounted() {
		this._heartbeat = setInterval(() => this.heartbeat(), 10000);
		this.heartbeat();
	},
	beforeDestroy() {
		clearInterval(this._heartbeat);
	},
	methods: {
		heartbeat() {
			if (document.hidden || !this.$el || this.$el.isConnected === false) return;
			api('view.heartbeat', { topic: 'lights_board' }).catch(() => {});
		},
		readView() {
			try {
				let saved = localStorage.getItem(VIEW_KEY);
				return saved === 'dots' ? 'dots' : 'list';
			} catch (e) {
				return 'list';
			}
		},
		isActive,
		isFault,
		groupIcon,
		stateOf: signalState,
		parts: splitLabel,
		stateIcon(x) {
			return STATE_ICONS[signalState(x)];
		},
		stateText(x) {
			return this.$t('plugins.WorkshopLights.tabAdvanced.panel_state_' + signalState(x));
		},
		// "only faults" wins over "only what is active"
		visible(list) {
			if (this.onlyFaults) {
				return list.filter(x => isFault(x));
			}
			return this.onlyActive ? list.filter(x => isActive(x)) : list;
		},
		ledStyle(x) {
			const on = x.level > 0;
			const c = on ? this.rgba(x) : 'rgba(40,40,40,0.9)';
			const st = { background: c };
			if (on) {
				st.boxShadow = '0 0 5px ' + c;
			}
			if (on && x.blink > 0) {
				st.animationDuration = (4 * x.blink) + 's';
			}
			return st;
		},
		rgba(x) {
			const h = String(x.hex).replace('#', '');
			const a = 0.6 + 0.4 * Math.sqrt(Math.min(1, x.level));
			return `rgba(${parseInt(h.substr(0, 2), 16)},${parseInt(h.substr(2, 2), 16)},${parseInt(h.substr(4, 2), 16)},${a})`;
		},
		// slide the finger along the panel: shows the point under it
		touch(ev) {
			const t = ev.touches && ev.touches[0];
			if (!t) {
				return;
			}
			const el = document.elementFromPoint(t.clientX, t.clientY);
			const id = el && el.getAttribute && el.getAttribute('data-te');
			if (id) {
				this.sel = id;
			}
		}
	}
};
</script>

<style scoped>
.text-faint {
	color: var(--tp-faint);
}
.group-title {
	font-size: 13px;
	color: var(--tp-faint, #9e9e9e);
	margin-bottom: 6px;
}
.te-strip {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	padding: 6px;
	border-radius: 6px;
	background: rgba(0, 0, 0, 0.35);
	touch-action: none;
}
.te-led {
	width: 22px;
	height: 22px;
	border-radius: 4px;
	cursor: pointer;
	outline: 1px solid rgba(255, 255, 255, 0.15);
}
.te-led.te-sel {
	outline: 2px solid #1976d2;
	outline-offset: 1px;
}
.te-sep {
	width: 2px;
	height: 22px;
	margin: 0 4px;
	background: rgba(255, 255, 255, 0.3);
}
.te-group-cab {
	display: flex;
	align-items: center;
	font-size: 14px;
	margin-bottom: 6px;
	padding-bottom: 4px;
	border-bottom: 1px solid rgba(128, 128, 128, 0.3);
}
.te-group-name {
	font-weight: 600;
}
.te-count {
	margin-left: auto;
	font-size: 12px;
	padding: 0 8px;
	line-height: 20px;
	border-radius: 10px;
	border: 1px solid rgba(128, 128, 128, 0.45);
	background: rgba(128, 128, 128, 0.14);
}
.te-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 6px 12px;
}
.te-item {
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 56px;
	box-sizing: border-box;
	padding: 6px 10px;
	border-radius: 8px;
	border: 1px solid rgba(128, 128, 128, 0.4);
	background: rgba(128, 128, 128, 0.1);
	font-size: 13px;
	min-width: 0;
}
.te-item.is-fault {
	border: 2px solid #e53935;
	background: rgba(244, 67, 54, 0.16);
}
.te-point {
	flex: none;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55), 0 0 0 2px rgba(0, 0, 0, 0.45);
}
.te-cat {
	flex: none;
}
.te-text {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	flex-direction: column;
}
.te-name-row {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}
.te-name {
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.te-board {
	flex: none;
	max-width: 50%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 12px;
	line-height: 18px;
	padding: 0 6px;
	border-radius: 9px;
	border: 1px solid rgba(128, 128, 128, 0.5);
	background: rgba(128, 128, 128, 0.16);
}
.te-detail {
	font-size: 12px;
	line-height: 16px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--tp-faint);
}
.te-state {
	flex: none;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 600;
}
.te-item.is-fault .te-state {
	color: #e53935;
}
.te-led-fault {
	outline: 2px solid #e53935 !important;
}
.panel-live {
	min-height: 32px;
}
.te-label {
	min-height: 20px;
}
</style>
