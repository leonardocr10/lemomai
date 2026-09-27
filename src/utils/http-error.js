class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static notFound(message = 'Página não encontrada') {
    return new HttpError(404, message);
  }

  static badRequest(message = 'Requisição inválida', details) {
    return new HttpError(400, message, details);
  }

  static forbidden(message = 'Acesso negado') {
    return new HttpError(403, message);
  }
}

module.exports = HttpError;
