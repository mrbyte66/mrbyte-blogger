# Interactive character rotation

Status: future experimental feature. Preserve the current approved character scene until a dedicated implementation and asset are ready.

## Intended interaction

- Let a visitor drag with a mouse or pointer to turn the character around a full 360 degrees.
- Map the drag to rotation smoothly, with bounded pointer sensitivity and a clear resting/front-facing view.
- When pointer movement stops, ease the character back to its initial view after a short inactivity pause. Support touch and keyboard input as deliberate alternatives; do not make the mouse the only way to access character navigation.
- After a full turn or a longer spin, let the CRT eyes play a brief dizzy animation, tracing a small loose circle or crossing playfully, then return to the normal gaze and blink behavior.
- Include an obvious reset affordance, respect reduced-motion preferences, suspend work when the scene is off-screen or inactive, and avoid intercepting normal page scrolling.

## Asset and motion requirements

The current artwork is a single raster composition. Do not describe CSS rotation of that flat image as realistic three-dimensional rotation. The eventual implementation needs a suitable multi-view, layered rig, or rendered 3D asset plus a defined camera/origin; asset production and runtime technique must be evaluated together. Keep hair, glasses, monitor, torso, light, and shadow coherent as the view turns. Character rotation must not distort the existing CRT face or conflict with the scene's navigation.

Use restrained easing and inertia. The return-to-rest movement should be gentle and should not compete with reading or screen-eye motion. Have the dizzy eye effect finish on a known neutral state. Test mouse, touch, keyboard, reduced motion, interruption, and repeated fast drags.

The next implementation should treat the character as a self-contained interaction module, with controls and asset/motion contracts documented before integration. No production code or replacement image is part of this planning note.
