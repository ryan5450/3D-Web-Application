"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Environment, Grid, Html, OrbitControls, RoundedBox, useCursor, useGLTF } from "@react-three/drei";
import { Camera, Copy, LogOut, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { User } from "@/components/AppShell";

type ObjectKind =
  | "cube"
  | "sphere"
  | "cone"
  | "torus"
  | "chair"
  | "sofa"
  | "table"
  | "lamp"
  | "plant"
  | "bookshelf"
  | "rug"
  | "tv"
  | "bed"
  | "cabinet"
  | "duck"
  | "customDuck"
  | "customRobot";

type ThemeKey = "cozy" | "studio" | "gallery" | "play";

type SceneObject = {
  id: string;
  kind: ObjectKind;
  position: { x: number; y: number; z: number };
  scale: number;
  rotationY?: number;
  color?: string;
  targetY?: number;
};

const objectLabels: Record<ObjectKind, string> = {
  cube: "Soft Cube",
  sphere: "Sphere",
  cone: "Cone",
  torus: "Torus",
  chair: "Chair",
  sofa: "Sofa",
  table: "Table",
  lamp: "Lamp",
  plant: "Plant",
  bookshelf: "Bookshelf",
  rug: "Rug",
  tv: "TV",
  bed: "Bed",
  cabinet: "Cabinet",
  duck: "Custom model 1",
  customDuck: "Custom model 1",
  customRobot: "Custom model 2"
};

const objectOptions: ObjectKind[] = [
  "cube",
  "sphere",
  "cone",
  "torus",
  "chair",
  "sofa",
  "table",
  "lamp",
  "plant",
  "bookshelf",
  "rug",
  "tv",
  "bed",
  "cabinet",
  "customDuck",
  "customRobot"
];

const themes: Record<ThemeKey, { label: string; floor: string; wall: string; side: string; grid: string; bg: string }> = {
  cozy: { label: "Cozy", floor: "#d8d0c5", wall: "#b8c0c7", side: "#cbd1d6", grid: "#6b7280", bg: "#d7e1e8" },
  studio: { label: "Studio", floor: "#d1d5db", wall: "#e5e7eb", side: "#cbd5e1", grid: "#64748b", bg: "#edf2f7" },
  gallery: { label: "Gallery", floor: "#f4f1ea", wall: "#fafaf9", side: "#e7e5e4", grid: "#a8a29e", bg: "#f5f5f4" },
  play: { label: "Play", floor: "#bfe3d0", wall: "#bcd7ee", side: "#f8d7a7", grid: "#27806b", bg: "#e6f6ff" }
};

const palette = ["#2563eb", "#0f9f7a", "#f59e0b", "#ef4444", "#8b5cf6", "#475569", "#8b6f52"];
const sceneSlots = [
  { value: "room-1", label: "Room 1" },
  { value: "room-2", label: "Room 2" },
  { value: "room-3", label: "Room 3" }
];
const snapZones = [
  { id: "sofa-wall", label: "Wall", position: { x: -2.1, y: 0, z: -2.45 } },
  { id: "center", label: "Center", position: { x: 0, y: 0, z: 0.15 } },
  { id: "corner", label: "Corner", position: { x: 3.5, y: 0, z: -2.2 } },
  { id: "display", label: "Display", position: { x: 2.7, y: 0, z: 1.75 } }
];

const modelUrls: Partial<Record<ObjectKind, string>> = {
  duck: "/models/custom-duck.glb",
  customDuck: "/models/custom-duck.glb",
  customRobot: "/models/custom-robot.glb"
};

const starterObjects: SceneObject[] = [
  { id: "starter-sofa", kind: "sofa", position: { x: -1.8, y: 0, z: -2.2 }, scale: 1, rotationY: 0 },
  { id: "starter-chair", kind: "chair", position: { x: 2.25, y: 0, z: -1.6 }, scale: 1, rotationY: -0.55 },
  { id: "starter-table", kind: "table", position: { x: 0.9, y: 0, z: 0.35 }, scale: 1, rotationY: 0 },
  { id: "starter-plant", kind: "plant", position: { x: -4.15, y: 0, z: -2.65 }, scale: 1, rotationY: 0 }
];

type Props = {
  user: User;
  onLogout: () => void;
};

function groundY(kind: ObjectKind) {
  if (["cube", "sphere", "torus"].includes(kind)) return 0.55;
  if (kind === "cone") return 0.6;
  if (kind === "lamp") return 0.05;
  return 0;
}

function objectScale(kind: ObjectKind) {
  if (kind === "customDuck" || kind === "customRobot") return 0.018;
  if (kind === "rug") return 1.25;
  return 1;
}

function objectRadius(kind: ObjectKind) {
  if (["sofa", "bed"].includes(kind)) return 1.7;
  if (["bookshelf", "cabinet"].includes(kind)) return 1.15;
  if (["table", "rug"].includes(kind)) return 1.05;
  if (["chair", "lamp", "plant", "tv", "customDuck", "customRobot", "duck"].includes(kind)) return 0.9;
  return 0.78;
}

function dropPosition(index: number, kind: ObjectKind) {
  const columns = 4;
  const spacing = 1.65;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: Number(((column - 1.5) * spacing).toFixed(2)),
    y: 4.8,
    z: Number((1.2 - row * spacing).toFixed(2)),
    targetY: groundY(kind)
  };
}

