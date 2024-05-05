import type { Config } from '@jest/types'

const jestConfig: Config.InitialOptions = {
    clearMocks: true,
    collectCoverageFrom: [
        'src/**/*.ts',
    ],
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    moduleNameMapper: {
        '^@(?:common|lib)/([^/]+)/(.+)$': '<rootDir>/../$1/src/$2',
        '^(\\.{1,2}/.+)$': '$1',
    },
    preset: 'ts-jest',
    roots: [
        '<rootDir>/src',
    ],
    testEnvironment: 'node',
}

export default jestConfig
