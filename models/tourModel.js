const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");
const User = require("./userModel");

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'], // give error message also
        unique: true,
        trim: true,
        maxlength: [40, "Name should be <= 40 chars"],
        minlength: [10, "Name should be >= 10 chars"]
        // validate: [validator.isAlpha, "Tour name must only contain charaters"]
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, "A tour must have a duration"]
    },
    maxGroupSize: {
        type: Number,
        required: [true, "A tour must have a group size"]
    },
    difficulty: {
        type: String,
        required: [true, "A tour must have a difficulty"],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: "Difficulty is either easy, medium or difficult"
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, "Rating should be >= 1"],
        max: [5, "Rating should be <= 5"],
        set: val => Math.round(val * 10) / 10 // 4.666666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, "A tour must have a price"]
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (val) {
                // IMPORTANT -> this only points to curr doc only on NEW document created
                // true if discount < price
                // val is the value of priceDiscount user filled
                return val < this.price; // this.price se price ki value mil gayi
            },
            message: "Discount price ({VALUE}) should be below regular price!"
        }
    },
    summary: {
        type: String,
        trim: true // this will remove all whitespaces from beginning and end
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, "A tour must have an image"]
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now()
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        // GeoJSON
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    //guides: Array // this is for embedding guides in tours by finding users from id's --> we will not do this
    guides: [
        {
            // DB will store id's only but these id's are now referenced to USER object
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
}, {
    toJSON: { virtuals: true }, // when the output is send in JSON, add virtual properties also
    toObject: { virtuals: true }
});

// SET INDEXING ON DB to improve reads
// this is the compound indexing
tourSchema.index({price: 1, ratingsAverage: -1}); // 1 means price is ascending indexing, and -1 means ratings will be descending indexing
tourSchema.index({slug: 1});
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

// VIRTUAL POPULATE Reviews for this tour
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour', // in review model tour field is having id of tour
    localField: '_id' // in tour model _id is having id of tour
});

// --------- DOCUMENT MIDDLEWARE ----------: runs before save() or create(), not insertMany() or update
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true }); // add a new field slug which will have a name in lower case
    next();
});

// for embedding guides inside tour --> we will not do this, instead we will use normalization
// tourSchema.pre('save', async function (next) {
//     const guidePromises = this.guides.map(async id => await User.findById(id));
//     this.guides = await Promise.all(guidePromises);
//     next();
// });

tourSchema.pre(/^find/, function (next) {
    this.find({ secretTour: { $ne: true } });
    this.start = Date.now();
    next();
});
// populate will apply to all query starting with find
tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides', // which field to populate of tour
        select: '-__v -passwordChangedAt' // don't show these fields of populated user object
    });
    next();
});

tourSchema.post(/^find/, function (docs, next) {
    console.log(`Query took ${Date.now() - this.start} ms time!!`);
    next();
});

// ---------------------- AGGREGATE MIDDLEWARE --------------------------

// tourSchema.pre('aggregate', function (next) {
//     // remove secretTours from aggregate results
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); // add this element at beginning of pipeline array
//     console.log(this.pipeline()); // print the array we wrote in the aggregate fxn
//     next();
// })

const Tour = mongoose.model("Tour", tourSchema);
module.exports = Tour;