import mongoose from "mongoose";

const downloadSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

downloadSchema.index({ user: 1, videoid: 1 }, { unique: true });
downloadSchema.index({ user: 1, downloadedAt: -1 });

export default mongoose.model("download", downloadSchema);
