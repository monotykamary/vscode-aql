const fs = require('fs');
const aqlFunctions = require('./data/aql-functions.json').functions;
const aqlTmLanguage = require('./syntaxes/aql.tmLanguage.json');

const aqlFunctionsNames = aqlFunctions.map((functionObject) => functionObject.name);
const aqlFunctionsRegex = aqlFunctionsNames.join('|');
const nextAqlTmLanguage = {
  ...aqlTmLanguage,
  repository: {
    ...aqlTmLanguage.repository,
    function: {
      ...aqlTmLanguage.repository.function,
      patterns: [
        {
          match: `(?i)\\b(${aqlFunctionsRegex})\\b`,
          name: "support.function.aql"
        }
      ]
    }
  }
};

fs.writeFileSync('./data/aql-functions.names', aqlFunctionsNames.join(', '), 'utf8');
fs.writeFileSync('./data/aql-functions.regex', aqlFunctionsRegex, 'utf8');
fs.writeFileSync('./syntaxes/aql.tmLanguage.json', JSON.stringify(nextAqlTmLanguage, null, 2), 'utf8');
