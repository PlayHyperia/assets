# Compact outcrop geometry library

Staged for the explicit `CompactRockOutcropVisuals` consumer. **Not installed in
the default world; collision/navigation and final placement are not approved.**
Never add the GLB scene directly: it contains all three alternatives for each rock.

Source: [Rock Moss Set 02](https://polyhaven.com/a/rock_moss_set_02), Kless Gyzen,
[CC0-1.0](https://polyhaven.com/license). Selected source variants: rock10, rock11,
rock13. Original source acquisition and Blender derivative evidence are retained
in the workspace's `asset-studio/rock-moss-set-02-prep01` and
`asset-studio/rock-moss-set-02-lod01/candidate03` directories.

Runtime package SHA-256:
`62c8c753c57b7108f79c98ee0f1bbb2497c27e3fe55a15979765fa02da184c55`

The 2,993,320-byte GLB shares one material and three original 2048² JPEG maps
across nine meshes. All geometry, UVs, normals, image bodies and material settings
are unchanged from the corrected authoring package (SHA-256
`5aaac87873741cfee46eb1ad768b3cec277fceabd5734773d9622060f3b7d943`).
Only the scene/node packaging changes: remove showroom placement, preserve the
per-child transforms, and name the nine nodes for explicit LOD selection.
In particular, rock13's +0.3438511193m child Y translation is intentional.

| Variant | Near | Medium | Far |
| --- | ---: | ---: | ---: |
| rock10 | 8,000 | 2,000 | 500 |
| rock11 | 8,000 | 2,000 | 500 |
| rock13 | 7,928 | 2,000 | 500 |

Counts are triangles per instance, before shadows. The complete geometry library
has 31,428 triangles; rendering selects one level per instance. Three uncompressed
RGBA8 2K textures with complete mip chains would total about 64 MiB, **not a
measured runtime allocation**. No texture downsampling or normal rebake was made.

The authoring verification reports closed, consistently wound topology for these
nine meshes, but not a self-intersection or physics-solid proof. Do not use the
render bounds as a complete terrain-contact or movement test.
