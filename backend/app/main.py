from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.responses import error_response

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=error_response(exc.detail["code"], exc.detail["message"]))
    return JSONResponse(status_code=exc.status_code, content=error_response("HTTP_ERROR", str(exc.detail)))


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_: Request, exc: IntegrityError):
    message = "A record with this value already exists"
    if "email" in str(exc.orig).lower():
        message = "Email already exists"
    elif "employee_id" in str(exc.orig).lower():
        message = "Employee ID already exists"
    return JSONResponse(status_code=400, content=error_response("DUPLICATE_RECORD", message))


app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"success": True, "data": {"message": "iSON HR Analytics API", "docs": "/docs"}}
