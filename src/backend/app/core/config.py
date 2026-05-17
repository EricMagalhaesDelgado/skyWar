from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[4]
FRONTEND_DIR = BASE_DIR / "src" / "frontend"
DATABASE_PATH = BASE_DIR / "skywar.sqlite3"
API_PREFIX = "/api"