function clampRoom(value: number) {
  return Math.max(-5.75, Math.min(5.75, value));
}

function normalizeKind(kind: ObjectKind): ObjectKind {
  return kind === "duck" ? "customDuck" : kind;
}

function cleanObject(object: SceneObject): SceneObject {
  return {
    ...object,
    kind: normalizeKind(object.kind),
    rotationY: object.rotationY ?? 0,
    scale: object.scale || objectScale(object.kind)
  };
}

function resolveObjectCollisions(objects: SceneObject[], activeId: string) {
  const next = objects.map((object) => ({ ...cleanObject(object), position: { ...object.position } }));

  for (let pass = 0; pass < 5; pass += 1) {
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const a = next[i];
        const b = next[j];
        const minDistance = objectRadius(a.kind) + objectRadius(b.kind);
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distance = Math.hypot(dx, dz) || 0.001;

        if (distance >= minDistance) continue;

        const overlap = minDistance - distance;
        const directionX = dx / distance;
        const directionZ = dz / distance;
        const activeA = a.id === activeId;
        const activeB = b.id === activeId;
        const moveA = activeB ? overlap : activeA ? 0 : overlap * 0.5;
        const moveB = activeA ? overlap : activeB ? 0 : overlap * 0.5;

        a.position.x = clampRoom(a.position.x - directionX * moveA);
        a.position.z = clampRoom(a.position.z - directionZ * moveA);
        b.position.x = clampRoom(b.position.x + directionX * moveB);
        b.position.z = clampRoom(b.position.z + directionZ * moveB);
      }
    }
  }

  return next.map((object) => ({
    ...object,
    position: {
      x: Number(object.position.x.toFixed(2)),
      y: Number(object.position.y.toFixed(2)),
      z: Number(object.position.z.toFixed(2))
    }
  }));
}

