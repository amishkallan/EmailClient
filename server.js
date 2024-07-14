// server.js
const express = require('express');
const passport = require('./passport');
const session = require('express-session');
const { syncEmails, FirstTimeSyncEmails } = require('./sync');
const path = require('path')
const axios = require('axios');
const app = express();
const DbClient = require('./db-actions')
const {fetchAllEmails} = require('./outlook_fetch')
const msprofileurl = process.env.OUTLOOK_PROFILE_URL

require('dotenv').config();

app.use(session({ secret: 'your_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// function to get the cookie
function getCookie(cookie, name) {
  const value = `; ${cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// login api for Oauth
app.get('/auth/outlook', passport.authenticate('outlook'),(req, res)=>{
  console.log("called the outlook auth")
  res.sendFile(path.join(__dirname, 'home_page.html'));
});

// callback api after Oauth logged in
app.get('/auth/outlook/callback',
  passport.authenticate('outlook', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      console.log("came to auth outlook callback..") 
      // res.redirect('/');

      // console.log("profileurl : ", msprofileurl)
      // console.log(" req : ", req.token)
      const accessToken = req.token

      const userProfileResponse = await axios.get(msprofileurl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }); 
      // console.log("userProfileResponse : ", userProfileResponse)
      const userEmail = userProfileResponse.data.mail
      const userESdata = {
                          email : userProfileResponse.data.mail,
                          id : userProfileResponse.data.id,
                          name : userProfileResponse.data.displayName,
                          accessToken : accessToken,
                          deltaLogToken : ""
                          }

      // add user to es db if not already existing
      const isUserExist = await DbClient.getUser(userESdata.email)
      if ( isUserExist==0){

        // fetch outlook url to know current state to outlook emails
        resultObj = await fetchAllEmails(accessToken)
        const allEmails = resultObj["emails"]
        userESdata.deltaLink = resultObj["deltaLink"]

        // add user to es db
        await DbClient.addUser(userESdata)
        
        if (allEmails!= false){
          console.log("going to add all emails to es db")
          // DbClient.addAllUserEmails(allEmails, userEmail)
          FirstTimeSyncEmails(req,res, userEmail, userESdata.deltaLink, accessToken)
        }
      }
      else{
        // save accesToken
        await DbClient.addUserAccessToken(userEmail, accessToken )
      }

      
      res.cookie('accessToken', encodeURIComponent(accessToken));
      res.cookie('userprofile',JSON.stringify(userESdata));
      res.cookie('userId',encodeURIComponent(userEmail));
      res.redirect('/');
      
    }catch(error){
      console.log("error : ", error)
      res.redirect('/');
    }
      
    });

  // api to sync outlook and app db(elasticsearch) 
  // This api fetched the changes that occured in outlook from last time it updated and make those changes in es db
  // app.get('/sync', async (req, res) => {
  //   console.log("some")
  //   const userProfileStr = getCookie(decodeURIComponent(req.headers.cookie),'userprofile')
  //   const token = getCookie(decodeURIComponent(req.headers.cookie),'token')
  //   const userProfile = JSON.parse(userProfileStr)
  //   // console.log("token : ", token)
  //   const emailId = userProfile.mail
  //   if (!emailId) return res.status(401).send('Unauthorized');
  //   await FirstTimeSyncEmails(emailId);
  //   res.send('Synchronization complete');
  // });

  // api to realtime sync emails and fetch all the emails of logged in user
  app.get('/emails', async (req, res) => {
    try{   
        const userProfileStr = getCookie(decodeURIComponent(req.headers.cookie),'userprofile')
        const token = getCookie(decodeURIComponent(req.headers.cookie),'token')
        const userProfile = JSON.parse(userProfileStr)
        console.log("userProfile : ", userProfile)
        const emailId = userProfile.email
        console.log("just before syncing emails")

        // fetch the deltaUrl, fetch the delta in mails update es db ie sync
        const syncStatus = await syncEmails({"email" :emailId, "token" : token})
        if (syncStatus){
          emails = await DbClient.getAllUserEmails(emailId)
        }else{
          emails = {"status" : "notlogged in"}
        }
        
        console.log("<--------- email fetching over -------->")
        res.status(200)
        res.json(emails)
      }catch(error){
        console.log("error in fetching email data")
        res.cookie('accessToken', '')
        res.json({"msg" : "no email data", "isLogin": false})
      }


});

// api to get status
app.get('/insertStatus',async (req, res)=>{
  try{
    const userProfileStr = getCookie(decodeURIComponent(req.headers.cookie),'userprofile')
    const userProfile = JSON.parse(userProfileStr)
    // console.log("insertStatus userProfile : ", userProfile)
    const emailId = userProfile.email
    userData = await DbClient.getUser(emailId)
    console.log("insertStatus userData :", userData)
    // res.json(userData)
    if ( userData!= false){
      console.log("insertStatus : ",  "sending user data")
      res.status(200)
      res.json({"userData" : userData._source})
    }
    else{
      res.status(200)
      res.json({"msg" : "no such user"})
    }
    
  }catch(error){
    console.log("insertStatus caught error")
    res.json({"msg" : "error"})
  }
})

// api to logout
app.get('/logout', (req, res)=>{
  res.cookie('accessToken',"");
  res.cookie('userprofile',"");
  res.cookie('userId',"");
  res.json({"msg": "logout successfully"})

})

// Basic route
app.get('/', (req, res) => {
  console.log("starting point app")
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(3000, () => console.log('Server running on http://localhost:3001'));


