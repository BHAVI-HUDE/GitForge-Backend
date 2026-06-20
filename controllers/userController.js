const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {MongoClient} = require("mongodb");
const dotenv = require("dotenv");
var ObjectId = require("mongodb").ObjectId;
const { supabase } = require("../config/storage");
const Repository = require('../models/repo');


dotenv.config();


const uri = process.env.MONGODB_URI;
let client;

async function connectClient() {
    if(!client){
        client = new MongoClient(uri);
        await client.connect();
    }
}
async function signUp(req,res) {
    const {name, email, password,} = req.body;
    try{
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const normalizedEmail = email.toLowerCase();

        const existingUser = await usersCollection.findOne({email: normalizedEmail,});
        if(existingUser) {
            return res.status(400).json({message:"User already exists!"});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            username: name,
            password: hashedPassword,
            email: normalizedEmail,
            repos : [],
            starredRepos:[],
            followers: [],
            following: [],
            bio: "",
            avatar: "",
            createdAt: new Date(),
        }

        const result = await usersCollection.insertOne(newUser);
        const token = jwt.sign({id:result.insertedId},process.env.JWT_SECRET_KEY, {expiresIn:"1h"});

        res.status(201).json({
            success: true,
            token,
            userId: result.insertedId,
            username:newUser.username,
            email: newUser.email
        });
    } catch(error){
        console.log("Error during SignUp: ",error);
        res.status(500).json({
            error:"Failed to signUp"
        });
    }
}

async function logIn(req, res) {
    const {email, password} = req.body;
    try{
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({email});
        if(!user) {
            return res.status(400).json({message:"Invalid credentials!"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({message: "Invalid credentials!"});
        }

        const token = jwt.sign({id:user._id}, process.env.JWT_SECRET_KEY, {expiresIn:"1h"});
        res.json({token, userId: user._id});
        
    } catch(error){
        console.log("error during login: ",error);
        res.status(500).json({
            error: "Server error"
        });
    }
}


async function getAllUsers(req, res) {
    try{
       await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const users = await usersCollection.find({}).toArray();
        res.json({
            success: true,
            count: users.length,
            users: users
        });
        
    } catch(error){
        console.log("Error fetching all Users: ",error);
        res.status(500).json({
            error: "Failed to fetch all Users"
        });
    }
}


const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    await connectClient();
    const db = client.db("githubclone");
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne(
        { _id: new ObjectId(id) },
        { 
            projection: {
            username: 1,
            email: 1,
            avatar: 1,
            bio: 1,
            createdAt: 1,
            followers: 1,
            following: 1
            }
        }
        );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ FETCH REPOS BY OWNER (NOT user.repos)
    const repos = await Repository.find({ owner: id }).select(
      "name description isPrivate createdAt"
    );

    res.json({
      success: true,
      user,
      repos,
      repoCount: repos.length,
    });
  } catch (error) {
    console.error("getUserProfile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🔥 AVATAR UPLOAD HIT");
    console.log("FILE:", req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No avatar uploaded",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const db = client.db("githubclone");
    const usersCollection = db.collection("users");

    const filePath = `avatars/${id}-${Date.now()}-${req.file.originalname}`;

    const { data, error } = await supabase.storage
    .from("avatars")
    .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
    });

    if (error) {
    throw error;
    }

    const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { avatar: avatarUrl } }
    );

    return res.json({
      success: true,
      avatar: avatarUrl,
    });

  } catch (error) {
    console.error("Avatar upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload avatar",
    });
  }
};


const updateUserProfile = async(req, res) => {
    const currentID = req.params.id;
    const { username, email, password, bio, avatar } = req.body;
    
    try{
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        // Build updateFields object dynamically
        let updateFields = {};
        
        // Only add fields that are provided in the request
        if(username !== undefined) updateFields.username = username;
        if(email !== undefined) updateFields.email = email;
        if(bio !== undefined) updateFields.bio = bio;
        if(avatar !== undefined) updateFields.avatar = avatar;
        
        // Hash password if provided
        if(password){
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateFields.password = hashedPassword;
        }

        // Check if there are fields to update
        if(Object.keys(updateFields).length === 0){
            return res.status(400).json({message: "No fields to update!"});
        }

        // Check for duplicate username or email before updating
        if(username || email){
            const duplicateQuery = {
                _id: { $ne: new ObjectId(currentID) },
                $or: []
            };
            
            if(username) duplicateQuery.$or.push({ username });
            if(email) duplicateQuery.$or.push({ email });
            
            const duplicate = await usersCollection.findOne(duplicateQuery);
            
            if(duplicate){
                if(duplicate.username === username){
                    return res.status(409).json({message: "Username already exists!"});
                }
                if(duplicate.email === email){
                    return res.status(409).json({message: "Email already exists!"});
                }
            }
        }
        
        // Use updateOne and then fetch the updated document
        const updateResult = await usersCollection.updateOne(
            { _id: new ObjectId(currentID) }, 
            { $set: updateFields }
        );
        
        if(updateResult.matchedCount === 0){
            return res.status(404).json({message: "User not found!"});
        }
        
        // Fetch the updated user
        const updatedUser = await usersCollection.findOne(
            { _id: new ObjectId(currentID) },
            { projection: { password: 0 } } // Exclude password from response
        );
        
        res.json({
            message: "User profile updated successfully!",
            user: updatedUser
        });
        
    } catch (error){
        console.log("Error during updating: ", error);
        
        // Handle MongoDB duplicate key errors
        if(error.code === 11000){
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists!`
            });
        }
        
        res.status(500).json({
            error: "Server error"
        });
    }
}
const deleteUserProfile = async(req, res) => {
    const currentID = req.params.id;
    try{
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const result = await usersCollection.deleteOne({
            _id: new ObjectId(currentID),
        });

        if(result.deletedCount==0) {
            return res.status(404).json({message: "User not found!"});
        }

        res.json({message: "User Profile Deleted!"});
        
    } catch(error){
        console.log("Error deleting user profile: ",error);
        res.status(500).json({
            error: "Failed to delete User Profile"
        });
    }
}


module.exports = {signUp, logIn, getAllUsers, getUserProfile,updateUserProfile,deleteUserProfile,uploadAvatar};
