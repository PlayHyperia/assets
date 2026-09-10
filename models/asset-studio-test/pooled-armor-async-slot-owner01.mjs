// torso_cpu8_profiles01.mjs
var RECORDS = new WeakMap;
var NAMES = ["BP_ShoulderLeather_L", "BP_ShoulderLeather_R"];
var require2 = (condition, message) => {
  if (!condition)
    throw new Error(message);
};
var PROFILES = {
  "torso09-original63-v1": {
    inputSkins: 63,
    gpuSkins: 61,
    hashes: [
      "c07dc767500b57fb3dd8da15b2e065c8cfa04e1be8b942116b353f3854fa5462",
      "5e6ab3c77f01379a80dbf86704aeeac62e6971febbc35ba32392c36b2d2d3261"
    ]
  },
  "torso09-lod01-pooled8-v1": {
    inputSkins: 8,
    gpuSkins: 6,
    hashes: [
      "41873f2bf103291f2e6a304634e581265f28178c143027bf2a5d37b68501378a"
    ]
  }
};
var TORSO_CPU8_PROFILE_NAMES = Object.freeze(Object.keys(PROFILES));
var COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
var ARRAY_TYPES = {
  5121: Uint8Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
};
var ATTRIBUTE_NAMES = {
  POSITION: "position",
  NORMAL: "normal",
  TANGENT: "tangent",
  TEXCOORD_0: "uv",
  JOINTS_0: "skinIndex",
  WEIGHTS_0: "skinWeight"
};
var arrayBytes = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
var digest = async (bytes) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function prepareTorsoCpu8Source({ profile, bytes }) {
  require2(Object.hasOwn(PROFILES, profile), "Unknown explicit torso CPU8 profile");
  require2(bytes instanceof Uint8Array, "Literal source GLB bytes required");
  const ownedBytes = Uint8Array.from(bytes), hash = await digest(ownedBytes), contract = PROFILES[profile];
  require2(contract.hashes.includes(hash), "Source bytes do not belong to selected CPU8 profile");
  const view = new DataView(ownedBytes.buffer), length = view.getUint32(12, true);
  require2(view.getUint32(0, true) === 1179937895 && view.getUint32(4, true) === 2 && view.getUint32(8, true) === ownedBytes.length, "GLB2 required");
  require2(view.getUint32(16, true) === 1313821514 && view.getUint32(24 + length, true) === 5130562, "Exact JSON/BIN layout required");
  const doc = JSON.parse(new TextDecoder().decode(ownedBytes.subarray(20, 20 + length))), bin = ownedBytes.subarray(28 + length);
  function attribute(index) {
    const a = doc.accessors[index], v = doc.bufferViews[a.bufferView], Type = ARRAY_TYPES[a.componentType], itemSize = COMPONENTS[a.type];
    require2(Type && itemSize && !a.sparse && !v.byteStride && v.buffer === 0 && !a.normalized, "Original dense typed accessor required");
    const start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0), size = a.count * itemSize * Type.BYTES_PER_ELEMENT;
    require2(start + size <= bin.length, "Accessor bounds");
    return {
      array: new Type(bin.slice(start, start + size).buffer),
      itemSize,
      count: a.count
    };
  }
  require2(doc.skins.length === 1 && doc.skins[0].joints.length === 52, "Exact52 source skin required");
  const jointNames = doc.skins[0].joints.map((i) => doc.nodes[i].name);
  const inverses = [...attribute(doc.skins[0].inverseBindMatrices).array];
  const parentMap = new Map;
  doc.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => parentMap.set(c, i)));
  const jointParents = doc.skins[0].joints.map((i) => {
    const p = parentMap.get(i);
    return doc.skins[0].joints.includes(p) ? doc.nodes[p].name : null;
  });
  const parts = [
    ...new Set(doc.nodes.map((n) => n.extras?.hyperiaSourceObject).filter(Boolean))
  ].sort();
  require2(parts.length === 53, "Exact53 provenance identities required");
  const owners = [];
  let primitiveCount = 0;
  for (const node of doc.nodes.filter((n) => n.mesh !== undefined)) {
    require2(node.skin === 0 && !node.matrix && !node.translation && !node.rotation && !node.scale && !node.children, "Literal identity source mesh node required");
    const primitives = [];
    for (const p of doc.meshes[node.mesh].primitives) {
      primitiveCount++;
      require2(!p.targets && (p.mode ?? 4) === 4, "Original triangle, no-morph torso required");
      const attributes = {};
      for (const [semantic, index2] of Object.entries(p.attributes)) {
        const a = attribute(index2);
        if (semantic === "WEIGHTS_0")
          for (let i = 0;i < a.count; i++) {
            const q = i * 4, scale = 1 / (Math.abs(a.array[q]) + Math.abs(a.array[q + 1]) + Math.abs(a.array[q + 2]) + Math.abs(a.array[q + 3]));
            for (let k = 0;k < 4; k++)
              a.array[q + k] = scale !== Infinity ? a.array[q + k] * scale : k === 0 ? 1 : 0;
          }
        attributes[ATTRIBUTE_NAMES[semantic] ?? semantic.toLowerCase()] = {
          itemSize: a.itemSize,
          count: a.count,
          type: a.array.constructor.name,
          sha256: await digest(arrayBytes(a.array))
        };
      }
      const index = attribute(p.indices);
      primitives.push({
        attributes,
        index: {
          itemSize: index.itemSize,
          count: index.count,
          type: index.array.constructor.name,
          sha256: await digest(arrayBytes(index.array))
        }
      });
    }
    owners.push({ name: node.name, extras: node.extras ?? {}, primitives });
  }
  require2(primitiveCount === contract.inputSkins, "Source primitive count differs from explicit profile");
  const token = Object.freeze({ profile, sourceSHA256: hash });
  const provenance = doc.nodes.filter((n) => n.extras?.hyperiaSourceObject).map((n) => ({ name: n.name, extras: n.extras }));
  RECORDS.set(token, {
    profile,
    contract,
    parts,
    owners,
    provenance,
    jointNames,
    jointParents,
    inverses
  });
  return token;
}
async function installTorsoCpu8({ THREE, root, skeleton, source }) {
  const record = RECORDS.get(source);
  require2(record, "Prepared source attestation required");
  require2(skeleton?.bones.length === 52 && skeleton.boneInverses.length === 52, "Exact52 bound skeleton required");
  for (let i = 0;i < 52; i++) {
    const bone = skeleton.bones[i];
    require2(bone.name === record.jointNames[i], "Joint order changed");
    require2((bone.parent?.isBone ? bone.parent.name : null) === record.jointParents[i], "Joint hierarchy changed");
    require2(skeleton.boneInverses[i].elements.every((x, k) => Object.is(x, record.inverses[i * 16 + k])), "Inverse bind matrices changed");
  }
  const parts = new Set, meshes = [], names = new Map;
  root.traverse((o) => {
    if (o.userData.hyperiaSourceObject)
      parts.add(o.userData.hyperiaSourceObject);
    if (o.isMesh)
      meshes.push(o);
    const rows = names.get(o.name) ?? [];
    rows.push(o);
    names.set(o.name, rows);
  });
  require2(JSON.stringify([...parts].sort()) === JSON.stringify(record.parts), "Provenance identity set changed");
  require2(meshes.length === record.contract.inputSkins && meshes.every((m) => m.isSkinnedMesh && m.skeleton === skeleton), "Explicit profile skin count/binding mismatch");
  for (const expected of record.provenance) {
    const matches = names.get(expected.name);
    require2(matches?.length === 1, "Exact provenance node required");
    for (const [key, value] of Object.entries(expected.extras))
      require2(JSON.stringify(matches[0].userData[key]) === JSON.stringify(value), "Source provenance metadata changed");
  }
  const seen = new Set;
  function identityObject(o) {
    require2(o.position.equals(new THREE.Vector3) && o.quaternion.equals(new THREE.Quaternion) && o.scale.equals(new THREE.Vector3(1, 1, 1)), "Source mesh local transform changed");
  }
  async function checkAttribute(actual, expected) {
    require2(actual && !actual.isInterleavedBufferAttribute && !actual.normalized && actual.itemSize === expected.itemSize && actual.count === expected.count && actual.array.constructor.name === expected.type, "Source attribute schema changed");
    require2(await digest(arrayBytes(actual.array)) === expected.sha256, "Source attribute bytes changed");
  }
  for (const expected of record.owners) {
    const matches = names.get(expected.name);
    require2(matches?.length === 1, "Exact unique source owner required");
    const owner = matches[0];
    identityObject(owner);
    for (const [key, value] of Object.entries(expected.extras))
      require2(JSON.stringify(owner.userData[key]) === JSON.stringify(value), "Source provenance/marker changed");
    const actual = owner.isMesh ? [owner] : owner.children.filter((o) => o.isMesh);
    require2(actual.length === expected.primitives.length, "Owner primitive count mismatch");
    for (let i = 0;i < actual.length; i++) {
      const mesh = actual[i], p = expected.primitives[i];
      require2(!seen.has(mesh), "Duplicate primitive owner");
      seen.add(mesh);
      identityObject(mesh);
      require2(JSON.stringify(Object.keys(mesh.geometry.attributes).sort()) === JSON.stringify(Object.keys(p.attributes).sort()), "Source attribute set changed");
      require2(Object.keys(mesh.geometry.morphAttributes).length === 0, "Unexpected torso morphs");
      for (const [name, description] of Object.entries(p.attributes))
        await checkAttribute(mesh.geometry.attributes[name], description);
      await checkAttribute(mesh.geometry.index, p.index);
    }
  }
  require2(seen.size === meshes.length, "Unaccounted or dummy meshes");
  return installCore({
    THREE,
    root,
    skeleton,
    contract: record.contract,
    profile: record.profile
  });
}
function installCore({ THREE, root, skeleton, contract, profile }) {
  const { Mesh, Matrix4, DynamicDrawUsage } = THREE;
  require2(skeleton?.bones.length === 52 && skeleton.boneInverses.length === 52, "Exact original52 skeleton required");
  const sources = [], partNames = new Set;
  let originalSkinnedMeshes = 0;
  root.traverse((o) => {
    if (o.isSkinnedMesh)
      originalSkinnedMeshes++;
    if (o.userData.hyperiaSourceObject)
      partNames.add(o.userData.hyperiaSourceObject);
    if (NAMES.includes(o.userData.hyperiaSourceObject))
      sources.push(o);
  });
  require2(originalSkinnedMeshes === contract.inputSkins && partNames.size === 53, "Exact selected-profile runtime primitives /53 source parts required");
  require2(sources.length === 2 && new Set(sources.map((o) => o.userData.hyperiaSourceObject)).size === 2, "Both exact leather nodes required");
  const states = [], stats = {
    profile,
    originalSkinnedMeshes,
    sourceParts: 53,
    remainingGpuParts: 51,
    cpuMeshNames: [...NAMES],
    replacedMeshes: 2,
    remainingGpuSkinnedMeshes: contract.gpuSkins,
    ownedCpuVertices: 0,
    paletteVersions: 0,
    deformationPasses: 0,
    transformedVertices: 0,
    lastUpdateMs: 0
  };
  let disposed = false, updating = false;
  const palette = Array.from({ length: 52 }, () => new Matrix4), cache = new Float64Array(52 * 16).fill(NaN), tmp = new Matrix4;
  function update() {
    require2(!disposed, "CPU8 adapter disposed");
    if (updating)
      return false;
    updating = true;
    const start = performance.now();
    try {
      let changed = false;
      for (let j = 0;j < 52; j++) {
        tmp.multiplyMatrices(skeleton.bones[j].matrixWorld, skeleton.boneInverses[j]);
        for (let k = 0;k < 16; k++) {
          const v = tmp.elements[k];
          require2(Number.isFinite(v), "Nonfinite bone palette");
          if (!Object.is(v, cache[j * 16 + k]))
            changed = true;
        }
        palette[j].copy(tmp);
      }
      for (const s of states) {
        s.mesh.updateWorldMatrix(true, false);
        require2(Math.abs(s.mesh.matrixWorld.determinant()) > 0.000000000001, "Singular mesh world");
        const inverse = s.mesh.matrixWorld.clone().invert();
        for (let k = 0;k < 16; k++)
          if (!Object.is(inverse.elements[k], s.inverse.elements[k]))
            changed = true;
        s.inverse.copy(inverse);
      }
      if (!changed)
        return false;
      for (const s of states) {
        const matrices = palette.map((m) => s.inverse.clone().multiply(m).multiply(s.bind)), p = s.geometry.attributes.position, n = s.geometry.attributes.normal, t = s.geometry.attributes.tangent;
        for (let i = 0;i < p.count; i++) {
          let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0, tx = 0, ty = 0, tz = 0;
          const q = i * 3, px = s.positions[q], py = s.positions[q + 1], pz = s.positions[q + 2];
          for (let k = 0;k < 8; k++) {
            const w = s.weights[i * 8 + k];
            if (!w)
              continue;
            const m = matrices[s.joints[i * 8 + k]].elements;
            x += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]);
            y += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]);
            z += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]);
            const a = s.normals[q], b = s.normals[q + 1], c = s.normals[q + 2];
            nx += w * (m[0] * a + m[4] * b + m[8] * c);
            ny += w * (m[1] * a + m[5] * b + m[9] * c);
            nz += w * (m[2] * a + m[6] * b + m[10] * c);
            if (t) {
              const a2 = s.tangents[i * 4], b2 = s.tangents[i * 4 + 1], c2 = s.tangents[i * 4 + 2];
              tx += w * (m[0] * a2 + m[4] * b2 + m[8] * c2);
              ty += w * (m[1] * a2 + m[5] * b2 + m[9] * c2);
              tz += w * (m[2] * a2 + m[6] * b2 + m[10] * c2);
            }
          }
          require2([x, y, z, nx, ny, nz].every(Number.isFinite) && Math.hypot(nx, ny, nz) > 0.00000001, "Invalid CPU deformation");
          s.nextP.set([x, y, z], q);
          const nl = Math.hypot(nx, ny, nz);
          s.nextN.set([nx / nl, ny / nl, nz / nl], q);
          if (t) {
            const tl = Math.hypot(tx, ty, tz);
            require2(Number.isFinite(tl) && tl > 0.00000001, "Invalid tangent");
            s.nextT.set([tx / tl, ty / tl, tz / tl, s.tangents[i * 4 + 3]], i * 4);
          }
        }
        require2(s.nextP.every(Number.isFinite) && s.nextN.every(Number.isFinite) && (!t || s.nextT.every(Number.isFinite)), "Float32 deformation overflow");
      }
      for (const s of states) {
        const { position: p, normal: n, tangent: t } = s.geometry.attributes;
        p.array.set(s.nextP);
        n.array.set(s.nextN);
        if (t)
          t.array.set(s.nextT);
        p.needsUpdate = true;
        n.needsUpdate = true;
        if (t)
          t.needsUpdate = true;
        s.geometry.computeBoundingBox();
        s.geometry.computeBoundingSphere();
        stats.deformationPasses++;
        stats.transformedVertices += p.count;
      }
      for (let j = 0;j < 52; j++)
        for (let k = 0;k < 16; k++)
          cache[j * 16 + k] = palette[j].elements[k];
      stats.paletteVersions++;
      return true;
    } finally {
      updating = false;
      stats.lastUpdateMs = performance.now() - start;
    }
  }
  try {
    for (const source of sources) {
      require2(source.isSkinnedMesh && source.skeleton === skeleton && source.children.length === 0 && source.userData.torso09ExactCpu8Required === true, "Install only after actual skeleton binding");
      require2(source.userData.torso09JointNames?.length === 52 && source.userData.torso09JointNames.every((n2, i) => n2 === skeleton.bones[i].name), "Exact source-to-target joint order required");
      require2(source.bindMode === "attached" && source.parent, "Attached source mesh required");
      const original = source.geometry, p = original.attributes.position, n = original.attributes.normal, t = original.attributes.tangent;
      require2(p && n && p.count === n.count && p.count <= 1e4 && !p.isInterleavedBufferAttribute && !n.isInterleavedBufferAttribute, "Bounded dense leather buffers");
      const weights = new Float32Array(p.count * 8), joints = new Uint16Array(p.count * 8);
      for (let set = 0;set < 2; set++) {
        const w = original.getAttribute("_t09_exact_weights_" + set), j = original.getAttribute("_t09_exact_joints_" + set);
        require2(w?.itemSize === 4 && j?.itemSize === 4 && w.count === p.count && j.count === p.count, "Immutable exact extra channels required");
        require2(w.array.buffer !== original.getAttribute(set ? "weights_1" : "skinWeight")?.array.buffer, "Exact weights cannot alias normalized loader channel");
        for (let i = 0;i < p.count; i++)
          for (let k = 0;k < 4; k++) {
            const q = w.getComponent(i, k), b = j.getComponent(i, k);
            require2(q >= 0 && Number.isFinite(q) && Number.isInteger(b) && b >= 0 && b < 52, "Invalid influence");
            weights[i * 8 + set * 4 + k] = q;
            joints[i * 8 + set * 4 + k] = b;
          }
      }
      for (let i = 0;i < p.count; i++) {
        let sum = 0;
        const seen = new Set;
        for (let k = 0;k < 8; k++) {
          const w = weights[i * 8 + k];
          sum += w;
          if (w) {
            const j = joints[i * 8 + k];
            require2(!seen.has(j), "Duplicate influence");
            seen.add(j);
          }
        }
        require2(Math.abs(sum - 1) < 0.000002, "Unnormalized source; never repair");
      }
      require2(!t || t.itemSize === 4 && t.count === p.count && !t.isInterleavedBufferAttribute, "Dense tangent channel");
      const geometry = source.geometry.clone(), mesh = new Mesh;
      mesh.copy(source, false);
      mesh.geometry = geometry;
      mesh.frustumCulled = false;
      const state = {
        source,
        mesh,
        geometry,
        bind: source.bindMatrix.clone(),
        inverse: new Matrix4,
        positions: Float32Array.from(p.array),
        normals: Float32Array.from(n.array),
        tangents: t ? Float32Array.from(t.array) : null,
        weights,
        joints,
        nextP: new Float32Array(p.count * 3),
        nextN: new Float32Array(p.count * 3),
        nextT: t ? new Float32Array(p.count * 4) : null
      };
      states.push(state);
      stats.ownedCpuVertices += p.count;
      geometry.attributes.position.setUsage(DynamicDrawUsage);
      geometry.attributes.normal.setUsage(DynamicDrawUsage);
      if (t)
        geometry.attributes.tangent.setUsage(DynamicDrawUsage);
      mesh.onBeforeRender = () => update();
      mesh.getVertexPosition = function(i, target) {
        update();
        return Mesh.prototype.getVertexPosition.call(this, i, target);
      };
      mesh.raycast = function(ray, hits) {
        update();
        return Mesh.prototype.raycast.call(this, ray, hits);
      };
    }
    for (const s of states) {
      const parent = s.source.parent, index = parent.children.indexOf(s.source);
      parent.remove(s.source);
      parent.add(s.mesh);
      parent.children.splice(parent.children.indexOf(s.mesh), 1);
      parent.children.splice(index, 0, s.mesh);
    }
    update();
  } catch (error) {
    const cleanup = [];
    for (const s of states) {
      try {
        if (s.mesh.parent) {
          const p = s.mesh.parent;
          p.remove(s.mesh);
          p.add(s.source);
        }
      } catch (e) {
        cleanup.push(String(e));
      }
      try {
        s.geometry.dispose();
      } catch (e) {
        cleanup.push(String(e));
      }
    }
    error.cpu8CleanupErrors = cleanup;
    throw error;
  }
  return {
    root,
    meshes: states.map((s) => s.mesh),
    metrics: stats,
    update,
    dispose() {
      if (disposed)
        return;
      require2(root.parent === null, "Detach equipment root before CPU resource disposal");
      for (const s of states) {
        require2(s.mesh.parent !== null && s.source.parent === null, "Owned mesh hierarchy changed");
        s.mesh.onBeforeRender = () => {};
        s.mesh.getVertexPosition = Mesh.prototype.getVertexPosition;
        s.mesh.raycast = Mesh.prototype.raycast;
        s.geometry.dispose();
      }
      disposed = true;
    },
    scope: `Two owned CPU8 leathers,51 preserved non-CPU source identities /${contract.gpuSkins} ordinary GPU primitives; ${profile}; local test only. No source normal/weight authoring.`
  };
}

