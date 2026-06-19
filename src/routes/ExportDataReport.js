const router = require("express").Router();
const passport = require("passport");
const { exportBookingData, exportTransactions } = require("../controllers/ExportData");

router.post("/bookings",passport.authenticate("jwt", { session: false }), exportBookingData);
router.post("/transactions",passport.authenticate("jwt", { session: false }), exportTransactions);

module.exports = router;
