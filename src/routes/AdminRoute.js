const router = require("express").Router();
const passport = require("passport");
const {
  loginAdmin,
  addAdmin,
  getAllAdmins,
  deleteAdmin,
  getDashboardCount,
  getAllAccounts,
  getEBAccount,
  getEBTransactions,
} = require("../controllers/Admin");
const { getAllBookings, checkPayment } = require("../controllers/Booking");
const { getAllEvents } = require("../controllers/Event");
const { exportBookingData } = require("../controllers/ExportData");
const { getUserById } = require("../controllers/User");
const {
  checkSubscriptionPayment,
  getAllSubscriptions,
} = require("../controllers/Subscription");
const { getAllTransactions } = require("../controllers/Transaction");
const { updateWithdrawStatus } = require("../controllers/Withdrawal");

router.post("/login", loginAdmin);
router.post("/add", addAdmin);
router.post("/all", getAllAdmins);

// Admin pannel protected routes
router.post(
  "/dashboard-count",
  passport.authenticate("admin-jwt", { session: false }),
  getDashboardCount,
);

router.post(
  "/bookings",
  passport.authenticate("admin-jwt", { session: false }),
  getAllBookings,
);

router.post(
  "/events",
  passport.authenticate("admin-jwt", { session: false }),
  getAllEvents,
);

router.post(
  "/export-bookings",
  passport.authenticate("admin-jwt", { session: false }),
  exportBookingData,
);

router.post(
  "/user-accounts",
  passport.authenticate("admin-jwt", { session: false }),
  getAllAccounts,
);

router.post(
  "/check-payment",
  passport.authenticate("admin-jwt", { session: false }),
  checkPayment,
);

router.post(
  "/transactions",
  passport.authenticate("admin-jwt", { session: false }),
  getAllTransactions,
);

router.post(
  "/subscriptions",
  passport.authenticate("admin-jwt", { session: false }),
  getAllSubscriptions,
);

router.post(
  "/eb-account",
  passport.authenticate("admin-jwt", { session: false }),
  getEBAccount,
);

router.post(
  "/update-withdrawl",
  passport.authenticate("admin-jwt", { session: false }),
  updateWithdrawStatus,
);

router.post(
  "/eb-transactions",
  passport.authenticate("admin-jwt", { session: false }),
  getEBTransactions,
);

router.post(
  "/check-subscription",
  passport.authenticate("admin-jwt", { session: false }),
  checkSubscriptionPayment,
);

router.post(
  "/user/:id",
  passport.authenticate("admin-jwt", { session: false }),
  getUserById,
);

router.delete(
  "/delete/:id",
  passport.authenticate("admin-jwt", { session: false }),
  deleteAdmin,
);

module.exports = router;
