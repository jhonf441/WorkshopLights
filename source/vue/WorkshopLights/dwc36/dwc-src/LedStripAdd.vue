<template>
	<span class="led-add">
		<v-btn small color="warning" outlined :disabled="!canPlan" @click="openDialog"><v-icon small left>mdi-plus-circle-outline</v-icon>{{ t.button }}</v-btn>
		<lock-reason :ops="ops" min="technician" class="mt-2" :subject="$t('plugins.WorkshopLights.subjects.led_strip')" />

		<wf-sheet :open="show" :title="t.title + ' E' + draft.strip" @close="show = false">
			<div class="led-add-card">
					<div v-if="loading" class="text-body-2 text-faint">{{ t.loading }}</div>
					<v-alert v-else-if="loadError" dense outlined type="error">{{ loadError }}</v-alert>

					<template v-else-if="!result">
						<p class="text-body-2">{{ t.intro }}</p>

						<wf-field id="lf-led-pin" :label="t.pin" :message="fieldError('pin')" level="error" class="mb-3">
							<v-select
								id="lf-led-pin" v-model="draft.pin" :items="pinItems" :item-disabled="p => !p.free" item-value="pin" item-text="pin" :aria-label="t.pin" dense outlined hide-details
								:error="!!fieldError('pin')" :disabled="busy" @change="changed"
							>
								<template #item="{ item }">
									<div class="led-pin-item" :class="{ 'is-used': !item.free }">
										<div>{{ item.dedicated ? t.pinDedicated : item.pin }}<span v-if="item.dedicated" class="text-faint"> ({{ item.pin }})</span></div>
										<div v-if="!item.free" class="led-pin-why">{{ usedText(item) }}</div>
									</div>
								</template>
							</v-select>
						</wf-field>
						<div v-if="!pinItems.some(p => p.free)" class="text-caption warning--text mb-3">{{ t.noFreePin }}</div>

						<div class="d-flex flex-wrap" style="gap:12px">
							<wf-field id="lf-led-n" :label="t.leds" :message="fieldError('leds')" level="error" style="max-width:170px">
								<v-text-field id="lf-led-n" v-model.number="draft.leds" type="number" min="1" :max="info.maxLeds" :aria-label="t.leds" dense outlined hide-details :error="!!fieldError('leds')" :disabled="busy" @input="changed" />
							</wf-field>
							<wf-field id="lf-led-type" :label="t.type" :message="fieldError('type')" level="error" style="max-width:260px">
								<v-select id="lf-led-type" v-model="draft.type" :items="typeItems" :aria-label="t.type" dense outlined hide-details :disabled="busy" @change="changed" />
							</wf-field>
						</div>
							<help-fold class="mt-2" :items="[{ title: t.pin, what: t.pinHelp }, { title: t.type, what: t.typeHelp }]" />
						<div v-if="fieldError('strip')" class="text-caption error--text mt-2">{{ fieldError('strip') }}</div>
						<div v-if="whereText" class="led-where mt-2">{{ whereText }}</div>
						<v-alert v-if="generalError" dense outlined type="error" class="mt-3 mb-0">{{ generalError }}</v-alert>

						<div v-if="review" class="led-review mt-3">
							<div class="led-review-title">{{ t.reviewTitle }}</div>
							<pre class="led-code">{{ review.lines.join('\n') }}</pre>
							<div class="text-caption mt-1">{{ t.reviewFiles }}</div>
							<ul class="text-body-2 led-files"><li v-for="f in review.files" :key="f"><code>{{ f }}</code></li></ul>
							<div class="text-caption text-faint">{{ t.restartNote }}</div>
						</div>
					</template>

					<template v-else>
						<v-alert dense outlined type="success">{{ t.done }}</v-alert>
						<div class="text-body-2 mb-2"><b>{{ t.restartTitle }}</b> {{ t.restartDo }}</div>
						<div class="text-body-2 mb-2">{{ t.backup }}</div>
						<div class="text-caption text-faint">{{ t.undo }}</div>
						<div v-for="w in result.warnings" :key="w" class="text-caption text-faint mt-1">{{ warnText(w) }}</div>
					</template>
			</div>
			<template #foot>
				<button type="button" class="wf-btn" @click="show = false">{{ result ? t.close : t.cancel }}</button>
				<button v-if="!result && !review" type="button" class="wf-btn wf-main" :disabled="!ready || busy || loading" :aria-busy="busy ? 'true' : null" @click="doPreview"><span class="mdi mdi-eye-outline" aria-hidden="true" /> {{ t.preview }}</button>
				<button v-if="!result && review" type="button" class="wf-btn wf-main" :disabled="busy" :aria-busy="busy ? 'true' : null" @click="doApply"><span class="mdi mdi-content-save-outline" aria-hidden="true" /> {{ t.confirm }}</button>
			</template>
		</wf-sheet>
	</span>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import { api } from './workshop-api.js' // vue/_shared36
