// The "Every GPU on campus, on one map" section: a 3D model of the University of St. Thomas
// St. Paul campus with example GPU cards over their buildings. Loaded only when the section
// scrolls into view (see main.js). Everything is in this repository: three.js 0.160.0 is in
// vendor/, and the map data in campus-data.js. Nothing is fetched from another address.
//
// The scene below is the OpenCompute Lab's own GPUs page code (frontend/src/map/campusScene.ts),
// converted to plain JavaScript. The GPUs here are examples, never real lab data.

// No color coding: only a busy card's fans spin, a free card's are still, a paused card has a
// moon, an offline card is faded and parked low (the lab's frontend/src/map/gpuMarkers.ts).
const STATUS_INFO = {
  free: { label: "Free", legend: "fans still", look: "fan", fanSpeed: 0 },
  busy: { label: "Busy", legend: "fans spinning", look: "fan", fanSpeed: 3.4 },
  paused: { label: "Paused", legend: "off hours, moon", look: "moon", fanSpeed: 0 },
  offline: { label: "Offline", legend: "faded and powered down", look: "power", fanSpeed: 0 },
};
const rotate = (turn) => `transform="rotate(${turn} 12 12)"`;
const FAN_BLADE = "M12 12C11.2 8.6 12.4 5.2 15.6 3.6C17 6.8 15.6 10.4 12 12Z";
const ICON_PATHS = {
  fan:
    '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    [0, 120, 240].map((turn) => `<path d="${FAN_BLADE}" fill="currentColor" ${rotate(turn)}/>`).join("") +
    '<circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
  moon: '<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1Z" fill="currentColor"/>',
  power:
    '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<path d="M12 3.5v8"/><path d="M6.6 7a7.6 7.6 0 1 0 10.8 0"/></g>',
};
function statusIconSvg(status) {
  const paths = ICON_PATHS[STATUS_INFO[status].look];
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">${paths}</svg>`;
}
function statusIcon(status) {
  const i = document.createElement("i");
  i.className = `status-icon status-icon--${status}`;
  i.innerHTML = statusIconSvg(status);
  return i;
}

