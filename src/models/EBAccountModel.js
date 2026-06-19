const mongoose = require("mongoose");
 
const EBAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
    },
    pin: {
      type: String,
    },
    otp: { type: String },
    otpExpiry: { type: Date },
    is_verfied: { type: Boolean, default: false },
    current_balance: { type: Number, default: 0 },
    last_settelment: { type: Number, default: 0 },
    total_earning: { type: Number, default: 0 },
    total_revenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);
 
module.exports = mongoose.model("EB_Account", EBAccountSchema);
 
 