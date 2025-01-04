import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"



const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body
    const owner= req.use_id
        if (content.trim() === "") {
            throw new ApiError(400, "tweet is required")
        }
        try {
            const tweet = await Tweet.create({
                content,
                owner: new mongoose.Types.ObjectId(owner)
            })
    
            return res
                .status(201)
                .json(
                    new ApiResponse(201, tweet, "tweet created successfully")
                )
        } catch (error) {
            throw new ApiError(500,error || "error while creating tweet")
    
        }
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
     const { userId } = req.params
        const { page = 1, limit = 10 } = req.query
    
        const tweet = await Tweet.aggregatePaginate(Tweet.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId.trim())
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "tweet",
                    as: "tweetLikes"
                }
            },
            {
                $addFields: {
                    likesCount: {
                        $size: "$tweetLikes"
                    },
                    isLike: {
                        $cond: { 
                            if:{$in: [userId.trim(), "$tweetLikes.likedBy"]},
                            then: true,
                            else: false
                            }
                        }
    
                }
    
            },
            {
                $project:{
                    content:1,   
                    isLike:1,
                    likesCount:1,
                    owner:1,  
                }
    
            },
            {
                $sort:{
                    likesCount: -1
                }
            }
        ]),
        {
            page:parseInt(page),
            limit:parseInt(limit)
        }
    )
    
    
    return res.status(200).json(
        new ApiResponse(200, tweet, "tweet load successfully")
      )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body

    try {
        const updatedTweet = await Tweet.findByIdAndUpdate(
            tweetId,
            { content },
            {new : true}
        )
        return res.status(200).json(
            new ApiResponse(200, updatedTweet, "Tweet updated successfully")
        )
    } catch (error) {
        throw new ApiError(500, "Error updating the tweet")
    }

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
try {
        const deleteTweet = await Video.findByIdAndDelete(tweetId)
        return res.status(200).json(
            new ApiResponse(200, null, "Tweet deleted successfully")
        )
        
    
} catch (error) {
    throw new ApiError(500, "Error deleting the tweet")
}

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}