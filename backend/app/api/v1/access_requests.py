from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.responses import success_response
from app.database import get_db
from app.dependencies import get_client_ip, require_admin
from app.models.user import AccessRequestStatus, User
from app.schemas.auth import AccessRequestApproveBody, AccessRequestCreate, AccessRequestRejectBody
from app.services.auth_service import (
    approve_access_request,
    create_access_request,
    get_access_request,
    list_access_requests,
    reject_access_request,
    serialize_access_request,
    serialize_user,
)

router = APIRouter(prefix="/access-requests", tags=["access-requests"])


@router.post("")
def submit_access_request(payload: AccessRequestCreate, db: Session = Depends(get_db)):
    record = create_access_request(db, payload.model_dump())
    return success_response(
        {
            "referenceId": record.reference_id,
            "status": record.status.value,
            "message": "Access request submitted successfully",
        }
    )


@router.get("")
def get_all_access_requests(
    status: AccessRequestStatus | None = Query(default=None),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    records = list_access_requests(db, status)
    return success_response([serialize_access_request(r) for r in records])


@router.get("/{request_id}")
def get_access_request_detail(
    request_id: UUID,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    record = get_access_request(db, request_id)
    return success_response(serialize_access_request(record))


@router.post("/{request_id}/approve")
def approve_request(
    request_id: UUID,
    payload: AccessRequestApproveBody,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    record, user = approve_access_request(
        db,
        request_id,
        payload.role,
        payload.password,
        admin,
        get_client_ip(request),
    )
    return success_response(
        {
            "request": serialize_access_request(record),
            "user": serialize_user(user),
            "message": "Access request approved and user account created",
        }
    )


@router.post("/{request_id}/reject")
def reject_request(
    request_id: UUID,
    payload: AccessRequestRejectBody,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    record = reject_access_request(db, request_id, admin, payload.reason, get_client_ip(request))
    return success_response(
        {
            "request": serialize_access_request(record),
            "message": "Access request rejected",
        }
    )
