export default {
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/decorators/*.ts',
    '!src/helpers/*.ts',
    '!src/http/Server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  preset: 'ts-jest',
  roots: [
      '<rootDir>/src',
  ],
  setupFiles: [
      './jest.setup.ts',
  ],
  setupFilesAfterEnv: [
    './jest.setupEnv.ts',
  ],
  testEnvironment: 'node',
}
