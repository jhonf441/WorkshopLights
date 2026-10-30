<template>
	<div>
		<div class="text-body-medium text-faint mb-3">{{ t.intro }}</div>

		<!-- ===== Work light now ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-title-medium font-weight-medium mb-1"><v-icon size="small" class="mr-1">mdi-lightbulb-on-outline</v-icon>{{ t.lightTitle }}</div>
				<div class="text-body-small text-faint mb-3">{{ t.lightWhat }}</div>
				<div class="d-flex flex-wrap" style="gap:24px">
					<v-switch :model-value="lights.lightOn" :label="t.lightSwitch" :hint="t.lightSwitchHelp" persistent-hint density="compact" class="mt-0" :loading="lights.busyLight" @update:model-value="lights.changeLight" />
					<template v-if="lights.saved">
						<v-switch
							v-for="q in zoneSwitches" :key="q.key" :model-value="q.z.on" :label="q.label" :hint="t.zoneSwitchHelp" persistent-hint
							density="compact" class="mt-0" :loading="lights.busyZone === q.key" @update:model-value="v => changeZone(q, v)"
						/>
					</template>
				</div>
				<div class="group-title mt-4">{{ t.colorTitle }}</div>
				<div class="text-body-small text-faint mb-1">{{ t.colorHelp }}</div>
				<div class="color-row"><color-rgbw v-model="form.light_color" :name="t.lightTitle" with-brightness /></div>
			</v-card-text>
		</v-card>

		<!-- ===== Scenes ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="d-flex align-center mb-1">
					<div class="text-title-medium font-weight-medium"><v-icon size="small" class="mr-1">mdi-palette-swatch-outline</v-icon>{{ t.scenesTitle }}</div>
					<v-spacer />
					<v-btn size="small" variant="outlined" :disabled="form.work_light.scenes.length >= 8" @click="addScene"><v-icon size="small" start>mdi-plus</v-icon>{{ t.addScene }}</v-btn>
				</div>
				<div class="text-body-small text-faint mb-3">{{ t.scenesWhat }}</div>
				<div class="scenes">
					<div v-for="(s, i) in form.work_light.scenes" :key="s.id" class="scene" :class="{ active: form.work_light.scene === s.id }">
						<div class="d-flex align-center mb-2" style="gap:6px">
							<v-text-field v-model="s.name" :label="t.sceneName" density="compact" variant="outlined" hide-details maxlength="24" />
							<v-btn icon size="small" :title="t.removeScene" @click="form.work_light.scenes.splice(i, 1)"><v-icon size="small">mdi-close</v-icon></v-btn>
						</div>
						<color-rgbw v-model="s.color" :name="s.name" with-brightness />
						<v-btn size="small" block :color="form.work_light.scene === s.id ? 'primary' : ''" variant="outlined" class="mt-2" :title="t.applySceneHelp" @click="lights.applyScene(s)">
							<v-icon size="small" start>mdi-lightbulb-on</v-icon>{{ t.applyScene }}
						</v-btn>
					</div>
				</div>
				<div v-if="lights.changed" class="text-body-small text-faint mt-2">{{ t.saveFirst }}</div>
			</v-card-text>
		</v-card>

		<!-- ===== Auto off / auto on ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-title-medium font-weight-medium mb-1"><v-icon size="small" class="mr-1">mdi-timer-outline</v-icon>{{ t.autoTitle }}</div>
				<div class="text-body-small text-faint mb-3">{{ autoWhat }}</div>
				<div class="d-flex flex-wrap align-center" style="gap:16px">
					<v-switch v-model="form.work_light.auto_off.enabled" :label="t.autoOff" :hint="t.autoOffHelp" persistent-hint density="compact" class="mt-0" />
					<v-text-field v-model.number="form.work_light.auto_off.minutes" type="number" min="1" max="600" suffix="min" :label="t.autoOffMinutes" density="compact" variant="outlined" hide-details style="max-width:170px" :disabled="!form.work_light.auto_off.enabled" />
				</div>
				<v-switch v-model="form.work_light.auto_on_job" :label="t.autoOn" :hint="t.autoOnHelp" persistent-hint density="compact" class="mt-3" />
				<div v-if="hasCamera" class="text-body-small text-faint mt-2"><v-icon size="x-small" class="mr-1">mdi-camera</v-icon>{{ t.cameraNote }}</div>
			</v-card-text>
		</v-card>

		<!-- ===== Night dimming ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-title-medium font-weight-medium mb-1"><v-icon size="small" class="mr-1">mdi-weather-night</v-icon>{{ t.nightTitle }}</div>
				<div class="text-body-small text-faint mb-3">{{ t.nightWhat }}</div>
				<v-switch v-model="form.night.enabled" :label="t.nightSwitch" density="compact" hide-details class="mt-0" />
				<div class="d-flex flex-wrap align-center mt-3" style="gap:16px">
					<v-menu v-model="nightFromMenu" :close-on-content-click="false" transition="scale-transition" min-width="auto" :disabled="!form.night.enabled">
						<template #activator="{ props }">
							<v-text-field v-model="form.night.from" :label="t.nightFrom" readonly density="compact" hide-details color="primary" style="max-width:150px" :disabled="!form.night.enabled" v-bind="props">
								<template #prepend-inner>
									<v-icon color="primary">mdi-clock-outline</v-icon>
								</template>
							</v-text-field>
						</template>
						<v-time-picker v-model="form.night.from" format="24hr" color="primary" @update:minute="nightFromMenu = false" />
					</v-menu>
					<v-menu v-model="nightToMenu" :close-on-content-click="false" transition="scale-transition" min-width="auto" :disabled="!form.night.enabled">
						<template #activator="{ props }">
							<v-text-field v-model="form.night.to" :label="t.nightTo" readonly density="compact" hide-details color="primary" style="max-width:150px" :disabled="!form.night.enabled" v-bind="props">
								<template #prepend-inner>
									<v-icon color="primary">mdi-clock-outline</v-icon>
								</template>
							</v-text-field>
						</template>
						<v-time-picker v-model="form.night.to" format="24hr" color="primary" @update:minute="nightToMenu = false" />
					</v-menu>
					<div class="d-flex align-center" style="flex:1 1 260px;max-width:420px">
						<span class="text-body-medium mr-3" style="white-space:nowrap">{{ t.nightLevel }}: {{ form.night.level }} %</span>
						<v-slider v-model="form.night.level" min="1" max="100" hide-details density="compact" :disabled="!form.night.enabled" />
					</div>
				</div>
				<v-switch v-model="form.night.include_work_light" :label="t.nightWork" density="compact" hide-details class="mt-2" :disabled="!form.night.enabled" />
				<div v-if="lights.info.night && lights.info.night.on" class="text-body-small mt-2"><v-icon size="x-small" class="mr-1">mdi-weather-night</v-icon>{{ t.nightNow }}</div>
			</v-card-text>
		</v-card>

		<!-- ===== Power ===== -->
		<v-card class="mb-3">
			<v-card-text>
				<div class="text-title-medium font-weight-medium mb-1"><v-icon size="small" class="mr-1">mdi-flash-outline</v-icon>{{ t.powerTitle }}</div>
				<div class="text-body-small text-faint mb-3">{{ t.powerWhat }}</div>
				<div class="d-flex flex-wrap" style="gap:12px">
					<v-text-field v-model.number="form.power.ma_per_channel" type="number" min="1" max="60" suffix="mA" :label="t.perChannel" :hint="t.perChannelHelp" persistent-hint density="compact" variant="outlined" style="max-width:260px" />
					<v-text-field v-model.number="form.power.limit_ma" type="number" min="0" suffix="mA" :label="t.limit" :hint="t.limitHelp" persistent-hint density="compact" variant="outlined" style="max-width:260px" />
				</div>
				<div class="d-flex flex-wrap text-body-medium mt-3" style="gap:6px 24px">
					<span><b>{{ t.worst }}:</b> {{ worst }} mA ({{ totalLeds }} {{ t.leds }})</span>
					<span v-if="live"><b>{{ t.now }}:</b> {{ live.ma }} mA</span>
				</div>
				<v-alert v-if="form.power.limit_ma && worst > form.power.limit_ma" density="compact" text type="warning" class="mt-2 mb-0">{{ t.worstOver }}</v-alert>
			</v-card-text>
		</v-card>
	</div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'
