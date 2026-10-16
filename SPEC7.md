# SPEC7 — batch of changes (edit index.html, map3d.js; keep everything else; credits footer content must remain word-for-word, only ADD new credit lines)
Image metadata for all new images is in img/credits.json (author, license, page).

1. HERO: replace hero photo with img/hero-mural.jpg (1080x1920, 9:16). Slow Ken Burns zoom (scale 1 -> 1.12 over 20s, alternate, transform only; none under reduced motion). Credit "Photo : Bohemian Baltimore, CC BY-SA 4.0" linked to its page; add to footer credits list.

2. VIDEOS (food close-ups only). Replace ids/segments:
   - Drogheria (stop 1): id ORc096uEZWw, start=10, end=20 (gnocchi + grated cheese close-ups)
   - Fairmount (stop 2): id CBfgVuP6udQ, start=23, end=37 (wood oven, bagels on the peel, crate of bagels)
   - Olimpico (stop 3): id FstBuQ5v8X4, start=58, end=70 (espresso glasses/machine)
   Use the existing segment-loop logic (reload every end-start seconds while visible) with the new values; replace any hard-coded id→start mapping with data attributes data-video, data-start, data-end on each section.

3. THEN/NOW → TIMELINE for stops 4-5: crossfade in order through photos with a big year label and a small dot bar (one dot per photo, active highlighted). Each step ~1.8 s with slow Ken Burns zoom (scale 1->1.08) and grayscale for archive photos; plays when the card comes into view; "Rejouer ↻" button; dots tappable to jump. Remove the old range slider. Credits under the media list all photos of that stop.
   - Église: img/eglise-1916.jpg "1916" (construction), img/eglise-1922.jpg "1922" (intérieur), img/eglise-2007.jpg "2007", img/eglise.jpg "2013", img/eglise-2025.jpg "Aujourd'hui"
   - Rialto: img/rialto-1936.jpg "1936", img/rialto-2011.jpg "2011" (détail de la façade), img/rialto.jpg "2011 · façade" — then img/rialto-2017.jpg "Aujourd'hui". (Use labels: 1936, 2011, 2011, 2017 → show "Aujourd'hui" for the last.)
   Reduced motion: no zoom, instant fades, no autoplay (show the last photo + dots).

4. "Il y a encore plus à découvrir dans le Mile End !": keep the 4 existing mini cards and ADD 4 in the same style, each with a one-line French description (add a one-line description to all 8 for consistency):
   - Wilensky's Light Lunch — 34 Av. Fairmount O. — img/wilensky.jpg — "Le comptoir à sandwichs mythique depuis 1932, célèbre pour son « Wilensky Special »." — maps: https://www.google.com/maps/search/?api=1&query=Wilensky%27s+Light+Lunch+34+Av+Fairmount+O+Montreal
   - Dépanneur Le Pick Up — 7032 Rue Waverly (Mile-Ex) — img/pickup.jpg (photo d'illustration du Mile End) — "Un dépanneur rétro avec comptoir à sandwichs et terrasse, adoré du quartier." — maps: https://www.google.com/maps/search/?api=1&query=Depanneur+Le+Pick+Up+7032+Rue+Waverly+Montreal
   - Casa del Popolo — 4873 Boul. Saint-Laurent — img/casa.jpg — "Bar, resto végé et salle de concerts indépendants depuis 2000." — maps: https://www.google.com/maps/search/?api=1&query=Casa+del+Popolo+4873+Boul+Saint-Laurent+Montreal
   - Champ des Possibles — Rue Saint-Viateur E. / Rue De Gaspé — img/champ.jpg — "Un espace vert sauvage, cogéré par les citoyens, au bord de la voie ferrée." — maps: https://www.google.com/maps/search/?api=1&query=Champ+des+Possibles+Montreal
   Existing: St-Viateur Bagel "L'autre grande boulangerie de bagels, ouverte depuis 1957."; Café Alfred "Un café chaleureux du quartier."; Mimi & Coco "Une boutique de vêtements et cadeaux du Mile End."; Les murales du Mile End "Des fresques géantes à découvrir au détour des ruelles."
   Grid scrolls inside the snap if needed. Add all new credits (incl. timeline photos, hero) to the footer list (append; don't change existing lines).

5. MUSIC: <audio id="bgm" src="audio/lofi-mile-end.mp3" loop preload="none">. Volume 0.15. Start on first user gesture (the "Commencer le circuit" click, or the first pointerdown anywhere). Small floating round mute/unmute toggle (🔊/🔈, aria-pressed, bottom-left, above safe area), state remembered in localStorage. Duck: if a YouTube iframe is unmuted by the user we can't detect reliably, so: when the user taps a video area (pointerdown on the video slot) fade music to 0.03 for 20 s then back to 0.15; also pause music when the page is hidden (visibilitychange). Footer credit: "Musique : « Lofi music 001 » par Luisalvaz, CC0 (Wikimedia Commons)" linked to https://commons.wikimedia.org/wiki/File:Lofi_music_001.wav

6. ROUTE SECTION: full-screen 3D map only (no text). Add a small floating toggle chip "▶ Clip" (top-right) that switches to the route video (img/route-walk.mp4; hidden entirely if the file 404s); default = 3D map.
   In map3d.js interactive mode (NOT in map-render.html static renders — keep those free of figures): four small stylised low-poly female student figures (body capsule, head sphere, hair cap, different shirt colours, small backpack box), merged geometry per figure, walking along the exact route curve from Métro Laurier, spaced slightly apart, with a bobbing walk cycle (y bob + slight leg swing), pausing ~1.5 s at each pin 1-5 in order while that pin's label scales/pulses and glows; loops back to start. Raycast tap on a pin (or its label) → dispatch a CustomEvent('map:stop',{detail:{n}}) that index.html listens to and smooth-scrolls the main scroller to section #arret-n. Render only when visible (existing pause logic), dpr<=2.
Self-check JS with node --check (extract scripts). Then stop.
