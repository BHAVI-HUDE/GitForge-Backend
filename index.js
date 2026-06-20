const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
require('dotenv').config();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const {initRepo} = require('./controllers/init');
const {add} = require('./controllers/add');
const {commit} = require('./controllers/commit');
const {push} = require('./controllers/push');
const {pull} = require('./controllers/pull');
const {revert} = require('./controllers/revert');
const express = require('express');
const {Server} = require('socket.io');
const {router} = require("./routes/main.router");

yargs(hideBin(process.argv))
    .command("start", "Starts a new server", {}, startServer)
    .command('init', "Initialize a new repository",{},initRepo)
    .command('add <file>', "Add a file to the repository",(yargs)=>{yargs.positional("file", {
        describe: "File to add to the staging area",
        type: "string",
    });
    },
    (argv) =>{
        add(argv.file);
    })
    .command('commit <message>', 
        "Commit the staged files",
        (yargs) => {
            yargs.positional("message", {
                describe: "Commit message",
                type: "string",
            });
        }, 
        (argv) => {
            commit(argv.message)
        })
    .command('push', "Push commits to S3",{}, push)
    .command('pull', "Pull commits from s3",{}, pull)
    .command('revert <commitID>', 
            "Revert to previous commit",
            (yargs)=>{
                yargs.positional("commitID", {
                    describe: "Commit ID to revert to",
                    type: "string",
                });
            }, 
            (argv) => {
                revert(argv.commitID)
            })
    .demandCommand(1, 'You need at least one command')
    .help().argv;

    function startServer(){
        const app = express();
        const port = process.env.PORT || 3000;

        app.use(bodyParser.json());
        app.use(express.json());

        const mongoURI = process.env.MONGODB_URI;
        mongoose
        .connect(mongoURI)
        .then(()=> console.log("MongoDB connected!"))
        .catch((err) => console.error("Unable to connect: ", err));

        app.use(cors({origin:"*"}));

        app.get("/", (req, res) => {
            res.send("Welcome");
        });

        app.use(router);

        let user = "test";
        const httpServer = http.createServer(app);
        const io = new Server(httpServer, {
            // CORS stands for [Cross Origin Resourse Sharing]=> Origin can be (protocol, domain or port).
            cors: {
                origin:"*",
                methods: ["GET", "POST"],
            }
        });

        io.on("connection", (socket) => {
            socket.on("joinRoom", (userID) => {
                user = userID;
                console.log("=====");
                console.log(user);
                console.log("=====");
            })
        });

        const db = mongoose.connection;

        db.once("open", async () => {
            console.log("CRUD operations called");
            //CRUD operations
        });

        httpServer.listen(port, () => {
            console.log(`Server is running on PORT ${port}`);
        });

    }