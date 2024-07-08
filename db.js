// db.js
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://host.docker.internal:9200' });
const userIndex = 'users'
async function createIndices() {
  await client.indices.create({
    index: userIndex,
    body: {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          email: { type: 'keyword' },
          accessToken: { type: 'text' },
          deltaLink: {type : 'text'},
          name : {type : 'text'}
        }
      }
    }
  }, { ignore: [400] });
  console.log("creating emails index")
  const resp = await client.indices.create({
    index: 'emails',
    body: {
      mappings: {
        properties: {
          userId: { type: 'text' },
          id: { type: 'text' },
          receivedDateTime : {type : 'datetime'},
          subject: { type: 'text' },
          isRead : {type: 'boolean'},
          body: { type: 'text' },
          sender: { type: 'text' },
          from: { type: 'text' },
          toRecipients: { type: 'text' },
          ccRecipients: { type: 'text' },
          bccRecipients: { type: 'text' },
          flag: { type: 'keyword' }
        }
      }
    }
  }, { ignore: [400] });
  console.log(resp)
}

module.exports = { client, createIndices};
