export function notFound(_req, res) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "The requested resource was not found." },
  });
}

// Express recognizes error middleware by its four arguments. Keep this last.
export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : 500;

  const responses = {
    400: { code: "BAD_REQUEST", message: "The request could not be processed." },
    404: { code: "NOT_FOUND", message: "The requested resource was not found." },
    413: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large." },
    415: { code: "UNSUPPORTED_MEDIA_TYPE", message: "The request body encoding is not supported." },
  };
  const response = error.type === "entity.parse.failed"
    ? { code: "INVALID_JSON", message: "The request body must contain valid JSON." }
    : responses[status] ?? (status >= 500
      ? { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." }
      : { code: "REQUEST_ERROR", message: "The request could not be processed." });

  // Do not send parser details, filesystem paths, or stack traces to clients.
  res.status(status).json({ error: response });
}
