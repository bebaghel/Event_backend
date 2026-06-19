const fs = require("fs");
const path = require("path");
const { json2csv } = require("json-2-csv");

const Bookings = require("../models/BookingModel");
const Transactions = require("../models/TransactionModel");

const exportBookingData = async (req, res) => {
  try {
    const {
      event,
      organizer,
      status,
      user,
      date,
      fromDate,
      toDate,
      tin,
      order_id,
      payment_id,
    } = req.body;

    let query = {};

    if (organizer) query.organizer = organizer;
    if (event) query.event = event;
    if (status) query.status = status;
    if (user) query.user = user;
    if (order_id) query["order_details.id"] = order_id;
    if (payment_id) query["payment_details.id"] = payment_id;
    if (tin) query.tin = tin;

    switch (date) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        query.booking_date = { $gte: start, $lte: end };
        break;
      }

      case "last30days": {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        query.createdAt = { $gte: from };
        break;
      }

      case "last90days": {
        const from = new Date();
        from.setDate(from.getDate() - 90);
        query.createdAt = { $gte: from };
        break;
      }

      case "custom-range": {
        if (fromDate || toDate) {
          query.booking_date = {
            $gte: new Date(fromDate),
            $lte: new Date(toDate + "T23:59:59"),
          };
        }
        break;
      }
    }

    const bookings = await Bookings.find(query)
      .populate("organizer", "name email")
      .populate("event", "title start_at end_at location")
      .populate("user", "name phone email")
      .sort({ createdAt: -1 });

    if (bookings.length == 0) {
      return res.json({
        status: false,
        message: "No bookings found.",
      });
    }

    const csvRows = bookings.map((b) => {
      // const registrationAns = b.registration_answers
      //   ?.map((a) => `${a.ques}: ${a.answer}`)
      //   .join(" | ");

      return {
        RegistrationID: b.tin,
        Event: b.event?.title || "-",
        Name: b.user?.name || "-",
        Phone: b.user?.phone || "-",
        Email: b.user?.email || "-",
        Ticket: b.ticket_info ? b.ticket_info?.name : "Free",
        TicketPrice: `${b.ticket_info?.currency || ""} ${b.ticket_info?.price || 0}`,
        AmountPaid: `${b.ticket_info?.currency || ""} ${b.final_price || 0}`,
        Status: b.status,
        RegisteredOn: new Date(b.booking_date).toLocaleString(),
        BookByOrganizer: b.is_booked_by_organizer ? "Yes" : "No",
        // RegistrationAnswers: registrationAns || "-",
      };
    });

    const csv = json2csv(csvRows);

    return res.status(200).json({
      status: true,
      message: "Booking CSV ready",
      response: {
        fileName: `bookings_${Date.now()}.csv`,
        csv,
      },
    });
  } catch (error) {
    console.log("exportBookingData error", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const exportTransactions = async (req, res) => {
  const userId = req.user._id
  try {
    let {
      // user,
      booking,
      type,
      status,
      txt_id,
      date,
      mode,
      fromDate,
      toDate,
      reference
    } = req.body;

    let query = {user: userId};
    // if (user) query.user = user;
    if (booking) query.booking = booking;
    if (type) query.type = type;
    if (reference) query.reference = reference;
    if (status) query.status = status;
    if (mode) query.mode = mode;
    if (txt_id) query.transaction_id = { $regex: txt_id, $options: "i" };

    // Date filters
    switch (date) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "last30days": {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        query.createdAt = { $gte: from };
        break;
      }

      case "last90days": {
        const from = new Date();
        from.setDate(from.getDate() - 90);
        query.createdAt = { $gte: from };
        break;
      }

      case "custom-range": {
        if (fromDate || toDate) {
          query.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(toDate + "T23:59:59"),
          };
        }
        break;
      }
    }

    const transactions = await Transactions.find(query)
      .populate({
        path: 'booking',
        select: 'event user',
        populate: {
          path: 'user',
          select: 'name email phone'
        }
      })
      .sort({ createdAt: -1 });

      if (transactions.length == 0) {
      return res.json({
        status: false,
        message: "No transactions found.",
      });
    }

    const csvRows = transactions.map((b) => {
      return {
        "Transaction Id": b.transaction_id,
        "Reference": b.reference || "-",
        // Event: b.event?.title || "-",
        Customer: b.booking?.user?.name || "-",
        "Phone": b.booking?.user?.phone || "-",
        "Email": b.booking?.user?.email || "-",
        "Net Amount (INR)": b.net_amount, 
        "Charges (INR)": b.total_fee, 
        "Gross Amount (INR)": b.gross_amount, 
        Mode: b.mode,
        Type: b.type,
        Status: b.status,
        Date: new Date(b.createdAt).toDateString(),
      };
    });

    const csv = json2csv(csvRows);

    return res.status(200).json({
      status: true,
      message: "Transaction CSV ready",
      response: {
        fileName: `transactions_${Date.now()}.csv`,
        csv,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

module.exports = { exportBookingData , exportTransactions};
