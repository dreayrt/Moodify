# Local mascot adapter

Based on page-mascot 0.1.0 by Kamran Ahmed, MIT. Original license: LICENSE.

Sprite positions, direction hysteresis and reaction timings are preserved. Changes group pointer events by animation frame, cache bounds until scroll/resize, and stop following when hidden or reduced motion is requested. Keep mascot.d.ts aligned with the upstream-compatible props. Production imports this adapter; node_modules is untouched.

Regression: scripts/test-performance-phase2.mjs compares layout read counts against the installed upstream package and checks reactions and reduced motion.
