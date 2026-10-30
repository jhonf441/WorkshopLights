'use strict'

// The color of each section of the page (the family reads it as --wf-sec on the page root).

export const SECTION_COLORS = {
	summary: '#F59E0B',
	outputs: '#00ACC1',
	lighting: '#FFA000',
	states: '#43A047',
	colors: '#AB47BC',
	effects: '#E53935',
	advanced: '#5C6BC0'
}

export function sectionColor(id) {
	return SECTION_COLORS[id] || '#F59E0B'
}
