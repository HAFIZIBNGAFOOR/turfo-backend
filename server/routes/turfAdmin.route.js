const express  = require("express");
const turfAdminController = require("../controllers/turfadmin.controller")
const turfController = require('../controllers/turf.controller')
const turfAdminRoute = express();
const jwtHelper = require('../middlewares/jwtHelper'); 
const upload = require("../config/multer");
const bookingController = require('../controllers/bookings.controller')
const turfAdmin = require("../model/turfAdmin.model");


turfAdminRoute.post('/turfAdmin/register',turfAdminController.registerTurfAdmin);
turfAdminRoute.post('/turfAdmin/verify',turfAdminController.verifyTurfAdminBeforeOtp)
turfAdminRoute.post('/turfAdmin/login',turfAdminController.loginTurfAdmin);
turfAdminRoute.get('/turfAdmin/home',jwtHelper.verifyTurfAdminJwt,turfAdminController.turfAdminDashboard);
turfAdminRoute.get('/turfAdmin/get-sports',jwtHelper.verifyTurfAdminJwt,turfAdminController.sportsType);
turfAdminRoute.post('/turfAdmin/testingCloudinary',jwtHelper.verifyTurfAdminJwt,upload.array('turfImages',5),turfAdminController.addTurf)

// turfAdminRoute.post('/turfAdmin/testingCloudinary',jwtHelper.verifyTurfAdminJwt,upload.array('turfImages',5),turfAdminController.testing)

turfAdminRoute.get('/turfAdmin/turf-lists',jwtHelper.verifyTurfAdminJwt,turfController.listTurfs)
turfAdminRoute.post('/turfAdmin/blockUnblockTurf',jwtHelper.verifyTurfAdminJwt,turfController.blockOrUnblockTurf)
turfAdminRoute.get('/turfAdmin/getSingleTurf/:turfId',jwtHelper.verifyTurfAdminJwt,turfController.getSingleTurf)
turfAdminRoute.get('/turfAdmin/timeSlots/:turfId/:date',jwtHelper.verifyTurfAdminJwt,turfAdminController.timeSlots)
turfAdminRoute.post('/turfAdmin/addSlots',jwtHelper.verifyTurfAdminJwt,turfAdminController.addSlots)
turfAdminRoute.patch('/turfAdmin/cancel-booking',jwtHelper.verifyTurfAdminJwt,turfAdminController.cancelBookingByTurfAdmin);
turfAdminRoute.get('/turfAdmin/getProfile',jwtHelper.verifyTurfAdminJwt,turfAdminController.getProfile)
turfAdminRoute.patch('/turfAdmin/update-profile',jwtHelper.verifyTurfAdminJwt,turfAdminController.updateProfile);
turfAdminRoute.post('/turfAdmin/turfs-booking',jwtHelper.verifyTurfAdminJwt,turfAdminController.turfBookings);
turfAdminRoute.post('/turfAdmin/cancel-booking',jwtHelper.verifyTurfAdminJwt,turfAdminController.cancelBookingByTurfAdmin)


module.exports = turfAdminRoute