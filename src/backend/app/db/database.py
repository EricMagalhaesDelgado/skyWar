import sqlite3
from contextlib import contextmanager
from typing import Iterator

from app.core.config import DATABASE_PATH


def initialize_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS battles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fighter_top TEXT NOT NULL,
                fighter_bottom TEXT NOT NULL,
                winner_name TEXT NOT NULL,
                winner_slot TEXT NOT NULL CHECK (winner_slot IN ('top', 'bottom')),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()
