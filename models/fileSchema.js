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

    // File content (used for text/code files if needed)
    content: {
      type: String,
      default: "",
    },

    // Supabase Storage path
    filepath: {
      type: String,
      default: "",
    },

    // Public URL of the file
    url: {
      type: String,
      default: "",
    },

    // File size in bytes
    size: {
      type: Number,
      default: 0,
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
  {
    _id: false,
  }
);

// Recursive schema for nested folders
fileSchema.add({
  children: {
    type: [fileSchema],
    default: [],
  },
});

module.exports = fileSchema;