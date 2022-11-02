# Sinfonietta

## Quick Start

Node.js v16 or greater and yarn are required:

```sh
git clone https://github.com/andrewmackrodt/sinfonietta.git
cd sinfonietta
yarn install
yarn start
```

## Commands

### Workspace Commands

| Command      | Description                                                                                        |
|--------------|----------------------------------------------------------------------------------------------------|
| `yarn build` | Creates a production bundle                                                                        |
| `yarn start` | Starts [webpack][webpack] with HMR and [express][express] on ports `5000` and `8080` respectively. |
| `yarn lint`  | Run eslint                                                                                         |

[webpack]: http://localhost:8080
[express]: http://localhost:5000

### Backend Commands

| Command                                       | Description                                                                                                                      |
|-----------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| `yarn workspace @app/broker-service build`    | Create a production build in `./build`                                                                                           |
| `yarn workspace @app/broker-service clean`    | Remove build and coverage files                                                                                                  |
| `yarn workspace @app/broker-service coverage` | Generate the test suite coverage report in `./app/broker-service/coverage`                                                       |
| `yarn workspace @app/broker-service lint`     | Run eslint; use `lint:fix` to automatically fix errors                                                                           |
| `yarn workspace @app/broker-service start`    | Start the development server on [http://localhost:8080][dev]; `PORT` may be used to override the port, e.g. `PORT=8081 yarn ...` |
| `yarn workspace @app/broker-service test`     | Run jest test suite                                                                                                              |

See `app/${name}/package.json` for more commands.

Applications are prefixed with `@app`, e.g. to run eslint for the web project,
run `yarn workspace @app/broker-web lint`.
