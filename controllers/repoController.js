const mongoose = require('mongoose');
const Repository = require('../models/repo');
const { supabase } = require("../config/storage");

async function createRepository(req, res){
    const {
        name,
        owner,
        issues,
        content,
        description,
        isPrivate
    } = req.body;
    
    try{
       if(!name){
        return res.status(400).json({error: "Repository name is required!"});
        }

        if(!mongoose.Types.ObjectId.isValid(owner)){
            return res.status(400).json({error: "Invalid User ID!"});
        }

        const newRepository = new Repository({
            name,
            description, 
            isPrivate,
            owner, 
            content,
            issues
        });

        const result = await newRepository.save();

        res.status(201).json({
            message:"Repository created!",
            repositoryID: result._id
        });
    } catch(error){
        console.log("Error Creating Repo: ",error);
        res.status(500).json({error: "Server Error"});
    }
}

 async function getAllRepositories(req, res){
    try{
        const repositories = await Repository.find({})
        .populate("owner")
        .populate("issues");

        res.json({
            success: true,
            count: repositories.length,
            repositories: repositories
        });
    } catch(error){
        console.log("Error Fetching Repositories: ", error);
        res.status(500).json({error: "Failed to fetch repositories"});
    }
}

async function getRepositoryById(req, res) {
    const { id } = req.params;

    try {
        const repo = await Repository.findById(id)
            .populate("owner")
            .populate("issues");

        if (!repo) {
            return res.status(404).json({
                error: "Repository not found"
            });
        }

        res.json({
            repo
        });
    } catch (error) {
        console.log("Error Fetching Repository: ", error);
        res.status(500).json({
            error: "Failed to fetch Repository"
        });
    }
}


async function getRepositoryByName(req, res){
    const {repoName} = req.params.name;
    try{
        const repository = await Repository.find({name: repoName})
        .populate("owner")
        .populate("issues");

        if(!repository){
            return res.status(400).json({
                error: "Repository not found"
            });
        }

        res.json({
            repository
        });
    } catch(error){
        console.log("Error Fetching Repository by name: ",error);
        res.status(500).json({
            error: "Failed to fetch Repository"
        });
    }
}

async function fetchRepositoryForCurrentUser(req,res){
    const userId = req.params.userID;
    try{
        const repositories = await Repository.find({owner: userId});
        // if(!repositories || repositories.length == 0){
        //     return res.status(404).json({error: "User Repositories not found!"})
        // }
        res.json({
            success: true,
            count : repositories.length,
            repositories: repositories
        });
    } catch(error) {
        console.log("Error fetching user repositories: ",error);
        res.status(500).json({
            error: "Failed to fetch user repositories"
        });
    }
}

async function updateRepositoryById(req, res){
    const {id} = req.params;
    const {name,content, description} = req.body;
    try{

        const repository = await Repository.findById(id);

        if(!repository){
            return res.status(404).json({
                error: "Repository not found"
            });
        }

        repository.content.push(content);
        repository.name.push(name);
        repository.description.push(description);

        const updatedRepository = await repository.save();
        
        res.json({
            success: true,
            repository: updatedRepository
        });
    } catch(error){
        console.log("Error Updating Repository: ", error);
        res.status(500).json({
            error: "Failed to update Repository"
        });
    }
}

async function deleteRepositoryById(req, res){
    const {id} = req.params;
    try{
       const repository = await Repository.findByIdAndDelete(id);
        if(!repository){
            return res.status(404).json({
                error: "Repository not found"
            });
        } 
       res.json({
            success: true,
            message: "Repository deleted successfully"
        });
    } catch (error) {
        console.log("Error deleting repository: ",error);
        res.status(500).json({
            error: "Failed to delete repository"
        });
    }
}

async function toggleVisibilityById(req, res){
    const {id} = req.params;
    try{
        const repository = await Repository.findById(id);
        if(!repository){
            return res.status(404).json({
                error: "Repository not found"
            });
        }

        repository.isPrivate = !repository.isPrivate;
        const updatedRepo = await repository.save();
        
        res.json({
            success: true,
            repository: updatedRepo
        });
    } catch (error) {
        console.log("Error toggling repository visibility: ", error);
        res.status(500).json({
            error: "Failed to update repository visibility"
        });
    }
}

const addFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content = "", path = "" } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "File name is required",
      });
    }

    const repo = await Repository.findById(id);

    if (!repo) {
      return res.status(404).json({
        success: false,
        message: "Repository not found",
      });
    }

    // Find the current folder
    const pathParts = path.split("/").filter(Boolean);

    
    const targetFolder = pathParts.length
      ? traversePath(repo.files, pathParts)
      : repo.files;


    if (!targetFolder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // Prevent duplicate names in current folder
    const exists = targetFolder.some(
      (item) => item.name === name
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "File already exists",
      });
    }

    targetFolder.push({
      type: "file",
      name,
      content,
      lastCommit: `Add ${name}`,
      updatedAt: "just now",
    });


    repo.markModified("files");

    await repo.save();

    const verifyRepo = await Repository.findById(id);


    res.status(201).json({
      success: true,
      repository: repo,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const addFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, path = "" } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Folder name is required",
      });
    }

    const repo = await Repository.findById(id);

    if (!repo) {
      return res.status(404).json({
        success: false,
        message: "Repository not found",
      });
    }

    const pathParts = path.split("/").filter(Boolean);

    const targetFolder = pathParts.length
      ? traversePath(repo.files, pathParts)
      : repo.files;

    if (!targetFolder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    const exists = targetFolder.some(
      (item) => item.name === name
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "A file or folder with this name already exists",
      });
    }

    targetFolder.push({
      type: "folder",
      name,
      children: [],
      lastCommit: `Add ${name} folder`,
      updatedAt: "just now",
    });

    repo.markModified("files");

    await repo.save();

    const verifyRepo = await Repository.findById(id);


    res.status(201).json({
      success: true,
      repository: repo,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const uploadFileToS3 = async (req, res) => {

  console.log("uploadFileToS3 called");
console.log("req.file:", req.file);
console.log("req.body:", req.body);
console.log("req.params:", req.params);
  try {
    const { id } = req.params;
    const { path = "" } = req.body;


    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({
        success: false,
        message: "Repository not found",
      });
    }

    const fileName = req.file.originalname;

    // Resolve target folder
    const pathParts = path ? path.split("/").filter(Boolean) : [];
    const targetFolder = traverseOrCreatePath(repo.files, pathParts);

    // Prevent duplicate file names INSIDE THE SAME FOLDER
    const exists = targetFolder.some(
      (item) => item.type === "file" && item.name === fileName
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "File already exists in this folder",
      });
    }

    const filePath = `repos/${id}/${path ? path + "/" : ""}${fileName}`;

    const { data, error } = await supabase.storage
      .from("repositories")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
  .from("repositories")
  .getPublicUrl(filePath);

const fileUrl = publicUrlData.publicUrl;

    targetFolder.push({
      type: "file",
      name: fileName,
      filepath: filePath,
      url: fileUrl,
      size: req.file.size,
      lastCommit: `Upload ${fileName}`,
      updatedAt: "just now",
    });

    await repo.save();

    return res.status(201).json({
      success: true,
      repository: repo,
    });
  } catch (err) {
  console.error("===== uploadFileToS3 Error =====");
  console.error(err);
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);

  return res.status(500).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}
}


const searchRepositories = async (req, res) => {
  try {
    const { query } = req.params;

    if (!query) {
      return res.json({ repos: [] });
    }

    const repos = await Repository.find({
      name: { $regex: query, $options: "i" }, // case-insensitive
    })
      .select("name description isPrivate")
      .limit(10);

    res.json({
      success: true,
      repos,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
};

const traversePath = (files, pathParts) => {
  let current = files;

  for (const part of pathParts) {

    const folder = current.find((item) => {
      return item.type === "folder" && item.name === part;
    });


    if (!folder) return null;

    current = folder.children;

  }

  return current;
};

const traverseOrCreatePath = (files, pathParts) => {
  let current = files;

  for (const part of pathParts) {
    let folder = current.find(
      (item) => item.type === "folder" && item.name === part
    );

    // CREATE folder if it does not exist
    if (!folder) {
      folder = {
        type: "folder",
        name: part,
        children: [],
        lastCommit: `Add ${part}`,
        updatedAt: "just now",
      };
      current.push(folder);
    }

    current = folder.children;
  }

  return current;
};


const browseRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const { path = "" } = req.query;

    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    if (!path) {
      return res.json({
        success: true,
        path: "",
        items: repo.files,
      });
    }

    const pathParts = path.split("/").filter(Boolean);
    const folderContents = traversePath(repo.files, pathParts);

    if (!folderContents) {
      return res.status(404).json({ error: "Folder not found" });
    }


    res.json({
      success: true,
      path,
      items: folderContents,
    });
  } catch (error) {
    console.log("Browse error:", error);
    res.status(500).json({ error: "Failed to browse repository" });
  }
};

const getFileContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: "Path is required",
      });
    }

    const repo = await Repository.findById(id);

    if (!repo) {
      return res.status(404).json({
        success: false,
        message: "Repository not found",
      });
    }

    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();

    const parent = traversePath(repo.files, parts) || repo.files;

    const file = parent.find(
      (item) => item.type === "file" && item.name === fileName
    );

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Download file from Supabase Storage
    console.log("Mongo file object:");
