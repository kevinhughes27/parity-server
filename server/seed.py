#!/usr/bin/env python

import glob, os
import requests

os.chdir("data/test/")

for file in glob.glob("*.json"):
    url = 'http://localhost:5000/upload'
    headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'}
    r = requests.post(url, data=open(file, 'rb'), headers=headers)
    print(file, r.status_code)
