import { body, param, query, validationResult } from 'express-validator';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  };
};

export const authValidators = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required')
  ]
};

export const transactionValidators = {
  create: [
    body('type').isIn(['income', 'expense', 'saving']).withMessage('Invalid transaction type'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('description').optional().trim().isLength({ max: 200 })
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid transaction ID'),
    body('type').optional().isIn(['income', 'expense', 'saving']),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('description').optional().trim().isLength({ max: 200 })
  ],
  delete: [
    param('id').isMongoId().withMessage('Invalid transaction ID')
  ],
  list: [
    query('month').optional().isInt({ min: 1, max: 12 }),
    query('year').optional().isInt({ min: 2000, max: 2100 }),
    query('type').optional().isIn(['income', 'expense', 'saving'])
  ]
};