export default function SceneEditor({ user, onLogout }: Props) {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedKind, setSelectedKind] = useState<ObjectKind>("cube");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("cozy");
  const [sceneSlot, setSceneSlot] = useState("room-1");
  const [status, setStatus] = useState("Loading scene...");

  const selectedObject = objects.find((object) => object.id === selectedObjectId) || null;

  useEffect(() => {
    loadScene(sceneSlot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneSlot]);

  async function loadScene(slot: string) {
    setStatus("Loading scene...");
    const response = await fetch(`/api/scene?slot=${slot}`);
    if (response.ok) {
      const data = await response.json();
      const loadedObjects = data.objects.map(cleanObject);
      setObjects(loadedObjects.length ? loadedObjects : starterObjects);
      setTheme((data.theme || "cozy") as ThemeKey);
      setSelectedObjectId(null);
      setStatus(loadedObjects.length ? "Scene loaded" : "Starter room loaded");
    } else {
      setObjects(starterObjects);
      setStatus("Starter room loaded");
    }
  }

  function addObject(kind = selectedKind) {
    setObjects((current) => {
      const drop = dropPosition(current.length, kind);
      const created = {
        id: crypto.randomUUID(),
        kind,
        color: palette[current.length % palette.length],
        position: { x: drop.x, y: drop.y, z: drop.z },
        rotationY: 0,
        scale: objectScale(kind),
        targetY: drop.targetY
      };
      setSelectedObjectId(created.id);
      return [...current, created];
    });
    setStatus(`${objectLabels[kind]} added`);
    setDialogOpen(false);
  }

  function updateObject(id: string, patch: Partial<SceneObject>) {
    setObjects((current) =>
      current.map((object) => (object.id === id ? cleanObject({ ...object, ...patch }) : object))
    );
  }

  function updateObjectPosition(id: string, nextPosition: THREE.Vector3, targetY?: number) {
    setObjects((current) =>
      resolveObjectCollisions(
        current.map((object) =>
          object.id === id
            ? {
                ...object,
                position: {
                  x: Number(clampRoom(nextPosition.x).toFixed(2)),
                  y: Number(nextPosition.y.toFixed(2)),
                  z: Number(clampRoom(nextPosition.z).toFixed(2))
                },
                targetY
              }
            : object
        ),
        id
      )
    );
  }

  function duplicateSelected() {
    if (!selectedObject) return;
    const copy = {
      ...selectedObject,
      id: crypto.randomUUID(),
      position: {
        x: clampRoom(selectedObject.position.x + 0.7),
        y: selectedObject.position.y,
        z: clampRoom(selectedObject.position.z + 0.7)
      }
    };
    setObjects((current) => [...current, copy]);
    setSelectedObjectId(copy.id);
  }

  function deleteSelected() {
    if (!selectedObject) return;
    setObjects((current) => current.filter((object) => object.id !== selectedObject.id));
    setSelectedObjectId(null);
  }

  function snapSelected() {
    if (!selectedObject) return;
    const zone = snapZones.reduce((best, current) => {
      const bestDistance = Math.hypot(best.position.x - selectedObject.position.x, best.position.z - selectedObject.position.z);
      const nextDistance = Math.hypot(current.position.x - selectedObject.position.x, current.position.z - selectedObject.position.z);
      return nextDistance < bestDistance ? current : best;
    });
    updateObjectPosition(selectedObject.id, new THREE.Vector3(zone.position.x, groundY(selectedObject.kind), zone.position.z), groundY(selectedObject.kind));
    setStatus(`Snapped to ${zone.label}`);
  }

  async function saveScene() {
    setStatus("Saving...");
    const savedObjects = objects.map(({ targetY, ...object }) => cleanObject(object));
    const response = await fetch("/api/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objects: savedObjects, slot: sceneSlot, theme })
    });
    setStatus(response.ok ? "Saved" : "Save failed");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  function resetRoom() {
    setObjects(starterObjects);
    setSelectedObjectId(null);
    setStatus("Room reset");
  }

  function downloadScreenshot() {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${sceneSlot}-snapshot.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <main className="scene-page">
      <div className="scene-toolbar">
        <div className="toolbar-group">
          <select className="select-control" value={sceneSlot} onChange={(event) => setSceneSlot(event.target.value)}>
            {sceneSlots.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          <select className="select-control" value={theme} onChange={(event) => setTheme(event.target.value as ThemeKey)}>
            {Object.entries(themes).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <button className="primary" type="button" onClick={() => setDialogOpen(true)}>
            <Plus size={18} />
            Add
          </button>
          <button className="secondary" type="button" onClick={saveScene}>
            <Save size={18} />
            Save
          </button>
          <button className="ghost icon-command" title="Download screenshot" type="button" onClick={downloadScreenshot}>
            <Camera size={18} />
          </button>
          <span className="status">{status}</span>
        </div>
        <div className="toolbar-group">
          <span className="user-badge">{user.email}</span>
          <button className="ghost" type="button" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="canvas-wrap">
        <Canvas
          camera={{ position: [6, 5.5, 8], fov: 45 }}
          gl={{ preserveDrawingBuffer: true }}
          shadows={{ type: THREE.PCFShadowMap }}
        >
          <color attach="background" args={[themes[theme].bg]} />
          <ambientLight intensity={0.78} />
          <directionalLight castShadow intensity={1.4} position={[5, 8, 5]} />
          <Suspense fallback={<Html center>Loading 3D scene...</Html>}>
            <SceneRoom
              objects={objects}
              selectedObjectId={selectedObjectId}
              theme={theme}
              onDragChange={setDragging}
              onMove={updateObjectPosition}
              onSelect={setSelectedObjectId}
            />
            <Environment preset="apartment" />
          </Suspense>
          <OrbitControls makeDefault enableDamping enabled={!dragging} maxPolarAngle={Math.PI / 2.15} />
        </Canvas>
      </div>

      <aside className="editor-panel">
        <div className="panel-title">Object Tools</div>
        {selectedObject ? (
          <>
            <div className="selected-name">{objectLabels[selectedObject.kind]}</div>
            <div className="swatches">
              {palette.map((color) => (
                <button
                  key={color}
                  className="swatch"
                  style={{ background: color }}
                  title={color}
                  type="button"
                  onClick={() => updateObject(selectedObject.id, { color })}
                />
              ))}
            </div>
            <label className="control-row">
              Size
              <input
                max="2.2"
                min="0.45"
                step="0.05"
                type="range"
                value={selectedObject.scale}
                onChange={(event) => updateObject(selectedObject.id, { scale: Number(event.target.value) })}
              />
            </label>
            <label className="control-row">
              Rotate
              <input
                max="6.28"
                min="0"
                step="0.05"
                type="range"
                value={selectedObject.rotationY || 0}
                onChange={(event) => updateObject(selectedObject.id, { rotationY: Number(event.target.value) })}
              />
            </label>
            <div className="tool-grid">
              <button className="tool-button" type="button" onClick={snapSelected}>Snap</button>
              <button className="tool-button" type="button" onClick={() => updateObject(selectedObject.id, { rotationY: 0 })}>
                <RotateCcw size={16} />
              </button>
              <button className="tool-button" type="button" onClick={duplicateSelected}>
                <Copy size={16} />
              </button>
              <button className="tool-button danger" type="button" onClick={deleteSelected}>
                <Trash2 size={16} />
              </button>
            </div>
          </>
        ) : (
          <p className="panel-empty">Select an object to edit color, size, rotation, duplicate, snap, or delete.</p>
        )}
        <button className="tool-button full" type="button" onClick={resetRoom}>Reset Starter Room</button>
      </aside>

      {dialogOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}>
          <div className="dialog object-picker" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Add Object</h2>
            <div className="object-card-grid">
              {objectOptions.map((kind) => (
                <button
                  key={kind}
                  className={selectedKind === kind ? "object-card selected" : "object-card"}
                  type="button"
                  onClick={() => setSelectedKind(kind)}
                  onDoubleClick={() => addObject(kind)}
                >
                  <span className="object-glyph">{objectLabels[kind].slice(0, 1)}</span>
                  <span>{objectLabels[kind]}</span>
                </button>
              ))}
            </div>
            <div className="dialog-actions">
              <button className="ghost" type="button" onClick={() => setDialogOpen(false)}>Cancel</button>
              <button className="primary" type="button" onClick={() => addObject()}>Add</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SceneRoom({
  objects,
  selectedObjectId,
  theme,
  onDragChange,
  onMove,
  onSelect
}: {
  objects: SceneObject[];
  selectedObjectId: string | null;
  theme: ThemeKey;
  onDragChange: (dragging: boolean) => void;
  onMove: (id: string, position: THREE.Vector3, targetY?: number) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <RoomShell theme={theme} />
      {objects.map((object) => (
        <DraggableObject
          key={object.id}
          object={object}
          selected={object.id === selectedObjectId}
          onDragChange={onDragChange}
          onMove={onMove}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function RoomShell({ theme }: { theme: ThemeKey }) {
  const colors = themes[theme];
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={colors.floor} roughness={0.82} />
      </mesh>
      <Grid args={[14, 14]} cellColor="#a7adb5" cellSize={1} fadeDistance={22} fadeStrength={1} position={[0, 0.01, 0]} sectionColor={colors.grid} sectionSize={2} />
      {snapZones.map((zone) => (
        <mesh key={zone.id} position={[zone.position.x, 0.025, zone.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.5, 48]} />
          <meshBasicMaterial color="#0f9f7a" transparent opacity={0.32} />
        </mesh>
      ))}
      <mesh receiveShadow position={[0, 2.25, -6.9]}>
        <boxGeometry args={[14, 4.5, 0.16]} />
        <meshStandardMaterial color={colors.wall} roughness={0.86} />
      </mesh>
      <mesh receiveShadow position={[-6.9, 2.25, 0]}>
        <boxGeometry args={[0.16, 4.5, 14]} />
        <meshStandardMaterial color={colors.side} roughness={0.84} />
      </mesh>
      <WallFrame position={[-1.8, 2.45, -6.78]} />
      <WallFrame position={[1.05, 2.9, -6.78]} tall />
    </>
  );
}

function WallFrame({ position, tall = false }: { position: [number, number, number]; tall?: boolean }) {
  return (
    <group position={position}>
      <RoundedBox args={[tall ? 0.72 : 0.82, tall ? 1.05 : 0.78, 0.08]} radius={0.04} smoothness={8}>
        <meshStandardMaterial color="#374151" roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[tall ? 0.52 : 0.62, tall ? 0.85 : 0.58, 0.1]} radius={0.03} smoothness={8} position={[0, 0, 0.03]}>
        <meshStandardMaterial color="#aeb7c0" roughness={0.7} />
      </RoundedBox>
    </group>
  );
}

function DraggableObject({
  object,
  selected,
  onDragChange,
  onMove,
  onSelect
}: {
  object: SceneObject;
  selected: boolean;
  onDragChange: (dragging: boolean) => void;
  onMove: (id: string, position: THREE.Vector3, targetY?: number) => void;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [held, setHeld] = useState(false);
  const position = useMemo(() => new THREE.Vector3(object.position.x, object.position.y, object.position.z), [object.position]);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  useCursor(hovered);

  useFrame((_, delta) => {
    const targetY = object.targetY ?? object.position.y;
    if (!held && Math.abs(object.position.y - targetY) >= 0.025) {
      const smoothing = 1 - Math.pow(0.0006, delta);
      const nextY = THREE.MathUtils.lerp(object.position.y, targetY, smoothing);
      onMove(object.id, new THREE.Vector3(object.position.x, nextY, object.position.z), targetY);
    }
  });

  function drag(event: ThreeEvent<PointerEvent>) {
    if (!held) return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(dragPlane, new THREE.Vector3());
    if (!point) return;
    point.y = groundY(object.kind);
    onMove(object.id, point, groundY(object.kind));
  }

  return (
    <group
      onPointerDown={(event) => {
        event.stopPropagation();
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        onSelect(object.id);
        setHeld(true);
        onDragChange(true);
      }}
      onPointerMove={drag}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerUp={(event) => {
        event.stopPropagation();
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        setHeld(false);
        onDragChange(false);
      }}
      position={position}
      rotation={[0, object.rotationY || 0, 0]}
    >
      <ObjectMesh held={held} hovered={hovered || selected} object={object} selected={selected} />
    </group>
  );
}

function SmoothMaterial({ color, held, hovered }: { color: string; held: boolean; hovered: boolean }) {
  return (
    <meshStandardMaterial color={held ? "#f59e0b" : hovered ? "#0f9f7a" : color} metalness={0.08} roughness={0.42} />
  );
}

function SelectionRing({ selected }: { selected: boolean }) {
  if (!selected) return null;
  return (
    <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 0.98, 48]} />
      <meshBasicMaterial color="#0f9f7a" transparent opacity={0.8} />
    </mesh>
  );
}

function ObjectMesh({ held, hovered, object, selected }: { held: boolean; hovered: boolean; object: SceneObject; selected: boolean }) {
  const scale = object.scale * (held ? 1.08 : 1);
  const color = object.color || "#2563eb";

  if (object.kind === "sphere") {
    return (
      <group>
        <SelectionRing selected={selected} />
        <mesh castShadow scale={scale}>
          <sphereGeometry args={[0.62, 48, 32]} />
          <SmoothMaterial color={color} held={held} hovered={hovered} />
        </mesh>
      </group>
    );
  }
  if (object.kind === "cone") {
    return (
      <group>
        <SelectionRing selected={selected} />
        <mesh castShadow scale={scale}>
          <coneGeometry args={[0.6, 1.18, 48]} />
          <SmoothMaterial color={color} held={held} hovered={hovered} />
        </mesh>
      </group>
    );
  }
  if (object.kind === "torus") {
    return (
      <group>
        <SelectionRing selected={selected} />
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]} scale={scale}>
          <torusGeometry args={[0.48, 0.16, 32, 96]} />
          <SmoothMaterial color={color} held={held} hovered={hovered} />
        </mesh>
      </group>
    );
  }
  if (object.kind === "chair") return <Chair color={color} held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "sofa") return <Sofa color={color} held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "table") return <Table color={color} held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "lamp") return <Lamp color={color} held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "plant") return <Plant held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "bookshelf") return <Bookshelf color={color} held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "rug") return <Rug color={color} held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "tv") return <TV held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "bed") return <Bed color={color} held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "cabinet") return <Cabinet color={color} held={held} hovered={hovered} scale={scale} selected={selected} />;
  if (object.kind === "duck" || object.kind === "customDuck" || object.kind === "customRobot") {
    return <CustomModel held={held} kind={object.kind} scale={scale} selected={selected} />;
  }
  return (
    <group>
      <SelectionRing selected={selected} />
      <RoundedBox args={[1, 1, 1]} castShadow radius={0.18} scale={scale} smoothness={16}>
        <SmoothMaterial color={color} held={held} hovered={hovered} />
      </RoundedBox>
    </group>
  );
}

