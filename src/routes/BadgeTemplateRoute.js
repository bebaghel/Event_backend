const router = require("express").Router();
const passport = require("passport");
const multer = require("multer");
const {
  saveBadgeTemplate,
  getEventTemplates,
  getOwnerTemplates,
} = require("../controllers/BadgeTemplate");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/badge_images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post(
  "/save",
  passport.authenticate("jwt", { session: false }),
  upload.fields([
    { name: "background", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  saveBadgeTemplate
);

router.post(
  "/event",
  passport.authenticate("jwt", { session: false }),
  getEventTemplates
);

router.post(
  "/all",
  passport.authenticate("jwt", { session: false }),
  getOwnerTemplates
);

module.exports = router;
