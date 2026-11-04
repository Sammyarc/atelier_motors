import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const CARS = {
  ferrari: {
    title: 'Ferrari 458 Italia', brand: 'FERRARI', display: '458 Italia', index: '01',
    description: 'Italian expression.\nFrom every angle.', file: 'assets/models/ferrari.glb',
    story: 'Flowing surfaces, a low silhouette, and an unmistakable mid-engine profile. This digital 458 Italia study brings the sculpted bodywork and driver-focused cabin into a space you can explore at your own pace.',
    facts: [['Design character', 'Italian sports car'], ['Configuration', 'Two-seat sports car'], ['In this study', 'Exterior + cabin'], ['Model artist', 'vicent091036']],
    rotation: 0, seat: [-0.35, 1.04, 0.1],
  },
  concept: {
    title: 'Khronos Concept', brand: 'KHRONOS', display: 'Concept', index: '02',
    description: 'Tomorrow’s silhouette.\nAn open invitation.', file: 'assets/models/concept.glb',
    story: 'A forward-looking design study with a sweeping glasshouse, angular bodywork, and a sculptural cabin. Created for the Khronos glTF sample collection, it explores how materials and automotive form can come alive in real time.',
    facts: [['Design character', 'Futuristic concept'], ['Collection', 'Khronos glTF Sample Assets'], ['In this study', 'Exterior + cabin'], ['Model artist', 'Eric Chadwick / DGG']],
    rotation: Math.PI, seat: [0, 1.08, -0.12],
  },
  porsche: {
    title: 'Porsche 911 Turbo', brand: 'PORSCHE', display: '911 Turbo', index: '03',
    description: 'An unmistakable silhouette.\nA timeless point of view.', file: 'assets/models/porsche.glb',
    story: 'A digital study of the 1975 Porsche 911 (930) Turbo. Explore the rounded bodywork, distinctive rear spoiler, and analog cabin of this classic sports car.',
    facts: [['Design character', 'Classic sports car'], ['Model study', '1975 · 930 Turbo'], ['In this study', 'Exterior + cabin'], ['Model artist', 'Lionsharp Studios']],
    rotation: Math.PI, seat: [-0.35, 1.12, -0.2], paintMaterials: ['paint'], glassMaterials: ['glass'], excludeMaterials: ['material_0','coat'],
  },
  bmw: {
    title: 'BMW M3 E36', brand: 'BMW', display: 'M3 E36', index: '04',
    description: 'Purposeful proportions.\nA driver’s perspective.', file: 'assets/models/bmw.glb',
    story: 'The M3 E36 brings a different character to the collection: a clean coupe silhouette, compact proportions, and a purposeful cabin. Explore this model by Martin Trafas from every angle.',
    facts: [['Design character', 'Sports coupe'], ['Model study', 'M3 · E36'], ['In this study', 'Exterior + cabin'], ['Model artist', 'Martin Trafas']],
    rotation: Math.PI, seat: [-0.35, 1.12, 0.1], paintMaterials: ['CarPaint'], glassMaterials: ['Windows'], excludeMaterials: ['Scene'],
  }
};

