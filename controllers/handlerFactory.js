const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIFeatures = require("./../utils/apiFeatures");

exports.deleteOne = (Model) => {
    return catchAsync(async (req, res, next) => {
        // in rest api we do not generally send any response when delete is there
        const doc = await Model.findByIdAndDelete(req.params.id);
        if (!doc) {
            return next(new AppError('No tour find with that ID', 404));
        }
        res.status(204).json({
            status: "success",
            data: null
        });
    });
};

exports.updateOne = (Model) => {
    return catchAsync(async (req, res, next) => {
        // this will update the field only that is specified, not whole object
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true, // this will return the updatedTour not the oldOne
            runValidators: true // run validators on the updated tour, so if someone updated price by giving a string price value, then validators will run and error will be thrown
        });
        if (!doc) {
            return next(new AppError('No document find with that ID', 404));
        }
        res.status(200).json({
            status: "success",
            data: {
                data: doc
            }
        });
    });
};

exports.createOne = (Model) => {
    return catchAsync(async (req, res, next) => {
        // if we provide extra fields inside body other then mentioned in schema, then it will simply ignore those fields
        const newDoc = await Model.create(req.body);
        res.status(201).send({
            status: "success",
            data: {
                data: newDoc
            }
        });
    });
};

exports.getOne = (Model, popOptions) => {
    return catchAsync(async (req, res, next) => {
        let query = Model.findById(req.params.id);
        if (popOptions) query = query.populate(popOptions);
        const doc = await query;

        if (!doc) {
            return next(new AppError('No document found with that ID', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                data: doc
            }
        });
    });
};

exports.getAll = (Model) => {
    return catchAsync(async (req, res, next) => {
        // for getting all reviews for a tour --> nesting endpoints
        let filter = {};
        if (req.params.tourId) {
            filter = { tour: req.params.tourId };
        }
        // returning this from functions above => so chaining of methods is possible
        const features = new APIFeatures(Model.find(filter), req.query).filter().sort().limitFields().paginate();
        // then await the query to get result ==> execute the query
        const docs = await features.query;

        res.status(200).json({
            status: "success",
            results: docs.length,
            data: {
                data: docs
            }
        });
    });
};
