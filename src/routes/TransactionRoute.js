const router = require("express").Router();
const passport = require("passport");

const {
  getAllTransactions,
  getTransactionById,
} = require("../controllers/Transaction");

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  getAllTransactions
);

router.post(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  getTransactionById
);

module.exports = router;
