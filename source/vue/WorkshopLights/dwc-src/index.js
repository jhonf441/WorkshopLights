'use strict'

// WorkshopLights -- page "Lights and states" (formerly "Lights"; 2026-10-12): LED strip (count, lighting and status
// zones, colours). Reads and saves with the API operations lights.* (backend WorkshopService, handlers/luces.py);
// it needs that backend installed.

import './i18n-register.js'
import { registerRoute } from 'DuetWebControl'
import { onPluginUnload, removePluginRoute } from './dwc-host.js'
import './language-reload.js' // the page loads again when the DWC language changes (vue/_shared)
import './safe-saving.js' // power cut: save with a backup and in one step (vue/_shared)

import lights from './Lights.vue'
import './theme.css'
import './lights-effects.css'

registerRoute(lights, {
	Plugins: {
		WorkshopLights: {
			icon: 'mdi-led-strip-variant',
			caption: 'plugins.WorkshopLights.common.menu_caption',
			path: '/Plugins/Lights'
		}
	}
})

// DWC 3.7 does not undo anything when the plugin is stopped: take the page out and stop what runs by itself, so that a
// later start registers the new component and a single recorder (review #4)
onPluginUnload('WorkshopLights', () => {
	removePluginRoute('/Plugins/Lights')
})
