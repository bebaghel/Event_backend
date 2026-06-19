const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    profilePic: {
      type: String,
    },
    bio: {
      type: String,
    },
    googleId: {
      type: String,
    },
    picture: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    api_key: {
      type: String,
      unique: true,
      sparse: true,
    },
    api_key_createdAt: {
      type: Date,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    country_code: { type: String },

    is_organizer: { type: Boolean, default: false },

    ownered_pages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event_Page",
      },
    ],
    associated_pages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event_Page",
      },
    ],

    joined_events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],

    hosted_events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],

    social_links: [
      {
        platform: String,
        url: String,
      },
    ],

    subscriptions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event_Page",
      },
    ],

    plan: {
      type: {
        type: String,
        enum: ["Starter", "Pro", "Enterprise"],
        default: "Starter",
      },
      amount: { type: Number, default: 0 },
      subscribed_date: { type: Date, default: null },
      expiry_date: { type: Date, default: null },
      billing_cycle: {
        type: String,
        enum: ["monthly", "yearly"],
        default: null,
      },
    },

    pin: { type: String },
    account_details: { type: Object }, // encrypt data

    charges_type: {
      type: String,
      enum: ["inclusive", "exclusive"],
      default: "exclusive",
    },

    otp: { type: String },
    otpExpiry: { type: Date },
    is_verfied: { type: Boolean, default: false },

    currency: { type: String, default: "INR" },
    platform_fees: { type: Number, default: () => Number(process.env.CHARGES) },
    current_balance: { type: Number, default: 0 },
    last_settelment: { type: Number, default: 0 },
    total_earning: { type: Number, default: 0 },
    self_collected_amount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UserSchema.index({ name: 1, email: 1 });

// UserSchema.index(
//   { phone: 1 },
//   {
//     unique: true,
//     partialFilterExpression: {
//       phone: { $exists: true, $ne: "" },
//     },
//   }
// );

module.exports = mongoose.model("User", UserSchema);
