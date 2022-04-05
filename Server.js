//Author: Abyel Romero

require('dotenv').config();
let express = require('express')
var bodyParser = require('body-parser');
var passport = require('passport');
var User = require('./Users');
var Instructor = require('./Instructors');
var authJwtController = require('./auth_jtw');
var jwt = require('jsonwebtoken');
var GCPBucket = require('./GCPBucket');
var cors = require("cors");
var mv = require('mv');
var fileUpload = require("express-fileupload");
var morgan = require("morgan");
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(passport.initialize());
app.use(morgan      ('dev'));
var router = express.Router();
const fs = require('fs');
var readline = require('linebyline');
const readlinee = require('readline');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);



// Enable files upload.
app.use(fileUpload({
    createParentPath: true
}));


router.post('/ses' ,function(req, res) {

    var mimemessage = require('mimemessage');
    var mailContent = mimemessage.factory({contentType: 'multipart/mixed',body: []});

    mailContent.header('From', req.body.from);
    mailContent.header('To', 'takenteachapp@gmail.com');
    mailContent.header('Subject', req.body.subject);

    var alternateEntity = mimemessage.factory({
        contentType: 'multipart/alternate',
        body: []
    });

    var htmlEntity = mimemessage.factory({
        contentType: 'text/html;charset=utf-8',
        body:  '   <html>  '  +
            '   <head></head>  '  +
            '   <body>  '  +
            '   <h1>Hello!</h1>  '  +
            '   <p>Please see the attached files for the instructors added files.</p>  '  +
            '   </body>  '  +
            '  </html>  '
    });
    var plainEntity = mimemessage.factory({
        body: req.body.message + 'Please see the attached file for the instructors added files.'
    });
    alternateEntity.body.push(htmlEntity);
    alternateEntity.body.push(plainEntity);

    mailContent.body.push(alternateEntity);

    var rawMessage = mailContent.toString();


        var selectedFile = req.body.listOfFiles;

            var fileToLoad = selectedFile;
            var fileReader = new FileReader();
            var base64;
            fileReader.onload = function(fileLoadedEvent) {
                base64 = fileLoadedEvent.target.result;
                console.log(base64);
            };
            fileReader.readAsDataURL(fileToLoad);



        var attachmentEntity = mimemessage.factory({
            contentType: 'application/pdf',
            contentTransferEncoding: 'base64',
            body: fileToLoad.replace(/([^\0]{76})/g, "$1\n")
        });
        attachmentEntity.header('Content-Disposition', 'attachment ;filename=listOfFileNames[i]');


    mailContent.body.push(attachmentEntity);
    //}

    client.sendRawEmail({
        from: 'takenteachapp@gmail.com'
        , rawMessage: rawMessage
    } , function (err, data, res) {
        // ...
        console.log(err);

    });
});


router.post('/user-sign-up', function(req, res) { //User sign up route.

    if (!req.body.firstName || !req.body.lastName || !req.body.email || !req.body.username || !req.body.password) {//Check that request contains first and last name, email, username, and password.
        res.json({success: false, message: 'Please pass first and last names, email, username, and password.'});
    }
    else {
        //Create a new user with passed parameters.
        var user = new User();
        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        user.username = req.body.username;
        user.email = req.body.email;
        user.password = req.body.password;
        user.purchasedCourses = [];

        // Save the user calling mongoose function save.
        user.save(function(err) {
            if (err) {
                // Duplicate entry.
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that email already exists. '});
                else
                    return res.send(err); //Send response with error message.
            }
            res.json({ success: true, message: 'User created!' });
        });
    }

});


router.post('/user-sign-in', function(req, res) {//User sign in route.

    //Create a user instance and set the email and password obtained from http request.
    var userInstance = new User();
    userInstance.email = req.body.email;
    userInstance.password = req.body.password;

    if (!userInstance.email || !userInstance.password){ //Check that email and password were passed from request.
        res.json({success:false, msg: "Please pass email and password."});
    }
    else{
        //Check that the user exists by checking if a user with the passed email exists.
        User.findOne({ email: userInstance.email }).select('email password').exec(function(err, user) { //Search for user using email.
            if (err) res.send(err);
            else if (user == null){
                res.json({success: false, message: 'User does not exist.'});
            }
            else{
                user.compareHash(userInstance.password, function(isMatch){//Compare the password of the user found with the password provided on the request.
                    if (isMatch) {
                        //Create a user token for our JWT token with the user id and username.
                        var userToken = {id: user._id, username: user.username};
                        var token = jwt.sign(userToken, process.env.SECRET_KEY); //Sign the JWT token with our secret key.


                        //Create a response and provide the JWT token and email in the response.
                        var userResponse =  {
                            access_token: String,
                            email: String
                        }
                        userResponse.access_token = token;
                        userResponse.email = user.email;

                        res.json({success: true, user: userResponse});
                    }
                    else {
                        res.json({success: false, message: 'Authentication failed.'});
                    }
                });
            }



        });

    }
});



