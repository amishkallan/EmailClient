// auth.js
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;
require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');
const DbClient = require('./db-actions')
const { syncEmails, FirstTimeSyncEmails } = require('./sync')
const outlookEmailDeltaURL = process.env.OUTLOOK_DELTA_URL
const authorizationURL = process.env.OUTLOOK_AUth_URL
const tokenURL = process.env.OUTLOOK_TOKEN_URL
const clientID = require('./app.config').OUTLOOK_CLIENT_ID
const clientSecret = require('./app.config').OUTLOOK_CLIENT_SECRET
const callbackURL = process.env.OUTLOOK_CALL_BACKURL
const scope = ['openid', 'profile', 'email', 'https://graph.microsoft.com/mail.read','https://graph.microsoft.com/Mail.ReadWrite','https://graph.microsoft.com/MailboxSettings.Read','https://graph.microsoft.com/MailboxSettings.ReadWrite', 'User.Read'] 
const passReqToCallback = true
const msprofileurl = process.env.OUTLOOK_PROFILE_URL

function generateCodeVerifier() {
    return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(codeVerifier) {
    return base64URLEncode(crypto.createHash('sha256').update(codeVerifier).digest());
}

function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// fetch all email data from outlook
async function fetchAllEmails(token){
  try {
    const emailResponse = await axios.get(outlookEmailDeltaURL, {
      headers: {
          Authorization: `Bearer ${token}`,
      },
      
    });
    console.log("########### ------- headers : ",{Authorization: `Bearer ${token}`})
    const deltaLink = emailResponse.data['@odata.deltaLink'];
    console.log(" delta link : ",deltaLink)
    const allEmails = emailResponse.data.value
    return {"emails" : allEmails, "deltaLink" : deltaLink}
  } catch(error){
    console.log("error while fetching all emails")
    return false
  }

}

// const codeVerifier = generateCodeVerifier();
// const codeChallenge = generateCodeChallenge(codeVerifier);

// oAuth for outlook login
passport.use('outlook', new OAuth2Strategy({
  authorizationURL: authorizationURL,
  tokenURL: tokenURL,
  clientID: clientID,
  clientSecret: clientSecret,
  callbackURL: callbackURL,
  scope: scope ,
  passReqToCallback: passReqToCallback,
},
async (req, accessToken, refreshToken, profile, done) => {
  // fetch user profile infos from microsoft
  req.token = accessToken  
  done(null , {id: "body._id", token : accessToken })
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
module.exports = passport;