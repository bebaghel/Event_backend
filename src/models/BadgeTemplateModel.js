const mongoose = require("mongoose");

const BadgeTemplateSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  name: String,
  background: { type: String },
  elements: [{ type: Object, default: {} }],
});

module.exports = mongoose.model("BadgeTemplate", BadgeTemplateSchema);
