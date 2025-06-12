#!/bin/sh

corepack enable

yarn install --immutable && yarn dev
