# UI-03 · 风格探索板 01 最终提示词

2026-09-09；内置 image_gen；新图，无输入图片。用途为候选风格探索，不是生产图集或正式页面。实际模型若工具未返回则记为未知，不据工具名称推断。

```text
Use case: ui-mockup
Asset type: one cohesive mobile casual game UI art-direction board, landscape 3:2, high resolution.
Primary request: Create a polished visual style exploration board for the Chinese vertical cat Zuma mini-game 喵喵回窝. Cozy, calm, delightful, readable at small scale, lightly dimensional matte soft-toy shapes. This is a component and character style board, NOT a finished game screen and NOT an export sprite atlas.

Composition: a spacious editorial grid on a plain warm cream background. Restrained small section labels, clear alignment, generous empty gutters. One consistent art direction throughout. Top area: five equal-sized large cat character samples in a single row. Middle area: two reusable button styles and their visual states, a very slim HUD strip, a compact circular pause control, three level-node states. Bottom area: a wide simple reusable popup panel with a small celebratory star accent, a second quiet supportive popup variant, and a small row of essential semantic icons. Include six neat color chips. The cats occupy about one third of the board and are the main attraction. Keep all samples isolated with space around them; nothing overlaps. Do not draw a phone, full home screen, level map or gameplay track.

Five cat identities, exactly these five, from left to right:
1. Orange tabby: warm orange coat, three broad darker forehead stripes, cream muzzle, tiny dark eyes.
2. Ragdoll: ivory coat, cocoa ears and face mask with a broad inverted white V, clear blue eyes, fluffy but simple cheek silhouette.
3. British shorthair blue: solid blue-gray coat, broad round cheeks, amber eyes, no tabby stripes, no white face blaze.
4. Calico: ivory base, one broad orange patch and one broad charcoal patch on opposite sides of the face, asymmetric ears, dark eyes. Three large color masses, not speckles.
5. Black cat: deep charcoal-plum coat, distinct triangular ears, luminous pale yellow-green eyes, clear muzzle and facial features, no tiny black-on-black details.
All five: compact rounded cat forms, tiny tucked paws, big head, no long tails sticking out, clean thick silhouette, almost front-facing with only slight soft volume, ears entirely within their own sample bounds. No costumes, bows, collars, bells, crowns or extra breeds. Rounded cat bodies rather than generic colored balls. Colors AND broad face patterns AND silhouette differentiate them. No realistic fur strands, no fur noise, no sharp claws. They must remain distinguishable when reduced to a 56-pixel game piece.

UI direction: warm cream background, milk-white surfaces, apricot-orange primary button, quiet cream secondary button, cocoa text/symbols, restrained mint progress accent, pale pink only as a small decorative accent. Suggested palette: #FFF5E6 background, #FFFBF4 panel, #FFC078 primary, #4A332B ink, #A9D8C0 mint, #F4C6CC pink. Palette is visual guidance, not a request to print hex values.
Materials and light: matte soft clay with a very subtle fabric-like softness, smooth broad highlights from upper left, short soft shadow down-right, shallow rim. Clean 2.5D game art. No glossy plastic, jelly translucency, wooden planks, thick gold rims, hanging signs, saturated grass, floral scenery or excessive gradients.
Buttons: wide rounded rectangles with a calm large empty center for runtime text, no cat ears attached to every button. Show primary normal and gently pressed versions side by side, a muted but legible disabled version, plus one cream secondary. Pressed version compresses vertically slightly and shortens its shadow. No words baked into the button images.
HUD: very slim cream trough with mint fill, simple fish-currency icon and separate blank number space, small pause control using two clear cocoa bars. Keep it visually lighter than the cats.
Level nodes: one quiet cream node, one orange current node, one muted locked node with a clear lock symbol, no numerals baked in.
Panels: simple rounded milk-white rectangular surfaces with shallow cream edge, sparse star accent outside the stretchable center. Large uncluttered body and action space, no dense rewards, no tiny copy, no giant trophy. The quieter panel should feel reassuring, never sad or punitive.
Icons: small cohesive pause, back chevron, close X, fish, star, video-play badge, cat wand, two-leaf catnip sprig, and a rainbow-cat utility icon. The rainbow utility is separate from the row of five base cats. No bombs or substitute yarn-ball powerups. Icons share the same restrained outline weight and lighting.

Text: only the small top heading "喵喵回窝" and simple section labels "CATS", "BUTTONS", "HUD", "PANELS", "ICONS". These are board annotations, not product button text. Dark cocoa clean sans-serif, spelled exactly, no other captions or pseudo text.
Constraints: coherent production-minded shape language; five recognizable breeds; generous clear space; no gameplay geometry; no UI layout reinterpretation; no watermark or extra logo; no dense ornament; no photorealism; no emoji; no fake text; no baked-in gameplay numbers. Produce one attractive complete art-direction board that can guide later independent asset generation and Cocos implementation.
```
