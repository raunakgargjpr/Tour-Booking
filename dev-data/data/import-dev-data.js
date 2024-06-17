const dotenv = require("dotenv");
dotenv.config({path: "./config.env"});
const mongoose = require("mongoose");
const Tour = require("./../../models/tourModel");
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');
const fs = require("fs");

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

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, "utf-8"));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));

const importData = async () => {
    try {
        await Tour.create(tours);
        await User.create(users, { validateBeforeSave: false });
        await Review.create(reviews);
        console.log("data loaded");
        process.exit();
    }
    catch(err) {
        console.log(err);
    }
}

const deleteData = async () => {
    console.log("in delete -----")
    try {
        await Tour.deleteMany();
        await User.deleteMany();
        await Review.deleteMany();
        console.log("data deleted");
        process.exit();
    }
    catch(err) {
        console.log(err);
    }
}

// from terminal
// write --> node dev-data/data/import-dev-data.js --import
if(process.argv[2] === "--delete") {
    deleteData();
}
else if(process.argv[2] === "--import") {
    importData();
}

console.log(process.argv)