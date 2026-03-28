const mongoose = require('mongoose');
const { createDefaultProfile } = require('../utils/defaults');

const { Schema } = mongoose;

const appDataSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    groups: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    personalLoans: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    profile: {
      type: Schema.Types.Mixed,
      default: () => createDefaultProfile(),
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

module.exports = mongoose.model('AppData', appDataSchema);
