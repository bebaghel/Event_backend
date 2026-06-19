const express = require("express");
const router = express.Router({ mergeParams: true });
const Event = require("../models/EventModel");

function stripHtml(html) {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

router.get("/", async (req, res) => {
    const { evtid } = req.params;
    const event = await Event.findOne(
        { event_id: 'evt-' + evtid },
        { title: 1, image: 1, description: 1, location: 1, seo_keywords: 1, analytics_meta_tag: 1 }
    );

    if (!event) {
        return res.redirect("/");
    }

    const description = stripHtml(event.description).substring(0, 160);

    return res.render("event", {
        event_id: event.event_id,
        title: event.title,
        image: event.image,
        description,
        location: event.location,
        seo_keywords: event?.seo_keywords || [],
        analytics_meta_tag: event?.analytics_meta_tag || "",
    });
});

module.exports = router;