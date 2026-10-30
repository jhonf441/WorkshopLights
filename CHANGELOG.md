# WorkshopLights -- historial de versiones

## 2.8.6 -- 2026-10-30

- The side bar scrolls inside when it is taller than the window

## 2.8.5 -- 2026-10-30

- Manifest: sbcRequired true (needs WorkshopService); side bar keeps the group names

## 2.8.4 -- 2026-10-29

- Phone layout fixes (44 px touch targets, no overflow), Workbench full-screen section picker, clamps hint, interrupted jobs off the table, Machine scale label

## 2.8.3 -- 2026-10-29

- Audit and UX fixes: Jog owns workzeroaxis.g, restart notice with time, shared pulse table with update and download, side bar tooltips, spacing, wider field

## 2.8.2 -- 2026-10-29

- State chips with an icon: the icon carries the color and there is no dot (family.css); chosen chip tinted

## 2.8.1 -- 2026-10-29

- PID chart read from the service (any screen), Activity shows its active filters, health state without the duplicate icon

## 2.8.0 -- 2026-10-29

- Side bars: no gray line, a chosen item goes to the start of its section; Printing: start-up chip without the mode rows, tests notice only when the chip is not green, no-sensor fault reading; Vision: settings cards packed in columns, laser crosses only with Laser mode; Zones: visible mode dot

## 2.7.34 -- 2026-10-28

- Design family: final shared styles

## 2.7.33 -- 2026-10-28

- Design family: page bar with lead, own design css removed, section color as --wf-sec

## 2.7.32 -- 2026-10-28

- Header badge icon always white; Lights: how-it-works note inside the Summary, save bar only with changes

## 2.7.31 -- 2026-10-28

- Minimalist design: neutral top bar with a solid badge, text menu with a section line, neutral section cards, outline buttons and chips, collapsible long notes

## 2.7.30 -- 2026-10-28

- Taking turns preview rotates the active states again

## 2.7.29 -- 2026-10-28

- Menu caption back to Lights and status

## 2.7.28 -- 2026-10-27

- Plan warnings in words, risk dialogs in DWC style, mesh point selection, link to Machine modes

## 2.7.27 -- 2026-10-27

- Side bar no longer makes the page jump when a shorter section is chosen; start-up chip as in every page (header, same wording)

## 2.7.26 -- 2026-10-26

- Run-time guard: the 3.6 build refuses to start on a host with window.DWC and the 3.7 build outside DWC 3.7.x (visible warning); shipped as a strict per-line zip (dwcVersion 3.6 / 3.7)

## 2.7.25 -- 2026-10-26

- No save and no 'All fine' chip when the configuration could not be read; shorter menu caption

## 2.7.24 -- 2026-10-24

- Start-up assistant: active lines highlighted, single-step way back, dark select options; Lights time picker and defaults; Printing FFF switch; Mesh handles above the points

## 2.7.23 -- 2026-10-24

- Start-up assistant: active lines highlighted, single-step way back, dark select options; Lights time picker and defaults; Vision relay message; Printing FFF switch; Mesh handles above the points

## 2.7.22 -- 2026-10-24

- Start-up card reports its pending count to the service (machine setup list)

## 2.7.21 -- 2026-10-23

- Follow a sign-in or logout made in another tab

## 2.7.20 -- 2026-10-23

- One sign-in for every tab (token in localStorage)

## 2.7.19 -- 2026-10-23

- Header: no health chip while signed out

## 2.7.18 -- 2026-10-23

- Compact live job strip in the bar; page header treats an expired session as sign in; numeric PIN field

## 2.7.17 -- 2026-10-23

- Page header asks who is signed in so a missing session is shown as such

## 2.7.16 -- 2026-10-23

- Common page header: health chip, session chip, quiet start-up icon when ready

## 2.7.15 -- 2026-10-23

- Side bar sections no longer overflow the page on narrow screens (under 900 px)

## 2.7.14 -- 2026-10-22

