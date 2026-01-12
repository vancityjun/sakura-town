# Sakura Town

Interactive Three.js scene viewer with object picking, annotations, and transform tools.

## Highlights

- Implemented object picking and hover/selection highlighting in a Three.js WebGL viewer using Raycaster.
- Added GLTF/GLB loading support with a loading/error UI for 3D assets.
- Built review annotations by anchoring comment pins to 3D world positions with screen-space overlays.
- Enabled in-view 3D adjustments using TransformControls (translate/rotate) for selected objects.
- Improved interaction responsiveness by limiting raycast targets and profiling frame rate in the render loop.

## Features

- GLB-first loader with OBJ+MTL fallback.
- Click-to-select with hover highlight.
- Annotation pins anchored in 3D space with a comment sidebar.
- Transform gizmo (translate/rotate) + undo/redo.
- Selection toggle to switch between viewer and edit modes.
- FPS panel via Stats.js.

## Getting Started

Local file access (`file://`) blocks model loading. Run a local server instead.

```sh
python3 -m http.server
```

Open: `http://localhost:8000/index.html`

## Controls

- Orbit: left-drag (default OrbitControls)
- Select: click mesh (when Selection is On)
- Add comment: type in the sidebar and click “Add comment”
- Transform: Translate/Rotate buttons or W/E
- Undo/Redo: toolbar buttons or Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z (or Ctrl+Y)

## Model Formats

- Primary: `models/sakura-park.glb`
- Fallback: `models/sakura-park.obj` + `models/sakura-park.mtl`

Update `GLB_MODEL_URL` in `js/index.js` if you use a different path.

## Built With

- [Three.js](https://threejs.org/) (r96)
- Stats.js (FPS panel)

## License

MIT
