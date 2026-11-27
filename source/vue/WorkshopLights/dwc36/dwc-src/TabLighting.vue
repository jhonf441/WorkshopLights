<template>
	<div>
		<!-- ===== Work light now ===== -->
		<div class="wf-group">
			<h4 class="wf-group-title"><v-icon small class="mr-1">mdi-lightbulb-on-outline</v-icon>{{ t.lightTitle }}</h4>
			<div class="text-caption text-faint mb-3">{{ t.lightWhat }}</div>
			<div class="d-flex flex-wrap" style="gap:24px">
				<div class="help-tip-row"><v-switch :input-value="lights.lightOn" dense class="mt-0" :loading="lights.busyLight" :disabled="!zonesAllowed" @change="lights.changeLight" hide-details :label="t.lightSwitch" /></div>
				<template v-if="lights.saved">
					<div v-for="q in zoneSwitches" :key="q.key" class="help-tip-row"><v-switch :input-value="q.z.on" dense class="mt-0" :loading="lights.busyZone === q.key" :disabled="!zonesAllowed" @change="changeZone(q, $event)" hide-details :label="q.label" /></div>
				</template>
			</div>
			<lock-reason :ops="zoneOps" min="technician" class="mt-2" :subject="$t('plugins.WorkshopLights.subjects.lighting_zones')" />
			<div class="group-title mt-4">{{ t.colorTitle }}</div>
			<div class="text-caption text-faint mb-1">{{ t.colorHelp }}</div>
			<div class="color-row"><color-rgbw v-model="form.light_color" :name="t.lightTitle" with-brightness /></div>
		</div>

		<!-- ===== Scenes ===== -->
		<div class="wf-group">
			<div class="d-flex align-center mb-1">
				<h4 class="wf-group-title mb-0"><v-icon small class="mr-1">mdi-palette-swatch-outline</v-icon>{{ t.scenesTitle }}</h4>
				<v-spacer />
				<v-btn small outlined :disabled="form.work_light.scenes.length >= 8" @click="addScene"><v-icon small left>mdi-plus</v-icon>{{ t.addScene }}</v-btn>
			</div>
			<div class="text-caption text-faint mb-3">{{ t.scenesWhat }}</div>
			<div class="scenes">
				<div v-for="(s, i) in form.work_light.scenes" :key="s.id" class="scene" :class="{ active: form.work_light.scene === s.id }">
					<div class="d-flex align-center mb-2" style="gap:6px">
						<v-text-field v-model="s.name" :label="t.sceneName" dense outlined hide-details maxlength="24" />
						<v-btn icon small :title="t.removeScene" @click="form.work_light.scenes.splice(i, 1)"><v-icon small>mdi-close</v-icon></v-btn>
					</div>
					<color-rgbw v-model="s.color" :name="s.name" with-brightness />
					<v-btn small block :color="form.work_light.scene === s.id ? 'primary' : ''" outlined class="mt-2" :title="t.applySceneHelp" @click="lights.applyScene(s)">
						<v-icon small left>mdi-lightbulb-on</v-icon>{{ t.applyScene }}
					</v-btn>
				</div>
			</div>
			<div v-if="lights.changed" class="text-caption text-faint mt-2">{{ t.saveFirst }}</div>
		</div>

		<!-- ===== Auto off / auto on ===== -->
		<div class="wf-group">
			<h4 class="wf-group-title"><v-icon small class="mr-1">mdi-timer-outline</v-icon>{{ t.autoTitle }}</h4>
			<div class="text-caption text-faint mb-3">{{ autoWhat }}</div>
			<div class="d-flex flex-wrap align-center" style="gap:16px">
				<div class="help-tip-row"><v-switch v-model="form.work_light.auto_off.enabled" dense class="mt-0" hide-details :label="t.autoOff" /></div>
				<v-text-field v-model.number="form.work_light.auto_off.minutes" type="number" min="1" max="600" suffix="min" :label="t.autoOffMinutes" dense outlined hide-details style="max-width:170px" :disabled="!form.work_light.auto_off.enabled" />
			</div>
			<div class="help-tip-row mt-3"><v-switch v-model="form.work_light.auto_on_job" dense hide-details :label="t.autoOn" /></div>
			<div v-if="hasCamera" class="text-caption text-faint mt-2"><v-icon x-small class="mr-1">mdi-camera</v-icon>{{ t.cameraNote }}</div>
		</div>

		<!-- ===== Night dimming ===== -->
		<div class="wf-group">
			<h4 class="wf-group-title"><v-icon small class="mr-1">mdi-weather-night</v-icon>{{ t.nightTitle }}</h4>
			<div class="text-caption text-faint mb-3">{{ t.nightWhat }}</div>
			<v-switch v-model="form.night.enabled" :label="t.nightSwitch" dense hide-details class="mt-0" />
			<div class="d-flex flex-wrap align-center mt-3" style="gap:16px">
				<!-- a time written as HH:MM, the same field in every plugin (TimeField.vue, owner 2026-11-23): the Vuetify clock was the only way in -->
				<time-field v-model="form.night.from" :label="t.nightFrom" :disabled="!form.night.enabled" />
				<time-field v-model="form.night.to" :label="t.nightTo" :disabled="!form.night.enabled" />
				<div class="d-flex align-center" style="flex:1 1 260px;max-width:420px">
					<span class="text-body-2 mr-3" style="white-space:nowrap">{{ t.nightLevel }}: {{ form.night.level }} %</span>
					<v-slider v-model="form.night.level" min="1" max="100" hide-details dense :disabled="!form.night.enabled" />
				</div>
			</div>
			<v-switch v-model="form.night.include_work_light" :label="t.nightWork" dense hide-details class="mt-2" :disabled="!form.night.enabled" />
			<div v-if="lights.info.night && lights.info.night.on" class="text-caption mt-2"><v-icon x-small class="mr-1">mdi-weather-night</v-icon>{{ t.nightNow }}</div>
		</div>

		<!-- ===== Power ===== -->
		<div class="wf-group">
			<h4 class="wf-group-title"><v-icon small class="mr-1">mdi-flash-outline</v-icon>{{ t.powerTitle }}</h4>
			<div class="text-caption text-faint mb-3">{{ t.powerWhat }}</div>
			<div class="d-flex flex-wrap" style="gap:12px">
				<wf-field id="lf-10" :label="t.perChannel" style="max-width:260px"><v-text-field id="lf-10" v-model.number="form.power.ma_per_channel" type="number" min="1" max="60" suffix="mA" dense outlined hide-details :aria-label="t.perChannel" /></wf-field>
				<wf-field id="lf-11" :label="t.limit" style="max-width:260px"><v-text-field id="lf-11" v-model.number="form.power.limit_ma" type="number" min="0" suffix="mA" dense outlined hide-details :aria-label="t.limit" /></wf-field>
			</div>
			<div class="d-flex flex-wrap text-body-2 mt-3" style="gap:6px 24px">
				<span><b>{{ t.worst }}:</b> {{ worst }} mA ({{ totalLeds }} {{ t.leds }})</span>
				<span v-if="live"><b>{{ t.now }}:</b> {{ live.ma }} mA</span>
			</div>
			<v-alert v-if="form.power.limit_ma && worst > form.power.limit_ma" dense text type="warning" class="mt-2 mb-0">{{ t.worstOver }}</v-alert>
		</div>

		<!-- one help for the section, at its foot (FAMILIA-REDISENO 3, C4): the intro that opened the tab and the three folds of the groups in one -->
		<help-fold class="mt-3" :what="t.intro" :items="helpItems" />
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import ColorRgbw from './ColorRgbw.vue'
import { pluginActive } from './workshop-ids.js' // the camera is another plugin: nothing about it when it is absent
import HelpFold from './HelpFold.vue' // vue/_shared36
import TimeField from './TimeField.vue' // vue/_shared36
import LockReason from './LockReason.vue' // vue/_shared36
import { ZONE_OPS, groupAllowed } from './access-groups.js'
import WfField from './WfField.vue' // vue/_shared36

