import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user._id

    //TODO: toggle like on video

    // Validate input
    if (!videoId) {
        throw new ApiError(400, "videoId  is missing");
    }
    if (!userId) {
        throw new ApiError(400, "userId is missing");
    }

    // Check if the Like already exists
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    });

    if (existingLike) {
        // If it exists, delete the Like (toggle off)
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(
            new ApiResponse(200, null, "Like removed successfully")
        );
    } else {
        // If it doesn't exist, create a new Like (toggle on)
        const newLike = await Like.create({
            video: videoId,
            likedBy: userId
        });
        return res.status(201).json(
            new ApiResponse(201, newLike, "Like created successfully")
        );
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { userId } = req.user._id

    //TODO: toggle like on video

    // Validate input
    if (!commentId || !userId) {
        throw new ApiError(400, "commentId or userId is missing");
    }

    // Check if the Like already exists
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId
    });

    if (existingLike) {
        // If it exists, delete the Like (toggle off)
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(
            new ApiResponse(200, null, "Like removed successfully")
        );
    } else {
        // If it doesn't exist, create a new Like (toggle on)
        const newLike = await Like.create({
            comment: commentId,
            likedBy: userId
        });
        return res.status(201).json(
            new ApiResponse(201, newLike, "Like created successfully")
        );
    }
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { userId } = req.user._id

    //TODO: toggle like on video

    // Validate input
    if (!tweetId || !userId) {
        throw new ApiError(400, "videoId or userId is missing");
    }

    // Check if the Like already exists
    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId
    });

    if (existingLike) {
        // If it exists, delete the Like (toggle off)
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(
            new ApiResponse(200, null, "Like removed successfully")
        );
    } else {
        // If it doesn't exist, create a new Like (toggle on)
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy: userId
        });
        return res.status(201).json(
            new ApiResponse(201, newLike, "Like register successfully")
        );
    }
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id; // Assuming `userId` is available from req.user

    // Validate userId
    if (!userId) {
        throw new ApiError(400, "UserId is missing");
    }

    // Aggregation pipeline to get liked videos
    const likedVideos = await Like.aggregate([
        // Step 1: Match the likes by the user
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId), // Match likes by this user
                video: { $exists: true } // Ensure it's a like on a video
            }
        },
        // Step 2: Lookup the video details from the Video collection
        {
            $lookup: {
                from: "videos", // Name of the video collection
                localField: "video", // Field in Like that refers to video
                foreignField: "_id", // Field in Video collection to match with
                as: "videoDetails" // The resulting array will contain the video details
            }
        },
        // Step 3: Unwind the `videoDetails` array to get individual video
        { $unwind: "$videoDetails" },
        // Step 4: Project only the necessary video details
       
        {
            $group: {
                _id: 0, // Group all results into one array
                likedVideos: { $push: "$videoDetails"}
            }
        }
    ]);

    // If no liked videos are found
    if (!likedVideos || likedVideos.length === 0) {
        return res.status(404).json(new ApiResponse(404, null, "No liked videos found"));
    }

    // Return liked videos
    return res.status(200).json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}