import mongoose from "mongoose";

const videoschema = mongoose.Schema(
  {
    videotitle: { type: String, required: true, trim: true, maxlength: 120 },
    filename: { type: String, required: true },
    filetype: { type: String, required: true },
    filepath: { type: String, required: true },
    filesize: { type: Number, required: true },
    videochanel: { type: String, required: true },
    category: { type: String, default: "All", index: true },
    description: { type: String, maxlength: 5000, default: "" },
    Like: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      index: true,
    },
  },
  { timestamps: true }
);

videoschema.index({ createdAt: -1 });
videoschema.index({ videotitle: "text", videochanel: "text" });

export default mongoose.model("videofiles", videoschema);
