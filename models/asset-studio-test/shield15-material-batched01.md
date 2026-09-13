# Lossless shield batching candidate

This is a non-default diagnostic derivative, **not an approved finished shield**.
The original `shield15-ior.glb` and production item bindings are unchanged.

| | Original | Candidate |
| --- | --- | --- |
| File | `shield15-ior.glb` | `shield15-material-batched01-UNQUALIFIED.glb` |
| Bytes | 784,592 | 766,908 |
| Vertices / triangles | 4,664 / 5,140 | 4,664 / 5,140 |
| Opaque material primitives | 23 | 5 |
| Materials / embedded PNGs | 5 / 2 | 5 / 2 |

Original SHA-256: `24a9c90f8df7a62061b18c267cea210a6be155f1a62b95a6af7b25296c8c9dd8`.
Candidate SHA-256: `65e41104e6f3e7db84ba464a9d5303404a3da449f2af109ce46a52c017771fdf`.

Compatible primitives were concatenated by material without welding, simplifying,
quantizing or recompressing. Indices were rebased; all vertex attributes,
triangle winding, five materials, ten texture bindings, two PNG payloads and
authored raw-left-hand fit metadata are preserved. All 22 original named nodes
remain as anchors, with five new rendering nodes under the source root. The
original must be used for per-part mesh editing, visibility or animation.

Independent byte/triangle/transform verification and 15 corruption controls pass.
Both containers pass Khronos glTF Validator 2.0.0-dev.3.10 with zero errors,
warnings, infos or hints. Actual Three r186 browser loading confirms identical
decoded maps, PBR/IOR, geometry, named anchors and production-helper fit. Two
actors use private materials and retain shared geometry/maps safely on removal.

Native Chrome/Metal WebGPU diagnostic `shield-batching-native03` confirms 46 to
10 actual shield draws in each main and sun-shadow pass, retaining 10,280
submitted triangles per pass for two shields. That saves 72 submissions, not a
proven FPS increase. Thirty-two naturally animated idle samples per actor retain
the unchanged wrapper and child-model fit without drift. Live equip/unequip and
owned cleanup pass. Native report SHA-256:
`6db7e22427f74839955a3def7b5a31860f26a486b26bfa3cae086d9ebe31419f`.

**Open:** the outer-face views expose a sideways kite-shield idle carry in the
existing fit. Preserving that fit is not approving it. Correct orientation and
finish grips, then verify walking, running, blocking/combat, transition/culling
pixels and long-duration/reload behavior before production binding changes.
Global frame headroom, final asset art and production launch remain unapproved.
The isolated game still reports the pre-existing cow-asset/dagger-fit failures.
