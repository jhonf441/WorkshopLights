<template>
	<div>
		<!-- ===================== basic: size, output and checks ===================== -->
		<template v-if="part === 'basic'">
			<div class="d-flex align-center flex-wrap mb-2" style="gap:12px">
				<v-text-field v-model.number="form.led_start" type="number" min="0" :label="t.lightingLeds" :hint="t.lightingLedsHelp" persistent-hint dense outlined style="max-width:200px" />
				<v-text-field v-model.number="form.led_count" type="number" min="1" :label="t.statusLeds" :hint="t.statusLedsHelp" persistent-hint dense outlined style="max-width:200px" />
				<v-text-field v-model.number="form.led_strip" type="number" min="0" max="9" :label="t.outputNumber" :hint="outputHint" persistent-hint dense outlined style="max-width:220px" />
			</div>

			<div class="group-title mt-3"><v-icon small class="mr-1">mdi-raspberry-pi</v-icon>{{ $t('plugins.WorkshopLights.stripZones.out_title') }}</div>
			<div class="text-body-2">
				{{ output.kind === 'pi' ? $t('plugins.WorkshopLights.stripZones.out_now_pi', { pin: output.pin }) : $t('plugins.WorkshopLights.stripZones.out_now_duet') }}
				<a href="#" class="ml-2" @click.prevent="lights.tab = 'advanced'">{{ $t('plugins.WorkshopLights.stripZones.out_change') }}</a>
			</div>
			<div class="text-caption text-faint mt-1">{{ output.kind === 'pi' ? $t('plugins.WorkshopLights.stripZones.out_pi_help') : $t('plugins.WorkshopLights.stripZones.out_duet_help') }}</div>

			<div class="group-title mt-3">{{ t.livePreview }}</div>
			<div class="strip-border" :class="{ ampliada: lights.stripEnlarged }">
				<div
					class="led_strip" :class="{ 'strip-dense': totalView > 60, 'strip-very-dense': totalView > 160 }"
					:style="{ gridTemplateColumns: `repeat(${Math.max(1, totalView)}, ${lights.stripEnlarged ? '14px' : '1fr'})` }"
				>
					<div
						v-for="i in totalView" :key="i" class="led"
						:class="{ 'led-sobra': i > totalTab, 'led-missing': i > totalFirmwareTab && totalFirmwareTab }"
						:style="{ backgroundColor: colorLed(i - 1) }"
						:title="t.led + ' ' + (i - 1)"
					/>
				</div>
			</div>
			<div v-if="totalView > 60" class="text-caption text-faint mt-1">
				{{ totalView }} {{ t.manyLeds }}
				<a href="#" @click.prevent="lights.stripEnlarged = !lights.stripEnlarged">{{ lights.stripEnlarged ? t.fit : t.enlarge }}</a>
			</div>
			<div class="d-flex text-caption mt-1 strip-legend">
				<span v-for="z in zonesTab.filter(x => x.n > 0)" :key="z.id" :style="{ flex: z.n, borderTopColor: z.colorId }">{{ z.name }}: {{ t.leds }} {{ z.since }}–{{ z.until }}</span>
				<span v-if="totalView > totalTab" :style="{ flex: totalView - totalTab }" class="text-faint">{{ t.unused }}</span>
			</div>
			<div class="d-flex align-center flex-wrap mt-2 text-body-2" style="gap:6px">
				{{ t.total }}: <b>{{ totalTab }} {{ t.leds }}</b>
				<template v-if="totalFirmwareTab && totalTab === totalFirmwareTab">
					<v-icon small color="success">mdi-check-circle</v-icon><span class="text-faint">{{ t.sameAsConfig }}</span>
				</template>
			</div>

			<v-alert v-if="!lights.m950.line" dense outlined type="warning" class="mt-3 mb-0">
				{{ t.noM950 }} <code>M950 E{{ form.led_strip }} C"&lt;{{ t.output }}&gt;" T2 U{{ totalTab }}</code>
			</v-alert>
			<v-alert v-if="totalFirmwareTab && totalTab !== totalFirmwareTab" dense outlined type="warning" class="mt-3 mb-0">
				{{ t.mismatch1 }} ({{ totalTab }}) {{ t.mismatch2 }} {{ totalFirmwareTab }} {{ t.mismatch3 }} <code>{{ m950LineTab }}</code>.
				<div class="mt-2">
					<v-btn small :color="lights.armed === 'm950' ? 'error' : 'warning'" :dark="lights.armed === 'm950'" :loading="lights.applyingM950" :disabled="!lights.canDo('lights.apply_m950')" @click="lights.arm('m950', applyM950)">
						{{ lights.armed === 'm950' ? t.tapAgainConfig : t.changeConfig + totalTab }}
					</v-btn>
					<span class="text-caption ml-2">{{ t.configCopy }}</span>
				</div>
			</v-alert>
			<v-alert v-if="lights.requestRestart" dense outlined type="info" class="mt-3 mb-0">
				{{ t.configSaid }} {{ totalFirmwareTab }} ({{ t.copy }}: {{ lights.copyConfig }}). {{ t.boardTakes }}
				<v-btn small class="ml-2" :color="lights.armed === 'restart' ? 'error' : 'primary'" :dark="lights.armed === 'restart'"
					:disabled="!lights.machineStill" @click="lights.arm('restart', restartBoard)">
					{{ lights.armed === 'restart' ? t.tapAgainReboot : t.reboot }}
				</v-btn>
				<span v-if="!lights.machineStill" class="text-caption ml-2">{{ t.onlyIdle }}</span>
			</v-alert>

			<div class="text-body-2 mt-4 mb-2">{{ t.checkTitle }}</div>
			<div class="tools">
				<div class="tool">
					<div class="zone-title"><v-icon small class="mr-1">mdi-counter</v-icon>{{ t.countTitle }}</div>
					<div class="text-caption text-faint mb-2">{{ t.countHelp }}</div>
					<div class="d-flex align-center" style="gap:6px">
						<v-btn :aria-label="$t('plugins.WorkshopLights.shared.aria_less')" small icon outlined @click="lights.countN = Math.max(1, (lights.countN || 1) - 1)"><v-icon small>mdi-minus</v-icon></v-btn>
						<v-text-field v-model.number="lights.countN" type="number" min="1" dense outlined hide-details :suffix="t.leds" style="max-width:110px" />
						<v-btn :aria-label="$t('plugins.WorkshopLights.shared.aria_more')" small icon outlined @click="lights.countN = (lights.countN || 0) + 1"><v-icon small>mdi-plus</v-icon></v-btn>
						<v-btn small color="primary" outlined :loading="lights.testing === 'count'" @click="test('count')">{{ t.lightUp }}</v-btn>
					</div>
				</div>
				<div class="tool">
					<div class="zone-title"><v-icon small class="mr-1">mdi-palette-swatch</v-icon>{{ t.identifyTitle }}</div>
					<div class="text-caption text-faint mb-2">
						{{ t.identifyHelp }}
						<span v-for="z in zonesTab.filter(x => x.n > 0)" :key="'cz' + z.id" class="chip-zone" :style="{ background: z.colorId }">{{ z.name }}</span>.
					</div>
					<v-btn small color="primary" outlined :loading="lights.testing === 'zones'" @click="test('zones')">{{ t.identify }}</v-btn>
				</div>
			</div>
		</template>

		<!-- ===================== order: zones, status zone, extra strips ===================== -->
		<template v-else>
			<div class="d-flex align-center flex-wrap mb-3" style="gap:12px">
				<v-select
					v-model="form.zone_state" :items="optionsZoneState" :label="t.stateZone" dense outlined hide-details
					prepend-inner-icon="mdi-traffic-light" style="max-width:340px"
				/>
				<span class="text-caption text-faint" style="flex:1;min-width:220px">{{ textZoneState }}</span>
			</div>

			<!-- one tab per strip -->
			<div class="strips-tabs mb-3">
				<button type="button" class="strip-tab" :class="{ active: !stripX }" @click="stripSel = null">{{ t.main }} &middot; E{{ form.led_strip }}</button>
				<button v-for="(x, i) in form.strips_extra" :key="x.id" type="button" class="strip-tab" :class="{ active: stripX === x }" @click="stripSel = i">
					{{ x.name }} &middot; E{{ x.led_strip }}
				</button>
				<button v-if="form.strips_extra.length < 4" type="button" class="strip-tab strip-new" :title="t.addStripHelp" @click="addStrip">
					<v-icon x-small>mdi-plus</v-icon> {{ t.strip }}
				</button>
			</div>
			<div v-if="stripX" class="d-flex align-center flex-wrap mb-3" style="gap:12px">
				<v-text-field v-model="stripX.name" :label="t.stripNameLabel" dense outlined hide-details maxlength="30" style="max-width:220px" />
				<v-text-field v-model.number="stripX.led_strip" type="number" min="0" max="9" :label="t.stripNumber" dense outlined hide-details style="max-width:170px" />
				<v-spacer />
				<v-btn small text :color="lights.armed === 'removeStrip' ? 'error' : ''" @click="lights.arm('removeStrip', removeStrip)">
					{{ lights.armed === 'removeStrip' ? t.tapAgainRemove : t.removeStrip }}
				</v-btn>
			</div>
			<v-alert v-if="stripX && !m950LineTab" dense outlined type="warning" class="mb-3">
				{{ t.stripE }}{{ eTab }} {{ t.stripNotInConfig }} <code>M950 E{{ eTab }} C"&lt;{{ t.output }}&gt;" T2 U{{ totalTab }}</code>
			</v-alert>

			<div class="text-body-2 mb-1">{{ t.orderTitle }}</div>
			<div class="text-caption text-faint mb-2">{{ t.orderHelp }}</div>
			<div class="zones-order">
				<div class="zone-connector" :title="t.connectorHelp">
					<v-icon small>mdi-power-plug</v-icon>
					<span>E{{ eTab }}</span>
				</div>
				<v-icon small class="zone-arrow">mdi-chevron-right</v-icon>
				<div v-for="(z, k) in zonesTab" :key="z.id" class="zone-box" :style="{ borderLeftColor: z.colorId }">
					<div class="d-flex align-center mb-2 zone-title">
						<v-btn x-small icon :disabled="k === 0" :title="t.moveToConnector" @click="move(k, -1)"><v-icon small>mdi-chevron-left</v-icon></v-btn>
						<input v-if="z.extra" v-model="z.x.name" class="zone-name" maxlength="30" :title="t.zoneNameHelp" />
						<span v-else class="flex-grow-1 text-truncate"><v-icon small class="mr-1">{{ z.icon }}</v-icon>{{ z.name }}</span>
						<v-btn x-small icon :disabled="k === zonesTab.length - 1" :title="t.moveToEnd" @click="move(k, 1)"><v-icon small>mdi-chevron-right</v-icon></v-btn>
						<v-btn v-if="z.extra" x-small icon :title="t.removeZone" @click="removeZone(z.i)"><v-icon small>mdi-close</v-icon></v-btn>
					</div>
					<div v-if="stripX && isZoneState(z)" class="text-caption mb-1"><v-icon x-small class="mr-1">mdi-traffic-light</v-icon>{{ t.isStatusZone }}</div>
					<v-text-field v-if="z.extra" v-model.number="z.x.n" type="number" min="1" :label="t.ledCount" dense outlined hide-details />
					<v-text-field v-else v-model.number="form[z.field]" type="number" :min="z.min" :label="t.ledCount" dense outlined hide-details />
					<div class="text-caption mt-1">{{ z.n > 0 ? $t('plugins.WorkshopLights.stripZones.leds_from_to', { from: z.since, to: z.until }) : t.noLeds }}</div>
					<color-rgbw v-if="z.extra && !(stripX && isZoneState(z))" v-model="z.x.color" :name="z.name" with-brightness class="mt-1" />
				</div>
				<v-btn v-if="(stripX ? stripX.zones.length < 8 : form.zones_extra.length < 6)" small text class="zone-add" :title="t.addZoneHelp" @click="addZone">
					<v-icon small left>mdi-plus</v-icon>{{ t.zone }}
				</v-btn>
			</div>
			<div class="text-caption text-faint mt-2">{{ t.orderFoot }}</div>
		</template>
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import ColorRgbw from './ColorRgbw.vue'
import zonesMixin from './zones-mixin.js'

