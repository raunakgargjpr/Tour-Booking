const express = require("express");
const path = require("path");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const helmet = require("helmet");
const hpp = require("hpp");
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const viewRouter = require("./routes/viewRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serving static files
// now if we type http://localhost:3000/overview.html in browser, it will show us the html page as it is taking public folder as root
app.use(express.static(path.join(__dirname, 'public')));

// set security http headers
app.use(helmet());

// we can use process.env file anywhere in our application once it is configured
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// Limit requests from same API
// if we restart our server limit will reset to 100
// help us to avoid brute force attacks by hackers to login
const limiter = rateLimit({
    // it means that one IP can make at max 100 requests in window of 1 hr
    max: 100,
    windowMs: 60 * 60 * 1000, // 1 hr
    message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter); // apply this limiter middleware to all our api requests

// this is the middleware which will get data from body into the req
app.use(express.json({ limit: '10kb' })); // 10 Kb se jyda data nhi aa skta req me
app.use(express.urlencoded({extended: true, limit: '10kb'}));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

app.use(
    hpp({
        whitelist: [ // whitelist will allow these properties duplicate entries in query params
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price'
        ]
    })
);

app.use((req, res, next) => {
    //console.log(req.cookies); // if we console this, then error in middle ware goes directly to global error middleware
    req.requestTime = new Date().toISOString();
    next();
})

// Mounting of routers
// for the route "/api/v1/tours" we will apply tourRouter middleware and similarly for the userRouter

app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all("*", (req, res, next) => {
    next(new AppError(`can't find ${req.originalUrl} on this server!`, 404));
});

// GLOBAL ERROR HANDLER --> 4 arguments in fxn will tell express that this is an error middleware
app.use(globalErrorHandler);

module.exports = app;

