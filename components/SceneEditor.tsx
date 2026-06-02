"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Environment, Grid, Html, OrbitControls, RoundedBox, useCursor, useGLTF } from "@react-three/drei";
import { LogOut, Plus, Save } from "lucide-react";
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
  | "duck"
  | "customDuck"
  | "customRobot";

type SceneObject = {
  id: string;
  kind: ObjectKind;
  position: { x: number; y: number; z: number };
  scale: number;
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
  "customDuck",
  "customRobot"
];

const modelUrls: Partial<Record<ObjectKind, string>> = {
  duck: "/models/custom-duck.glb",
  customDuck: "/models/custom-duck.glb",
  customRobot: "/models/custom-robot.glb"
};

const starterObjects: SceneObject[] = [
  { id: "starter-sofa", kind: "sofa", position: { x: -1.8, y: 0, z: -2.2 }, scale: 1 },
  { id: "starter-chair", kind: "chair", position: { x: 2.25, y: 0, z: -1.6 }, scale: 1 },
  { id: "starter-table", kind: "table", position: { x: 0.9, y: 0, z: 0.35 }, scale: 1 }
];

type Props = {
  user: User;
  onLogout: () => void;
};

function groundY(kind: ObjectKind) {
  if (kind === "cube" || kind === "sphere" || kind === "torus") {
    return 0.55;
  }

  if (kind === "cone") {
    return 0.6;
  }

  return 0;
}

function objectScale(kind: ObjectKind) {
  if (kind === "customDuck" || kind === "customRobot") {
    return 0.018;
  }

  return 1;
}

