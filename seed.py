import glob, os
import requests

os.chdir("data/ocua_16-17/session2_withstats")

blacklist = ['week03', 'week04']

for file in glob.glob("*.json"):
    if any(x in file for x in blacklist):
        print file, 'blacklisted'
        continue

    url = 'http://localhost:5000/upload'
    headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'}
    r = requests.post(url, data=open(file, 'rb'), headers=headers)
    print file, r.status_code
