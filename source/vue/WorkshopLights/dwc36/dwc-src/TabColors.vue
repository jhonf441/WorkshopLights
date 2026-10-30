<template>
	<div>
		<div class="text-body-2 text-faint mb-3">{{ t.intro }}</div>

		<v-card class="mb-3">
			<v-card-text>
				<div class="d-flex align-center mb-1">
					<div class="text-subtitle-1 font-weight-medium"><v-icon small class="mr-1">mdi-palette-swatch</v-icon>{{ t.presetsTitle }}</div>
					<v-spacer />
					<v-btn x-small text @click="factory()">{{ t.factory }}</v-btn>
				</div>
				<div class="text-caption text-faint mb-2">{{ t.presetsHelp }}</div>
				<div class="d-flex flex-wrap mb-2" style="gap:8px">
					<button v-for="p in presets" :key="p.id" type="button" class="theme" :title="p.help || ''" @click="applyPreset(p)">
						<span class="theme-samples">
							<span v-for="(c, k) in [p.mode_colors.Laser, p.mode_colors.CNC, p.mode_colors.FFF, p.states.paused]" :key="k" :style="{ backgroundColor: css(c) }" />
						</span>
						<span class="text-body-2">{{ p.name }}</span>
					</button>
				</div>
				<div class="d-flex align-center flex-wrap" style="gap:8px">
					<v-btn small outlined @click="distinctPatterns()"><v-icon small left>mdi-waveform</v-icon>{{ t.patterns }}</v-btn>
					<span class="text-caption text-faint">{{ t.patternsHelp }}</span>
				</div>
			</v-card-text>
		</v-card>

		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-shape-outline</v-icon>{{ t.modesTitle }}</div>
				<div class="text-caption text-faint mb-3">{{ t.modesHelp }}</div>
				<div class="color-grid">
					<color-rgbw v-model="form.mode_colors.Laser" :name="t.laser" />
					<color-rgbw v-model="form.mode_colors.CNC" :name="t.cnc" />
					<color-rgbw v-model="form.mode_colors.FFF" :name="t.fff" />
				</div>
				<div class="d-flex align-center mt-3" style="max-width:460px">
					<span class="text-body-2 mr-3" style="white-space:nowrap">{{ t.idleBrightness }}</span>
					<v-slider v-model="form.idle_brightness" min="0" max="255" hide-details thumb-label dense />
				</div>
				<div class="text-caption text-faint">{{ t.idleBrightnessHelp }}</div>
			</v-card-text>
		</v-card>

		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-traffic-light</v-icon>{{ t.statesTitle }}</div>
				<div class="text-caption text-faint">{{ t.statesHelp }}</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import ColorRgbw from './ColorRgbw.vue'
import { copy } from './lights-shared.js'
import { rgbwCss } from './color.js'

// Every user-visible text of this component is here.
const T = {
	intro: i18n.t('plugins.WorkshopLights.tabColors.the_color_of_each_mode_and'),
	presetsTitle: i18n.t('plugins.WorkshopLights.tabColors.ready_made_styles'),
	presetsHelp: i18n.t('plugins.WorkshopLights.tabColors.they_change_the_colors_of_the'),
	factory: i18n.t('plugins.WorkshopLights.tabColors.factory_colors'),
	patterns: i18n.t('plugins.WorkshopLights.tabColors.a_different_pattern_per_state'),
	patternsHelp: i18n.t('plugins.WorkshopLights.tabColors.hands_out_different_effects_slow_blink'),
	modesTitle: i18n.t('plugins.WorkshopLights.tabColors.color_of_each_mode'),
	modesHelp: i18n.t('plugins.WorkshopLights.tabColors.seen_when_idle_and_as_a'),
	laser: i18n.t('plugins.WorkshopLights.tabColors.laser'),
	cnc: 'CNC',
	fff: i18n.t('plugins.WorkshopLights.common.3d_printing'),
	idleBrightness: i18n.t('plugins.WorkshopLights.tabColors.idle_brightness'),
	idleBrightnessHelp: i18n.t('plugins.WorkshopLights.tabColors.how_strong_the_mode_color_looks'),
	statesTitle: i18n.t('plugins.WorkshopLights.tabColors.state_colors'),
	statesHelp: i18n.t('plugins.WorkshopLights.tabColors.every_state_stop_pause_laser_firing'),
	classic: i18n.t('plugins.WorkshopLights.tabColors.classic'),
	soft: i18n.t('plugins.WorkshopLights.tabColors.soft'),
	contrast: i18n.t('plugins.WorkshopLights.tabColors.high_contrast'),
	night: i18n.t('plugins.WorkshopLights.tabColors.night'),
	warm: i18n.t('plugins.WorkshopLights.tabColors.warm'),
	neon: i18n.t('plugins.WorkshopLights.tabColors.neon'),
	safe: i18n.t('plugins.WorkshopLights.tabColors.color_blind_safe'),
	safeHelp: i18n.t('plugins.WorkshopLights.tabColors.okabe_and_ito_palette_distinguishable_with')
};

