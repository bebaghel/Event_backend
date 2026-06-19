const Booking = require("../models/BookingModel");
const User = require("../models/UserModel");
const Event = require("../models/EventModel");
const Transaction = require("../models/TransactionModel");
const EB_Transaction = require("../models/EBTransactionModel");
const EB_Account = require("../models/EBAccountModel");
const UserRelation = require("../models/UserRelationModel");
const RazorPay = require("../config/payment");
const { sendEmail } = require("../config/sendEmail");
const { guestMail } = require("../templates/guestMail");
const { organizerMail } = require("../templates/organizerMail");
const { confirm_subscription } = require("./Subscription");
const { json2csv } = require("json-2-csv");
const moment = require("moment");

const generateTin = async () => {
  return new Promise(async (resolve) => {
    let newTin = Array.from({ length: 10 }, () =>
      Math.floor(Math.random() * 10),
    ).join("");

    let exists = await Booking.findOne({ tin: newTin });
    if (exists) generateTin();
    resolve(newTin);
  });
};

async function finalizeBookingRelations({ user, bookedEvent }) {
  // push guest to event
  await Event.updateOne(
    { _id: bookedEvent._id },
    { $addToSet: { guests: user._id } },
  );

  // push event to user
  await User.updateOne(
    { _id: user._id },
    { $addToSet: { joined_events: bookedEvent._id } },
  );

  // organizer-user relation
  await UserRelation.findOneAndUpdate(
    { user: bookedEvent.organizer, guest: user._id },
    {
      $setOnInsert: {
        user: bookedEvent.organizer,
        guest: user._id,
      },
    },
    { upsert: true, new: true },
  );
}

