import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    const comments = await Comment.aggregatePaginate(Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId.trim())
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "commentLikes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$commentLikes"
                },
                isLike: {
                    $cond: { 
                        if:{$in: [req.user?._id, "$commentLikes.likedBy"]},
                        then: true,
                        else: false
                        }

                    }

            }

        },
        {
            $project:{
                content:1,
                video:1,
                isLike:1,
                likesCount:1,
                owner:1,
                commentLikes:1

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
    new ApiResponse(200, comments, "comments load successfully")
  )

})

const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { videoId } = req.params
    const userId = req.user._id

    if (content.trim() === "") {
        throw new ApiError(400, "comment is required")
    }
    try {
        const comment = await Comment.create({
            content,
            video: new mongoose.Types.ObjectId(videoId.trim()),
            owner: new mongoose.Types.ObjectId(userId)
        })

        return res
            .status(201)
            .json(
                new ApiResponse(201, comment, "comment added successfully")
            )
    } catch (error) {
        throw new ApiError(500,error || "error while creating comment")

    }

    // TODO: add a comment to a video
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}