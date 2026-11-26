// The technical paper's interactive rig: phones round the twin's dress form, their fields of view,
// the two outline rays each one draws at one instant, and the rows of LiDAR dots from phone A.
// Loads only when the visitor asks for it. Millimetres throughout; three.js is y-up.
import * as THREE from "three";
import { OrbitControls } from "./OrbitControls.js";
import { GLTFLoader } from "./GLTFLoader.js";

const R = 1000;                       // phones from the axis
const HALF_H = 26.5, HALF_V = 33.5;   // portrait field, degrees
const LAYOUTS = {
  "0 / 90": [0, 90], "0 / 60": [0, 60], "0 / 120": [0, 120], "0 / 180": [0, 180],
  "0 / 120 / 240": [0, 120, 240], "0 / 90 / 235": [0, 90, 235], "0 / 90 / 180": [0, 90, 180],
};
const ROWS = { "off": 0, "576 dots (12–14 Pro)": 2.48, "~112 dots (15 Pro on)": 5.62 };
const COL = { phone: 0x3a64a8, ray: 0xd9822b, bad: 0xb0408a, axis: 0x4e5c57, mast: 0x9aa5a0 };

export async function start(box, ui) {
  const W = () => box.clientWidth, H = () => box.clientHeight;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(W(), H());
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  box.querySelector(".load")?.remove(); box.querySelector(":scope > img")?.remove();
  r.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%"; box.prepend(r.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50605a, 1.4));
  const d = new THREE.DirectionalLight(0xffffff, 2.0); d.position.set(1, 2, 1.5); scene.add(d);
  const cam = new THREE.PerspectiveCamera(32, W() / H(), 10, 30000);
  const ctl = new OrbitControls(cam, r.domElement); ctl.enableDamping = true;

  // the body, with a shader that paints the LiDAR rows (heights in a uniform array)
  const uni = { rows: { value: new Float32Array(64) }, nRows: { value: 0 } };
  const paint = m => { m.onBeforeCompile = s => {
    s.uniforms.rows = uni.rows; s.uniforms.nRows = uni.nRows;
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying float vY;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvY = (modelMatrix * vec4(transformed, 1.0)).y;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vY;\nuniform float rows[64];\nuniform int nRows;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\nfor (int i = 0; i < 64; i++) { if (i >= nRows) break; if (abs(vY - rows[i]) < 2.2) gl_FragColor.rgb = vec3(0.85, 0.51, 0.17); }");
  }; return m; };
  const mat = paint(new THREE.MeshStandardMaterial({ color: 0xebe5d6, roughness: 0.85 }));
  const g = await new GLTFLoader().loadAsync("/models/form.glb");
  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; root.add(g.scene); scene.add(root);
  g.scene.traverse(o => { if (o.isMesh) { o.geometry.computeVertexNormals(); o.material = mat; } });
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root), c = bb.getCenter(new THREE.Vector3());
  const yLo = bb.min.y, yHi = bb.max.y, axis = new THREE.Vector3(c.x, 0, c.z);
  // world vertices once, for the outline rays
  const V = [];
  g.scene.traverse(o => { if (o.isMesh) { const p = o.geometry.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 2) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); V.push(v.x, v.y, v.z); } } });
  const yOut = yLo + 0.32 * (yHi - yLo);              // about the waist: where the outline rays are drawn
  const band = []; for (let i = 0; i < V.length; i += 3) if (Math.abs(V[i + 1] - yOut) < 6) band.push([V[i], V[i + 2]]);

  // fixed scenery: the axis, the circle the masts stand on
  const line = (pts, color, dashed) => { const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const m = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 25, gapSize: 18 }) : new THREE.LineBasicMaterial({ color });
    const l = new THREE.Line(geo, m); if (dashed) l.computeLineDistances(); return l; };
  const yFloor = yLo - 750;
  scene.add(line([new THREE.Vector3(axis.x, yFloor, axis.z), new THREE.Vector3(axis.x, yHi + 250, axis.z)], COL.axis, true));
  const ring = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * 2 * Math.PI; ring.push(new THREE.Vector3(axis.x + R * Math.sin(a), yFloor, axis.z - R * Math.cos(a))); }
  scene.add(line(ring, COL.mast, true));
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(240, 240, 20, 64), new THREE.MeshStandardMaterial({ color: 0xd9ddd6, roughness: 1 }));
  disc.position.set(axis.x, yFloor + 10, axis.z); scene.add(disc);

  const rig = new THREE.Group(); scene.add(rig);
  const heights = [yLo + 70, yHi + 120, yLo + 0.6 * (yHi - yLo)];   // A at the navel, B above the shoulders, C at the chest
  const tilts = [10, -12, 0];
  let layout = "0 / 90", rowsKey = "off";

  function dirTo(az) { return new THREE.Vector3(Math.sin(az), 0, -Math.cos(az)); }
  function build() {
    rig.clear();
    const az = LAYOUTS[layout].map(a => a * Math.PI / 180);
    const n = az.length, bad = new Array(n).fill(false);
    let minOff = 180;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dl = Math.abs(((LAYOUTS[layout][i] - LAYOUTS[layout][j] + 540) % 360) - 180), off = (180 - dl) / 2;
      minOff = Math.min(minOff, off); if (off < HALF_H) { bad[i] = bad[j] = true; } }
    az.forEach((a, i) => {
      const C = axis.clone().add(dirTo(a).multiplyScalar(R)); C.y = heights[i];
      const fwd = axis.clone().sub(C).setY(0).normalize(), t = tilts[i] * Math.PI / 180;
      const f = fwd.clone().multiplyScalar(Math.cos(t)).add(new THREE.Vector3(0, Math.sin(t), 0)).normalize();
      const rt = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(rt, f);
      const color = bad[i] ? COL.bad : COL.phone;
      // the phone, its mast, its field and its optical axis
      const ph = new THREE.Mesh(new THREE.BoxGeometry(72, 150, 9), new THREE.MeshStandardMaterial({ color }));
      ph.position.copy(C); ph.lookAt(C.clone().add(f)); rig.add(ph);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, C.y - yFloor + 200, 16), new THREE.MeshStandardMaterial({ color: COL.mast }));
      mast.position.set(C.x - fwd.x * 40, (C.y + yFloor + 200) / 2, C.z - fwd.z * 40); rig.add(mast);
      const L = 1200, th = Math.tan(HALF_H * Math.PI / 180), tv = Math.tan(HALF_V * Math.PI / 180);
      const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sy]) =>
        C.clone().add(f.clone().add(rt.clone().multiplyScalar(sx * th)).add(up.clone().multiplyScalar(sy * tv)).multiplyScalar(L)));
      corners.forEach(k => rig.add(line([C, k], color)));
      rig.add(line([...corners, corners[0]], color));
      rig.add(line([C, C.clone().add(f.clone().multiplyScalar(R + 400))], color, true));
      const cv = document.createElement("canvas"); cv.width = cv.height = 64; const cx = cv.getContext("2d");
      cx.fillStyle = bad[i] ? "#b0408a" : "#3a64a8"; cx.beginPath(); cx.arc(32, 32, 30, 0, 7); cx.fill();
      cx.fillStyle = "#fff"; cx.font = "bold 38px sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText("ABC"[i], 32, 34);
      const sp_ = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, toneMapped: false }));
      sp_.scale.set(110, 110, 1); sp_.position.copy(C).add(new THREE.Vector3(0, 150, 0)); rig.add(sp_);
      // outline rays at the waist: the extreme azimuths of the body's section as seen from this phone
      let lo = [Infinity, null], hi = [-Infinity, null];
      for (const [x, z] of band) { const v = new THREE.Vector3(x - C.x, 0, z - C.z); const s = Math.atan2(v.dot(rt), v.dot(fwd));
        if (s < lo[0]) lo = [s, [x, z]]; if (s > hi[0]) hi = [s, [x, z]]; }
      for (const [, p] of [lo, hi]) { if (!p) continue; const P = new THREE.Vector3(p[0], yOut, p[1]);
        rig.add(line([C, C.clone().add(P.clone().sub(C).multiplyScalar(1.6))], COL.ray));
        const dot = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: COL.ray })); dot.position.copy(P); rig.add(dot); }
    });
    // LiDAR rows from phone A: fixed elevations, so fixed heights on the body as it turns
    const sp = ROWS[rowsKey]; let k = 0;
    if (sp) { const y0 = heights[0], t0 = tilts[0], Ds = R - 120;
      for (let e = -HALF_V; e <= HALF_V && k < 64; e += sp) { uni.rows.value[k++] = y0 + Ds * Math.tan((t0 + e) * Math.PI / 180); } }
    uni.nRows.value = k;
    // readouts
    const dirs = LAYOUTS[layout].flatMap(a => [a + 90, a - 90]).map(a => ((a % 360) + 360) % 360).sort((x, y) => x - y);
    let gap = 0; dirs.forEach((a, i) => { gap = Math.max(gap, ((i + 1 < dirs.length ? dirs[i + 1] : dirs[0] + 360) - a)); });
    ui.out.innerHTML = `Widest outline gap at one instant: <b>${gap.toFixed(0)}°</b> · nearest phone to another's axis: ` +
      `<b class="${minOff < HALF_H ? "bad" : ""}">${minOff.toFixed(1)}°</b> ${minOff < HALF_H ? "(inside its field of view: shown in magenta)" : "(outside the ±26.5° field)"}`;
  }

  const mk = (el, opts, get, set) => { el.innerHTML = ""; for (const k of Object.keys(opts)) { const b = document.createElement("button");
    b.type = "button"; b.textContent = k; b.setAttribute("aria-pressed", String(k === get())); b.onclick = () => { set(k);
      for (const x of el.children) x.setAttribute("aria-pressed", String(x.textContent === k)); build(); }; el.append(b); } };
  mk(ui.layouts, LAYOUTS, () => layout, k => layout = k);
  mk(ui.rows, ROWS, () => rowsKey, k => rowsKey = k);
  ui.panel.hidden = false;
  build();

  ctl.target.set(axis.x, (yLo + yHi) / 2, axis.z);
  cam.position.set(axis.x + 3300, yHi + 1900, axis.z - 3000); ctl.update();
  addEventListener("resize", () => { cam.aspect = W() / H(); cam.updateProjectionMatrix(); r.setSize(W(), H()); });
  r.setAnimationLoop(() => { ctl.update(); r.render(scene, cam); });
}