import LockReason from './LockReason.vue' // vue/_shared36
import HelpFold from './HelpFold.vue' // vue/_shared36
import WfField from './WfField.vue' // vue/_shared36
import WfSheet from './WfSheet.vue' // vue/_shared36 (FASE2)
import { LED_ADD_OPS, groupAllowed } from './access-groups.js'
import { KIND_LED_STRIP, OPS_LED, DEFAULT_LEDS, DEFAULT_TYPE, normalizeLed, firstFreePin, normalizePreview, errorOf, buildSpec, specReady } from './led-strip-add.js'

const K = 'plugins.WorkshopLights.ledAdd.'
const T = {
	button: i18n.t(K + 'button'),
	title: i18n.t(K + 'title'),
	loading: i18n.t(K + 'loading'),
	intro: i18n.t(K + 'intro'),
	pin: i18n.t(K + 'pin'),
	pinHelp: i18n.t(K + 'pin_help'),
	pinDedicated: i18n.t(K + 'pin_dedicated'),
	noFreePin: i18n.t(K + 'no_free_pin'),
	leds: i18n.t(K + 'leds'),
	type: i18n.t(K + 'type'),
	typeHelp: i18n.t(K + 'type_help'),
	typeRgbw: i18n.t(K + 'type_rgbw'),
	typeRgb: i18n.t(K + 'type_rgb'),
	reviewTitle: i18n.t(K + 'review_title'),
	reviewFiles: i18n.t(K + 'review_files'),
	restartNote: i18n.t(K + 'restart_note'),
	preview: i18n.t(K + 'preview'),
	confirm: i18n.t(K + 'confirm'),
	cancel: i18n.t(K + 'cancel'),
	close: i18n.t(K + 'close'),
	done: i18n.t(K + 'done'),
	restartTitle: i18n.t(K + 'restart_title'),
	restartDo: i18n.t(K + 'restart_do'),
	backup: i18n.t(K + 'backup'),
	undo: i18n.t(K + 'undo')
}

