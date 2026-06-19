const disposableDomains = require("../utils/disposableDomains");

exports.validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { ok: false, message: "Invalid email format" };
  }

  const domain = email.split("@")[1].toLowerCase();

  if (disposableDomains.includes(domain)) {
    return { ok: false, message: "Please enter valid email" };
  }

  return { ok: true };
};
