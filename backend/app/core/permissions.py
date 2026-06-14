from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    HR_MANAGER = "hr-manager"
    HR_ANALYST = "hr-analyst"
    DEPARTMENT_HEAD = "department-head"


ROLE_PERMISSIONS: dict[UserRole, list[str]] = {
    UserRole.ADMIN: ["*"],
    UserRole.HR_MANAGER: [
        "dashboard.view",
        "employees.view",
        "employees.edit",
        "predictions.view",
        "risk.view",
        "reports.view",
        "reports.create",
        "reports.export",
        "decisions.view",
        "decisions.create",
        "decisions.approve",
        "engagement.view",
        "engagement.create",
        "alerts.view",
        "alerts.configure",
        "benchmarks.view",
        "audit.view",
        "settings.view",
    ],
    UserRole.HR_ANALYST: [
        "dashboard.view",
        "employees.view",
        "predictions.view",
        "predictions.run",
        "predictions.train",
        "risk.view",
        "data.preprocess",
        "reports.view",
        "reports.export",
        "models.view",
        "models.train",
        "models.evaluate",
        "engagement.view",
        "benchmarks.view",
        "alerts.view",
        "settings.view",
    ],
    UserRole.DEPARTMENT_HEAD: [
        "dashboard.view",
        "employees.view.team",
        "predictions.view.team",
        "risk.view.team",
        "reports.view.team",
        "alerts.view.team",
        "decisions.feedback",
        "engagement.view.team",
        "settings.view",
    ],
}


def has_permission(role: UserRole, permission: str) -> bool:
    permissions = ROLE_PERMISSIONS[role]
    if "*" in permissions:
        return True
    if permission in permissions:
        return True
    team_variant = f"{permission}.team"
    return team_variant in permissions
