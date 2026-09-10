# Compact pond kit v1

Five static, metre-scale Y-up GLBs with ground pivots and identity node transforms.
All textures are embedded. Each model has one mesh, primitive and material;
instances share geometry and maps. Preserve material alpha/cutoff, vertex colours,
normal maps and the complete source transform when loading.

| File | Triangles | Height m | Conservative pivot XZ radius m |
| --- | ---: | ---: | ---: |
| pond_boulder.glb | 778 | 1.400 | 0.887 |
| pond_flat_stone.glb | 182 | 0.320 | 0.781 |
| pond_fern.glb | 120 | 0.620 | 0.873 |
| pond_bush.glb | 1396 | 0.900 | 0.938 |
| pond_reed_clump.glb | 972 | 1.137 | 0.663 |

Combined files: 5,478,672 bytes. Estimated decoded RGBA textures plus full mip
chains: 22.609375 MiB, not measured GPU residency. Asset hashes are locked in the
game's `packages/shared/src/data/compact-pond-models.json` and launch preflight.
The actual 32-instance layout submits 20,044 main-pass triangles in five batches
before frustum culling; shadows add separate passes. This is not a frame-time claim.

Sources: existing `rocks/med_rock_v2.glb`,
`rocks/pathway_rocks/pathway_rock_1.glb`, `vegetation/ferns/fern_1.glb`,
`vegetation/garden-trees/Bush_1.glb`; originals unchanged. Their creator/license
provenance remains an open launch check. Reeds are original locally authored
geometry and vertex colours. Do not infer asset rights from exporter metadata.

Blender source, authoring script, same-framing original/optimized neutral renders,
source hashes and binary validation receipts are kept in the local art workspace:
`asset-studio/island-environment-art-v1/pond-dressing01/`. Geometry comparison
retained source shape within 1.47e-7 m; Blender roundtrip bounds difference 0 m.
Fern/bush MASK cutoffs preserved; measured mask coverage change 0.1433/0.0071
percentage points after resizing. Live contact/palette/performance need separate
visual acceptance. Static foliage is not yet animated by wind.

Rocks must stay wholly inside existing non-walkable pond water. The flat stone
is not inherently walk-over-safe. Scale radii with instances; requalify footprints
for tilt/nonuniform scale. Keep the southern fishing/path approach open.
