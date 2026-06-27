from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.core.responses import Meta, success_response
from app.database import get_db
from app.dependencies import get_client_ip, require_permission
from app.models.organization import CompensationRecord, EmployeeCertification, EmployeeSkill, EmploymentEvent
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services.audit_service import log_audit
from app.services.employee_service import (
    create_employee,
    employee_import_template_csv,
    employee_import_template_xlsx,
    employee_stats,
    export_employees_csv,
    export_employees_xlsx,
    get_employee,
    import_employees_csv,
    import_employees_xlsx,
    list_employees,
    serialize_employee,
    update_employee,
)

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("")
def get_employees(
    search: str | None = None,
    department: str | None = None,
    risk: str | None = None,
    status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = "lastName",
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    items, total = list_employees(
        db,
        user,
        search=search,
        department=department,
        risk=risk,
        status_filter=status,
        page=page,
        limit=limit,
        sort=sort,
    )
    return success_response(
        [serialize_employee(e) for e in items],
        Meta(page=page, limit=limit, total=total),
    )


@router.get("/stats")
def stats(
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    return success_response(employee_stats(db, user))


@router.get("/export")
def export_employees(
    search: str | None = None,
    department: str | None = None,
    risk: str | None = None,
    status: str | None = Query(default=None, alias="status"),
    format: str = Query(default="csv", alias="format"),
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    export_kwargs = {
        "search": search,
        "department": department,
        "risk": risk,
        "status_filter": status,
    }
    if format in {"xlsx", "excel"}:
        content = export_employees_xlsx(db, user, **export_kwargs)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="employees_export.xlsx"'},
        )

    csv_content = export_employees_csv(db, user, **export_kwargs)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="employees_export.csv"'},
    )


@router.get("/import/template")
def employee_import_template(
    format: str = Query(default="csv", alias="format"),
    _: User = Depends(require_permission("employees.edit")),
):
    if format in {"xlsx", "excel"}:
        content = employee_import_template_xlsx()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="employee_import_template.xlsx"'},
        )

    csv_content = employee_import_template_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="employee_import_template.csv"'},
    )


@router.post("/import")
async def import_employees(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    if not file.filename:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FILE", "message": "Please upload a file"},
        )

    filename = file.filename.lower()
    raw = await file.read()

    if filename.endswith(".csv"):
        try:
            content = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_FILE", "message": "CSV file must be UTF-8 encoded"},
            )
        result = import_employees_csv(db, user, content)
    elif filename.endswith(".xlsx"):
        result = import_employees_xlsx(db, user, raw)
    else:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FILE", "message": "Please upload a CSV or Excel (.xlsx) file"},
        )

    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="IMPORT",
        resource="Employee",
        details=f"Imported employees: {result['created']} created, {result['skipped']} skipped",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response(result)


@router.get("/{employee_id}")
def get_employee_detail(
    employee_id: UUID,
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    employee = get_employee(db, user, employee_id)
    return success_response(serialize_employee(employee))


@router.post("")
def create_employee_endpoint(
    payload: EmployeeCreate,
    request: Request,
    user: User = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    employee = create_employee(db, user, payload)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="CREATE",
        resource="Employee",
        details=f"Created employee {employee.employee_id}",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response(serialize_employee(employee))


@router.patch("/{employee_id}")
def patch_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    request: Request,
    user: User = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    employee = update_employee(db, user, employee_id, payload)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="UPDATE",
        resource="Employee",
        details=f"Updated employee {employee.employee_id}",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response(serialize_employee(employee))


@router.get("/{employee_id}/skills")
def employee_skills(
    employee_id: UUID,
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    get_employee(db, user, employee_id)
    skills = db.query(EmployeeSkill).filter(EmployeeSkill.employee_id == employee_id).all()
    return success_response(
        [
            {
                "id": s.id,
                "skillName": s.skill_name,
                "proficiency": s.proficiency,
                "yearsExperience": s.years_experience,
            }
            for s in skills
        ]
    )


@router.get("/{employee_id}/timeline")
def employee_timeline(
    employee_id: UUID,
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    get_employee(db, user, employee_id)
    events = (
        db.query(EmploymentEvent)
        .filter(EmploymentEvent.employee_id == employee_id)
        .order_by(EmploymentEvent.event_date.desc())
        .all()
    )
    return success_response(
        [
            {
                "id": e.id,
                "eventType": e.event_type,
                "title": e.title,
                "description": e.description,
                "eventDate": e.event_date.isoformat(),
            }
            for e in events
        ]
    )


@router.get("/{employee_id}/compensation")
def employee_compensation(
    employee_id: UUID,
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    employee = get_employee(db, user, employee_id)
    record = (
        db.query(CompensationRecord)
        .filter(CompensationRecord.employee_id == employee_id)
        .order_by(CompensationRecord.effective_date.desc())
        .first()
    )
    if not record:
        return success_response(
            {
                "baseSalary": float(employee.salary),
                "bonus": round(float(employee.salary) * 0.1, 2),
                "stockOptions": 500,
                "effectiveDate": employee.hire_date.isoformat(),
                "totalCompensation": round(float(employee.salary) * 1.1, 2),
            }
        )
    total = float(record.base_salary) + float(record.bonus)
    return success_response(
        {
            "baseSalary": float(record.base_salary),
            "bonus": float(record.bonus),
            "stockOptions": record.stock_options,
            "effectiveDate": record.effective_date.isoformat(),
            "totalCompensation": round(total, 2),
        }
    )
