const mongoose = require("mongoose");
const crypto = require("crypto");

const EBTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Organizer
      index: true,
    },
    transaction_id: { type: String, required: true, unique: true, index: true },
    reference: { type: String },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    type: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    mode: {
      type: String,
      required: true, //booking, subscription, withdraw, refund
    },
    net_amount: {
      type: Number,
      required: true, // Net amount (e.g., 475 for income, -475 for withdrawal)
    },
    charges: {
      type: Number,
      default: 0,
    },
    total_fee: {
      type: Number,
      default: 0,
    },
    gst: {
      type: Number,
      default: 0,
    },
    charges_type: {
      type: String, // inclusive, exclusive
    },
    gross_amount: {
      type: Number, // Full price before charges (e.g., 500); null for withdrawals
    },
    pg_charges: { type: Number, default: 0 },
    pg_tax: { type: Number, default: 0 },
    total_pg_fees: { type: Number, default: 0 },
    eb_charges: { type: Number, default: 0 },
    eb_tax: { type: Number, default: 0 },
    total_eb_fees: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed"],
      default: "pending",
    },
    // order_details: { type: Object, default: {} },
    // payment_details: {
    //   type: Object,
    //   default: {},
    // },
  },
  { timestamps: true },
);

EBTransactionSchema.pre("validate", async function (next) {
  if (this.transaction_id) return;

  const generateId = () => {
    const min = 1_000_000_000;
    const max = 10_000_000_000;
    const num = crypto.randomInt(min, max);
    return `EBTXN-${num}`;
  };

  let newId = generateId();
  let exists = await this.constructor.findOne({ transaction_id: newId });

  while (exists) {
    newId = generateId();
    exists = await this.constructor.findOne({ transaction_id: newId });
  }

  this.transaction_id = newId;
  next();
});

module.exports = mongoose.model("EB_Transaction", EBTransactionSchema);
