const { OAuth2Client } = require("google-auth-library");
const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");
const { generateUniqueUsername } = require("./User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    // console.log("payload", payload);

    const { sub, email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      console.log("Creating new user");
      let username = await generateUniqueUsername({ name, email });
      user = await User.create({
        googleId: sub,
        name,
        email,
        picture,
        is_verfied: true,
        username,
      });
    }

    if (user && user.googleId != sub) {
      await User.updateOne(
        { email },
        {
          googleId: sub,
          name,
          picture,
          is_verfied: true,
        }
      );
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      status: true,
      message: "Login successfull",
      response: { user, token },
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({
      status: false,
      message: "Google login failed",
      response: error.message,
    });
  }
};

module.exports = { googleLogin };