router.post('/instructor-sign-up', function(req, res) { //Instructor sign up route.

    if (!req.body.firstName || !req.body.lastName || !req.body.email || !req.body.username || !req.body.password) {//Check that request contains first and last name, email, username, and password.
        res.json({success: false, message: 'Please pass first and last names, email, username, and password.'});
    }
    else {
        //Create a new instructor with passed parameters.
        var teacher = new Instructor();
        teacher.firstName = req.body.firstName;
        teacher.lastName = req.body.lastName;
        teacher.username = req.body.username;
        teacher.email = req.body.email;
        teacher.password = req.body.password;
        teacher.about = req.body.about;
        teacher.teachsubject = req.body.teachsubject;
        teacher.howlongteach = req.body.howlongteach;
        teacher.credentials = req.body.credentials;

        // Save the instructor using mongoose save function.
        teacher.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'An instructor with that email already exists. '});
                else
                    return res.send(err); //Send response with error.
            }
            res.json({ success: true, message: 'Instructor created!' });
        });
    }

});

router.post('/instructor-sign-in', function(req, res) {//Instructor sign in route.

    //Create an instructor instance and set the email and password obtained from http request.
    var instructor = new Instructor();
    instructor.email = req.body.email;
    instructor.password = req.body.password;

    if (!instructor.email || !instructor.password){ //Check that email and password were passed from request.
        res.json({success:false, msg: "Please pass email and password."});
    }
    else{
        //Check that the instructor exists by checking if an instructor with the email provided exists.

        Instructor.findOne({ email: instructor.email }).select('email password').exec(function(err, ins) { //Search for instructor using email.
            if (err) res.send(err);
            else if (ins == null){
                res.json({success: false, message: 'User does not exist.'});

            }
            else{
                ins.compareHash(instructor.password, function(isMatch){//Compare the password of the instructor found with what was provided on the request.
                    if (isMatch) {

                        //Create a response and provide the JWT token and email in the response.

                        var userToken = {id: ins._id, username: ins.username};
                        var token = jwt.sign(userToken, process.env.SECRET_KEY);

                        var userResponse =  {
                            access_token: String,
                            email: String
                        }
                        userResponse.access_token = token;
                        userResponse.email = ins.email;

                        res.json({success: true, user: userResponse});
                    }
                    else {
                        res.json({success: false, message: 'Authentication failed.'});
                    }
                });
            }

        });

    }


});

router.put('/purchaseCourse', function(req, res) {//Route to purchase a course.

    if(!req.query.course || !req.query.email){//Check that the course name and email are passed.
        res.json({success:false, msg: "Please provide course name and user email."});

    }
    else{

        User.findOne({ email: req.query.email }).exec(function(err, user) { //Search for user using email.
            if (err) res.send(err);
            else if (user == null) {
                res.status(401).send({success: false, message: 'User does not exist.'});

            } else {
                let tmp = user.purchasedCourses;
                tmp.push(req.query.course);

                //Create a new user with new purchased courses list.
                const updatedUser = {
                    purchasedCourses: tmp
                };

                // update the user.
                User.update({ email: req.query.email }, updatedUser, function (err) {
                    if (err) {
                        // duplicate entry
                        if (err.code == 11000)
                            return res.json({success: false, message: 'A user with that email already exists. '});
                        else
                            return res.send(err); //Send response with error.
                    }
                    res.json({success: true, message: 'Added purchased course!'});


                })

            }
        })
    }
});

