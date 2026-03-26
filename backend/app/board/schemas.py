from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BoardResponse(BaseModel):
    board_no: int
    title: str
    content: str
    imgpath: str | None
    writer: str
    likes: int
    upload_date: datetime

    model_config = ConfigDict(from_attributes=True)
