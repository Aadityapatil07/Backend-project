import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const getChannelStats = asyncHandler(async (req, res) => {
        const { channelId } = req.params;
    
        // Validate input
        if (!channelId) {
            throw new ApiError(400, "channelId is required");
        }
    
        try {
            // Get total videos for the channel
            const totalVideos = await Video.countDocuments({ owner: channelId });
    
            // Get total views for all videos of the channel
            const totalViews = await Video.aggregate([
                { $match: { owner: mongoose.Types.ObjectId(channelId) } },
                { $group: { _id: null, totalViews: { $sum: "$views" } } },
            ]);
    
            // Get total likes for all videos of the channel
            const totalLikes = await Like.aggregate([
                { $match: { video: { $in: await Video.find({ owner: channelId }).distinct("_id") } } },
                { $group: { _id: null, totalLikes: { $sum: 1 } } },
            ]);
    
            // Get total subscribers for the channel
            const totalSubscribers = await Subscription.countDocuments({ channel: channelId });
    
            // Create the response object with the statistics
            const stats = {
                totalVideos,
                totalViews: totalViews[0]?.totalViews || 0,
                totalLikes: totalLikes[0]?.totalLikes || 0,
                totalSubscribers,
            };
    
            return res.status(200).json(new ApiResponse(200, stats, "Channel stats retrieved successfully"));
        } catch (error) {
            throw new ApiError(500, "Error retrieving channel stats");
        }
    })


const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { channelId } = req.params; // Assuming the channelId is passed as a parameter

    // Validate that the channelId is provided
    if (!channelId) {
        throw new ApiError(400, "channelId is required");
    }

    try {
        // Fetch all videos uploaded by the channel (where owner is the channelId)
        const videos = await Video.find({ owner: channelId })
            .select("title description thumbnail views createdAt") // Optional: Select only the fields you need
            .sort({ createdAt: -1 }); // Sort by creation date, descending (latest videos first)

        if (!videos || videos.length === 0) {
            throw new ApiError(404, "No videos found for this channel");
        }

        // Return the list of videos in the response
        return res.status(200).json(new ApiResponse(200, videos, "Videos retrieved successfully"));
    } catch (error) {
        throw new ApiError(500, "Error retrieving videos");
    }
})

export {
    getChannelStats, 
    getChannelVideos
    }