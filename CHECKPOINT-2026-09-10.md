# Hyperia asset work-in-progress checkpoint

This checkpoint preserves the locally available preparation/duel asset work and
its manifest dependencies. It is a backup for continued development, **not a
production release or visual-quality approval**.

- Runtime scope: preparation/world manifests, avatar candidates and LODs,
  authored movement/combat/gathering emotes, fitted weapons and tools, and
  existing locally modified game assets.
- Diagnostic scope: `avatars/asset-studio-test/`, `models/asset-studio-test/`,
  and candidate subdirectories retain experiments and comparison assets.
  Names such as `UNQUALIFIED`, `UNFITTED`, `TEST`, and `candidate` remain
  meaningful. These files must not be promoted to defaults merely because they
  are committed. The diagnostic JavaScript and raw lighting map support local
  test paths; they are not an approved production equipment/lighting pipeline.
- Open quality gates include complete equipment binding and fit, motion and
  hand orientation, ground contact, close-range terrain detail, world layout,
  lighting/shadows, and measured frame pacing, memory, and long-running play.

GLB/VRM and supported media retain this repository's Git LFS policy. Fetch the
required LFS objects before running the game. Cloud-only files, local backup
copies, and missing working-tree textures are deliberately not staged or
deleted by this checkpoint. Their existing committed versions remain intact;
this does not certify that the local checkout is complete.

At checkpoint preparation, all 55 literal asset URLs in the game's avatar and
emote registries were indexed and locally materialized. The 13 excluded
cloud-only candidate emotes and 11 absent legacy terrain/water textures were
not directly referenced by those registries or the current JSON manifests.
They remain unresolved local files, not deleted assets or verified runtime
dependencies; dynamic loading and complete asset coverage still need review.

The Blender authoring projects, external `asset-studio` tools, and detailed
hardware-test evidence live outside this repository and are not backed up by
this commit. Keep those sources and their original assets separately.
