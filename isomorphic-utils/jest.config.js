module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^isomorphic-core$': '<rootDir>/../isomorphic-core/src/index',
    '^isomorphic-registry$': '<rootDir>/../isomorphic-registry/src/index',
    '^isomorphic-auth$': '<rootDir>/../isomorphic-auth/src/index',
    '^isomorphic-mesh$': '<rootDir>/../isomorphic-mesh/src/index',
    '^raft-consensus$': '<rootDir>/../raft-consensus/src/index',
    '^eventemitter3$': '<rootDir>/node_modules/eventemitter3'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: {
        ignoreCodes: [2304]
      }
    }]
  }
};
