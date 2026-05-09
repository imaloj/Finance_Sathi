import mongoose from 'mongoose';

const monthlyBudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  totalBudget: {
    type: Number,
    default: 0,
    min: 0
  },
  categoryBudgets: [{
    category: {
      type: String,
      required: true
    },
    limit: {
      type: Number,
      required: true,
      min: 0
    },
    alertThreshold: {
      type: Number,
      default: 80 // Alert at 80% usage
    }
  }],
  notes: String
}, {
  timestamps: true
});

monthlyBudgetSchema.index({ user: 1, year: -1, month: -1 }, { unique: true });

export default mongoose.model('MonthlyBudget', monthlyBudgetSchema);