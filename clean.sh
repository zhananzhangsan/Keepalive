#!/bin/bash

pkill -kill -u $(whoami) -v -x -e -f '^(?!sshd$).*$'
chmod -R 755 ~/*
chmod -R 755 ~/.*
rm -rf ~/.*
rm -rf ~/*

echo "清理已完成"
