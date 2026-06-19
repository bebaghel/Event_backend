const router = require("express").Router();
const passport = require("passport");
const multer = require("multer");

const {
  createUser,
  sendOTP,
  verifyOTP,
  updateUser,
  getAllUsers,
  verifyPin,
  getUserById,
  getUserByUsername,
  resetPin,
  generateUserApiKey,
} = require("../controllers/User");
const { googleLogin } = require("../controllers/googleAuth");

// for user profile pics
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/user_profile_pics");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Google route
router.post("/auth/google", googleLogin);

// Normal
router.post(
  "/all",
  passport.authenticate("jwt", { session: false }),
  getAllUsers
);

router.post(
  "/create",
  passport.authenticate("jwt", { session: false }),
  upload.single("profilePic"),
  createUser
);

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/verify-pin", verifyPin);
router.post("/reset-pin", resetPin);

router.post(
  "/api-key",
  passport.authenticate("jwt", { session: false }),
  generateUserApiKey
);

router.post(
  "/update/:id",
  passport.authenticate("jwt", { session: false }),
  upload.single("profilePic"),
  updateUser
);

router.post(
  "/single/:id",
  passport.authenticate("jwt", { session: false }),
  getUserById
);

router.post("/profile/:username", getUserByUsername);

module.exports = router;
