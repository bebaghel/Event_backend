const router = require("express").Router();
const passport = require("passport");
const { chatWithAi } = require("../controllers/OpenAi");

router.use("/chat", passport.authenticate("jwt", { session: false }), chatWithAi);

module.exports = router;
