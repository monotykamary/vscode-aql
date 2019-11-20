# Syntax Highlighting for ArangoDB Query Language (AQL)

Provides basic syntax highlighting for AQL. This repository was originally inspired and bootstrapped from clintwood's [arango-aql-query](https://github.com/clintwood/arango-aql-query) for Atom Editor and has also taken approaches and formatting from ronsoak's [vsc_redshift_extension](https://github.com/ronsoak/vsc_redshift_extension). ronsoak's [article](https://dev.to/ronsoak/i-built-my-own-vs-code-syntax-highlighter-from-scratch-and-here-s-what-i-learned-1h98)on building a syntax highlighter is also a pleasant read if you are interested in making one for your favorite language.

![aql](aql.png)

The highlighter comes with syntax highlighting for template literals to support Foxx and [arangojs](https://github.com/arangodb/arangojs)

![inline-aql](inline-aql.png)


## Current Highlighting Support

Currently lacks a ternary operator, parenthesis, array, and object wrapping (which is a regex nightmare) and is planned in the next release, but should work well without it. If anyone wants to create a pull request to handle them, that would be sincerely appreciated.

Most of the highlighting has been taken from [ArangoDB's frontend highlighter](https://raw.githubusercontent.com/arangodb/arangodb/master/js/apps/system/_admin/aardvark/APP/frontend/src/mode-aql.js) + one extra function they missed ;)

### Keywords

Patterns matched to keyword.control:

> FOR, RETURN, FILTER, SEARCH, SORT, LIMIT, LET, COLLECT, ASC, DESC, IN, INTO, INSERT, UPDATE, REMOVE, REPLACE, UPSERT, OPTIONS, WITH, AND, OR, NOT, DISTINCT, GRAPH, SHORTEST_PATH, OUTBOUND, INBOUND, ANY, ALL, NONE, AGGREGATE, LIKE, K_SHORTEST_PATHS, PRUNE

Patterns matched to support.functions:

> TO_BOOL, TO_NUMBER, TO_STRING, TO_LIST, IS_NULL, IS_BOOL, IS_NUMBER, IS_STRING, IS_LIST, IS_DOCUMENT, TYPENAME, JSON_STRINGIFY, JSON_PARSE, CONCAT, CONCAT_SEPARATOR, CHAR_LENGTH, LOWER, UPPER, SUBSTRING, LEFT, RIGHT, TRIM, REVERSE, CONTAINS, LOG, LOG2, LOG10, EXP, EXP2, SIN, COS, TAN, ASIN, ACOS, ATAN, ATAN2, RADIANS, DEGREES, PI, REGEX_TEST, LIKE, FLOOR, CEIL, ROUND, ABS, RAND, SQRT, POW, LENGTH, COUNT, MIN, MAX, AVERAGE, SUM, MEDIAN, VARIANCE_POPULATION, VARIANCE_SAMPLE, FIRST, LAST, UNIQUE, OUTERSECTION, MATCHES, MERGE, MERGE_RECURSIVE, HAS, ATTRIBUTES, VALUES, UNSET, UNSET_RECURSIVE, KEEP, NEAR, WITHIN, WITHIN_RECTANGLE, IS_IN_POLYGON, DISTANCE, FULLTEXT, PATHS, TRAVERSAL, TRAVERSAL_TREE, EDGES, STDDEV_SAMPLE, STDDEV_POPULATION, SLICE, NTH, POSITION, TRANSLATE, ZIP, CALL, APPLY, PUSH, APPEND, POP, SHIFT, UNSHIFT, REMOVE_VALUE, REMOVE_VALUES, REMOVE_NTH, DATE_NOW, DATE_TIMESTAMP, DATE_ISO8601, DATE_DAYOFWEEK, DATE_YEAR, DATE_MONTH, DATE_DAY, DATE_HOUR, DATE_MINUTE, DATE_SECOND, DATE_MILLISECOND, DATE_DAYOFYEAR, DATE_ISOWEEK, DATE_LEAPYEAR, DATE_QUARTER, DATE_DAYS_IN_MONTH, DATE_ADD, DATE_SUBTRACT, DATE_DIFF, DATE_COMPARE, DATE_FORMAT, FAIL, PASSTHRU, SLEEP, NOT_NULL, FIRST_LIST, FIRST_DOCUMENT, PARSE_IDENTIFIER, CURRENT_USER, CURRENT_DATABASE, COLLECTIONS, DOCUMENT, DECODE_REV, UNION, UNION_DISTINCT, INTERSECTION, FLATTEN, IS_SAME_COLLECTION, CHECK_DOCUMENT, LTRIM, RTRIM, FIND_FIRST, FIND_LAST, SPLIT, SUBSTITUTE, MD5, SHA1, CRC32, FNV64, HASH, RANDOM_TOKEN, TO_BASE64, TO_HEX, ENCODE_URI_COMPONENT, SOUNDEX, ASSERT, WARN, IS_KEY, SORTED, SORTED_UNIQUE, COUNT_DISTINCT, LEVENSHTEIN_DISTANCE, REGEX_MATCHES, REGEX_SPLIT, UUID, TOKENS, EXISTS, STARTS_WITH, PHRASE, MIN_MATCH, BOOST, ANALYZER, TO_HEX, ENCODE_URI_COMPONENT, SOUNDEX, ASSERT, WARN, IS_KEY, SORTED, SORTED_UNIQUE, COUNT_DISTINCT, GEO_POINT, GEO_MULTIPOINT, GEO_POLYGON, GEO_LINESTRING, GEO_MULTILINESTRING, GEO_CONTAINS, GEO_INTERSECTS, GEO_EQUALS, GEO_DISTANCE

+1 more
> MINUS

## Comments

Pattern matched to comment.single:

> Any line starting with a double forward-slash //

Pattern matched to comment.block:

> Any block starting with a forward-slash and an asterisk /* ending with an asterisk and forward-slash */

## Strings

Patterns matched to string.quoted:

> Any string that is encapsulated by single ('), double ("), or template literal (`) quotes

## Numbers

Pattern matched to constant.numeric:

> Any decimal number

## Constants

Pattern matched to constant.language:

> Any boolean values (true, false) + null operator

Pattern matched to keyword.operator:

> Any non-word comparison or arithmetic operator (except ternary) available at [https://www.arangodb.com/docs/stable/aql/operators.html](https://www.arangodb.com/docs/stable/aql/operators.html)
