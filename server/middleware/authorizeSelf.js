export function authorizeSelf(paramName = "userId") {
  return (req, res, next) => {
    const requestedId = req.params[paramName];
    if (!requestedId || String(requestedId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