// async-slot-owner01.mjs
function createAsyncEquipmentSlotOwner({ THREE, helper, ids, readCurrent, resolveTemplate, lighting }) {
  const need = (ok, message) => {
    if (!ok)
      throw Error(message);
  };
  need(THREE?.REVISION === "183" && typeof helper?.attachEquipmentVisualToVRM === "function" && typeof helper?.removeEquipmentVisual === "function", "Actual Three183 and equipment helper required");
  need(Array.isArray(ids) && ids.length === 2 && new Set(ids).size === 2 && ids.every((id) => typeof id === "string" && id.length > 0), "Exactly two explicit owned actor IDs required");
  need(typeof readCurrent === "function" && typeof resolveTemplate === "function", "Actual avatar/network and cached-template readers required");
  need(lighting?.mode === "authored-pbr" && lighting.environmentMap?.isTexture && Number.isFinite(lighting.intensity) && lighting.intensity >= 0, "Explicit borrowed authored PBR required");
  const allowed = new Set(ids), borrowedLighting = Object.freeze({ ...lighting });
  const rows = new Set, latest = new Map, generations = new Map, pending = new Set, prepared = new WeakMap, failures = [];
  const invalidatedAvatars = new WeakSet;
  const counts = { requested: 0, coalesced: 0, staged: 0, committed: 0, superseded: 0, released: 0, updates: 0 };
  let closing = false, disposed = false, disposal = null;
  const meshes = (root) => {
    const out = [];
    root.traverse((o) => {
      if (o.isMesh)
        out.push(o);
    });
    return out;
  };
  const materials = (root) => new Set(meshes(root).flatMap((m) => [m.material].flat()));
  const note = (row, stage, error) => failures.push({ playerId: row?.playerId ?? null, generation: row?.generation ?? null, stage, message: String(error?.stack ?? error) });
  const keyOf = (id, slot) => JSON.stringify([id, slot]);
  const authority = (playerId, slot, itemId) => {
    const current = readCurrent({ playerId, slot });
    need(current && current.itemId === itemId, "Requested item differs from actual network snapshot");
    need(current.avatar && current.vrm?.scene?.isObject3D && current.avatar.scene === current.vrm.scene, "Actual raw avatar/VRM lifetime required");
    let skeleton;
    current.vrm.scene.traverse((o) => {
      if (!skeleton && o.isSkinnedMesh)
        skeleton = o.skeleton;
    });
    need(skeleton?.bones.length === 52 && skeleton.boneInverses.length === 52, "Actual original52 body skeleton required");
    return { avatar: current.avatar, vrm: current.vrm, parent: current.vrm.scene, skeleton, bones: skeleton.bones.slice() };
  };
  const isCurrent = (row) => {
    if (closing || invalidatedAvatars.has(row.avatar) || generations.get(row.key) !== row.generation)
      return false;
    for (const other of rows)
      if (other.key === row.key && other.unresolvedCleanup)
        return false;
    const current = readCurrent({ playerId: row.playerId, slot: row.slot });
    if (!current || current.itemId !== row.itemId || current.avatar !== row.avatar || current.vrm !== row.vrm || current.vrm.scene !== row.parent)
      return false;
    let skeleton;
    current.vrm.scene.traverse((o) => {
      if (!skeleton && o.isSkinnedMesh)
        skeleton = o.skeleton;
    });
    return skeleton === row.skeleton && skeleton.bones.length === row.bones.length && skeleton.bones.every((b, i) => b === row.bones[i]);
  };
  function cleanupRow(row) {
    if (row.state === "released" || row.state === "releasing")
      return;
    need(!row.unresolvedCleanup, "Prior helper/CPU disposal failed; row retained without claiming retry success");
    row.state = "releasing";
    if (latest.get(row.key) === row)
      latest.delete(row.key);
    try {
      if (row.root) {
        need(row.root.parent === null || row.root.parent === row.parent, "Owned root moved under a foreign parent");
        row.visuals[row.slot] = row.root;
        helper.removeEquipmentVisual(row.visuals, row.slot);
        need(row.root.parent === null && !row.visuals[row.slot], "Actual helper did not detach owned root");
      }
      row.cpu8?.dispose();
    } catch (error) {
      row.unresolvedCleanup = true;
      row.state = "cleanup-failed";
      note(row, "cleanup", error);
      throw error;
    }
    row.state = "released";
    rows.delete(row);
    if (latest.get(row.key) === row)
      latest.delete(row.key);
    counts.released++;
  }
  function sourceFor(entry) {
    need(entry && Object.isFrozen(entry) && entry.slot === "body" && entry.root?.isObject3D && entry.sourceBytes instanceof Uint8Array, "Frozen body template record with literal GLB bytes required");
    let p = prepared.get(entry);
    if (!p) {
      p = prepareTorsoCpu8Source({ profile: entry.cpuProfile, bytes: entry.sourceBytes });
      prepared.set(entry, p);
    }
    return p;
  }
  async function build(row) {
    try {
      row.state = "source-admission";
      const source = await sourceFor(row.entry);
      if (!isCurrent(row)) {
        counts.superseded++;
        cleanupRow(row);
        return { status: "superseded", generation: row.generation };
      }
      const sourceMaterials = materials(row.entry.root);
      row.instance = row.entry.root.clone(true);
      row.root = row.instance;
      row.visuals[row.slot] = row.instance;
      row.state = "synchronous-staging";
      let stageError;
      try {
        need(isCurrent(row), "Generation/avatar/network changed immediately before helper attachment");
        need(helper.attachEquipmentVisualToVRM({ slot: row.slot, modelRoot: row.instance, visuals: row.visuals, vrm: row.vrm, avatarRoot: row.parent, lighting: borrowedLighting }), "Actual attachment helper rejected candidate");
        row.root = row.visuals[row.slot] ?? row.instance;
        need(row.root === row.instance && row.root.parent === row.parent, "Torso must use the actual unwrapped avatar parent");
        const parts = meshes(row.instance);
        need(parts.length > 0 && parts.every((m) => m.isSkinnedMesh && m.skeleton === row.skeleton), "Actual helper did not bind every torso skin to current body");
        need([...materials(row.instance)].every((m) => !sourceMaterials.has(m)), "Candidate materials alias cached template");
      } catch (error) {
        stageError = error;
      }
      try {
        row.root = row.visuals[row.slot] ?? row.instance;
        if (row.root.parent) {
          need(row.root.parent === row.parent, "Synchronous helper left candidate under a foreign parent");
          row.root.removeFromParent();
        }
      } catch (error) {
        throw stageError ? new AggregateError([stageError, error], "Synchronous attachment and detach both failed", { cause: stageError }) : error;
      }
      if (stageError)
        throw stageError;
      counts.staged++;
      row.state = "pending-cpu8";
      need(row.root.parent === null, "Async candidate must be detached");
      row.cpu8 = await installTorsoCpu8({ THREE, root: row.instance, skeleton: row.skeleton, source });
      if (!isCurrent(row)) {
        counts.superseded++;
        cleanupRow(row);
        return { status: "superseded", generation: row.generation };
      }
      need(row.root.parent === null, "Detached candidate acquired a foreign parent during validation");
      row.state = "committing";
      row.parent.add(row.root);
      if (!isCurrent(row)) {
        counts.superseded++;
        cleanupRow(row);
        return { status: "superseded", generation: row.generation };
      }
      row.parent.updateWorldMatrix(true, true);
      row.cpu8.update();
      need(isCurrent(row) && row.root.parent === row.parent, "Avatar/network changed during final commit");
      row.state = "active";
      counts.committed++;
      return { status: "attached", generation: row.generation, rootUUID: row.root.uuid, profile: source.profile, sourceSHA256: source.sourceSHA256, cpu8: { ...row.cpu8.metrics } };
    } catch (error) {
      note(row, row.state, error);
      if (error?.cpu8CleanupErrors?.length) {
        row.unresolvedCleanup = true;
        row.state = "cleanup-failed";
      }
      try {
        cleanupRow(row);
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Candidate failed and owned cleanup remains unresolved", { cause: error });
      }
      throw error;
    }
  }
  function request({ playerId, slot, itemId }) {
    need(!closing && !disposed, "Slot owner is closing");
    need(allowed.has(playerId) && slot === "body" && (itemId === null || typeof itemId === "string" && itemId.length > 0), "Explicit owned actor/body request required");
    const current = authority(playerId, slot, itemId), key = keyOf(playerId, slot), prior = latest.get(key);
    need(!invalidatedAvatars.has(current.avatar), "Captured avatar lifetime was invalidated");
    need(![...rows].some((row2) => row2.key === key && row2.unresolvedCleanup), "Slot retains unresolved cleanup; new attachment is forbidden");
    counts.requested++;
    if (prior && prior.itemId === itemId && isCurrent(prior)) {
      counts.coalesced++;
      return prior.promise ?? Promise.resolve({ status: "attached", generation: prior.generation, rootUUID: prior.root.uuid });
    }
    const generation = (generations.get(key) ?? 0) + 1;
    generations.set(key, generation);
    if (prior?.state === "active")
      cleanupRow(prior);
    const requested = { ...current, playerId, slot, itemId, key, generation };
    if (!isCurrent(requested)) {
      counts.superseded++;
      return Promise.resolve({ status: "superseded", generation });
    }
    if (itemId === null) {
      latest.delete(key);
      return Promise.resolve({ status: "empty", generation });
    }
    const entry = resolveTemplate({ playerId, slot, itemId });
    need(entry?.itemId === itemId, "Requested cached template does not match item");
    if (!isCurrent(requested)) {
      counts.superseded++;
      return Promise.resolve({ status: "superseded", generation });
    }
    const row = { ...current, playerId, slot, itemId, key, generation, entry, state: "created", instance: null, root: null, visuals: {}, cpu8: null, unresolvedCleanup: false, promise: null };
    rows.add(row);
    latest.set(key, row);
    const job = Promise.resolve().then(() => build(row));
    row.promise = job;
    pending.add(job);
    job.then(() => pending.delete(job), () => pending.delete(job));
    return job;
  }
  function update() {
    if (closing)
      return false;
    need(!disposed, "Slot owner disposed");
    for (const row of rows)
      if (row.state === "active") {
        try {
          need(isCurrent(row) && row.root.parent === row.parent, "Live visual no longer matches actual avatar/network; request replacement or teardown");
          row.parent.updateWorldMatrix(true, true);
          if (row.cpu8.update())
            counts.updates++;
        } catch (error) {
          note(row, "update", error);
          throw error;
        }
      }
  }
  const sample = () => ({ closing, disposed, pending: pending.size, qualificationPassed: failures.length === 0, failures: failures.slice(), counts: { ...counts }, rows: [...rows].map((row) => ({ playerId: row.playerId, slot: row.slot, itemId: row.itemId, generation: row.generation, state: row.state, rootUUID: row.root?.uuid ?? null, attached: row.root?.parent === row.parent, unresolvedCleanup: row.unresolvedCleanup, cpu8: row.cpu8 ? { ...row.cpu8.metrics } : null })), scope: "Isolated owner semantics; transient synchronous real helper attach/detach; no actual observer/loader/image/GPU integration approval" });
  async function invalidateActor({ playerId, avatar }) {
    need(allowed.has(playerId) && avatar && typeof avatar === "object", "Explicit captured actor lifetime required");
    invalidatedAvatars.add(avatar);
    const captured = [...rows].filter((row) => row.playerId === playerId && row.avatar === avatar), errors = [];
    for (const row of captured) {
      if (generations.get(row.key) === row.generation)
        generations.set(row.key, row.generation + 1);
      if (latest.get(row.key) === row)
        latest.delete(row.key);
      if (row.state === "active")
        try {
          cleanupRow(row);
        } catch (error) {
          errors.push(error);
        }
    }
    await Promise.allSettled(captured.map((row) => row.promise));
    for (const row of captured)
      try {
        cleanupRow(row);
      } catch (error) {
        errors.push(error);
      }
    if (errors.length || captured.some((row) => rows.has(row)))
      throw new AggregateError(errors, "Captured avatar cleanup incomplete; ownership retained");
    return { playerId, capturedLifetimeReleased: true, capturedRows: captured.length };
  }
  function dispose() {
    if (disposal)
      return disposal;
    closing = true;
    for (const [key, generation] of generations)
      generations.set(key, generation + 1);
    const immediateErrors = [];
    for (const row of [...rows])
      if (row.state === "active")
        try {
          cleanupRow(row);
        } catch (error) {
          immediateErrors.push(error);
        }
    disposal = (async () => {
      const settled = await Promise.allSettled([...pending]);
      const errors = immediateErrors.slice();
      for (const row of [...rows])
        try {
          cleanupRow(row);
        } catch (error) {
          errors.push(error);
        }
      if (rows.size || pending.size || errors.length) {
        disposal = null;
        throw new AggregateError(errors, "Async slot cleanup incomplete; pending/failed resources retained");
      }
      disposed = true;
      latest.clear();
      return { ...sample(), allOwnedReleased: true, settledJobs: settled.length, rejectedJobs: settled.filter((r) => r.status === "rejected").length, borrowedResourcesDisposed: false };
    })();
    return disposal;
  }
  return { request, update, sample, invalidateActor, dispose };
}
export {
  createAsyncEquipmentSlotOwner
};
