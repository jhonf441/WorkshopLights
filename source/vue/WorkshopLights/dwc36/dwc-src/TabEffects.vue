<template>
	<div>
		<div class="text-body-2 text-faint mb-3">{{ t.intro }}</div>

		<v-alert v-if="!lights.stripPresent" dense outlined type="info" class="mb-3">{{ t.noStrip }}</v-alert>
		<template v-else>
			<!-- ===== Start-up animation ===== -->
			<v-card class="mb-3">
				<v-card-text>
					<div class="d-flex align-center mb-1">
						<div class="text-subtitle-1 font-weight-medium"><v-icon small class="mr-1">mdi-animation-play</v-icon>{{ t.animTitle }}</div>
						<v-spacer />
						<v-btn small outlined :loading="lights.testing === 'anim'" @click="showAnimation()"><v-icon small left>mdi-play</v-icon>{{ t.showNow }}</v-btn>
					</div>
					<div class="text-caption text-faint mb-3">{{ t.animWhat }}</div>
					<div class="d-flex flex-wrap align-center" style="gap:16px">
						<v-switch v-model="form.animation.active" :label="t.animSwitch" dense hide-details class="mt-0" />
						<v-select v-model="form.animation.kind" :items="animTypes" :label="t.animType" dense outlined hide-details style="max-width:230px" :disabled="!form.animation.active" />
						<div v-if="form.animation.kind !== 'rainbow'" style="min-width:240px;flex:1 1 240px;max-width:360px">
							<color-rgbw v-model="form.animation.color" :name="t.animColor" />
						</div>
						<div v-if="form.animation.kind === 'bar' || form.animation.kind === 'center'" class="d-flex align-center" style="flex:1 1 260px;max-width:420px">
							<span class="text-body-2 mr-2">{{ t.smooth }}</span>
							<v-slider v-model="form.animation.step" min="1" max="12" hide-details dense thumb-label />
							<span class="text-body-2 ml-2">{{ t.fast }}</span>
						</div>
					</div>
				</v-card-text>
			</v-card>

			<!-- ===== End of job ===== -->
			<v-card class="mb-3">
				<v-card-text>
					<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-flag-checkered</v-icon>{{ t.endTitle }}</div>
					<div class="text-caption text-faint mb-3">{{ t.endWhat }}</div>
					<div class="d-flex flex-wrap align-center" style="gap:16px">
						<v-switch v-model="form.effects.end_job.active" :label="t.endSwitch" dense hide-details class="mt-0" />
						<div v-if="form.effects.end_job.active" style="min-width:220px;flex:1 1 220px;max-width:320px">
							<color-rgbw v-model="form.effects.end_job.color" :name="t.endColor" />
						</div>
						<div v-if="form.effects.end_job.active" class="d-flex align-center" style="flex:1 1 220px;max-width:320px">
							<span class="text-body-2 mr-2" style="white-space:nowrap">{{ $t('plugins.WorkshopLights.tabEffects.n_times', { n: form.effects.end_job.times }) }}</span>
							<v-slider v-model="form.effects.end_job.times" min="1" max="6" hide-details dense />
						</div>
					</div>
					<v-btn v-if="form.effects.end_job.active" small outlined class="mt-2" :loading="lights.testing === 'effect'" @click="tryEnd()">
						<v-icon small left>mdi-play</v-icon>{{ t.endTry }}
					</v-btn>
					<div class="text-caption text-faint mt-2">{{ t.endNote }}</div>
				</v-card-text>
			</v-card>
		</template>

		<!-- ===== While in use ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-subtitle-1 font-weight-medium mb-1"><v-icon small class="mr-1">mdi-shimmer</v-icon>{{ t.useTitle }}</div>
				<div class="text-caption text-faint mb-2">{{ t.useWhat }}</div>
				<v-switch v-if="hasJog" v-model="form.effects.jog_free_always" :label="t.jogAlways" :hint="t.jogAlwaysHelp" persistent-hint dense class="mt-0" />
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import ColorRgbw from './ColorRgbw.vue'
import { pluginActive } from './workshop-ids.js' // the jog is another plugin: nothing about it when it is absent

