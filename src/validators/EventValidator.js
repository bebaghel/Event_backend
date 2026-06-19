const { body } = require("express-validator");
const mongoose = require("mongoose");

exports.eventValidator = [
  body("organizer").notEmpty().withMessage("Organizer is required"),
  body("title").notEmpty().withMessage("Title is required"),
  body("virtual_link")
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage("Virtual link must be a valid URL (https://...)"),
];
