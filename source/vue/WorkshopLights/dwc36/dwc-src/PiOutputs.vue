<template>
	<div>
		<details class="wf-more">
			<summary>{{ $t('plugins.WorkshopLights.common.how_it_works') }}</summary>
		<div class="text-caption mb-3 text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_section_what') }}</div>
		</details>

		<!-- pins of this Pi: shown with their state and reason while none can drive a strip (never hidden) -->
		<div v-if="summary !== 'some'" class="mb-3">
			<div class="group-title">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_pins_title') }}</div>
			<div v-if="summary === 'unread'" class="text-caption text-faint">{{ readError ? $t('plugins.WorkshopLights.tabAdvanced.pi_read_error') : $t('plugins.WorkshopLights.tabAdvanced.pi_pins_loading') }}</div>
			<ul v-else-if="piPins.length" class="text-body-2 pi-list">
				<li v-for="p in piPins" :key="p.gpio"><b>GPIO{{ p.gpio }}</b> - {{ p.func }}: {{ pinText(p, []) }}</li>
			</ul>
			<v-alert v-if="summary !== 'unread'" dense outlined type="info" class="mt-2 mb-0">
				<div>{{ summary === 'empty' ? $t('plugins.WorkshopLights.tabAdvanced.pi_empty_why') : $t('plugins.WorkshopLights.tabAdvanced.pi_none_why') }}</div>
				<div class="mt-2">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_enable_how') }}</div>
			</v-alert>
		</div>

		<div v-for="r in rows" :key="r.key" class="pi-row">
			<div class="text-subtitle-2 mb-1">{{ name(r) }}</div>
			<v-switch
				:input-value="isPi(r.x)" :label="$t('plugins.WorkshopLights.tabAdvanced.pi_row_switch')" dense hide-details class="mt-0"
				:disabled="!isPi(r.x) && !canEnable(r.x)" @change="v => toggle(r, v)"
			/>
			<template v-if="isPi(r.x)">
				<div class="group-title mt-3">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_pin') }}</div>
				<div class="d-flex flex-wrap" style="gap:6px">
					<v-chip
						v-for="p in piPins" :key="p.gpio" small label
						:outlined="r.x.output.pin !== p.gpio" :color="state(p, r.x).ok ? 'primary' : 'grey'" :dark="r.x.output.pin === p.gpio"
						:disabled="!state(p, r.x).ok" :title="'GPIO' + p.gpio + ' - ' + (p.func || '') + ' - ' + pinText(p, others(r.x))" @click="r.x.output.pin = p.gpio"
					>GPIO{{ p.gpio }}</v-chip>
					<span v-if="!piPins.length" class="text-caption text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_pins_loading') }}</span>
				</div>
				<div class="d-flex flex-wrap mt-3" style="gap:12px">
					<v-select v-model="r.x.output.order" :items="['GRBW', 'RGBW', 'GRB', 'RGB', 'BRG']" :label="$t('plugins.WorkshopLights.tabAdvanced.pi_order')" dense outlined hide-details style="max-width:150px" />
					<v-text-field v-model.number="r.x.output.brightness" type="number" min="1" max="100" :label="$t('plugins.WorkshopLights.tabAdvanced.pi_brightness')" dense outlined hide-details style="max-width:150px" />
				</div>
				<div class="d-flex flex-wrap align-center mt-3" style="gap:12px">
					<v-btn small outlined :loading="testing === r.key" :disabled="!saved(r)" @click="test(r)"><v-icon small left>mdi-play</v-icon>{{ $t('plugins.WorkshopLights.tabAdvanced.pi_test') }}</v-btn>
					<span v-if="!saved(r)" class="text-caption text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_save_first') }}</span>
					<span v-if="statePi(r.x) && statePi(r.x).error" class="text-caption warning--text">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_error', { e: statePi(r.x).error }) }}</span>
					<span v-else-if="statePi(r.x) && statePi(r.x).writes" class="text-caption text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_writes', { n: statePi(r.x).writes, ms: statePi(r.x).ms }) }}</span>
				</div>
				<div class="text-caption warning--text mt-2">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_wiring') }}</div>
			</template>
		</div>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import { pinState, stripRows, pinsOfOthers, pinsSummary, pinToSelect, canEnable } from './pi-pins.js';

