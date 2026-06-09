export function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File exceeds 100MB limit" });
  }
  if (err?.message === "Only MP4 videos are allowed") {
    return res.status(400).json({ message: err.message });
  }

  res.status(err.status || 500).json({
    message: err.message || "Something went wrong",
  });
}
