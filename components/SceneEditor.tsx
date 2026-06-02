"use client";

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { Environment, Grid, Html, OrbitControls, useCursor, useGLTF } from "@react-three/drei";
import { LogOut, Plus, Save } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { User } from "@/components/AppShell";

type ObjectKind = "cube" | "sphere" | "cone" | "torus" | "duck";

type SceneObject = {
  id: string;
  kind: ObjectKind;
  position: { x: number; y: number; z: number };
  scale: number;
};

const objectLabels: Record<ObjectKind, string> = {
  cube: "Cube",
  sphere: "Sphere",
  cone: "Cone",
  torus: "Torus",
  duck: "Custom GLB Duck"
};

const customModelUrl =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb";

type Props = {
  user: User;
  onLogout: () => void;
};

function randomPosition() {
  return {
    x: Number((Math.random() * 7 - 3.5).toFixed(2)),
    y: 0.55,
    z: Number((Math.random() * 7 - 3.5).toFixed(2))
  };
}

function toVector(position: SceneObject["position"]) {
  return new THREE.Vector3(position.x, position.y, position.z);
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
    setObjects((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind: selectedKind,
        position: randomPosition(),
        scale: selectedKind === "duck" ? 0.018 : 1
      }
    ]);
    setStatus(`${objectLabels[selectedKind]} added`);
    setDialogOpen(false);
  }

  function updateObjectPosition(id: string, nextPosition: THREE.Vector3) {
    setObjects((current) =>
      current.map((object) =>
        object.id === id
          ? {
              ...object,
              position: {
                x: Number(nextPosition.x.toFixed(2)),
                y: object.kind === "duck" ? 0.12 : Number(nextPosition.y.toFixed(2)),
                z: Number(nextPosition.z.toFixed(2))
              }
            }
          : object
      )
    );
  }

  async function saveScene() {
    setStatus("Saving...");
    const response = await fetch("/api/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objects })
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
        <Canvas camera={{ position: [6, 6, 8], fov: 45 }} shadows>
          <color attach="background" args={["#d7e1eb"]} />
          <ambientLight intensity={0.65} />
          <directionalLight castShadow intensity={1.5} position={[5, 8, 5]} />
          <Suspense fallback={<Html center>Loading 3D scene...</Html>}>
            <SceneRoom objects={objects} onMove={updateObjectPosition} />
            <Environment preset="city" />
          </Suspense>
          <OrbitControls makeDefault enableDamping />
        </Canvas>
      </div>

      {dialogOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}>
          <div className="dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Add Object</h2>
            <div className="object-options">
              {(Object.keys(objectLabels) as ObjectKind[]).map((kind) => (
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
  onMove: (id: string, position: THREE.Vector3) => void;
}) {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#e7edf4" roughness={0.72} />
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
      <mesh position={[0, 2, -7]} receiveShadow>
        <boxGeometry args={[14, 4, 0.16]} />
        <meshStandardMaterial color="#c6d2df" />
      </mesh>
      <mesh position={[-7, 2, 0]} receiveShadow>
        <boxGeometry args={[0.16, 4, 14]} />
        <meshStandardMaterial color="#dbe4ed" />
      </mesh>
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
  onMove: (id: string, position: THREE.Vector3) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [held, setHeld] = useState(false);
  const position = useMemo(() => toVector(object.position), [object.position]);

  useCursor(hovered);

  function drag(event: ThreeEvent<PointerEvent>) {
    if (!held) {
      return;
    }

    event.stopPropagation();
    const point = event.point.clone();
    point.y = object.kind === "duck" ? 0.12 : 0.55;
    onMove(object.id, point);
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

  if (object.kind === "duck") {
    return <DuckModel held={held} scale={scale} />;
  }

  return (
    <mesh castShadow scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.42} />
    </mesh>
  );
}

function DuckModel({ held, scale }: { held: boolean; scale: number }) {
  const gltf = useGLTF(customModelUrl);

  return (
    <primitive
      object={gltf.scene.clone()}
      rotation={[0, Math.PI / 4, 0]}
      scale={scale * (held ? 1.08 : 1)}
    />
  );
}
