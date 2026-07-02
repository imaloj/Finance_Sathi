import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  event: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'login_failed',
      'password_changed',
      'password_reset_requested',
      'email_verified',
      'account_settings_updated',
      'transaction_added',
      'transaction_edited',
      'transaction_deleted',
      'account_deletion_failed',
      'activity_pin_set',
      'activity_log_accessed',
    ]
  },
  description: { type: String, trim: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String },
  userAgent: { type: String },
}, {
  timestamps: true
});

activityLogSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
