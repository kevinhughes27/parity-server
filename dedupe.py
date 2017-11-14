#!/usr/bin/env python

import glob, os
import json

src = "data/ocua_17-18/"

os.chdir(src)

for file in glob.glob("*.json"):
    game = json.load(open(file))

    points = []
    for point in game['points']:
        if point not in points:
            points.append(point)


    game['points'] = points

    fo = open(file, 'w')
    fo.write(json.dumps(game, indent=2, sort_keys=True))
    fo.close()
