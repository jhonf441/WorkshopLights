<template>
	<div>
		<!-- ===== What the machine is doing ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-information-outline</v-icon>{{ t.nowTitle }}</div>
				<div class="text-caption text-faint mb-3">{{ t.nowHelp }}</div>
				<state-badge :ind="lights.indicator" />
				<div class="d-flex flex-wrap mt-3 text-body-2" style="gap:6px 24px">
					<span><b>{{ t.mode }}:</b> {{ modeName }}</span>
					<span><b>{{ t.machine }}:</b> {{ statusName }}</span>
					<span v-if="lights.stripPresent && lights.info.night && lights.info.night.on"><v-icon small>mdi-weather-night</v-icon> {{ t.nightOn }} ({{ lights.info.night.level }} %)</span>
				</div>
							<details class="wf-more">
					<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
					<p class="text-faint">{{ $t('plugins.WorkshopLights.lights.here_you_decide_how_what_the') }}</p>
				</details>
</v-card-text>
		</v-card>

		<!-- ===== The three outputs, live ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-export-variant</v-icon>{{ t.outputsTitle }}</div>
				<div class="text-caption text-faint mb-3">{{ t.outputsHelp }}</div>
				<div class="outputs">
					<div class="output">
						<div class="output-title"><v-icon small class="mr-1">mdi-led-strip-variant</v-icon>{{ t.strip }}</div>
						<template v-if="lights.stripPresent">
							<led-strip :secs="stripSecs" />
							<div class="text-caption text-faint mt-1">{{ lights.form && lights.form.output && lights.form.output.kind === 'pi' ? t.stripHelpPi : t.stripHelp }}</div>
						</template>
						<div v-else class="text-body-2 text-faint">{{ t.noStrip }}</div>
					</div>
					<div class="output">
						<div class="output-title"><v-icon small class="mr-1">mdi-monitor-dashboard</v-icon>{{ t.screen }}</div>
						<state-badge :ind="lights.indicator" compact />
						<div class="text-caption text-faint mt-1">{{ screenHelp }}</div>
					</div>
					<div class="output">
						<div class="output-title"><v-icon small class="mr-1">mdi-chip</v-icon>{{ t.board }}</div>
						<div v-if="board.length" class="d-flex" style="gap:6px">
							<span v-for="l in board" :key="l.id" class="board-led" :class="l.blink ? blinkClass(l.blink) : ''"
								:style="{ background: l.on ? l.hex : 'rgba(40,40,40,0.9)', boxShadow: l.on ? '0 0 6px ' + l.hex : 'none' }" :title="boardName(l.id) + ': ' + l.text" />
						</div>
						<div v-else class="text-body-2 text-faint">{{ lights.form.leds_board.active ? t.boardNoData : t.boardOff }}</div>
						<div class="text-caption text-faint mt-1">{{ t.boardHelp }}</div>
					</div>
				</div>
			</v-card-text>
		</v-card>

		<!-- ===== Active states ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-traffic-light</v-icon>{{ t.activeTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ t.activeHelp }}</div>
				<div v-if="active.length" class="d-flex flex-wrap" style="gap:8px">
					<v-chip v-for="a in active" :key="a.id" small outlined>
						<span class="chip-dot" :class="effectClass(a.effect)" :style="{ backgroundColor: a.hex }" />{{ a.name }}
					</v-chip>
				</div>
				<div v-else class="text-body-2 text-faint">{{ t.noneActive }}</div>
			</v-card-text>
		</v-card>

		<!-- ===== Work light (strip only) ===== -->
		<v-card v-if="lights.stripPresent" class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-lightbulb-on-outline</v-icon>{{ t.lightTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ t.lightHelp }}</div>
				<div class="d-flex flex-wrap align-center" style="gap:12px">
					<v-switch :input-value="lights.lightOn" :label="t.lightSwitch" dense hide-details class="mt-0" :loading="lights.busyLight" :disabled="!lights.canDo('light.set')" @change="lights.changeLight" />
					<!-- the same switch as in the Lighting tab: both can be turned on and off from here -->
					<v-switch :input-value="lights.statusAuto" :label="$t('plugins.WorkshopLights.tabLighting.automatic_status_lights')" dense hide-details class="mt-0" :loading="lights.busyState" :disabled="!lights.canDo('statuslight.set')" @change="lights.changeState" />
					<v-btn v-for="s in scenes" :key="s.id" small outlined :disabled="!lights.canDo('lights.scene')" :color="lights.form.work_light.scene === s.id ? 'primary' : ''" @click="lights.applyScene(s)">
						<span class="chip-dot" :style="{ backgroundColor: hex(s.color) }" />{{ s.name }}
					</v-btn>
				</div>
				<div v-if="lights.info.auto_off_min != null" class="text-caption text-faint mt-2">{{ t.autoOffIn }} {{ lights.info.auto_off_min }} min</div>
			</v-card-text>
		</v-card>

		<!-- ===== Power (strip only) ===== -->
		<v-card v-if="lights.stripPresent" class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-flash-outline</v-icon>{{ t.powerTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ t.powerHelp }}</div>
				<div class="d-flex flex-wrap text-body-2" style="gap:6px 24px">
					<span><b>{{ t.powerNow }}:</b> {{ power.ma }} mA</span>
					<span><b>{{ t.powerWorst }}:</b> {{ worst }} mA</span>
					<span v-if="limit"><b>{{ t.powerLimit }}:</b> {{ limit }} mA</span>
				</div>
				<v-alert v-if="limit && (power.over || worst > limit)" dense text :type="power.over ? 'error' : 'warning'" class="mt-2 mb-0">
					{{ power.over ? t.powerOver : t.powerWorstOver }}
				</v-alert>
			</v-card-text>
		</v-card>

		<!-- ===== History ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-history</v-icon>{{ t.historyTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ t.historyHelp }}</div>
				<v-simple-table v-if="history.length" dense class="history">
					<thead>
						<tr><th>{{ t.colTime }}</th><th>{{ t.colStates }}</th><th>{{ t.colMode }}</th><th class="text-right">{{ t.colDuration }}</th></tr>
					</thead>
					<tbody>
						<tr v-for="h in history" :key="h.t">
							<td>{{ h.time }}</td>
							<td>{{ h.names }}</td>
							<td>{{ h.mode }}</td>
							<td class="text-right">{{ h.duration }}</td>
						</tr>
					</tbody>
				</v-simple-table>
				<div v-else class="text-body-2 text-faint">{{ t.historyEmpty }}</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import StateBadge from './StateBadge.vue'
