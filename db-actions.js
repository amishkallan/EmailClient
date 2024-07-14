const { Client } = require('@elastic/elasticsearch');
// const client = new Client({ node: 'http://localhost:9200' });
const userIndex = 'users'
const emailIndex = 'emails'

class DbClient extends Client{
     constructor(options) {
        console.log("options : ", options)
        super(options);
        
      }
    async getUser(email){
        
        try {
            const body  = await this.search({
              index: userIndex,
              body: {
                query: {
                  term: {
                    "email.keyword": email
                  }
                }
              }
            });
        
            // Check if there is at least one hit
            // console.log('es return body : ', body)
            // console.log("body.hits.total.value : ", body.hits.total.value)
            if (body.hits.total.value > 0){
                return body.hits.hits[0]
            }else{
                return false
            }
          } catch (error) {
            console.error('Error searching for user:', error);
            return false;
          }
    }
    async addUser(user) {
        try {
        const { body } = await this.index({
            index: userIndex,
            body: {
                email : user.email,
                id : user.id,
                name : user.name,
                accessToken : user.accessToken,
                deltaLink : user.deltaLink,
                emailLastUpdateTime : new Date(),
                InsertStatus:0

            },
        });
        console.log("successfully added user : ", user.email)
        return body;
        } catch (error) {
        console.error('Error adding user:', error);
        throw error;
        }
    }
    async addAllUserEmails(allEmails, userEmailId) {
        try {
            for (const email of allEmails){
                await this.addUserMail(email,userEmailId)
            }
       
        console.log("successfully added emails")
        return true;
        } catch (error) {
        console.error('Error adding emails:', error);
        throw error;
        }
    }
    async getAllUserEmails(email){
        try {
            // console.log('came to fetch emails for user : ', email);

            const body  = await this.search({
              index: emailIndex,
              body: {
                query: {
                  term: {
                    "userId.keyword": email
                  }
                }
              }
            });
            const emailRawList = body.hits.hits
            let emailList = []
            // console.log("emailRawList :", emailRawList)
            for (let email of  emailRawList){
                const emailBody = {
                    userId:email._source.userId,
                    receivedDateTime:email._source.receivedDateTime,
                    subject:email._source.subject,
                    isRead:email._source.isRead,
                    body:email._source.body,
                    sender:email._source.sender,
                    from:email._source.from,
                    toRecipients:email._source.toRecipients,
                    ccRecipients:email._source.ccRecipients,
                    bccRecipients:email._source.bccRecipients,
                    flag:email._source.flag,
                    isDeleted:email._source.isDeleted
                }
                emailList.push(emailBody)
            }
        
            // Check if there is at least one hit
            // console.log('es email list: ', emailList)
            // console.log("body.hits.total.value : ", body.hits.total.value)
            emailList = emailList.sort((a, b) => new Date(b.receivedDateTime) -  new Date(a.receivedDateTime));

            return emailList;
          } catch (error) {
            console.error('Error searching for user:', error);
            return false;
          }
    }
    async addUserMail(email,userEmailId){
        const email_dict = {
            id : email.id,
            userId : userEmailId,
            receivedDateTime : email.receivedDateTime,
            subject : email.subject,
            isRead : email.isRead,
            body : email.body,
            sender : email.sender,
            from : email.from,
            toRecipients : email.toRecipients,
            ccRecipients : email.ccRecipients,
            bccRecipients : email.bccRecipients,
            flag : email.flag.flagStatus,
            isDeleted : false
        }
        // console.log("email_dict : ", email_dict)
        const { body } = await this.index({
            index: emailIndex,
            body: email_dict,
        });
    }
    async updateUserMail(updatedEmail,idOfEmail){
        // check if deleted
        // var updateKey = ''
        // var updateVal = ''
        // console.log("updatedEmail : ", updatedEmail )
        var updateDoc = {}
        if ('@removed' in updatedEmail && updatedEmail['@removed'].reason == 'deleted'){
            updateDoc['isDeleted'] = true
        }
        if('isRead' in updatedEmail){
            updateDoc['isRead']=updatedEmail.isRead
            // updateKey = 'isRead'
            // updateVal = updatedEmail.isRead
        }
        if('flag' in updatedEmail){
            updateDoc['flag'] = updatedEmail.flag.flagStatus
            // updateKey = 'flag'
            // updateVal = updatedEmail.flag.flagStatus
        }
        if (Object.keys(updateDoc).length > 0){
          // console.log("updating document : ", updateDoc, ", id : ", idOfEmail)
          const { body: updateResponse } = await this.update({
              index: emailIndex,
              id: idOfEmail,
              body: {
                doc: updateDoc
              }
            });
          // console.log('updateUserMail : Document updated:', updateResponse);
          return true
        }
        return false
        
    }
    async getUserMail(outlookEmailId){
        try{
            const body  = await this.search({
                index:emailIndex,
                body: {
                query: {
                    term: {
                    "id.keyword": outlookEmailId
                    }
                }
                }
            });
        
            // Check if there is at least one hit
            // console.log('es return body : ', body)
            // console.log("body.hits.total.value : ", body.hits.total.value)
            if (body.hits.total.value > 0){
                return body.hits.hits[0]
            }else{
                return false
            }
        } catch (error) {
          console.error('Error searching for user:', error);
          return false;
        }
    }
    async getUserDeltaLink(email){
        try{
            // console.log("logging from db.deltaLink", email)
            const body  = await this.search({
                index: userIndex,
                body: {
                  query: {
                    term: {
                      "email.keyword": email
                    }
                  }
                }
              });
          
            // console.log(" body: ", body)
            const userObj = body.hits.hits[0]
            // console.log("userObj :", userObj)
            const deltaLink = userObj._source.deltaLink
            const accessToken = userObj._source.accessToken
            return {"deltaLink" : deltaLink, "accessToken": accessToken}
        } catch(error){
            console.log("getUserDeltaLink error : ", error)
            return false
        }
    }

