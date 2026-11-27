<template>
	<div>
		<!-- the answer first (can the Pi drive a strip?), then how to enable it, then the pins folded away -->
		<div v-if="summary !== 'some'" class="pi-answer mb-3" :class="'is-' + summary">
			<lock-reason v-if="summary === 'unread' && readKind" :kind="readKind" need="technician" :action="$t('plugins.WorkshopLights.lights.action_read')" />
			<div v-else-if="summary === 'unread'" class="text-body-2 text-faint">{{ readError ? $t('plugins.WorkshopLights.tabAdvanced.pi_read_error') : $t('plugins.WorkshopLights.tabAdvanced.pi_pins_loading') }}</div>
			<template v-else>
				<div class="pi-answer-head">
					<v-icon small class="mr-2">mdi-close-circle-outline</v-icon>
					<span class="pi-answer-title">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_answer_no') }}</span>
				</div>
					<help-line class="mb-2" :text="$t('plugins.WorkshopLights.tabAdvanced.pi_why_spi')" />
				<div class="text-body-2">{{ summary === 'empty' ? $t('plugins.WorkshopLights.tabAdvanced.pi_empty_why') : $t('plugins.WorkshopLights.tabAdvanced.pi_reason_none') }}</div>
				<div class="text-body-2 mt-1">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_needs') }}</div>
			</template>
			<div v-if="summary !== 'unread' || readError" class="mt-3">
				<v-btn small outlined :loading="checking" @click="recheck"><v-icon small left>mdi-refresh</v-icon>{{ $t('plugins.WorkshopLights.tabAdvanced.pi_check_again') }}</v-btn>
			</div>
		</div>

		<div v-if="summary === 'none'" class="pi-steps mb-3">
			<div class="pi-steps-title">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_steps_title') }}</div>
			<ol class="text-body-2 pi-steps-list">
				<li>{{ $t('plugins.WorkshopLights.tabAdvanced.pi_step_open') }}</li>
				<li>
					{{ $t('plugins.WorkshopLights.tabAdvanced.pi_step_paste') }}
					<div class="pi-command">
						<code class="pi-command-text">{{ enableCommand }}</code>
						<v-btn small outlined class="pi-command-copy" @click="copyCommand"><v-icon small left>{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>{{ copied ? $t('plugins.WorkshopLights.tabAdvanced.pi_copied') : $t('plugins.WorkshopLights.tabAdvanced.pi_copy') }}</v-btn>
					</div>
					<div class="text-caption text-faint mt-1">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_command_does_' + enableBus) }}</div>
				</li>
				<li>{{ $t('plugins.WorkshopLights.tabAdvanced.pi_step_back') }}</li>
			</ol>
			<div class="text-caption text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_system_change') }}</div>
		</div>

		<div v-if="summary === 'some'" class="pi-answer is-some mb-3">
			<div class="pi-answer-head">
				<v-icon small class="mr-2">mdi-check-circle-outline</v-icon>
				<span class="pi-answer-title">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_answer_yes') }}</span>
			</div>
				<help-line class="mb-2" :text="$t('plugins.WorkshopLights.tabAdvanced.pi_why_spi')" />
			<div class="text-body-2">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_reason_some', { pins: validPins }) }}</div>
		</div>

		<details v-if="piPins.length" class="pi-pins mb-3" data-wf-disclosure>
			<summary>{{ $t('plugins.WorkshopLights.tabAdvanced.pi_see_pins', { n: piPins.length }) }}</summary>
			<div v-for="g in pinGroups" :key="g.id" class="pi-group">
				<div class="pi-group-title">{{ g.title }} ({{ g.pins.length }})</div>
				<div class="text-caption text-faint">{{ g.note }}</div>
				<div class="pi-group-pins">
					<span v-for="p in g.pins" :key="p.gpio" class="pi-pin" :title="'GPIO' + p.gpio + ' - ' + (p.func || '') + (p.reason ? ' - ' + p.reason : '')">GPIO{{ p.gpio }}<span v-if="g.id === 'busy' && p.reason" class="pi-pin-why"> {{ p.reason }}</span></span>
				</div>
			</div>
		</details>

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
					<v-btn small outlined :loading="testing === r.key" :disabled="!saved(r) || !testAllowed" @click="test(r)"><v-icon small left>mdi-play</v-icon>{{ $t('plugins.WorkshopLights.tabAdvanced.pi_test') }}</v-btn>
					<span v-if="!saved(r)" class="text-caption text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_save_first') }}</span>
					<span v-if="statePi(r.x) && statePi(r.x).error" class="text-caption warning--text">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_error', { e: statePi(r.x).error }) }}</span>
					<span v-else-if="statePi(r.x) && statePi(r.x).writes" class="text-caption text-faint">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_writes', { n: statePi(r.x).writes, ms: statePi(r.x).ms }) }}</span>
				</div>
				<div class="text-caption warning--text mt-2">{{ $t('plugins.WorkshopLights.tabAdvanced.pi_wiring') }}</div>
			</template>
		</div>
		<lock-reason :ops="piOps" min="technician" class="mt-2" :subject="$t('plugins.WorkshopLights.subjects.pi_outputs')" />
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import { refusalCauseNow } from './session-refusal.js'; // a refusal told by its cause (vue/_shared36)
import { accessCanMixin } from './reason-mixin.js'; // what the role and the service say (vue/_shared36)
import { PI_OPS, groupAllowed } from './access-groups.js';
import LockReason from './LockReason.vue'; // vue/_shared36
import HelpLine from './HelpLine.vue' // vue/_shared36
import { ts } from './shared-t.js';
import { pinState, stripRows, pinsOfOthers, pinsSummary, pinToSelect, canEnable, pinGroupsOf, enableCommandOf } from './pi-pins.js';

// The output of each strip (main and extra): the Duet board or a pin of the Pi. Same data model and same save as always:
// strip.output = { tipo: 'duet' | 'pi', pin, orden, brillo }; the page saves it.
export default {
	components: { HelpLine, LockReason },
	mixins: [accessCanMixin],
	// the pins of the Pi are read with the session: another person reads them again
	sessionData: ['piPins', 'piStrips', 'piRead', 'readError'],
	sessionErrors: ['readError'], // what a refusal or a failure said: cleared when the person signs in, out or changes role (role-mixin.js)
	inject: ['lights'],
	data() {
		return { piPins: [], piStrips: [], piRead: false, readError: null, testing: null, piOps: PI_OPS, checking: false, copied: false };
	},
	computed: {
		// the test of a pin: the answer of the service (the table of the role until it answers)
		testAllowed() {
			return groupAllowed(PI_OPS, op => this.canDo(op));
		},
		// 'session' | 'role' when the read was refused, else '': computed from the error, so it follows who is signed in
		readKind() {
			void this.identityTick;
			return refusalCauseNow(this.readError);
		},
		form() {
			return this.lights.form;
		},
		rows() {
			return stripRows(this.form);
		},
		summary() {
			return pinsSummary(this.piPins, this.piRead);
		},
		// the bus DSF uses for the Duet is never offered (its pins are not listed): if GPIO20 is missing and GPIO10 is there, DSF is on bus 1
		enableBus() {
			const has = g => this.piPins.some(p => p.gpio === g);
			return has(10) && !has(20) ? 'spi0' : 'spi1';
		},
		enableCommand() {
			return enableCommandOf(this.enableBus);
		},
		// pins grouped by reason instead of one line each: used by the system, free but without SPI, valid for a strip
		pinGroups() {
			const k = 'plugins.WorkshopLights.tabAdvanced.';
			const groups = pinGroupsOf(this.piPins);
			return groups.map(g => ({ id: g.id, pins: g.pins, title: i18n.t(k + 'pi_group_' + g.id), note: i18n.t(k + 'pi_group_' + g.id + '_note') }));
		},
		validPins() {
			return this.piPins.filter(p => p.strip_spi).map(p => 'GPIO' + p.gpio).join(', ');
		}
	},
	mounted() {
		this.piLoad();
	},
	methods: {
		onSessionChange() {
			this.piLoad();
		},
		// pins of the Pi with what each one can do (read only)
		async piLoad() {
			try {
				const r = await this.lights.lightsApi('pi_pins');
				this.piPins = r.pins || [];
				this.piStrips = r.strips || [];
				this.piRead = true;
				this.readError = null;
			} catch (e) {
				this.piPins = [];
				// a refusal says its cause (session / role) instead of "reading..." forever or "could not read"
				this.readError = e; // the error itself: whether it is a refusal and what it says is computed (readKind), so it follows the role and the language
			}
		},
		// "Check again" after restarting the Pi: reads the pin analysis once more
		async recheck() {
			this.checking = true;
			try {
				await this.piLoad();
			} finally {
				this.checking = false;
			}
		},
		copyCommand() {
			try {
				navigator.clipboard.writeText(this.enableCommand).then(() => {
					this.copied = true;
					setTimeout(() => { this.copied = false; }, 2000);
				});
			} catch (e) {
				/* the command is shown in the box: it can be selected by hand */
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
.pi-answer {
	padding: 12px 14px;
	border-radius: 8px;
	border: 1px solid rgba(128, 128, 128, 0.45);
	background: rgba(128, 128, 128, 0.08);
}
.pi-answer.is-none,
.pi-answer.is-empty {
	border-color: rgba(255, 160, 0, 0.7);
	background: rgba(255, 160, 0, 0.1);
}
.pi-answer.is-some {
	border-color: rgba(76, 175, 80, 0.7);
	background: rgba(76, 175, 80, 0.1);
}
.pi-answer-head {
	display: flex;
	align-items: center;
	margin-bottom: 4px;
}
.pi-answer-title {
	font-size: 15px;
	font-weight: 600;
}
.pi-steps-title,
.pi-group-title {
	font-size: 13px;
	font-weight: 600;
}
.pi-steps-list {
	padding-left: 20px;
	margin: 4px 0;
}
.pi-steps-list li {
	margin-bottom: 8px;
}
.pi-command {
	display: flex;
	align-items: stretch;
	gap: 8px;
	margin-top: 6px;
}
.pi-command-text {
	flex: 1 1 auto;
	min-width: 0;
	padding: 8px 10px;
	border-radius: 6px;
	font-size: 12px;
	line-height: 1.5;
	overflow-wrap: anywhere;
	white-space: pre-wrap;
	background: rgba(128, 128, 128, 0.16);
	border: 1px solid rgba(128, 128, 128, 0.35);
	color: inherit;
}
.pi-command-copy {
	flex: none;
	align-self: flex-start;
	min-height: var(--wf-size-s, 32px); /* a secondary button of the family scale */
}
@media (max-width: 479px) {
	.pi-command {
		flex-direction: column;
	}
}
.pi-pins > summary {
	cursor: pointer;
	font-size: 13px;
	font-weight: 600;
	min-height: 32px;
}
.pi-group {
	margin-top: 10px;
}
.pi-group-pins {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 4px;
}
.pi-pin {
	font-size: 12px;
	padding: 2px 8px;
	border-radius: 4px;
	border: 1px solid rgba(128, 128, 128, 0.45);
	background: rgba(128, 128, 128, 0.12);
}
.pi-pin-why {
	opacity: 0.85;
}
.pi-row {
	padding: 10px 0;
	border-top: 1px solid rgba(128, 128, 128, 0.25);
}
</style>