function objectRadius(kind: ObjectKind) {
  if (kind === "sofa") {
    return 1.65;
  }

  if (kind === "table") {
    return 1.05;
  }

  if (kind === "chair" || kind === "customDuck" || kind === "customRobot" || kind === "duck") {
    return 0.9;
  }

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

function toVector(position: SceneObject["position"]) {
  return new THREE.Vector3(position.x, position.y, position.z);
}

function clampRoom(value: number) {
  return Math.max(-5.75, Math.min(5.75, value));
}

function normalizeKind(kind: ObjectKind): ObjectKind {
  return kind === "duck" ? "customDuck" : kind;
}

function resolveObjectCollisions(objects: SceneObject[], activeId: string) {
  const next = objects.map((object) => ({
    ...object,
    kind: normalizeKind(object.kind),
    position: { ...object.position }
  }));

  for (let pass = 0; pass < 6; pass += 1) {
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const a = next[i];
        const b = next[j];
        const minDistance = objectRadius(a.kind) + objectRadius(b.kind);
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distance = Math.hypot(dx, dz) || 0.001;

        if (distance >= minDistance) {
          continue;
        }

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
  const [status, setStatus] = useState("Loading scene...");

  useEffect(() => {
    async function loadScene() {
      const response = await fetch("/api/scene");
      if (response.ok) {
        const data = await response.json();
        const loadedObjects = data.objects.map((object: SceneObject) => ({
          ...object,
          kind: normalizeKind(object.kind)
        }));

        setObjects(loadedObjects.length ? loadedObjects : starterObjects);
        setStatus(loadedObjects.length ? "Scene loaded" : "Starter room loaded");
      } else {
        setObjects(starterObjects);
        setStatus("Starter room loaded");
      }
    }

    loadScene();
  }, []);

  function addObject() {
    setObjects((current) => {
      const drop = dropPosition(current.length, selectedKind);

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          kind: selectedKind,
          position: { x: drop.x, y: drop.y, z: drop.z },
          scale: objectScale(selectedKind),
          targetY: drop.targetY
        }
      ];
    });
    setStatus(`${objectLabels[selectedKind]} added`);
    setDialogOpen(false);
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

  async function saveScene() {
    setStatus("Saving...");
    const savedObjects = objects.map(({ targetY, ...object }) => ({
      ...object,
      kind: normalizeKind(object.kind)
    }));

    const response = await fetch("/api/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objects: savedObjects })
    });

    setStatus(response.ok ? "Saved" : "Save failed");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  return (
    <main className="scene-page">
      <div className="scene-toolbar">
        <div className="toolbar-group">
          <button className="primary" type="button" onClick={() => setDialogOpen(true)}>
            <Plus size={18} />
            Add Objects
          </button>
          <button className="secondary" type="button" onClick={saveScene}>
            <Save size={18} />
            Save
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
        <Canvas camera={{ position: [6, 5.5, 8], fov: 45 }} shadows={{ type: THREE.PCFShadowMap }}>
          <color attach="background" args={["#d7e1e8"]} />
          <ambientLight intensity={0.78} />
          <directionalLight castShadow intensity={1.4} position={[5, 8, 5]} />
          <Suspense fallback={<Html center>Loading 3D scene...</Html>}>
            <SceneRoom objects={objects} onDragChange={setDragging} onMove={updateObjectPosition} />
            <Environment preset="apartment" />
          </Suspense>
          <OrbitControls makeDefault enableDamping enabled={!dragging} maxPolarAngle={Math.PI / 2.15} />
        </Canvas>
      </div>

      {dialogOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}>
          <div className="dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Add Object</h2>
            <div className="object-options">
              {objectOptions.map((kind) => (
                <label key={kind}>
                  <input
                    checked={selectedKind === kind}
                    name="object-kind"
                    onChange={() => setSelectedKind(kind)}
                    type="radio"
                  />
                  {objectLabels[kind]}
                </label>
              ))}
            </div>
            <div className="dialog-actions">
              <button className="ghost" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </button>
              <button className="primary" type="button" onClick={addObject}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SceneRoom({
  objects,
  onDragChange,
  onMove
}: {
  objects: SceneObject[];
  onDragChange: (dragging: boolean) => void;
  onMove: (id: string, position: THREE.Vector3, targetY?: number) => void;
}) {
  return (
    <>
      <RoomShell />
      {objects.map((object) => (
        <DraggableObject key={object.id} object={object} onDragChange={onDragChange} onMove={onMove} />
      ))}
    </>
  );
}

function RoomShell() {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#d8d0c5" roughness={0.82} />
      </mesh>
      <Grid
        args={[14, 14]}
        cellColor="#a7adb5"
        cellSize={1}
        fadeDistance={22}
        fadeStrength={1}
        position={[0, 0.01, 0]}
        sectionColor="#6b7280"
        sectionSize={2}
      />
      <mesh receiveShadow position={[0, 2.25, -6.9]}>
        <boxGeometry args={[14, 4.5, 0.16]} />
        <meshStandardMaterial color="#b8c0c7" roughness={0.86} />
      </mesh>
      <mesh receiveShadow position={[-6.9, 2.25, 0]}>
        <boxGeometry args={[0.16, 4.5, 14]} />
        <meshStandardMaterial color="#cbd1d6" roughness={0.84} />
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
  onDragChange,
  onMove
}: {
  object: SceneObject;
  onDragChange: (dragging: boolean) => void;
  onMove: (id: string, position: THREE.Vector3, targetY?: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [held, setHeld] = useState(false);
  const position = useMemo(() => toVector(object.position), [object.position]);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  useCursor(hovered);

  useFrame((_, delta) => {
    const targetY = object.targetY ?? object.position.y;

    if (held || Math.abs(object.position.y - targetY) < 0.025) {
      return;
    }

    const smoothing = 1 - Math.pow(0.0006, delta);
    const nextY = THREE.MathUtils.lerp(object.position.y, targetY, smoothing);
    onMove(object.id, new THREE.Vector3(object.position.x, nextY, object.position.z), targetY);
  });

  function drag(event: ThreeEvent<PointerEvent>) {
    if (!held) {
      return;
    }

    event.stopPropagation();
    const point = event.ray.intersectPlane(dragPlane, new THREE.Vector3());

    if (!point) {
      return;
    }

    point.y = groundY(object.kind);
    onMove(object.id, point, groundY(object.kind));
  }

  return (
    <group
      onPointerDown={(event) => {
        event.stopPropagation();
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
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
    >
      <ObjectMesh held={held} hovered={hovered} object={object} />
    </group>
  );
}

function SmoothMaterial({ color, held, hovered }: { color: string; held: boolean; hovered: boolean }) {
  return (
    <meshStandardMaterial
      color={held ? "#f59e0b" : hovered ? "#0f9f7a" : color}
      metalness={0.08}
      roughness={0.42}
    />
  );
}

function ObjectMesh({
  held,
  hovered,
  object
}: {
  held: boolean;
  hovered: boolean;
  object: SceneObject;
}) {
  const scale = object.scale * (held ? 1.08 : 1);

  if (object.kind === "sphere") {
    return (
      <mesh castShadow scale={scale}>
        <sphereGeometry args={[0.62, 48, 32]} />
        <SmoothMaterial color="#3b82f6" held={held} hovered={hovered} />
      </mesh>
    );
  }

  if (object.kind === "cone") {
    return (
      <mesh castShadow scale={scale}>
        <coneGeometry args={[0.6, 1.18, 48]} />
        <SmoothMaterial color="#8b5cf6" held={held} hovered={hovered} />
      </mesh>
    );
  }

  if (object.kind === "torus") {
    return (
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} scale={scale}>
        <torusGeometry args={[0.48, 0.16, 32, 96]} />
        <SmoothMaterial color="#14b8a6" held={held} hovered={hovered} />
      </mesh>
    );
  }

  if (object.kind === "chair") {
    return <Chair held={held} hovered={hovered} scale={scale} />;
  }

  if (object.kind === "sofa") {
    return <Sofa held={held} hovered={hovered} scale={scale} />;
  }

  if (object.kind === "table") {
    return <Table held={held} hovered={hovered} scale={scale} />;
  }

  if (object.kind === "duck" || object.kind === "customDuck" || object.kind === "customRobot") {
    return <CustomModel held={held} kind={object.kind} scale={scale} />;
  }

  return (
    <RoundedBox args={[1, 1, 1]} castShadow radius={0.18} scale={scale} smoothness={16}>
      <SmoothMaterial color="#2563eb" held={held} hovered={hovered} />
    </RoundedBox>
  );
}

function Chair({ held, hovered, scale }: { held: boolean; hovered: boolean; scale: number }) {
  return (
    <group scale={scale}>
      <RoundedBox args={[0.95, 0.16, 0.95]} castShadow position={[0, 0.62, 0]} radius={0.06} smoothness={8}>
        <SmoothMaterial color="#7c5f45" held={held} hovered={hovered} />
      </RoundedBox>
      <RoundedBox args={[0.95, 0.9, 0.16]} castShadow position={[0, 1.04, -0.38]} radius={0.06} smoothness={8}>
        <SmoothMaterial color="#6f5138" held={held} hovered={hovered} />
      </RoundedBox>
      {[-0.35, 0.35].map((x) =>
        [-0.35, 0.35].map((z) => (
          <RoundedBox key={`${x}-${z}`} args={[0.12, 0.6, 0.12]} castShadow position={[x, 0.3, z]} radius={0.03} smoothness={6}>
            <meshStandardMaterial color="#4b3829" roughness={0.58} />
          </RoundedBox>
        ))
      )}
    </group>
  );
}

function Sofa({ held, hovered, scale }: { held: boolean; hovered: boolean; scale: number }) {
  return (
    <group scale={scale}>
      <RoundedBox args={[2.55, 0.42, 1.1]} castShadow position={[0, 0.43, 0]} radius={0.14} smoothness={16}>
        <SmoothMaterial color="#475569" held={held} hovered={hovered} />
      </RoundedBox>
      <RoundedBox args={[2.6, 0.9, 0.24]} castShadow position={[0, 0.9, -0.5]} radius={0.12} smoothness={16}>
        <SmoothMaterial color="#334155" held={held} hovered={hovered} />
      </RoundedBox>
      <RoundedBox args={[0.24, 0.72, 1.1]} castShadow position={[-1.42, 0.72, 0]} radius={0.12} smoothness={12}>
        <SmoothMaterial color="#334155" held={held} hovered={hovered} />
      </RoundedBox>
      <RoundedBox args={[0.24, 0.72, 1.1]} castShadow position={[1.42, 0.72, 0]} radius={0.12} smoothness={12}>
        <SmoothMaterial color="#334155" held={held} hovered={hovered} />
      </RoundedBox>
    </group>
  );
}

function Table({ held, hovered, scale }: { held: boolean; hovered: boolean; scale: number }) {
  return (
    <group scale={scale}>
      <RoundedBox args={[1.35, 0.16, 0.9]} castShadow position={[0, 0.72, 0]} radius={0.08} smoothness={10}>
        <SmoothMaterial color="#8b6f52" held={held} hovered={hovered} />
      </RoundedBox>
      {[-0.48, 0.48].map((x) =>
        [-0.28, 0.28].map((z) => (
          <RoundedBox key={`${x}-${z}`} args={[0.11, 0.72, 0.11]} castShadow position={[x, 0.36, z]} radius={0.03} smoothness={6}>
            <meshStandardMaterial color="#5f4634" roughness={0.52} />
          </RoundedBox>
        ))
      )}
    </group>
  );
}

function CustomModel({ held, kind, scale }: { held: boolean; kind: ObjectKind; scale: number }) {
  const gltf = useGLTF(modelUrls[kind] || modelUrls.customDuck!);

  return (
    <group scale={scale * 38 * (held ? 1.08 : 1)}>
      <mesh>
        <sphereGeometry args={[1.2, 16, 12]} />
        <meshBasicMaterial depthWrite={false} opacity={0} transparent />
      </mesh>
      <primitive object={gltf.scene.clone()} rotation={[0, Math.PI / 8, 0]} />
    </group>
  );
}

useGLTF.preload("/models/custom-duck.glb");
useGLTF.preload("/models/custom-robot.glb");
