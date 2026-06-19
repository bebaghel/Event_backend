const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/UserModel");

module.exports = (passport) => {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(
    "jwt",
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        console.error("Passport error:", error.message);
        return done(error, false); // Error me done(error, false) for better logging
      }
    })
  );
};
