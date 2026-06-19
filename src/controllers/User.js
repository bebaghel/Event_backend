const fs = require("fs");
const path = require("path");
require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { parsePhoneNumberFromString } = require("libphonenumber-js");


const User = require("../models/UserModel");
const Event = require("../models/EventModel");
const { sendEmail } = require("../config/sendEmail");
const { mailOtp } = require("../templates/otpMail");

// crypto
const crypto = require("crypto");
const { validateEmail } = require("../validators/EmailValidator");
const SECRET_KEY = Buffer.from(process.env.AES_SECRET_KEY, "base64");
const IV_LENGTH = 12;

// Encrypt Function
const encrypt_account = async (account_details) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", SECRET_KEY, iv);

  const data = JSON.stringify(account_details);

  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("base64");

  return {
    iv: iv.toString("base64"),
    authTag,
    encryptedData: encrypted,
  };
};

// Decrypt Function
const decrypt_account = async ({ iv, authTag, encryptedData }) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    SECRET_KEY,
    Buffer.from(iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
};

// Generate unique username
const generateUniqueUsername = async ({ name, email }) => {
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (user && user.username) return user.username;

  let username;
  let base;

  if (name) {
    base = name.toLowerCase().trim().replace(/\s+/g, "");
  } else if (email) {
    base = email.split("@")[0].toLowerCase().trim().replace(/\s+/g, "");
  }

  username = base;

  while (await User.findOne({ username })) {
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    username = base + randomNum;
  }

  return username;
};

const extractPhoneData = (mobile) => {
  const formatted = mobile.startsWith("+") ? mobile : `+${mobile}`;
  const parsed = parsePhoneNumberFromString(`${formatted}`);

  if (!parsed) {
    return {
      country_code: "",
      phone: mobile,
    };
  }

  return {
    country_code: `${parsed.countryCallingCode}`,
    phone: parsed.nationalNumber,
  };
};

const createUser = async (req, res) => {
  try {
    const { name, email, phone, hosted_events } = req.body;
    let user = await User.findOne({ email: email?.toLowerCase() });

    // Existing user
    if (user && hosted_events) {
      user = await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { hosted_events } },
        { new: true },
      );
    }

    // New user
    if (!user) {
      const username = await generateUniqueUsername({ name, email });
      user = await User.create({
        name,
        email,
        phone,
        hosted_events: [hosted_events],
        username,
      });
    }

    // add host in event
    if (hosted_events) {
      await Event.findByIdAndUpdate(hosted_events, {
        $addToSet: { hosts: user._id },
      });
    }

    return res.status(201).json({
      status: true,
      response: user,
    });
  } catch (error) {
    console.error("Error in creating user", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Error in upsert operation",
      response: error.message,
    });
  }
};

const sendOTP = async (req, res) => {
  try {
    let { email, name, phone, isResetPin = false, country_code, is_whatsapp_login = false } = req.body;

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      return res.status(400).json({
        status: false,
        message: emailCheck.message,
      });
    }

    let user;

    if (is_whatsapp_login) {
      const phoneData = await extractPhoneData(phone);
      if (!phoneData.country_code || !phoneData.phone) {
        return res.status(400).json({
          status: false,
          message: "Invalid phone number",
        });
      }

      phone = phoneData.phone;
      country_code = phoneData.country_code;

      user = await User.findOne({ phone: phone })
    } else {
      user = await User.findOne({ email: email?.toLowerCase() });
    }

    if (!isResetPin && user && user.pin) {
      return res.status(200).json({
        status: true,
        message: "Enter your pin",
        isPin: true
      });
    }


    if (!user) {
      let username = await generateUniqueUsername({ name, email });
      user = await User.create({ email, name, phone, username, country_code });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // whatsapp otp
    if (is_whatsapp_login) {
      try {
        const waResponse = await axios.post(
          "https://connect.assistbuddi.com/api/v1/send-otp",
          {
            mobile: `${phone}`,
            otpCode: otp.toString(),
            template: "assist_buddi_otp",
            language_code: "en_US"
          },
          {
            headers: {
              apikey: "3f0a1c93-6c58-4af8-afcb-09097a4ecc6e",
              project: "69efaca6d83f998dbd1bd847",
            },
          },
        );

        return res.status(200).json({
          status: true,
          message: "OTP sent successfully to your phone",
        });
      } catch (error) {
        return res.status(500).json({
          status: false,
          message: "Error in sending whatsapp otp",
          response: error.message,
        });
      }
    } else {
      try {
        await sendEmail({
          to: email,
          subject: "Your One-Time Password for Event Buddi",
          html: mailOtp(otp),
        });

        return res.status(200).json({
          status: true,
          message: "OTP sent successfully to your email",
        });
      } catch (error) {
        return res.status(500).json({
          status: false,
          message: "Error in sending email",
          response: error.message,
        });
      }
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Phone number or email already exists",
        response: error.message,
      });
    }
    return res.status(500).json({
      status: false,
      message: "Error sending OTP",
      response: error.message,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    let { email, phone, otp } = req.body;

    let user;

    if (email) {
      user = await User.findOne({ email: email?.toLowerCase() });
    } else if (phone) {
      const phoneData = await extractPhoneData(phone);
      phone = phoneData.phone;
      user = await User.findOne({ phone: phone });
    }

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    console.log("User", user, "Body", req.body);
    console.log("User OTP", user.otp, "Entered OTP", otp);

    if (user.otp !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({
        status: false,
        message: "OTP expired",
      });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.is_verfied = true;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully",
      response: { user, token },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error verifying OTP",
      response: error.message,
    });
  }
};

