// sync.js
const axios = require('axios');
const DbClient = require('./db-actions')
CONST_BATCH_SIZE = 3

async function syncEmails(user_data) {
  try{
    // fetchdeltaLink
    console.log("came to syncemail")
    const allTokens = await DbClient.getUserDeltaLink( user_data.email)
    const deltaLink = allTokens.deltaLink
    const accessToken = allTokens.accessToken
    console.log("Sync : deltaLink : ", deltaLink)

    // fetch emails chanes from outlook
    if (deltaLink!=false){
      console.log("came to fetch email delta ")
      console.log("token : ", accessToken)
      const {data}= await axios.get(deltaLink, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log("########### ------- headers : ",{Authorization: `Bearer ${accessToken}`})
      const newDeltaLink = data['@odata.deltaLink']
        console.log("deltaResponse :  ", data.value)  
      // update email changes to db
    for (const updatedEmail of data.value) {
        await DbClient.addOrupdateUserMail(user_data.email, updatedEmail)
        console.log("############# breaking update email ############")
      }
      // apdate user deltaLink
      await DbClient.addUserDeltaLink(user_data.email, newDeltaLink)
      return true
    
    }
 
  } catch( error){
    console.log("Sync Email : error :", error)
    return false
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// function to add All Emails to ES db on first sign up
// this will be added batch by batchs
async function FirstTimeSyncEmails(req, res, user_email , deltaLink, accessToken) {
  try{
    await sleep(2000);
    // fetchdeltaLink
    console.log("came to first time sync email")

    // fetch emails chanes from outlook
    const count_url = 'https://graph.microsoft.com/v1.0/me/messages/$count'
    const {data}= await axios.get(count_url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    let batch_total_count = Math.ceil(data/CONST_BATCH_SIZE)
    var batch_number = 1
    if (deltaLink!=false){

      // req.session.emailInsertStatus = 0
      let BatchInsetStatus = 0
      // res.cookie('emailInsertStatus',BatchInsetStatus)
      await DbClient.addUserStatus(user_email, BatchInsetStatus)
      console.log("status cookie added")
      var next_url = 'https://graph.microsoft.com/v1.0/me/messages?$top='+String(CONST_BATCH_SIZE)
      for (;next_url;){
        // console.log("came to fetch email delta ")
        const {data}= await axios.get(next_url, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });

        // add emails to db
        const allEmails = data.value
        await DbClient.addAllUserEmails(allEmails, user_email)
          
        // console.log("data : ", data)
        next_url = data['@odata.nextLink']
        BatchInsetStatus = batch_number/batch_total_count*100
        console.log(BatchInsetStatus)
        // req.session.emailInsertStatus = BatchInsetStatus
        // res.cookie('emailInsertStatus',BatchInsetStatus)
        await DbClient.addUserStatus(user_email, BatchInsetStatus)
        batch_number = batch_number+1
        await sleep(5000); 
        console.log("sleeping 5 sec")
      }
      return true
    
    }
 
  } catch( error){
    const err_body = error
    console.log("Sync Email : error :", err_body)
    return false
  }
}

module.exports = { syncEmails, FirstTimeSyncEmails };
