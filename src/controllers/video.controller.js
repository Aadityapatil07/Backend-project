import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType } = req.query

  try {
    const filter =
      query ? {
        $or: [
          { title: { $regex: query, $options: "i" } }, // Match in the title
          { category: { $regex: query, $options: "i" } }, // Match in the category
          { owner: query }, // Match by owner ID (exact match)
          { "user.username": { $regex: query, $options: "i" } }, // Match in user.username
          { "user.fullName": { $regex: query, $options: "i" } }, // Match in user.fullName
        ],
      }
        : {};

    const sort = {
      [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1,
    };

    const pipeline = [
      // Lookup to join with the users collection
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "likes"
          },
          isLike: {
            $cond: {
              if: {
                $in: [req.user?._id, "likes.likedBy"],
                $then: true,
                $else: false
              }

            }

          }

        }

      },

      // Match with the combined filter
      { $match: filter },

      // Project the required fields
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          views: 1,
          likes: 1,
          createdAt: 1,
          category: 1,
          owner: 1,
          "user.username": 1,
          "user.fullName": 1,
          thumbnail: 1,
          videoFile: 1,
          likesCount: 1,
          isLike: 1
        },
      },

      // Apply sorting
      { $sort: sort },
    ];

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await Video.aggregatePaginate(Video.aggregate(pipeline), options);



    return res.status(200).json(
      new ApiResponse(200, result, "videos page successfully")
    );
  } catch (error) {
    console.error("Error fetching videos:", error);
    throw new ApiError(500, "Something went wrong while fetching videos")
  }
})

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, category } = req.body
  const userId = req.user._id
  console.log(title, description, category);


  if (
    [title, description, category].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required")
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "videoFile and thumbnailFile file is required")
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath)
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

  if (!videoFile || !thumbnail) {
    throw new ApiError(400, "video & thumbnail file is required")
  }


  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    category,
    duration: videoFile.duration || 0,
    owner: new mongoose.Types.ObjectId(userId)
  })

  const uploadedVideo = await Video.findById(video._id)

  if (!uploadedVideo) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse(200, uploadedVideo, "video uploaded Successfully")
  )
  // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id

  if (!videoId) {
    throw new ApiError(404, "videoId is missing");
  }

  try {
    await Video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } }, // Increment view count by 1
      { new: true } // Return the updated document
    )
    const user = await User.findById(userId)

    if (!user.watchHistory.includes(videoId)){
      user.watchHistory.push(videoId)

      if (user.watchHistory.length > 10) {
        user.watchHistory.shift(); // Remove the first video
      }

      await user.save();
    }

    // Find the video using aggregation pipeline
    const video = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
          isLike: {
            $cond: {
              if: { $in: [req.user?._id, "$likes.likedBy"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          id: 1,
          title: 1,
          description: 1,
          views: 1,
          createdAt: 1,
          category: 1,
          owner: 1,
          "user.username": 1,
          "user.fullName": 1,
          thumbnail: 1,
          videoFile: 1,
          likesCount: 1,
          isLike: 1,
        },
      },
    ]);

    // If no video is found
    if (!video || video.length === 0) {
      throw new ApiError(404, "Video not found");
    }

    // Increment the views count by 1
    ;

    // Return the video with updated view count
    return res.status(200).json(
      new ApiResponse(200, video, "Video retrieved successfully")
    );
  } catch (error) {
    throw new ApiError(500,error);
  }
});


const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const {title, description, category} = req.body
  const thumbnailLocalpath = req.file?.path

  const thumbnail = await uploadOnCloudinary(thumbnailLocalpath)


  const updatedFields = {};
    if (title) updatedFields.title = title;
    if (description) updatedFields.description = description
    if (category) updatedFields.category = category
    if (thumbnail) updatedFields.thumbnail = thumbnail

  

  const updatedvideo = await Video.findByIdAndUpdate(
         videoId,
         updatedFields,
         { new: true, runValidators: true }
     );


     return res
     .status(200)
     .json(
      new ApiResponse(200, updatedvideo, "video updated successfully")
     )





  //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params

    const video = await Video.findByIdAndDelete(videoId);
   
       if (!video) {
           throw new ApiError(404, "video not found");
       }
   
       return res
           .status(200)
           .json(new ApiResponse(200, null, "video deleted successfully"));
  //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $bit: { isPublished: { xor: 1 } } },
    { new: true } 
  );
 
})

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus
}