    async addUserStatus(email, status){
      // console.log("addUserStatus : came to add Status : ")
      // console.log("email : ", email, "status : ", status)
        try {
            // get user document 
            const user_data  = await this.getUser(email)
            // console.log("addUserStatus user_data : ",user_data)
            if (user_data!= false){
              //  user is found update its deltaLink 
              // console.log("addUserStatus : user_data : ", user_data)
              const docId = user_data._id;
              // console.log("addUserStatus : docId : ", docId)
              const { body: updateResponse } = await this.update({
                index: userIndex,
                id: docId,
                body: {
                  doc: {
                      InsertStatus: status
                  }
                }
              });
              // console.log('addUserStatus : Document updated:', updateResponse);
            }
            else{
              console.log("addUserStatus : Error in finding given user ")
            }
          } catch (error) {
            console.error('addUserStatus : Error updating document:', error);
          }
    }

    async addUserDeltaLink(email, deltaLink){
      // console.log("addUserDeltaLink : came to add delta link : ")
      // console.log("email : ", email, "deltaLink : ", deltaLink)
        try {
            // get user document 
            const user_data  = await this.getUser(email)
            if (user_data!= false){
              //  user is found update its deltaLink 
              // console.log("addUserDeltaLink : user_data : ", user_data)
              const docId = user_data._id;
              // console.log("addUserDeltaLink : docId : ", docId)
              const { body: updateResponse } = await this.update({
                index: userIndex,
                id: docId,
                body: {
                  doc: {
                      deltaLink: deltaLink
                  }
                }
              });
              // console.log('addUserDeltaLink : Document updated:', updateResponse);
            }
            else{
              console.log("addUserDeltaLink : Error in finding given user ")
            }
          } catch (error) {
            console.error('addUserDeltaLink : Error updating document:', error);
          }
    }
    async addUserAccessToken(email, accessToken ){
        try{
        // accessToken = "poda"
        // console.log("addUserAccessToken: adding accestoken : ", accessToken)
        const userDoc = await this.getUser(email)
        // console.log("got user doc from getUser doc : ", userDoc)
        if (userDoc) {
            const documentId = userDoc._id;
            const body  = await this.update({
              index: userIndex,
              id: documentId,
              body: {
                doc: {
                    accessToken: accessToken
                }
              }
            });
      
            // console.log('Token updated:', body);
          }
        }catch (error){
            console.log("addUserAccessToken error : ", error)
        }
    }
    async addOrupdateUserMail(userEmailId, updatedEmail){
        // console.log("addOrUpdateEmail : \n", updatedEmail)
        // get email's _id
        const currentEmail = await this.getUserMail(updatedEmail.id)
        const user_data = await this.getUser(userEmailId)
        // console.log("currentEmail : ", currentEmail)
        if (currentEmail == false){
            if ("body" in updatedEmail){
                // add it as new email
                await this.addUserMail(updatedEmail, userEmailId)
                // console.log("new email added")
            }
        }
        else{
            // update email
            const idOfEmail = currentEmail._id
            const status = await this.updateUserMail(updatedEmail, idOfEmail)
            // console.log("email update status : ", status, ", idOfEmail : ", idOfEmail)
        }
    }
}
DbClientInst = new DbClient({ node: 'http://host.docker.internal:9200' })
module.exports = DbClientInst