// "Add to the configuration": choose a free pin, number of LEDs and type -> preview of the exact line and files (writes nothing) -> confirm
// (plan + apply, with a backup) -> restart the board. The same cycle as the tool assistant of Machine; the service does the writing.
export default {
	components: { HelpFold, LockReason, WfField, WfSheet },
	inject: ['lights'],
	props: {
		strip: { type: Number, required: true }, // the E number of the strip on this page
		leds: { type: Number, default: DEFAULT_LEDS } // the LEDs the page already has for it
	},
	data() {
		return { t: T, ops: LED_ADD_OPS, show: false, loading: false, loadError: '', busy: false, info: normalizeLed({}), draft: { strip: this.strip, pin: '', leds: this.leds || DEFAULT_LEDS, type: DEFAULT_TYPE }, review: null, errors: [], result: null }
	},
	computed: {
		canPlan() {
			return groupAllowed(LED_ADD_OPS, op => this.lights.canDo(op))
		},
		pinItems() {
			return this.info.pins
		},
		typeItems() {
			return this.info.types.map(id => ({ value: id, text: id === 'rgb' ? T.typeRgb : T.typeRgbw }))
		},
		ready() {
			return specReady(this.draft, this.info.maxLeds)
		},
		generalError() {
			const e = this.errors.find(x => !['pin', 'leds', 'type', 'strip'].includes(x.field))
			return e ? e.message : ''
		},
		whereText() {
			const e = this.errors.find(x => x.where)
			return e ? e.where.file + ':' + e.where.line + '  ' + e.where.text : ''
		}
	},
	methods: {
		async openDialog() {
			this.show = true
			this.review = null
			this.result = null
			this.errors = []
			this.loadError = ''
			this.loading = true
			this.draft = { strip: this.strip, pin: '', leds: this.leds || DEFAULT_LEDS, type: DEFAULT_TYPE }
			try {
				this.info = normalizeLed(await api(OPS_LED.get, {}))
				this.draft.pin = firstFreePin(this.info.pins)
				this.draft.type = this.info.types.includes(this.info.defaultType) ? this.info.defaultType : this.info.types[0]
			} catch (e) {
				this.loadError = errorOf(e).message
			} finally {
				this.loading = false
			}
		},
		// a field changed: the preview no longer describes what will be written
		changed() {
			this.review = null
			this.errors = []
		},
		usedText(p) {
			return p.usedBy ? this.$t(K + 'pin_used', { file: p.usedBy.file, line: p.usedBy.line, text: p.usedBy.text }) : this.$t(K + 'pin_used_unknown')
		},
		fieldError(field) {
			const e = this.errors.find(x => x.field === field)
			return e ? e.message : ''
		},
		warnText(code) {
			const k = K + 'warn_' + code
			const s = this.$t(k)
			return s === k ? code : s
		},
		codeText(e) {
			const k = K + 'err_' + e.code
			const s = this.$t(k)
			return e.message || (s === k ? this.$t(K + 'err_values') : s)
		},
		async doPreview() {
			this.busy = true
			this.errors = []
			this.review = null
			try {
				const p = normalizePreview(await api(OPS_LED.preview, { spec: buildSpec(this.draft) }))
				if (p.errors.length) {
					this.errors = p.errors.map(e => Object.assign({}, e, { message: this.codeText(e) }))
				} else {
					this.review = p
				}
			} catch (e) {
				const r = errorOf(e)
				this.errors = [Object.assign({}, r, { message: r.message || this.codeText(r) })]
			} finally {
				this.busy = false
			}
		},
		async doApply() {
			this.busy = true
			this.errors = []
			try {
				const spec = buildSpec(this.draft)
				const plan = await api(OPS_LED.plan, { kind: KIND_LED_STRIP, values: { spec } })
				// level 3 confirmation: shown by api() itself
				const r = await api(OPS_LED.apply, { plan_id: plan.plan_id, kind: KIND_LED_STRIP })
				this.result = { applied: !!(r && r.applied), snapshot: r && r.snapshot, restartNeeded: !r || r.restart_needed !== false, warnings: (plan.warnings || []).filter(w => w !== 'led_restart') }
				this.$emit('added', spec)
			} catch (e) {
				if (e.code !== 'cancelled') {
					const r = errorOf(e)
					this.errors = [Object.assign({}, r, { message: r.message || this.codeText(r) })]
					this.review = null
				}
			} finally {
				this.busy = false
			}
		}
	}
}
</script>

<style scoped>
.text-faint {
	color: var(--tp-faint);
}
.led-pin-item.is-used {
	opacity: 1;
}
.led-pin-why {
	font-size: 12px;
	line-height: 16px;
	color: var(--tp-faint);
	overflow-wrap: anywhere;
}
.led-where {
	font-size: 12px;
	font-family: monospace;
	padding: 6px 8px;
	border-radius: 6px;
	border: 1px solid rgba(128, 128, 128, 0.45);
	background: rgba(128, 128, 128, 0.12);
	overflow-wrap: anywhere;
}
.led-review {
	padding: 10px 12px;
	border-radius: 8px;
	border: 1px solid rgba(76, 175, 80, 0.7);
	background: rgba(76, 175, 80, 0.08);
}
.led-review-title {
	font-size: 13px;
	font-weight: 600;
}
.led-code {
	margin: 6px 0;
	padding: 8px 10px;
	border-radius: 6px;
	font-size: 12px;
	line-height: 1.5;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	background: rgba(128, 128, 128, 0.16);
	border: 1px solid rgba(128, 128, 128, 0.35);
}
.led-files {
	padding-left: 18px;
	margin: 2px 0 6px;
}
</style>