import * as THREE from "./vendor/three-0.160.0.min.js";
import { OrbitControls, mergeGeometries } from "./vendor/three-0.160.0.min.js";
const MIDNIGHT = 1583167;
const SLAB_X = 760;
const SLAB_Y = 620;
const CARD = { w: 46, h: 17.3, d: 5.4 };
const CARD_SCALE = 1.45;
const HOVER_HEIGHT = 42;
const BADGE_SIZE = 11;
const SIDE_BY_SIDE = 80;
const DISPLAY_FONT = '"Inter Tight", "Inter", Arial, sans-serif';
function shapeFromRings(rings) {
  const shape = new THREE.Shape(rings[0].map(([x, y]) => new THREE.Vector2(x, y)));
  for (const hole of rings.slice(1)) {
    shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  }
  return shape;
}
function flat(rings, y) {
  const geometry = new THREE.ShapeGeometry(shapeFromRings(rings));
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}
function extrude(rings, height) {
  const geometry = new THREE.ExtrudeGeometry(shapeFromRings(rings), {
    depth: height,
    bevelEnabled: false
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
function ribbon(points, width, y) {
  const positions = [];
  const index = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const length = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / length * (width / 2);
    const ny = (x2 - x1) / length * (width / 2);
    const base = positions.length / 3;
    positions.push(x1 + nx, y, -(y1 + ny), x1 - nx, y, -(y1 - ny));
    positions.push(x2 + nx, y, -(y2 + ny), x2 - nx, y, -(y2 - ny));
    index.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function badgeTexture(status) {
  return canvasTexture(128, 128, (g, w) => {
    g.fillStyle = "rgba(250,248,242,.94)";
    g.beginPath();
    g.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(24,40,63,.25)";
    g.lineWidth = 3;
    g.stroke();
    g.save();
    g.translate(w * 0.2, w * 0.2);
    g.scale(w * 0.6 / 24, w * 0.6 / 24);
    g.fillStyle = "#18283F";
    g.strokeStyle = "#18283F";
    g.lineWidth = 2;
    g.lineCap = "round";
    for (const [, d] of statusIconSvg(status).matchAll(/<path d="([^"]+)"/g)) {
      const path = new Path2D(d);
      if (status === "offline") g.stroke(path);
      else g.fill(path);
    }
    g.restore();
  });
}
function cardMaterials() {
  const front = canvasTexture(1024, 384, (g, w, h) => {
    g.fillStyle = "#18283F";
    g.fillRect(0, 0, w, h);
    g.save();
    g.translate(w * 0.495, h / 2);
    g.transform(1, 0, -Math.tan(16 * Math.PI / 180), 1, 0, 0);
    g.fillStyle = "#4267AB";
    g.fillRect(-w * 8e-3, -h * 0.6, w * 0.016, h * 1.2);
    g.restore();
    g.strokeStyle = "rgba(250,248,242,.22)";
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
  });
  const back = canvasTexture(1024, 384, (g, w, h) => {
    g.fillStyle = "#FAF8F2";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(24,40,63,.25)";
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#18283F";
    g.font = `700 84px ${DISPLAY_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("OpenCompute Lab", w / 2, h / 2 + 4);
  });
  const top = canvasTexture(1024, 128, (g, w, h) => {
    g.fillStyle = "#18283F";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#4267AB";
    g.fillRect(w - 120, h * 0.3, 70, h * 0.4);
  });
  const bottom = canvasTexture(1024, 128, (g, w, h) => {
    g.fillStyle = "#18283F";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#C9A44A";
    for (let i = 0; i < 22; i++) g.fillRect(140 + i * 26, h * 0.3, 14, h * 0.4);
  });
  const left = canvasTexture(128, 384, (g, w, h) => {
    g.fillStyle = "#18283F";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(250,248,242,.3)";
    for (let i = 1; i <= 9; i++) g.fillRect(16, i * h / 10, w - 32, 3);
  });
  const right = canvasTexture(128, 384, (g, w, h) => {
    g.fillStyle = "#DCEAF5";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#18283F";
    for (const f of [0.36, 0.5, 0.64]) g.fillRect(w * 0.27, h * f - 14, w * 0.46, 28);
  });
  const fanBase = canvasTexture(256, 256, (g) => {
    g.fillStyle = "#18283F";
    g.beginPath();
    g.arc(128, 128, 118, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(220,234,245,.55)";
    g.lineWidth = 4;
    g.stroke();
  });
  const blades = canvasTexture(256, 256, (g) => {
    g.translate(128, 128);
    g.fillStyle = "#DCEAF5";
    for (let i = 0; i < 7; i++) {
      g.save();
      g.rotate(i * Math.PI * 2 / 7);
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(5, -38, 23, -71, 46, -89);
      g.bezierCurveTo(38, -54, 26, -26, 0, 0);
      g.fill();
      g.restore();
    }
    g.fillStyle = "#FAF8F2";
    g.beginPath();
    g.arc(0, 0, 28, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#4267AB";
    g.beginPath();
    g.arc(0, 0, 8, 0, Math.PI * 2);
    g.fill();
  });
  const body = [right, left, top, bottom, front, back].map(
    (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.45, metalness: 0.15 })
  );
  return {
    body,
    ghost: body.map((material) => {
      const faded = material.clone();
      faded.transparent = true;
      faded.opacity = 0.32;
      faded.depthWrite = false;
      return faded;
    }),
    fanBase: new THREE.MeshStandardMaterial({ map: fanBase, transparent: true, roughness: 0.5 }),
    blades: new THREE.MeshStandardMaterial({
      map: blades,
      transparent: true,
      roughness: 0.4,
      side: THREE.DoubleSide
    })
  };
}
function createCampusScene(host, tagsHost, data, handlers) {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };
  const renderer = keep(new THREE.WebGLRenderer({ antialias: true }));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(15331060);
  scene.fog = new THREE.Fog(15331060, 1800, 3600);
  const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 2, 8e3);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.38;
  controls.minDistance = 120;
  controls.maxDistance = 2400;
  controls.screenSpacePanning = false;
  scene.add(new THREE.HemisphereLight(16777215, 13227750, 1.25));
  const sun = new THREE.DirectionalLight(16774888, 2.1);
  sun.position.set(-500, 900, 420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 10, far: 2600 });
  sun.shadow.bias = -4e-4;
  sun.shadow.normalBias = 0.6;
  scene.add(sun);
  const slab = new THREE.Mesh(
    keep(new THREE.BoxGeometry(SLAB_X * 2, 16, SLAB_Y * 2)),
    [0, 1, 2, 3, 4, 5].map(
      (i) => keep(new THREE.MeshStandardMaterial({ color: i === 2 ? 15196885 : MIDNIGHT, roughness: 0.9 }))
    )
  );
  slab.position.y = -8.02;
  slab.receiveShadow = true;
  scene.add(slab);
  const haloTexture = keep(
    canvasTexture(256, 256, (g) => {
      const fade = g.createRadialGradient(128, 128, 30, 128, 128, 128);
      fade.addColorStop(0, "rgba(24,40,63,.22)");
      fade.addColorStop(1, "rgba(24,40,63,0)");
      g.fillStyle = fade;
      g.fillRect(0, 0, 256, 256);
    })
  );
  const halo = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(SLAB_X * 2.6, SLAB_Y * 2.6)),
    keep(new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, depthWrite: false }))
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -60;
  scene.add(halo);
  const grid = new THREE.GridHelper(6e3, 120, 12110044, 13621991);
  grid.position.y = -61;
  scene.add(grid);
  disposables.push(grid.geometry, grid.material);
  const inSlab = (rings) => rings[0].every(([x, y]) => Math.abs(x) < SLAB_X && Math.abs(y) < SLAB_Y);
  const landColors = {
    campus: 14478069,
    field: 13887186,
    track: 15190452,
    park: 14280915
  };
  const landByType = /* @__PURE__ */ new Map();
  for (const land of data.lu) {
    const y = land.t === "campus" ? 0.15 : land.t === "track" ? 0.45 : 0.3;
    landByType.set(land.t, [...landByType.get(land.t) ?? [], flat(land.r, y)]);
  }
  for (const [type, parts] of landByType) {
    const mesh = new THREE.Mesh(
      keep(mergeGeometries(parts)),
      keep(new THREE.MeshStandardMaterial({ color: landColors[type] ?? 14280915, roughness: 1 }))
    );
    parts.forEach((part) => part.dispose());
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const waterMaterial = keep(new THREE.MeshStandardMaterial({ color: 10337248, roughness: 0.3 }));
  for (const water of data.w) scene.add(new THREE.Mesh(keep(flat(water, 0.5)), waterMaterial));
  const streets = [];
  const paths = [];
  for (const road of data.rd) {
    (road.w >= 4 ? streets : paths).push(ribbon(road.p, road.w, road.w >= 4 ? 0.7 : 0.8));
  }
  for (const [parts, color] of [
    [streets, 16777215],
    [paths, 16052714]
  ]) {
    if (parts.length === 0) continue;
    const mesh = new THREE.Mesh(
      keep(mergeGeometries(parts)),
      keep(new THREE.MeshStandardMaterial({ color, roughness: 1 }))
    );
    parts.forEach((part) => part.dispose());
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const campusMaterial = keep(new THREE.MeshStandardMaterial({ color: 16776696, roughness: 0.7 }));
  const campusHover = keep(
    new THREE.MeshStandardMaterial({
      color: 16777215,
      roughness: 0.6,
      emissive: 4351915,
      emissiveIntensity: 0.18
    })
  );
  const edgeMaterial = keep(
    new THREE.LineBasicMaterial({ color: MIDNIGHT, transparent: true, opacity: 0.55 })
  );
  const campusMeshes = [];
  const meshesByName = /* @__PURE__ */ new Map();
  const neighborhood = [];
  for (const building of data.b) {
    if (!inSlab(building.r)) continue;
    const geometry = extrude(building.r, building.h);
    if (!building.c) {
      neighborhood.push(geometry);
      continue;
    }
    keep(geometry);
    const mesh = new THREE.Mesh(geometry, campusMaterial);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.building = building.n ?? "";
    mesh.add(new THREE.LineSegments(keep(new THREE.EdgesGeometry(geometry, 30)), edgeMaterial));
    scene.add(mesh);
    campusMeshes.push(mesh);
    if (building.n) meshesByName.set(building.n, [...meshesByName.get(building.n) ?? [], mesh]);
  }
  if (neighborhood.length > 0) {
    const hood = new THREE.Mesh(
      keep(mergeGeometries(neighborhood)),
      keep(
        new THREE.MeshStandardMaterial({
          color: 13227491,
          roughness: 0.95,
          transparent: true,
          opacity: 0.55
        })
      )
    );
    neighborhood.forEach((part) => part.dispose());
    hood.castShadow = hood.receiveShadow = true;
    scene.add(hood);
  }
  const campusBox = new THREE.Box3();
  campusMeshes.forEach((mesh) => campusBox.expandByObject(mesh));
  const campusCenter = campusBox.isEmpty() ? new THREE.Vector3() : campusBox.getCenter(new THREE.Vector3());
  const shift = host.clientWidth > 720 ? 40 : 0;
  controls.target.set(campusCenter.x - shift, 0, campusCenter.z);
  camera.position.set(campusCenter.x - shift + 480, 640, campusCenter.z + 800);
  controls.update();
  const materials = cardMaterials();
  materials.body.forEach((m) => keep(m));
  keep(materials.fanBase);
  keep(materials.blades);
  materials.ghost.forEach((m) => keep(m));
  const ghostFanBase = keep(materials.fanBase.clone());
  const ghostBlades = keep(materials.blades.clone());
  for (const faded of [ghostFanBase, ghostBlades]) {
    faded.opacity = 0.32;
    faded.depthWrite = false;
  }
  const badgeMaterial = (status) => keep(new THREE.SpriteMaterial({ map: keep(badgeTexture(status)), depthTest: false }));
  const badgeMaterials = { paused: badgeMaterial("paused"), offline: badgeMaterial("offline") };
  const ringMaterial = keep(
    new THREE.MeshBasicMaterial({ color: MIDNIGHT, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  const lineMaterial = keep(
    new THREE.LineDashedMaterial({ color: MIDNIGHT, dashSize: 2, gapSize: 2, transparent: true, opacity: 0.5 })
  );
  const bodyGeometry = keep(new THREE.BoxGeometry(CARD.w, CARD.h, CARD.d));
  const fanGeometry = keep(new THREE.CircleGeometry(CARD.h * 0.41, 40));
  const bladeGeometry = keep(new THREE.PlaneGeometry(CARD.h * 0.8, CARD.h * 0.8));
  const ringGeometry = keep(new THREE.RingGeometry(10, 13, 48));
  const objects = /* @__PURE__ */ new Map();
  let selected = null;
  function makeCard(faded) {
    const card = new THREE.Group();
    const body = new THREE.Mesh(bodyGeometry, faded ? materials.ghost : materials.body);
    body.castShadow = !faded;
    card.add(body);
    const fans = [];
    for (const x of [-CARD.w * 0.25, CARD.w * 0.25]) {
      const base = new THREE.Mesh(fanGeometry, faded ? ghostFanBase : materials.fanBase);
      base.position.set(x, 0, CARD.d / 2 + 0.05);
      card.add(base);
      const blades = new THREE.Mesh(bladeGeometry, faded ? ghostBlades : materials.blades);
      blades.position.set(x, 0, CARD.d / 2 + 0.12);
      card.add(blades);
      fans.push(blades);
    }
    card.scale.setScalar(CARD_SCALE);
    return { card, fans };
  }
  function removeObject(object) {
    scene.remove(object.holder, object.line);
    if (object.ring) scene.remove(object.ring);
    object.line.geometry.dispose();
    object.tag.remove();
  }
  function addObject(marker, slot, slots, phase) {
    const meshes = marker.building ? meshesByName.get(marker.building) : void 0;
    if (!meshes) return;
    const box = new THREE.Box3();
    meshes.forEach((mesh) => box.expandByObject(mesh));
    const roof = box.max.y;
    const x = (box.min.x + box.max.x) / 2 + (slot - (slots - 1) / 2) * SIDE_BY_SIDE;
    const z = (box.min.z + box.max.z) / 2;
    const offline = marker.status === "offline";
    const hover = offline ? HOVER_HEIGHT * 0.55 : HOVER_HEIGHT;
    const holder = new THREE.Group();
    holder.position.set(x, roof + hover, z);
    const { card, fans } = makeCard(offline);
    holder.add(card);
    if (marker.status === "paused" || offline) {
      const badge = new THREE.Sprite(badgeMaterials[marker.status]);
      badge.scale.setScalar(BADGE_SIZE);
      badge.position.set(CARD.w / 2, CARD.h / 2 + 1, CARD.d);
      badge.renderOrder = 2;
      card.add(badge);
    }
    holder.traverse((part) => {
      part.userData.marker = marker.id;
    });
    scene.add(holder);
    let ring = null;
    if (!offline) {
      ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, roof + 0.6, z);
      scene.add(ring);
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, roof + 0.6, z),
        new THREE.Vector3(x, roof + hover - 12, z)
      ]),
      lineMaterial
    );
    line.computeLineDistances();
    scene.add(line);
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "campus-tag";
    tag.dataset.status = marker.status;
    tag.append(statusIcon(marker.status), document.createTextNode(marker.title));
    tag.setAttribute("aria-label", `${marker.title}, ${STATUS_INFO[marker.status].label}`);
    tag.addEventListener("click", () => handlers.onSelect(marker.id));
    tagsHost.appendChild(tag);
    objects.set(marker.id, { marker, holder, card, fans, ring, line, tag, phase, roof });
  }
  function setMarkers(markers) {
    objects.forEach(removeObject);
    objects.clear();
    const perBuilding = /* @__PURE__ */ new Map();
    for (const marker of markers) {
      if (!marker.building) continue;
      perBuilding.set(marker.building, [...perBuilding.get(marker.building) ?? [], marker]);
    }
    let phase = 0;
    for (const group of perBuilding.values()) {
      group.forEach((marker, slot) => addObject(marker, slot, group.length, phase += 1.3));
    }
  }
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tip = document.createElement("div");
  tip.className = "campus-tip";
  tip.hidden = true;
  tagsHost.appendChild(tip);
  let hovered = null;
  let fly = null;
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    const targets = [...[...objects.values()].map((o) => o.holder), ...campusMeshes];
    const hits = raycaster.intersectObjects(targets, true);
    return hits.find((hit) => hit.object.userData.marker || hit.object.userData.building !== void 0) ?? null;
  }
  function onPointerMove(event) {
    if (event.pointerType !== "mouse") return;
    const hit = pick(event);
    let mesh = null;
    let text = null;
    const markerId = hit?.object.userData.marker;
    if (markerId) {
      const object = objects.get(markerId);
      if (object) text = `${object.marker.title} \xB7 ${STATUS_INFO[object.marker.status].label}`;
    } else if (hit?.object.userData.building) {
      mesh = hit.object;
      text = hit.object.userData.building;
    }
    if (hovered && hovered !== mesh) hovered.material = campusMaterial;
    hovered = mesh;
    if (mesh) mesh.material = campusHover;
    renderer.domElement.style.cursor = text ? "pointer" : "grab";
    if (text) {
      const rect = host.getBoundingClientRect();
      tip.hidden = false;
      tip.textContent = text;
      tip.style.left = `${event.clientX - rect.left}px`;
      tip.style.top = `${event.clientY - rect.top}px`;
    } else {
      tip.hidden = true;
    }
  }
  let down = null;
  function onPointerDown(event) {
    down = [event.clientX, event.clientY];
  }
  function onPointerUp(event) {
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 6) return;
    const hit = pick(event);
    const markerId = hit?.object.userData.marker;
    if (markerId) return handlers.onSelect(markerId);
    const building = hit?.object.userData.building;
    if (building) {
      const here = [...objects.values()].find((o) => o.marker.building === building);
      if (here) return handlers.onSelect(here.marker.id);
      return handlers.onEmptyBuilding(building);
    }
    handlers.onSelect(null);
  }
  function onPointerLeave() {
    tip.hidden = true;
    if (hovered) hovered.material = campusMaterial;
    hovered = null;
  }
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  function select(markerId, flyTo) {
    selected = markerId;
    const object = markerId ? objects.get(markerId) : void 0;
    objects.forEach((o) => o.tag.setAttribute("aria-pressed", String(o.marker.id === markerId)));
    if (!object || !flyTo) return;
    const toTarget = object.holder.position.clone();
    toTarget.y = object.roof * 0.5;
    const offset = camera.position.clone().sub(controls.target).setLength(Math.min(520, camera.position.distanceTo(controls.target)));
    fly = {
      t: 0,
      fromTarget: controls.target.clone(),
      toTarget,
      fromCamera: camera.position.clone(),
      toCamera: toTarget.clone().add(offset)
    };
  }
  const resize = new ResizeObserver(() => {
    if (host.clientWidth === 0 || host.clientHeight === 0) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  });
  resize.observe(host);
  const scratch = new THREE.Vector3();
  const timer = new THREE.Clock();
  let frameId = 0;
  function frame() {
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.elapsedTime;
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / 1.1);
      const eased = 1 - Math.pow(1 - fly.t, 3);
      controls.target.lerpVectors(fly.fromTarget, fly.toTarget, eased);
      camera.position.lerpVectors(fly.fromCamera, fly.toCamera, eased);
      if (fly.t >= 1) fly = null;
    }
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -SLAB_X, SLAB_X);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -SLAB_Y, SLAB_Y);
    controls.update();
    const width = host.clientWidth;
    const height = host.clientHeight;
    objects.forEach((o) => {
      const status = STATUS_INFO[o.marker.status];
      if (!reduceMotion && o.marker.status !== "offline") {
        const pace = o.marker.status === "paused" ? 0.45 : 1;
        o.card.position.y = Math.sin(t * 1.2 * pace + o.phase) * 2.2;
        o.card.rotation.y = Math.sin(t * 0.35 * pace + o.phase) * 0.55;
        o.card.rotation.z = Math.sin(t * 0.5 * pace + o.phase) * 0.05;
        o.fans.forEach((fan) => fan.rotation.z -= dt * 6 * status.fanSpeed);
      }
      const size = o.marker.id === selected ? 1.2 : 1;
      o.holder.scale.lerp(scratch.set(size, size, size), 0.15);
      scratch.copy(o.holder.position);
      scratch.y += 22;
      scratch.project(camera);
      const show = scratch.z < 1 && Math.abs(scratch.x) < 1.1 && Math.abs(scratch.y) < 1.1;
      o.tag.style.display = show ? "" : "none";
      if (show) {
        o.tag.style.left = `${(scratch.x + 1) / 2 * width}px`;
        o.tag.style.top = `${(1 - scratch.y) / 2 * height}px`;
      }
    });
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(frame);
  }
  frame();
  return {
    setMarkers,
    select,
    dispose() {
      cancelAnimationFrame(frameId);
      resize.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      objects.forEach(removeObject);
      objects.clear();
      tip.remove();
      controls.dispose();
      disposables.forEach((thing) => thing.dispose());
      renderer.domElement.remove();
    }
  };
}
export {
  createCampusScene
};


// ---------- The section: example GPUs, their list and their panel ----------

export const EXAMPLE_GPUS = [
  { id: "g1", title: "STEAM lab GPU", building: "Schoenecker Center", status: "free", gpuName: "RTX 5060 Ti", memory: "16 GB", jobsRun: 214, currentWorkload: null },
  { id: "g2", title: "Physics GPU", building: "O'Shaughnessy Science Hall", status: "busy", gpuName: "RTX 4070", memory: "12 GB", jobsRun: 388, currentWorkload: "Small image classifier" },
  { id: "g3", title: "Library study GPU", building: "OSF Library", status: "free", gpuName: "RTX 3060", memory: "12 GB", jobsRun: 97, currentWorkload: null },
  { id: "g4", title: "Bio lab GPU", building: "Owens Science Hall", status: "paused", gpuName: "RTX A2000", memory: "6 GB", jobsRun: 41, currentWorkload: null },
  { id: "g5", title: "Business analytics GPU", building: "McNeely Hall", status: "offline", gpuName: "RTX 4060", memory: "8 GB", jobsRun: 63, currentWorkload: null },
  { id: "g6", title: "Student club GPU", building: "Anderson Student Center", status: "busy", gpuName: "RTX 3070", memory: "8 GB", jobsRun: 152, currentWorkload: "GPU vs CPU speed test" },
];


export async function startShowcase(section) {
  const stage = section.querySelector("[data-campus-stage]");
  const host = section.querySelector("[data-campus-scene]");
  const tags = section.querySelector("[data-campus-tags]");
  const list = section.querySelector("[data-campus-list]");
  const panel = section.querySelector("[data-campus-panel]");
  const toast = section.querySelector("[data-campus-toast]");
  const { default: data } = await import("./campus-data.js");
  let scene = null;
  let toastTimer = 0;

  function select(id, flyTo) {
    list.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
    scene.select(id, flyTo);
    const gpu = EXAMPLE_GPUS.find((g) => g.id === id);
    if (!gpu) { panel.hidden = true; return; }
    const status = STATUS_INFO[gpu.status].label;
    panel.replaceChildren();
    const top = document.createElement("div");
    top.className = "campus-panel-top";
    const name = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = gpu.title;
    const where = document.createElement("p");
    where.className = "campus-where";
    where.textContent = gpu.building;
    name.append(h, where);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "campus-close";
    close.textContent = "Close";
    close.addEventListener("click", () => select(null, false));
    top.append(name, close);
    const state = document.createElement("p");
    state.className = "campus-state";
    state.append(statusIcon(gpu.status), gpu.currentWorkload ? `${status}, running ${gpu.currentWorkload}` : status);
    const facts = document.createElement("dl");
    facts.className = "campus-facts";
    for (const [k, v] of [["GPU", gpu.gpuName], ["Memory", gpu.memory], ["Jobs run", String(gpu.jobsRun)]]) {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      facts.append(dt, dd);
    }
    const note = document.createElement("p");
    note.className = "campus-where";
    note.innerHTML = '<span class="campus-example">Example</span> In the lab, members open a GPU like this and run an approved workload on it.';
    panel.append(top, state, facts, note);
    panel.hidden = false;
  }

  scene = createCampusScene(host, tags, data, {
    onSelect: (id) => select(id, false),
    onEmptyBuilding: (building) => {
      toast.textContent = `${building}: no GPU here yet.`;
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
    },
  });
  scene.setMarkers(EXAMPLE_GPUS);
  for (const gpu of EXAMPLE_GPUS) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.id = gpu.id;
    b.setAttribute("aria-pressed", "false");
    const small = document.createElement("small");
    small.textContent = gpu.memory;
    b.dataset.status = gpu.status;
    b.append(statusIcon(gpu.status), gpu.title, small);
    b.addEventListener("click", () => select(gpu.id, true));
    li.append(b);
    list.append(li);
  }
  stage.classList.add("live");
  section.addEventListener("keydown", (e) => { if (e.key === "Escape") select(null, false); });
  return scene;
}
