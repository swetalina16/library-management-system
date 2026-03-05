const { validationResult } = require('express-validator');

/**
 * Shared middleware that reads express-validator results and sends a
 * structured 400 response if any rules failed.
 *
 * Usage: add `validate` as a middleware step after your validation rules array.
 *
 * Example:
 *   router.post('/checkout', [body('book_id').isInt()], validate, handler)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return the first human-readable error message as the top-level "error",
    // plus the full details array so clients can highlight specific fields.
    const details = errors.array();
    return res.status(400).json({
      error: details[0].msg,
      details,
    });
  }
  next();
};

module.exports = validate;