router.get('/getPurchasedCourses', function(req, res) {//Route to get list of purchased courses of a user.


    if (!req.query.email){ //Check that email was passed from request.
        res.json({success:false, msg: "Please pass email."});
    }
    else{
        //Create a user instance and set the email and password obtained from http request.
        var userInstance = new User();
        userInstance.email = req.query.email;


        //Search for user using email.
        User.findOne({ email: userInstance.email }).select('purchasedCourses').exec(function(err, user) {
            if (err) res.send(err);
            else if (user == null){
                res.status(401).send({success: false, message: 'User does not exist.'});

            }
            else{

                var courses =  {
                    coursesArray: []
                }
                courses.coursesArray = user.purchasedCourses;

                res.json({success: true, courses: courses});//send the purchased courses of the user under home.courses

            }
        });

    }


});

router.get('/user-homepage', function(req, res) { //Route to get the user homepage.

    try{

        function listGCP(callback) {
            setTimeout(function() {//Call the callback function with timeout (1 s in the future) to give the above code enough time to finish.
                callback();
            }, 1000);
        }

        function callbackGCP() {
            return GCPBucket.listFiles().then((res) =>{
                return res;
            }).then((files) => {



                var home =  {
                    courses: []
                }
                home.courses = files;

                res.json({success: true, home: home});//send the purchased courses of the user under home.courses

            })
        }
        listGCP(callbackGCP);


    }
    catch (err){
        res.status(500).send(err);
    }
});


router.put('/instructor-get-courses', function(req, res) { //Route to get the user homepage.

    if (!req.body.email){ //Check that email was passed from request.
        res.json({success:false, msg: "Please pass email."});
    }
    else{
        //Create a instructor instance and set the email and password obtained from http request.
        var instructorInstance = new Instructor();
        instructorInstance.email = req.body.email;


        //Search for instructor using email.
        Instructor.findOne({ email: instructorInstance.email }).select('courses').exec(function(err, instructor) {
            if (err) res.send(err);
            else if (instructor == null){
                res.status(401).send({success: false, message: 'Instructor does not exist.'});
            }
            else{
                var courses =  {
                    coursesArray: []
                }
                courses.coursesArray = instructor.courses;

                res.json({success: true, courses: courses});//send the purchased courses of the user under home.courses

            }
        });

    }

});

router.put('/instructor-add-course', function(req, res) {//Route to purchase a course.

    if(!req.body.courseName || !req.body.email){//Check that the course name and email are passed.
        res.json({success:false, msg: "Please provide course name and user email."});
    }
    else{

        Instructor.findOne({ email: req.body.email }).exec(function(err, instructor) { //Search for instructor using email.
            if (err) res.send(err);
            else if (instructor == null) {
                res.status(401).send({success: false, message: 'Instructor does not exist.'});

            } else {
                let courseName = req.body.courseName;
                //these lines check if a course exists on the courses txt file and appends the course otherwise.
                var tmpCouse = courseName + '\n';
                rl = readline('./courses.txt');
                rl.on('line', function(line, lineCount, byteCount) {
                    if(line == courseName){
                        tmpCouse = "";
                    }
                })
                    .on('error', function(e) {
                        // something went wrong
                    })

                    .on('end', function(e) {
                        // something went wrong

                        fs.appendFile('courses.txt', tmpCouse, function(err) {
                            if(err) {
                                return console.log(err);
                            }
                        });
                    });



                let tmp = instructor.courses;
                tmp.push(req.body.courseName);

                //Create a new instructor with new purchased courses list.
                const updatedInstructor = {
                    courses: tmp
                };

                // Update the instructor.
                Instructor.update({ email: req.body.email }, updatedInstructor, function (err) {
                    if (err) {
                        // duplicate entry
                        if (err.code == 11000)
                            return res.json({success: false, message: 'A instructor with that email already exists. '});
                        else
                            return res.send(err); //Send response with error.
                    }

                    var courses =  {
                        coursesArray: []
                    }
                    courses.coursesArray = instructor.courses;

                    res.json({success: true,message: 'Added course!', courses: courses});//send the purchased courses of the user under home.courses


                })

            }
        })
    }
});
router.put('/getAllCourses', function(req, res) {//Route to search for course by substring.

    //For the response.
    var searchResArr = [];
    var searchRes = {
        results: []
    }


    //Read the courses.txt and tags.txt files to check if the string exists.
    rl = readline('./courses.txt');
    rl.on('line', function(line, lineCount, byteCount) {
            searchResArr.push(line);

    })
        .on('error', function(e) {
            // something went wrong
        })

        .on('end', function(e) {
            //Append results array to response.
            searchRes.results = searchResArr;
            res.json({success: true, searchRes: searchRes});
        });


});
router.put('/search', function(req, res) {//Route to search for course by substring.

        if (!req.query.searchString) {//Check that the request contains the search string.
            res.send({status: false, message: "No search string provided."})
        } else {
            //For the response.
            var searchResArr = [];
            var searchRes = {
                results: []
            }

                //Read the courses.txt and tags.txt files to check if the string exists.
                rl = readline('./courses.txt');
                rl.on('line', function(line, lineCount, byteCount) {
                    if (line.toLowerCase().includes(req.query.searchString.toLowerCase())) {
                        searchResArr.push(line);
                    }
                })
                    .on('error', function(e) {
                        // something went wrong
                    })

                    .on('end', function(e) {
                        //Append results array to response.
                        searchRes.results = searchResArr;
                        res.json({success: true, searchRes: searchRes});
                    });


        }

});

