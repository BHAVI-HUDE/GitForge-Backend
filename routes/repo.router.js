const express = require("express");
const repoRouter = express.Router();
const repoController = require("../controllers/repoController");
const upload = require("../middleware/upload");

// Creating Repository
repoRouter.post("/create", repoController.createRepository);

// Fetching all Repositories
repoRouter.get("/all", repoController.getAllRepositories);

// Fetch repository By Id
repoRouter.get("/:id", repoController.getRepositoryById);

// Fetch repository By Repo Name
repoRouter.get("/name/:name", repoController.getRepositoryByName);

// Fetch repository for current user
repoRouter.get("/user/:userID", repoController.fetchRepositoryForCurrentUser);

// Add file to the repository
repoRouter.post("/:id/file", repoController.addFile);

// Add folder to repository (root level)
repoRouter.post("/:id/folder", repoController.addFolder);

// Update Repository
repoRouter.put("/update/:id", repoController.updateRepositoryById);

// Delete Repository
repoRouter.delete("/delete/:id", repoController.deleteRepositoryById);

// Toggle Repository visibility (public <==> private)
repoRouter.patch("/toggle/:id", repoController.toggleVisibilityById);

// Search repositories by name
repoRouter.get("/search/:query", repoController.searchRepositories);

// Upload single file to repository (S3-backed)
repoRouter.post(
  "/:id/upload/file",
  upload.single("file"),
  repoController.uploadFileToS3
);



// Browse files and folders by path
repoRouter.get(
  "/:id/browse",
  repoController.browseRepository
);

// View single file content
repoRouter.get(
  "/:id/file/view",
  repoController.getFileContent
);

repoRouter.put("/:id/file", repoController.updateFileContent);

// Delete file
repoRouter.delete(
  "/:id/file/delete",
  repoController.deleteFile
);
repoRouter.delete(
  "/:id/folder/delete",
  repoController.deleteFolder
);


module.exports = repoRouter;
