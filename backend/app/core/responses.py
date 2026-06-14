from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class Meta(BaseModel):
    page: int | None = None
    limit: int | None = None
    total: int | None = None


class ApiResponse(CamelModel, Generic[T]):
    success: bool = True
    data: T
    meta: Meta | None = None


class ErrorDetail(CamelModel):
    code: str
    message: str


class ErrorResponse(CamelModel):
    success: bool = False
    error: ErrorDetail


def success_response(data: Any, meta: Meta | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True, "data": data}
    if meta is not None:
        payload["meta"] = meta.model_dump(by_alias=True)
    return payload


def error_response(code: str, message: str) -> dict[str, Any]:
    return {"success": False, "error": {"code": code, "message": message}}