router.put('/deleteCourse', function(req, res) {//Route to search for course by substring.

    if (!req.body.courseName, !req.body.email) {
        res.send({status: false, message: "No course name provided"})
    } else {

        Instructor.findOne({ email: req.body.email }).exec(function(err, instructor) { //Search for instructor using email.
            if (err) res.send(err);
            else if (instructor == null) {
                res.status(401).send({success: false, message: 'User does not exist.'});
            } else {
                //This line removes the course from the instructor's courses array.
                var updatedCourses = instructor.courses.filter(function(e) { return e !== req.body.courseName })
                instructor.courses = updatedCourses;
                let updatedInstructor = instructor;

                // Update the instructor.
                Instructor.update({ email: req.body.email }, updatedInstructor, function (err) {
                    if (err) {
                        return res.send(err); //Send response with error.
                    }
                    res.json({success: true, message: 'Removed ' + req.body.courseName});

                })

                //Need  to delete the course  from  GCP  as  well !

            }
        })
    }
});

router.put('/updateCourseName', function(req, res) {

    if (!req.body.courseName, !req.body.email, !req.body.updatedCourseName) {
        res.send({status: false, message: "No course name provided"})
    } else {

        Instructor.findOne({ email: req.body.email }).exec(function(err, instructor) { //Search for instructor using email.
            if (err) res.send(err);
            else if (instructor == null) {
                res.status(401).send({success: false, message: 'User does not exist.'});
            } else {
                //This line removes the course from the instructor's courses array.
                var updatedCourses = instructor.courses.filter(function(e) { return e !== req.body.courseName })
                updatedCourses.push(req.body.updatedCourseName);
                instructor.courses = updatedCourses;
                let updatedInstructor = instructor;

                // Update the instructor.
                Instructor.update({ email: req.body.email }, updatedInstructor, function (err) {
                    if (err) {
                        return res.send(err); //Send response with error.
                    }
                    else {//Update Course  on GCP

                        GCPBucket.renameCourse(req.body.courseName, req.body.updatedCourseName).then(function(){
                            res.json({success: true, message: 'Updated ' + req.body.courseName  +
                                    ' to ' + req.body.updatedCourseName});
                        });
                    }
                })
            }
        })
    }


});

router.put('/removeVideoFromCourse', function(req, res) {//Route to search for course by substring.

    if (!req.body.email, !req.body.video) {
        res.send({status: false, message: "No course name provided"})
    } else {

        GCPBucket.deleteVideo(req.body.video.courseName, req.body.video.videoName).then(function(){
            res.json({success: true, message: 'Deleted ' + req.body.video.videoName});
        });
    }

});

router.put('/updateVideo', function(req, res) {

    if (!req.body.email, !req.body.form, !req.body.oldVideo) {
        res.send({status: false, message: "No course name provided"})
    } else {

        //First, delete the video .txt file and rename the .mov file to the new name.
        GCPBucket.updateVideo(req.body.oldVideo.courseName, req.body.oldVideo.videoName, req.body.form.videoName);

        //Now, create an updated txt file and upload it.
        req.body.form['courseName'] = req.body.oldVideo.courseName;//Append course name to new txt file with info.
        var data = JSON.stringify(req.body.form);

        //Create txt file with video info.
        var txtFilePath = "./" + req.body.form.videoName + "-info" + ".txt";
        fs.writeFile(txtFilePath, data , function(err) {
            if(err) {
                return console.log(err);
            }
            console.log(txtFilePath + " file was added!");
        });

        //Upload new txt file to GCP.
        var gcpPath = 'Instructor/' + req.body.oldVideo.courseName + '/' + req.body.form.videoName + '.txt';
        GCPBucket.uploadFile(txtFilePath, gcpPath).then(console.log('Uploaded!'));


        res.send({status: true, message: "Video is renamed."})//Respond to client that the video is renamed.

    }
});

