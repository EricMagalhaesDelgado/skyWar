from contextlib import asynccontextmanager
from pathlib import Path
import sys
import argparse

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes.battles import router as battles_router
from app.core.config import API_PREFIX, FRONTEND_DIR
from app.db.database import initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="SKY WAR", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(battles_router, prefix=API_PREFIX)
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="Run the FastAPI application.")
    parser.add_argument("--port", type=int, default=8000, help="Port to run the server on.")
    args, unknown_args = parser.parse_known_args()

    uvicorn.run(
        "app.main:app" if "--reload" in unknown_args else app,
        host="0.0.0.0",
        port=args.port,
        reload="--reload" in unknown_args,
    )
