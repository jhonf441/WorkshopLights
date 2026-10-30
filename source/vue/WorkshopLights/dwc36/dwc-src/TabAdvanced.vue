<template>
	<div>
		<details class="wf-more">
			<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
		<div class="text-body-2 text-faint mb-3">{{ t.intro }}</div>
		</details>

		<!-- ===== Strip order and zones ===== -->
		<v-card v-if="lights.stripPresent" class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-swap-horizontal</v-icon>{{ t.orderTitle }}</div>
				<details class="wf-more">
					<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
				<div class="text-caption text-faint mb-3">{{ t.orderWhat }}</div>
				</details>
				<strip-zones part="order" />
			</v-card-text>
		</v-card>

		<!-- ===== Strip on the Pi: enable it and choose the pin of each strip ===== -->
		<v-card v-if="lights.stripPresent" class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-raspberry-pi</v-icon>{{ $t('plugins.WorkshopLights.tabAdvanced.pi_section_title') }}</div>
				<pi-outputs />
			</v-card-text>
		</v-card>

		<!-- ===== Board signals panel (screens only) ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-monitor-dashboard</v-icon>{{ t.panelTitle }}</div>
				<details class="wf-more">
					<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
				<div class="text-caption mb-2 text-faint">{{ t.panelWhat }}</div>
				</details>
				<v-switch v-model="form.strip_state.active" :label="t.panelSwitch" dense hide-details class="mt-0" />
				<template v-if="form.strip_state.active">
					<div class="group-title mt-3">{{ t.panelShows }}</div>
					<div class="d-flex flex-wrap" style="gap:4px 20px">
						<v-checkbox v-for="g in groups" :key="g.id" v-model="form.strip_state.groups" :value="g.id" :label="g.name" dense hide-details class="mt-0" />
					</div>
					<div class="d-flex flex-wrap align-center mt-3" style="gap:8px 16px">
						<div class="group-title mb-0">{{ t.panelLive }}</div>
						<v-chip x-small label :color="faults ? 'error' : 'success'" dark>
							{{ faults ? $t('plugins.WorkshopLights.tabAdvanced.panel_faults', { n: faults }) : $t('plugins.WorkshopLights.tabAdvanced.panel_summary', { n: activeCount, m: secs.length }) }}
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
									:class="[{ 'te-sel': sel === x.id }, x.blink > 0 && x.level > 0 ? 'lx-blink' : '']"
									:style="ledStyle(x)" :title="x.label" @mouseenter="sel = x.id" @click="sel = x.id"
								/>
							</template>
						</div>
						<div v-if="!groupedDots.length" class="text-body-2 text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.panel_nothing_active') }}</div>
						<div class="text-body-2 mt-2 te-label">{{ label || t.panelHint }}</div>
					</div>
					<div v-else class="mt-2">
						<div v-for="g in groupedShown" :key="g.id" class="te-grupo mb-2">
							<div class="te-group-cab">
								<span class="font-weight-medium">{{ t.groups[g.id] || g.id }}</span>
								<span class="text-faint ml-2">{{ $t('plugins.WorkshopLights.tabAdvanced.panel_summary', { n: g.active, m: g.secs.length }) }}</span>
							</div>
							<div class="te-list">
								<div v-for="x in g.secs" :key="x.id" class="te-item" :class="{ 'te-shutdown': !isActive(x), 'te-fault': isFault(x) }">
									<span class="te-point" :class="x.blink > 0 && x.level > 0 ? 'lx-blink' : ''" :style="ledStyle(x)" />
									<span class="te-text">{{ x.label }}</span>
								</div>
							</div>
						</div>
						<div v-if="!groupedShown.length" class="text-body-2 text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.panel_nothing_active') }}</div>
					</div>
					<div v-if="read && !read.ok" class="text-caption warning--text mt-1">{{ t.panelNoRead }}</div>
					<details class="wf-more">
						<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
					<div class="text-caption text-faint mt-2">{{ t.panelLimits }}</div>
					</details>
				</template>
			</v-card-text>
		</v-card>

		<!-- ===== Fallback ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-shield-check-outline</v-icon>{{ t.fallbackTitle }}</div>
				<div class="text-body-2 text-faint">{{ lights.stripPresent ? t.fallbackStrip : t.fallbackNoStrip }}</div>
				<details class="wf-more">
					<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
				<div class="text-body-2 text-faint mt-2">{{ t.stopping }}</div>
				</details>
			</v-card-text>
		</v-card>

		<!-- ===== Profile ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-file-export-outline</v-icon>{{ t.profileTitle }}</div>
				<div class="text-caption text-faint mb-3">{{ t.profileWhat }}</div>
				<div class="d-flex flex-wrap align-center" style="gap:12px">
					<v-btn small outlined @click="lights.exportProfile()"><v-icon small left>mdi-download</v-icon>{{ t.export }}</v-btn>
					<v-btn small outlined @click="$refs.file.click()"><v-icon small left>mdi-upload</v-icon>{{ t.import }}</v-btn>
					<v-checkbox v-model="withHardware" :label="t.withHardware" :hint="t.withHardwareHelp" persistent-hint dense class="mt-0 pt-0" />
					<input ref="file" type="file" accept="application/json,.json" style="display:none" @change="onFile">
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import StripZones from './StripZones.vue'
import PiOutputs from './PiOutputs.vue'
import { api } from './workshop-api.js'

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
	components: { StripZones, PiOutputs },
	inject: ['lights'],
	data() {
		return { t: T, sel: null, withHardware: false, onlyActive: false, view: this.readView() };
	},
	computed: {
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
		groupedShown() {
			return this.grouped
				.map(g => ({ id: g.id, active: g.secs.filter(x => this.isActive(x)).length, secs: this.onlyActive ? g.secs.filter(x => this.isActive(x)) : g.secs }))
				.filter(g => g.secs.length);
		},
		// dots view with "only active": a group with nothing on is not drawn at all (the service already
		// leaves out what is not configured for the mode in use, e.g. heaters without a sensor in Laser / CNC)
		groupedDots() {
			return this.onlyActive ? this.grouped.filter(g => g.secs.some(x => this.isActive(x))) : this.grouped;
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
		isActive(x) {
			return x.level > 0.3;
		},
		// the service marks a real problem (a heater fault, a board that stopped answering); a red colour alone is not one (the board LEDs are red)
		isFault(x) {
			return x.fault === true || /FALLA|FAULT|no contesta|not answering/i.test(x.label || '');
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
		},
		onFile(ev) {
			const f = ev.target.files && ev.target.files[0];
			ev.target.value = '';
			if (!f) {
				return;
			}
			const rd = new FileReader();
			rd.onload = () => this.lights.importProfile(String(rd.result), this.withHardware);
			rd.readAsText(f);
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
	font-size: 13px;
	margin-bottom: 4px;
}
.te-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 4px 12px;
}
.te-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 3px 8px;
	border-radius: 6px;
	background: rgba(255, 255, 255, 0.04);
	font-size: 13px;
	min-width: 0;
}
.te-item.te-shutdown {
	opacity: 0.55;
}
.te-item.te-fault {
	background: rgba(244, 67, 54, 0.18);
	outline: 1px solid rgba(244, 67, 54, 0.6);
}
.te-point {
	flex: none;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	outline: 1px solid rgba(255, 255, 255, 0.2);
}
.te-text {
	overflow-wrap: anywhere;
}
.te-label {
	min-height: 20px;
}
</style>
