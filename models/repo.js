const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["file", "folder"],
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    // Only for files
    content: {
      type: String,
      default: "",
    },

    lastCommit: {
      type: String,
      default: "Initial commit",
    },

    updatedAt: {
      type: String,
      default: "just now",
    },
  },
  { _id: false }
);

fileSchema.add({
  children: {
    type: [fileSchema],
    default: [],
  },
});


const repoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    isPrivate: {
        type: Boolean,
        default: false,
    },

    description: {
        type: String,
        default: "",
    },

    files: {
        type: [fileSchema],
        default: [],
    },


    createdAt: {
        type: Date,
        default: Date.now
    },
     // Branches like master, dev, feature/login
    branches: [{
        type: String,
        default: ["master"]
    }],

    // Current head commit of default branch
    defaultBranch: {
        type: String,
        default: "master"
    },

    // All commit IDs that were pushed to this repo
    commits: [{
        type: String     // commitID (UUID generated locally)
    }],

    // Issues belonging to this repo
    issues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue"
    }],

    // Users who contributed
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
});

module.exports = mongoose.model("Repo", repoSchema);