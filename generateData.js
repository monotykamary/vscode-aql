const fs = require('fs');
const aqlFunctions = require('./data/aql-functions.json').functions;

const aqlFunctionNames = aqlFunctions.map((functionObject) => functionObject.name);

fs.writeFile(`./data/aql-functions.names`, aqlFunctionNames.join(', '), 'utf8', (err) => {
  if (err) throw err;
});

fs.writeFile(`./data/aql-functions.regex`, aqlFunctionNames.join('|'), 'utf8', (err) => {
  if (err) throw err;
});
