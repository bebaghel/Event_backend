const router = require("express").Router();
const passport = require("passport");
const {
  subscription,
  getAllSubscriptions,
  checkSubscriptionPayment,
} = require("../controllers/Subscription");

router.post(
  "/get",
  passport.authenticate("jwt", { session: false }),
  getAllSubscriptions
);
router.post(
  "/add",
  passport.authenticate("jwt", { session: false }),
  subscription
);
router.post(
  "/checkPayment",
  passport.authenticate("jwt", { session: false }),
  checkSubscriptionPayment
);

module.exports = router;
