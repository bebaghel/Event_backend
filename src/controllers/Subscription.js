const cron = require("node-cron");
const Subscription_Transaction = require("../models/SubscriptionTransaction");
const EB_Transaction = require("../models/EBTransactionModel");
const EB_Account = require("../models/EBAccountModel");
const Transaction = require("../models/TransactionModel");
const User = require("../models/UserModel");
const RazorPay = require("../config/payment");

const calcExpiry = (baseDate, billing_cycle) => {
  const d = new Date(baseDate);
  if (billing_cycle === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
};

const generateSubscriptionID = async () => {
  return new Promise(async (resolve) => {
    let newSubs_id = Array.from({ length: 10 }, () =>
      Math.floor(Math.random() * 10)
    ).join("");

    let exists = await Subscription_Transaction.findOne({
      subs_id: newSubs_id,
    });
    if (exists) generateSubscriptionID();
    resolve(newSubs_id);
  });
};

const subscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = "Pro", currency = "INR", billing_cycle } = req.body;

    const subs_id = await generateSubscriptionID();
    const user = await User.findById(userId);

    let plan_amount;

    if (billing_cycle == "monthly") {
      plan_amount = Number(process.env.PRO_PLAN_MONTHLY);
    } else {
      plan_amount = Number(process.env.PRO_PLAN_YEARLY);
    }

    const now = new Date();
    let baseDate = now;
    if (user.plan?.expiry_date && new Date(user.plan.expiry_date) > now) {
      baseDate = new Date(user.plan.expiry_date);
    }

    const expiry_date = calcExpiry(baseDate, billing_cycle);

    const GST = Number(process.env.GST);
    const gst_on_plan = plan_amount * GST;
    let final_price = plan_amount + gst_on_plan;

    // lets make round upto 2 decimal
    final_price = parseFloat(final_price.toFixed(2));

    let order_details;
    let rzp_order = await RazorPay.createOrder(
      final_price,
      currency,
      "eb_subscription_" + subs_id
    );
    console.log("rzp_order for subscription => ", rzp_order);
    if (rzp_order) order_details = rzp_order;
    else {
      return res.status(400).json({
        status: false,
        message: "Unable to create order for subscription.",
      });
    }

    const newSubscription = await Subscription_Transaction.create({
      user: userId,
      subs_id,
      order_details,
      status: "pending",
      currency,
      plan: type,
      final_price,
      plan_amount,
      gst_on_plan,
      billing_cycle,
      start_date: now,
      expiry_date,
    });

    return res.status(201).json({
      status: true,
      message: "Subscription created. Complete payment.",
      response: newSubscription,
    });
  } catch (error) {
    console.error("Subscription Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const confirm_subscription = async (order_id, pay_obj, res) => {
  try {
    const subscription = await Subscription_Transaction.findOneAndUpdate(
      {
        "order_details.id": order_id,
        status: "pending",
      },
      {
        payment_details: pay_obj,
        status: "active",
      },
      {
        new: true,
      }
    );

    if (!subscription) {
      return res.status(404).json({
        status: false,
        message: "Subscription not found",
      });
    }

    const userId = subscription.user;

    await User.findByIdAndUpdate(userId, {
      platform_fees: 0.02,
      plan: {
        type: subscription.plan,
        amount: subscription.plan_amount,
        subscribed_date: subscription.start_date,
        expiry_date: subscription.expiry_date,
        billing_cycle: subscription.billing_cycle,
      },
    });

    // Event Buddi Transaction
    await EB_Transaction.create({
      user: userId,
      reference: subscription._id,
      type: "credit",
      net_amount: subscription.plan_amount,
      gross_amount: subscription.final_price,
      gst: subscription.gst_on_plan,
      total_eb_fees: subscription.final_price,
      mode: "subscription",
      status: "completed",
    });

    // add subscription amount to eb_account
    await EB_Account.findOneAndUpdate(
      {
        email: "finance@assistbuddi.com",
      },
      {
        name: "Event Buddi",
        email: "finance@assistbuddi.com",
        $inc: {
          total_earning: subscription.final_price,
          total_revenue: subscription.final_price,
        },
      },
      {
        upsert: true,
      }
    );

    return res.json({
      status: true,
      message: "Whaooo! Subscribed Successfully.",
    });

  } catch (error) {
    console.error("confirm_subscription Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const getAllSubscriptions = async (req, res) => {
  try {
    // const userId = req.user && req.user?._id;

    let { userId, subs_id, status, billing_cycle, limit, page, order_id, payment_id } =
      req.body;

    let query = {};
    if (userId) query.user = userId;
    if (subs_id) query.subs_id = subs_id;
    if (status) query.status = status;
    if (billing_cycle) query.billing_cycle = billing_cycle;
    if (order_id) query["order_details.id"] = order_id;
    if (payment_id) query["payment_details.id"] = payment_id;

    limit = Number(limit);
    page = Number(page);
    const skip = (page - 1) * limit;

    const total_subscriptions = await Subscription_Transaction.countDocuments(
      query
    );

    const subscriptions = await Subscription_Transaction.find(query)
      .limit(limit)
      .skip(skip).populate("user", "name email phone")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      status: true,
      message: "Subscriptions fetched successfully",
      response: {
        subscriptions,
        total_subscriptions,
        page,
        limit,
        totalPages: Math.ceil(total_subscriptions / limit),
      },
    });
  } catch (error) {
    console.error("getAllSubscriptions Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const checkSubscriptionPayment = async (req, res) => {
  let { order_id } = req.body;

  console.log("checkPayment => ", order_id);

  let paymentorderdata = await RazorPay.checkPaymentByOrderId(order_id);

  if (!paymentorderdata) {
    return res.json({
      status: false,
      error: { emptyBody: "Un-processable entity." },
      message: "Something went wrong!",
    });
  } else {
    console.log("payment_data => ", paymentorderdata);

    if (paymentorderdata.count) {
      console.log(paymentorderdata.items.length);
      let pay_obj = paymentorderdata.items.find((o) => o.status == "captured");
      console.log(pay_obj);

      if (pay_obj) {
        console.log("got it...");
        confirm_subscription(order_id, pay_obj, res);
      } else
        return res.json({
          status: false,
          message: "No payments captured yet.",
        });
    } else return res.json({ status: false, message: "No payments yet." });
  }
};

cron.schedule("1 0 * * *", async () => {
  try {
    console.log("Running subscription expiry cron...");
    const now = new Date();

    const expiredSubscriptions = await Subscription_Transaction.find({
      status: "active",
      expiry_date: { $lt: now },
    });

    await Subscription_Transaction.updateMany(
      { _id: { $in: expiredSubscriptions.map((s) => s._id) } },
      {
        $set: {
          status: "expired",
          expired_at: now,
        },
      }
    );

    const expiredUsers = await User.updateMany(
      {
        "plan.expiry_date": { $lt: new Date() },
        "plan.type": { $ne: "Starter" },
      },
      {
        $set: {
          "plan.type": "Starter",
          "plan.amount": 0,
          "plan.billing_cycle": null,
        },
      }
    );

    console.log("Expired users downgraded:", expiredUsers.modifiedCount);
  } catch (error) {
    console.error("Cron error:", error);
  }
});

module.exports = {
  subscription,
  confirm_subscription,
  getAllSubscriptions,
  checkSubscriptionPayment,
};
