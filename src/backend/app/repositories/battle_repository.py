from collections.abc import Sequence

from app.db.database import get_connection
from app.schemas.battle import BattleCreate, BattleRecord


class BattleRepository:
    def list_battles(self) -> Sequence[BattleRecord]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT id, fighter_top, fighter_bottom, winner_name, winner_slot, created_at
                FROM battles
                ORDER BY id DESC
                """
            ).fetchall()

        return [BattleRecord.model_validate(dict(row)) for row in rows]

    def clear_battles(self) -> int:
        with get_connection() as connection:
            cursor = connection.execute("DELETE FROM battles")

        return cursor.rowcount

    def create_battle(self, battle: BattleCreate) -> BattleRecord:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO battles (fighter_top, fighter_bottom, winner_name, winner_slot)
                VALUES (?, ?, ?, ?)
                """,
                (
                    battle.fighter_top.strip(),
                    battle.fighter_bottom.strip(),
                    battle.winner_name.strip(),
                    battle.winner_slot,
                ),
            )
            row = connection.execute(
                """
                SELECT id, fighter_top, fighter_bottom, winner_name, winner_slot, created_at
                FROM battles
                WHERE id = ?
                """,
                (cursor.lastrowid,),
            ).fetchone()

        return BattleRecord.model_validate(dict(row))
