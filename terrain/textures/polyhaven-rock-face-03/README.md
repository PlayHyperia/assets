# Rock Face 03 source maps

Original 1K PNG maps from [Poly Haven Rock Face 03](https://polyhaven.com/a/rock_face_03), provided under [CC0-1.0](https://polyhaven.com/license). Photography: Dario Barresi. Processing: Rico Cilliers. Published surface width: approximately 2.7 metres.

`provenance.json` records exact official URLs, byte sizes, publisher MD5 and locally computed SHA256. Original 16-bit PNG bytes are retained unchanged. Only diffuse, roughness, OpenGL normal and ambient occlusion are included; no displacement or larger-resolution package is required.

The game's `scripts/pack-compact-terrain-textures.mjs` selects these sources with `--rock-source=rock-face-03`, alongside the installed grass source. Ordinary `--check` follows the installed packing manifest. Both sources explicitly set to `legacy` reproduce the original packed material; `grass004` with legacy rock reproduces the previous grass checkpoint.

Packing quantizes original 16-bit samples to RGBA8 and then preserves every decoded channel exactly. It does not apply embedded ICC/gamma tags to non-color data, normalize normals, resize, recolor, premultiply or change orientation. This is not lossless with respect to original 16-bit precision. Output pair: diffuse RGB / roughness alpha and OpenGL normal RGB / AO alpha; derivative PNGs omit color-profile chunks. Runtime explicitly decodes diffuse RGB as sRGB, leaves all other channels linear, and uses one shared vertical orientation.

This provenance and reproducibility record does not constitute approval of in-game appearance, motion, mip quality or GPU performance.
