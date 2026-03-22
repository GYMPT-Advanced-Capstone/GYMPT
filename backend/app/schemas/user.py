from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    pw: str
    name: str
    nickname: str
    # phnum: str

class UserLogin(BaseModel):
    email: str
    pw: str

class UserLogout(BaseModel):
    refresh_token: str

class DefaultResponse(BaseModel):
    success: bool
    message: str

class TokenResponse(BaseModel):
    success: bool
    message: str
    token_type: str
    access_token: str
    refresh_token: str