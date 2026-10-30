<template>
	<div>
		<div class="text-body-2 text-faint mb-3">{{ t.intro }}</div>

		<!-- ===== 1. LED strip ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-led-strip-variant</v-icon>{{ t.stripTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ t.stripWhat }}</div>
				<v-switch v-model="form.strip.present" :label="t.stripSwitch" :hint="t.stripSwitchHelp" persistent-hint dense class="mt-0 mb-3" />
				<strip-zones v-if="form.strip.present" part="basic" />
				<v-alert v-else dense outlined type="info" class="mb-0">{{ t.noStripInfo }}</v-alert>
			</v-card-text>
		</v-card>

		<!-- ===== 2. On-screen indicator ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-monitor-dashboard</v-icon>{{ t.screenTitle }}</div>
				<details class="wf-more">
					<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
				<div class="text-caption text-faint mb-2">{{ t.screenWhat }}</div>
				</details>
				<state-badge :ind="lights.indicator" />
				<div class="text-caption text-faint mt-3">{{ t.screenWhere }}</div>
				<ul class="text-caption text-faint mt-1">
					<li v-for="w in screenPlaces" :key="w">{{ w }}</li>
				</ul>
				<div class="text-caption mt-2"><v-icon x-small class="mr-1">mdi-information-outline</v-icon>{{ t.screenAlways }}</div>
			</v-card-text>
		</v-card>

		<!-- ===== 3. Board LEDs ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-chip</v-icon>{{ t.boardTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ lights.stripPresent ? t.boardWhatStrip : t.boardWhatNoStrip }}</div>
				<v-switch v-model="form.leds_board.active" :label="t.boardSwitch" dense hide-details class="mt-0" />
				<template v-if="form.leds_board.active">
					<div class="group-title mt-3">{{ t.boardWhich }}</div>
					<div class="board-leds">
						<div v-for="l in leds" :key="l.id" class="board-led-row">
							<v-checkbox v-model="form.leds_board.leds" :value="l.id" dense hide-details class="mt-0 pt-0" />
							<span class="board-led" :class="{ 'lx-blink_slow': l.id === 'can' && canBlink === 'always' }" :style="{ background: l.css, boxShadow: '0 0 6px ' + l.css }" />
							<div>
								<div class="text-body-2">{{ l.name }}</div>
								<div class="text-caption text-faint">{{ l.desc }}</div>
							</div>
						</div>
					</div>
					<v-alert v-if="!form.leds_board.leds.length" dense outlined type="warning" class="mt-2 mb-0">{{ t.pickOne }}</v-alert>

					<div class="group-title mt-4">{{ t.thresholds }}</div>
					<div class="d-flex flex-wrap" style="gap:12px">
						<v-text-field v-model.number="form.leds_board.vin_min" type="number" step="0.5" min="0" suffix="V" :label="t.vinMin" :hint="t.vinMinHelp" persistent-hint dense outlined style="max-width:260px" />
						<v-text-field v-model.number="form.leds_board.v12_min" type="number" step="0.5" min="0" suffix="V" :label="t.v12Min" :hint="t.v12MinHelp" persistent-hint dense outlined style="max-width:260px" />
					</div>

					<v-select
						v-model="canBlink" :items="canBlinkItems" :label="$t('plugins.WorkshopLights.tabOutputs.can_blink')"
						dense outlined hide-details class="mt-3" style="max-width:620px"
					/>

					<v-select
						v-if="lights.stripPresent" v-model="form.leds_board.with_lighting" :items="withLightingItems" :label="$t('plugins.WorkshopLights.tabOutputs.with_lighting')"
						:hint="$t('plugins.WorkshopLights.tabOutputs.with_lighting_help')" persistent-hint dense outlined class="mt-3" style="max-width:520px"
					/>
					<div v-if="lights.stripPresent" class="d-flex align-center mt-3" style="max-width:420px">
						<span class="text-body-2 mr-3" style="white-space:nowrap">{{ t.brightness }}</span>
						<v-slider v-model="form.leds_board.brightness" min="1" max="255" hide-details thumb-label dense />
					</div>

					<div class="group-title mt-4">{{ t.preview }}</div>
					<!-- status zone: neutral grey dots (its colour depends on the state, not on this card); the board
						LEDs after them. Following the lighting (automatic status lights off): all in the lighting colour. -->
					<div class="board-view">
						<template v-if="lights.stripPresent">
							<span v-for="k in stateLeds" :key="'s' + k" class="board-view-led" :class="{ 'zone-gray': !followsLighting }"
								:style="followsLighting ? lightingStyle : null" :title="t.statusZoneLed" />
						</template>
						<span v-for="d in preview" :key="d.id" class="board-view-led" :class="{ 'lx-blink_slow': d.blink && !followsLighting }"
							:style="followsLighting ? lightingStyle : { background: d.css, boxShadow: d.on ? '0 0 6px ' + d.css : 'none' }" :title="d.name + ': ' + d.text" />
					</div>
					<div v-if="lights.stripPresent" class="d-flex flex-wrap align-center text-caption text-faint mt-1" style="gap:4px 16px">
						<span class="d-flex align-center"><span class="legend-led zone-gray mr-1" />{{ t.statusZoneLed }}</span>
						<span class="d-flex align-center"><span class="legend-led legend-board mr-1" />{{ t.boardTitle }}</span>
					</div>
					<div class="text-caption text-faint mt-1">{{ followsLighting ? $t('plugins.WorkshopLights.tabOutputs.preview_follow_lighting') : (lights.stripPresent ? $t('plugins.WorkshopLights.tabOutputs.preview_status_zone_grey') : t.previewNoStrip) }}</div>
					<v-alert v-if="lights.stripPresent && cut" dense outlined type="warning" class="mt-2 mb-0">{{ t.tooFew }}</v-alert>
					<div class="text-caption text-faint mt-2">{{ t.takeOver }}</div>
				</template>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import StripZones from './StripZones.vue'