function Chair({ color, held, hovered, scale, selected }: { color: string; held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <RoundedBox args={[0.95, 0.16, 0.95]} castShadow position={[0, 0.62, 0]} radius={0.06} smoothness={8}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      <RoundedBox args={[0.95, 0.9, 0.16]} castShadow position={[0, 1.04, -0.38]} radius={0.06} smoothness={8}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      {[-0.35, 0.35].map((x) => [-0.35, 0.35].map((z) => <RoundedBox key={`${x}-${z}`} args={[0.12, 0.6, 0.12]} castShadow position={[x, 0.3, z]} radius={0.03} smoothness={6}><meshStandardMaterial color="#4b3829" roughness={0.58} /></RoundedBox>))}
    </group>
  );
}

function Sofa({ color, held, hovered, scale, selected }: { color: string; held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <RoundedBox args={[2.55, 0.42, 1.1]} castShadow position={[0, 0.43, 0]} radius={0.14} smoothness={16}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      <RoundedBox args={[2.6, 0.9, 0.24]} castShadow position={[0, 0.9, -0.5]} radius={0.12} smoothness={16}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      <RoundedBox args={[0.24, 0.72, 1.1]} castShadow position={[-1.42, 0.72, 0]} radius={0.12} smoothness={12}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      <RoundedBox args={[0.24, 0.72, 1.1]} castShadow position={[1.42, 0.72, 0]} radius={0.12} smoothness={12}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
    </group>
  );
}

