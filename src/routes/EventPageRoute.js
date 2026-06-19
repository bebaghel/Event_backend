const router = require("express").Router();
const passport = require("passport");
const multer = require("multer");
const {
  createPage,
  updatePage,
  getAllPages,
  getPageByUsername,
  getPageById,
  deletePage,
  updateAdmin,
  subscribePage,
  un_subscribePage,
} = require("../controllers/EventPage");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/page_images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

router.post("/all", getAllPages);

router.post(
  "/create",
  passport.authenticate("jwt", { session: false }),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  createPage
);

router.post("/updateAdmin", updateAdmin);

router.post(
  "/update/:id",
  passport.authenticate("jwt", { session: false }),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  updatePage
);

router.post("/username/:username", getPageByUsername);

router.post(
  "/subscribe/:id",
  passport.authenticate("jwt", { session: false }),
  subscribePage
);

router.post(
  "/un-subscribe/:id",
  passport.authenticate("jwt", { session: false }),
  un_subscribePage
);

router.post(
  "/single/:id",
  passport.authenticate("jwt", { session: false }),
  getPageById
);

router.delete(
  "/delete/:id",
  passport.authenticate("jwt", { session: false }),
  deletePage
);

module.exports = router;
