import mongoose from 'mongoose';

const recurringTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense', 'saving']
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  frequency: {
    type: String,
    required: true,
    enum: ['weekly', 'biweekly', 'monthly', 'yearly'],
    default: 'monthly'
  },
  dayOfMonth: {
    // For monthly: which day (1-31)
    type: Number,
    min: 1,
    max: 31
  },
  nextDueDate: {
    type: Date,
    required: true,
    index: true
  },
  lastAddedDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

recurringTransactionSchema.index({ user: 1, nextDueDate: 1, isActive: 1 });

export default mongoose.model('RecurringTransaction', recurringTransactionSchema);
