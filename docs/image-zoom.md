# Image zoom verification

The existing ImageViewer is reused on homepage product cards, collection cards (including saved pieces), product details, coin cards and coin details. The static homepage editorial image now also opens the same viewer. Category links, bag links and image-upload controls retain their existing navigation/selection actions.

Desktop hover remains centred at 1.08 with clipped overflow, smooth easing and a subtle shadow. Image dimensions, aspect ratios, layouts, typography and brand colours remain unchanged. Full-screen images use object-fit: contain, with 100–500% controls, wheel zoom around the pointer, mobile pinch/drag handling, keyboard gallery navigation, Escape, focus return and background scroll locking. Reduced-motion preferences are respected. No dependencies were added.

This update normalizes wheel events reported in pixels, lines or pages; calculates image bounds independently of the opening animation; constrains the view again after an image loads; and makes an empty/invalid gallery render nothing rather than locking the page. Image aliases and whitespace are normalized safely. Touch surfaces prevent vertical scroll chaining while keeping horizontal thumbnail scrolling available.

Validation: the automated suite passed 67 checks, including equivalent wheel distances, wheel limits, pinch translation, aspect-ratio-aware panning and malformed galleries. The production build passed. Local browser checks exercised editorial click and keyboard activation, coin click, image controls, Escape and scroll unlock. Live responsive/browser results are recorded after deployment below.

Native Chrome interaction was interrupted while the browser was in use. Physical mouse-wheel/drag and device pinch were therefore not verified in that browser. Automated gesture calculations are tested separately from browser click/keyboard verification; this report does not claim physical-device gesture testing.
