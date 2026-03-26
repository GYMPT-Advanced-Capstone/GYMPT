from pydantic import BaseModel, ConfigDict, Field


class ExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="운동 종목 ID", example=1)
    name: str = Field(..., description="운동 이름", example="Push Up")
    description: str | None = Field(
        default=None,
        description="운동 설명",
        example="가슴과 팔 근육을 사용하는 대표적인 맨몸 운동",
    )
