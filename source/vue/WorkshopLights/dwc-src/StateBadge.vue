<!--
	The on-screen status indicator (not a strip): the current state with its
	colour and effect, the short reason, and the list of active states.
	`ind` is plugins.WorkshopService.data.statusIndicator, published by the
	service (dsf/lights_runtime.build_indicator). The effect (blink, pulse...)
	is animated here, with CSS.
-->
<template>
	<div class="state-badge" :class="{ compact }">
		<svg class="sb-dot" viewBox="-1 -1 2 2" :style="{ filter: 'drop-shadow(0 0 3px ' + hex + ')' }">
			<template v-for="(sl, j) in slices" :key="j">
				<circle v-if="sl.full" r="1" :fill="sl.hex" :class="effectClass(sl.fx)" />
				<path v-else :d="sl.d" :fill="sl.hex" :class="effectClass(sl.fx)" />
			</template>
		</svg>
		<div class="sb-text">
			<div class="sb-name">
				{{ name }}
				<span v-if="extra > 0" class="sb-more" :title="t.more">+{{ extra }}</span>
				<span v-if="ind && ind.test" class="sb-test">{{ t.testing }}</span>
			</div>
			<div v-if="!compact && reason" class="sb-reason">{{ reason }}</div>
			<div v-if="!compact && active.length > 1" class="sb-list">
				<span v-for="a in chips" :key="a.id" class="sb-chip">
					<span class="sb-chip-dot" :class="effectClass(a.effect)" :style="{ backgroundColor: a.hex }" />{{ a.name }}
				</span>
			</div>
		</div>
		<v-progress-linear v-if="!compact && progress != null" :model-value="progress * 100" height="4" class="sb-progress" color="primary" />
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { effectClass } from './lights-shared.js'

const props = defineProps({
	ind: { type: Object, default: null },
	compact: { type: Boolean, default: false }
})

const t = {
	more: i18n.t('plugins.WorkshopLights.stateBadge.more_than_one_state_is_active'),
	testing: i18n.t('plugins.WorkshopLights.stateBadge.test'),
	noData: i18n.t('plugins.WorkshopLights.stateBadge.no_status_light_data'),
	mode: i18n.t('plugins.WorkshopLights.tabSummary.mode')
}

const turnIdx = ref(0)
let turnTimer = null

const state = computed(() => (props.ind && props.ind.state) || null)
const hex = computed(() => (state.value ? state.value.hex : '#616161'))
const name = computed(() => (state.value ? state.value.name : t.noData))
const reason = computed(() => (props.ind ? props.ind.reason : ''))
const active = computed(() => (props.ind && Array.isArray(props.ind.active) ? props.ind.active : []))
// the active states plus, last, the colour of the machine mode when it is part of the zone (not when a
// state takes the whole zone, or the lighting stands for it): the strip and the arrow show it too
const chips = computed(() => {
	const i = props.ind
	const own = active.value.length > 0 && !['stop', 'crash', 'risk', 'jog_free', 'lighting'].includes(state.value && state.value.id)
	if (!i || !i.mode || !i.mode_hex || !own) {
		return active.value
	}
	return active.value.concat([{ id: 'mode', name: t.mode + ': ' + i.mode, hex: i.mode_hex, effect: 'steady' }])
})
// how the states combine on the zone (Lights > "When several are active"): priority | split | turns
const mode = computed(() => {
	const c = props.ind && props.ind.combine
	return c === 'split' || c === 'turns' ? c : 'priority'
})
const turnMs = computed(() => (mode.value === 'turns' ? Math.max(500, ((props.ind && props.ind.turn_s) || 1.5) * 1000) : 0))
// what the dot draws: the states (and the mode colour last) as the zone shows them, each with its effect
const pieces = computed(() => {
	if (mode.value === 'priority' || chips.value.length < 2) {
		return [{ hex: hex.value, fx: state.value ? state.value.effect : 'steady' }]
	}
	return chips.value.map(c => ({ hex: c.hex, fx: c.effect }))
})
// the pie: split = one slice per state (the first ones bigger, the mode colour last); turns = one state at a time
const slices = computed(() => {
	const it = pieces.value
	if (mode.value === 'turns' && it.length > 1) {
		const x = it[turnIdx.value % it.length]
		return [{ full: true, hex: x.hex, fx: x.fx }]
	}
	if (mode.value === 'split' && it.length > 1) {
		const k = it.length
		const weights = it.map((_, j) => (j < k - 1 ? k - j : 1))
		const total = weights.reduce((a, b) => a + b, 0)
		const pt = g => { const r = (g - 90) * Math.PI / 180; return [Math.cos(r).toFixed(4), Math.sin(r).toFixed(4)] }
		let a0 = 0
		return it.map((x, j) => {
			const a1 = a0 + 360 * weights[j] / total
			const p0 = pt(a0), p1 = pt(a1)
			const d = 'M0 0 L' + p0[0] + ' ' + p0[1] + ' A1 1 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + p1[0] + ' ' + p1[1] + ' Z'
			a0 = a1
			return { full: false, d, hex: x.hex, fx: x.fx }
		})
	}
	return [{ full: true, hex: it[0].hex, fx: it[0].fx }]
})
const extra = computed(() => Math.max(0, active.value.length - 1))
const progress = computed(() => (props.ind && props.ind.progress != null ? props.ind.progress : null))

function armTurns() {
	clearInterval(turnTimer)
	turnTimer = null
	turnIdx.value = 0
	if (turnMs.value) {
		turnTimer = setInterval(() => { turnIdx.value += 1 }, turnMs.value)
	}
}
watch(turnMs, armTurns, { immediate: true })
onBeforeUnmount(() => clearInterval(turnTimer))
</script>

<style scoped>
.state-badge {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
}
.sb-dot {
	flex: none;
	width: 24px;
	height: 24px;
	overflow: visible;
}
.compact .sb-dot {
	width: 16px;
	height: 16px;
}
.sb-text {
	min-width: 0;
	flex: 1 1 160px;
}
.sb-name {
	font-size: 16px;
	font-weight: 500;
	line-height: 1.3;
}
.compact .sb-name {
	font-size: 14px;
}
.sb-more,
.sb-test {
	margin-left: 6px;
	padding: 0 6px;
	border-radius: 8px;
	font-size: 12px;
	font-weight: 400;
	background: rgba(128, 128, 128, 0.2);
}
.sb-reason {
	font-size: 13px;
	color: var(--tp-faint, #9e9e9e);
}
.sb-list {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 12px;
	margin-top: 4px;
	font-size: 12px;
}
.sb-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}
.sb-chip-dot {
	width: 9px;
	height: 9px;
	border-radius: 50%;
	display: inline-block;
}
.sb-progress {
	flex: 1 0 100%;
}
</style>