- Machine states redesigned as cards: no horizontal overflow, color and effect shown on each state, labeled outputs

## 2.7.13 -- 2026-10-22

- Side-bar pin only while the bar is open; Lights panel counts only the faults the service marks

## 2.7.12 -- 2026-10-22

- Pin on every side bar, thin scrollbars, one sign-in dialog

## 2.7.11 -- 2026-10-22

- Sign-in never opens by itself; keyboard only on touch

## 2.7.10 -- 2026-10-22

- Fix names, values and catalog markers the English rename left behind

## 2.7.9 -- 2026-10-22

- Reading the config without a session says so

## 2.7.8 -- 2026-10-22

- Sessions made clear: not-signed-in chip, sign-in on visitor 403, refusal toast

## 2.7.7 -- 2026-10-22

- Sign-in dialog focus and kiosk keyboard helper; Jog blocked touches explained

## 2.7.6 -- 2026-10-22

- Kiosk keyboard helper call, sign-in dialog font

## 2.7.5 -- 2026-10-22

- Jog and bars tell why an action is blocked and ask for the session; Jog loses the Machine pointer sections

## 2.7.4 -- 2026-10-22

- Sign-in dialog redesign and on-screen keyboard; single floating panel for power actions; risk bar on one line; Jog gear and scrollbar; side tabs transition

## 2.7.3 -- 2026-10-21

- PIN sign enters by itself when the PIN has the length that worked last time

## 2.7.2 -- 2026-10-21

- Side bar: pin next to the fold arrow keeps the bar open

## 2.7.1 -- 2026-10-21

- Page routes in English with redirects from the old ones, localStorage keys migrated to English

## 2.7.0 -- 2026-10-21

- Summary for operators, advanced tabs for technicians, M950 for admins, controls gated by role

## 2.6.1 -- 2026-10-21

- Page reloads when the DWC language changes; Vision pins dsf-python below 3.7; meter wizard copy over http

## 2.6.0 -- 2026-10-21

- English migration: texts through the catalog, no in-browser translator, interfaces per part

## 2.5.3 -- 2026-10-21

- Jog without limits row shows the color the Jog uses (the strip and the screens)

## 2.5.2 -- 2026-10-21

- Night times: picker style

## 2.5.1 -- 2026-10-20

- English names: remaining values, ids, theme panels and the Vision backend keys (fixes a mismatch with the page)

## 2.5.0 -- 2026-10-20

- All the code, data keys and enum values are in English; stored data is converted by the one-off migration script

## 2.4.1 -- 2026-10-18

- Start-up entry is a chip in the page header

## 2.4.0 -- 2026-10-16

- Start-up card is now a dialog opened from a strip on the page (one card per function, progress, step-by-step assistant), with a plain explanation for every row

## 2.3.18 -- 2026-10-15

- Start-up assistant (shared piece), Lights: the strip pin is chosen in Advanced (plain LED removed)

## 2.3.17 -- 2026-10-15

- Start-up card (shared piece): Printing assistant renamed so it no longer collides with the card

## 2.3.16 -- 2026-10-15

- Rebuilt with the shared start-up card piece

## 2.3.15 -- 2026-10-15

- Lights: the Pi pin card is a plain LED, the summary names the Pi strip

## 2.3.14 -- 2026-10-15

- Spanish texts with accents and enie

## 2.3.13 -- 2026-10-15

- Per-strip output (Duet or a pin of the Pi) in the strip tab; simple LED card

## 2.3.12 -- 2026-10-14

- Hide every mention of another plugin when it is absent

## 2.3.11 -- 2026-10-14

- Effects by painter: complete when the Pi paints the strip, the double flash and the pulse greyed for the Duet strip; optional output on a pin of the Pi

## 2.3.10 -- 2026-10-14

- State badge dot is a pie: split in zones or turns, each slice with its effect

## 2.3.9 -- 2026-10-14

- State badge dot is a pie: split in zones or turns, each slice with its effect

## 2.3.8 -- 2026-10-14

