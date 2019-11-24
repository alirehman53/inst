var admin = require("firebase-admin");
var serviceAccount = require("../website-ngo98-firebase-adminsdk-vxw7y-0b58171e63.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://institute-3654a.firebaseio.com",
    storageBucket: "institute-3654a.appspot.com",
    projectId: 'institute-3654a'
});

const db = admin.firestore();

var bucket = admin.storage().bucket();

module.exports = {
    db: db,
    bucket: bucket
}