function Table({ color, held, hovered, scale, selected }: { color: string; held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <RoundedBox args={[1.35, 0.16, 0.9]} castShadow position={[0, 0.72, 0]} radius={0.08} smoothness={10}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      {[-0.48, 0.48].map((x) => [-0.28, 0.28].map((z) => <RoundedBox key={`${x}-${z}`} args={[0.11, 0.72, 0.11]} castShadow position={[x, 0.36, z]} radius={0.03} smoothness={6}><meshStandardMaterial color="#5f4634" roughness={0.52} /></RoundedBox>))}
    </group>
  );
}

function Lamp({ color, held, hovered, scale, selected }: { color: string; held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <mesh castShadow position={[0, 0.3, 0]}><cylinderGeometry args={[0.12, 0.18, 0.6, 24]} /><SmoothMaterial color={color} held={held} hovered={hovered} /></mesh>
      <mesh castShadow position={[0, 0.88, 0]}><coneGeometry args={[0.42, 0.55, 32]} /><meshStandardMaterial color="#f8e7bd" roughness={0.45} emissive="#f59e0b" emissiveIntensity={0.18} /></mesh>
      <pointLight color="#f8e7bd" intensity={0.55} distance={4} position={[0, 1.1, 0]} />
    </group>
  );
}

function Plant({ held, hovered, scale, selected }: { held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <mesh castShadow position={[0, 0.22, 0]}><cylinderGeometry args={[0.32, 0.42, 0.44, 24]} /><meshStandardMaterial color={held ? "#f59e0b" : hovered ? "#0f9f7a" : "#374151"} roughness={0.6} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} castShadow position={[Math.sin(i) * 0.25, 0.78 + i * 0.04, Math.cos(i) * 0.25]} rotation={[0.7, i, 0.4]}><sphereGeometry args={[0.28, 18, 12]} /><meshStandardMaterial color="#15803d" roughness={0.5} /></mesh>)}
    </group>
  );
}

