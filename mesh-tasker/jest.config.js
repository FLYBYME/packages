module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^isomorphic-core$': '<rootDir>/../isomorphic-core/src/index',
    '^isomorphic-mesh$': '<rootDir>/../isomorphic-mesh/src/index',
    '^isomorphic-registry$': '<rootDir>/../isomorphic-registry/src/index',
    '^isomorphic-resiliency$': '<rootDir>/../isomorphic-resiliency/src/index',
    '^isomorphic-auth$': '<rootDir>/../isomorphic-auth/src/index',
    '^isomorphic-database$': '<rootDir>/../isomorphic-database/src/index',
    '^raft-consensus$': '<rootDir>/../raft-consensus/src/index'
  }
};
