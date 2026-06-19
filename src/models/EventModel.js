const mongoose = require("mongoose");
const crypto = require("crypto");

const eventSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event_Page",
      default: null,
    },
    hosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    guests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    event_id: { type: String, required: true, unique: true },
    is_public: { type: Boolean, default: true },
    image: { type: String },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    seo_keywords: [String],
    analytics_meta_tag: String,
    start_at: {
      type: Date,
      required: true,
    },
    end_at: {
      type: Date,
      required: true,
    },
    ticket_type: { type: String, enum: ["Free", "Paid"] },
    ticket_price: [
      {
        name: String,
        description: String,
        price: { type: Number, default: 0 },
        currency: String,
        ticket_details: String,
        slots: { type: Number, default: null },
        ticket_questions: [
          {
            ques: { type: String },
            question_type: { type: String },
            options: [],
            required: { type: Boolean, default: false },
          },
        ],
      },
    ],
    charges_type: {
      type: String,
      enum: ["inclusive", "exclusive"],
      default: "exclusive",
    },
    approval: { type: Boolean, default: false },
    location: {
      type: String,
    },
    ai_chat: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    brand_color: { type: String },
    location_type: { type: String },
    virtual_link: { type: String },
    event_category: { type: String },
    capacity: { type: Number, default: null },
    is_closed: { type: String, default: "open" },
    policy: { type: String },
    registration_questions: [
      {
        ques: { type: String },
        question_type: { type: String },
        options: [],
        required: { type: Boolean, default: false },
      },
    ],
    is_blocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexing
eventSchema.index({ organizer: 1 });
eventSchema.index({ start_at: 1 });

// Generating event id
eventSchema.pre("validate", async function (next) {
  if (this.event_id) return next(); // ✅ this works correctly here

  const generateId = () => `evt-${crypto.randomBytes(8).toString("base64url")}`;

  let newId = generateId();
  let exists = await this.constructor.findOne({ event_id: newId });

  while (exists) {
    newId = generateId();
    exists = await this.constructor.findOne({ event_id: newId });
  }

  this.event_id = newId;
  next();
});

module.exports = mongoose.model("Event", eventSchema);
