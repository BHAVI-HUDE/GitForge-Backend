const mongoose = require("mongoose");
const fileSchema = require("./fileSchema");

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

  // Repository file tree
  files: {
    type: [fileSchema],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Branches (master, dev, feature/login, etc.)
  branches: [
    {
      type: String,
      default: ["master"],
    },
  ],

  // Default branch
  defaultBranch: {
    type: String,
    default: "master",
  },

  // Commit IDs
  commits: [
    {
      type: String,
    },
  ],

  // Repository issues
  issues: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
    },
  ],

  // Repository collaborators
  collaborators: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

module.exports = mongoose.model("Repo", repoSchema);