import { i18n } from './dwc-host.js'
import ColorRgbw from './ColorRgbw.vue'
import { pluginActive } from './workshop-ids.js' // the camera is another plugin: nothing about it when it is absent

const lights = inject('lights')

// Every user-visible text of this component is here.
const t = {
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
}

const nightFromMenu = ref(false)
const nightToMenu = ref(false)

const form = computed(() => lights.form)
const hasCamera = computed(() => pluginActive('camera'))
const autoWhat = computed(() => (hasCamera.value ? t.autoWhat : i18n.t('plugins.WorkshopLights.tabLighting.so_the_light_is_not_left_no_camera')))
// switches of the saved extra zones (of every strip): they turn on / off at once
const zoneSwitches = computed(() => {
	const g = lights.saved
	if (!g) {
		return []
	}
	const out = (g.zones_extra || []).map((z, i) => ({ key: 'p' + i, t: '', i, z, label: z.name }))
	;(g.strips_extra || []).forEach(x => {
		x.zones.forEach((z, i) => out.push({ key: x.id + i, t: x.id, i, z, label: x.name + ' · ' + z.name }))
	})
	return out
})
const totalLeds = computed(() => lights.totalForm())
const worst = computed(() => totalLeds.value * 4 * (Number(form.value.power.ma_per_channel) || 20))
const live = computed(() => lights.info.power || null)

function addScene() {
	const used = form.value.work_light.scenes.map(s => s.id)
	let k = 1
	while (used.includes('s' + k)) {
		k++
	}
	form.value.work_light.scenes.push({ id: 's' + k, name: t.newScene, color: { r: 0, u: 0, b: 0, w: 255, p: 255 } })
}
async function changeZone(q, v) {
	lights.busyZone = q.key
	try {
		const r = await lights.lightsApi('zone', Object.assign({ index: Number(q.i), on: !!v }, q.t ? { strip: String(q.t) } : {}))
		if (!r.ok) {
			throw new Error(r.error)
		}
		q.z.on = !!v
		const tf = q.t ? form.value.strips_extra.find(x => x.id === q.t) : null
		const zf = q.t ? tf && tf.zones[q.i] : form.value.zones_extra[q.i]
		if (zf) {
			zf.on = !!v
		}
	} catch (e) {
		lights.message(e.message || String(e), true)
	} finally {
		lights.busyZone = null
	}
}
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
.scenes {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 10px;
}
.scene {
	padding: 10px;
	border-radius: 8px;
	background: rgba(128, 128, 128, 0.06);
	border: 1px solid transparent;
}
.scene.active {
	border-color: #1976d2;
}
</style>
