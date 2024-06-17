const dotenv = require("dotenv");
dotenv.config({path: "./config.env"});
const mongoose = require("mongoose");

// it should be on the top because at below it will not caught exceptions above it
process.on('uncaughtException', (err) => {
    // handle exceptions like logging value of undefined variable x
    console.log(err.name, err.message);
    console.log("SHUTTING DOWN!!!");
    process.exit(1);
})

const app = require("./app");

const db = process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);

mongoose.connect(db, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
})
.then(con => {
    //console.log(con.connections);
    console.log("DB connection successful");
});

const port = 3000 || process.env.PORT;

const server = app.listen(port, () => {
    console.log(`App is running on port: ${port}`);
});

// handle all unhandled promise Rejections like if DB is not connecting or DB password is wrong
process.on('unhandledRejection', (err) => {
    // allow us to handle all errors that occur in asynchronous code which were not previously handled
    console.log(err.name, err.message);
    console.log("SHUTTING DOWN!!!");
    server.close(() => {
        // so first close the server then close the process
        process.exit(1);
    });
});