const clamp = THREE.MathUtils.clamp;
export class Showroom {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mode = 'exterior';
    this.angle = 'hero';
    this.color = '#b52e22';
    this.night = false;
    this.rotating = false;
    this.cache = new Map();
    this.request = 0;
    this.dirty = true;
    this.tweens = new Set();
    this.look = { yaw: 0, pitch: -0.17 };
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.02, 80);
    this.camera.position.set(6.6, 3.3, -7.4);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 5.3;
    this.controls.maxDistance = 16;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.rotateSpeed = 0.65;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.target.set(0, 0.6, 0);
    this.controls.update();
    this.controls.addEventListener('change', () => this.invalidate());
    this.controls.addEventListener('start', () => {
      this.stopCameraTween();
      this.setRotate(false);
      this.callbacks.onInteraction?.();
    });
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.85;
    room.dispose();
    pmrem.dispose();
    this.buildStage();
    this.buildLighting();
    const draco = new DRACOLoader().setDecoderPath('assets/vendor/draco/');
    draco.setWorkerLimit(2);
    this.draco = draco;
    this.loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.lastTime = 0;
    this.renderer.setAnimationLoop((time) => this.frame(time));
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.renderer.setAnimationLoop(null);
      callbacks.onFatal?.('The graphics connection was interrupted. Reload to reopen the showroom.');
    });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
    document.addEventListener('visibilitychange', () => { this.lastTime = 0; this.invalidate(); });
  }

  buildStage() {
    const stageMaterial = new THREE.MeshStandardMaterial({ color: '#d1d1c4', roughness: 0.79, metalness: 0.12 });
    const profile = [[0,0],[3.1,0],[3.22,0.025],[3.28,0.08],[3.28,0.20],[3.24,0.26],[3.17,0.28],[0,0.28]].map(p => new THREE.Vector2(...p));
    this.stage = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), stageMaterial);
    this.stage.receiveShadow = true;
    this.stage.castShadow = true;
    this.scene.add(this.stage);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.012, 6, 128), new THREE.MeshBasicMaterial({ color: '#b4c18e' }));
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.085;
    this.scene.add(edge);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.56, 128), new THREE.MeshBasicMaterial({ color: '#abb09f', transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.015;
    this.scene.add(ring);
    const shadowTexture = document.createElement('canvas');
    shadowTexture.width = shadowTexture.height = 128;
    const ctx = shadowTexture.getContext('2d');
    const gradient = ctx.createRadialGradient(64,64,15,64,64,64);
    gradient.addColorStop(0,'rgba(30,36,22,0.3)');
    gradient.addColorStop(.6,'rgba(30,36,22,0.16)');
    gradient.addColorStop(1,'rgba(30,36,22,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,128,128);
    const softShadow = new THREE.Mesh(new THREE.PlaneGeometry(9,9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowTexture), transparent:true, depthWrite:false }));
    softShadow.rotation.x = -Math.PI / 2;
    softShadow.position.y = -0.025;
    this.scene.add(softShadow);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.ShadowMaterial({ opacity:0.11 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  buildLighting() {
    this.ambient = new THREE.HemisphereLight('#ffffff', '#a2a38d', 0.85);
    this.scene.add(this.ambient);
    this.key = new THREE.DirectionalLight('#fff5e5', 2.3);
    this.key.position.set(-3,7,-5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024,1024);
    Object.assign(this.key.shadow.camera, { left:-5,right:5,top:5,bottom:-5,near:0.1,far:20 });
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.025;
    this.key.shadow.radius = 4;
    this.scene.add(this.key);
    this.rim = new THREE.DirectionalLight('#e5efff', 1.3);
    this.rim.position.set(4,3,4);
    this.scene.add(this.rim);
    this.cabinLight = new THREE.PointLight('#fff3dd', 0, 3, 1.5);
    this.scene.add(this.cabinLight);
  }

  async loadCar(id) {
    if (!CARS[id]) return false;
    const token = ++this.request;
    this.callbacks.onLoading?.(true, 0);
    let record = this.cache.get(id);
    try {
      if (!record) {
        const gltf = await this.loader.loadAsync(CARS[id].file, event => {
          if (token === this.request) this.callbacks.onLoading?.(true, event.total ? event.loaded / event.total : 0.5);
        });
        record = this.prepareModel(gltf.scene, id);
        this.cache.set(id, record);
      }
      if (token !== this.request) return false;
      this.stopCameraTween();
      if (this.car) this.scene.remove(this.car);
      this.car = record.root;
      this.paint = record.paint;
      this.currentId = id;
      this.scene.add(this.car);
      this.renderer.shadowMap.needsUpdate = true;
      this.setColor(this.color, false);
      this.mode = 'exterior';
      this.setRotate(false);
      this.setView('exterior', false);
      this.callbacks.onLoading?.(false, 1);
      this.invalidate();
      return true;
    } catch (error) {
      if (token === this.request) this.callbacks.onLoading?.(false, 0);
      throw error;
    }
  }

  prepareModel(model, id) {
    // Remove source display floors and redundant coating shells before sizing
    // the vehicle. They otherwise shrink the car and overlap our own platform.
    const excluded = [];
    model.traverse(node => {
      if (node.isMesh && CARS[id].excludeMaterials?.includes(node.material.name)) excluded.push(node);
    });
    excluded.forEach(node => node.removeFromParent());
    model.rotation.y += CARS[id].rotation;
    model.updateMatrixWorld(true);
    const initialBox = new THREE.Box3().setFromObject(model);
    const size = initialBox.getSize(new THREE.Vector3());
    const scale = 4.5 / Math.max(size.x, size.z);
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y += 0.285 - box.min.y;
    const root = new THREE.Group();
    root.add(model);
    const paints = new Set();
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const fixMaterial = original => {
        const material = original.clone();
        const name = material.name || '';
        material.envMapIntensity = 1.15;
        if (name === 'Body_Color' || name.startsWith('Paint 1') || CARS[id].paintMaterials?.includes(name)) {
          // Preserve the concept car's detailed paint normal map and UVs.
          const paint = new THREE.MeshPhysicalMaterial({ color:this.color, metalness:id === 'porsche' ? .5 : .72, roughness:id === 'porsche' ? .38 : .27, clearcoat:1, clearcoatRoughness:id === 'porsche' ? .3 : .16, normalMap:material.normalMap, normalScale:material.normalScale, side:material.side });
          if (id === 'porsche') node.geometry.computeVertexNormals();
          paint.name = 'Atelier paint';
          paints.add(paint);
          material.dispose();
          return paint;
        }
        if (name === 'Glass_Gray' || name === 'Glass' || CARS[id].glassMaterials?.includes(name)) {
          // Clear glazing keeps both cabins readable without a second transmission pass.
          material.transparent = true;
          material.opacity = 0.18;
          material.depthWrite = false;
          material.roughness = 0.08;
          material.metalness = 0.15;
          if ('transmission' in material) material.transmission = 0;
          material.color.set('#c6d9dd');
          node.castShadow = false;
        }
        if (/Interior|Leather|Dashboard/i.test(name)) {
          material.roughness = Math.max(material.roughness, 0.55);
          material.envMapIntensity = 1.6;
        }
        if ((id === 'porsche' && name === 'black') || (id === 'bmw' && name === 'Cover')) {
          // These source cabin shells have black metallic defaults. A charcoal
          // dielectric makes their modeled seats and dashboard readable.
          material.color.set('#3e423b');
          material.metalness = 0;
          material.roughness = .75;
          if ('specularIntensity' in material) material.specularIntensity = .4;
          material.envMapIntensity = 1.5;
        }
        if (id === 'ferrari') {
          // The source uses simple placeholder surface values; give each surface
          // its appropriate response without replacing the model's geometry.
          if (/Leather|Interior|Carpet|Carbon|plastic|Tires/.test(name)) {
            material.metalness = 0;
            material.color.set(name === 'Leather_red' ? '#663c32' : name === 'Interior_light' ? '#4b4842' : '#262925');
            material.roughness = name === 'Carbon_Fiber' ? 0.42 : 0.78;
          }
          if (/metal_/.test(name)) {
            material.color.set('#b8bdb6');
            material.metalness = 0.9;
            material.roughness = 0.27;
          }
        }
        return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(fixMaterial) : fixMaterial(node.material);
    });
    return {root, paint:[...paints]};
  }

  tween(target, values, duration = 1) {
    if (this.reducedMotion || !window.gsap || duration === 0) {
      Object.assign(target, values);
      this.invalidate();
      return null;
    }
    let tween;
    tween = window.gsap.to(target, { ...values, duration, ease:'power2.inOut', overwrite:true, onUpdate:() => this.invalidate(), onComplete:() => this.tweens.delete(tween), onInterrupt:() => this.tweens.delete(tween) });
    this.tweens.add(tween);
    return tween;
  }

  stopCameraTween() {
    this.cameraTween?.kill();
    this.targetTween?.kill();
    this.fovTween?.kill();
    this.lookTween?.kill();
    [this.cameraTween,this.targetTween,this.fovTween,this.lookTween].forEach(t => this.tweens.delete(t));
    this.transitioning = false;
    this.controls.enabled = this.mode === 'exterior';
  }

  exteriorPosition(angle = 'hero') {
    const mobile = this.canvas.clientWidth < 800;
    const positions = { hero:[6.6,3.3,-7.4], front:[0,2.1,-10.1], side:[10,2.4,0], rear:[-5.8,3,8.4] };
    const p = new THREE.Vector3(...positions[angle]);
    if (mobile) p.multiplyScalar(this.canvas.clientWidth < 540 ? 1.02 : .96);
    return p;
  }

  setView(mode, animate = true) {
    if (!this.car) return;
    this.stopCameraTween();
    this.mode = mode;
    this.setRotate(false);
    this.controls.enabled = false;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
    this.transitioning = true;
    const duration = animate ? 1.35 : 0;
    const isInterior = mode === 'interior';
    const position = isInterior ? new THREE.Vector3(...CARS[this.currentId].seat).add(new THREE.Vector3(0, .285, 0)) : this.exteriorPosition();
    this.look.yaw = 0;
    this.look.pitch = -0.17;
    const target = isInterior ? position.clone().add(new THREE.Vector3(0,-0.17,-1)) : new THREE.Vector3(0,.6,0);
    this.cameraTween = this.tween(this.camera.position, {x:position.x,y:position.y,z:position.z},duration);
    this.targetTween = this.tween(this.controls.target, {x:target.x,y:target.y,z:target.z},duration);
    this.fovTween = this.tween(this.camera, {fov:isInterior ? 78 : this.exteriorFov()},duration);
    this.cabinLight.position.copy(position).add(new THREE.Vector3(0,.08,-.2));
    this.tween(this.cabinLight,{intensity:isInterior ? 0.8 : 0},duration);
    const finish = () => {
      this.transitioning = false;
      this.camera.updateProjectionMatrix();
      this.controls.enabled = !isInterior;
      if (isInterior) this.updateLook();
      else this.controls.update();
      this.invalidate();
    };
    if (this.fovTween) this.fovTween.eventCallback('onComplete', () => {this.tweens.delete(this.fovTween); finish();});
    else finish();
    this.invalidate();
  }

  setAngle(angle) {
    this.stopCameraTween();
    this.setRotate(false);
    this.angle = angle;
    if (this.mode === 'interior') {
      const angles = {hero:[0,-.17], front:[0,-.38], side:[1.15,-.18], rear:[Math.PI,-.15]};
      const [yaw,pitch] = angles[angle];
      this.lookTween = this.tween(this.look,{yaw,pitch},.9);
      this.updateLook();
    } else {
      const p = this.exteriorPosition(angle);
      this.transitioning = true;
      this.controls.enabled = false;
      this.cameraTween = this.tween(this.camera.position,{x:p.x,y:p.y,z:p.z},1);
      this.targetTween = this.tween(this.controls.target,{x:0,y:.6,z:0},1);
      const finish = () => { this.transitioning = false;this.controls.enabled = true;this.controls.update();this.invalidate(); };
      if (this.cameraTween) this.cameraTween.eventCallback('onComplete',()=>{this.tweens.delete(this.cameraTween);finish();});
      else finish();
    }
    this.invalidate();
  }

  setColor(color, animate = true) {
    this.color = color;
    const target = new THREE.Color(color);
    this.paint?.forEach(material => this.tween(material.color,{r:target.r,g:target.g,b:target.b},animate ? .6 : 0));
    this.invalidate();
  }

  setNight(night) {
    this.night = night;
    this.tween(this.scene,{environmentIntensity:night ? .45 : .85},.8);
    this.tween(this.ambient,{intensity:night ? .35 : .85},.8);
    this.tween(this.key,{intensity:night ? 2.8 : 2.3},.8);
    this.tween(this.rim,{intensity:night ? 2 : 1.3},.8);
    const c = new THREE.Color(night ? '#525d4c' : '#d1d1c4');
    this.tween(this.stage.material.color,{r:c.r,g:c.g,b:c.b},.8);
    this.invalidate();
  }

  setRotate(value) {
    this.rotating = Boolean(value && this.mode === 'exterior' && !this.reducedMotion);
    this.controls.autoRotate = this.rotating;
    this.callbacks.onRotate?.(this.rotating);
    this.invalidate();
  }

  zoom(direction) {
    this.stopCameraTween();
    if (this.mode === 'interior') {
      this.camera.fov = clamp(this.camera.fov - direction * 5, 50, 95);
      this.camera.updateProjectionMatrix();
    } else {
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.setLength(clamp(offset.length() * (direction > 0 ? .9 : 1.1),this.controls.minDistance,this.controls.maxDistance));
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    }
    this.invalidate();
  }

  updateLook() {
    const {yaw,pitch} = this.look;
    this.camera.lookAt(this.camera.position.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch))));
    this.invalidate();
  }

  bindInput() {
    const pointers = new Map();
    let pinchDistance = 0;
    this.canvas.addEventListener('pointerdown', event => {
      this.canvas.focus({preventScroll:true});
      if (this.mode !== 'interior') return;
      this.stopCameraTween();
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      this.canvas.setPointerCapture(event.pointerId);
      this.callbacks.onInteraction?.();
    });
    this.canvas.addEventListener('pointermove', event => {
      if (this.mode !== 'interior' || !pointers.has(event.pointerId)) return;
      const old = pointers.get(event.pointerId);
      const dx = event.clientX-old.x, dy = event.clientY-old.y;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if (pointers.size === 2) {
        const [a,b] = [...pointers.values()];
        const distance = Math.hypot(a.x-b.x,a.y-b.y);
        if (pinchDistance) this.camera.fov = clamp(this.camera.fov-(distance-pinchDistance)*.15,50,95);
        pinchDistance = distance;
        this.camera.updateProjectionMatrix();
      } else {
        this.look.yaw -= dx*.004;
        this.look.pitch = clamp(this.look.pitch+dy*.004,-1.05,.7);
      }
      this.updateLook();
    });
    const release = event => {pointers.delete(event.pointerId);pinchDistance = 0;};
    this.canvas.addEventListener('pointerup',release);
    this.canvas.addEventListener('pointercancel',release);
    this.canvas.addEventListener('lostpointercapture',release);
    this.canvas.addEventListener('wheel',event => {
      if (this.mode !== 'interior') return;
      event.preventDefault();
      this.zoom(event.deltaY < 0 ? 1 : -1);
    },{passive:false});
    this.canvas.addEventListener('keydown',event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key)) return;
      event.preventDefault();
      if (!this.car) return;
      if (event.key === 'Home') {this.callbacks.onReset?.();return;}
      if (['+','=','-'].includes(event.key)) {this.zoom(event.key === '-' ? -1 : 1);return;}
      this.stopCameraTween();
      this.setRotate(false);
      this.callbacks.onInteraction?.();
      const horizontal = event.key === 'ArrowLeft' ? -.12 : event.key === 'ArrowRight' ? .12 : 0;
      const vertical = event.key === 'ArrowUp' ? .08 : event.key === 'ArrowDown' ? -.08 : 0;
      if (this.mode === 'interior') {
        this.look.yaw += horizontal;
        this.look.pitch = clamp(this.look.pitch+vertical,-1.05,.7);
        this.updateLook();
      } else {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const sphere = new THREE.Spherical().setFromVector3(offset);
        sphere.theta -= horizontal;
        sphere.phi = clamp(sphere.phi-vertical,this.controls.minPolarAngle,this.controls.maxPolarAngle);
        this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sphere));
        this.controls.update();
      }
      this.invalidate();
    });
  }

  exteriorFov() { return this.canvas.clientWidth < 540 ? 36 : this.canvas.clientWidth < 800 ? 38 : 35; }
  resize() {
    const width = this.canvas.parentElement.clientWidth, height = this.canvas.parentElement.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width,height,false);
    this.camera.aspect = width/height;
    if (this.mode === 'exterior' && !this.transitioning) this.camera.fov = this.exteriorFov();
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
  invalidate() { this.dirty = true; }
  frame(time) {
    if (document.hidden) return;
    const delta = this.lastTime ? Math.min((time-this.lastTime)/1000,.05) : 1/60;
    this.lastTime = time;
    if (this.transitioning) {this.camera.lookAt(this.controls.target);this.camera.updateProjectionMatrix();this.dirty = true;}
    else if (this.mode === 'exterior') this.controls.update(delta);
    else if (this.lookTween?.isActive()) this.updateLook();
    if (this.dirty || this.rotating || this.tweens.size) {
      this.renderer.render(this.scene,this.camera);
      this.dirty = false;
    }
  }

  snapshot() {
    this.renderer.render(this.scene,this.camera);
    const output = document.createElement('canvas');
    output.width = this.canvas.width;
    output.height = this.canvas.height;
    const ctx = output.getContext('2d');
    ctx.fillStyle = this.night ? '#282e2a' : '#eae9e2';
    ctx.fillRect(0,0,output.width,output.height);
    ctx.drawImage(this.canvas,0,0);
    ctx.fillStyle = this.night ? '#e6e9dc' : '#282d26';
    ctx.font = `${Math.max(14,output.width*.018)}px "DM Sans", sans-serif`;
    ctx.fillText(`ATELIER MOTOR / ${CARS[this.currentId].title}`,output.width*.04,output.height*.08);
    return new Promise(resolve => output.toBlob(resolve,'image/png'));
  }
}
