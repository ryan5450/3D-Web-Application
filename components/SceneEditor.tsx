"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Environment, Grid, Html, OrbitControls, useCursor, useGLTF, useTexture } from "@react-three/drei";
import { LogOut, Plus, Save } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { User } from "@/components/AppShell";

type ObjectKind = "cube" | "sphere" | "cone" | "torus" | "duck" | "customDuck" | "customRobot";

type SceneObject = {
  id: string;
  kind: ObjectKind;
  position: { x: number; y: number; z: number };
  scale: number;
  velocityY?: number;
};

const objectLabels: Record<ObjectKind, string> = {
  cube: "Cube",
  sphere: "Sphere",
  cone: "Cone",
  torus: "Torus",
  duck: "Custom model 1",
  customDuck: "Custom model 1",
  customRobot: "Custom model 2"
};

const modelUrls: Partial<Record<ObjectKind, string>> = {
  duck: "/models/custom-duck.glb",
  customDuck: "/models/custom-duck.glb",
  customRobot: "/models/custom-robot.glb"
};

type Props = {
  user: User;
  onLogout: () => void;
};

function groundY(kind: ObjectKind) {
  return kind === "duck" || kind === "customDuck" || kind === "customRobot" ? 0.12 : 0.55;
}

function dropPosition(index: number, kind: ObjectKind) {
  const columns = 4;
  const spacing = 1.75;
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: Number(((column - 1.5) * spacing).toFixed(2)),
    y: 5.5,
    z: Number((1.5 - row * spacing).toFixed(2))
  };
}

function toVector(position: SceneObject["position"]) {
  return new THREE.Vector3(position.x, position.y, position.z);
}

function objectRadius(kind: ObjectKind) {
  if (kind === "torus") {
    return 0.85;
  }

  if (kind === "duck" || kind === "customDuck" || kind === "customRobot") {
    return 0.9;
  }

  return 0.78;
}

function clampToRoom(value: number) {
  return Math.max(-5.8, Math.min(5.8, value));
}

