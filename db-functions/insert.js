var exports = module.exports = {},
    constants = require('../utils/constant'),
    userModel = require ('../models/user');

const user = require('../models/user.js')
var validator = require('validator');
let admin = require('firebase-admin');
const fs = require('fs')
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);


'use strict';
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: "testingtehreer@gmail.com",
      pass: "tehreer.co"
    }
})
  
let poolConfig = "smtps://testingtehreer@gmail.com:tehreer.co/?pool=true";

async function main(email, iv,  link) {
    let testAccount = await nodemailer.createTestAccount();

    let info = await transporter.sendMail({
        from: "testingtehreer@gmail.com", // sender address
        to: email, // list of receivers
        subject: 'Invitation ✔', // Subject line
        text: 'You are invited to join an Institute.', // plain text body
        html: 'http://localhost:3000/open_invite?iv=' + iv + '&id=' + link // html body
    });

    console.log('Message sent: %s', info.messageId);

    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}

async function confirm(email, pwd, invite_id) {
    let testAccount = await nodemailer.createTestAccount();

    let info = await transporter.sendMail({
        from: "testingtehreer@gmail.com", // sender address
        to: email, // list of receivers
        subject: 'Registration ✔', // Subject line
        text: 'You are registered to Institute.', // plain text body
        html: 'Email= ' + email + ' ; Password= ' + pwd + ' ; Invite ID= ' + invite_id // html body
    });

    console.log('Message sent: %s', info.messageId);

    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}

