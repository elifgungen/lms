function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }
  res.status(status).json({ error: err.message || "Internal Server Error" });
}

module.exports = { errorHandler };
