//Author: Abyel Romero


const {Storage} = require('@google-cloud/storage');
const path = require('path');
const cwd = path.join(__dirname, '');


bucketName = 'tnt_buuket', srcFilename = 'sample.mp4', destFilename = path.join(cwd, 'sample.mp4')


const gc = new Storage({ //Authenticate credentials of Google Cloud.
    keyFilename: path.join(__dirname, '/take-and-teach-ada49949c030.json'),//Key file cannot be stored on git. Sensitive file.
    projectId: 'take-and-teach'

});

const tntBucket = gc.bucket(bucketName);

module.exports = {

    async  downloadFile(filename, destination) {
        const options = {
            // The path to which the file should be downloaded, e.g. "./file.txt"
            destination: destination,
        };

        // Downloads the file
        await tntBucket.file(filename).download(options);

        console.log(
            `gs://${bucketName}/${filename} downloaded to ${destination}`
        );
    },

    async  uploadFile(filename, gcpPath) {

        // Uploads a local file to the bucket
        await tntBucket.upload(filename , {
            // Support for HTTP requests made with `Accept-Encoding: gzip`
            destination: gcpPath,
            // By setting the option `destination`, you can change the name of the
            // object you are uploading to a bucket.
            metadata: {
                // Enable long-lived HTTP caching headers
                // Use only if the contents of the file will never change
                // (If the contents will change, use cacheControl: 'no-cache')
                cacheControl: 'public, max-age=31536000',
            },
        });

        console.log(`${filename} uploaded to ${bucketName}.`);
    },

    async listFiles() {

        let filesArr = [];

        const [files] = await gc.bucket(bucketName).getFiles();
        console.log('Files:');
        files.forEach(file => {

            let directory = file.name.split('/');//Split to directories.
            if(directory[0] == "Instructor"){
                let s = file.name.replace('Instructor/', "");//Remove substring instructor from string
                if(s != ""){
                    let substrings = s.split('/');//split course name and file name
                    filesArr.push(substrings[0]);
                }
            }

        });

        function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
        }

        let unique = filesArr.filter(onlyUnique);


        return unique;
    },

    async getcourses() {


        const options = {
            prefix: 'Instructor',
        };
        // if (delimiter) {
        //     options.delimiter = delimiter;
        // }

        const [files] = await gc.bucket(bucketName).getFiles(options);//get array of files under instructor folder of gdv.
        let parsedFiles =[];
        files.forEach(file => {
            let s = file.name.replace('Instructor/', "");//Remove substring instructor from string.
            if(s != ""){
                let substrings = s.split('/');//split course name and file name.
                parsedFiles.push(substrings[0]);
                parsedFiles.push(substrings[1]);
            }
        });

        return parsedFiles;


    },


    async getTxtFiles(courseName) {


        const options = {
            prefix: 'Instructor/' + courseName,
        };
        // if (delimiter) {
        //     options.delimiter = delimiter;
        // }

        const [files] = await gc.bucket(bucketName).getFiles(options);//get array of files under instructor folder of gdv.
        let parsedFiles =[];
        files.forEach(file => {
            let s = file.name.replace('Instructor/', "");//Remove substring instructor from string.
            if(s != ""){
                let substrings = s.split('/');//split course name and file name.
                if(substrings[1].includes('.txt')){//Add only txt files to array.
                    parsedFiles.push(substrings[1]);
                }
            }
        });

        return parsedFiles;


    },

    async renameCourse(oldCourse, newCourse) {

        let oldPath = 'Instructor/' + oldCourse;
        let newPath = 'Instructor/' + newCourse;

        const options = {
            prefix: oldPath
        };

        const [files] = await gc.bucket(bucketName).getFiles(options);//get array of files under instructor folder of gcp.

        files.forEach(file => {
            let filename = file.name.replace(oldPath + '/', "");//Remove substring instructor from string.

            gc.bucket(bucketName).file(file.name).rename(newPath + '/' + filename);

        });


        console.log(
            `gs://${bucketName}/${srcFilename} moved to gs://${bucketName}/${destFilename}.`
        );
    },

    async deleteVideo(courseName, videoName) {

        const options = {
            prefix: 'Instructor/' + courseName,
        };

        const [files] = await gc.bucket(bucketName).getFiles(options);//get array of files under instructor folder of gcp.

        files.forEach(file => {
            if(file.name.includes(videoName)){//Remove txt and video file
                gc.bucket(bucketName).file(file.name).delete();
            }


        });

    },

    async updateVideo(courseName, videoName, updatedVideoName){

        const options = {
            prefix: 'Instructor/' + courseName,
        };

        const [files] = await gc.bucket(bucketName).getFiles(options);//get array of files under instructor folder of gcp.

        files.forEach(file => {

            if(file.name.includes(videoName)) {

                if(file.name.includes(videoName + '-info.txt')){
                    gc.bucket(bucketName).file(file.name).delete();
                }
                else{
                    gc.bucket(bucketName).file(file.name).rename(options.prefix + '/' + updatedVideoName + '.MOV');
                }

            }




        });
    }

}
