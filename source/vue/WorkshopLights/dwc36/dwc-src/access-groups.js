'use strict'

// The operations each group of sensitive buttons of the Lights page asks of the service (auth.can), so ONE sentence under the group says why it is
// locked (reason-mixin.js, access-reason.js). Pure: no imports. The names are the ones of dsf/permissions.json; a test compares both and the API contract.
//
//   USE_OPS      the work light, the scenes (summary tab)            light.set, lights.scene (the scene may be denied by its target)
//   STATUS_OPS   the automatic status light (summary tab)            statuslight.set
//   ZONE_OPS     the work light and the extra zones (lighting tab)   light.set, lights.zone
//   SAVE_OPS     the save bar                                        lights.save
//   TEST_OPS     "test this state" and the automatic status switch   lights.test_state, statuslight.set
//   IMPORT_OPS   import a profile                                    lights.import
//   PI_OPS       the pins of the Pi and the test of one pin          lights.pi_pins, lights.pi_test
//   M950_OPS     apply the M950 line (administrator only)            lights.apply_m950
//   LED_ADD_OPS  add a strip to the configuration (technician)       machine.led.preview, machine.config.plan, machine.config.apply
//   SCREEN_OPS   everything the page asks when it opens, in one call

export const USE_OPS = Object.freeze(['light.set', 'lights.scene'])
export const STATUS_OPS = Object.freeze(['statuslight.set'])
export const ZONE_OPS = Object.freeze(['light.set', 'lights.zone'])
export const SAVE_OPS = Object.freeze(['lights.save'])
export const TEST_OPS = Object.freeze(['lights.test_state', 'statuslight.set'])
export const IMPORT_OPS = Object.freeze(['lights.import'])
export const PI_OPS = Object.freeze(['lights.pi_pins', 'lights.pi_test'])
export const M950_OPS = Object.freeze(['lights.apply_m950'])
export const LED_ADD_OPS = Object.freeze(['machine.led.preview', 'machine.config.plan', 'machine.config.apply'])

// the groups that carry a sentence, by name: the structure test walks this list
export const GROUPS = Object.freeze({ use: USE_OPS, status: STATUS_OPS, zone: ZONE_OPS, save: SAVE_OPS, test: TEST_OPS, import: IMPORT_OPS, pi: PI_OPS, m950: M950_OPS, ledAdd: LED_ADD_OPS })

export const SCREEN_OPS = Object.freeze(Array.from(new Set([].concat(USE_OPS, STATUS_OPS, ZONE_OPS, SAVE_OPS, TEST_OPS, IMPORT_OPS, PI_OPS, M950_OPS, LED_ADD_OPS))))

// the target of one scene (workshop:<plugin>:<type>/<id>): a rule may deny one scene and allow the others
export function sceneTarget(scene) {
	return scene && scene.id ? 'workshop:lights:scene/' + scene.id : ''
}

// every operation of the group is allowed by `can` (a function op -> boolean)
export function groupAllowed(ops, can) {
	return ops.every(op => can(op))
}
