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
    scale: { type: Number, required: true, default: 1 }
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
    }
  },
  { timestamps: true }
);

export type SceneDocument = InferSchemaType<typeof SceneSchema>;

export const Scene =
  (mongoose.models.Scene as Model<SceneDocument>) ||
  mongoose.model("Scene", SceneSchema);
