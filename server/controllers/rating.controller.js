const RatingModel  = require('../model/rating.model');

const addRating = async(req,res)=>{
    try {
        const updatedRatings = await RatingModel.findOne({userId:req.id,turfId:req.body.turfId});
        if(updatedRatings){
            updatedRatings.rating = Number(req.body.rating);
            updatedRatings.time = new Date()
            if(req.body.message)updatedRatings.message = req.body.message
            else updatedRatings.message=''
            await updatedRatings.save()
        }else{
            const rating = new RatingModel();
            rating.userId = req.id;
            rating.turfId = req.body.turfId,
            rating.rating = Number(req.body.rating)
            rating.time = new Date()
            if(req.body.message)rating.message = req.body.message
            else rating.message=''
            await rating.save();
        }
        const updatedRating = await RatingModel.findOne({userId:req.id,turfId:req.body.turfId})
        res.status(200).json({updatedRating});

    } catch (error) {
        req.status(500).json({message:'Internal server error '})
    }
}
const turfRating = async(req,res)=>{
    try {
        const ratings = await RatingModel.find({turfId:req.body.turfId}).populate('User');
        if(ratings)  res.status(200).json({ratings})
        else res.status(404).json({message:'No ratings found'})
    } catch (error) {
        res.status(500).json({message:'Internal server error '})
    }
}
module.exports = {
    addRating,
    turfRating
}