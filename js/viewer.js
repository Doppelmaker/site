// The 3D viewer on the home page: loads only when the visitor asks for it.
import * as THREE from "three";
import { OrbitControls } from "./OrbitControls.js";
import { GLTFLoader } from "./GLTFLoader.js";

export async function start(box) {
  const W = () => box.clientWidth, H = () => box.clientHeight;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(W(), H());
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  box.querySelector(".load")?.remove(); r.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%"; box.prepend(r.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50605a, 1.4));
  const d = new THREE.DirectionalLight(0xffffff, 2.0); d.position.set(1, 2, 1.5); scene.add(d);
  const f = new THREE.DirectionalLight(0xdfe9ff, 0.7); f.position.set(-1.5, 0.5, -1); scene.add(f);
  const cam = new THREE.PerspectiveCamera(30, W() / H(), 10, 20000);
  const ctl = new OrbitControls(cam, r.domElement); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.2;
  const core = new THREE.MeshStandardMaterial({ color: 0xebe5d6, roughness: 0.8 });
  const shell = new THREE.MeshStandardMaterial({ color: 0x2f7d6a, roughness: 0.9 });
  const g = await new GLTFLoader().loadAsync("/models/form.glb");
  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; root.add(g.scene); scene.add(root);
  const parts = {};
  g.scene.traverse(o => { if (o.isMesh) { o.geometry.computeVertexNormals(); o.material = o.name.endsWith("core") ? core : shell; parts[o.name] = o; } });
  const home = Object.fromEntries(Object.entries(parts).map(([k, o]) => [k, o.position.clone()]));
  const spread = { P1: [0, 0, -40], P2L: [-70, 0, 110], P2R: [70, 0, 110], AL: [-170, 0, 130], AR: [170, 0, 130] };
  let t = 0, target = 0;
  const place = () => { for (const [k, o] of Object.entries(parts)) { const s = spread[k.split("-")[0]] || [0, 0, 0];
    o.position.set(home[k].x + s[0] * t, home[k].y + s[1] * t, home[k].z + s[2] * t); } };
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root), c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3()).length();
  ctl.target.copy(c); cam.position.set(c.x - size * 0.6, c.y + size * 0.25, c.z - size * 2.1); ctl.update();
  const btn = document.getElementById("explode");
  if (btn) { btn.hidden = false; btn.onclick = () => { target = target ? 0 : 1; btn.textContent = target ? "Put it together" : "Pull it apart"; }; }
  addEventListener("resize", () => { cam.aspect = W() / H(); cam.updateProjectionMatrix(); r.setSize(W(), H()); });
  r.setAnimationLoop(() => { t += (target - t) * 0.08; place(); ctl.update(); r.render(scene, cam); });
}
