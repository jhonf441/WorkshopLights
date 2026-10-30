'use strict'

// WorkshopLights -- page "Lights and states" (formerly "Lights"; 2026-10-12): tira de LEDs (cantidad, zonas de
// iluminacion y de estado, colores). Lee y guarda con the API operations lights.* (backend
// WorkshopService, handlers/luces.py); necesita ese backend instalado.

import './i18n-register.js'
import { registerRoute } from '../../routes'
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
});

// a bookmark or a link to the old Spanish address keeps working
