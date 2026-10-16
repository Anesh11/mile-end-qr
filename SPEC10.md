# SPEC10 (after SPEC9; edit index.html only) — two snaps per stop
For each stop n=1..5 there are now TWO consecutive snap sections:
 (a) #arret-n "info card" (100svh, cream/dark premium card, no auto-hide): stop number badge (big), name, address, (Drogheria price line), media on top ~45% of the card: stops 1-3 = the 3D food scene (larger, ~min(60vw,300px), drag to rotate, ✨ button; poster photo behind as soft backdrop) with the stop photo credit; stops 4-5 = today's photo with credit. Then 3-4 lines of readable text (font-size 17px, line-height 1.5; full Texte, no clamp; if longer, allow it to wrap fully), and the "Voir sur la carte" button. Video credit line on 1-3 ("Vidéo : …").
 (b) #media-n: full-screen video (stops 1-3, per SPEC9 behaviour incl. swipe layer and one-iframe-at-a-time) or the full-screen timeline (stops 4-5, from TIMELINES data). Only a small name pill (e.g. "1 · Drogheria Fine") bottom-left; no other text over the media.
Remove the 3 s auto-collapse/fade logic, the collapsed pill/expand logic and the "Lire plus" bottom sheet (the info card replaces them). Keep the music toggle, ✨ confetti, tilt chip inside the info card.
Progress bar: shows "Arrêt n/5" and the n-th segment for both (a) and (b) of stop n (segment fills half on (a), full on (b)).
Keep the 3D depth transitions between ALL snaps (hero, 10 stop snaps, découvrir, route).
Map tap events (map:stop) no longer needed. Hero CTA scrolls to #arret-1.
Self-check JS with node. Then stop.
