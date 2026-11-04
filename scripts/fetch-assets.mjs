import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const three = 'https://cdn.jsdelivr.net/npm/three@0.180.0/';
const files = [
  ['assets/vendor/three/three.module.js', three + 'build/three.module.js'],
  ['assets/vendor/three/three.core.js', three + 'build/three.core.js'],
  ...['controls/OrbitControls.js','loaders/GLTFLoader.js','loaders/DRACOLoader.js','environments/RoomEnvironment.js','utils/BufferGeometryUtils.js'].map(p => ['assets/vendor/three/addons/' + p, three + 'examples/jsm/' + p]),
  ...['draco_wasm_wrapper.js','draco_decoder.wasm','draco_decoder.js'].map(p => ['assets/vendor/draco/' + p, three + 'examples/jsm/libs/draco/gltf/' + p]),
  ['assets/vendor/three/LICENSE', three + 'LICENSE'],
  ['assets/vendor/three/addons/libs/meshopt_decoder.module.js', three + 'examples/jsm/libs/meshopt_decoder.module.js'],
  ['assets/vendor/MESHOPT-LICENSE', 'https://raw.githubusercontent.com/zeux/meshoptimizer/master/LICENSE.md'],
  ['assets/models/porsche.glb', 'https://raw.githubusercontent.com/pedrosoandre/carros/main/assets/porsche-911-930.glb'],
  ['assets/models/bmw.glb', 'https://raw.githubusercontent.com/pedrosoandre/carros/main/assets/bmw-e36-m3.glb'],
  ['assets/vendor/draco/LICENSE', 'https://raw.githubusercontent.com/google/draco/main/LICENSE'],
  ['assets/vendor/velocity.min.js', 'https://cdn.jsdelivr.net/npm/velocity-animate@1.5.2/velocity.min.js'],
  ['assets/vendor/VELOCITY-LICENSE', 'https://cdn.jsdelivr.net/npm/velocity-animate@1.5.2/LICENSE.md'],
  ['assets/models/ferrari.glb', 'https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/ferrari.glb'],
  ['assets/models/concept.glb', 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb'],
  ['assets/models/CONCEPT-LICENSE.md', 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/LICENSE.md'],
  ['assets/models/concept-metadata.json', 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/metadata.json']
];
await Promise.all(files.map(async ([local, url]) => {
  const target = new URL(local, root);
  if (existsSync(target)) return;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const data = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(fileURLToPath(target)), { recursive: true });
  await writeFile(target, data);
  console.log(`${local}: ${data.length} bytes`);
}));
await mkdir(new URL('assets/fonts/', root), { recursive: true });
for (const file of ['dm-sans-latin-variable.woff2','OFL.txt']) await copyFile(new URL('../../Day-03/assets/fonts/' + file, import.meta.url), new URL('assets/fonts/' + file, root));
await copyFile(new URL('../../Day-03/assets/vendor/gsap.min.js', import.meta.url), new URL('assets/vendor/gsap.min.js', root));
