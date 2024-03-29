const hashPassword = require("../helperFunctions/hashpassword")
const TurfAdmin = require("../model/turfAdmin.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SportsModel = require('../model/sports.model');
const TurfModel = require("../model/turf.model");
const Bookings = require('../model/bookings.model')
const formatDate = require("../helperFunctions/formatdate");
const cloudinary = require('.././config/cloudinary-test');
const fs = require('fs');
const path  = require('path');
const sharp = require('sharp');
const dotenv = require('dotenv');
const { updateSlotWithExpiredDates } = require("./turf.controller");
const User = require("../model/user.model");
dotenv.config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const verifyTurfAdminBeforeOtp = async(req,res)=>{
    try {
        const turfAdmin = await TurfAdmin.findOne({phone:req.body.phone})
        if(turfAdmin) res.status(404).json({message:'Entered numbered already exists'})
        else res.status(200).json({message:'Continue to  send otp'})
    } catch (error) {
        res.status(500).json({message:'something went wrong  server error '})
    }
}
const registerTurfAdmin = async(req,res)=>{
    try {
        const {userName,email,phone,password } =req.body;
        const hashedPass = await hashPassword(password);
        const newTurfAdmin = await TurfAdmin.create({turfAdminName:userName,email:email,phone:phone, password:hashedPass});
        res.status(200).json({turfAdmin:newTurfAdmin});         
    } catch (error) {
        res.status(500).json({mesage:"something went wrong try again"})
    }
}
const loginTurfAdmin = async(req,res)=>{
    try {
        let turfAdmin = await TurfAdmin.findOne({phone:req.body.phone});
        if(turfAdmin){
            let passMatch = bcrypt.compareSync(req.body.password, turfAdmin.password);
            if(passMatch){
                const payload = {id:turfAdmin._id,name:turfAdmin.turfAdminName}
                const token = jwt.sign(payload,process.env.JWT_TURFSECRET,{expiresIn:"1d"});
                res.status(200).json({message:"turf admin logged in successfully ",token:token});
            }else res.status(401).json({message:"Incorrect password"})
        }else res.status(404).json({message:"Entered number not registered"});
    } catch (error) {
        res.status(500).json({message:"something went wrong try again"});
    }
}
const sportsType = async(req,res)=>{
    try {
        const sports = await SportsModel.find();
        res.status(200).json({sports}) 
    } catch (error) {
        res.status(200).json({message:'internal server error'})
    }
}
const turfAdminDashboard = async(req,res)=>{
    try {
        const turfs = await TurfModel.find({turfOwner :req.id})
        const turfIds = turfs.map(turf=>turf._id);
        const bookings = await Bookings.find({turf:{$in:turfIds},bookingStatus:'Completed'}).populate('turf');
        const annualBookings = bookings.filter(booking=> new Date(booking.bookedSlots.date).getFullYear()== new Date().getFullYear());
        let annualSales = 0;
        annualBookings.forEach(booking =>annualSales += booking.totalCost);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date();
        const monthlyBookings = bookings.filter(booking=>{
            const bookingDate = new Date(booking.bookedSlots.date);
            return bookingDate >= thirtyDaysAgo && bookingDate <= today;
        });
        let monthlySales = 0;
        monthlyBookings.forEach(booking=>monthlySales += booking.totalCost)
        const currentDay = today.getDay();
        const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const weeklyBookings = bookings.filter(booking=> {
            const bookingDate = new Date(booking.bookedSlots.date);
            return bookingDate > new Date(today.setDate(diff)) && bookingDate < new Date(today.setDate(diff + 6));
        });


        let weeklySales = 0;
        weeklyBookings.forEach(booking => weeklySales += booking.totalCost);

        //data for chart with bookings by month

        let bookingsByMonth = {};
        let noOfBookings =0;
        let TotalAmount= 0 
        const currentYear = new Date().getFullYear();
        for(let month=1 ;month<=12;month++){
            bookingsByMonth[`${currentYear}-${month}`]={month:`${currentYear}-${month}`,noOfBookings:0,TotalAmount:0} 
        }
        bookings.forEach(booking=>{
            if(booking.bookingStatus =='Completed'){
                const bookingYear = booking.Time.getFullYear();
                if(currentYear == bookingYear){
                    const month = booking.Time.getMonth()+1;
                    const key = `${bookingYear}-${month}`
                    if(!bookingsByMonth[key]){
                        bookingsByMonth[key] = {month:key, noOfBookings,TotalAmount}
                    }
                    bookingsByMonth[key].noOfBookings++
                    bookingsByMonth[key].TotalAmount += booking.totalCost
                }
            }
        })

        // pie chart based on the types of sports booked\
        let turfCount = {}
        turfs.forEach((turf)=>{
            turfCount[turf.turfName]={turfName:turf.turfName,count:0}
        })
        bookings.forEach(booking=>{
            let count =0
            if(!turfCount[booking.turf.turfName]) turfCount[booking.turf.turfName]={turfName:booking.turf.turfName,count}   
                turfCount[booking.turf.turfName].count++
        })
        res.status(200).json({monthlySales,weeklySales,annualSales,turfCount:Object.values(turfCount),bookingsByMonth:Object.values(bookingsByMonth)})
    } catch (error) {
        res.status(500).json({message:'internal server error '});
    }
}
const addTurf = async(req,res)=>{
    try {
        const { turfName, turfLocation,turfContact,turfFacilities,sportsDimension,sportsType,turfPrice,defaultSlots } = req.body
        const parsedLoc = JSON.parse(turfLocation)
        const turfAdmin = await TurfAdmin.findById({_id:req.id});
        const existingTurf = await TurfModel.findOne({turfName:turfName});
        const turfFacilitiesArray  = turfFacilities.split('\r\n')
        if(turfAdmin.isVerified ==false){
            res.status(403).json({verified:false})
        }else{
            if(existingTurf){
                res.status(404).json({existing:true})
            }else{
            if(req.files){
                const addTurf = new TurfModel();
                addTurf.turfOwner = req.id;
                addTurf.turfName = turfName,
                addTurf.turfLocation.Address = parsedLoc.address,
                addTurf.turfLocation.lat =parsedLoc.lat,
                addTurf.turfLocation.long =parsedLoc.long,
                addTurf.turfContact = turfContact
                addTurf.facilities = turfFacilitiesArray
                addTurf.sportsDimension = sportsDimension
                addTurf.sportsType = sportsType
                addTurf.turfPrice = parseInt(turfPrice)
                const files = req.files
                let uploadPromises=[];
                for(const file of files){
                    const filePath = path.join('./uploads',file.originalname);
                    fs.renameSync(file.path,filePath)
                    const resizedBuffer = await sharp(filePath)
                    .resize({ width: 300, height: 250, fit: 'cover' }) // Adjust width and height as needed
                    .toBuffer();
                    const folder = 'turfImages'; 
                    uploadPromises.push(cloudinary.uploads(resizedBuffer, folder).finally(()=>fs.unlinkSync(filePath)));
                }
                Promise.all(uploadPromises)
                .then((results)=>{
                    const imageUrls = results.map((res)=>res.url)
                    addTurf.turfImages = imageUrls;
                    // addTurf.save()
                    res.status(200).json({message:'got the turf details',status:true})
                })
            }else{
                res.status(400).json({message:'no file type'})
            }
        }
        }

    } catch (error) {
        res.status(500).json({message:'internal server error '})
    }
}

const timeSlots = async(req,res)=>{
    try {
        updateSlotWithExpiredDates(req.params.turfId);
        const turf = await TurfModel.findById({_id:req.params.turfId})
        const dateToMatch = formatDate(req.params.date)
        const matchingSlot = turf.slots.find((slot)=> {
            return (dateToMatch == slot.dateString);
        });
        if(matchingSlot){
            const timeSlots = matchingSlot.timeSlots
            const turfData = {
                turfName : turf.turfName,
                turfLocation : turf.turfLocation.Address,
                turfprice : turf.turfPrice
            }
            res.status(200).json({timeSlots,turfData})
        }else {
            const turfData = {
                turfName : turf.turfName,
                turfLocation : turf.turfLocation.Address,
                turfprice : turf.turfPrice
            }
            res.status(206).json({turfData,status:206})
        }
    } catch (error) {
        res.status(500).json({message:'Internal server error'})
    }
}
const addSlots =async(req,res)=>{
    try {
        const { date,timeSlots,turfId } = req.body;
        const turf  = await TurfModel.findById(turfId);
        if(turf){
            date.forEach(day => {
                const existingSlots = turf.slots.find(slot =>slot.dateString == day)
                if(existingSlots){
                  existingSlots.timeSlots = timeSlots
                }else{
                    turf.slots.push({
                        date:new Date(day),
                        dateString:day,
                        timeSlots
                    })
                }
            })
            await turf.save()
        }
        res.status(200).json({message:'success'})
    } catch (error) {
        res.status(500).json({message:'internal server error'})
    }
}
const cancelBookingByTurfAdmin = async(req,res)=>{
    try {
        await Bookings.findByIdAndUpdate(req.body.bookingId,{$set:{bookingStatus:'Cancelled'}});
        const booking = await Bookings.findById(req.body.bookingId).populate('turf');
        const user = await User.findOne({_id:booking.user});
        user.wallet += booking.totalCost;
        user.walletStatements.push({
            walletType:'Refund from cancellation by Turf',
            amount:booking.totalCost,
            date:new Date(),
            transaction:'credit',
            turfName:booking.turf.turfName
        })
        await user.save()
        const turfAdmin = await TurfAdmin.findOne({_id:booking.turf.turfOwner})
        turfAdmin.wallet -= booking.totalCost;
        turfAdmin.walletStatements.push({
            walletType:'Refund from cancellation by Turf',
            amount:booking.totalCost,
            date:new Date(),
            transaction:'debit',
            turfName:booking.turf.turfName,
            user:user.userName
        })
        await turfAdmin.save()
        const bookings = await  Bookings.find({turf:booking.turf._id})   
        const turf = await TurfModel.findById(booking.turf._id)
        res.status(200).json({bookings,turf})
    } catch (error) {
        res.status(500).json({message:'Internal server error '})
    }
}
const getProfile = async(req,res)=>{
    try {
        const profile = await TurfAdmin.findById(req.id);
        if(profile) res.status(200).json({profile})
        else res.status(400).json({message:'No data found'})
    } catch (error) {
        res.status(500).json({message:'Internal server error '})
    }
}

const updateProfile = async(req,res)=>{
    try {
        const {name,email,Phone,Age,id} = req.body
        const ageNum = parseInt(Age)
        await TurfAdmin.findByIdAndUpdate(id,{
            turfAdminName:name,
            email:email,
            phone:Phone,
            age:ageNum
        })
        const profile = await TurfAdmin.findById(id);
        res.status(200).json({profile})
    } catch (error) {
        res.status(500).json({message:'Internal server error '})
    }
}

const turfBookings = async(req,res)=>{
    try {
        const bookings = await Bookings.find({turf:req.body.turfId}).populate('user')
        const turf = await TurfModel.findById(req.body.turfId) ;
        if(bookings && bookings.length>=1){
            res.status(200).json({bookings,turf})
        }
    } catch (error) {
        res.status(500).json({message:'Internal server error '})
    }
}


module.exports = {
    registerTurfAdmin,
    loginTurfAdmin,
    verifyTurfAdminBeforeOtp,
    sportsType,
    addTurf,
    timeSlots,
    addSlots,
    turfAdminDashboard,
    cancelBookingByTurfAdmin,
    getProfile,
    updateProfile,
    turfBookings
    // testing
}