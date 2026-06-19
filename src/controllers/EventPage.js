const fs = require("fs");
const path = require("path");
const Event_Page = require("../models/EventPageModel");
const User = require("../models/UserModel");
const Event = require("../models/EventModel");
const { generateUniqueUsername } = require("./User");

const createPage = async (req, res) => {
  try {
    const userId = req.user?._id;
    let {
      name,
      page_username,
      about,
      category,
      is_public,
      theme_color,
      social_links,
      location,
    } = req.body;

    const logo = req.files?.logo?.[0]?.filename || null;
    const banner = req.files?.banner?.[0]?.filename || null;

    social_links = JSON.parse(social_links || "[]");

    const newPage = await Event_Page.create({
      owner: userId,
      name,
      page_username,
      logo,
      banner,
      about,
      category,
      is_public,
      theme_color,
      social_links,
      location,
    });

    return res.status(201).json({
      status: true,
      message: "Event page created successfully",
      response: newPage,
    });
  } catch (error) {
    console.error("Create Event page error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Page Username already taken",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Create Event page failed",
      response: error.message,
    });
  }
};

const updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      theme_color,
      about,
      name,
      is_public,
      page_username,
      social_links,
      location,
    } = req.body;

    const event_page = await Event_Page.findById(id);

    // logo upload
    if (req.files?.logo?.[0]) {
      if (event_page?.logo) {
        const oldLogoPath = path.join(
          __dirname,
          "../../uploads/page_images",
          event_page.logo
        );
        if (fs.existsSync(oldLogoPath)) fs.unlinkSync(oldLogoPath);
      }

      event_page.logo = req.files.logo[0].filename;
    }

    // banner upload
    if (req.files?.banner?.[0]) {
      if (event_page.banner) {
        const oldBannerPath = path.join(
          __dirname,
          "../../uploads/page_images",
          event_page.banner
        );
        if (fs.existsSync(oldBannerPath)) fs.unlinkSync(oldBannerPath);
      }

      event_page.banner = req.files.banner[0].filename;
    }

    if (theme_color) event_page.theme_color = theme_color;
    if (about) event_page.about = about;
    if (name) event_page.name = name;
    if (page_username) event_page.page_username = page_username;
    if (location) event_page.location = location;
    if (social_links) {
      social_links = JSON.parse(social_links || "[]");
      event_page.social_links = social_links;
    }
    event_page.is_public = is_public;

    await event_page.save();

    return res.json({
      status: true,
      message: "Page updated successfully",
      response: event_page,
    });
  } catch (error) {
    console.log("updatePageConfig error", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Page username already taken",
      });
    }
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const getAllPages = async (req, res) => {
  try {
    const { user, limit = 10, page = 1, is_public } = req.body;
    let query = {};

    if (user) {
      query.$or = [{ owner: user }, { "admins.user": user }];
    }

    if (is_public) query.is_public = true;

    const skip = (page - 1) * limit;
    const total = await Event_Page.countDocuments(query);

    const pages = await Event_Page.find(query)
      .populate("owner", "name")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });
    return res.json({
      status: true,
      message: "Pages retrieved successfully",
      response: {
        pages,
        total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log("getAllPages error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const getPageById = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await Event_Page.findById(id);
    if (!page) {
      return res.status(404).json({
        status: false,
        message: "Page not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Page fetched successfully",
      response: page,
    });
  } catch (error) {
    console.log("getPageById error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const getPageByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const page = await Event_Page.findOne({ page_username: username });

    if (!page) {
      return res.status(404).json({
        status: false,
        message: "Page not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Page fetched successfully",
      response: page,
    });
  } catch (error) {
    console.log("getPageByUsername error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await Event_Page.findByIdAndDelete(id);

    if (!page) {
      return res.status(404).json({
        status: false,
        message: "Page not found",
      });
    }

    // Remove page reference from all events
    await Event.updateMany({ page: id }, { $unset: { page: "" } });

    return res.status(200).json({
      status: true,
      message: "Page deleted successfully",
    });
  } catch (error) {
    console.log("deletePage error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { pageId, name, email, phone, role } = req.body;

    if (!pageId || !email) {
      return res.status(400).json({
        status: false,
        message: "PageId and email are required",
      });
    }

    // authorization check
    const page = await Event_Page.findById(pageId);
    if (!page) {
      return res.status(404).json({
        status: false,
        message: "Page not found",
      });
    }

    if (page.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: false,
        message: "You are not allowed to manage admins",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const username = await generateUniqueUsername({ name, email });
      user = await User.create({ name, email, phone, username });
    }

    // check already admin
    const alreadyAdmin = page.admins.find(
      (a) => a.user.toString() === user._id.toString()
    );

    if (alreadyAdmin) {
      alreadyAdmin.role = role;
      await page.save();

      return res.json({
        status: true,
        message: "Admin role updated",
        response: page,
      });
    }

    // add new admin
    page.admins.push({ user: user._id, role });
    await page.save();

    return res.status(200).json({
      status: true,
      message: "Admin added successfully",
      response: page,
    });
  } catch (error) {
    console.log("updateAdmin error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const subscribePage = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    // add subscriber in page

    const page = await Event_Page.findOneAndUpdate(
      { _id: id, subscribers: { $ne: userId } },
      {
        $addToSet: { subscribers: userId },
        $inc: { subscribers_count: 1 },
      },
      { new: true }
    );

    if (!page) {
      return res.status(200).json({
        status: true,
        message: "Already subscribed",
      });
    }

    // add page in subscriber
    await User.findByIdAndUpdate(userId, {
      $addToSet: { subscriptions: id },
    });

    return res.status(200).json({
      status: true,
      message: "Page subscribed successfully",
      response: page,
    });
  } catch (error) {
    console.log("subscribePage error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const un_subscribePage = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const page = await Event_Page.findOneAndUpdate(
      { _id: id, subscribers: userId },
      {
        $pull: { subscribers: userId },
        $inc: { subscribers_count: -1 },
      },
      { new: true }
    );

    if (!page) {
      return res.status(200).json({
        status: true,
        message: "Already un-subscribed",
      });
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { subscriptions: id },
    });

    return res.status(200).json({
      status: true,
      message: "Page un-subscribed successfully",
      response: page,
    });
  } catch (error) {
    console.log("un_subscribePage error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

module.exports = {
  createPage,
  updatePage,
  getAllPages,
  getPageById,
  getPageByUsername,
  deletePage,
  updateAdmin,
  subscribePage,
  un_subscribePage,
};
