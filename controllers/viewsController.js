const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const crypto = require("crypto");

exports.getOverview = catchAsync(async (req, res, next) => {
    // 1) Get tour data from collection
    const tours = await Tour.find();

    // 2) Build template
    // 3) Render that template using tour data from 1)
    res.status(200).render('overview', {
        title: 'All Tours',
        tours: tours
    });
});


exports.getTour = catchAsync(async (req, res, next) => {
    // 1) Get the data, for the requested tour (including reviews and guides)
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        select: 'review rating user -tour'
    });
    if (!tour) {
        return next(new AppError('There is no tour with that name.', 404));
    }
    let isbookedTour = false;
    let review;
    let bookedTour;
    if (res.locals.user) {
        console.log("Hello---------------");
        bookedTour = await Booking.findOne({ tour: tour._id, user: res.locals.user._id })
        review = await Review.findOne({ user: res.locals.user._id, tour: tour._id })
    }
    if (bookedTour) isbookedTour = true

    console.log(review, bookedTour, isbookedTour);
    res.status(200).render('tour', {
        title: `${tour.name} Tour`,
        tour,
        isbookedTour,
        review
    });
});

exports.login = (req, res) => {
    res.status(200).render('login', {
        title: 'Log in'
    });
};

exports.signup = (req, res) => {
    res.status(200).render('signup', {
        title: 'Sign Up'
    });
};

exports.getAccount = (req, res) => {
    res.status(200).render('account', {
        title: 'Your account'
    });
};

module.exports.getForgetPassPage = (req, res, next) => {
    res.status(200).render("forgetpass", {
        title: "Forget Password"
    })
};

exports.getMyTours = catchAsync(async (req, res, next) => {
    // 1) Find all bookings
    const bookings = await Booking.find({ user: req.user._id });
    console.log(bookings);
    // 2) Find tours with the returned IDs
    const tourIDs = bookings.map(el => el.tour._id);
    const tours = await Tour.find({ _id: { $in: tourIDs } });

    res.status(200).render('overview', {
        title: 'My Tours',
        tours
    });
});

module.exports.resetPassword = catchAsync(async (req, res, next) => {
    const token = req.params.token;
    const hashtoken = crypto.createHash('sha256').update(token).digest("hex");
    const user = await User.findOne({ passwordResetToken: hashtoken });
    if (!user) {
        return next(new appError("failed", "invalid token"));
    }
    const currentDate = Date.now()
    if (currentDate > user.passwordResetExpires) {
        return next(new appError("Failed", "Link is expired please try again"))
    }
    res.status(200).render("resetpass", {
        title: "Reset Password",
        token
    });
})

exports.updateUserData = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
            name: req.body.name,
            email: req.body.email
        },
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).render('account', {
        title: 'Your account',
        user: updatedUser
    });
});