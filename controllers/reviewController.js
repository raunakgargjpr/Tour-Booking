const Review = require("./../models/reviewModel");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./handlerFactory");

exports.setTourUserIds = (req, res, next) => {
    // this middleware will run before createOne review
    // Allow nested routes
    if (!req.body.tour) {
        req.body.tour = req.params.tourId;
    }
    req.body.user = req.user._id; // from the protect middleware
    next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);