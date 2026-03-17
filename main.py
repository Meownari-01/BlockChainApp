import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import subprocess
import sys

# Add scripts directory to path to import dependencies if needed
sys.path.append(os.path.join(os.getcwd(), 'scripts'))

app = FastAPI(title="ChainDeliver Admin API")

class SeedRequest(BaseModel):
    agent_address: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "ChainDeliver Admin API is running"}

@app.post("/admin/seed-data")
async def seed_data():
    """Trigger the seed_data.py script"""
    try:
        result = subprocess.run([sys.executable, "scripts/seed_data.py"], 
                                capture_output=True, text=True)
        if result.returncode == 0:
            return {"status": "success", "output": result.stdout}
        else:
            raise HTTPException(status_code=500, detail=result.stderr)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/activate-agents")
async def activate_agents():
    """Trigger the activate_agents.py script"""
    try:
        result = subprocess.run([sys.executable, "scripts/activate_agents.py"], 
                                capture_output=True, text=True)
        if result.returncode == 0:
            return {"status": "success", "output": result.stdout}
        else:
            raise HTTPException(status_code=500, detail=result.stderr)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
