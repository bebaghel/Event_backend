const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subs_id: { type: String, required: true, unique: true, index: true },
    plan: {
      type: String,
      enum: ["Starter", "Pro", "Enterprise"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "expired", "cancelled"],
      default: "pending",
    },
    start_date: Date,
    expiry_date: Date,
    expired_at: Date,
    billing_cycle: {
      type: String,
      enum: ["monthly", "yearly"],
    },
    final_price: { type: Number },
    gst_on_plan: { type: Number },
    plan_amount: { type: Number },
    currency: { type: String, default: "INR" },
    order_details: { type: Object, default: {} },
    payment_details: {
      type: Object,
      default: {},
    },
    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription_Transaction", SubscriptionSchema);
