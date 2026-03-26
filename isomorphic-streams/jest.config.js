module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['/dist/'],
  moduleNameMapper: {
    '^isomorphic-core$': '<rootDir>/../isomorphic-core/src/index',
    '^isomorphic-mesh$': '<rootDir>/../isomorphic-mesh/src/index',
    '^isomorphic-registry$': '<rootDir>/../isomorphic-registry/src/index',
    '^isomorphic-auth$': '<rootDir>/../isomorphic-auth/src/index',
    '^raft-consensus$': '<rootDir>/../raft-consensus/src/index',
    '^isomorphic-database$': '<rootDir>/../isomorphic-database/src/index',
    '^isomorphic-utils$': '<rootDir>/../isomorphic-utils/src/index',
    '^isomorphic-ui$': '<rootDir>/../isomorphic-ui/src/index'
  }
};
