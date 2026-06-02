import { writeFile } from "node:fs/promises";
import { BoxGeometry, ConeGeometry, CylinderGeometry, Mesh, MeshStandardMaterial, Scene, SphereGeometry } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

globalThis.FileReader = class FileReader {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

async function exportScene(scene, outputPath) {
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, { binary: true });
  await writeFile(outputPath, Buffer.from(glb));
}

function makeMaterial(color, roughness = 0.55) {
  return new MeshStandardMaterial({ color, roughness });
}

function makeDuck() {
  const scene = new Scene();

  const body = new Mesh(new SphereGeometry(0.72, 32, 20), makeMaterial("#f4c542"));
  body.scale.set(1.25, 0.75, 0.82);
  body.position.set(0, 0.58, 0);
  scene.add(body);

  const head = new Mesh(new SphereGeometry(0.38, 32, 20), makeMaterial("#f5d35d"));
  head.position.set(0.78, 1.03, 0);
  scene.add(head);

  const beak = new Mesh(new ConeGeometry(0.18, 0.42, 24), makeMaterial("#f97316", 0.4));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(1.14, 1.01, 0);
  scene.add(beak);

  const wing = new Mesh(new SphereGeometry(0.28, 24, 16), makeMaterial("#eab308"));
  wing.scale.set(1.25, 0.42, 0.72);
  wing.position.set(0.1, 0.62, 0.55);
  scene.add(wing);

  return scene;
}

function makeRobot() {
  const scene = new Scene();

  const body = new Mesh(new BoxGeometry(0.75, 0.95, 0.72), makeMaterial("#475569"));
  body.position.set(0, 0.68, 0);
  scene.add(body);

  const head = new Mesh(new BoxGeometry(0.62, 0.5, 0.58), makeMaterial("#64748b"));
  head.position.set(0, 1.34, 0);
  scene.add(head);

  const antenna = new Mesh(new CylinderGeometry(0.035, 0.035, 0.5, 12), makeMaterial("#111827"));
  antenna.position.set(0, 1.82, 0);
  scene.add(antenna);

  const eyeLeft = new Mesh(new SphereGeometry(0.08, 16, 12), makeMaterial("#22d3ee", 0.2));
  eyeLeft.position.set(-0.16, 1.38, 0.31);
  scene.add(eyeLeft);

  const eyeRight = eyeLeft.clone();
  eyeRight.position.x = 0.16;
  scene.add(eyeRight);

  return scene;
}

await exportScene(makeDuck(), "public/models/custom-duck.glb");
await exportScene(makeRobot(), "public/models/custom-robot.glb");

console.log("Created local GLB models.");