const createBooking = async (req, res) => {
  try {
    const {
      event,
      name,
      email,
      phone,
      booking_date,
      registration_answers,
      ticket,
      bookby_organizer,
      meta,
      manual_approval,
      mode, // manual, viaAssistBuddi
      reference
    } = req.body;

    // USER UPSERT
    let user = await User.findOneAndUpdate(
      { email },
      {
        $set: { email, name, phone },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const Event_Detail = await Event.findOne({ event_id: event });
    const organizer = await User.findById(Event_Detail.organizer);
    let is_free = Event_Detail.ticket_type == "Free";

    let bbo = false;
    // console.log(req.user._id);
    // console.log(Event_Detail.organizer);

    if (
      bookby_organizer &&
      (req.user._id.equals(Event_Detail.organizer) ||
        Event_Detail.hosts.some((h) => h.equals(req.user._id)))
    )
      bbo = true;

    // CHECK DUPLICATE REGISTRATION
    if (Event_Detail.guests.some((g) => g.toString() === user._id.toString())) {
      return res.status(400).json({
        status: false,
        message: "You have already registered in this event!",
      });
    }

    let ticket_info;
    let order_details;
    let final_price;
    let tin = await generateTin();

    if (!is_free) {
      ticket_info = Event_Detail.ticket_price.find(
        (t) => t._id.toString() === ticket.toString(),
      );

      if (!ticket_info) {
        return res.status(400).json({
          status: false,
          message: "Invalid ticket!",
        });
      }

      if (ticket_info.slots !== null && ticket_info.slots <= 0) {
        return res.status(400).json({
          status: false,
          message: "No seats available for this ticket!",
        });
      }

      is_free = ticket_info.price == 0;

      if (Event_Detail.charges_type == "exclusive") {
        const CHARGES = organizer.platform_fees
          ? organizer.platform_fees
          : Number(process.env.CHARGES);

        const GST = Number(process.env.GST); //0.18

        const gross_amount = Number(ticket_info.price);
        const charges = gross_amount * CHARGES;
        const gst_on_charges = charges * GST;
        final_price = Number(gross_amount + charges + gst_on_charges);
      } else {
        final_price = Number(ticket_info.price);
      }

      // lets make round upto 2 decimal
      final_price = parseFloat(final_price.toFixed(2));

      // console.log("final_price =>", final_price);

      // if not booked by organizer
      if (!bbo && final_price > 0) {
        //  create razorpay order
        let rzp_order = await RazorPay.createOrder(
          final_price,
          ticket_info.currency,
          "eb_booking_" + tin,
        );
        console.log("rzp_order => ", rzp_order);
        if (rzp_order) order_details = rzp_order;
        else {
          return res.status(400).json({
            status: false,
            message: "Unable to create order for booking.",
          });
        }
      }
    }

    // CREATE BOOKING
    const newBooking = await Booking.create({
      tin,
      event: Event_Detail._id,
      organizer: Event_Detail.organizer,
      user: user._id,
      booking_date,
      status: is_free || bbo ? "Booked" : "Pending",
      registration_answers,
      ticket_info,
      final_price: mode == "manual" ? ticket_info.price : final_price,
      order_details,
      is_approved: manual_approval
        ? manual_approval
        : Event_Detail.approval
          ? false
          : true,
      is_booked_by_organizer: bbo,
      meta,
    });

    if (bbo && !is_free > 0 && mode) {
      // console.log("confirm_bbo_transaction hittt....");
      await confirm_bbo_transaction(user, mode, newBooking, reference)
    }

    // Send Mail
    if (is_free || bbo) {
      if (Event_Detail.capacity !== null) {
        const updatedEvent = await Event.findOneAndUpdate(
          {
            _id: Event_Detail._id,
            capacity: { $gt: 0 },
          },
          {
            $inc: { capacity: -1 },
          },
          { new: true },
        );

        if (!updatedEvent) {
          return res.status(400).json({
            status: false,
            message: "Event is sold out",
          });
        }
      }

      await finalizeBookingRelations({
        booking: newBooking,
        user: user,
        bookedEvent: Event_Detail,
      });

      try {
        await sendEmail({
          to: email,
          subject: "Event Registration | " + Event_Detail.title,
          html: guestMail(
            name,
            Event_Detail.title,
            Event_Detail.location,
            Event_Detail.start_at,
            Event_Detail.end_at,
            newBooking.is_approved,
            Event_Detail.event_id,
            newBooking.tin,
          ),
        });
      } catch (error) {
        console.error("Guest email failed:", error);
      }
    }

    if (newBooking.status == "Booked" && !newBooking.is_approved) {
      try {
        await sendEmail({
          to: organizer.email,
          subject: "New Event Registration | " + Event_Detail.title,
          html: organizerMail(name, Event_Detail.title, newBooking.is_approved),
        });
      } catch (error) {
        console.error("Guest email failed:", error);
      }
    }

    return res.status(201).json({
      status: true,
      message: is_free
        ? "Event registered successfully, please check your mail"
        : "Booking created. Complete payment.",
      response: newBooking,
    });
  } catch (error) {
    console.log(error);

    if (error.code === 11000) {
      return res.status(400).json({
        status: false,
        message: "You have already registered in this event!",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Error creating registration",
      response: error.message,
    });
  }
};

// Get bookings
const getAllBookings = async (req, res) => {
  try {
    let {
      event,
      organizer,
      page,
      limit,
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

    if (event) query.event = event;
    if (organizer) query.organizer = organizer;
    if (status) query.status = status;
    if (user) query.user = user;
    if (order_id) query["order_details.id"] = order_id;
    if (payment_id) query["payment_details.id"] = payment_id;
    if (tin) query.tin = { $regex: tin, $options: "i" };

    // Date filters
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

    limit = Number(limit);
    page = Number(page);
    const skip = (page - 1) * limit;

    let options = Booking.find(query)
      .populate({
        path: "event",
        populate: {
          path: "hosts",
          select: "name email phone profilePic picture",
        },
      })
      .populate("organizer", "name email phone profilePic picture")
      .populate("user", "name email phone profilePic picture")
      .sort({ createdAt: -1 });

    let bookings;

    if (!limit || !page) {
      bookings = await options;
    } else {
      bookings = await options.limit(limit).skip(skip);
    }

    const total = await Booking.countDocuments(query);

    return res.status(200).json({
      status: true,
      response: {
        bookings,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching bookings",
      response: error.message,
    });
  }
};

const getBookingsForEvent = async (req, res) => {
  try {
    let {
      event,
      organizer,
      page,
      limit,
      status,
      user,
      date,
      fromDate,
      toDate,
      tin,
      order_id,
      payment_id,
      search
    } = req.body;
    let query = {};

    if (event) query.event = event;
    if (organizer) query.organizer = organizer;
    if (status) query.status = status;
    if (user) query.user = user;
    if (order_id) query["order_details.id"] = order_id;
    if (payment_id) query["payment_details.id"] = payment_id;
    if (tin) query.tin = { $regex: tin, $options: "i" };

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ]
      }).select("_id");

      const userIds = users.map(u => u._id);
      query.user = { $in: userIds };
    }

    // Date filters
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

    limit = Number(limit);
    page = Number(page);
    const skip = (page - 1) * limit;

    let options = Booking.find(query)
      .select(
        "user is_approved is_booked_by_organizer createdAt updatedAt is_checked_in registration_answers status tin ticket_info booking_date meta",
      )
      .populate("user", "name email phone profilePic picture")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    let bookings;

    if (!limit || !page) {
      bookings = await options;
    } else {
      bookings = await options.limit(limit).skip(skip);
    }

    const total = await Booking.countDocuments(query);

    return res.status(200).json({
      status: true,
      response: {
        bookings,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching bookings",
      response: error.message,
    });
  }
};

const guestAnalytics = async (req, res) => {
  try {
    const { eventId } = req.body;
    let query = { event: eventId };

    const totalGuests = await Booking.countDocuments(query);
    const approvedGuests = await Booking.countDocuments({
      ...query,
      is_approved: true,
    });
    const checkedInGuests = await Booking.countDocuments({
      ...query,
      is_checked_in: true,
    });
    const notCheckedInGuests = await Booking.countDocuments({
      ...query,
      is_approved: true,
      is_checked_in: false,
    });

    return res.status(200).json({
      status: true,
      response: {
        totalGuests,
        approvedGuests,
        checkedInGuests,
        notCheckedInGuests,
      },
      message: "Guest analytics fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching guestAnalytics",
      response: error.message,
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const tin = req.query.t;
    const booking = await Booking.findOne({ tin })
      .select(
        "event is_approved ticket_info is_checked_in status tin user order_details meta registration_answers ",
      )
      .populate({
        path: "event",
        select: "title location virtual_link end_at start_at location_type image",
      })
      .populate("user", "name email phone");

    if (!booking) {
      return res.status(404).json({
        status: false,
        message: "Registration not found",
      });
    }

    return res.status(200).json({
      status: true,
      response: booking,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching booking",
      response: error.message,
    });
  }
};

const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const oldBooking = await Booking.findById(id);
    if (!oldBooking) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    const booking = await Booking.findByIdAndUpdate(id, updates, { new: true });

    const wasApproved = oldBooking.is_approved;
    const isNowApproved = booking.is_approved;

    // only when false ➝ true
    if (!wasApproved && isNowApproved) {
      const guest = await User.findById(booking.user);
      const event = await Event.findById(booking.event);

      if (event.capacity !== null) {
        const capacityUpdated = await Event.findOneAndUpdate(
          {
            _id: event._id,
            capacity: { $gt: 0 },
          },
          {
            $inc: { capacity: -1 },
          },
          { new: true },
        );

        if (!capacityUpdated) {
          return res.status(400).json({
            status: false,
            message: "Event capacity full",
          });
        }
      }

      try {
        await sendEmail({
          to: guest.email,
          subject: "Event Registration Approved | " + event.title,
          html: guestMail(
            guest.name,
            event.title,
            event.location,
            event.start_at,
            event.end_at,
            true,
            event.event_id,
            booking.tin,
          ),
        });
      } catch (error) {
        console.error("Guest email failed:", error);
      }
    }

    return res.status(200).json({
      status: true,
      message: "Booking updated successfully",
      response: booking,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error updating booking",
      response: error.message,
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, refundAmount } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    booking.status = "Canceled";
    booking.cancellation_reason = reason;
    booking.refund_amount = refundAmount;
    await booking.save();

    return res.status(200).json({
      status: true,
      message: "Booking canceled successfully",
      response: booking,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error canceling booking",
      response: error.message,
    });
  }
};

// razorpay web hook
const capturePayment = async (req, res) => {
  let webHookBody = req.body;

  if (!webHookBody) {
    return res.json({
      status: false,
      error: { emptyBody: "Un-processable entity." },
      message: "Something went wrong!",
    });
  } else {
    console.log(JSON.stringify(webHookBody));
    // check for subs or booking
    const invoice_ref =
      webHookBody?.payload?.payment?.entity?.notes?.invoice_ref || "";
    if (invoice_ref.startsWith("EB_SUB_")) {
      confirm_subscription(
        webHookBody.payload?.payment?.entity?.order_id,
        webHookBody.payload?.payment?.entity,
        res,
      );
    } else {
      confirm_booking(
        webHookBody.payload?.payment?.entity?.order_id,
        webHookBody.payload?.payment?.entity,
        res,
      );
    }
  }
};

const checkPayment = async (req, res) => {
  let { order_id } = req.body;

  console.log("checkPayment => ", order_id);

  let paymentorderdata = await RazorPay.checkPaymentByOrderId(order_id);

  if (!paymentorderdata) {
    return res.json({
      status: false,
      error: { emptyBody: "Un-processable entity." },
      message: "Something went wrong!",
    });
  } else {
    console.log("payment_data => ", paymentorderdata);

    if (paymentorderdata.count) {
      console.log(paymentorderdata.items.length);
      let pay_obj = paymentorderdata.items.find((o) => o.status == "captured");
      console.log(pay_obj);

      if (pay_obj) {
        console.log("got it...");
        confirm_booking(order_id, pay_obj, res);
      } else
        return res.json({
          status: false,
          message: "No payments captured yet.",
        });
    } else return res.json({ status: false, message: "No payments yet." });
  }
};

// confirm paid booking
const confirm_booking = async (order_id, pay_obj, res) => {
  const newBooking = await Booking.findOneAndUpdate(
    {
      "order_details.id": order_id,
      status: "Pending",
    },
    {
      payment_details: pay_obj,
      status: "Booked",
    },
    {
      new: true,
    },
  );

  // manage transaction

  if (!newBooking) {
    return res.status(404).json({
      status: false,
      message: "Booking not found for this order.",
    });
  }

  const guest = await User.findById(newBooking.user);
  const bookedEvent = await Event.findById(newBooking.event);
  const organizer = await User.findById(newBooking.organizer);

  let ticket_info = newBooking.ticket_info;

  let CHARGES = organizer.platform_fees
    ? organizer.platform_fees
    : Number(process.env.CHARGES);

  const GST = Number(process.env.GST); //0.18

  if (ticket_info) {
    let gross_amount = 0;
    let charges = 0;
    let gst_on_charges = 0;
    let total_fee = 0;
    let net_amount = 0;

    let total_eb_fees = 0;
    let eb_charges = 0;
    let eb_tax = 0;

    // pg charges and tax
    let pg_charges = Number(pay_obj?.fee / 100);
    let pg_charges_tax = Number(pay_obj?.tax / 100);
    let total_pg_fees = parseFloat((pg_charges + pg_charges_tax).toFixed(2));

    // for INR
    if (ticket_info.currency == "INR") {
      gross_amount = Number(newBooking.final_price);
      charges = parseFloat((ticket_info.price * CHARGES).toFixed(2));
      gst_on_charges = parseFloat((charges * GST).toFixed(2));
      total_fee = parseFloat((charges + gst_on_charges).toFixed(2));
      net_amount = parseFloat((gross_amount - total_fee).toFixed(2));

      total_eb_fees = parseFloat((total_fee - total_pg_fees).toFixed(2));

      // GST included amount ko split karo
      eb_charges = parseFloat((total_eb_fees / (1 + GST)).toFixed(2));
      eb_tax = parseFloat((total_eb_fees - eb_charges).toFixed(2));
    }

    // for testing by pass
    // pay_obj.fee = 0;
    // conmment it out after test


    // for USD
    if (ticket_info.currency == "USD" && pay_obj.fee) {
      CHARGES = CHARGES - 0.02; // for international let assume only Platform fee
      gross_amount = Number(pay_obj?.base_amount / 100);

      net_amount = parseFloat(
        ((gross_amount - pg_charges) / (1 + CHARGES + CHARGES * GST)).toFixed(2),
      );

      eb_charges = parseFloat((net_amount * CHARGES).toFixed(2));
      eb_tax = parseFloat((eb_charges * GST).toFixed(2));

      // total charges
      charges = parseFloat((eb_charges + (pg_charges - pg_charges_tax)).toFixed(2));
      // total gst_on_charges
      gst_on_charges = parseFloat((eb_tax + pg_charges_tax).toFixed(2));

      total_fee = parseFloat((charges + gst_on_charges).toFixed(2));

      // EB Fees
      total_eb_fees = parseFloat((eb_charges + eb_tax).toFixed(2));
    }

    // for paypal
    if (pay_obj.fee == 0 && pay_obj.wallet == "paypal") {
      let paypal_rate = Number(process.env.PAYPAL_CHARGES);
      let paid_amount = pay_obj.amount / 100 // In USD
      let paypal_charges = paid_amount * paypal_rate; // In USD
      let conversion_rate = parseFloat(((pay_obj.base_amount / pay_obj.amount)).toFixed(2));

      pay_obj.fee = parseFloat(paypal_charges * conversion_rate).toFixed(2) * 100; // convert to INR paise
      pg_charges = parseFloat(paypal_charges * conversion_rate).toFixed(2)

      // eb charges
      CHARGES = CHARGES - 0.02; // for international let assume only Platform fee
      gross_amount = Number(pay_obj?.base_amount / 100); // in rupees

      net_amount = parseFloat(
        ((gross_amount - (paypal_charges * conversion_rate)) / (1 + CHARGES + CHARGES * GST)).toFixed(2),
      );

      eb_charges = parseFloat((net_amount * CHARGES).toFixed(2));
      eb_tax = parseFloat((eb_charges * GST).toFixed(2));

      // total charges
      charges = parseFloat((eb_charges + (pg_charges - pg_charges_tax)).toFixed(2));
      // total gst_on_charges
      gst_on_charges = parseFloat((eb_tax + pg_charges_tax).toFixed(2));

      total_fee = parseFloat((charges + gst_on_charges).toFixed(2));

      // EB Fees
      total_eb_fees = parseFloat((eb_charges + eb_tax).toFixed(2));

      await Booking.findOneAndUpdate(
        { "order_details.id": order_id },
        { payment_details: pay_obj },
      );
    }

    await User.findByIdAndUpdate(newBooking.organizer, {
      $inc: {
        current_balance: net_amount,
        total_earning: net_amount,
      },
    });

    // Organizer Transaction
    await Transaction.create({
      user: newBooking.organizer,
      booking: newBooking._id,
      reference: newBooking?.payment_details?.id,
      type: "credit",
      net_amount,
      charges,
      total_fee,
      charges_type: bookedEvent.charges_type,
      gst: gst_on_charges,
      gross_amount,
      mode: "booking",
      status: "completed",
    });

    // Event Buddi Transaction

    await EB_Transaction.create({
      user: newBooking.organizer,
      booking: newBooking._id,
      reference: newBooking?.payment_details?.id,
      type: "credit",
      net_amount,
      total_fee,
      charges,
      pg_charges,
      pg_tax: pg_charges_tax,
      total_pg_fees,
      total_eb_fees,
      eb_charges,
      eb_tax,
      charges_type: bookedEvent.charges_type,
      gst: gst_on_charges,
      gross_amount,
      mode: "booking",
      status: "completed",
    });

    // add fee to eb_account
    await EB_Account.findOneAndUpdate(
      {
        email: "finance@assistbuddi.com",
      },
      {
        name: "Event Buddi",
        email: "finance@assistbuddi.com",
        $inc: {
          total_earning: parseFloat((total_fee - (Number(pay_obj?.fee / 100) + Number(pay_obj?.tax / 100))).toFixed(2)),
          total_revenue: gross_amount,
        },
      },
      {
        upsert: true,
      },
    );
  }

  if (bookedEvent.capacity !== null) {
    const updated = await Event.findOneAndUpdate(
      { _id: bookedEvent._id, capacity: { $gt: 0 } },
      { $inc: { capacity: -1 } },
      { new: true },
    );

    if (!updated) {
      return res.status(400).json({ status: false, message: "Event sold out" });
    }
  }

  if (ticket_info && ticket_info?.slots !== null) {
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: bookedEvent._id,
        "ticket_price._id": ticket_info._id,
        "ticket_price.slots": { $gt: 0 },
      },
      {
        $inc: {
          "ticket_price.$.slots": -1,
        },
      },
      { new: true },
    );

    if (!updatedEvent) {
      return res.status(400).json({
        status: false,
        message: "Ticket sold out",
      });
    }
  }

  await finalizeBookingRelations({
    booking: newBooking,
    user: guest,
    bookedEvent,
  });

  if (newBooking.status == "Booked") {
    try {
      await sendEmail({
        to: organizer.email,
        subject: "New Registration | " + bookedEvent.title,
        html: organizerMail(guest.name, bookedEvent.title, true),
      });
    } catch (error) {
      console.error("Guest email failed:", error);
    }
  }

  try {
    await sendEmail({
      to: guest.email,
      subject: "Event Registration | " + bookedEvent.title,
      html: guestMail(
        guest.name,
        bookedEvent.title,
        bookedEvent.location,
        bookedEvent.start_at,
        bookedEvent.end_at,
        true,
        bookedEvent.event_id,
        newBooking.tin,
      ),
    });
  } catch (error) {
    console.error("Guest email failed:", error);
  }

  return res.json({ status: true, message: "updated successfully" });
};

const export_bookings = async (req, res) => {
  try {
    const { event_id, is_checked_in } = req.body;

    let query = { event: event_id };
    if (is_checked_in !== undefined) {
      query.is_checked_in = is_checked_in;
    }

    const bookings = await Booking.find(query)
      .populate("event", "title")
      .populate("user", "name email phone profilePic picture")
      .lean();

    if (!bookings.length) {
      return res.status(404).json({
        status: false,
        message: "No bookings found",
      });
    }

    const allMetaKeys = new Set();

    bookings.forEach((bk) => {
      if (bk.meta) {
        Object.keys(bk.meta).forEach((key) => {
          allMetaKeys.add(key);
        });
      }
    });

    const exportData = bookings.map((bk) => {
      const baseData = {
        Name: bk?.user?.name || "",
        Email: bk?.user?.email || "",
        Phone: bk?.user?.phone || "",
        Checked_In: bk?.is_checked_in ? "Yes" : "No",
        Approved: bk?.is_approved ? "Yes" : "No",
        Booked_By_Organizer: bk?.is_booked_by_organizer ? "Yes" : "No",
        Ticket_ID: bk?.tin || "",
        Ticket_Name: bk?.ticket_info?.name || "",
        Registration_Date: moment(bk?.createdAt).format("DD-MM-YYYY HH:mm"),
      };

      // Dynamic meta flatten
      const metaFields = {};
      allMetaKeys.forEach((key) => {
        metaFields[key] = bk?.meta?.[key] ?? "";
      });

      return {
        ...baseData,
        ...metaFields,
      };
    });

    // Convert to CSV
    const csv = await json2csv(exportData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${bookings[0].event.title}.csv`,
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("export_booking", error);
    return res.status(500).json({
      status: false,
      message: "Error exporting booking",
      response: error.message,
    });
  }
};

const confirm_bbo_transaction = async (user, mode, newBooking, reference) => {
  try {
    await User.findByIdAndUpdate(newBooking.organizer, {
      $inc: {
        // current_balance: net_amount,
        total_earning: newBooking?.final_price,
        self_collected_amount: newBooking?.final_price,
      },
    });

    // Organizer Transaction
    const transaction = await Transaction.create({
      user: newBooking.organizer,
      booking: newBooking._id,
      reference: reference,
      type: "credit",
      net_amount: newBooking?.final_price,
      // total_fee,
      // charges_type: bookedEvent.charges_type,
      // gst: gst_on_charges,
      gross_amount: newBooking?.final_price,
      mode: "booking",
      status: "completed",
    });

    return;
  } catch (error) {
    console.log("transaction bbo error", error);
    return
  }
}

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  capturePayment,
  checkPayment,
  getBookingsForEvent,
  guestAnalytics,
  export_bookings
};
