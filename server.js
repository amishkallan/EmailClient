// server.js
const express = require('express');
const passport = require('./passport');
const session = require('express-session');
const { syncEmails, FirstTimeSyncEmails } = require('./sync');
const path = require('path')
const axios = require('axios');
const app = express();
const DbClient = require('./db-actions')
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
  (req, res) => {
    console.log("came to auth outlook callback..")    
    res.cookie('accessToken', encodeURIComponent(req.token));
    console.log("original token : ", req.token)
    res.cookie('userprofile',JSON.stringify(req.user.userProfile));
    res.cookie('userId',encodeURIComponent(req.user.userProfile.mail));
    res.redirect('/');
  });

// api to sync outlook and app db(elasticsearch) 
// This api fetched the changes that occured in outlook from last time it updated and make those changes in es db
app.get('/sync', async (req, res) => {
  console.log("some")
  const userProfileStr = getCookie(decodeURIComponent(req.headers.cookie),'userprofile')
  const token = getCookie(decodeURIComponent(req.headers.cookie),'token')
  const userProfile = JSON.parse(userProfileStr)
  // console.log("token : ", token)
  const emailId = userProfile.mail
  if (!emailId) return res.status(401).send('Unauthorized');
  await FirstTimeSyncEmails(emailId);
  res.send('Synchronization complete');
});

// api to realtime sync emails and fetch all the emails of logged in user
app.get('/emails', async (req, res) => {
  try{   
      const userProfileStr = getCookie(decodeURIComponent(req.headers.cookie),'userprofile')
      const token = getCookie(decodeURIComponent(req.headers.cookie),'token')
      const userProfile = JSON.parse(userProfileStr)
      // console.log("token : ", token)
      const emailId = userProfile.mail
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
app.listen(3000, () => console.log('Server running on http://localhost:3000'));


