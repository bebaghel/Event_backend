const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tin: { type: String, required: true, unique: true, index: true },
    booking_date: { type: Date, default: Date.now },
    order_details: { type: Object, default: {} },
    final_price: { type: Number, default: 0 },
    payment_details: {
      type: Object,
      default: {},
    },
    ticket_info: {
      type: Object,
      default: {},
    },
    registration_answers: [
      {
        ques: { type: String },
        answer: { type: String },
      },
    ],
    is_checked_in: { type: Boolean, default: false },
    is_approved: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Pending", "Booked", "Not Booked", "Cancelled"],
      default: "Pending",
    },
    meta: { type: Object, default: {} },
    cancellation: {
      cancelledAt: { type: Date },
      refundAmount: { type: Number },
      reason: { type: String },
    },
    is_booked_by_organizer: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BookingSchema.pre("validate", async function (next) {
  if (this.tin) return next();

  const generateTin = () => {
    const tin = Array.from({ length: 10 }, () =>
      Math.floor(Math.random() * 10),
    ).join("");
    return tin;
  };
  let newTin = generateTin();
  let exists = await this.constructor.findOne({ tin: newTin });
  while (exists) {
    newTin = generateTin();
    exists = await this.constructor.findOne({ tin: newTin });
  }
  this.tin = newTin;
  next();
});

module.exports = mongoose.model("Booking", BookingSchema);
