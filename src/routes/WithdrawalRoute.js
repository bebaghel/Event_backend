const router = require("express").Router();
const passport = require("passport");
const { withDraw, updateWithdrawStatus } = require("../controllers/Withdrawal");

router.post("/", passport.authenticate("jwt", { session: false }), withDraw);

module.exports = router;
