/**
 * Async handler wrapper для роутов
 * Оборачивает async функции и передает ошибки в error handler middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;