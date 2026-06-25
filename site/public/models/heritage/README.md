# EchoArch heritage model contract

Place production-ready landmark models in this directory.

## File contract

- Format: binary glTF (`.glb`)
- File name: the matching `HeritageSpot.id`, for example `weiyuan-temple.glb`
- Up axis: positive Y
- Forward axis: positive Z
- Origin: ground-center of the landmark
- Unit: 1 unit equals 1 meter
- Materials: PBR metallic-roughness
- Textures: WebP or KTX2, maximum 2048 px for mobile delivery
- Mesh compression: Draco or Meshopt
- Animation: optional; names must describe the action in ASCII

## Integration

The asset slot is declared in `src/world/world-data.ts`. After a model has been
checked in this coordinate system, change its asset status from `planned` to
`ready`. The scene will load the GLB and retain the parametric model as its
loading fallback.

Keep collision and interaction markers in the scene data rather than baking
them into the model. This lets photo hotspots and guide context survive future
model replacements.
