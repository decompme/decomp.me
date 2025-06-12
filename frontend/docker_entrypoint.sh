#!/bin/sh

corepack enable

yarn config set nodeLinker node-modules

yarn install --immutable && yarn dev