console.log(file);
console.log("filepath:", file.filepath);
    const { data, error } = await supabase.storage
      .from("repositories")
      .download(file.filepath);

    if (error) {
      throw error;
    }

    // Convert Blob -> text
    const content = await data.text();

    return res.json({
      success: true,
      file: {
        name: file.name,
        path: path,
        type: file.type,
        extension: file.name.split(".").pop().toLowerCase(),
        content,
        url: file.url,
        size: file.size,
      },
    });
  } catch (error) {
    console.error("===== getFileContent Error =====");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

function collectFilePaths(folder, paths = []) {
  if (!folder) return paths;

  if (Array.isArray(folder)) {
    folder.forEach((item) => collectFilePaths(item, paths));
    return paths;
  }

  if (folder.type === "file") {
    if (folder.filepath) {
      paths.push(folder.filepath);
    }
    return paths;
  }

  if (folder.type === "folder" && folder.children) {
    folder.children.forEach((child) => collectFilePaths(child, paths));
  }

  return paths;
}

const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: "Path is required" });
    }

    const repo = await Repository.findById(id);

    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();

    const parent = parts.length
      ? traversePath(repo.files, parts)
      : repo.files;

    if (!parent) {
      return res.status(404).json({ error: "Invalid path" });
    }

    const index = parent.findIndex(
      (item) => item.type === "file" && item.name === fileName
    );

    if (index === -1) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = parent[index];

    // Delete from Supabase Storage
    if (file.filepath) {
      const { error } = await supabase.storage
        .from("repositories")
        .remove([file.filepath]);

      if (error) {
        console.error("Supabase delete error:", error);

        return res.status(500).json({
          success: false,
          error: "Failed to delete file from storage",
        });
      }
    }

    // Delete from MongoDB
    parent.splice(index, 1);

    await repo.save();

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to delete file",
    });
  }
};
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({
        success: false,
        error: "Path is required",
      });
    }

    const repo = await Repository.findById(id);

    if (!repo) {
      return res.status(404).json({
        success: false,
        error: "Repository not found",
      });
    }

    const parts = path.split("/").filter(Boolean);
    const folderName = parts.pop();

    const parent = parts.length
      ? traversePath(repo.files, parts)
      : repo.files;

    if (!parent) {
      return res.status(404).json({
        success: false,
        error: "Invalid path",
      });
    }

    const index = parent.findIndex(
      (item) => item.type === "folder" && item.name === folderName
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Folder not found",
      });
    }

    const folder = parent[index];

    // Collect all file paths recursively
    const filePaths = collectFilePaths(folder);

    // Delete all files from Supabase Storage
    if (filePaths.length > 0) {
      const { error } = await supabase.storage
        .from("repositories")
        .remove(filePaths);

      if (error) {
        console.error("Supabase folder delete error:", error);

        return res.status(500).json({
          success: false,
          error: "Failed to delete folder from storage",
        });
      }
    }

    // Remove folder from MongoDB
    parent.splice(index, 1);

    await repo.save();

    res.json({
      success: true,
      message: "Folder deleted successfully",
    });
  } catch (error) {
    console.error("Delete folder error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to delete folder",
    });
  }
};


module.exports = {
    createRepository,
    getAllRepositories,
    getRepositoryById,
    getRepositoryByName,
    fetchRepositoryForCurrentUser,
    updateRepositoryById,
    deleteRepositoryById,
    toggleVisibilityById,
    addFile,
    addFolder,
    uploadFileToS3,
    searchRepositories,

    browseRepository,
    getFileContent,
    deleteFile,
    deleteFolder
};