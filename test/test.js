const testQuery = db._query(aql`
  FOR testDocument IN OUTBOUND ${documentCollection._id} testEdge

    LET testSQ = (
      FOR vertex IN OUTBOUND testDocument._id ${testEdge2}
        LET difference = MINUS(testDocument._key, vertex._key)
        FILTER vertex._key != testDocument._key
        AND LENGTH(difference) < 3
        SORT FLOOR(difference) ASC

        RETURN vertex
    )

    RETURN {
      testDocument,
      testSQ
    }
`);

const testQuery2 = aql`
  FOR i IN 1..1000
    INSERT {
      name: CONCAT("test", i),
      gender: (i % 2 == 0 ? "f" : "m")
    } INTO users
`;

const testQuery3 = //aql
`
  FOR user IN users
    FILTER user.active == 1
      UPDATE user
        WITH {
          numberOfLogins: LENGTH(
            FOR login IN logins
              FILTER login.user == user._key
              COLLECT WITH COUNT INTO numLogins
              RETURN numLogins
          )
        } IN users
`;

const testQuery4 = /*aql*/`
  LET someAreaInNYC = GEO_POLYGON([
    [-74.02587890625, 40.70536767492135],
    [-73.97335052490234, 40.71135347314246],
    [-73.90434265136719, 40.797957124643666],
    [-73.98193359375, 40.814328907637126],
    [-74.02587890625, 40.70536767492135]
  ])

  FOR n IN neighborhoods
    FILTER GEO_INTERSECTS(someAreaInNYC, n.geometry)
    RETURN n.geometry
`;

const testQuery5 = query`
  FOR user IN users
    FILTER user.active == 1
    RETURN {
      name: CONCAT(user.firstName, " ",
                  user.lastName),
      gender: user.gender
    }
`;
