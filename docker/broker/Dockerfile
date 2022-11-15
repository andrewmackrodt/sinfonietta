################################################################################
# Stage 1 : Build
################################################################################

FROM andrewmackrodt/nodejs:16 AS builder
USER root
WORKDIR /src

COPY packages/common/package.json /src/packages/common/
COPY packages/express-mvc/package.json /src/packages/express-mvc/
COPY packages/broker-service/package.json /src/packages/broker-service/
COPY packages/broker-client/package.json /src/packages/broker-client/
COPY packages/broker-web/package.json /src/packages/broker-web/
COPY package.json /src/
COPY yarn.lock /src/

RUN yarn install

COPY ./ ./

RUN yarn build

################################################################################
# Stage 2 : Package
################################################################################

FROM andrewmackrodt/nodejs:16 AS target
USER root
WORKDIR /opt/app

COPY --from=builder \
  /src/build/dist/node_modules/ \
  /opt/app/node_modules/

COPY --from=builder \
  /src/build/dist/package.json \
  /src/build/dist/yarn.lock \
  /opt/app/

RUN yarn install --production

COPY --from=builder /src/build/dist/ ./

USER ubuntu

ENV NODE_ENV "production"
ENV CLUSTER "true"

CMD ["node", "/opt/app"]