// Every user-visible text of this component is here.
const T = {
	intro: i18n.t('plugins.WorkshopLights.tabLighting.the_work_light_is_the_part'),
	lightTitle: i18n.t('plugins.WorkshopLights.common.work_light'),
	lightWhat: i18n.t('plugins.WorkshopLights.tabLighting.turns_the_lighting_on_or_off'),
	lightSwitch: i18n.t('plugins.WorkshopLights.common.work_light'),
	lightSwitchHelp: i18n.t('plugins.WorkshopLights.tabLighting.turns_the_lighting_on_or_off_2'),
	autoStatus: i18n.t('plugins.WorkshopLights.tabLighting.automatic_status_lights'),
	autoStatusHelp: i18n.t('plugins.WorkshopLights.tabLighting.when_off_the_lighting_also_uses'),
	zoneSwitchHelp: i18n.t('plugins.WorkshopLights.tabLighting.extra_zone_it_turns_on_at'),
	colorTitle: i18n.t('plugins.WorkshopLights.tabLighting.color_and_brightness'),
	colorHelp: i18n.t('plugins.WorkshopLights.tabLighting.the_strip_has_a_separate_white'),
	scenesTitle: i18n.t('plugins.WorkshopLights.tabLighting.scenes'),
	scenesWhat: i18n.t('plugins.WorkshopLights.tabLighting.a_scene_is_a_named_color'),
	addScene: i18n.t('plugins.WorkshopLights.tabLighting.scene'),
	sceneName: i18n.t('plugins.WorkshopLights.tabLighting.name'),
	removeScene: i18n.t('plugins.WorkshopLights.tabLighting.remove_this_scene'),
	applyScene: i18n.t('plugins.WorkshopLights.tabLighting.use'),
	applySceneHelp: i18n.t('plugins.WorkshopLights.tabLighting.turns_the_light_on_with_this'),
	saveFirst: i18n.t('plugins.WorkshopLights.tabLighting.changes_to_the_names_and_colors'),
	newScene: i18n.t('plugins.WorkshopLights.tabLighting.new_scene'),
	autoTitle: i18n.t('plugins.WorkshopLights.tabLighting.automatic_off_and_on'),
	autoWhat: i18n.t('plugins.WorkshopLights.tabLighting.so_the_light_is_not_left'),
	autoOff: i18n.t('plugins.WorkshopLights.tabLighting.turn_the_light_off_by_itself'),
	autoOffHelp: i18n.t('plugins.WorkshopLights.tabLighting.counts_from_when_it_was_turned'),
	autoOffMinutes: i18n.t('plugins.WorkshopLights.tabLighting.wait'),
	autoOn: i18n.t('plugins.WorkshopLights.tabLighting.turn_the_light_on_when_a'),
	autoOnHelp: i18n.t('plugins.WorkshopLights.tabLighting.with_a_file_job_or_a'),
	cameraNote: i18n.t('plugins.WorkshopLights.tabLighting.the_light_the_camera_turns_on'),
	nightTitle: i18n.t('plugins.WorkshopLights.tabLighting.night_dimming'),
	nightWhat: i18n.t('plugins.WorkshopLights.tabLighting.during_that_schedule_the_brightness_of'),
	nightSwitch: i18n.t('plugins.WorkshopLights.tabLighting.dim_the_strip_during_this_schedule'),
	nightFrom: i18n.t('plugins.WorkshopLights.tabLighting.from'),
	nightTo: i18n.t('plugins.WorkshopLights.tabLighting.to'),
	nightLevel: i18n.t('plugins.WorkshopLights.tabLighting.brightness_during_that_schedule'),
	nightWork: i18n.t('plugins.WorkshopLights.tabLighting.also_dim_the_work_light'),
	nightNow: i18n.t('plugins.WorkshopLights.tabLighting.dimming_is_active_now'),
	powerTitle: i18n.t('plugins.WorkshopLights.tabLighting.power_and_supply'),
	powerWhat: i18n.t('plugins.WorkshopLights.tabLighting.an_estimate_to_know_whether_your'),
	perChannel: i18n.t('plugins.WorkshopLights.tabLighting.consumption_per_color'),
	perChannelHelp: i18n.t('plugins.WorkshopLights.tabLighting.every_rgbw_led_has_4_colors'),
	limit: i18n.t('plugins.WorkshopLights.common.your_supply_limit'),
	limitHelp: i18n.t('plugins.WorkshopLights.tabLighting.current_the_strip_supply_can_give'),
	worst: i18n.t('plugins.WorkshopLights.common.everything_at_maximum'),
	now: i18n.t('plugins.WorkshopLights.tabLighting.now'),
	leds: 'LEDs',
	worstOver: i18n.t('plugins.WorkshopLights.tabLighting.with_every_led_at_maximum_you')
};

