import mongoose from 'mongoose';

const annualReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true
  },

  // Annual totals
  totals: {
    income:  { type: Number, default: 0 },
    expense: { type: Number, default: 0 },
    saving:  { type: Number, default: 0 },
    net:     { type: Number, default: 0 }
  },

  // Month-by-month breakdown for PDF table
  monthlyBreakdown: [{
    month:   Number,
    income:  { type: Number, default: 0 },
    expense: { type: Number, default: 0 },
    saving:  { type: Number, default: 0 },
    net:     { type: Number, default: 0 }
  }],

  // Top spending categories for the full year
  topCategories: [{
    category:   String,
    amount:     Number,
    percentage: Number
  }],

  // AI-generated fields
  financialHealthScore: { type: Number, min: 0, max: 100 },
  summary:    { type: String, required: true },
  insights:   [{ type: String }],
  suggestions: [{
    category:        String,
    action:          String,
    potentialSavings: Number,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  }],

  // Year-over-year comparison (populated if previous year data exists)
  yearOverYear: {
    incomeChange:  Number,
    expenseChange: Number,
    savingChange:  Number
  },

  generatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

annualReportSchema.index({ user: 1, year: -1 }, { unique: true });

export default mongoose.model('AnnualReport', annualReportSchema);
