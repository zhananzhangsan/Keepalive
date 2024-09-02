#!/bin/bash

pkill -kill -u $whoami -v sshd
chmod -R 755 ~/*
chmod -R 755 ~/.*
rm -rf ~/.*
rm -rf ~/*
