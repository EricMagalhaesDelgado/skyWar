from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BattleCreate(BaseModel):
    fighter_top: str = Field(min_length=1, max_length=30)
    fighter_bottom: str = Field(min_length=1, max_length=30)
    winner_name: str = Field(min_length=1, max_length=30)
    winner_slot: Literal["top", "bottom"]


class BattleRecord(BaseModel):
    id: int
    fighter_top: str
    fighter_bottom: str
    winner_name: str
    winner_slot: Literal["top", "bottom"]
    created_at: datetime