- Cleanup: no more lookups of the old service Id (PiCustomCodes) or mentions of the removed custom G-codes
- The state badge lists the machine mode color as its last chip when the mode is part of the zone (it was painted on the strip and the arrow but missing here)
- The dot of the badge is a pie like the strip: one slice per state when the states are split in zones (the mode color last), one state at a time when they take turns, each with the effect defined for its state

## 2.3.7 -- 2026-10-14

- Header is a card like the other pages (no longer a raised sticky sheet)

## 2.3.6 -- 2026-10-14

- Side bar icons are 18 px like the bar of Vision

## 2.3.5 -- 2026-10-13

- The side bar is like the ones of Vision and the Work table: 190 px, 52 px folded with the double arrow in the middle, it folds by itself after choosing and opens only with the arrow (nothing floats over the page when the pointer passes by)

## 2.3.4 -- 2026-10-13

- The side bar has the double arrow (fold / open) like the bar of Vision, besides folding by itself after choosing

## 2.3.3 -- 2026-10-13

- The side bar has no pin: it is open at first, folds to the icons by itself when something is chosen and opens again over the page with the pointer or the focus

## 2.3.2 -- 2026-10-13

- The side bar uses the same measures and colors as the bar of Vision (190 px, sticky under the DWC bar)

## 2.3.1 -- 2026-10-13

- The side bar can be pinned or collapse by itself; the switch for the automatic status lights (and the lighting using the status LEDs when it is off) is in States, not in Lighting

## 2.3.0 -- 2026-10-13

- Tabs as a side bar (like Work table and Vision)

## 2.2.1 -- 2026-10-13

- State names in English when DWC is in English (needs WorkshopService 2.5.0)

## 2.2.0 -- 2026-10-13

- Board LEDs preview without the purple dots, CAN LED option, status lights switch in the summary

## 2.1.2 -- 2026-10-13

- Files and macros written by the plugin are in English; bilingual risk texts

## 2.1.1 -- 2026-10-13

- Official localization completed: no Spanish text left in the sources, texts with parameters are single keys

## 2.1.0 -- 2026-10-13

- New: Light effects during a job (no effects by default while a file or live job runs: fixed colours on the strip and the board LEDs, at most 2 repaints per second)

## 2.0.0 -- 2026-10-13

- Needs WorkshopService 2.0: calls its central API (POST /machine/WorkshopService/api) instead of the custom codes M9003 / M9010, which are gone
- Applying the LED count to config.g asks for the confirmation of the service

## 1.23.0 -- 2026-10-13

- Board signals panel as a list; capacity notice and policy when states do not fit; board LEDs with the lighting

## 1.22.0 -- 2026-10-13

- Official DWC localization: es.json / en.json via registerPluginLocalization

## 1.21.0 -- 2026-10-12

- Lights and status redesign: three outputs, states table with per-output switches, scenes, schedules, history, on-screen indicator

## 1.20.0 -- 2026-10-12

- Luces y estados: nuevo nombre en pantalla; sin nombre de programa; dwcVersion 3.6; sin sbcRequired

## 1.19.2 -- 2026-10-11

- LEDs de la placa al final, una sola tira con la tira virtual, tira de estado de la placa

## 1.19.1 -- 2026-10-11

- La tira queda fija arriba al desplazarse; declara la dependencia de WorkshopService

## 1.19.0 -- 2026-10-11

- Tira virtual: los estados y animaciones se ven en las pantallas sin LEDs conectados

## 1.18.0 -- 2026-10-11

- Carpetas en ingles bajo 0:/sys/workshop (datos, disenos, malla, cortar por partes); arreglos de la Mesa de trabajo

## 1.17.1 -- 2026-10-11

- Las paginas vuelven a cargar (punto y coma en safe-saving.js)

## 1.17.0 -- 2026-10-11

- Id nuevo en ingles (Workshop...) y guardado seguro ante cortes de luz

## 1.16.0 -- 2026-10-11

- Id nuevo en ingles (Workshop...) y guardado seguro ante cortes de luz