import LedStrip from './LedStrip.vue'
import { effectClass, rgbwHex } from './lights-shared.js'
import { pluginActive } from './workshop-ids.js' // the side bar is another plugin: nothing about it when it is absent

// Every user-visible text of this component is here.
const T = {
	nowTitle: i18n.t('plugins.WorkshopLights.tabSummary.what_the_machine_is_doing'),
	nowHelp: i18n.t('plugins.WorkshopLights.tabSummary.the_most_important_state_right_now'),
	mode: i18n.t('plugins.WorkshopLights.tabSummary.mode'),
	machine: i18n.t('plugins.WorkshopLights.tabSummary.machine'),
	nightOn: i18n.t('plugins.WorkshopLights.tabSummary.night_dimming_active'),
	outputsTitle: i18n.t('plugins.WorkshopLights.tabSummary.the_three_outputs_live'),
	outputsHelp: i18n.t('plugins.WorkshopLights.tabSummary.each_output_shows_the_state_its'),
	strip: i18n.t('plugins.WorkshopLights.common.led_strip'),
	stripHelp: i18n.t('plugins.WorkshopLights.tabSummary.live_copy_of_the_strip_connected'),
	stripHelpPi: i18n.t('plugins.WorkshopLights.tabSummary.live_copy_of_the_strip_on_the_pi'),
	noStrip: i18n.t('plugins.WorkshopLights.tabSummary.this_machine_has_no_led_strip'),
	screen: i18n.t('plugins.WorkshopLights.common.on_screen_indicator'),
	screenHelp: i18n.t('plugins.WorkshopLights.tabSummary.at_the_top_of_this_page'),
	board: i18n.t('plugins.WorkshopLights.common.board_leds'),
	boardHelp: i18n.t('plugins.WorkshopLights.tabSummary.status_can_vin_12_v_5'),
	boardOff: i18n.t('plugins.WorkshopLights.tabSummary.off_they_are_turned_on_in'),
	boardNoData: i18n.t('plugins.WorkshopLights.tabSummary.no_data_from_the_board_yet'),
	activeTitle: i18n.t('plugins.WorkshopLights.tabSummary.active_states'),
	activeHelp: i18n.t('plugins.WorkshopLights.tabSummary.everything_that_is_true_right_now'),
	noneActive: i18n.t('plugins.WorkshopLights.tabSummary.none_the_machine_only_shows_its'),
	lightTitle: i18n.t('plugins.WorkshopLights.common.work_light'),
	lightHelp: i18n.t('plugins.WorkshopLights.tabSummary.turn_the_lighting_on_or_off'),
	lightSwitch: i18n.t('plugins.WorkshopLights.common.work_light'),
	autoOffIn: i18n.t('plugins.WorkshopLights.tabSummary.the_light_will_turn_itself_off'),
	powerTitle: i18n.t('plugins.WorkshopLights.tabSummary.strip_consumption'),
	powerHelp: i18n.t('plugins.WorkshopLights.tabSummary.estimate_with_the_leds_lit_now'),
	powerNow: i18n.t('plugins.WorkshopLights.tabSummary.now'),
	powerWorst: i18n.t('plugins.WorkshopLights.common.everything_at_maximum'),
	powerLimit: i18n.t('plugins.WorkshopLights.common.your_supply_limit'),
	powerOver: i18n.t('plugins.WorkshopLights.tabSummary.what_is_lit_now_goes_over'),
	powerWorstOver: i18n.t('plugins.WorkshopLights.tabSummary.with_every_led_at_maximum_you'),
	historyTitle: i18n.t('plugins.WorkshopLights.tabSummary.last_state_changes'),
	historyHelp: i18n.t('plugins.WorkshopLights.tabSummary.up_to_50_changes_with_the'),
	historyEmpty: i18n.t('plugins.WorkshopLights.tabSummary.there_are_no_changes_to_show'),
	colTime: i18n.t('plugins.WorkshopLights.tabSummary.time'),
	colStates: i18n.t('plugins.WorkshopLights.tabSummary.states'),
	colMode: i18n.t('plugins.WorkshopLights.tabSummary.mode'),
	colDuration: i18n.t('plugins.WorkshopLights.tabSummary.duration'),
	onlyMode: i18n.t('plugins.WorkshopLights.tabSummary.only_the_mode'),
	now: i18n.t('plugins.WorkshopLights.tabSummary.now_lower'),
	status: {
		idle: i18n.t('plugins.WorkshopLights.tabSummary.at_rest'), processing: i18n.t('plugins.WorkshopLights.tabSummary.working'), paused: i18n.t('plugins.WorkshopLights.tabSummary.paused'), pausing: i18n.t('plugins.WorkshopLights.tabSummary.pausing'), resuming: i18n.t('plugins.WorkshopLights.tabSummary.resuming'), busy: i18n.t('plugins.WorkshopLights.tabSummary.busy'),
		halted: i18n.t('plugins.WorkshopLights.common.emergency_stop'), off: i18n.t('plugins.WorkshopLights.common.power_supply_off'), cancelling: i18n.t('plugins.WorkshopLights.tabSummary.cancelling'), simulating: i18n.t('plugins.WorkshopLights.tabSummary.simulating'),
		changingTool: i18n.t('plugins.WorkshopLights.tabSummary.changing_tool'), starting: i18n.t('plugins.WorkshopLights.tabSummary.starting'), updating: i18n.t('plugins.WorkshopLights.tabSummary.updating'), flashing: i18n.t('plugins.WorkshopLights.tabSummary.updating_firmware'),
		disconnected: i18n.t('plugins.WorkshopLights.tabSummary.not_connected')
	},
	boardNames: { can: i18n.t('plugins.WorkshopLights.tabSummary.status_can'), vin: 'VIN', v12: i18n.t('plugins.WorkshopLights.common.12_v'), v5: i18n.t('plugins.WorkshopLights.common.5_v'), v3_3: i18n.t('plugins.WorkshopLights.common.3_3_v') }
};

