const path = require("path");
const fs = require("fs");
const { validationResult } = require("express-validator");
const Event = require("../models/EventModel");
const TempAISession = require("../models/TempAISessionModel");
const Event_Page = require("../models/EventPageModel");
const User = require("../models/UserModel")

const parseNullableNumber = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

const createEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: "Validation errors",
        response: errors.array(),
      });
    }

    let {
      organizer,
      title,
      description,
      start_at,
      end_at,
      location,
      is_public,
      ticket_type,
      ticket_price,
      approval,
      location_type,
      capacity,
      guests,
      policy,
      // registration_questions,
      session_id,
      brand_color,
      virtual_link,
      event_category,
      page,
      seo_keywords
    } = req.body;

    const image = req.file?.filename || null;

    ticket_price = JSON.parse(ticket_price);

    if (seo_keywords) {
      seo_keywords = JSON.parse(seo_keywords);
    }

    // Convert price & slots to numbers
    ticket_price = ticket_price.map((t) => ({
      ...t,
      price: Number(t.price) || 0,
      slots: parseNullableNumber(t.slots),
    }));

    const parsedCapacity = parseNullableNumber(capacity);

    if (page == "null") page = null;

    const newEvent = await Event.create({
      organizer,
      is_public,
      ticket_type,
      ticket_price,
      approval,
      location_type,
      capacity: parsedCapacity,
      title,
      description,
      start_at,
      end_at,
      location,
      image,
      guests,
      policy,
      // registration_questions,
      brand_color,
      virtual_link,
      event_category,
      page,
      seo_keywords
    });

    if (session_id) {
      const session = await TempAISession.findOne({ session_id });
      if (session) {
        newEvent.ai_chat = session.ai_chat;
        await newEvent.save();
        await TempAISession.deleteOne({ session_id });
      }
    }

    if (page) {
      await Event_Page.findByIdAndUpdate(
        page,
        {
          $addToSet: {
            events: newEvent._id,
          },
          $inc: {
            "stats.total_events": 1,
          },
        },
        { new: true },
      );
    }


    await User.findOneAndUpdate({ _id: organizer, is_organizer: false }, {
      $set: {
        is_organizer: true
      }
    });

    return res.status(201).json({
      status: true,
      message: "Event created successfully",
      // response: newEvent,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "Error creating event",
      response: error,
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const image = req.file?.filename;

    const existingEvent = await Event.findOne({ event_id: id });

    if (!existingEvent) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    // Prepare update fields
    const updates = {
      ...req.body,
    };

    if (updates.page === "" || updates.page == "null") {
      delete updates.page;
    }

    if (updates.ticket_price) {
      try {
        let parsed = JSON.parse(updates.ticket_price);

        // Convert price & slots to numbers
        parsed = parsed.map((t) => ({
          ...t,
          price: Number(t.price) || 0,
          slots: parseNullableNumber(t.slots),
        }));

        updates.ticket_price = parsed;
      } catch (err) {
        return res.status(400).json({
          status: false,
          message: "Invalid ticket_price format. Must be JSON",
        });
      }
    }

    // if (updates.capacity) {
    updates.capacity = parseNullableNumber(updates.capacity);
    // }

    if (updates.seo_keywords) updates.seo_keywords = JSON.parse(updates.seo_keywords);

    // If new image uploaded → delete old one
    if (image) {
      if (existingEvent.image) {
        const imagePath = path.join(
          __dirname,
          "../../uploads/event_images",
          existingEvent.image,
        );
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      updates.image = image;
    }

    let oldPage;
    let newPage;
    if (updates?.page) {
      oldPage = existingEvent.page?.toString();
      newPage = updates.page?.toString();
    }

    const updatedEvent = await Event.findOneAndUpdate(
      { event_id: id },
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (newPage && oldPage !== newPage) {
      if (oldPage) {
        await Event_Page.findByIdAndUpdate(oldPage, {
          $pull: { events: updatedEvent._id },
          $inc: { "stats.total_events": -1 },
        });
      }

      await Event_Page.findByIdAndUpdate(newPage, {
        $addToSet: { events: updatedEvent._id },
        $inc: { "stats.total_events": 1 },
      });
    }

    return res.status(200).json({
      status: true,
      message: "Event updated successfully",
      // response: updatedEvent,
    });
  } catch (error) {
    console.log("Update event error", error);
    return res.status(500).json({
      status: false,
      message: "Error updating event",
      response: error.message,
    });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const {
      organizer,
      is_public,
      is_closed,
      event_category,
      page,
      limit = 5,
      pageSize = 1,
      todayOrLater = false,
    } = req.body;
    let query = {};

    if (organizer) {
      query.$or = [
        { organizer: organizer }, // for host
        { hosts: organizer }, // for co host
      ];
    }
    if (is_public) query.is_public = is_public;
    if (is_closed) query.is_closed = is_closed;
    if (event_category) query.event_category = event_category;
    if (page) query.page = page;

    if (todayOrLater) {
      const today = new Date();
      // today.setHours(0, 0, 0, 0);
      query.end_at = { $gte: today };
    }

    const skip = (pageSize - 1) * limit;

    const events = await Event.find(query)
      .select("brand_color event_id guests_count image is_closed location location_type start_at end_at event_category ticket_type title hosts guests")
      // .populate("organizer", "name profilePic picture")
      // .populate("hosts", "name profilePic picture")
      // .populate("guests", "name profilePic picture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(query);

    events.forEach(e => {
      e._doc.guests_count = e._doc.guests?.length || 0;
      delete e._doc.guests;
    });

    return res.status(200).json({
      status: true,
      message: "Events fetched successfully",
      response: events,
      pagination: {
        pageSize,
        limit,
        total,
        hasMore: skip + events.length < total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching events",
      response: error.message,
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ event_id: id })
      .populate(
        "organizer",
        "name profilePic picture social_links username platform_fees",
      )
      .populate("hosts", "name profilePic picture social_links username")
      // .populate("guests", "name profilePic picture")
      .sort({ createdAt: -1 });

    if (!event) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    event._doc.guests_count = event._doc.guests?.length || 0;
    delete event._doc.guests;

    return res.status(200).json({
      status: true,
      message: "Event fetched successfully",
      response: event,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching event",
      response: error.message,
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const existingEvent = await Event.findOne({ event_id: id });

    if (!existingEvent) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    if (existingEvent.page) {
      await Event_Page.findByIdAndUpdate(existingEvent.page, {
        $pull: { events: existingEvent?._id },
        $inc: { "stats.total_events": -1 },
      });
    }

    if (existingEvent.image) {
      const imagePath = path.join(
        __dirname,
        "../../uploads/event_images",
        existingEvent.image,
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Event.findOneAndDelete({ event_id: id });

    return res.status(200).json({
      status: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error deleting event",
      response: error.message,
    });
  }
};

const getEventWithLessData = async (req, res) => {
  try {
    const {
      organizer,
      is_public,
      is_closed,
      event_category,
      page,
      limit = 5,
      pageSize = 1,
      todayOrLater = false,
    } = req.body;
    let query = {};

    if (organizer) {
      query.$or = [
        { organizer: organizer }, // for host
        { hosts: organizer }, // for co host
      ];
    }
    if (is_public) query.is_public = is_public;
    if (is_closed) query.is_closed = is_closed;
    if (event_category) query.event_category = event_category;
    if (page) query.page = page;

    if (todayOrLater) {
      const today = new Date();
      // today.setHours(0, 0, 0, 0);
      query.end_at = { $gte: today };
    }

    const skip = (pageSize - 1) * limit;

    const events = await Event.find(query)
      .select("title ticket_type")
      .sort({ start_at: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(query);

    return res.status(200).json({
      status: true,
      message: "Events fetched successfully",
      response: events,
      pagination: {
        pageSize,
        limit,
        total,
        hasMore: skip + events.length < total,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching events",
      response: error.message,
    });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  updateEvent,
  deleteEvent,
  getEventById,
  getEventWithLessData,
};
