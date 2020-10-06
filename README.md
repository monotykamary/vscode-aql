# Syntax Highlighting for ArangoDB Query Language (AQL)

Provides basic syntax highlighting for AQL. This repository was originally inspired and bootstrapped from clintwood's [arango-aql-query](https://github.com/clintwood/arango-aql-query) for Atom Editor and has also taken approaches and formatting from ronsoak's [vsc_redshift_extension](https://github.com/ronsoak/vsc_redshift_extension). ronsoak's [article](https://dev.to/ronsoak/i-built-my-own-vs-code-syntax-highlighter-from-scratch-and-here-s-what-i-learned-1h98) on building a syntax highlighter is also a pleasant read if you are interested in making one for your favorite language.

![aql](aql.png)

The highlighter comes with syntax highlighting for template literals to support Foxx and [arangojs](https://github.com/arangodb/arangojs).

![inline-aql](inline-aql.png)


## Current Highlighting Support

Keyword highlighting has been taken from [ArangoDB's frontend highlighter](https://raw.githubusercontent.com/arangodb/arangodb/master/js/apps/system/_admin/aardvark/APP/frontend/src/mode-aql.js).

Function highlighting is taken from `http://localhost:8529/_db/_system/_api/aql-builtin` and is extracted in raw JSON and processed by name in the data folder.

### Keywords

Patterns matched to keyword.control:

> FOR, RETURN, FILTER, SEARCH, SORT, LIMIT, LET, COLLECT, ASC, DESC, IN, INTO, INSERT, UPDATE, REMOVE, REPLACE, UPSERT, OPTIONS, WITH, AND, OR, NOT, DISTINCT, GRAPH, SHORTEST_PATH, OUTBOUND, INBOUND, ANY, ALL, NONE, AGGREGATE, LIKE, K_SHORTEST_PATHS, PRUNE

### Functions
Patterns matched to support.functions:

> BM25|TFIDF|BOOST|MIN_MATCH|STARTS_WITH|EXISTS|TOKENS|FULLTEXT|WITHIN_RECTANGLE|WITHIN|NEAR|ASSERT|AVG|AVERAGE|INTERSECTION|POP|IS_DOCUMENT|UNION_DISTINCT|SLEEP|RANGE|DATE_SUBTRACT|PI|DEGREES|MERGE_RECURSIVE|DATE_QUARTER|ATAN2|ACOS|IS_LIST|LENGTH|FIRST_LIST|UNSHIFT|TRIM|EXP|LAST|ATTRIBUTES|PREGEL_RESULT|LOG10|POW|CURRENT_USER|PRODUCT|LOG2|RANDOM_TOKEN|RAND|IN_RANGE|ABS|GEO_AREA|LEVENSHTEIN_MATCH|OUTERSECTION|DATE_DAYS_IN_MONTH|LEVENSHTEIN_DISTANCE|SIN|EXP2|ENCODE_URI_COMPONENT|NGRAM_SIMILARITY|SUM|LOWER|MIN|COS|SUBSTRING|JACCARD|IS_OBJECT|STDDEV_SAMPLE|DATE_TRUNC|SORTED|ATAN|GEO_MULTIPOINT|REGEX_REPLACE|GEO_MULTIPOLYGON|ANALYZER|CONCAT|FIND_LAST|JSON_STRINGIFY|REGEX_TEST|PERCENTILE|NGRAM_POSITIONAL_SIMILARITY|MINUS|LEFT|VALUES|DATE_DAY|NOEVAL|MEDIAN|STDDEV_POPULATION|TO_STRING|IS_NUMBER|FNV64|RADIANS|LOG|MAX|IPV4_FROM_NUMBER|ROUND|RIGHT|UPPER|APPEND|FLATTEN|JSON_PARSE|TYPENAME|TO_HEX|DATE_ROUND|MD5|IS_IN_POLYGON|COLLECTION_COUNT|COUNT|TO_NUMBER|ASIN|TO_BASE64|DATE_ISOWEEK|TO_ARRAY|IS_IPV4|DATE_ISO8601|IS_BOOL|COUNT_UNIQUE|V8|CONTAINS|IS_DATESTRING|REGEX_MATCHES|SPLIT|APPLY|REGEX_SPLIT|UNION|DATE_MILLISECOND|NGRAM_MATCH|RTRIM|FIND_FIRST|LTRIM|CONCAT_SEPARATOR|GEO_CONTAINS|PASSTHRU|GEO_INTERSECTS|IS_SAME_COLLECTION|HASH|FLOOR|IS_KEY|SUBSTITUTE|IPV4_TO_NUMBER|SHA1|CHAR_LENGTH|PUSH|IS_NULL|CRC32|VARIANCE_SAMPLE|VARIANCE_POPULATION|DATE_NOW|VARIANCE|FAIL|COUNT_DISTINCT|UNIQUE|SORTED_UNIQUE|SLICE|REVERSE|SHA512|DATE_HOUR|FIRST|REMOVE_VALUE|NTH|POSITION|CONTAINS_ARRAY|SHIFT|PHRASE|SCHEMA_GET|STDDEV|REMOVE_NTH|REPLACE_NTH|INTERLEAVE|BOOSTSCORE|MERGE|CALL|DATE_MONTH|IS_STRING|DATE_DAYOFWEEK|HAS|KEYS|CURRENT_DATABASE|SQRT|DATE_DIFF|MATCHES|GEO_POINT|GEO_EQUALS|UNSET_RECURSIVE|REMOVE_VALUES|KEEP|TRANSLATE|ZIP|DISTANCE|GEO_POLYGON|GEO_LINESTRING|GEO_MULTILINESTRING|DATE_TIMESTAMP|DATE_YEAR|DATE_SECOND|TO_LIST|LIKE|DATE_DAYOFYEAR|DATE_LEAPYEAR|CEIL|DATE_FORMAT|DATE_ADD|DATE_COMPARE|UUID|NOT_NULL|FIRST_DOCUMENT|IS_ARRAY|PARSE_IDENTIFIER|GEO_DISTANCE|UNSET|DECODE_REV|DATE_MINUTE|COLLECTIONS|WARN|SCHEMA_VALIDATE|SOUNDEX|TAN|VERSION|TO_BOOL|NOOPT|DOCUMENT|CHECK_DOCUMENT

### Comments

Pattern matched to comment.single:

> Any line starting with a double forward-slash //

Pattern matched to comment.block:

> Any block starting with a forward-slash and an asterisk /* ending with an asterisk and forward-slash */

### Strings

Patterns matched to string.quoted:

> Any string that is encapsulated by single ('), double ("), or template literal (`) quotes

### Numbers

Pattern matched to constant.numeric:

> Any decimal number

### Constants

Pattern matched to constant.language:

> Any boolean values (true, false) + null operator

Pattern matched to keyword.operator:

> Any non-word comparison or arithmetic operator (except ternary) available at [https://www.arangodb.com/docs/stable/aql/operators.html](https://www.arangodb.com/docs/stable/aql/operators.html)


## Roadmap

### Highlighting
- [x] Ternary Operator
- [x] Parenthesis, Array, and Object wrapping (with expressions)
- [ ] Variables (from @, LET, and RETURN)

### Language Features
- [ ] Implement and integrate a [language server](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) for autocompletion, error-checking, jump-to-definitions, etc... through the [Language Server Protocol (LSP)](https://langserver.org/) for multi-editor support.
