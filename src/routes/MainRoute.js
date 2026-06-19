const router = require("express").Router();

const adminRoutes = require("./AdminRoute");
const eventRoutes = require("./EventRoute");
const userRoutes = require("./userRoute");
const bookingRoutes = require("./BookingRoute");
const userRelationRoutes = require("./UserRelation");
const transactionRoutes = require("./TransactionRoute");
const withdrawRoutes = require("./WithdrawalRoute");
const openAiRoutes = require("./OpenaiRoute");
const subscriptionRoutes = require("./SubscriptionRoute");
const eventPageRoutes = require("./EventPageRoute");
const badgeTemplateRoutes = require("./BadgeTemplateRoute");
const apiServiceRoute = require("./ApiServiceRoute");
const exportBookingRoute = require("./ExportDataReport");

router.use("/admin", adminRoutes);
router.use("/events", eventRoutes);
router.use("/user", userRoutes);
router.use("/booking", bookingRoutes);
router.use("/userRelation", userRelationRoutes);
router.use("/transaction", transactionRoutes);
router.use("/withdraw", withdrawRoutes);
router.use("/ai", openAiRoutes);
router.use("/page", eventPageRoutes);
router.use("/subscription", subscriptionRoutes);
router.use("/badge-template", badgeTemplateRoutes);
router.use("/service", apiServiceRoute);
router.use("/export", exportBookingRoute);

module.exports = router;
