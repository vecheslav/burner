export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 25000,
  testMatch: ['<rootDir>/test/**/*.(spec|test).ts'],
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
      diagnostics: false,
    },
  },
}
