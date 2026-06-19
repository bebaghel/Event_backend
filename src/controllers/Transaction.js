const Transaction = require("../models/TransactionModel");

const getAllTransactions = async (req, res) => {
  try {
    let {
      user,
      booking,
      type,
      status,
      page,
      limit,
      txt_id,
      date,
      mode,
      fromDate,
      toDate,
      reference
    } = req.body;

    let query = {};
    if (user) query.user = user;
    if (booking) query.booking = booking;
    if (type) query.type = type;
    if (reference) query.reference = reference;
    if (status) query.status = status;
    if (mode) query.mode = mode;
    if (txt_id) query.transaction_id = { $regex: txt_id, $options: "i" };

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

    const transactions = await Transaction.find(query)
      .limit(limit)
      .skip(skip)
      .populate({
        path: 'booking',
        select: 'event order_details organizer payment_details user',
        populate: {
          path: 'user',
          select: 'name email phone'
        }
      })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    const total = await Transaction.countDocuments(query);

    return res.status(200).json({
      status: true,
      message: "Transactions get successfully",
      response: {
        transactions,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);

    return res.status(200).json({
      status: true,
      message: "Transaction get successfully",
      response: transaction,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

module.exports = { getAllTransactions, getTransactionById };