import StateBadge from './StateBadge.vue'
import { BOARD_LEDS } from './lights-shared.js'
import { rgbwCss } from './color.js'
import { pluginActive } from './workshop-ids.js' // the side bar is another plugin: nothing about it when it is absent

// Every user-visible text of this component is here.
const T = {
	intro: i18n.t('plugins.WorkshopLights.tabOutputs.an_output_is_a_place_where'),
	stripTitle: i18n.t('plugins.WorkshopLights.common.led_strip'),
	stripWhat: i18n.t('plugins.WorkshopLights.tabOutputs.a_physical_strip_neopixel_ws2812_sk6812'),
	stripSwitch: i18n.t('plugins.WorkshopLights.tabOutputs.this_machine_has_an_led_strip'),
	stripSwitchHelp: i18n.t('plugins.WorkshopLights.tabOutputs.turn_it_off_if_you_have'),
	noStripInfo: i18n.t('plugins.WorkshopLights.tabOutputs.no_led_strip_everything_else_works'),
	screenTitle: i18n.t('plugins.WorkshopLights.common.on_screen_indicator'),
	screenWhat: i18n.t('plugins.WorkshopLights.tabOutputs.it_is_not_a_strip_it'),
	screenWhere: i18n.t('plugins.WorkshopLights.tabOutputs.where_it_appears'),
	screenPlaces: [
		i18n.t('plugins.WorkshopLights.tabOutputs.at_the_top_of_this_page'),
		i18n.t('plugins.WorkshopLights.tabOutputs.at_the_top_of_the_controls'),
	],
	screenAlways: i18n.t('plugins.WorkshopLights.tabOutputs.it_has_no_settings_of_its'),
	boardTitle: i18n.t('plugins.WorkshopLights.common.board_leds'),
	boardWhatStrip: i18n.t('plugins.WorkshopLights.tabOutputs.it_copies_the_leds_the_duet'),
	boardWhatNoStrip: i18n.t('plugins.WorkshopLights.tabOutputs.it_copies_the_leds_the_duet_2'),
	boardSwitch: i18n.t('plugins.WorkshopLights.tabOutputs.show_the_board_leds'),
	boardWhich: i18n.t('plugins.WorkshopLights.tabOutputs.which_ones_to_show'),
	pickOne: i18n.t('plugins.WorkshopLights.tabOutputs.choose_at_least_one_board_led'),
	thresholds: i18n.t('plugins.WorkshopLights.tabOutputs.when_vin_and_12_v_go'),
	vinMin: i18n.t('plugins.WorkshopLights.tabOutputs.minimum_vin'),
	vinMinHelp: i18n.t('plugins.WorkshopLights.tabOutputs.below_this_voltage_the_vin_led'),
	v12Min: i18n.t('plugins.WorkshopLights.tabOutputs.minimum_12_v'),
	v12MinHelp: i18n.t('plugins.WorkshopLights.tabOutputs.below_this_voltage_the_12_v'),
	brightness: i18n.t('plugins.WorkshopLights.tabOutputs.brightness'),
	preview: i18n.t('plugins.WorkshopLights.tabOutputs.preview_with_what_you_have_on'),
	previewNoStrip: i18n.t('plugins.WorkshopLights.tabOutputs.the_board_leds_in_this_order'),
	statusZoneLed: i18n.t('plugins.WorkshopLights.common.status_zone'),
	tooFew: i18n.t('plugins.WorkshopLights.tabOutputs.the_status_zone_has_few_leds'),
	takeOver: i18n.t('plugins.WorkshopLights.tabOutputs.a_state_with_its_board_checkbox'),
	leds: {
		can: { name: i18n.t('plugins.WorkshopLights.tabOutputs.status_can_communication'), desc: i18n.t('plugins.WorkshopLights.tabOutputs.red_blinks_slowly_when_the_board') },
		vin: { name: i18n.t('plugins.WorkshopLights.tabOutputs.vin_power_supply_input'), desc: i18n.t('plugins.WorkshopLights.tabOutputs.blue_on_with_the_board_supply') },
		v12: { name: i18n.t('plugins.WorkshopLights.common.12_v'), desc: i18n.t('plugins.WorkshopLights.tabOutputs.amber_on_if_the_board_measures') },
		v5: { name: i18n.t('plugins.WorkshopLights.common.5_v'), desc: i18n.t('plugins.WorkshopLights.tabOutputs.red_the_board_doesn_t_measure') },
		v3_3: { name: i18n.t('plugins.WorkshopLights.common.3_3_v'), desc: i18n.t('plugins.WorkshopLights.tabOutputs.green_the_board_doesn_t_measure') }
	}
};

