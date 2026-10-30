<template>
	<div>
		<details class="wf-more">
			<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
		<div class="text-body-2 text-faint mb-3">{{ t.intro }}</div>
		</details>
		<v-switch :input-value="lights.statusAuto" :label="t.autoStatus" :hint="t.autoStatusHelp" persistent-hint dense class="mt-0 mb-3" :loading="lights.busyState" @change="lights.changeState" />

		<v-alert v-if="lookAlikes.length" dense outlined type="warning" class="mb-3">
			{{ t.lookAlike }}
			<div v-for="par in lookAlikes" :key="par">&bull; {{ par }}</div>
			<div class="text-caption">{{ t.lookAlikeHelp }}</div>
		</v-alert>

		<!-- ===== Several at once (strip) ===== -->
		<v-card v-if="lights.stripPresent" class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-layers-outline</v-icon>{{ t.combineTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ combineHelp }} ({{ activeNames }}).</div>
				<div class="combine">
					<button v-for="m in combineModes" :key="m.id" type="button" class="combine-op" :class="{ active: form.combine.mode === m.id }" :disabled="!!applyingMode" @click="chooseCombine(m.id)">
						<led-strip :secs="secsMode(m.id)" />
						<v-progress-linear v-if="applyingMode === m.id" indeterminate height="2" class="mt-1" />
						<div class="text-body-2 font-weight-medium mt-1">{{ m.name }}</div>
						<div class="text-caption text-faint">{{ m.desc }}</div>
					</button>
				</div>
				<div v-if="form.combine.mode === 'turns'" class="d-flex align-center mt-2" style="max-width:420px">
					<span class="text-body-2 mr-3" style="white-space:nowrap">{{ t.turnEach }} {{ form.combine.turn_s }} s</span>
					<v-slider v-model="form.combine.turn_s" min="0.5" max="5" step="0.5" hide-details dense @change="chooseCombine('turns')" />
				</div>
				<!-- zone capacity: how many states fit at once and what to do when they do not -->
				<div v-if="capacity && capacity.leds" class="mt-3">
					<div class="text-body-2">{{ $t('plugins.WorkshopLights.tabStates.zone_capacity', { n: capacity.leds, k: capacity.fits, b: capacity.board_leds }) }}</div>
					<v-select
						v-if="form.combine.mode === 'split'" v-model="form.combine.si_no_fit" :items="noFitItems" :label="$t('plugins.WorkshopLights.tabStates.when_they_do_not_fit')"
						dense outlined hide-details class="mt-2" style="max-width:460px" :disabled="!!applyingMode" @change="chooseCombine('split')"
					/>
					<v-alert v-if="capacity.rotating" dense outlined type="info" class="mt-2 mb-0">{{ $t('plugins.WorkshopLights.tabStates.now_rotating', { n: capacity.activeList, k: capacity.fits }) }}</v-alert>
					<v-alert v-else-if="capacity.hidden && capacity.hidden.length" dense outlined type="warning" class="mt-2 mb-0">
						{{ $t('plugins.WorkshopLights.tabStates.now_hidden', { names: capacity.hidden.join(', ') }) }}
					</v-alert>
				</div>
				<div class="d-flex align-center flex-wrap mt-2" style="gap:8px">
					<v-btn small outlined :loading="lights.testing === 'combine'" @click="tryCombine()"><v-icon small left>mdi-play</v-icon>{{ t.tryExample }}</v-btn>
					<span class="text-caption text-faint">{{ t.tryExampleHelp }}</span>
				</div>
				<div class="text-caption text-faint mt-1">{{ t.emergencyAlways }}</div>
				<!-- during a job the strip keeps its colours but not its blinks (each blink phase is a command for the Duet) -->
				<v-select
					:value="lights.piPaints ? 'with_effects' : form.effects_in_job" :items="jobEffectsItems" :disabled="lights.piPaints"
					:label="$t('plugins.WorkshopLights.tabStates.job_effects')" :hint="lights.piPaints ? '' : $t('plugins.WorkshopLights.tabStates.job_effects_help' + (hasJog ? '' : '_no_jog'))"
					:persistent-hint="!lights.piPaints" dense outlined class="mt-3" style="max-width:520px" @change="form.effects_in_job = $event"
				/>
			</v-card-text>
		</v-card>

		<!-- ===== The states ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-traffic-light</v-icon>{{ t.statesTitle }}</div>
				<div class="text-caption text-faint mb-3">{{ t.statesHelp }}</div>
				<div class="state-list">
					<div v-for="e in rows" :key="e.id" class="state-card" :class="{ shutdown: !form.states[e.id].active }" :style="{ '--st': hexOf(e.id) }">
						<div class="state-head">
							<div class="state-order">
								<template v-if="e.kind === 'combinable'">
									<v-btn x-small icon :disabled="e.pos === 0" :title="t.moveUp" @click="move(e.id, -1)"><v-icon small>mdi-chevron-up</v-icon></v-btn>
									<v-btn x-small icon :disabled="e.pos === lastPos" :title="t.moveDown" @click="move(e.id, 1)"><v-icon small>mdi-chevron-down</v-icon></v-btn>
								</template>
								<v-icon v-else small :title="t.fixed">mdi-pin-outline</v-icon>
							</div>
							<span class="state-dot" :class="effectClass(form.states[e.id].effect)" :style="{ background: hexOf(e.id) }" />
							<div class="state-title">
								<div class="text-body-1 font-weight-medium">{{ info(e.id).name }}</div>
								<div class="text-caption text-faint">{{ info(e.id).desc }}</div>
							</div>
							<v-btn x-small outlined :loading="lights.testingState === e.id" :title="t.testHelp" @click="lights.testState(e.id)"><v-icon x-small left>mdi-play</v-icon>{{ t.test }}</v-btn>
							<v-switch v-model="form.states[e.id].active" :disabled="e.id === 'stop'" dense hide-details class="mt-0 pt-0 flex-grow-0" :title="t.activeHelp" />
						</div>
						<div class="state-body">
							<div v-if="e.id === 'jog_free'" class="state-field state-color" :title="t.jogColorHelp">
								<span class="state-label">{{ t.colColor }}</span>
								<span><span class="jog-swatch" :style="{ background: jogColor }" /><span class="text-caption text-faint">{{ t.jogColorFromJog }}</span></span>
							</div>
							<div v-else class="state-field state-color">
								<span class="state-label">{{ t.colColor }}</span>
								<color-rgbw v-model="form.states[e.id].color" :name="info(e.id).name" />
							</div>
							<div class="state-field">
								<v-select v-model="form.states[e.id].effect" :items="effectsOf(e.id)" :disabled="e.id === 'stop'" dense outlined hide-details :label="t.colEffect" />
							</div>
							<div v-if="e.id === 'pi_hot'" class="state-field">
								<v-text-field v-model.number="form.pi_hot_c" type="number" min="40" max="95" suffix="°C" :label="t.piHotLabel" dense outlined hide-details />
							</div>
							<div v-if="e.id === 'live_quiet'" class="state-field">
								<v-text-field v-model.number="form.live_quiet_s" type="number" min="10" max="3600" :suffix="$t('plugins.WorkshopLights.tabStates.s')" :label="t.liveQuietLabel" dense outlined hide-details />
							</div>
							<div class="state-field state-outputs">
								<span class="state-label">{{ t.colOutputs }}</span>
								<span class="state-checks">
									<v-checkbox v-model="form.states[e.id].outputs.strip" :disabled="!lights.stripPresent || e.id === 'stop'" :label="t.outStrip" dense hide-details class="mt-0 pt-0" :title="lights.stripPresent ? t.stripHelp : t.noStripHelp" />
									<v-checkbox v-model="form.states[e.id].outputs.screen" :disabled="e.id === 'stop'" :label="t.outScreen" dense hide-details class="mt-0 pt-0" :title="t.screenHelp" />
									<v-checkbox v-model="form.states[e.id].outputs.board" :label="t.outBoard" dense hide-details class="mt-0 pt-0" :title="t.boardHelp" />
								</span>
							</div>
						</div>
					</div>
				</div>
			</v-card-text>
		</v-card>

		<!-- ===== Legend ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-palette-outline</v-icon>{{ t.legendTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ t.legendHelp }}</div>
				<div class="legend">
					<div v-for="l in legend" :key="l.key" class="legend-row">
						<span class="legend-point" :class="effectClass(l.effect)" :style="{ background: l.hex }" />
						<span class="text-body-2">{{ l.name }}</span>
						<span class="text-caption text-faint">{{ l.how }}</span>
					</div>
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import ColorRgbw from './ColorRgbw.vue'
import LedStrip from './LedStrip.vue'
import { copy, effectClass, rgbwHex } from './lights-shared.js'
import { pluginActive, pathExists } from './workshop-ids.js' // states that belong to other plugins are not listed without them