// Every user-visible text of this component (and the ones the zones mixin uses) is here.
const T = {
	lighting: i18n.t('plugins.WorkshopLights.stripZones.lighting'),
	status: i18n.t('plugins.WorkshopLights.stripZones.status'),
	zoneName: i18n.t('plugins.WorkshopLights.stripZones.zone'),
	stripName: i18n.t('plugins.WorkshopLights.stripZones.strip'),
	stateZoneNone: i18n.t('plugins.WorkshopLights.stripZones.none_screens_only'),
	lightingLeds: i18n.t('plugins.WorkshopLights.stripZones.lighting_leds'),
	lightingLedsHelp: i18n.t('plugins.WorkshopLights.stripZones.the_ones_that_give_work_light'),
	statusLeds: i18n.t('plugins.WorkshopLights.stripZones.status_leds'),
	statusLedsHelp: i18n.t('plugins.WorkshopLights.stripZones.the_ones_that_show_the_mode'),
	outputNumber: i18n.t('plugins.WorkshopLights.stripZones.board_output_e'),
	outputHintWith: i18n.t('plugins.WorkshopLights.stripZones.config_g_line'),
	outputHint: i18n.t('plugins.WorkshopLights.stripZones.number_in_m950_e_n_change'),
	livePreview: i18n.t('plugins.WorkshopLights.stripZones.strip_view_live_copy'),
	led: 'LED',
	manyLeds: i18n.t('plugins.WorkshopLights.stripZones.leds_all_are_shown_shrunk_to'),
	fit: i18n.t('plugins.WorkshopLights.stripZones.fit_to_width'),
	enlarge: i18n.t('plugins.WorkshopLights.stripZones.enlarge_scroll_sideways'),
	leds: 'LEDs',
	unused: i18n.t('plugins.WorkshopLights.stripZones.unused'),
	total: i18n.t('plugins.WorkshopLights.stripZones.total'),
	sameAsConfig: i18n.t('plugins.WorkshopLights.stripZones.same_as_config_g'),
	noM950: i18n.t('plugins.WorkshopLights.stripZones.the_strip_is_not_in_config'),
	output: i18n.t('plugins.WorkshopLights.stripZones.output'),
	mismatch1: i18n.t('plugins.WorkshopLights.stripZones.the_sum_of_the_zones'),
	mismatch2: i18n.t('plugins.WorkshopLights.stripZones.does_not_match_the'),
	mismatch3: i18n.t('plugins.WorkshopLights.stripZones.leds_that_config_g_declares'),
	tapAgainConfig: i18n.t('plugins.WorkshopLights.stripZones.tap_again_to_change_config_g'),
	changeConfig: i18n.t('plugins.WorkshopLights.stripZones.change_config_g_to_u'),
	configCopy: i18n.t('plugins.WorkshopLights.stripZones.a_copy_of_config_g_is'),
	configSaid: i18n.t('plugins.WorkshopLights.stripZones.config_g_already_says_u'),
	copy: i18n.t('plugins.WorkshopLights.stripZones.copy'),
	boardTakes: i18n.t('plugins.WorkshopLights.stripZones.the_board_takes_it_when_it'),
	tapAgainReboot: i18n.t('plugins.WorkshopLights.stripZones.tap_again_restarts_the_duet'),
	reboot: i18n.t('plugins.WorkshopLights.stripZones.restart_the_board_m999'),
	onlyIdle: i18n.t('plugins.WorkshopLights.stripZones.only_while_the_machine_isn_t'),
	checkTitle: i18n.t('plugins.WorkshopLights.stripZones.check_on_the_strip'),
	countTitle: i18n.t('plugins.WorkshopLights.stripZones.how_many_leds_does_it_have'),
	countHelp: i18n.t('plugins.WorkshopLights.stripZones.lights_the_first_leds_for_6'),
	lightUp: i18n.t('plugins.WorkshopLights.stripZones.light_up'),
	identifyTitle: i18n.t('plugins.WorkshopLights.stripZones.which_zone_is_which'),
	identifyHelp: i18n.t('plugins.WorkshopLights.stripZones.paints_each_zone_in_its_color'),
	identify: i18n.t('plugins.WorkshopLights.stripZones.identify_zones'),
	stateZone: i18n.t('plugins.WorkshopLights.common.status_zone'),
	main: i18n.t('plugins.WorkshopLights.stripZones.main'),
	addStripHelp: i18n.t('plugins.WorkshopLights.stripZones.add_another_led_strip_another_duet'),
	stripNameLabel: i18n.t('plugins.WorkshopLights.stripZones.strip_name'),
	stripNumber: i18n.t('plugins.WorkshopLights.stripZones.strip_number_e'),
	tapAgainRemove: i18n.t('plugins.WorkshopLights.stripZones.tap_again_to_remove_it'),
	removeStrip: i18n.t('plugins.WorkshopLights.stripZones.remove_this_strip'),
	stripE: i18n.t('plugins.WorkshopLights.stripZones.strip_e'),
	stripNotInConfig: i18n.t('plugins.WorkshopLights.stripZones.is_not_in_config_g_add'),
	orderTitle: i18n.t('plugins.WorkshopLights.stripZones.zones_in_strip_order_from_the'),
	orderHelp: i18n.t('plugins.WorkshopLights.stripZones.move_each_zone_with_the_arrows'),
	connectorHelp: i18n.t('plugins.WorkshopLights.stripZones.duet_np_led_connector_led_0'),
	moveToConnector: i18n.t('plugins.WorkshopLights.stripZones.move_toward_the_connector'),
	moveToEnd: i18n.t('plugins.WorkshopLights.stripZones.move_toward_the_end_of_the'),
	zoneNameHelp: i18n.t('plugins.WorkshopLights.stripZones.zone_name'),
	removeZone: i18n.t('plugins.WorkshopLights.stripZones.remove_this_zone'),
	isStatusZone: i18n.t('plugins.WorkshopLights.stripZones.status_zone_its_color_comes_from'),
	ledCount: i18n.t('plugins.WorkshopLights.stripZones.number_of_leds'),
	noLeds: i18n.t('plugins.WorkshopLights.stripZones.no_leds'),
	addZoneHelp: i18n.t('plugins.WorkshopLights.stripZones.add_a_zone_with_its_color'),
	zone: i18n.t('plugins.WorkshopLights.stripZones.zone'),
	orderFoot: i18n.t('plugins.WorkshopLights.stripZones.if_you_do_not_want_work'),
	stateZoneNoneText: i18n.t('plugins.WorkshopLights.stripZones.no_led_shows_the_state_the'),
	stateZoneOtherText: i18n.t('plugins.WorkshopLights.stripZones.the_state_is_painted_on_that'),
	stateZoneMainText: i18n.t('plugins.WorkshopLights.stripZones.the_state_is_painted_on_the'),
	cantTest: i18n.t('plugins.WorkshopLights.common.the_test_failed'),
	cantChangeG: i18n.t('plugins.WorkshopLights.stripZones.could_not_change_config_g')
};

