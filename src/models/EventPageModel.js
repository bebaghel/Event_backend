const mongoose = require("mongoose");

const eventPageSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    page_username: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    logo: { type: String },
    banner: { type: String },
    theme_color: { type: String },
    about: { type: String, trim: true },
    category: { type: String },

    admins: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "editor", "manager"],
          default: "manager",
        },
      },
    ],

    events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],

    subscribers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    subscribers_count: { type: Number, default: 0 },

    social_links: [
      {
        platform: String,
        url: String,
      },
    ],

    location: { type: String },

    // Visibility & Status
    // is_verified: { type: Boolean, default: false },
    is_public: { type: Boolean, default: true },
    is_blocked: { type: Boolean, default: false },

    // Analytics (basic)
    stats: {
      total_events: { type: Number, default: 0 },
      total_attendees: { type: Number, default: 0 },
      total_views: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

eventPageSchema.index({ owner: 1 });

module.exports = mongoose.model("Event_Page", eventPageSchema);