export default {
	components: { StripZones, StateBadge },
	inject: ['lights'],
	data() {
		return { t: T };
	},
	computed: {
		// the second place is the side bar (WorkshopControlBar)
		screenPlaces() {
			return this.t.screenPlaces.filter((w, i) => i === 0 || pluginActive(this.$store, 'bar'));
		},
		form() {
			return this.lights.form;
		},
		withLightingItems() {
			return [
				{ value: 'keep', text: i18n.t('plugins.WorkshopLights.tabOutputs.with_lighting_keep') },
				{ value: 'as_zone', text: i18n.t('plugins.WorkshopLights.tabOutputs.with_lighting_follow') }
			];
		},
		leds() {
			return BOARD_LEDS.map(l => ({ ...l, name: T.leds[l.id].name, desc: T.leds[l.id].desc }));
		},
		chosen() {
			return this.leds.filter(l => this.form.leds_board.leds.includes(l.id));
		},
		// LEDs of the status zone that remain (at least 1 is always kept for the state)
		stateLeds() {
			const n = Math.max(1, Number(this.form.led_count) || 1);
			return Math.max(1, n - this.chosen.length);
		},
		cut() {
			return this.chosen.length > Math.max(0, (Number(this.form.led_count) || 1) - 1);
		},
		// CAN LED: 'falla' = steady, blinks fast only on a problem (less load); 'siempre' = slow blink like the board
		canBlink: {
			get() {
				return this.form.leds_board.can_blink || 'fault';
			},
			set(v) {
				this.$set(this.form.leds_board, 'can_blink', v);
			}
		},
		canBlinkItems() {
			return [
				{ value: 'fault', text: i18n.t('plugins.WorkshopLights.tabOutputs.can_blink_fault') },
				{ value: 'always', text: i18n.t('plugins.WorkshopLights.tabOutputs.can_blink_always') }
			];
		},
		// automatic status lights off + "do the same as the zone": the board LEDs show the lighting like the zone
		followsLighting() {
			return this.lights.stripPresent && this.form.leds_board.with_lighting === 'as_zone' && !this.lights.statusAuto;
		},
		lightingStyle() {
			const c = rgbwCss(this.form.light_color, this.form.light_color && this.form.light_color.p != null ? this.form.light_color.p : 255);
			return { background: c, boxShadow: '0 0 6px ' + c };
		},
		// live values of the board LEDs when the service sends them; otherwise how they look at rest
		preview() {
			const live = Array.isArray(this.lights.info.board) ? this.lights.info.board : [];
			const shown = this.stripPresentChosen;
			return shown.map(l => {
				const v = live.find(x => x.id === l.id);
				return { id: l.id, name: l.name, css: v ? (v.on ? v.hex : 'rgba(40,40,40,0.9)') : l.css, on: v ? v.on : true, blink: v ? v.blink > 0 : (l.id === 'can' && this.canBlink === 'always'), text: v ? v.text : '' };
			});
		},
		// without a strip nothing is cut: every chosen LED is shown
		stripPresentChosen() {
			return this.lights.stripPresent ? this.chosen.slice(0, Math.max(0, (Number(this.form.led_count) || 1) - 1)) : this.chosen;
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
.board-leds {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 10px 20px;
}
.board-led-row {
	display: flex;
	align-items: flex-start;
	gap: 8px;
}
.board-led {
	flex: none;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	margin-top: 4px;
}
.board-view {
	display: flex;
	gap: 3px;
	flex-wrap: wrap;
}
.board-view-led {
	width: 16px;
	height: 16px;
	border-radius: 3px;
}
/* status zone in the preview: neutral and dim (not the colour of the mode) */
.zone-gray {
	background: rgba(158, 158, 158, 0.35);
	box-shadow: none;
}
.legend-led {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 2px;
}
.legend-board {
	background: linear-gradient(90deg, #ff0000, #0000ff, #ff9600, #00ff00);
}
</style>
