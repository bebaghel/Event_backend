const User = require("../models/UserModel");
const Event = require("../models/EventModel");

const getEventsByApiKey = async (req, res) => {
  try {
    const user = req.apiUser;

    const events = await Event.find({ organizer: user._id })
      .select(
        "organizer image title location description start_at end_at ticket_type location location_type virtual_link event_id event_category createdAt"
      )
      .populate("organizer", "name username profilePic picture")
      .lean();

    return res.json({
      status: true,
      message: "Events fetched successfully",
      response: events,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

module.exports = {
  getEventsByApiKey,
};
