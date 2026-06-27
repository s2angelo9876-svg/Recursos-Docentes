export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return res.status(400).json({ error: `Datos inválidos: ${messages}` });
    }
    req.body = result.data;
    next();
  };
}
