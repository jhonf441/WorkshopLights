<template>
	<div class="color-rgbw">
		<v-menu v-model="open" :close-on-content-click="false" offset-y max-width="320">
			<template v-slot:activator="{ on, attrs }">
				<button type="button" class="sample-btn" v-bind="attrs" v-on="on">
					<span class="sample" :style="{ backgroundColor: css }" />
					<span class="name-col">
						<span class="text-body-2 d-block">{{ name }}</span>
						<span class="text-caption grey--text values">R{{ value.r }} V{{ value.u }} A{{ value.b }} B{{ value.w }}<template v-if="withBrightness"> &middot; {{ Math.round((value.p || 0) / 2.55) }}%</template></span>
					</span>
				</button>
			</template>
			<v-card class="pa-3">
				<div class="text-subtitle-2 mb-2">{{ name }}</div>
				<div class="d-flex flex-wrap mb-2" style="gap:6px">
					<button v-for="s in suggested" :key="s.n" type="button" class="suggested" :title="s.n" :style="{ backgroundColor: cssOf(s.c) }" @click="put(s.c)" />
				</div>
				<div v-for="k in channels" :key="k.k" class="d-flex align-center channel">
					<span class="channel-letter" :style="{ color: k.color }">{{ k.n }}</span>
					<v-slider :value="value[k.k]" min="0" max="255" hide-details dense :color="k.color" @input="v => set(k.k, v)" />
					<span class="channel-num">{{ value[k.k] }}</span>
				</div>
				<div class="text-caption grey--text mt-1">
					{{ t.whiteNote }}
				</div>
			</v-card>
		</v-menu>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import { rgbwCss } from './color.js'

// Every user-visible text of this component is here.
const T = {
	whiteNote: i18n.t('plugins.WorkshopLights.colorRgbw.the_strip_has_a_separate_white')
};

export default {
	props: {
		value: { type: Object, required: true },
		name: { type: String, default: '' },
		withBrightness: { type: Boolean, default: false }
	},
	data() {
		return {
			t: T,
			open: false,
			suggested: [
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.red'), c: { r: 255, u: 0, b: 0, w: 0 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.orange'), c: { r: 255, u: 100, b: 0, w: 0 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.amber'), c: { r: 255, u: 160, b: 0, w: 0 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.yellow'), c: { r: 255, u: 220, b: 0, w: 0 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.green'), c: { r: 0, u: 255, b: 0, w: 0 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.light_blue'), c: { r: 0, u: 180, b: 255, w: 0 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.blue'), c: { r: 0, u: 0, b: 255, w: 0 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.violet'), c: { r: 150, u: 0, b: 255, w: 0 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.warm_white'), c: { r: 60, u: 20, b: 0, w: 255 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.neutral_white'), c: { r: 0, u: 0, b: 0, w: 255 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.cool_white'), c: { r: 0, u: 0, b: 255, w: 255 } },
				{ n: i18n.t('plugins.WorkshopLights.colorRgbw.off'), c: { r: 0, u: 0, b: 0, w: 0 } }
			]
		};
	},
	computed: {
		channels() {
			const c = [
				{ k: 'r', n: 'R', color: '#ef5350' },
				{ k: 'u', n: 'V', color: '#66bb6a' },
				{ k: 'b', n: 'A', color: '#42a5f5' },
				{ k: 'w', n: 'B', color: '#e0e0e0' }
			];
			if (this.withBrightness) {
				c.push({ k: 'p', n: '☀', color: '#ffca28' });
			}
			return c;
		},
		css() {
			return rgbwCss(this.value, this.withBrightness ? this.value.p : 255);
		}
	},
	methods: {
		cssOf(c) {
			return rgbwCss(c, 255);
		},
		set(k, v) {
			this.$emit('input', { ...this.value, [k]: Math.round(v) });
		},
		put(c) {
			this.$emit('input', { ...this.value, ...c });
		}
	}
};
</script>

<style scoped>
.sample-btn {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 8px 10px;
	border-radius: 8px;
	background: rgba(128, 128, 128, 0.08);
	border: 1px solid rgba(128, 128, 128, 0.2);
	text-align: left;
	color: inherit;
	cursor: pointer;
}
.sample-btn:hover {
	background: rgba(128, 128, 128, 0.14);
}
.sample {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	flex: 0 0 28px;
	border: 1px solid rgba(255, 255, 255, 0.25);
}
.name-col {
	flex: 1 1 auto;
	min-width: 0;
	line-height: 1.3;
}
.values {
	white-space: nowrap;
}
.suggested {
	width: 26px;
	height: 26px;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.3);
	cursor: pointer;
}
.channel-letter {
	width: 18px;
	font-weight: 600;
}
.channel-num {
	width: 32px;
	text-align: right;
	font-size: 12px;
	font-variant-numeric: tabular-nums;
}
</style>
