import json, subprocess, sys, tempfile, asyncio
sys.path.insert(0, "/home/claude/aimtrail")
import aiohttp, server as S
from pathlib import Path
D = Path(tempfile.mkdtemp()); S.configure(D)
srv = S.Server("127.0.0.1", 8900, src="rawinput"); assert srv.start()
async def cfg():
    async with aiohttp.ClientSession() as s, s.ws_connect("http://127.0.0.1:8900/ws?sub=cfg") as ws:
        await ws.receive_str(); await ws.send_str(json.dumps({"t": "dconfig", "config": {"wm": False}})); await asyncio.sleep(0.2)
asyncio.run(cfg())
r = subprocess.run(["node", "/tmp/rt/t27.js"], capture_output=True, text=True, timeout=280); print(r.stdout, r.stderr[-300:]); srv.stop()