const verifyPin = async (req, res) => {
  try {
    const { email, pin } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(400).json({
        status: false,
        message: "Incorrect pin",
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      status: true,
      message: "Pin verified successfully",
      response: { user, token },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error verifying pin",
      response: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    let {
      name,
      bio,
      pin,
      email,
      hosted_events,
      joined_events,
      phone,
      social_links,
      account_details,
      // platform_fees,
      currency,
      username,
      api_key,
      api_key_createdAt,
    } = req.body;

    social_links = JSON.parse(social_links || "[]");

    // New uploaded file
    const newProfilePic = req.file?.filename;

    // Fetch existing user
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // PIN validation
    if (pin && pin.length < 4) {
      return res.status(400).json({
        status: false,
        message: "PIN must be at least 4 characters long",
      });
    }

    let hashedPin;
    if (pin) {
      hashedPin = await bcrypt.hash(pin, 10);
    }

    // If new image uploaded → delete old one
    let finalProfilePic = existingUser.profilePic;
    if (newProfilePic) {
      // delete old image
      if (existingUser.profilePic) {
        const oldPath = path.join(
          __dirname,
          "../../uploads/user_profile_pics",
          existingUser.profilePic,
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      finalProfilePic = newProfilePic;
    }

    // if acc. details encrypt
    if (account_details)
      account_details = await encrypt_account(account_details);

    // Prepare updated data
    const updatedData = {
      name,
      bio,
      email,
      phone,
      hosted_events,
      joined_events,
      social_links,
      profilePic: finalProfilePic,
      account_details,
      // platform_fees,
      currency,
      username,
      api_key,
      api_key_createdAt,
    };

    if (hashedPin) {
      updatedData.pin = hashedPin;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    return res.status(200).json({
      status: true,
      message: "User updated successfully",
      response: updatedUser,
    });
  } catch (error) {
    console.log("updateUser", error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "Username already taken",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Error updating user",
      response: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    let { search, limit } = req.body;

    let query = {};

    if (search && search.trim() !== "") {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    limit = Number(limit) || 50;

    const users = await User.find(query)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select("-otp -otpExpiry -pin");

    return res.status(200).json({
      status: true,
      message: "User get successfully",
      response: users,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error getting user",
      response: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (user?.account_details) {
      user.account_details = await decrypt_account(user.account_details);
    }

    return res.status(200).json({
      status: true,
      message: "User get successfully",
      response: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .select(
        "name username bio profilePic picture social_links hosted_events createdAt",
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "User get successfully",
      response: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const resetPin = async (req, res) => {
  try {
    let { pin, email } = req.body;

    // const user = await User.findOneAndUpdate({ email });

    // PIN validation
    if (pin && pin.length < 4) {
      return res.json({
        status: false,
        message: "PIN must be at least 4 characters long",
      });
    }

    let hashedPin;
    if (pin) {
      hashedPin = await bcrypt.hash(pin, 10);
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: email?.toLowerCase() },
      {
        pin: hashedPin,
      },
      {
        new: true,
      },
    );

    return res.status(200).json({
      status: true,
      message: "Pin reset successfully",
      response: updatedUser,
    });
  } catch (error) {
    console.log("updateUser", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const generateUserApiKey = async (req, res) => {
  try {
    const userId = req.user._id;
    const apiKey = crypto.randomUUID();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        api_key: apiKey,
        api_key_createdAt: new Date(),
      },
      { new: true },
    );

    return res.json({
      status: true,
      message: "API key generated",
      response: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to generate API key",
      response: error.message,
    });
  }
};


module.exports = {
  createUser,
  sendOTP,
  verifyOTP,
  updateUser,
  getAllUsers,
  verifyPin,
  getUserById,
  generateUniqueUsername,
  getUserByUsername,
  resetPin,
  generateUserApiKey,
};
