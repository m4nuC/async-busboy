//This file is if you want to run some test localy, run: `node index.js`
//From there you can use something like [Postman](https://chrome.google.com/webstore/detail/postman/fhbjgbiflinjbdggehcddcbncdddomop?hl=en) to send `POST` request to `localhost:8080`.
//Note: When using Postman make sure to not send a `Content-Type` header, if it's field by default, juste delete it.

const multiparter = require('../')
const http = require('http');
const PORT=8080;

function handleRequest(request, response){
  multiparter(request).then(function(formData) {
    // [You can put your tests here]
    console.log(formData.files)
    response.end('It Works!! ');
  },function(error) {
    console.log(error)
    response.end('Something broke!! ');
  });
}

var server = http.createServer(handleRequest);
server.listen(PORT, function(){
  console.log("Server listening on: http://localhost:%s", PORT);
});