const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const Admin = require("../models/AdminModel");

module.exports = (passport) => {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
  };

  passport.use(
    "admin-jwt",
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const admin = await Admin.findById(jwt_payload.id).select("-password");

        if (!admin) {
          return done(null, false);
        }

        return done(null, admin);
      } catch (err) {
        console.error("Admin Passport Error:", err.message);
        return done(err, false);
      }
    }),
  );
};
