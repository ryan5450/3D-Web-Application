import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Scene } from "@/models/Scene";

const allowedKinds = new Set([
  "cube",
  "sphere",
  "cone",
  "torus",
  "chair",
  "sofa",
  "table",
  "duck",
  "customDuck",
  "customRobot"
]);

function normalizeObjects(objects: unknown) {
  if (!Array.isArray(objects)) {
    return [];
  }

  return objects
    .filter((item) => {
      const object = item as { id?: unknown; kind?: unknown; position?: unknown };
      const position = object.position as { x?: unknown; y?: unknown; z?: unknown } | undefined;
      return (
        typeof object.id === "string" &&
        typeof object.kind === "string" &&
        allowedKinds.has(object.kind) &&
        position &&
        typeof position.x === "number" &&
        typeof position.y === "number" &&
        typeof position.z === "number"
      );
    })
    .map((item) => {
      const object = item as {
        id: string;
        kind: string;
        position: { x: number; y: number; z: number };
        scale?: number;
      };

      return {
        id: object.id,
        kind: object.kind,
        position: object.position,
        scale: typeof object.scale === "number" ? object.scale : 1
      };
    });
}

export async function GET() {
  const { userId } = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const scene = await Scene.findOne({ userId });

  return NextResponse.json({ objects: scene?.objects || [] });
}

export async function POST(request: Request) {
  const { userId } = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { objects } = await request.json();
  const normalizedObjects = normalizeObjects(objects);

  await connectDB();
  await Scene.findOneAndUpdate(
    { userId },
    { $set: { objects: normalizedObjects } },
    { upsert: true, returnDocument: "after" }
  );

  return NextResponse.json({ ok: true, objects: normalizedObjects });
}