router.put('/getCourseData', function(req, res) {//Route to search for course by substring.

    if (!req.body.courseName) {
        res.send({status: false, message: "No course name provided"})
    } else {

        function getFiles() {
            let files = GCPBucket.getTxtFiles(req.body.courseName);
            return files;
        }

        getFiles().then(function (files) {

            for (let i = 0; i < files.length; i++) {//Download txt files from course;
                GCPBucket.downloadFile("Instructor/" + req.body.courseName + '/' + files[i], './' + files[i]);
            }

            setTimeout(function() {//Timeout to be sure files are downloaded before processing.

                    var resArr = [];
                    for (let i = 0; i < files.length; i++) {//Read json string in each file downloaded.
                        rl = readline('./' + files[i]);
                        rl.on('line', function (line, lineCount, byteCount) {
                            resArr.push(line);
                        })
                    }

                setTimeout(function() {//Timeout so I/O has enough time to read the files.

                    //For the response.
                    var searchRes = {
                        results: []
                    }
                    searchRes.results = resArr;

                    res.send({status: true, searchRes: searchRes})
                }, 250);

            }, 250);
        })
    }
});


router.post('/downloadTagsCoursesFiles', function(req, res) {//Receives a video from a client and uploads it to the GCP bucket in it's specific course.

    res.send({status: true, message: "Video is uploaded."})//Respond to client that the video is uploaded.

});

router.post('/instructor-upload-video', function(req, res) {//Receives a video from a client and uploads it to the GCP bucket in it's specific course.

    try {
        if (!req.files) {//Check that the request contains a video.
            res.send({status: false, message: "No file provided."})
        } else {
            function uploadToGCP(subject, callback) {
                console.log(`Uploading ${subject}.`)

                let uploadedVideo = req.files.video;//The video is in request.files
                let courseName = req.body.courseName;
                let videoName = req.body.videoName;
                let price = req.body.price;
                let tag = req.body.tag;
                let summary = req.body.summary;

                var videoObj = {videoName: videoName, courseName: courseName, price: price, tag: tag, summary: summary};
                var data = JSON.stringify(videoObj);

                //Create txt file with video info.
                var txtFilePath = "./" + videoName + "-info" + ".txt";
                fs.writeFile(txtFilePath, data , function(err) {
                    if(err) {
                        return console.log(err);
                    }
                    console.log(txtFilePath + " file was added!");
                });

                uploadedVideo.name = videoName + ".MOV";
                var filepath = './tmp/' + uploadedVideo.name;//Save to temp because videos will be removed from API.
                uploadedVideo.mv(filepath);//Move video to temp folder.
                var gcpPath = 'Instructor/' + courseName + '/';
                setTimeout(function() {//Call the callback function with timeout (1 s in the future) to give the above code enough time to finish.
                    var gcpVideo = gcpPath + uploadedVideo.name;//Give the gcp path with the video name appended.
                    callback(filepath, gcpVideo);//Upload video.
                    var gcpTxt = gcpPath + videoName + "-info" + ".txt";//Give the gcp path with the file name appended.
                    callback(txtFilePath, gcpTxt);//Upload file.

                }, 1000);

            }

            function callbackGCP(path, gcpPath) {
                GCPBucket.uploadFile(path, gcpPath).then(console.log('Uploaded!'));
            }
            uploadToGCP('Video', callbackGCP)

            res.send({status: true, message: "Video is uploaded."})//Respond to client that the video is uploaded.
        }
    }
    catch(err){
        res.status(500).send(err);
    }
});


router.use('/*', function (req, res) {
    //No base URL requests allowed.
    res.status(401).send({message:"No base URL requests allowed", headers: req.headers, query: req.query});
});

app.use('/', router);
app.listen(process.env.PORT || 8080);
