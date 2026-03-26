module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^@flybyme/isomorphic-core$': '<rootDir>/../isomorphic-core/src/index',
    '^@flybyme/isomorphic-fs$': '<rootDir>/../isomorphic-fs/src/index',
    '^@flybyme/isomorphic-database$': '<rootDir>/../isomorphic-database/src/index'
  }
};
