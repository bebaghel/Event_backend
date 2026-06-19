const BadgeTemplate = require("../models/BadgeTemplateModel");

const saveBadgeTemplate = async (req, res) => {
  try {
    let { event, name, elements } = req.body;

    const background = req.files.background?.[0]?.filename || null;
    const logoFilename = req.files.logo?.[0]?.filename || null;

    elements = JSON.parse(elements);
    if (logoFilename) {
      const logoEl = elements.find((el) => el.id === "logo");
      if (logoEl) {
        logoEl.logoSrc = `/badge_images/${logoFilename}`; // Full path for frontend src
      }
    }

    const template = await BadgeTemplate.create({
      createdBy: req.user._id,
      event,
      name,
      background,
      elements,
    });

    return res.status(201).json({
      status: true,
      message: "Template save successfully",
      response: template,
    });
  } catch (error) {
    console.log("saveBadgeTemplate error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const getEventTemplates = async (req, res) => {
  try {
    const { event } = req.body;
    const templates = await BadgeTemplate.find({ event }).populate("event");

    return res.status(200).json({
      status: true,
      message: "Template fetch successfully",
      response: templates,
    });
  } catch (error) {
    console.log("getEventTemplates error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const getOwnerTemplates = async (req, res) => {
  try {
    const owner = req.user?._id;
    const templates = await BadgeTemplate.find({
      createdBy: owner,
    }).populate("event");

    return res.status(200).json({
      status: true,
      message: "Template fetch successfully",
      response: templates,
    });
  } catch (error) {
    console.log("getOwnerTemplates error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await BadgeTemplate.findById(id);

    return res.status(200).json({
      status: true,
      response: template,
    });
  } catch (error) {
    console.log("getTemplateById error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await BadgeTemplate.findByIdAndDelete(id);

    return res.status(200).json({
      status: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.log("deleteTemplate error", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      response: error.message,
    });
  }
};

module.exports = {
  saveBadgeTemplate,
  getEventTemplates,
  getOwnerTemplates,
  getTemplateById,
  deleteTemplate,
};
