const axios = require('axios');
const outlookEmailDeltaURL = process.env.OUTLOOK_DELTA_URL


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

module.exports = {fetchAllEmails}