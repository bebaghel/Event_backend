const Transaction = require("../models/TransactionModel");
const User = require("../models/UserModel");

const withDraw = async (req, res) => {
  try {
    const userId = req.user?._id;
    let { id, withdrawal_amount } = req.body;
    withdrawal_amount = Number(withdrawal_amount);

    if (withdrawal_amount < 1) {
      return res.status(500).json({
        status: false,
        message: "Invalid Amount",
      });
    }

    if (withdrawal_amount > req.user.current_balance) {
      return res.status(500).json({
        status: false,
        message: "Insufficient Fund",
      });
    }

    await Transaction.create({
      user: id,
      net_amount: withdrawal_amount,
      gross_amount: withdrawal_amount,
      mode: "withdraw",
      type: "debit",
      status: "pending",
    });

    await User.findByIdAndUpdate(userId, {
      $inc: {
        current_balance: -withdrawal_amount,
      },
      $set: {
        last_settelment: withdrawal_amount,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Withdraw request send successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const updateWithdrawStatus = async (req, res) => {
  try {
    const { user_id, withdrawl_id, status, order_id, payment_id, } = req.body;

    await Transaction.findByIdAndUpdate(
      { _id: withdrawl_id, status: "pending" },
      {
        order_id,
        payment_id,
        mode: "withdraw",
        type: "debit",
        status,
      }, { new: true });

    return res.status(200).json({
      status: true,
      message: "Withdrawl update successfully",
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
}

module.exports = { withDraw, updateWithdrawStatus };
