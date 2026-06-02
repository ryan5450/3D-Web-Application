"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Html, useCursor, useGLTF, useTexture } from "@react-three/drei";
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
  targetY?: number;
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

const objectOptions: ObjectKind[] = ["cube", "sphere", "cone", "torus", "customDuck", "customRobot"];

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
  if (kind === "duck" || kind === "customDuck" || kind === "customRobot") {
    return -2.7;
  }

  return -2.45;
}

function dropPosition(index: number, kind: ObjectKind) {
  const columns = 4;
  const spacing = 1.75;
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: Number(((column - 1.5) * spacing).toFixed(2)),
    y: 4.4,
    targetY: Number((groundY(kind) + row * 0.08).toFixed(2)),
    z: Number((row * 0.08).toFixed(2))
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

function clampX(value: number) {
  return Math.max(-6, Math.min(6, value));
}

function clampY(value: number) {
  return Math.max(-2.85, Math.min(3.15, value));
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
        const dy = b.position.y - a.position.y;
        const distance = Math.hypot(dx, dy) || 0.001;

        if (distance >= minDistance) {
          continue;
        }

        const overlap = minDistance - distance;
        const directionX = dx / distance;
        const directionY = dy / distance;
        const activeA = a.id === activeId;
        const activeB = b.id === activeId;
        const moveA = activeB ? overlap : activeA ? 0 : overlap * 0.5;
        const moveB = activeA ? overlap : activeB ? 0 : overlap * 0.5;

        a.position.x = clampX(a.position.x - directionX * moveA);
        a.position.y = clampY(a.position.y - directionY * moveA);
        b.position.x = clampX(b.position.x + directionX * moveB);
        b.position.y = clampY(b.position.y + directionY * moveB);
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
                  x: Number(clampX(nextPosition.x).toFixed(2)),
                  y: Number(clampY(nextPosition.y).toFixed(2)),
                  z: Number(nextPosition.z.toFixed(2))
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
      position: object.position
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
        <Canvas
          camera={{ position: [0, 0, 10], zoom: 78 }}
          orthographic
          shadows={{ type: THREE.PCFShadowMap }}
        >
          <color attach="background" args={["#171717"]} />
          <ambientLight intensity={1.45} />
          <directionalLight castShadow intensity={1.1} position={[2, 4, 7]} />
          <Suspense fallback={<Html center>Loading 3D scene...</Html>}>
            <SceneRoom objects={objects} onMove={updateObjectPosition} />
          </Suspense>
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
  onMove
}: {
  objects: SceneObject[];
  onMove: (id: string, position: THREE.Vector3, targetY?: number) => void;
}) {
  return (
    <>
      <LivingRoomBackdrop />
      {objects.map((object) => (
        <DraggableObject key={object.id} object={object} onMove={onMove} />
      ))}
    </>
  );
}

function DraggableObject({
  object,
  onMove
}: {
  object: SceneObject;
  onMove: (id: string, position: THREE.Vector3, targetY?: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [held, setHeld] = useState(false);
  const position = useMemo(() => toVector(object.position), [object.position]);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  useCursor(hovered);

  useFrame((_, delta) => {
    const targetY = object.targetY ?? object.position.y;

    if (held || Math.abs(object.position.y - targetY) < 0.03) {
      return;
    }

    const smoothing = 1 - Math.pow(0.001, delta);
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

    onMove(object.id, new THREE.Vector3(point.x, point.y, object.position.z), point.y);
  }

  return (
    <group
      onPointerDown={(event) => {
        event.stopPropagation();
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        setHeld(true);
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
    <mesh position={[0, 0, -1]} receiveShadow>
      <planeGeometry args={[13.8, 7.76]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function CustomModel({ held, kind, scale }: { held: boolean; kind: ObjectKind; scale: number }) {
  const gltf = useGLTF(modelUrls[kind] || modelUrls.customDuck!);

  return (
    <group scale={scale * 38 * (held ? 1.08 : 1)}>
      <mesh>
        <sphereGeometry args={[1.2, 12, 8]} />
        <meshBasicMaterial depthWrite={false} opacity={0} transparent />
      </mesh>
      <primitive object={gltf.scene.clone()} rotation={[0, Math.PI / 8, 0]} />
    </group>
  );
}

useGLTF.preload("/models/custom-duck.glb");
useGLTF.preload("/models/custom-robot.glb");
