const router = require("express").Router();
const passport = require("passport");
const { getUserRelation, searchGuests } = require("../controllers/UserRelation");

router.post("/", passport.authenticate("jwt", { session: false }), getUserRelation);

router.post("/searchGuests", passport.authenticate("jwt", { session: false }), searchGuests);

module.exports = router;
