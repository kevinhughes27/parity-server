#!/usr/bin/env python

import glob, os
import requests

# src = "data/test/"
src = "data/ocua_17-18/"

url = 'http://localhost:5000/upload'
# url = 'https://parity-server.herokuapp.com/upload'

os.chdir(src)

for file in glob.glob("*.json"):
    headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'}
    r = requests.post(url, data=open(file, 'rb'), headers=headers)
    print(file, r.status_code)
