const catchAsync = require("./../utils/catchAsync");
const User = require("./../models/userModel");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const { promisify } = require("util");
const Email = require('./../utils/email');
const crypto = require("crypto");

const signToken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true // means browser cant modify cookie, it only stores it, and then automatically send the cookie along with each request to server where the cookie came from
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // in production we want https secure connection

    // if we send the cookie with name 'jwt', then if there already exists a cookie named 'jwt', then it will be overwritten by our new cookie
    // so cookie name is unique identifier
    res.cookie('jwt', token, cookieOptions); // send the cookie to browser, name of cookie is jwt and content is our token

    // remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token: token,
        data: {
            user: user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    // before saving it first validators will check if confirm password is right, then pre save middleware will run to encrypt the password
    const newUser = await User.create({
        // we are not passing req.body bcoz someone can post that he is admin, so this is a security flaw, so we will manually add fields we want to save
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role
    });

    const url = `${req.protocol}://${req.get('host')}/me`;
    console.log(url);
    await new Email(newUser, url).sendWelcome();

    // once the user is signed up, we should make the user login by generating a token
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new AppError('please provide username and password', 400));
    }
    const user = await User.findOne({ email: email }).select('+password'); // + in select means give password also along with other details, if we wrote only password, then email will not be shown and only password will be shown
    // console.log(user);

    // we have to await an async fnx output
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Username or password is invalid!', 401));
    }

    createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
    // ------------- 1. Check if the token exists -----------------
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    // console.log(token);
    if (!token) {
        return next(new AppError('You are not logged in!', 401));
    }
    // -------------- 2. Verification of Token ----------------------
    // if token is changed or modified, this will generate web token error which we handled inside error controller
    // if token is expired, this will generate web token expired error which we handled inside error controller
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // verify function work with callback, so we promisify this fxn to use await here
    // if token is fine, then decoded will have the payload that is user id

    // ---------------- 3. Check if user still exists -------------------
    const freshUser = await User.findById(decoded.id);
    if (!freshUser) {
        return next(new AppError('User with this token no longer exists!', 401));
    }
    // -------------------4. Check is password is changed after token is issued -------------
    // iat --> token issued At, this is in the payload we get from token
    if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('user recently changed password, please login again', 401));
    }
    // ------------- Grant access to protected route -----------------
    req.user = freshUser; // just put user data on req object to use it later
    res.locals.user = freshUser;
    next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // 1) verify token
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );

            // 2) Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            // 3) Check if user changed password after the token was issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            // THERE IS A LOGGED IN USER
            res.locals.user = currentUser; // now our pug templates will get access to user property in which our loggedIn user is there
            return next();
        }
        catch (err) {
            return next();
        }
    }
    next();
};

// back in our tour router when we listen to the update(patch) and delete requests, we passed the name of functions that served as a middleware. Remember middleware functions accept (request, response, next) parameters, but in ours middleware stack we actually "called/invoked" authController.restrictTo('lead-guide','admin') and calling a function will try to get the returned value from that function, in this case we actually returned a middleware function that can accept (req,res,next) parameters.
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles is an array of arguments --> ['admin', 'lead-guide']
        // req.user upar wale middleware se ayega kyuki delete route ke liye phle wo wala middleware call hua hai
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to view this', 403));
        }
        next();
    }
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1. get user based on posted email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('User email is not valid!', 404));
    }
    // 2. generate random reset token
    const resetToken = user.createPasswordResetToken();
    // now in the createPasswordResetToken fxn we added the fields of expire and resetToken, but it is not saved, so save the user now
    // we used validateBeforeSave: false bcoz we don't want any validation errors here as we are not saving required fields like email and password

    await user.save({ validateBeforeSave: false });

    // 3. send to user email
    try {
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset();
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
});

exports.forgotPasswordRender = catchAsync(async (req, res, next) => {
    // 1. get user based on posted email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('User email is not valid!', 404));
    }
    // 2. generate random reset token
    const resetToken = user.createPasswordResetToken();
    // now in the createPasswordResetToken fxn we added the fields of expire and resetToken, but it is not saved, so save the user now
    // we used validateBeforeSave: false bcoz we don't want any validation errors here as we are not saving required fields like email and password

    await user.save({ validateBeforeSave: false });

    // 3. send to user email
    try {
        const resetURL = `${req.protocol}://${req.get('host')}/resetPassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset();
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });
    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    console.log(user);

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    console.log(user);

    await user.save(); // not passing { validateBeforeSave: false } bcoz now i want to validate this password and passwordConfirm fields

    // passwordChangedAt property we added using middleware in model 
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    // first protect middleware will run to check if user is logged in before updating its password
    // so req.user will contain our user
    const user = await User.findById(req.user._id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong.', 401));
    }
    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save(); // it will run validations and run pre document middleware to encrypt password and add the passwordChangedAt field
    // User.findByIdAndUpdate will NOT work as intended! --> bcoz pre middleware will not work and also valdation will not work here

    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
});
