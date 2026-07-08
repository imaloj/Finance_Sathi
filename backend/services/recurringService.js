import RecurringTransaction from '../models/RecurringTransaction.js';

/**
 * Calculate the next due date based on frequency from a given date.
 */
export const getNextDueDate = (fromDate, frequency, dayOfMonth) => {
  const date = new Date(fromDate);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly': {
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const day = dayOfMonth || date.getDate();
      const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      nextMonth.setDate(Math.min(day, maxDay));
      return nextMonth;
    }
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date;
};

/**
 * Get all recurring templates for a user.
 */
export const getRecurringTemplates = async (userId) => {
  return RecurringTransaction.find({ user: userId, isActive: true }).sort({ nextDueDate: 1 });
};

/**
 * Get due/overdue recurring transactions (today and up to 7 days past).
 */
export const getDueRecurring = async (userId) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return RecurringTransaction.find({
    user: userId,
    isActive: true,
    nextDueDate: { $lte: now, $gte: sevenDaysAgo }
  }).sort({ nextDueDate: 1 });
};

/**
 * Create a new recurring template.
 */
export const createRecurring = async (userId, data) => {
  const { type, amount, category, description, frequency, dayOfMonth, startDate } = data;

  const start = startDate ? new Date(startDate) : new Date();
  const nextDue = getNextDueDate(start, frequency, dayOfMonth || start.getDate());

  return RecurringTransaction.create({
    user: userId,
    type, amount, category, description,
    frequency,
    dayOfMonth: dayOfMonth || start.getDate(),
    nextDueDate: nextDue,
  });
};

/**
 * Update a recurring template (future reminders only).
 */
export const updateRecurring = async (userId, id, data) => {
  const allowed = ['type', 'amount', 'category', 'description', 'frequency', 'dayOfMonth', 'isActive'];
  const update = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

  const template = await RecurringTransaction.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!template) throw Object.assign(new Error('Recurring transaction not found'), { statusCode: 404 });
  return template;
};

/**
 * Delete (deactivate) a recurring template.
 */
export const deleteRecurring = async (userId, id) => {
  const template = await RecurringTransaction.findOneAndUpdate(
    { _id: id, user: userId },
    { isActive: false },
    { new: true }
  );
  if (!template) throw Object.assign(new Error('Recurring transaction not found'), { statusCode: 404 });
  return true;
};

/**
 * Mark a recurring as added — advances nextDueDate.
 */
export const markRecurringAdded = async (userId, id) => {
  const template = await RecurringTransaction.findOne({ _id: id, user: userId });
  if (!template) throw Object.assign(new Error('Recurring transaction not found'), { statusCode: 404 });

  const nextDue = getNextDueDate(template.nextDueDate, template.frequency, template.dayOfMonth);
  template.lastAddedDate = new Date();
  template.nextDueDate = nextDue;
  await template.save();
  return template;
};

/**
 * Skip a recurring — just advance the next due date without creating a transaction.
 */
export const skipRecurring = async (userId, id) => {
  return markRecurringAdded(userId, id); // same logic — just advance the date
};
