const express = require ('express');
const User  = require('../model/user.model');
const bcrypt = require ('bcrypt');
const { body,validationResult } = require('express-validator')
const hashPassword = require("../helperFunctions/hashpassword")
const jwt = require("jsonwebtoken");
const TurfModel = require('../model/turf.model');
const SportsModel = require('../model/sports.model');
const RatingModel = require('../model/rating.model');
const formatDate = require('../helperFunctions/formatdate');
const { updateSlotWithExpiredDates } = require('./turf.controller');


const validationChecker = [
    body('userName')
    .notEmpty().withMessage("user is required")
    .isLength({min:4,max:16}).withMessage("name must be in minimum 4 and maximum 16"),
    body("email")
    .isEmail().withMessage('Please enter a valid email address '),
    body("password")
    .isLength({min:8,max:16}).withMessage("minimum 8 characters required")
]

const register = async(req,res)=>{
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            res.status(403).json({error:errors.array()})
        }else{
            const {userName, email ,phone, password } = req.body;
                const hashedPass =await  hashPassword(password);
                const user = await User.create({userName,email,phone,password:hashedPass});
                res.status(200).json({message:'signup successfull',user:user})
        }
    } catch (error) {
        res.status(500).json({error:'errror ocuured'})
    }
}
const verifyUserBeforeOtp = async(req,res)=>{
    try {
        const { phone }= req.body;
        const user = await User.findOne({phone:phone})
        if(user){
            res.status(404).json({message:"Entered number already exists ",})
        }else res.status(200).json({message:'Continue for the OTP',status:true})

    } catch (error) {
        res.status(500).json({message:"something went wrong try again"})
    }
}

const removeNonVerified= async(req,res)=>{
    try {
        const phone = req.body.phone;
        await User.findOneAndDelete({phone});
        res.status(200).json({message:"non verified user removed successfully"})
    } catch (error) {
        res.status(500).json({message:"something went wrong try again"})
    }
}
const login= async(req,res)=>{
    try {
        const user = await User.findOne({phone:req.body.phone});

            if(user){
                if(!user.isBlocked){
                const passMatch = bcrypt.compareSync(req.body.password,user.password);
                if(passMatch){
                    const payload  ={name:user.userName,id:user._id}
                    const token = jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:"1d"});
                    res.status(200).json({success:true,message:"logged in successfully",token:token});
                }else res.status(401).json({message:"Incorrect Password ",success:false,})
            }else res.status(400).json({message:"User is blocked by admin"})
        }else res.status(400).json({message:'User not Found '});
    } catch (error) {
        res.status(500).json({message:'internal server error'})
    }
}

const getSportsTYpes = async(req,res)=>{
    try {
        const sportsTypes =  await SportsModel.find();
        if(sportsTypes){
            res.status(200).json({sportsTypes,message:'sports details'})
        }else{
            res.status(400).json({message:'no sports available'})
        }
    } catch (error) {
        res.status(500).json({message:" internal server error "})
    }
}
const searchTurfs = async(req,res)=>{
    try {
        const {sports, dimension,minPrice,maxPrice} = req.body;
        let filter = {};
        if (sports) {
            filter.sportsType = sports;
        }
        if (dimension) {
            filter.sportsDimension = dimension;
        }
        if (minPrice >= 0 && maxPrice > minPrice) {
            filter.turfPrice = { $gte: minPrice, $lte: maxPrice }
        }
        const searchRes = await TurfModel.find(filter)
        if(searchRes && searchRes.length>0)res.status(200).json({searchRes})
        else res.status(404).json({message:' no turf found'})
    } catch (error) {
        res.status(500).json({message:'internal server error'})
    }
}
const turfSlotsAvailable = async(req,res)=>{
    try {
        updateSlotWithExpiredDates(req.params.turfId)
        const allRatings = await RatingModel.find({turfId:req.params.turfId}).populate('userId');
        if(allRatings){
            const turf = await TurfModel.findById(req.params.turfId);
            const turfData = {
                turfName: turf.turfName,
                turfImages:turf.turfImages,
                turfFacilities:turf.facilities,
                turfPrice:turf.turfPrice,
                turfLocation:turf.turfLocation.Address,
                sportsType : turf.sportsType,
                sportsDimension: turf.sportsDimension
            }
            const ratings = allRatings.map(rating=>({
                rating:rating.rating,
                message:rating.message,
                user:rating.userId.userName
            }))
            let totalRating =0
             ratings.forEach(rating=>{
                totalRating+= rating.rating
            })
            let avgRating = totalRating/(ratings.length);
                res.status(200).json({turfData,slots:turf.slots,ratings,avgRating})
        }else{
            const turf = await TurfModel.findById(req.params.turfId);
            const turfData = {
                turfName: turf.turfName,
                turfImages:turf.turfImages,
                turfFacilities:turf.facilities,
                turfPrice:turf.turfPrice,
                turfLocation:turf.turfLocation.Address,
                sportsType : turf.sportsType,
                sportsDimension: turf.sportsDimension
            }
                res.status(200).json({success:true,turfData,slots:turf.slots})
        }

    } catch (error) {
        res.status(500).json({message:'Internal server error'})
    }
}
const userProfile = async(req,res)=>{
    try {
        const userProfile = await User.findById({_id :req.id});
        const profileData  = {
            name:userProfile.userName,
            email:userProfile.email,
            phone:userProfile.phone,
            location:userProfile.location,
            age:userProfile.age,
            _id:userProfile._id,
            wallet:userProfile.wallet,
            walletStatements:userProfile.walletStatements
        }
        res.status(200).json({profileData})
    } catch (error) {
        res.status(500).json({message:'Internal server error '})
    }
}
const updateProfile = async(req,res)=>{
    try {

        const {name,email,Phone,Age,id} = req.body
        const ageNum = parseInt(Age)
        const user = await User.findByIdAndUpdate(id,{
            userName:name,
            email:email,
            phone:Phone,
            age:ageNum
        })
        const userProfile = await User.findById(id);
        const profileData  = {
            name:userProfile.userName,
            email:userProfile.email,
            phone:userProfile.phone,
            location:userProfile.location,
            age:userProfile.age,
            _id:userProfile._id
        }
        res.status(200).json({profileData})
    } catch (error) {
        res.status(500).json({message:"internal server error"})
    }
}

module.exports ={
    register,
    validationChecker,
    login,
    verifyUserBeforeOtp,
    removeNonVerified,
    getSportsTYpes,
    searchTurfs,
    turfSlotsAvailable,
    userProfile,
    updateProfile
}