const AppError = require("../utils/appError");
const User = require("./../models/userModel");
const sharp = require('sharp');
const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");
const multer = require("multer");

// const multerStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/img/users');
//     },
//     filename: (req, file, cb) => {
//         // user-userId-timeStamp
//         const ext = file.mimetype.split('/')[1]; // file extension
//         cb(null, `user-${req.user._id}-${Date.now()}.${ext}`);
//     }
// });
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    console.log(req.file);

    // adding this bcoz the updateMe middleware needs req.file.fileName
    // when using buffer storage, req.file dont have a filename field, so we have to add it
    // when using diskStorage, req.file have this filename property
    req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);

    next();
});

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
    console.log(req.file);
    // console.log(req.body);

    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not for password updates. Please use /updateMyPassword.', 400));
    }

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
    if (req.file) {
        filteredBody.photo = req.file.filename;
    }

    // 3) Update user document
    // req.user we can use bcoz first the protect middleware will run ensuring the user is logged in

    // updateMe function user could enter any thing in name and email. For example, user could enter blank name and invalid email address without @ sign. At this situation, if we turn off validation using validateBeforeSave: false , whatever user enters will be saved. So, these fields should be validated before it is saved to database
    // thats why we are not using --> await user.save({ validateBeforeSave: false });
    const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
        new: true, // return the new updated object, not the old one
        // So, at the point of updating, the validators will run. And it looks like it should also run the validators on "password" and "passwordConfirm", since these are set to "required: true" in our schema
        // "runValidators" will only act on the areas that have been updated in findByIdAndUpdate
        // So basically, if we amend the email field and update with runValidators set to true, runValidators will only run the validators relevant to the e-mail field.
        runValidators: true
    });
    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, { active: false }); // user ki active field ko false kr diya

    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.createUser = (req, res) => {
    res.status(500).json({
        status: "error",
        message: "this route is not defined, please use /signup instead"
    });
};

exports.getMe = (req, res, next) => {
    // params me id dal denge taaki getOne fxn is logged in user ki id params se utha le
    req.params.id = req.user._id;
    next();
}

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User); // not passing any populate options
// do not update password with this
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);