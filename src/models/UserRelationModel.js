const mongoose = require("mongoose");

const UserRelationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

UserRelationSchema.index({ user: 1, guest: 1 }, { unique: true });

module.exports = mongoose.model("UserRelation", UserRelationSchema);
