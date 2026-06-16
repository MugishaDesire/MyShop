const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");

// ── ADMIN Google Strategy ─────────────────────────────────────────────────────
passport.use("google-admin",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/admin/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const [admins] = await db.query(
          "SELECT id, email FROM admins WHERE email = ?", [email]
        );
        if (!admins.length) {
          return done(null, false, { message: "Not an authorized admin email" });
        }
        return done(null, { ...admins[0], role: "admin" });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ── USER Google Strategy ──────────────────────────────────────────────────────
passport.use("google-user",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/user/auth/google/callback",
      passReqToCallback: true,   // ← add this
    },
    async (req, accessToken, refreshToken, profile, done) => {  // ← add req param
      try {
        const email = profile.emails[0].value;
        const fullname = profile.displayName;

        const [users] = await db.query(
          "SELECT id, fullname, phonenumber, email FROM users WHERE email = ?", [email]
        );

        if (users.length) {
          return done(null, { ...users[0], role: "user" });
        }

        await db.query(
          "INSERT INTO users (fullname, email, phonenumber, password) VALUES (?, ?, ?, ?)",
          [fullname, email, "", "GOOGLE_AUTH"]
        );
        const [newUser] = await db.query(
          "SELECT id, fullname, phonenumber, email FROM users WHERE email = ?", [email]
        );
        return done(null, { ...newUser[0], role: "user" });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
// ── Serialize/Deserialize ─────────────────────────────────────────────────────
passport.serializeUser((user, done) => {
  // Store both id and role so we know which table to query
  done(null, { id: user.id, role: user.role });
});

passport.deserializeUser(async ({ id, role }, done) => {
  try {
    if (role === "admin") {
      const [rows] = await db.query(
        "SELECT id, email FROM admins WHERE id = ?", [id]
      );
      done(null, { ...rows[0], role: "admin" });
    } else {
      const [rows] = await db.query(
        "SELECT id, fullname, phonenumber, email FROM users WHERE id = ?", [id]
      );
      done(null, { ...rows[0], role: "user" });
    }
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;