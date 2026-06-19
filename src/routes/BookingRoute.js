const passport = require("passport");
const {
  getAllBookings,
  createBooking,
  getBookingById,
  cancelBooking,
  updateBooking,
  capturePayment,
  checkPayment,
  getBookingsForEvent,
  guestAnalytics,
  export_bookings
} = require("../controllers/Booking");

const router = require("express").Router();

// razorpay route validation
const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');
const verifyRazorpayAuth = (req, res, next) => {
    if (validateWebhookSignature(JSON.stringify(req.body), req.headers['x-razorpay-signature'], process.env.RAZORPAY_WEBHOOK_SECRET)) next();
    else return res.status(401).send("unauthorized");
}

router.post("/", passport.authenticate("jwt", { session: false }), getAllBookings);
router.post("/getBookingsForEvent", passport.authenticate("jwt", { session: false }), getBookingsForEvent);
router.post("/guestAnalytics", passport.authenticate("jwt", { session: false }), guestAnalytics);
router.post("/export_bookings", passport.authenticate("jwt", { session: false }), export_bookings);
router.get("/ticket", getBookingById);
router.post("/book-event", passport.authenticate("jwt", { session: false }), createBooking);
router.post("/capturePayment", verifyRazorpayAuth, capturePayment);
router.post("/checkPayment", passport.authenticate("jwt", { session: false }), checkPayment);
router.post("/update/:id", passport.authenticate("jwt", { session: false }), updateBooking);
router.delete("/:id", passport.authenticate("jwt", { session: false }), cancelBooking);

module.exports = router;