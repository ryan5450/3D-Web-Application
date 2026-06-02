import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SceneObjectSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, required: true },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      z: { type: Number, required: true }
    },
    scale: { type: Number, required: true, default: 1 },
    rotationY: { type: Number, required: true, default: 0 },
    color: { type: String, required: false }
  },
  { _id: false }
);

const SceneSlotSchema = new Schema(
  {
    slot: { type: String, required: true },
    theme: { type: String, required: true, default: "cozy" },
    objects: {
      type: [SceneObjectSchema],
      default: []
    }
  },
  { _id: false }
);

const SceneSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    objects: {
      type: [SceneObjectSchema],
      default: []
    },
    scenes: {
      type: [SceneSlotSchema],
      default: []
    }
  },
  { timestamps: true }
);

export type SceneDocument = InferSchemaType<typeof SceneSchema>;

export const Scene =
  (mongoose.models.Scene as Model<SceneDocument>) ||
  mongoose.model("Scene", SceneSchema);