// The output of each strip (main and extra): the Duet board or a pin of the Pi. Same data model and same save as always:
// strip.output = { tipo: 'duet' | 'pi', pin, orden, brillo }; the page saves it.
export default {
	inject: ['lights'],
	data() {
		return { piPins: [], piStrips: [], piRead: false, readError: false, testing: null };
	},
	computed: {
		form() {
			return this.lights.form;
		},
		rows() {
			return stripRows(this.form);
		},
		summary() {
			return pinsSummary(this.piPins, this.piRead);
		}
	},
	mounted() {
		this.piLoad();
	},
	methods: {
		// pins of the Pi with what each one can do (read only)
		async piLoad() {
			try {
				const r = await this.lights.lightsApi('pi_pins');
				this.piPins = r.pins || [];
				this.piStrips = r.strips || [];
				this.piRead = true;
				this.readError = false;
			} catch (e) {
				this.piPins = [];
				this.readError = true;
			}
		},
		name(r) {
			if (r.main) {
				return i18n.t('plugins.WorkshopLights.stripZones.main');
			}
			return (r.x.name || i18n.t('plugins.WorkshopLights.stripZones.strip_e')) + ' (E' + r.x.led_strip + ')';
		},
		isPi(x) {
			return !!(x.output && x.output.kind === 'pi');
		},
		others(x) {
			return pinsOfOthers(this.form, x);
		},
		state(p, x) {
			return pinState(p, this.others(x));
		},
		canEnable(x) {
			return canEnable(this.piPins, this.others(x));
		},
		pinText(p, used) {
			const s = pinState(p, used);
			const k = 'plugins.WorkshopLights.tabAdvanced.';
			if (s.reason === 'ok') {
				return i18n.t(k + 'pi_pin_ok_strip');
			}
			if (s.reason === 'taken') {
				return i18n.t(k + 'pi_pin_taken');
			}
			if (s.reason === 'busy') {
				return i18n.t(k + 'pi_pin_used', { m: p.reason || '' });
			}
			return i18n.t(k + 'pi_pin_no_strip');
		},
		toggle(r, v) {
			const x = r.x;
			if (!x.output) {
				this.$set(x, 'output', { kind: 'duet', pin: 20, order: 'GRBW', brightness: 60 });
			}
			if (!v) {
				x.output.kind = 'duet';
				return;
			}
			const pin = pinToSelect(this.piPins, x.output.pin, this.others(x));
			if (pin === null) {
				// no pin works: the switch stays off (it is disabled anyway)
				this.$forceUpdate();
				return;
			}
			x.output.pin = pin;
			x.output.kind = 'pi';
		},
		// the test works on what is SAVED (the service uses the saved configuration)
		saved(r) {
			const g = this.lights.saved;
			if (!g) {
				return false;
			}
			const gs = r.main ? g.output : ((g.strips_extra || []).find(t => t.id === r.x.id) || {}).output;
			const f = r.x.output;
			return !!(gs && gs.kind === 'pi' && f && f.kind === 'pi' && gs.pin === f.pin && gs.order === f.order && gs.brightness === f.brightness);
		},
		statePi(x) {
			return x.output ? this.piStrips.find(t => t.pin === x.output.pin) || null : null;
		},
		async test(r) {
			this.testing = r.key;
			try {
				await this.lights.lightsApi('pi_test', { seconds: 4, pin: r.x.output.pin });
				await new Promise(res => setTimeout(res, 4500));
				await this.piLoad();
			} catch (e) {
				/* the error shows in the state line */
			} finally {
				this.testing = null;
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
.pi-list {
	padding-left: 18px;
}
.pi-row {
	padding: 10px 0;
	border-top: 1px solid rgba(128, 128, 128, 0.25);
}
</style>
