import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user._id;
  
    // Validate input
    if (!channelId || !userId) {
      throw new ApiError(400, "Channel ID or User ID is missing");
    }
    if (channelId === userId.toString()) {
      throw new ApiError(400, "You cannot subscribe to yourself");
    }
  
    // Check if the subscription already exists
    const existingSubscription = await Subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });
  
    if (existingSubscription) {
      // If it exists, delete the subscription (toggle off)
      await Subscription.findByIdAndDelete(existingSubscription._id);
      return res.status(200).json(
        new ApiResponse(200, null, "Subscription removed successfully")
      );
    } else {
      // If it doesn't exist, create a new subscription (toggle on)
      const newSubscription = await Subscription.create({
        subscriber: userId,
        channel: channelId,
      });
      return res.status(201).json(
        new ApiResponse(201, newSubscription, "Subscription created successfully")
      );
    }
  });
  
// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    const subscriptionWithDetails = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId.trim()),
            }
        },
        {
            $lookup: {
                from: "users", // Collection to join (based on your setup)
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        }, // Flatten the array of subscriber details
        {
            $project: {
                "subscriberDetails.fullName": 1,
                "subscriberDetails.email": 1,
                "subscriberDetails.avatar": 1,
                "subscriberDetails.username": 1
            }
        }
    ]) // Populate `subscriber` with `name` and `email`

    return res
        .status(201)
        .json(
            new ApiResponse(200, subscriptionWithDetails[0].subscriberDetails, "subscribers detected successfully")
        )

})



// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    const channelWithDetails = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId.trim()),
            }
        },
        {
            $lookup: {
                from: "users", // Collection to join (based on your setup)
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        }, // Flatten the array of subscriber details
        {
            $project: {
                "channelDetails.fullName": 1,
                "channelDetails.email": 1,
                "channelDetails.avatar": 1,
                "channelDetails.username": 1
            }
        }
    ]) // Populate `subscriber` with `name` and `email`

    return res
        .status(201)
        .json(
            new ApiResponse(200, channelWithDetails[0].channelDetails, "channel detected successfully")
        )

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}