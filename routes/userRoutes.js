const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/forgotPasswordRender", authController.forgotPasswordRender);
router.patch("/resetPassword/:token", authController.resetPassword);

// now below this all routes will be protected, as this below middleware will run before we go to any of the below routes
router.use(authController.protect);

router.patch("/updateMyPassword", authController.updatePassword);
router.patch("/updateMe", userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);
router.get("/me", userController.getMe, userController.getUser);

// now below routes need to be performed by admin
router.use(authController.restrictTo('admin'));

router.route("/").get(userController.getAllUsers).post(userController.createUser);
router.route("/:id").get(userController.getUser).patch(userController.updateUser).delete(userController.deleteUser);

module.exports = router;