function Bookshelf({ color, held, hovered, scale, selected }: { color: string; held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <RoundedBox args={[1.1, 1.75, 0.42]} castShadow position={[0, 0.9, 0]} radius={0.06} smoothness={8}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      {[0.45, 0.9, 1.35].map((y) => <RoundedBox key={y} args={[0.95, 0.05, 0.48]} position={[0, y, 0.02]} radius={0.02} smoothness={4}><meshStandardMaterial color="#e5c07b" roughness={0.5} /></RoundedBox>)}
    </group>
  );
}

function Rug({ color, selected }: { color: string; held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group>
      <SelectionRing selected={selected} />
      <mesh receiveShadow position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 1.45]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

function TV({ selected, scale }: { held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <RoundedBox args={[1.35, 0.82, 0.08]} castShadow position={[0, 0.82, 0]} radius={0.05} smoothness={8}><meshStandardMaterial color="#111827" roughness={0.35} metalness={0.2} /></RoundedBox>
      <mesh position={[0, 0.82, 0.052]}><planeGeometry args={[1.12, 0.62]} /><meshBasicMaterial color="#172554" /></mesh>
      <RoundedBox args={[0.28, 0.5, 0.08]} castShadow position={[0, 0.26, 0]} radius={0.03} smoothness={6}><meshStandardMaterial color="#1f2937" roughness={0.5} /></RoundedBox>
    </group>
  );
}

function Bed({ color, held, hovered, scale, selected }: { color: string; held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <RoundedBox args={[2.2, 0.42, 1.35]} castShadow position={[0, 0.32, 0]} radius={0.1} smoothness={12}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      <RoundedBox args={[2.2, 0.72, 0.18]} castShadow position={[0, 0.7, -0.64]} radius={0.08} smoothness={10}><meshStandardMaterial color="#334155" roughness={0.5} /></RoundedBox>
      <RoundedBox args={[0.58, 0.18, 0.42]} castShadow position={[-0.55, 0.72, -0.28]} radius={0.08} smoothness={10}><meshStandardMaterial color="#f8fafc" roughness={0.7} /></RoundedBox>
      <RoundedBox args={[0.58, 0.18, 0.42]} castShadow position={[0.55, 0.72, -0.28]} radius={0.08} smoothness={10}><meshStandardMaterial color="#f8fafc" roughness={0.7} /></RoundedBox>
    </group>
  );
}

function Cabinet({ color, held, hovered, scale, selected }: { color: string; held: boolean; hovered: boolean; scale: number; selected: boolean }) {
  return (
    <group scale={scale}>
      <SelectionRing selected={selected} />
      <RoundedBox args={[1.25, 1.05, 0.72]} castShadow position={[0, 0.55, 0]} radius={0.08} smoothness={10}><SmoothMaterial color={color} held={held} hovered={hovered} /></RoundedBox>
      <RoundedBox args={[0.05, 0.75, 0.76]} position={[0, 0.57, 0.02]} radius={0.01} smoothness={4}><meshStandardMaterial color="#1f2937" roughness={0.55} /></RoundedBox>
    </group>
  );
}

function CustomModel({ held, kind, scale, selected }: { held: boolean; kind: ObjectKind; scale: number; selected: boolean }) {
  const gltf = useGLTF(modelUrls[kind] || modelUrls.customDuck!);
  return (
    <group scale={scale * 38 * (held ? 1.08 : 1)}>
      <SelectionRing selected={selected} />
      <mesh><sphereGeometry args={[1.2, 16, 12]} /><meshBasicMaterial depthWrite={false} opacity={0} transparent /></mesh>
      <primitive object={gltf.scene.clone()} rotation={[0, Math.PI / 8, 0]} />
    </group>
  );
}

useGLTF.preload("/models/custom-duck.glb");
useGLTF.preload("/models/custom-robot.glb");
