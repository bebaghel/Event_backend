const razorpay_key = {
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
};

const Razorpay = require("razorpay");
const razorpay_instance = new Razorpay(razorpay_key);

const createOrder = async (amount, currency, e_id) => {
  return new Promise((resolve, reject) => {
    let options = {
      amount: parseInt(parseFloat(amount.toFixed(2)) * 100), // amount in the smallest currency unit
      currency: currency,
      receipt: e_id,
      payment_capture: "1",
    };

    razorpay_instance.orders.create(options, (err, order) => {
      if (err) {
        console.log(err);
        resolve(false);
      } else resolve(order);
    });
  });
};

// manual check payment
const checkPaymentByOrderId = async (order_id) => {
  return new Promise(async (resolve, reject) => {
    let paymentOrderData = await razorpay_instance.orders.fetchPayments(
      order_id
    );
    // console.log("paymentOrderData - ", paymentOrderData);
    if (paymentOrderData) {
      resolve(paymentOrderData);
    } else resolve(false);
  });
};

module.exports = {
  createOrder,
  checkPaymentByOrderId,
};