export default {
	components: { ColorRgbw },
	mixins: [zonesMixin],
	props: {
		// 'basica': size, output and checks of the strip; 'order': zones, order, status zone, extra strips
		part: { type: String, default: 'basic' }
	},
	data() {
		return { t: T };
	},
	computed: {
		// the output of the strip that is open (main or additional): the Duet, or a pin of the Pi
		output() {
			const x = this.stripX || this.form;
			if (!x.output) {
				this.$set(x, 'output', { kind: 'duet', pin: 20, order: 'GRBW', brightness: 60 });
			}
			return x.output;
		},
		outputHint() {
			return this.lights.m950.line ? T.outputHintWith + this.lights.m950.line.split(';')[0].trim() : T.outputHint;
		},
		textZoneState() {
			if (this.form.zone_state === 'none') {
				return T.stateZoneNoneText;
			}
			if (this.zoneStateSel) {
				return T.stateZoneOtherText;
			}
			return T.stateZoneMainText;
		}
	},
	methods: {
		async test(kind) {
			const t = this.stripX ? { strip: Number(this.eTab) } : {};
			if (kind === 'count') {
				await this.lights.invoke(kind, 'test', Object.assign({ count: Math.max(1, Math.round(this.lights.countN || 1)), seconds: 6 }, t), 6000, T.cantTest);
			} else {
				await this.lights.invoke(kind, 'identify', Object.assign({ seconds: 6, segments: this.segmentsIdentify() }, t), 6000, T.cantTest);
			}
		},
		async applyM950() {
			this.lights.applyingM950 = true;
			try {
				const r = await this.lights.lightsApi('apply_m950', Object.assign({ total: Number(this.totalTab) }, this.stripX ? { strip: Number(this.eTab) } : {}));
				if (!r.ok) {
					throw new Error(r.error);
				}
				if (this.stripX) {
					this.$set(this.lights.m950All, String(this.eTab), r.m950);
				} else {
					this.lights.m950 = r.m950;
				}
				this.lights.copyConfig = r.copy;
				this.lights.requestRestart = true;
			} catch (e) {
				this.lights.message(T.cantChangeG + (e.message || e), true);
			} finally {
				this.lights.applyingM950 = false;
			}
		},
		async restartBoard() {
			this.lights.requestRestart = false;
			try {
				await this.lights.sendCode({ code: 'M999', log: true });
			} catch (e) {
				// the connection drops during the reboot: expected
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
.led_strip {
	display: grid;
	gap: 3px;
	padding: 8px;
	background: #111;
	border-radius: 8px;
}
.led {
	aspect-ratio: 1;
	max-height: 26px;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.12);
	min-width: 0;
}
.strip-border {
	max-width: 100%;
	min-width: 0;
}
.strip-border.ampliada {
	overflow-x: auto;
}
.strip-dense {
	gap: 1px;
	padding: 6px;
}
.strip-dense .led {
	aspect-ratio: auto;
	height: 14px;
	border: none;
	border-radius: 2px;
}
.strip-dense .led-sobra {
	opacity: 0.35;
}
.strip-dense .led-missing {
	box-shadow: inset 0 -3px 0 #ef5350;
}
.strip-very-dense {
	gap: 0;
}
.strip-very-dense .led {
	border-radius: 0;
}
.ampliada .led_strip {
	gap: 2px;
	width: max-content;
}
.ampliada .led {
	border-radius: 50%;
	height: 14px;
}
.led-sobra {
	border-style: dashed;
	border-color: rgba(255, 255, 255, 0.3);
}
.led-missing {
	border-color: #ef5350;
}
.strip-legend {
	gap: 4px;
}
.strip-legend span {
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	border-top: 2px solid rgba(128, 128, 128, 0.4);
	padding-top: 2px;
}
.zones-order {
	display: flex;
	align-items: stretch;
	flex-wrap: wrap;
	gap: 8px;
}
.zone-connector {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 6px 10px;
	border-radius: 8px;
	background: rgba(128, 128, 128, 0.12);
	font-size: 12px;
}
.zone-arrow {
	align-self: center;
}
.zone-box {
	flex: 1 1 200px;
	max-width: 280px;
	padding: 8px 10px;
	border-radius: 8px;
	background: rgba(128, 128, 128, 0.06);
	border-left: 4px solid;
}
.zone-name {
	flex: 1;
	min-width: 0;
	font-size: 14px;
	font-weight: 500;
	color: inherit;
	background: transparent;
	border: none;
	border-bottom: 1px dashed rgba(128, 128, 128, 0.5);
	outline: none;
}
.zone-add {
	align-self: center;
}
.zone-title {
	font-size: 14px;
	font-weight: 500;
	margin-bottom: 8px;
}
.strips-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	border-bottom: 1px solid rgba(128, 128, 128, 0.3);
}
.strip-tab {
	padding: 4px 12px;
	border-radius: 6px 6px 0 0;
	font-size: 13px;
	color: inherit;
	opacity: 0.7;
	border-bottom: 2px solid transparent;
}
.strip-tab.active {
	opacity: 1;
	font-weight: 500;
	border-bottom-color: #1976d2;
	background: rgba(25, 118, 210, 0.08);
}
.strip-new {
	opacity: 0.6;
}
.tools {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 8px;
}
.tool {
	padding: 8px 10px;
	border-radius: 8px;
	background: rgba(128, 128, 128, 0.06);
}
.chip-zone {
	display: inline-block;
	padding: 0 6px;
	border-radius: 8px;
	color: #000;
	font-weight: 500;
}
</style>
