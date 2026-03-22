from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    nickname: str

class UserCreate(UserBase):
    pw: str = Field(..., min_length=8)
    
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    nickname: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: EmailStr
    pw: str

class UserLogout(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    success: bool
    message: str
    token_type: str
    access_token: str
    refresh_token: str