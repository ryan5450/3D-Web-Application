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
  "lamp",
  "plant",
  "bookshelf",
  "rug",
  "tv",
  "bed",
  "cabinet",
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
        rotationY?: number;
        color?: string;
      };

      return {
        id: object.id,
        kind: object.kind,
        position: object.position,
        scale: typeof object.scale === "number" ? object.scale : 1,
        rotationY: typeof object.rotationY === "number" ? object.rotationY : 0,
        color: typeof object.color === "string" ? object.color : undefined
      };
    });
}

function sceneSlotFromUrl(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("slot") || "room-1";
}

export async function GET(request: Request) {
  const { userId } = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const scene = await Scene.findOne({ userId });
  const slot = sceneSlotFromUrl(request);
  const savedSlot = scene?.scenes?.find((item) => item.slot === slot);

  return NextResponse.json({
    objects: savedSlot?.objects || (slot === "room-1" ? scene?.objects || [] : []),
    theme: savedSlot?.theme || "cozy",
    slots: scene?.scenes?.map((item) => ({ slot: item.slot, theme: item.theme })) || []
  });
}

export async function POST(request: Request) {
  const { userId } = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { objects, slot = "room-1", theme = "cozy" } = await request.json();
  const normalizedObjects = normalizeObjects(objects);

  await connectDB();
  const scene = await Scene.findOne({ userId });

  if (!scene) {
    await Scene.create({
      userId,
      objects: slot === "room-1" ? normalizedObjects : [],
      scenes: [{ slot, theme, objects: normalizedObjects }]
    });
  } else {
    const scenes = [...(((scene as { scenes?: unknown[] }).scenes || []) as Array<{ slot: string; theme: string; objects: unknown[] }>)];
    const index = scenes.findIndex((item) => item.slot === slot);

    if (index >= 0) {
      scenes[index] = { slot, theme, objects: normalizedObjects };
    } else {
      scenes.push({ slot, theme, objects: normalizedObjects });
    }

    (scene as unknown as { scenes: typeof scenes }).scenes = scenes;
    if (slot === "room-1") {
      (scene as unknown as { objects: typeof normalizedObjects }).objects = normalizedObjects;
    }
    await scene.save();
  }

  return NextResponse.json({ ok: true, objects: normalizedObjects });
}
