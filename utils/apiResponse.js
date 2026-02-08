/**
 * Standard API Response Handler
 */
class ApiResponse {
  /**
   * Success response
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Created response (201)
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No content response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Paginated response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
    });
  }

  /**
   * Error response
   */
  static error(res, message = 'Error', statusCode = 500, errors = []) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  /**
   * Validation error response
   */
  static validationError(res, errors = [], message = 'Validation failed') {
    return res.status(422).json({
      success: false,
      message,
      errors,
    });
  }

  /**
   * Unauthorized response
   */
  static unauthorized(res, message = 'Unauthorized') {
    return res.status(401).json({
      success: false,
      message,
    });
  }

  /**
   * Forbidden response
   */
  static forbidden(res, message = 'Forbidden') {
    return res.status(403).json({
      success: false,
      message,
    });
  }

  /**
   * Not found response
   */
  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  /**
   * Conflict response
   */
  static conflict(res, message = 'Resource already exists') {
    return res.status(409).json({
      success: false,
      message,
    });
  }

  /**
   * Too many requests response
   */
  static tooManyRequests(res, message = 'Too many requests, please try again later') {
    return res.status(429).json({
      success: false,
      message,
    });
  }
}

module.exports = ApiResponse;