// Every user-visible text of this component is here (one place, to ease the
// later move to translation keys).
const T = {
	autoStatus: i18n.t('plugins.WorkshopLights.tabLighting.automatic_status_lights'),
	autoStatusHelp: i18n.t('plugins.WorkshopLights.tabLighting.when_off_the_lighting_also_uses'),
	intro: i18n.t('plugins.WorkshopLights.tabStates.every_row_is_something_the_machine'),
	lookAlike: i18n.t('plugins.WorkshopLights.tabStates.colors_that_get_confused_modes_and'),
	lookAlikeHelp: i18n.t('plugins.WorkshopLights.tabStates.change_one_of_each_pair_or'),
	autoOff: i18n.t('plugins.WorkshopLights.tabStates.the_automatic_status_lights_are_off'),
	activate: i18n.t('plugins.WorkshopLights.tabStates.activate'),
	combineTitle: i18n.t('plugins.WorkshopLights.tabStates.when_several_are_active_at_once'),
	combineHelp: i18n.t('plugins.WorkshopLights.tabStates.each_option_shows_the_real_state'),
	priority: i18n.t('plugins.WorkshopLights.tabStates.the_most_important'),
	priorityDesc: i18n.t('plugins.WorkshopLights.tabStates.the_whole_zone_shows_only_the'),
	turns: i18n.t('plugins.WorkshopLights.tabStates.taking_turns'),
	turnsDesc: i18n.t('plugins.WorkshopLights.tabStates.the_active_states_take_turns_one'),
	split: i18n.t('plugins.WorkshopLights.tabStates.split_the_zone'),
	splitDesc: i18n.t('plugins.WorkshopLights.tabStates.the_whole_zone_on_shared_among'),
	turnEach: i18n.t('plugins.WorkshopLights.tabStates.each_state'),
	tryExample: i18n.t('plugins.WorkshopLights.tabStates.see_the_example_on_the_strip'),
	tryExampleHelp: i18n.t('plugins.WorkshopLights.tabStates.example_with_two_enabled_states_and'),
	emergencyAlways: i18n.t('plugins.WorkshopLights.tabStates.the_emergency_stop_always_takes_the'),
	statesTitle: i18n.t('plugins.WorkshopLights.tabStates.machine_states'),
	statesHelp: i18n.t('plugins.WorkshopLights.tabStates.turn_on_the_ones_you_want'),
	colState: i18n.t('plugins.WorkshopLights.tabStates.state'),
	colColor: i18n.t('plugins.WorkshopLights.tabStates.color'),
	colOutputs: i18n.t('plugins.WorkshopLights.tabStates.outputs_label'),
	jogColorFromJog: i18n.t('plugins.WorkshopLights.tabStates.jog_color_from_jog'),
	jogColorHelp: i18n.t('plugins.WorkshopLights.tabStates.jog_color_help'),
	colEffect: i18n.t('plugins.WorkshopLights.tabStates.effect'),
	outStrip: i18n.t('plugins.WorkshopLights.tabStates.strip'),
	outScreen: i18n.t('plugins.WorkshopLights.tabStates.screen'),
	outBoard: i18n.t('plugins.WorkshopLights.tabStates.board'),
	stripHelp: i18n.t('plugins.WorkshopLights.tabStates.show_this_state_on_the_led'),
	screenHelp: i18n.t('plugins.WorkshopLights.tabStates.show_this_state_on_the_on'),
	boardHelp: i18n.t('plugins.WorkshopLights.tabStates.while_it_lasts_this_state_also'),
	noStripHelp: i18n.t('plugins.WorkshopLights.tabStates.this_machine_has_no_led_strip'),
	moveUp: i18n.t('plugins.WorkshopLights.tabStates.more_important'),
	moveDown: i18n.t('plugins.WorkshopLights.tabStates.less_important'),
	fixed: i18n.t('plugins.WorkshopLights.tabStates.fixed_state_always_above_the_others'),
	activeHelp: i18n.t('plugins.WorkshopLights.tabStates.turn_this_state_on_or_off'),
	test: i18n.t('plugins.WorkshopLights.tabStates.test'),
	testHelp: i18n.t('plugins.WorkshopLights.tabStates.show_this_state_for_about_6'),
	piHotLabel: i18n.t('plugins.WorkshopLights.tabStates.temperature_limit'),
	liveQuietLabel: i18n.t('plugins.WorkshopLights.tabStates.quiet_for'),
	legendTitle: i18n.t('plugins.WorkshopLights.tabStates.legend_of_colors_in_use'),
	legendHelp: i18n.t('plugins.WorkshopLights.tabStates.what_every_color_currently_seen_on'),
	mode: i18n.t('plugins.WorkshopLights.tabStates.mode'),
	modeHow: i18n.t('plugins.WorkshopLights.tabStates.idle_color_and_progress_bar_during'),
	noneActive: i18n.t('plugins.WorkshopLights.tabStates.none'),
	effects: {
		steady: i18n.t('plugins.WorkshopLights.tabStates.steady'),
		blink_slow: i18n.t('plugins.WorkshopLights.tabStates.slow_blink'),
		blink: i18n.t('plugins.WorkshopLights.tabStates.medium_blink'),
		blink_fast: i18n.t('plugins.WorkshopLights.tabStates.fast_blink'),
		double: i18n.t('plugins.WorkshopLights.tabStates.double_flash'),
		pulse: i18n.t('plugins.WorkshopLights.tabStates.soft_pulse')
	},
	modeNames: { Laser: i18n.t('plugins.WorkshopLights.tabStates.laser'), CNC: 'CNC', FFF: i18n.t('plugins.WorkshopLights.common.3d_printing') },
	states: {
		stop: { name: i18n.t('plugins.WorkshopLights.common.emergency_stop'), desc: i18n.t('plugins.WorkshopLights.tabStates.the_emergency_stop_was_pressed_and') },
		psu_off: { name: i18n.t('plugins.WorkshopLights.common.power_supply_off'), desc: i18n.t('plugins.WorkshopLights.tabStates.the_motor_supply_is_off_m81') },
		crash: { name: i18n.t('plugins.WorkshopLights.tabStates.crash_or_axis_beyond_its_limits'), desc: i18n.t('plugins.WorkshopLights.tabStates.a_driver_detected_a_crash_15') },
		jog_free: { name: i18n.t('plugins.WorkshopLights.tabStates.jog_without_limits'), desc: i18n.t('plugins.WorkshopLights.tabStates.the_jog_without_limits_mode_is') },
		risk: { name: i18n.t('plugins.WorkshopLights.tabStates.active_risk'), desc: i18n.t('plugins.WorkshopLights.tabStates.something_leaves_the_machine_without_a') },
		cancelling: { name: i18n.t('plugins.WorkshopLights.tabStates.cancelling'), desc: i18n.t('plugins.WorkshopLights.tabStates.a_job_is_being_cancelled') },
		paused: { name: i18n.t('plugins.WorkshopLights.tabStates.paused'), desc: i18n.t('plugins.WorkshopLights.tabStates.a_job_is_paused_or_pausing') },
		rs485: { name: i18n.t('plugins.WorkshopLights.tabStates.rs485_fault'), desc: i18n.t('plugins.WorkshopLights.tabStates.an_rs485_servo_or_device_of') },
		rs485_notice: { name: i18n.t('plugins.WorkshopLights.tabStates.rs485_warning'), desc: i18n.t('plugins.WorkshopLights.tabStates.an_rs485_device_with_no_axis') },
		pi_hot: { name: i18n.t('plugins.WorkshopLights.tabStates.high_equipment_temperature'), desc: i18n.t('plugins.WorkshopLights.tabStates.the_temperature_of_the_on_board') },
		busy: { name: i18n.t('plugins.WorkshopLights.tabStates.busy'), desc: i18n.t('plugins.WorkshopLights.tabStates.homing_macro_or_tool_change_in') },
		laser: { name: i18n.t('plugins.WorkshopLights.tabStates.laser_firing'), desc: i18n.t('plugins.WorkshopLights.tabStates.the_laser_power_is_greater_than') },
		air: { name: i18n.t('plugins.WorkshopLights.tabStates.air_on'), desc: i18n.t('plugins.WorkshopLights.tabStates.air_assist_is_on') },
		in_live: { name: i18n.t('plugins.WorkshopLights.tabStates.live_job'), desc: i18n.t('plugins.WorkshopLights.tabStates.a_job_sent_live_line_by') },
		live_quiet: { name: i18n.t('plugins.WorkshopLights.tabStates.live_job_quiet'), desc: i18n.t('plugins.WorkshopLights.tabStates.a_live_job_is_open_but') },
		without_homing: { name: i18n.t('plugins.WorkshopLights.tabStates.homing_missing'), desc: i18n.t('plugins.WorkshopLights.tabStates.x_or_y_not_homed_with') },
		motors_released: { name: i18n.t('plugins.WorkshopLights.tabStates.motors_released'), desc: i18n.t('plugins.WorkshopLights.tabStates.some_motor_is_released_m18_no') },
		unclean_shutdown: { name: i18n.t('plugins.WorkshopLights.tabStates.last_unclean_shutdown'), desc: i18n.t('plugins.WorkshopLights.tabStates.the_last_shutdown_was_a_power') }
	},
	cantApply: i18n.t('plugins.WorkshopLights.common.could_not_apply')
};