function encrypt(text) {
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt_data(text) {
    let iv = Buffer.from(text.iv, 'hex');
    let encryptedText = Buffer.from(text.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const invite = (email, institute_id) => {
    var today = new Date();
    var time = today.getTime()
    var concatinated = institute_id + time
    encrypted = encrypt(concatinated)
    var link = 'http://localhost:3000/open_invite?iv=' + encrypted.iv + '&id=' + encrypted.encryptedData

    try{
        user.db.collection('invites').add({
            email,
            institute_id,
            invite_id: concatinated,
            status: 'invited',
            link
        }).then((doc) => {
            user.db.collection('invites').doc(doc.id).set({id: doc.id}, {merge: true});

            user.db.collection('institute_students').add({
                invite_id: concatinated,
            })

            main(email, encrypted.iv, encrypted.encryptedData).catch(console.error);
        })
    } catch (e) {
            console.log(e);
            throw new Error(e)
    }
}

const open_invite = (iv, encryptedData) => {
    return new Promise((resolve, reject) => {
        let ret = []
        var obj = { iv, encryptedData }
        let data = ''
        var decrypt = decrypt_data(obj)
        try{
            user.db.collection('invites').where('invite_id', '==', decrypt).get().then(snapshot => {
                ret.push(snapshot.docs[0].data().email)
            }) 
            .then(() => resolve(ret))
            .catch((e)=>console.log(e))
        } catch (e) {
            console.log(e);
            throw new Error(e)
        }
})
}

// user.db.collection('users').add({ email: 'sdfdsf', pwd:'dsfdsf', invite_id:'sdfdsfsd'}).then((doc) => {
//     user.db.collection('institute_students').where('invite_id', '==', 'y24jlEkYbIcileYRX4BF1568663322625').get().then(res => {
//         console.log(res.docs[0].data())
//         let data = res.docs[0].data()
//         data.user_id = doc.id
//         user.db.collection('institute_students').doc(data.id).set(data)
//     })
// })


const save_invite = (email, pwd, iv, encryptedData) => {
    return new Promise((resolve, reject) => {
        let ret = ''
        var obj = { iv, encryptedData }
        let invite_id = ''
        var decrypt = decrypt_data(obj)
        try{
            user.db.collection('invites').where('invite_id', '==', decrypt).get().then(snapshot => {
                ret = snapshot.docs[0].data().email
                invite_id = snapshot.docs[0].data().invite_id
            }) 
            .then(() => {
                if(ret == email){
                    confirm(email, pwd, invite_id).catch(console.error);

                    user.db.collection('users').add({ email, pwd, invite_id}).then((doc) => {
                        user.db.collection('institute_students').where('invite_id', '==', decrypt).get().then((res) => {
                            let data = res.docs[0].data()
                            data.user_id = doc.id
                            user.db.collection('institute_students').doc(data.id).set(data)
                        })
                    })
        
                    user.db.collection('invites').where('invite_id', '==', decrypt).get().then(res => {
                        let data = res.docs[0].data()
                        data.status = 'accepted'
                        user.db.collection('invites').doc(data.id).set(data)
                })         

                    resolve('User added in Institution')
                }else{
                    resolve('Provided email address does not match!')
                }
            })
            .catch((e)=>console.log(e))
        } catch (e) {
            console.log(e);
            throw new Error(e)
        }
    })
}

const addAnnouncement = (due_date, grade_id=[], section_id=[], subject_id ,teacher_id , title, description, attachment, suggestion=[], subject, section=[], grade=[]) => {
    return new Promise((resolve, reject) => {
        let ret = []
        var student_id = []
        user.db.collection('subjects').doc(subject_id).get().then(snapshot => {
            student_id = snapshot.data().student_id
        })
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        currentTime = mm + '/' + dd + '/' + yyyy;
        const date = new Date(currentTime);
        var time = date.getTime()

        try{
            user.db.collection('announcements').add({
                due_date,
                grade_id,
                section_id,
                subject_id,
                student_id,
                type: 'notices', 
                teacher_id,
                title, 
                description,
                time, 
                attachment, 
                suggestion, 
                subject, 
                section, 
                grade
            })
            .then((doc)=>{
                if(attachment){
                    user.bucket.upload(attachment, {
                        gzip: true,
                        // destination: 'Bilal/' + file,
                        metadata: {
                          cacheControl: 'public, max-age=31536000',
                        }
                      }, function(err, file, apiResponse) {
                          user.db.collection('announcements').doc(doc.id).set({attachment: apiResponse.mediaLink}, {merge: true});
                      });
                    }
                    ret.push(time, doc.id, student_id)
                    user.db.collection('announcements').doc(doc.id).set({id: doc.id}, {merge: true})
                    .then(() => resolve(ret))
                    .catch((e)=>console.log(e))
            })
            .catch((e) => console.log(e))
        } catch (e) {
            console.log(e);
            throw new Error(e)
        }
    })
}

const addResource = (title,description, grade, subject ,teacher_id, author , file='', video_url='', tags='') => {
    return new Promise((resolve, reject) => {
        let ret = []
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        currentTime = mm + '/' + dd + '/' + yyyy;
        const date = new Date(currentTime);
        var time = date.getTime()

        let is_archive = false
        try{
            user.db.collection('resources').add({
                description,
                grade,
                teacher_id,
                subject,
                title,
                author,
                file,
                time,
                video_url,
                is_archive,
                tags
            })
            .then((doc)=>{
                if(video_url == ''){
                    fs.readFile(file, function (err, data) {
                        const filename = file.split('\\').pop().split('/').pop()
                        const store = './Temp/' + doc.id + filename;
                        fs.writeFile(store, data,async function (err) {
                            if (err) throw err;
                            await user.bucket.upload(store, {
                                gzip: true,
                                // destination: 'Bilal/' + file,
                                metadata: {
                                  cacheControl: 'public, max-age=31536000',
                                }
                              }, function(err, file, apiResponse) {
                                  user.db.collection('resources').doc(doc.id).set({file: apiResponse.mediaLink}, {merge: true});
                                  fs.unlink(store, function (err) {
                                    if (err) throw err;
                                  }); 
                                });                        
                        }); 
                    })
                }
                user.db.collection('resources').doc(doc.id).set({id: doc.id}, {merge: true});
                ret.push(time, is_archive, doc.id)
                let ResourceID = doc.id
                user.db.collection('users').doc(teacher_id).get()
                .then((res)=>{
                    let userData = res.data()
                    userData.resources ? userData.resources = [...userData.resources, ResourceID] : userData.resources =[ResourceID]
                    user.db.collection('users').doc(teacher_id).set(userData)
                    .then(() => resolve(ret))
                    .catch((e)=>console.log(e))
                })
                .catch((e) => console.log(e))
            })
            .catch((e) => console.log(e))
        } catch (e) {
            console.log(e);
            throw new Error(e)
        }
    })
}
    
const addtag = (subject, grade) => {
    try{
        if(!subject == ''){
            user.db.collection('tags').doc('resources').update({
                subject: admin.firestore.FieldValue.arrayUnion(subject)
            })
        }
        if(!grade == ''){
            user.db.collection('tags').doc('resources').update({
                grade: admin.firestore.FieldValue.arrayUnion(grade)
            }) 
        }
    } catch (e) {
        console.log(e);
        throw new Error(e)
    }
}

const signupParent = (name, nic, address, phone, email, date, month, year, pwd, student_id=[]) => {
    try{
        user.db.collection('parents').doc(nic).set({
            name,
            nic,
            address,
            phone, 
            date,
            month,
            year,
            email,
            pwd,
            student_id
        })
    } catch (e) {
        console.log(e);
        throw new Error(e)
    }
}

const inst_signupParent = (inst_id, inst_name, type, name, nic, address, phone, email, date, month, year, id) => {
    try{
        user.db.collection('institute_parents').doc(id).set({
            institute_id: inst_id,
            institute_name: inst_name,
            type: 'parent',
            is_archive: false,
            name,
            nic,
            address,
            phone, 
            date,
            month,
            year,
            email,
            id
        }).then((doc) => {
            user.db.collection('institute_parents').doc(doc.id).set({id: doc.id}, {merge: true});
        })
    } catch (e) {
        console.log(e);
        throw new Error(e)
    }
}

const signupTeacher = (name, nic, address, phone, email, date, month, year, pwd, qualification, resources=[]) => {
    try{
        user.db.collection('teachers').doc(nic).set({
            name,
            nic,
            address,
            phone,
            email,
            date,
            month,
            year,
            pwd,
            qualification,
            resources
        })
    } catch (e) {
        console.log(e);
        throw new Error(e)
    }
}

const inst_signupTeacher = (date_of_joining, inst_id, inst_name, type, name, nic, address, phone, email, date, month, year, id, qualification, resources=[]) => {
    try{
        user.db.collection('institute_teachers').doc(id).set({
            date_of_joining,
            institute_id: inst_id,
            institute_name: inst_name,
            type: 'teacher',
            is_archive: false,
            name,
            nic,
            address,
            phone,
            email,
            date,
            month,
            year,
            id,
            qualification,
            resources
        }).then((doc) => {
            user.db.collection('institute_teachers').doc(doc.id).set({id: doc.id}, {merge: true});
        })
    } catch (e) {
        console.log(e);
        throw new Error(e)
    }
}

const signupStudent = (name, guardian_name, guardian_phone, student_phone, address, guardian_email, guardian_nic, date, month, year, student_email, pwd) => {
    try{
        user.db.collection('students').doc(nic).set({
            name,
            guardian_name,
            guardian_phone,
            student_phone,
            address,
            guardian_email,
            guardian_nic,
            date,
            month,
            year,
            student_email,
            pwd
        })
    } catch (e) {
        console.log(e);
        throw new Error(e)
    }
}
const inst_signupStudent = (student_nic, date_of_joining, inst_id, inst_name, type, name, guardian_name, guardian_phone, student_phone, address, guardian_email, guardian_nic, date, month, year, student_email, id) => {
    try{
        user.db.collection('institute_students').doc(id).set({
            date_of_joining,
            institute_id: inst_id,
            institute_name: inst_name,
            type: 'student',
            name,
            guardian_name,
            guardian_phone,
            student_phone,
            address,
            guardian_email,
            student_nic,
            guardian_nic,
            date,
            month,
            year,
            student_email,
            id
        }).then((doc) => {
            user.db.collection('institute_students').doc(doc.id).set({id: doc.id}, {merge: true});
        })
    } catch (e) {
        console.log(e);
        throw new Error(e)
    }
}

module.exports = {
    addResource: addResource,
    addtag: addtag,
    signupParent: signupParent,
    signupTeacher: signupTeacher,
    signupStudent: signupStudent,
    inst_signupParent: inst_signupParent,
    inst_signupTeacher: inst_signupTeacher,
    inst_signupStudent: inst_signupStudent,
    addAnnouncement: addAnnouncement,
    invite: invite,
    open_invite: open_invite,
    save_invite: save_invite
}