module.exports = function validate(schema) {
  return function validator(req, res, next) {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });
    if (!result.success) {
      return res.status(400).json({
        error: "Validation error",
        details: result.error.flatten()
      });
    }
    req.validated = result.data;
    next();
  };
};
