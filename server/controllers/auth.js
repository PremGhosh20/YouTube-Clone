import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import { resolvePremiumStatus } from "../lib/premium.js";
import { resolveWatchTier } from "../lib/watchPlans.js";

export const login = async (req, res) => {
  const { name, image } = req.body;
  const email = req.firebaseUser.email;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    let user = await users.findOne({ email });

    if (!user) {
      user = await users.create({
        email,
        name: name || req.firebaseUser.name || "User",
        image: image || "",
      });
      return res.status(201).json({ result: user });
    }

    if (name || image) {
      user.name = name ?? user.name;
      user.image = image ?? user.image;
      await user.save();
    }

    await resolvePremiumStatus(user, users);
    await resolveWatchTier(user, users);
    const fresh = await users.findById(user._id);
    return res.status(200).json({ result: fresh });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;

  if (String(_id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: { channelname, description } },
      { new: true, runValidators: true }
    );

    if (!updatedata) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
