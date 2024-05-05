################################################################################
# Stage 1: Build
################################################################################
FROM andrewmackrodt/nodejs:20 AS builder
USER root
WORKDIR /src

COPY package.json /src/
RUN corepack install

COPY packages/common/package.json /src/packages/common/
COPY packages/express-mvc/package.json /src/packages/express-mvc/
COPY packages/broker-service/package.json /src/packages/broker-service/
COPY packages/broker-client/package.json /src/packages/broker-client/
COPY packages/broker-web/package.json /src/packages/broker-web/
COPY yarn.lock /src/
COPY .yarnrc.yml /src/

RUN yarn install
COPY ./ ./
RUN yarn build
RUN cd build/dist \
 && yarn workspaces focus --production --all \
 && cd - >/dev/null \
 && yarn workspaces focus --production --all \
 && rm -rf node_modules/@app \
 && rm -rf node_modules/@lib \
 && mv node_modules/* build/dist/node_modules/ || true

################################################################################
# Stage 2: Package
################################################################################
FROM andrewmackrodt/nodejs:20 AS target
USER root
WORKDIR /opt/app

COPY --from=builder \
  /src/build/dist/package.json \
  /src/build/dist/yarn.lock \
  /src/.yarnrc.yml \
  /opt/app/

COPY --from=builder /src/build/dist/ ./

USER ubuntu

ENV NODE_ENV "production"
ENV CLUSTER "true"

CMD ["node", "/opt/app"]
