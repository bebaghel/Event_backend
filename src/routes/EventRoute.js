const router = require("express").Router();
const passport = require("passport");
const multer = require("multer");
const { eventValidator } = require("../validators/EventValidator");
const {
  createEvent,
  getAllEvents,
  updateEvent,
  getEventById,
  deleteEvent,
  getEventWithLessData,
} = require("../controllers/Event");

// CKEditor Image - uploads/blogImages
const ckEditorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/event_images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadCkImage = multer({ storage: ckEditorStorage });

router.post(
  "/upload-event-image",
  (req, res, next) => {
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    req.headers.authorization = `Bearer ${token}`;
    next();
  },
  passport.authenticate("jwt", { session: false }),
  uploadCkImage.single("upload"),
  (req, res) => {
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ uploaded: false, error: { message: "No file uploaded" } });
    }

    const imageUrl = `${process.env.APP_URL}/event_images/${file.filename}`;

    res.status(201).json({
      uploaded: true,
      url: imageUrl,
    });
  }
);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/event_images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post(
  "/",
  // passport.authenticate("jwt", { session: false }),
  getAllEvents
);

router.post(
  "/less-data",
  passport.authenticate("jwt", { session: false }),
  getEventWithLessData
);

router.post(
  "/create",
  passport.authenticate("jwt", { session: false }),
  upload.single("image"),
  eventValidator,
  createEvent
);

router.post(
  "/update/:id",
  passport.authenticate("jwt", { session: false }),
  upload.single("image"),
  updateEvent
);

router.get(
  "/:id",
  // passport.authenticate("jwt", { session: false }),
  getEventById
);

router.delete(
  "/delete/:id",
  passport.authenticate("jwt", { session: false }),
  deleteEvent
);

module.exports = router;
