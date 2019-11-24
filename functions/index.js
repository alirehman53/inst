const functions = require('firebase-functions');
const algoliasearch = require('algoliasearch');

exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});


// Initialize Algolia, requires installing Algolia dependencies:
// https://www.algolia.com/doc/api-client/javascript/getting-started/#install
//
// App ID and API Key are stored in functions config variables
// const ALGOLIA_ID = functions.config().algolia.app_id;
// const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;
// const ALGOLIA_SEARCH_KEY = functions.config().algolia.search_key;

const ALGOLIA_INDEX_NAME = 'search';
const client = algoliasearch('CRDLA463IZ', '112f0f83a5340f940f9acb5e24299921');

const index = client.initIndex(ALGOLIA_INDEX_NAME);

const objects = [{
    objectID: 3,
    name: 'Iqbal'
  }
  ,{
    objectID: 2,
    name: 'Bilal'
}];

index
  .saveObjects(objects)
  .then(({ objectIDs }) => {
    console.log('saved ==> ' + objectIDs);
  })
  .catch(err => {
    console.log(err);
  });

index
  .search('Bilal')
  .then(({ hits }) => {
    console.log('same ==> ' + hits);
  })
  .catch(err => {
    console.log(err);
  });
















  
// // Update the search index every time a blog post is written.
// exports.onNoteCreated = functions.firestore.document('notes/{noteId}').onCreate((snap, context) => {
//     // Get the note document
//     const note = snap.data();
  
//     // Add an 'objectID' field which Algolia requires
//     note.objectID = context.params.noteId;
  
//     // Write to the algolia index
//     const index = client.initIndex(ALGOLIA_INDEX_NAME);
//     return index.saveObject(note);
// });
  
// var client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
// var index = client.initIndex('notes');

// // Perform an Algolia search:
// // https://www.algolia.com/doc/api-reference/api-methods/search/
// index
//   .search({
//     query
//   })
//   .then(function(responses) {
//     // Response from Algolia:
//     // https://www.algolia.com/doc/api-reference/api-methods/search/#response-format
//     console.log(responses.hits);
// });
