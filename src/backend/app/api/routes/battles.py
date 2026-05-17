from collections.abc import Sequence

from fastapi import APIRouter, HTTPException, status

from app.schemas.battle import BattleCreate, BattleRecord
from app.services.battle_service import BattleService

router = APIRouter(prefix="/battles", tags=["battles"])
service = BattleService()


@router.get("", response_model=Sequence[BattleRecord])
def list_battles() -> Sequence[BattleRecord]:
    return service.list_battles()


@router.delete("")
def clear_battles() -> dict[str, int]:
    deleted_count = service.clear_battles()
    return {"deleted": deleted_count}


@router.post("", response_model=BattleRecord, status_code=status.HTTP_201_CREATED)
def create_battle(payload: BattleCreate) -> BattleRecord:
    try:
        return service.register_battle(payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
