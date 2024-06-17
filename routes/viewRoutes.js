const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.get('/me', authController.protect, viewsController.getAccount);
router.post('/submit-user-data', authController.protect, viewsController.updateUserData);
router.get('/my-tours', authController.protect, viewsController.getMyTours);
router.get('/', bookingController.createBookingCheckout, authController.isLoggedIn, viewsController.getOverview);


router.use(authController.isLoggedIn);
router.get('/tour/:slug', viewsController.getTour);
router.get('/login', viewsController.login);
router.get('/signup', viewsController.signup);
router.get("/forget-password",viewsController.getForgetPassPage)
router.get("/resetPassword/:token", viewsController.resetPassword)

module.exports = router;