function resolveObjectCollisions(objects: SceneObject[], activeId: string) {
  const next = objects.map((object) => ({ ...object, position: { ...object.position } }));

  for (let pass = 0; pass < 5; pass += 1) {
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

        a.position.x = clampToRoom(a.position.x - directionX * moveA);
        a.position.z = clampToRoom(a.position.z - directionZ * moveA);
        b.position.x = clampToRoom(b.position.x + directionX * moveB);
        b.position.z = clampToRoom(b.position.z + directionZ * moveB);

        if (!activeA) {
          a.velocityY = 0;
        }

        if (!activeB) {
          b.velocityY = 0;
        }
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
        setObjects(data.objects);
        setStatus(data.objects.length ? "Scene loaded" : "Start adding objects");
      } else {
        setStatus("Could not load scene");
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
          scale: selectedKind === "customDuck" || selectedKind === "customRobot" ? 0.018 : 1,
          velocityY: 0
        }
      ];
    });
    setStatus(`${objectLabels[selectedKind]} added`);
    setDialogOpen(false);
  }

  function updateObjectPosition(id: string, nextPosition: THREE.Vector3, velocityY?: number) {
    setObjects((current) =>
      resolveObjectCollisions(
        current.map((object) =>
          object.id === id
            ? {
                ...object,
                position: {
                  x: Number(clampToRoom(nextPosition.x).toFixed(2)),
                  y: Number(nextPosition.y.toFixed(2)),
                  z: Number(clampToRoom(nextPosition.z).toFixed(2))
                },
                velocityY
              }
            : object
        ),
        id
      )
    );
  }

  async function saveScene() {
    setStatus("Saving...");
    const savedObjects = objects.map(({ velocityY, ...object }) => ({
      ...object,
      position: {
        ...object.position,
        y: groundY(object.kind)
      }
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
        <Canvas camera={{ position: [6, 6, 8], fov: 45 }} shadows={{ type: THREE.PCFShadowMap }}>
          <color attach="background" args={["#d7e1eb"]} />
          <ambientLight intensity={0.65} />
          <directionalLight castShadow intensity={1.35} position={[5, 8, 5]} />
          <Suspense fallback={<Html center>Loading 3D scene...</Html>}>
            <SceneRoom objects={objects} onDragChange={setDragging} onMove={updateObjectPosition} />
            <Environment preset="city" />
          </Suspense>
          <OrbitControls makeDefault enableDamping enabled={!dragging} />
        </Canvas>
      </div>

      {dialogOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}>
          <div className="dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Add Object</h2>
            <div className="object-options">
              {(["cube", "sphere", "customDuck", "customRobot"] as ObjectKind[]).map((kind) => (
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
  onMove: (id: string, position: THREE.Vector3, velocityY?: number) => void;
}) {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#4b4a47" roughness={0.78} />
      </mesh>
      <Grid
        args={[14, 14]}
        cellColor="#9aa8b8"
        cellSize={1}
        fadeDistance={24}
        fadeStrength={1}
        position={[0, 0.01, 0]}
        sectionColor="#667085"
        sectionSize={2}
      />
      <LivingRoomBackdrop />
      <mesh position={[-7, 2, 0]} receiveShadow>
        <boxGeometry args={[0.16, 4, 14]} />
        <meshStandardMaterial color="#2d2b29" roughness={0.75} />
      </mesh>
      {objects.map((object) => (
        <DraggableObject key={object.id} object={object} onDragChange={onDragChange} onMove={onMove} />
      ))}
    </>
  );
}

function DraggableObject({
  object,
  onDragChange,
  onMove
}: {
  object: SceneObject;
  onDragChange: (dragging: boolean) => void;
  onMove: (id: string, position: THREE.Vector3, velocityY?: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [held, setHeld] = useState(false);
  const position = useMemo(() => toVector(object.position), [object.position]);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  useCursor(hovered);

  useFrame((_, delta) => {
    if (held || object.position.y <= groundY(object.kind)) {
      return;
    }

    const nextVelocity = (object.velocityY ?? 0) - 18 * delta;
    const nextY = Math.max(groundY(object.kind), object.position.y + nextVelocity * delta);
    const settleBounce = nextY === groundY(object.kind) && Math.abs(nextVelocity) > 5 ? 1.25 : 0;
    onMove(
      object.id,
      new THREE.Vector3(object.position.x, nextY + settleBounce, object.position.z),
      settleBounce ? -nextVelocity * 0.18 : nextY === groundY(object.kind) ? 0 : nextVelocity
    );
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
    onMove(object.id, point, 0);
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

function ObjectMesh({
  held,
  hovered,
  object
}: {
  held: boolean;
  hovered: boolean;
  object: SceneObject;
}) {
  const color = held ? "#f59e0b" : hovered ? "#0f9f7a" : "#2563eb";
  const scale = object.scale * (held ? 1.18 : 1);

  if (object.kind === "sphere") {
    return (
      <mesh castShadow scale={scale}>
        <sphereGeometry args={[0.58, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
    );
  }

  if (object.kind === "cone") {
    return (
      <mesh castShadow scale={scale}>
        <coneGeometry args={[0.58, 1.18, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    );
  }

  if (object.kind === "torus") {
    return (
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} scale={scale}>
        <torusGeometry args={[0.48, 0.18, 18, 52]} />
        <meshStandardMaterial color={color} metalness={0.18} roughness={0.38} />
      </mesh>
    );
  }

  if (object.kind === "duck" || object.kind === "customDuck" || object.kind === "customRobot") {
    return <CustomModel held={held} kind={object.kind} scale={scale} />;
  }

  return (
    <mesh castShadow scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.42} />
    </mesh>
  );
}

function LivingRoomBackdrop() {
  const texture = useTexture("/living-room-backdrop.png");
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh position={[0, 2.35, -6.95]} receiveShadow>
      <planeGeometry args={[14, 7.85]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function CustomModel({ held, kind, scale }: { held: boolean; kind: ObjectKind; scale: number }) {
  const gltf = useGLTF(modelUrls[kind] || modelUrls.customDuck!);

  return (
    <primitive
      object={gltf.scene.clone()}
      rotation={[0, Math.PI / 4, 0]}
      scale={scale * 38 * (held ? 1.08 : 1)}
    />
  );
}

useGLTF.preload("/models/custom-duck.glb");
useGLTF.preload("/models/custom-robot.glb");
