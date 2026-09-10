/** Explicit local-test ONLY: two leather meshes, all exact original influences.
 * Call update() after final avatar world matrices and BEFORE renderer.render().
 * GPU, vertex queries and raycast use the same owned CPU-position buffer.
 */
const NAMES=['BP_ShoulderLeather_L','BP_ShoulderLeather_R'];
const require=(v,m)=>{if(!v)throw new Error(m);};
export function installTorso09Cpu8({THREE,root,skeleton}){
 const {Mesh,Matrix4,DynamicDrawUsage}=THREE;
 require(skeleton?.bones.length===52&&skeleton.boneInverses.length===52,'Exact original52 skeleton required');
 const sources=[],partNames=new Set();let originalSkinnedMeshes=0;root.traverse(o=>{if(o.isSkinnedMesh)originalSkinnedMeshes++;if(o.userData.hyperiaSourceObject)partNames.add(o.userData.hyperiaSourceObject);if(NAMES.includes(o.userData.hyperiaSourceObject))sources.push(o);});
 require(originalSkinnedMeshes===63&&partNames.size===53,'Exact53 source parts /63 runtime primitives required');
 require(sources.length===2&&new Set(sources.map(o=>o.userData.hyperiaSourceObject)).size===2,'Both exact leather nodes required');
 const states=[],stats={originalSkinnedMeshes,sourceParts:53,remainingGpuParts:51,cpuMeshNames:[...NAMES],replacedMeshes:2,remainingGpuSkinnedMeshes:61,ownedCpuVertices:0,paletteVersions:0,deformationPasses:0,transformedVertices:0,lastUpdateMs:0};let disposed=false,updating=false;
 const palette=Array.from({length:52},()=>new Matrix4()),cache=new Float64Array(52*16).fill(NaN),tmp=new Matrix4();
 function update(){
  require(!disposed,'CPU8 adapter disposed');if(updating)return false;updating=true;const start=performance.now();
  try{
   let changed=false;for(let j=0;j<52;j++){
    tmp.multiplyMatrices(skeleton.bones[j].matrixWorld,skeleton.boneInverses[j]);
    for(let k=0;k<16;k++){const v=tmp.elements[k];require(Number.isFinite(v),'Nonfinite bone palette');if(!Object.is(v,cache[j*16+k]))changed=true;}
    palette[j].copy(tmp);
   }
   for(const s of states){s.mesh.updateWorldMatrix(true,false);require(Math.abs(s.mesh.matrixWorld.determinant())>1e-12,'Singular mesh world');const inverse=s.mesh.matrixWorld.clone().invert();
    for(let k=0;k<16;k++)if(!Object.is(inverse.elements[k],s.inverse.elements[k]))changed=true;s.inverse.copy(inverse);
   }
   if(!changed)return false;
   for(const s of states){const matrices=palette.map(m=>s.inverse.clone().multiply(m).multiply(s.bind)),p=s.geometry.attributes.position,n=s.geometry.attributes.normal,t=s.geometry.attributes.tangent;
    for(let i=0;i<p.count;i++){
     let x=0,y=0,z=0,nx=0,ny=0,nz=0,tx=0,ty=0,tz=0;const q=i*3,px=s.positions[q],py=s.positions[q+1],pz=s.positions[q+2];
     for(let k=0;k<8;k++){const w=s.weights[i*8+k];if(!w)continue;const m=matrices[s.joints[i*8+k]].elements;
      x+=w*(m[0]*px+m[4]*py+m[8]*pz+m[12]);y+=w*(m[1]*px+m[5]*py+m[9]*pz+m[13]);z+=w*(m[2]*px+m[6]*py+m[10]*pz+m[14]);
      const a=s.normals[q],b=s.normals[q+1],c=s.normals[q+2];nx+=w*(m[0]*a+m[4]*b+m[8]*c);ny+=w*(m[1]*a+m[5]*b+m[9]*c);nz+=w*(m[2]*a+m[6]*b+m[10]*c);
      if(t){const a=s.tangents[i*4],b=s.tangents[i*4+1],c=s.tangents[i*4+2];tx+=w*(m[0]*a+m[4]*b+m[8]*c);ty+=w*(m[1]*a+m[5]*b+m[9]*c);tz+=w*(m[2]*a+m[6]*b+m[10]*c);}
     }
     require([x,y,z,nx,ny,nz].every(Number.isFinite)&&Math.hypot(nx,ny,nz)>1e-8,'Invalid CPU deformation');s.nextP.set([x,y,z],q);
     const nl=Math.hypot(nx,ny,nz);s.nextN.set([nx/nl,ny/nl,nz/nl],q);if(t){const tl=Math.hypot(tx,ty,tz);require(Number.isFinite(tl)&&tl>1e-8,'Invalid tangent');s.nextT.set([tx/tl,ty/tl,tz/tl,s.tangents[i*4+3]],i*4);}
    }
    require(s.nextP.every(Number.isFinite)&&s.nextN.every(Number.isFinite)&&(!t||s.nextT.every(Number.isFinite)),'Float32 deformation overflow');
   }
   for(const s of states){const {position:p,normal:n,tangent:t}=s.geometry.attributes;p.array.set(s.nextP);n.array.set(s.nextN);if(t)t.array.set(s.nextT);
    p.needsUpdate=true;n.needsUpdate=true;if(t)t.needsUpdate=true;s.geometry.computeBoundingBox();s.geometry.computeBoundingSphere();
    stats.deformationPasses++;stats.transformedVertices+=p.count;
   }
   for(let j=0;j<52;j++)for(let k=0;k<16;k++)cache[j*16+k]=palette[j].elements[k];stats.paletteVersions++;return true;
  }finally{updating=false;stats.lastUpdateMs=performance.now()-start;}
 }
 try{
  for(const source of sources){
   require(source.isSkinnedMesh&&source.skeleton===skeleton&&source.children.length===0&&source.userData.torso09ExactCpu8Required===true,'Install only after actual skeleton binding');
   require(source.userData.torso09JointNames?.length===52&&source.userData.torso09JointNames.every((n,i)=>n===skeleton.bones[i].name),'Exact source-to-target joint order required');
   require(source.bindMode==='attached'&&source.parent,'Attached source mesh required');
   const original=source.geometry,p=original.attributes.position,n=original.attributes.normal,t=original.attributes.tangent;
   require(p&&n&&p.count===n.count&&p.count<=10000&&!p.isInterleavedBufferAttribute&&!n.isInterleavedBufferAttribute,'Bounded dense leather buffers');
   const weights=new Float32Array(p.count*8),joints=new Uint16Array(p.count*8);
   for(let set=0;set<2;set++){
    const w=original.getAttribute('_t09_exact_weights_'+set),j=original.getAttribute('_t09_exact_joints_'+set);
    require(w?.itemSize===4&&j?.itemSize===4&&w.count===p.count&&j.count===p.count,'Immutable exact extra channels required');
    require(w.array.buffer!==original.getAttribute(set?'weights_1':'skinWeight')?.array.buffer,'Exact weights cannot alias normalized loader channel');
    for(let i=0;i<p.count;i++)for(let k=0;k<4;k++){const q=w.getComponent(i,k),b=j.getComponent(i,k);require(q>=0&&Number.isFinite(q)&&Number.isInteger(b)&&b>=0&&b<52,'Invalid influence');weights[i*8+set*4+k]=q;joints[i*8+set*4+k]=b;}
   }
   for(let i=0;i<p.count;i++){let sum=0;const seen=new Set();for(let k=0;k<8;k++){const w=weights[i*8+k];sum+=w;if(w){const j=joints[i*8+k];require(!seen.has(j),'Duplicate influence');seen.add(j);}}require(Math.abs(sum-1)<2e-6,'Unnormalized source; never repair');}
   require(!t||t.itemSize===4&&t.count===p.count&&!t.isInterleavedBufferAttribute,'Dense tangent channel');
   const geometry=source.geometry.clone(),mesh=new Mesh();mesh.copy(source,false);mesh.geometry=geometry;mesh.frustumCulled=false;
   const state={source,mesh,geometry,bind:source.bindMatrix.clone(),inverse:new Matrix4(),positions:Float32Array.from(p.array),normals:Float32Array.from(n.array),tangents:t?Float32Array.from(t.array):null,weights,joints,nextP:new Float32Array(p.count*3),nextN:new Float32Array(p.count*3),nextT:t?new Float32Array(p.count*4):null};
   states.push(state);stats.ownedCpuVertices+=p.count;geometry.attributes.position.setUsage(DynamicDrawUsage);geometry.attributes.normal.setUsage(DynamicDrawUsage);if(t)geometry.attributes.tangent.setUsage(DynamicDrawUsage);
   mesh.onBeforeRender=()=>update();mesh.getVertexPosition=function(i,target){update();return Mesh.prototype.getVertexPosition.call(this,i,target);};
   mesh.raycast=function(ray,hits){update();return Mesh.prototype.raycast.call(this,ray,hits);};
  }
  for(const s of states){const parent=s.source.parent,index=parent.children.indexOf(s.source);parent.remove(s.source);parent.add(s.mesh);parent.children.splice(parent.children.indexOf(s.mesh),1);parent.children.splice(index,0,s.mesh);}
  update();
 }catch(error){const cleanup=[];for(const s of states){try{if(s.mesh.parent){const p=s.mesh.parent;p.remove(s.mesh);p.add(s.source);}}catch(e){cleanup.push(String(e));}try{s.geometry.dispose();}catch(e){cleanup.push(String(e));}}error.cpu8CleanupErrors=cleanup;throw error;}
 return {root,meshes:states.map(s=>s.mesh),metrics:stats,update,
  dispose(){if(disposed)return;require(root.parent===null,'Detach equipment root before CPU resource disposal');
   for(const s of states){require(s.mesh.parent!==null&&s.source.parent===null,'Owned mesh hierarchy changed');s.mesh.onBeforeRender=()=>{};s.mesh.getVertexPosition=Mesh.prototype.getVertexPosition;s.mesh.raycast=Mesh.prototype.raycast;s.geometry.dispose();}
   disposed=true;
  },scope:'Two owned CPU8 leathers,51 source parts /61 ordinary GPU primitives; local test only. No source normal/weight authoring.'};
}
