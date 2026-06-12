import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Income', 'Expense', 'Saving'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: [
        // Income
        'Salary', 'Freelance', 'Investment', 'Gift', 'Other_Income',
        // Expense
        'Food', 'Transport', 'Housing', 'Utilities', 'Healthcare', 
        'Entertainment', 'Shopping', 'Education', 'Personal', 'Other_Expense',
        // Saving
        'Emergency_Fund', 'Retirement', 'Investment', 'Goal_Based', 'Other_Saving'
      ],
      message: 'Please select a valid category'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  year: {
    type: Number
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }]
}, {
  timestamps: true
});

// Compound index for efficient monthly queries
transactionSchema.index({ user: 1, year: -1, month: -1, type: 1 });
transactionSchema.index({ user: 1, date: -1 });

// Auto-set month/year from date
transactionSchema.pre('validate', function(next) {
  if (this.date) {
    const d = new Date(this.date);
    if(!isNaN(d.getTime())){
    this.month = d.getMonth() + 1;
    this.year = d.getFullYear();
  }
}
});

export default mongoose.model('Transaction', transactionSchema);