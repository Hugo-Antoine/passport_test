const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const CustomStrategy = require('passport-custom').Strategy;
const session = require('express-session');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

const app = express();

app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// In-memory token storage
const tokenStore = {};

// Passport Strategy
passport.use('magiclink', new CustomStrategy(
    function(req, done) {
        const token = req.body.token;

        if (token in tokenStore) {
            const user = { email: tokenStore[token] };
            delete tokenStore[token];
            done(null, user);
        } else {
            done(null, false);
        }
    }
));

passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser((email, done) => done(null, { email }));

// SendGrid setup
sgMail.setApiKey('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');

// API Endpoints
app.post('/send-magic-link', (req, res) => {
    const email = req.body.email;
    const token = crypto.randomBytes(16).toString('hex');

    tokenStore[token] = email;

    const magicLink = `http://localhost:3000/auth/magiclink?token=${token}`;

    const msg = {
        to: email,
        from: 'hugo.antoine@viacesi.fr',
        subject: 'Your Magic Link',
        text: `Click here to log in: ${magicLink}`,
        html: `<a href="${magicLink}">Click here to log in</a>`,
    };

    sgMail.send(msg)
        .then(() => res.send('Magic link sent!'))
        .catch(error => {
            console.error(error);
            res.status(500).send('Error sending email.');
        });
});

app.post('/validate-magic-link', passport.authenticate('magiclink'),
    (req, res) => {
        res.send({ success: true, user: req.user });
    }
);

app.get('/profile', (req, res) => {
    if (req.isAuthenticated()) {
        res.send({ user: req.user });
    } else {
        res.status(401).send('Not authenticated');
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