export default {
	components: { StateBadge, LedStrip: LedStrip },
	inject: ['lights'],
	data() {
		return { t: T };
	},
	computed: {
		screenHelp() {
			return pluginActive(this.$store, 'bar') ? this.t.screenHelp : this.$t('plugins.WorkshopLights.tabSummary.at_the_top_of_this_page_no_bar');
		},
		ind() {
			return this.lights.indicator || {};
		},
		modeName() {
			return this.ind.mode || this.lights.modeCurrent;
		},
		statusName() {
			const s = this.ind.status || (this.lights.model.state && this.lights.model.state.status) || 'idle';
			return T.status[s] || s;
		},
		active() {
			return Array.isArray(this.ind.active) ? this.ind.active : [];
		},
		// the whole strip as painted; with the automatic status lights on, the status zone
		stripSecs() {
			return this.lights.secsStrip.length ? this.lights.secsStrip : this.lights.secsState;
		},
		board() {
			const b = this.lights.info.board;
			return Array.isArray(b) ? b : [];
		},
		scenes() {
			return (this.lights.form.work_light && this.lights.form.work_light.scenes) || [];
		},
		power() {
			return this.lights.info.power || { ma: 0, limit: 0, over: false };
		},
		limit() {
			return Number(this.lights.form.power.limit_ma) || 0;
		},
		// every LED at full white (four channels at full brightness)
		worst() {
			const f = this.lights.form;
			const total = this.lights.totalForm();
			return total * 4 * (Number(f.power.ma_per_channel) || 20);
		},
		// history: [[epoch, "id+id", mode, status], ...]; duration = until the next one
		history() {
			const h = Array.isArray(this.lights.info.history) ? this.lights.info.history : [];
			const out = [];
			const nowS = Math.floor(Date.now() / 1000);
			h.forEach((e, i) => {
				const end = i + 1 < h.length ? h[i + 1][0] : nowS;
				out.push({
					t: e[0],
					time: new Date(e[0] * 1000).toLocaleTimeString(),
					names: e[1] ? e[1].split('+').map(this.stateName).join(' + ') : T.onlyMode,
					mode: e[2],
					duration: i + 1 < h.length ? this.span(end - e[0]) : T.now + ' (' + this.span(end - e[0]) + ')'
				});
			});
			return out.reverse();
		}
	},
	methods: {
		effectClass,
		hex: rgbwHex,
		boardName(id) {
			return T.boardNames[id] || id;
		},
		blinkClass(half) {
			return half > 0.5 ? 'lx-blink' : 'lx-blink_fast';
		},
		stateName(id) {
			const c = this.lights.catalog[id];
			return c ? c.text : id;
		},
		span(s) {
			s = Math.max(0, Math.round(s));
			if (s < 60) {
				return s + ' s';
			}
			if (s < 3600) {
				return Math.floor(s / 60) + ' min ' + (s % 60) + ' s';
			}
			return Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min';
		}
	}
};
</script>

<style scoped>
.text-faint {
	color: var(--tp-faint);
}
.outputs {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 12px;
}
.output {
	padding: 10px 12px;
	border-radius: 8px;
	background: rgba(128, 128, 128, 0.06);
}
.output-title {
	font-weight: 500;
	margin-bottom: 8px;
}
.board-led {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	display: inline-block;
}
.chip-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	display: inline-block;
	margin-right: 6px;
}
.history {
	max-height: 360px;
	overflow-y: auto;
}
</style>
