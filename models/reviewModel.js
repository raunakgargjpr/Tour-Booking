const mongoose = require('mongoose');
const Tour = require('./tourModel');

// Child referencing for User and Tour --> we cannot maintain full array of reviews inside tour or user

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, 'Review can not be empty!']
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belong to a tour.']
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user']
        }
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// this will make the tour and user unique, so one user is allowed to post one review on a particular tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name photo'
    });
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     path: 'user',
    //     select: 'name photo'
    // });
    next();
});

// calcAverageRatings this is a static method which will be called by model
reviewSchema.statics.calcAverageRatings = async function (tourId) {
    // aggregate fxn runs on the model, so this keyword here represent a model
    // console.log(this);
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);
    console.log(stats);

    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    }
    else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        });
    }
};
// using post not pre bcoz in the calcAverageRatings fxn we are using aggregate and in that we are using match, so it will look in the db for that, but in pre middleware, document is not yet saved inside db
reviewSchema.post('save', function () {
    // this points to current review, and this.constructor points to the Review model, so we can call our static fxn from here
    this.constructor.calcAverageRatings(this.tour); // passing the tourId
});

// findByIdAndUpdate
// findByIdAndDelete
// no document middleare is there for these methods -> findByIdAndUpdate, findByIdAndDelete
// so we have to work and figure out things from query middleware only
reviewSchema.pre(/^findOneAnd/, async function (next) {
    // this is the query middleware, this point to the query
    this.r = await this.findOne(); // here we are getting the document that is going to be deleted or updated
    console.log(this.r);
    // cannot call the calcAverageRatings fnx here bcoz document is not updated or deleted yet
    next();
});

reviewSchema.post(/^findOneAnd/, async function () {
    // await this.findOne(); does NOT work here, query has already executed
    // now this.r will be the document we got in pre middleware, now this.r.constructor will get the Review model
    // now we can call calcAverageRatings fxn, and passing the tourId -> this.r.tour
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;