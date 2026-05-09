import mongoose from 'mongoose';

const aiReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  financialHealthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  summary: {
    type: String,
    required: true
  },
  insights: [{
    type: String
  }],
  suggestions: [{
    category: String,
    action: String,
    potentialSavings: Number,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  }],
  spendingAnalysis: {
    topCategories: [{
      category: String,
      amount: Number,
      percentage: Number
    }],
    monthOverMonthChange: Number,
    budgetAdherence: Number
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

aiReportSchema.index({ user: 1, year: -1, month: -1 }, { unique: true });

export default mongoose.model('AIReport', aiReportSchema);