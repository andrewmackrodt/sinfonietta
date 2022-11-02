#!/bin/bash

function finish {
  ps aux | grep '[c]url' | grep debug | awk '{ print $2 }' | xargs -r kill
}

trap finish EXIT

for i in $(seq 1 10); do
  for j in $(seq 1 100); do
    curl -s 'http://localhost:8080/debug/produce?count=1000' >/dev/null 2>&1
  done &
done

wait
