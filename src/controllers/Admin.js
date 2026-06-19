const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Admin = require("../models/AdminModel");
const Users = require("../models/UserModel");
const Events = require("../models/EventModel");
const Bookings = require("../models/BookingModel");
const EventPages = require("../models/EventPageModel");
const EB_Transaction = require("../models/EBTransactionModel");
const EB_Account = require("../models/EBAccountModel");

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(400).json({ status: false, message: "Invalid email" });

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid)
      return res
        .status(400)
        .json({ status: false, message: "Invalid password" });

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      status: true,
      message: "Login successful",
      response: { admin, token },
    });
  } catch (error) {
    console.error("Error during admin login:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
      response: error.message,
    });
  }
};

const addAdmin = async (req, res) => {
  try {
    const { admin_name, email, password, role } = req.body;
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        status: false,
        message: "Admin with this email already exists",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      admin_name,
      email,
      password: hashedPassword,
      role,
    });
    return res.status(201).json({
      status: true,
      message: "Admin added successfully",
      response: newAdmin,
    });
  } catch (error) {
    console.error("Error adding admin:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
      response: error.message,
    });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    return res.status(200).json({
      status: true,
      message: "Admins retrieved successfully",
      response: admins,
    });
  } catch (error) {
    console.error("Error retrieving admins:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
      response: error.message,
    });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAdmin = await Admin.findByIdAndDelete(id);
    if (!deletedAdmin) {
      return res.status(404).json({
        status: false,
        message: "Admin not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
      response: error.message,
    });
  }
};

const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).select("-password");
    if (!admin) {
      return res
        .status(404)
        .json({ status: false, message: "Admin not found" });
    }
    return res.status(200).json({
      status: true,
      message: "Admin retrieved successfully",
      response: admin,
    });
  } catch (error) {
    console.error("Error retrieving admin:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
      response: error.message,
    });
  }
};

const getDashboardCount = async (req, res) => {
  try {
    const userCount = await Users.countDocuments();
    const eventCount = await Events.countDocuments();
    const bookingCount = await Bookings.countDocuments();
    const eventPageCount = await EventPages.countDocuments();

    return res.status(200).json({
      status: true,
      message: "Dashboard count retrieved successfully",
      response: {
        userCount,
        eventCount,
        bookingCount,
        eventPageCount,
      },
    });
  } catch (error) {
    console.error("Error retrieving dashboard count:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
      response: error.message,
    });
  }
};

const getAllAccounts = async (req, res) => {
  try {
    let { search, limit = 10, page = 1 } = req.body;

    let query = {};

    if (search && search.trim() !== "") {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const totalUsers = await Users.countDocuments(query);

    const users = await Users.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .select("-otp -otpExpiry -pin");

    return res.status(200).json({
      status: true,
      message: "Accounts retrieved successfully",
      response: {
        users,
        totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error getting user",
      response: error.message,
    });
  }
};

const getEBAccount = async (req, res) => {
  try {
    const account = await EB_Account.findOne({
      email: "finance@assistbuddi.com",
    });
    if (!account) {
      return res.status(404).json({
        status: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Account get successfully",
      response: account,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error getting user",
      response: error.message,
    });
  }
};

const getEBTransactions = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      type,
      mode,
      status,
      transaction_id,
      user,
      reference,
    } = req.body;

    let query = {};

    if (type) query.type = type;
    if (mode) query.mode = mode;
    if (status) query.status = status;
    if (transaction_id) query.transaction_id = transaction_id;
    if (user) query.user = user;
    if (reference) query.reference = reference;

    const skip = (page - 1) * limit;
    const total = await EB_Transaction.countDocuments(query);

    const transactions = await EB_Transaction.find(query)
      .populate({
        path: 'booking',
        select: 'event order_details organizer payment_details user',
        populate: {
          path: 'user',
          select: 'name email phone'
        }
      })
      .populate("user", "name email phone")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Transactions get successfully",
      response: {
        transactions,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error getting user",
      response: error.message,
    });
  }
};

module.exports = {
  loginAdmin,
  addAdmin,
  getAllAdmins,
  deleteAdmin,
  getAdminById,
  getDashboardCount,
  getAllAccounts,
  getEBAccount,
  getEBTransactions,
};
