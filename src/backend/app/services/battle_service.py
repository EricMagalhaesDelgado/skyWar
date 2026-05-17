from collections.abc import Sequence

from app.repositories.battle_repository import BattleRepository
from app.schemas.battle import BattleCreate, BattleRecord


class BattleService:
    def __init__(self, repository: BattleRepository | None = None) -> None:
        self._repository = repository or BattleRepository()

    def list_battles(self) -> Sequence[BattleRecord]:
        return self._repository.list_battles()

    def clear_battles(self) -> int:
        return self._repository.clear_battles()

    def register_battle(self, battle: BattleCreate) -> BattleRecord:
        fighter_top = battle.fighter_top.strip()
        fighter_bottom = battle.fighter_bottom.strip()
        winner_name = battle.winner_name.strip()

        if not fighter_top or not fighter_bottom or not winner_name:
            raise ValueError("Os nomes dos jogadores e do vencedor sao obrigatorios.")

        valid_winner = {
            "top": fighter_top,
            "bottom": fighter_bottom,
        }[battle.winner_slot]

        if winner_name != valid_winner:
            raise ValueError("O vencedor informado nao corresponde ao aviao vencedor.")

        return self._repository.create_battle(
            BattleCreate(
                fighter_top=fighter_top,
                fighter_bottom=fighter_bottom,
                winner_name=winner_name,
                winner_slot=battle.winner_slot,
            )
        )