// Every user-visible text of this component is here.
const T = {
	intro: i18n.t('plugins.WorkshopLights.tabEffects.the_strip_animations_and_effects_the'),
	noStrip: i18n.t('plugins.WorkshopLights.tabEffects.without_an_led_strip_there_are'),
	animTitle: i18n.t('plugins.WorkshopLights.tabEffects.animation_at_power_on'),
	animWhat: i18n.t('plugins.WorkshopLights.tabEffects.when_the_board_starts_an_animation'),
	showNow: i18n.t('plugins.WorkshopLights.tabEffects.show_now'),
	animSwitch: i18n.t('plugins.WorkshopLights.tabEffects.show_animation'),
	animType: i18n.t('plugins.WorkshopLights.tabEffects.type'),
	animColor: i18n.t('plugins.WorkshopLights.tabEffects.bar_color'),
	smooth: i18n.t('plugins.WorkshopLights.tabEffects.smooth'),
	fast: i18n.t('plugins.WorkshopLights.tabEffects.fast'),
	bar: i18n.t('plugins.WorkshopLights.tabEffects.bar_that_fills_the_strip'),
	center: i18n.t('plugins.WorkshopLights.tabEffects.from_the_center'),
	blink: i18n.t('plugins.WorkshopLights.tabEffects.blink_3_times'),
	rainbow: i18n.t('plugins.WorkshopLights.tabEffects.rainbow'),
	endTitle: i18n.t('plugins.WorkshopLights.tabEffects.when_a_job_ends'),
	endWhat: i18n.t('plugins.WorkshopLights.tabEffects.the_status_zone_blinks_for_a'),
	endSwitch: i18n.t('plugins.WorkshopLights.tabEffects.blink_when_a_job_finishes'),
	endColor: i18n.t('plugins.WorkshopLights.tabEffects.warning_color'),
	endTry: i18n.t('plugins.WorkshopLights.tabEffects.test_the_warning_on_the_strip'),
	endNote: i18n.t('plugins.WorkshopLights.tabEffects.a_live_job_arrives_line_by'),
	useTitle: i18n.t('plugins.WorkshopLights.tabEffects.while_in_use'),
	useWhat: i18n.t('plugins.WorkshopLights.tabEffects.the_blinking_while_paused_and_the'),
	jogAlways: i18n.t('plugins.WorkshopLights.tabEffects.show_the_no_limits_jog_even'),
	jogAlwaysHelp: i18n.t('plugins.WorkshopLights.tabEffects.the_same_goes_for_a_crash'),
	cantShow: i18n.t('plugins.WorkshopLights.tabEffects.could_not_show_it')
};

export default {
	components: { ColorRgbw },
	inject: ['lights'],
	data() {
		return { t: T };
	},
	computed: {
		hasJog() {
			return pluginActive(this.$store, 'jog');
		},
		form() {
			return this.lights.form;
		},
		animTypes() {
			return [
				{ text: T.bar, value: 'bar' },
				{ text: T.center, value: 'center' },
				{ text: T.blink, value: 'blink' },
				{ text: T.rainbow, value: 'rainbow' }
			];
		}
	},
	methods: {
		async showAnimation() {
			const a = this.form.animation;
			await this.lights.invoke('anim', 'animation', { data: { kind: a.kind, color: a.color, step: a.step } }, 4000, T.cantShow);
		},
		async tryEnd() {
			const n = Math.max(1, Number(this.form.led_count) || 1);
			const c = this.form.effects.end_job.color;
			const times = this.form.effects.end_job.times;
			const sec = times * 0.6;
			const frames = [[[c.r, c.u, c.b, c.w, n]], [[0, 0, 0, 0, n]]];
			await this.lights.invoke('effect', 'preview', { data: { frames: frames, interval: 0.3, seconds: sec } }, sec * 1000 + 500, T.cantShow);
		}
	}
};
</script>

<style scoped>
.text-faint {
	color: var(--tp-faint);
}
</style>
