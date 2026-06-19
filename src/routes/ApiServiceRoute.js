const router = require("express").Router();
const apiKeyAuth = require("../config/apiKeyAuth");
const { getEventsByApiKey } = require("../controllers/Api_Service");

router.post("/events", apiKeyAuth, getEventsByApiKey);

module.exports = router;
