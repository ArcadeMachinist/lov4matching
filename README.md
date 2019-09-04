# lov4matching
Lord of Vermilion IV matching server

This is matching server for Lord of Vermilion IV arcade cabinets.
The game was retired from Japan arcades on 31/08/2019.

This project is a part of LOV4 game preservation effort.
To run network matching you would require at least 2 game cabinets, connected to "NESYS at Home" server and a GameServer.

Nesys at Home: https://github.com/fatal-bundy/nesys_at_home

GameServer is HellGameServer.exe, running on a standalone PC (no powerful GFX needed, laptop is ok).

This exe is for some reason is included on disk with every game cabinet, so you already have it.

You should edit HellMatching.ini on the GameServer to point to your matching server IP and GS port. 11002 is default.

Game cabinets should receive matching server IP and ports from "NESYS at home"
MATCHING_SERVER_IP:11001:11002:REPLAY_SERVER_IP:11004

