const User = require("../models/UserModel");

const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        status: false,
        message: "API key missing",
      });
    }

    const user = await User.findOne({ api_key: apiKey });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Invalid API key",
      });
    }

    req.apiUser = user;
    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "API authentication failed",
      response: error.message,
    });
  }
};

module.exports = apiKeyAuth;