const c4 = (r, u, b, w) => ({ r, u, b, w: w || 0 });
// the colours of the 4 main states (the others keep theirs)
const PRESETS = [
	{ id: 'classic', name: T.classic, idle: 40, mode_colors: { Laser: c4(140, 0, 255), CNC: c4(0, 0, 255), FFF: c4(0, 255, 0) },
		states: { stop: c4(255, 0, 0), paused: c4(255, 120, 0), cancelling: c4(255, 0, 255), busy: c4(255, 255, 255) } },
	{ id: 'soft', name: T.soft, idle: 20, mode_colors: { Laser: c4(120, 40, 200), CNC: c4(40, 80, 200), FFF: c4(40, 180, 80) },
		states: { stop: c4(255, 0, 0), paused: c4(200, 120, 0), cancelling: c4(200, 0, 200), busy: c4(0, 0, 0, 120) } },
	{ id: 'contrast', name: T.contrast, idle: 90, mode_colors: { Laser: c4(140, 0, 255), CNC: c4(0, 0, 255), FFF: c4(0, 255, 0) },
		states: { stop: c4(255, 0, 0), paused: c4(255, 200, 0), cancelling: c4(255, 0, 255), busy: c4(0, 0, 0, 255) } },
	{ id: 'night', name: T.night, idle: 8, mode_colors: { Laser: c4(50, 0, 90), CNC: c4(0, 0, 90), FFF: c4(0, 90, 0) },
		states: { stop: c4(255, 0, 0), paused: c4(90, 45, 0), cancelling: c4(90, 0, 90), busy: c4(0, 0, 0, 40) } },
	{ id: 'warm', name: T.warm, idle: 35, mode_colors: { Laser: c4(255, 0, 110), CNC: c4(140, 0, 255), FFF: c4(255, 170, 0) },
		states: { stop: c4(255, 0, 0), paused: c4(255, 110, 0), cancelling: c4(200, 0, 255), busy: c4(60, 20, 0, 255) } },
	{ id: 'neon', name: T.neon, idle: 60, mode_colors: { Laser: c4(255, 0, 255), CNC: c4(0, 255, 255), FFF: c4(120, 255, 0) },
		states: { stop: c4(255, 0, 0), paused: c4(255, 220, 0), cancelling: c4(255, 110, 0), busy: c4(160, 0, 255) } },
	// Okabe-Ito: orange, blue, bluish green; vermilion, yellow, reddish purple, white
	{ id: 'seguro', name: T.safe, help: T.safeHelp, idle: 60, mode_colors: { Laser: c4(230, 159, 0), CNC: c4(0, 114, 178), FFF: c4(0, 158, 115) },
		states: { stop: c4(213, 94, 0), paused: c4(240, 228, 66), cancelling: c4(204, 121, 167), busy: c4(0, 0, 0, 255) },
		effects: { paused: 'blink_slow', cancelling: 'double', busy: 'steady' } }
];

const FACTORY = { idle: 40, mode_colors: PRESETS[0].mode_colors, states: PRESETS[0].states };

// effects given out by "a different pattern per state"
const SPREAD = ['blink_slow', 'double', 'pulse', 'blink', 'blink_fast'];

export default {
	components: { ColorRgbw },
	inject: ['lights'],
	data() {
		return { t: T, presets: PRESETS };
	},
	computed: {
		form() {
			return this.lights.form;
		}
	},
	methods: {
		css(c) {
			return rgbwCss(c, 255);
		},
		applyPreset(p) {
			this.form.mode_colors = copy(p.mode_colors);
			Object.keys(p.states).forEach(k => {
				if (this.form.states[k]) {
					this.form.states[k].color = copy(p.states[k]);
				}
				if (this.form.state_colors) {
					this.form.state_colors[k] = copy(p.states[k]);
				}
			});
			Object.keys(p.effects || {}).forEach(k => {
				if (this.form.states[k]) {
					this.form.states[k].effect = p.effects[k];
				}
			});
			this.form.idle_brightness = p.idle;
		},
		factory() {
			this.applyPreset(FACTORY);
		},
		// a different effect for every active combinable state (not only the colour tells them apart)
		distinctPatterns() {
			let k = 0;
			Object.keys(this.form.states).forEach(id => {
				const kind = this.lights.catalog[id] && this.lights.catalog[id].kind;
				const e = this.form.states[id];
				if (kind === 'combinable' && e.active && id !== 'busy') {
					e.effect = SPREAD[k % SPREAD.length];
					k++;
				}
			});
		}
	}
};
</script>

<style scoped>
.text-faint {
	color: var(--tp-faint);
}
.theme {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	border-radius: 18px;
	border: 1px solid rgba(128, 128, 128, 0.35);
	background: rgba(128, 128, 128, 0.08);
	color: inherit;
	cursor: pointer;
}
.theme:hover {
	border-color: #1976d2;
}
.theme-samples {
	display: inline-flex;
}
.theme-samples span {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	margin-right: -3px;
	border: 1px solid rgba(0, 0, 0, 0.4);
}
.color-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: 8px;
}
</style>
