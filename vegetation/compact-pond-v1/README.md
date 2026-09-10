# Compact pond kit v1

Five static, metre-scale Y-up GLBs with ground pivots and identity node transforms.
All textures are embedded. Each model has one mesh, primitive and material;
instances share geometry and maps. Preserve material alpha/cutoff, vertex colours,
normal maps and the complete source transform when loading.

| File | Triangles | Height m | Conservative pivot XZ radius m |
| --- | ---: | ---: | ---: |
| pond_boulder.glb | 778 | 1.400 | 0.887 |
| pond_flat_stone.glb | 182 | 0.320 | 0.781 |
| pond_fern.glb | 2248 | 0.620 | 0.871 |
| pond_bush.glb | 1396 | 0.900 | 0.938 |
| pond_reed_clump.glb | 972 | 1.137 | 0.663 |

Combined files: 5,622,276 bytes. Estimated decoded RGBA textures plus full mip
chains: 21.9427 MiB, not measured GPU residency. Asset hashes are locked in the
game's `packages/shared/src/data/compact-pond-models.json` and launch preflight.
The actual 32-instance layout submits 37,068 main-pass triangles in five batches
before frustum culling; shadows add separate passes. This is not a frame-time claim.

Sources: existing `rocks/med_rock_v2.glb`,
`rocks/pathway_rocks/pathway_rock_1.glb`,
`vegetation/garden-trees/Bush_1.glb`; originals unchanged. Their creator/license
provenance remains an open launch check. Reeds are original locally authored
geometry and vertex colours. Do not infer asset rights from exporter metadata.

Fern update, 2026-09-10: one clump from Poly Haven's CC0
[Fern 02](https://polyhaven.com/a/fern_02), uniformly normalized without
decimation. Three embedded maps: 768-square base colour with the separately
supplied source alpha restored, 512-square OpenGL normal and 256-square packed
AO/roughness/metalness. MASK cutoff 0.5, double-sided, one material. Estimated
4,893,344 decoded RGBA8 bytes including full mip chains. The previous local fern
remains in `vegetation/ferns/fern_1.glb` and kit Git history. Full downloads,
provenance, editable source, validation receipts and matched neutral comparison
are in `asset-studio/island-environment-art-v1/pond-foliage-online01/`.

Blender source, authoring script, same-framing original/optimized neutral renders,
source hashes and binary validation receipts are kept in the local art workspace:
`asset-studio/island-environment-art-v1/pond-dressing01/`. Geometry comparison
retained source shape within 1.47e-7 m; Blender roundtrip bounds difference 0 m.
Original fern/bush MASK cutoffs preserved; measured mask coverage change 0.1433/0.0071
percentage points after resizing. Live contact/palette/performance need separate
visual acceptance. Static foliage is not yet animated by wind.

Rocks must stay wholly inside existing non-walkable pond water. The flat stone
is not inherently walk-over-safe. Scale radii with instances; requalify footprints
for tilt/nonuniform scale. Keep the southern fishing/path approach open.
