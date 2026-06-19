require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
require("./src/config/passport")(passport);
require("./src/config/adminPassport")(passport);

const mainRoute = require("./src/routes/MainRoute");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const app = express();
app.use(passport.initialize());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", express.static("uploads"));
app.use("/", express.static("public"));

// ejs
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");

connectDB();

const port = process.env.PORT;

// api route
app.use("/api", mainRoute);

// Event detail page for seo – matches only URLs starting with "evt-"
const eventSEORoute = require("./src/routes/EventSEO");
app.use("/evt-:evtid", eventSEORoute);

// index
app.use("/", (req, res) => {
  res.render("index");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