export default {
	components: { ColorRgbw, LedStrip: LedStrip },
	inject: ['lights'],
	data() {
		return { t: T, applyingMode: null, turnIdx: 0, turnTimer: null };
	},
	watch: {
		turnMs: { immediate: true, handler() { this.armTurns(); } }
	},
	beforeDestroy() {
		clearInterval(this.turnTimer);
	},
	computed: {
		// "Taking turns" preview: the service publishes one frozen frame of it (a blink phase costs a command to the Duet), so the page
		// rotates the active states by itself, as the zone does
		turnItems() {
			const i = this.lights.indicator;
			const active = (i && Array.isArray(i.active)) ? i.active : [];
			const own = active.length > 0 && !['stop', 'crash', 'risk', 'jog_free', 'lighting'].includes(i.state && i.state.id);
			const items = active.map(a => a.hex);
			return i && i.mode_hex && own ? items.concat([i.mode_hex]) : items;
		},
		turnMs() {
			return Math.max(500, (Number(this.form.combine.turn_s) || 1.5) * 1000);
		},
		hasJog() {
			return pluginActive(this.$store, 'jog');
		},
		combineHelp() {
			return this.$t('plugins.WorkshopLights.tabStates.each_option_shows_the_real_state' + (this.hasJog ? '' : '_no_jog'));
		},
		form() {
			return this.lights.form;
		},
		// published by the service (lightsInfo.capacity): LEDs of the zone, states that fit at once, what did not fit
		capacity() {
			const c = (this.lights.info || {}).capacity;
			return c && c.leds ? c : null;
		},
		jobEffectsItems() {
			return [
				{ value: 'without_effects', text: i18n.t('plugins.WorkshopLights.tabStates.job_effects_off') },
				{ value: 'with_effects', text: i18n.t('plugins.WorkshopLights.tabStates.job_effects_on') }
			];
		},
		noFitItems() {
			return [
				{ value: 'turns', text: i18n.t('plugins.WorkshopLights.tabStates.fit_rotate') },
				{ value: 'hide', text: i18n.t('plugins.WorkshopLights.tabStates.fit_hide') }
			];
		},
		combineModes() {
			return [
				{ id: 'priority', name: T.priority, desc: T.priorityDesc },
				{ id: 'turns', name: T.turns, desc: T.turnsDesc },
				{ id: 'split', name: T.split, desc: T.splitDesc }
			];
		},
		effectItems() {
			return Object.keys(T.effects).map(k => ({ text: T.effects[k], value: k }));
		},
		// combinable states from the most to the least important
		order() {
			const all = Object.keys(this.lights.catalog).filter(i => this.lights.catalog[i].kind === 'combinable');
			const want = (this.form.order_states || []).filter(i => all.includes(i));
			return want.concat(all.filter(i => !want.includes(i)));
		},
		lastPos() {
			return this.order.length - 1;
		},
		// the rows: emergency, the exclusive ones, then the combinable ones in order
		rows() {
			const cat = this.lights.catalog;
			const ids = Object.keys(cat).filter(i => this.form.states[i] && !this.stateOfOther(i));
			const fixed = ids.filter(i => cat[i].kind !== 'combinable');
			return fixed.concat(this.order.filter(i => this.form.states[i])).map(id => ({ id, kind: cat[id].kind, pos: this.order.indexOf(id) }));
		},
		activeNames() {
			const a = this.lights.indicator && this.lights.indicator.active;
			return Array.isArray(a) && a.length ? a.map(x => x.name).join(' + ') : T.noneActive;
		},
		// colours in use that look alike (same effect, same hue)
		lookAlikes() {
			const items = [];
			['Laser', 'CNC', 'FFF'].forEach(m => items.push([T.mode + ' ' + T.modeNames[m], this.form.mode_colors[m], 'steady']));
			Object.keys(this.form.states).forEach(id => {
				const e = this.form.states[id];
				if (e && e.active !== false && e.color && id !== 'jog_free' && !this.stateOfOther(id)) {
					items.push([this.info(id).name, e.color, e.effect, id]);
				}
			});
			const hsv = c => {
				const w = Number(c.w) || 0;
				const r = Math.min(255, (Number(c.r) || 0) + w * 0.7) / 255;
				const g = Math.min(255, (Number(c.u) || 0) + w * 0.7) / 255;
				const b = Math.min(255, (Number(c.b) || 0) + w * 0.7) / 255;
				const max = Math.max(r, g, b);
				const min = Math.min(r, g, b);
				const d = max - min;
				let h = 0;
				if (d) {
					h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
				}
				return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
			};
			const out = [];
			for (let i = 0; i < items.length; i++) {
				for (let j = i + 1; j < items.length; j++) {
					if (items[i][2] !== items[j][2]) {
						continue; // a different effect tells them apart
					}
					// never at the same time: with the supply off the laser cannot fire
					if ([items[i][3], items[j][3]].sort().join('+') === 'laser+psu_off') {
						continue;
					}
					const a = hsv(items[i][1]);
					const b = hsv(items[j][1]);
					if (a.v < 0.08 || b.v < 0.08) {
						continue;
					}
					const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
					const ca = a.s > 0.3;
					const cb = b.s > 0.3;
					const alike = ca && cb ? dh < 22 && Math.abs(a.s - b.s) < 0.45 : !ca && !cb && Math.abs(a.v - b.v) < 0.25;
					if (alike) {
						out.push(items[i][0] + ' / ' + items[j][0]);
					}
				}
			}
			return out;
		},
		// the colour the strip and the screens use for the jog without limits: the one chosen in the Jog (not the one of this form)
		jogColor() {
			const j = this.lights.read('jogFree');
			return (j && /^#[0-9a-fA-F]{6}$/.test(j.color || '') && j.color) || '#ff1744';
		},
		// what every colour in use means
		legend() {
			const out = [];
			['Laser', 'CNC', 'FFF'].forEach(m => out.push({ key: 'm' + m, name: T.mode + ' ' + T.modeNames[m], hex: rgbwHex(this.form.mode_colors[m]), effect: 'steady', how: T.modeHow }));
			this.rows.forEach(r => {
				const e = this.form.states[r.id];
				if (e.active) {
					out.push({ key: r.id, name: this.info(r.id).name, hex: r.id === 'jog_free' ? this.jogColor : rgbwHex(e.color), effect: e.effect, how: T.effects[e.effect] });
				}
			});
			return out;
		}
	},
	methods: {
		// colour of a state on screen (the jog one comes from the Jog plugin)
		hexOf(id) {
			return id === 'jog_free' ? this.jogColor : rgbwHex(this.form.states[id].color);
		},
		// The Duet strip does not show the double flash and the pulse (each frame is a set of codes to the board), so they
		// are greyed for a state that is shown on the strip or the board LEDs, unless the Pi paints the strip. A state that
		// only goes to the screen keeps every effect.
		effectsOf(id) {
			const o = (this.form.states[id] && this.form.states[id].outputs) || {};
			const inDuet = !this.lights.piPaints && (o.strip !== false || o.board === true);
			return this.effectItems.map(x => Object.assign({}, x, { disabled: inDuet && (x.value === 'double' || x.value === 'pulse') }));
		},
		effectClass,
		// a state that comes from another plugin (the jog without limits, the RS485 faults) is listed only with that plugin
		stateOfOther(id) {
			if (id === 'jog_free') {
				return !pluginActive(this.$store, 'jog');
			}
			if (id === 'rs485' || id === 'rs485_notice') {
				return !pathExists(this.$router, '/Plugins/RS485');
			}
			return false;
		},
		info(id) {
			return T.states[id] || { name: id, desc: '' };
		},
		move(id, d) {
			const o = [...this.order];
			const i = o.indexOf(id);
			const j = i + d;
			if (j < 0 || j >= o.length) {
				return;
			}
			[o[i], o[j]] = [o[j], o[i]];
			this.form.order_states = o;
		},
		// the REAL state computed by the service with each combine mode
		secsMode(mode) {
			const m = this.lights.read('statusLightModes');
			const s = m && (typeof m.get === 'function' ? m.get(mode) : m[mode]);
			const secs = Array.isArray(s) && s.length ? s : this.lights.secsState;
			if (mode === 'turns' && this.turnItems.length > 1) {
				const total = (secs || []).reduce((t, x) => t + (x[2] || 0), 0) || 1;
				return [[this.turnItems[this.turnIdx % this.turnItems.length], 1, total]];
			}
			return secs;
		},
		armTurns() {
			clearInterval(this.turnTimer);
			this.turnIdx = 0;
			this.turnTimer = setInterval(() => { this.turnIdx++; }, this.turnMs);
		},
		// touching a mode applies and saves it at once (only "combinar")
		async chooseCombine(mode) {
			if (!this.lights.saved) {
				return;
			}
			const turn = Number(this.form.combine.turn_s) || 1.5;
			this.form.combine.mode = mode;
			const cfg = copy(this.lights.saved);
			cfg.combine = { ...(cfg.combine || {}), mode: mode, turn_s: turn };
			this.applyingMode = mode;
			try {
				const r = await this.lights.lightsApi('save', { config: cfg });
				if (!r.ok) {
					throw new Error(this.lights.errorText(r));
				}
				this.lights.saved.combine = copy(cfg.combine);
			} catch (e) {
				this.form.combine.mode = this.lights.saved.combine.mode;
				this.lights.message(T.cantApply + (e.message || e), true);
			} finally {
				this.applyingMode = null;
			}
		},
		// the service runs the real calculation with what is on screen (even unsaved)
		async tryCombine() {
			const est = this.form.states;
			const ids = this.order.filter(id => est[id] && est[id].active).slice(0, 2);
			const example = ids.length ? ids : ['laser', 'air'];
			const simulate = { config: this.form, activeList: example, mode: this.lights.modeCurrent || 'Laser', progress: 0.6 };
			const sec = this.form.combine.mode === 'turns' ? Math.min(20, Math.max(6, (example.length + 1) * this.form.combine.turn_s * 2)) : 6;
			await this.lights.invoke('combine', 'preview', { data: { simulate: simulate, seconds: sec } }, sec * 1000 + 500, T.cantApply);
		}
	}
};
</script>

<style scoped>
.jog-swatch {
	display: inline-block;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1px solid var(--tp-faint, #9e9e9e);
	vertical-align: middle;
	margin-right: 8px;
}

.text-faint {
	color: var(--tp-faint);
}
.combine {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
	gap: 8px;
}
.combine-op {
	text-align: left;
	padding: 10px 12px;
	border-radius: 8px;
	border: 1px solid rgba(128, 128, 128, 0.3);
	background: rgba(128, 128, 128, 0.06);
	color: inherit;
	cursor: pointer;
}
.combine-op.active {
	border-color: #1976d2;
	background: rgba(25, 118, 210, 0.12);
}
.notice-without-auto {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	padding: 8px 12px;
	border-radius: 8px;
	background: rgba(255, 160, 0, 0.12);
	border: 1px solid rgba(255, 160, 0, 0.45);
}
.state-list {
	min-width: 0;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(420px, 100%), 1fr));
	gap: 14px;
}
.state-card {
	min-width: 0;
	padding: 14px 16px;
	border: 1px solid rgba(128, 128, 128, 0.2);
	border-left: 5px solid var(--st, #9e9e9e);
	border-radius: 10px;
	background: rgba(128, 128, 128, 0.06);
}
.state-card.shutdown {
	opacity: 0.55;
}
.state-head {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px 12px;
}
.state-order {
	flex: none;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 28px;
}
.state-dot {
	flex: none;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.35);
	box-shadow: 0 0 8px var(--st, transparent);
}
.state-title {
	flex: 1 1 120px;
	min-width: 0;
	overflow-wrap: anywhere;
}
.state-body {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
	gap: 14px;
	align-items: start;
	margin-top: 14px;
	padding-top: 14px;
	border-top: 1px dashed rgba(128, 128, 128, 0.3);
}
.state-field {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.state-label {
	font-size: 12px;
	color: var(--tp-faint, #9e9e9e);
}
.state-outputs {
	grid-column: 1 / -1;
}
.state-checks {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 20px;
}
.legend {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 6px 16px;
}
.legend-row {
	display: flex;
	align-items: center;
	gap: 8px;
}
.legend-point {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	flex: none;
}
</style>