export default {
	components: { HelpFold, TimeField, WfField, ColorRgbw, LockReason },
	inject: ['lights'],
	data() {
		return { t: T, zoneOps: ZONE_OPS };
	},
	computed: {
		// the one help of the section (at its foot): the blocks the work light, automatic and power cards used to fold one by one
		helpItems() {
			const t = this.t;
			return [
				{ title: t.lightSwitch, what: t.lightSwitchHelp },
				...this.zoneSwitches.map(q => ({ title: q.label, what: t.zoneSwitchHelp })),
				{ title: t.autoOff, what: t.autoOffHelp },
				{ title: t.autoOn, what: t.autoOnHelp },
				{ title: t.perChannel, what: t.perChannelHelp },
				{ title: t.limit, what: t.limitHelp }
			];
		},
		// the work light and the extra zones: the answer of the service (the table of the role until it answers)
		zonesAllowed() {
			return groupAllowed(ZONE_OPS, op => this.lights.canDo(op));
		},
		hasCamera() {
			return pluginActive(this.$store, 'camera');
		},
		autoWhat() {
			return this.hasCamera ? this.t.autoWhat : this.$t('plugins.WorkshopLights.tabLighting.so_the_light_is_not_left_no_camera');
		},
		form() {
			return this.lights.form;
		},
		// switches of the saved extra zones (of every strip): they turn on / off at once
		zoneSwitches() {
			const g = this.lights.saved;
			if (!g) {
				return [];
			}
			const out = (g.zones_extra || []).map((z, i) => ({ key: 'p' + i, t: '', i, z, label: z.name }));
			(g.strips_extra || []).forEach(x => {
				x.zones.forEach((z, i) => out.push({ key: x.id + i, t: x.id, i, z, label: x.name + ' · ' + z.name }));
			});
			return out;
		},
		totalLeds() {
			return this.lights.totalForm();
		},
		worst() {
			return this.totalLeds * 4 * (Number(this.form.power.ma_per_channel) || 20);
		},
		live() {
			return this.lights.info.power || null;
		}
	},
	methods: {
		addScene() {
			const used = this.form.work_light.scenes.map(s => s.id);
			let k = 1;
			while (used.includes('s' + k)) {
				k++;
			}
			this.form.work_light.scenes.push({ id: 's' + k, name: T.newScene, color: { r: 0, u: 0, b: 0, w: 255, p: 255 } });
		},
		async changeZone(q, v) {
			this.lights.busyZone = q.key;
			try {
				const r = await this.lights.lightsApi('zone', Object.assign({ index: Number(q.i), on: !!v }, q.t ? { strip: String(q.t) } : {}));
				if (!r.ok) {
					throw new Error(r.error);
				}
				q.z.on = !!v;
				const tf = q.t ? this.form.strips_extra.find(x => x.id === q.t) : null;
				const zf = q.t ? tf && tf.zones[q.i] : this.form.zones_extra[q.i];
				if (zf) {
					zf.on = !!v;
				}
			} catch (e) {
				this.lights.message(e.message || String(e), true);
			} finally {
				this.lights.busyZone = null;
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
/* the scene editors: columns split by a line, not grey sub-cards (FAMILIA-REDISENO 3); the scene in use carries a 2 px accent line on top */
.scenes {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 8px 24px;
}
.scene {
	padding-top: 12px;
	border-top: 1px solid var(--wf-line, rgba(128, 128, 128, 0.25));
}
.scene.active {
	border-top: 2px solid var(--wf-accent, #1976d2);
	padding-top: 11px;
}
</style>