# TallerLuces -- historial de versiones

## 1.15.7 -- 2026-10-11

- Compatibilidad con los Id nuevos en ingles (etapa 1, sin cambiar el Id); Motores: tabla de referencias del techo de pulsos

## 1.15.6 -- 2026-10-10

- Estilo comun segun DESIGN.md (alto de botones, colores de la paleta, encabezados)

## 1.15.5 -- 2026-10-10

- Los comandos de la pagina van por HTTP desde el primero (antes salian por G-code mientras cargaban los plugins) y reintentan ~15 s si el servicio se esta reiniciando

## 1.15.4 -- 2026-10-10

- Estandar de advertencias y nombre visible del servicio (Servicio de la Pi)

## 1.15.3 -- 2026-10-10

- Comandos M9003 en ingles con alias en español; traducciones al ingles completas

## 1.15.2 -- 2026-10-10

- Comunicacion: el aviso de falta el servicio de la Pi explica en el lugar como se comunica la Pi con la Duet (antes enlazaba a GitHub)

## 1.15.1 -- 2026-10-10

- Aviso con enlace a la explicacion cuando falta el servicio de la Pi (sin modo SBC, sin PiCustomCodes o detenido)

## 1.15.0 -- 2026-10-10

- Interruptor para ver el jog sin limites en la tira aunque las luces de estado esten apagadas

## 1.14.4 -- 2026-10-10

- Los trabajos en vivo (por red o USB) se nombran 'trabajo en vivo' en vez de un nombre de programa

## 1.14.3 -- 2026-10-10

- La barra Guardar/Descartar se lee con el tema claro; valores de fabrica 10 LEDs de iluminacion + 10 de estado (para tiras de otras maquinas)

## 1.14.2 -- 2026-10-10

- Linea de diseno comun: colores por significado, encabezado con el icono del menu, textos legibles con el tema claro de DWC

## 1.14.1 -- 2026-10-10

- El aviso de colores parecidos no compara 'Fuente apagada' con 'Laser' (nunca estan activos a la vez)

## 1.14.0 -- 2026-10-10

- Selector Zona de estado: elige que zona muestra el estado; esa es la que copian todas las pantallas. Tema claro de DWC: textos legibles. El aviso de colores parecidos vuelve a incluir 'Fuente apagada' (ahora se combina con otros estados)

## 1.13.2 -- 2026-10-10

- Estado 'Fuente apagada' (toda la zona en ambar mientras la fuente esta apagada)

## 1.13.1 -- 2026-10-10

- Los estados del jog ocupan toda la zona; el jog sin limites usa el color elegido en el jog

## 1.13.0 -- 2026-10-10

- Paleta sin colores repetidos en fabrica y en los temas; aviso de colores que se confunden en la tira; estados nuevos: choque o eje fuera de limites (parpadeo rapido) y jog sin limites (parpadeo lento)

## 1.12.2 -- 2026-10-10

- Guardar con varias tiras y zonas ya no falla (Unexpected token 'E'): la configuracion larga va por archivo

## 1.12.1 -- 2026-10-10

- Tira del encabezado completa solo con la iluminacion al mando; 'Opciones avanzadas' ahora dice Salida de la Duet donde esta conectada (E0)

## 1.12.0 -- 2026-10-10

- Tira completa en vivo (la iluminacion apagada se ve apagada); con muchos LEDs se achican sin desbordar, con opcion Ampliar

## 1.11.0 -- 2026-10-10

- Cada zona con su color de identificacion (borde de su caja, leyenda, muestras e Identificar zonas); Identificar usa lo que esta en pantalla aunque no este guardado

## 1.10.0 -- 2026-10-10

- Varias tiras: pestanas por tira (+ Tira), cada una con nombre, numero E y sus zonas (color, interruptor, orden con < >), con vista, Contar/Identificar y chequeo de config.g propios; los interruptores de todas las zonas en Ahora

## 1.9.1 -- 2026-10-10

