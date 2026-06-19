const UserRelation = require("../models/UserRelationModel");
const mongoose = require("mongoose");
const User = require("../models/UserModel");

const getUserRelation = async (req, res) => {
  try {
    let { user, page, limit, date, fromDate, toDate, guest } = req.body;
    let query = {};

    if (user) query.user = user;
    if (guest) query.guest = guest;

    // Date filters
    switch (date) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "last30days": {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        query.createdAt = { $gte: from };
        break;
      }

      case "last90days": {
        const from = new Date();
        from.setDate(from.getDate() - 90);
        query.createdAt = { $gte: from };
        break;
      }

      case "custom-range": {
        if (fromDate || toDate) {
          query.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(toDate + "T23:59:59"),
          };
        }
        break;
      }
    }

    limit = Number(limit);
    page = Number(page);
    const skip = (page - 1) * limit;

    const total = await UserRelation.countDocuments(query);

    const userRelation = await UserRelation.find(query)
      .populate("user", "-pin")
      .populate("guest", "-pin")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "UserRelation fetched successfully",
      response: {
        userRelation,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "Error fetching events",
      response: error.message,
    });
  }
};

const searchGuests = async (req, res) => {
  try {
    const user_id = req.user._id;

    let { search = "", limit = 20 } = req.body;

    limit = Number(limit);

    if (!search?.trim()) {
      return res.status(200).json({
        status: true,
        message: "No search text",
        response: [],
      });
    }

    const matchedUsers = await User.find(
      {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      },
      { _id: 1 }
    )
      .limit(limit)
      .lean();

    const userIds = matchedUsers.map((u) => u._id);

    const relations = await UserRelation.find({
      user: user_id,
      guest: { $in: userIds },
    })
      .select("guest")
      .populate("guest", "name email")
      .lean();

      const guests =  relations.map((r) => r.guest)

    return res.status(200).json({
      status: true,
      message: "Guests fetched successfully",
      response: guests,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: false,
      message: "Error fetching guests",
      response: error.message,
    });
  }
};

module.exports = { getUserRelation, searchGuests };
