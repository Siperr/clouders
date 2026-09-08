const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');
const verifyAuth = require('./middlewares/auth');
const prisma = require('./config/prisma');
const path = require("path");
const app = express();

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    ),
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

require('./config/passport');

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  if(req.isAuthenticated()) {
    res.redirect('/folder');
  } else {
    res.render('index');
  }
});

app.use('/login', require('./routes/loginRouter'));
app.use('/logout', require('./routes/logoutRouter'));
app.use('/signup', require('./routes/signupRouter'));
app.use('/file', require('./routes/fileRouter'));
app.use('/folder', require('./routes/folderRouter'));

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});