- Textos: la tira la pinta solo el servicio de la Pi (sin aviso de zonas en el medio)

## 1.9.0 -- 2026-10-10

- Zonas en cualquier orden: cada zona (iluminacion, estado y extra) se mueve con < > hasta donde este en la tira; no deja guardar con una cantidad vacia (antes rompia la config y congelaba la tira)

## 1.8.0 -- 2026-10-09

- Zonas extra al final de la tira: + Zona con nombre, cantidad de LEDs y color; cada una con su interruptor en Ahora (se aplica al instante); Identificar zonas las pinta en violeta

## 1.7.0 -- 2026-10-09

- Sin tira de LEDs: solo queda el interruptor (se ocultan las tarjetas); numero de tira (E) en Opciones avanzadas con explicacion; Comprobar en la tira: Cuantos LEDs tiene (-/+ y Encender) y Que zona es cual

## 1.6.0 -- 2026-10-09

- Tira y zonas: zonas en el orden real de la tira desde el conector de la Duet, con su cantidad y rango, y boton para invertir el orden (antes los campos no seguian el orden elegido)

## 1.5.3 -- 2026-10-09

- Estados de la maquina y Efectos en gris cuando las luces de estado automaticas estan apagadas (aviso + boton Activar)

## 1.5.2 -- 2026-10-09

- LEDs de estado: se ven tambien con el automatico apagado (color de la iluminacion o apagados); barra contraida vuelve al circulo; ejemplos y tira tambien en modo manual

## 1.5.1 -- 2026-10-09

- Estado nuevo 'Aviso RS485' (azul, equipo RS485 sin eje con alarma); 'Falla RS485' queda para equipos con eje

## 1.5.0 -- 2026-10-09

- Cuando hay varios a la vez: cada opcion muestra el estado REAL calculado por la Pi con ese efecto (statusLightModos), en una sola linea con el total de LEDs de estado; tocarla aplica y guarda el modo. Tira y zonas copia la tira real. Misma tira (LedStrip.vue) que Servicios y la barra lateral

## 1.4.4 -- 2026-10-09

- Ejemplos de combinar: mismos estados, brillos (reposo/dividir), tiempo de turno y parpadeo que la tira

## 1.4.3 -- 2026-10-09

- Ejemplos de combinar (turnos/dividir) = copia exacta del calculo de la Pi; reintento de M9003 durante reinicios

## 1.4.2 -- 2026-10-09

- Mini tira: LEDs con poco brillo se ven encendidos

## 1.4.1 -- 2026-10-09

- Mini tira en vivo en el encabezado; 'Ver el ejemplo' simula con el calculo real de la Pi (orden de la tira, turnos, dividir)

## 1.4.0 -- 2026-10-09

- Orden de la tira configurable (primero iluminacion o primero estado); al dividir, los estados llenan toda la zona y los mas importantes reciben mas LEDs

## 1.3.1 -- 2026-10-09

- Estados de la maquina (color por estado, combinar: el mas importante / por turnos / dividir) y vista previa sin guardar: animacion, aviso de fin de trabajo y ejemplo de estados en la tira

## 1.3.0 -- 2026-10-09

- Estados de la maquina: color por estado (falla RS485, laser, aire, trabajo en vivo, sin homing...) y como se ven cuando hay varios: el mas importante, por turnos o dividiendo la zona

## 1.2.0 -- 2026-10-09

- Animacion de arranque: barra, desde el centro, parpadeo, arcoiris; efectos (parpadeo al terminar un trabajo y en pausa); estilos de color listos

## 1.1.0 -- 2026-10-09

- Animacion al encender configurable (si/no, color, velocidad) y boton Ver ahora

## 1.0.1 -- 2026-10-09

- Colores: nombre y valores en dos lineas (no se aprietan)

## 1.0.0 -- 2026-10-09

- Pagina Luces: zonas de la tira (iluminacion / estado), colores de la luz, de cada modo y de cada estado, contar LEDs, identificar zonas, cambiar U en config.g
