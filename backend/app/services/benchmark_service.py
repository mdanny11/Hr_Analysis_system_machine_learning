from sqlalchemy.orm import Session

from app.models.user import User
from app.services.dashboard_service import compute_kpis
from app.services.employee_service import list_employees_query

INDUSTRY_BENCHMARKS: dict[str, dict[str, float]] = {
    "technology": {
        "attritionRate": 13.2,
        "avgTenure": 3.8,
        "avgSatisfaction": 7.1,
        "trainingHours": 20,
        "internalMobility": 15,
        "timeToFill": 48,
    },
    "finance": {
        "attritionRate": 10.5,
        "avgTenure": 4.5,
        "avgSatisfaction": 7.4,
        "trainingHours": 22,
        "internalMobility": 12,
        "timeToFill": 45,
    },
    "healthcare": {
        "attritionRate": 15.8,
        "avgTenure": 3.2,
        "avgSatisfaction": 6.8,
        "trainingHours": 18,
        "internalMobility": 10,
        "timeToFill": 52,
    },
    "retail": {
        "attritionRate": 18.5,
        "avgTenure": 2.5,
        "avgSatisfaction": 6.5,
        "trainingHours": 16,
        "internalMobility": 8,
        "timeToFill": 35,
    },
    "manufacturing": {
        "attritionRate": 11.8,
        "avgTenure": 5.2,
        "avgSatisfaction": 7.0,
        "trainingHours": 24,
        "internalMobility": 14,
        "timeToFill": 40,
    },
}

TOP_QUARTILE: dict[str, float] = {
    "attritionRate": 8.5,
    "avgTenure": 5.5,
    "avgSatisfaction": 8.2,
    "trainingHours": 40,
    "internalMobility": 28,
    "timeToFill": 32,
}


def _employee_averages(db: Session, user: User) -> dict[str, float]:
    employees = list_employees_query(db, user).all()
    if not employees:
        return {
            "trainingHours": 0.0,
            "workLifeBalance": 0.0,
            "avgPerformance": 0.0,
            "internalMobility": 18.0,
            "timeToFill": 42.0,
        }
    return {
        "trainingHours": round(sum(e.training_hours for e in employees) / len(employees), 1),
        "workLifeBalance": round(sum(e.work_life_balance for e in employees) / len(employees), 1),
        "avgPerformance": round(sum(e.performance_score for e in employees) / len(employees), 1),
        "internalMobility": 18.0,
        "timeToFill": 42.0,
    }


def _build_metrics(company: dict, industry: dict, top: dict) -> list[dict]:
    return [
        {
            "metric": "Attrition Rate",
            "company": company["attritionRate"],
            "industry": industry["attritionRate"],
            "top25": top["attritionRate"],
            "unit": "%",
            "higherIsBetter": False,
        },
        {
            "metric": "Avg Tenure",
            "company": company["avgTenure"],
            "industry": industry["avgTenure"],
            "top25": top["avgTenure"],
            "unit": " years",
            "higherIsBetter": True,
        },
        {
            "metric": "Employee Satisfaction",
            "company": company["avgSatisfaction"],
            "industry": industry["avgSatisfaction"],
            "top25": top["avgSatisfaction"],
            "unit": "/10",
            "higherIsBetter": True,
        },
        {
            "metric": "Training Hours/Year",
            "company": company["trainingHours"],
            "industry": industry["trainingHours"],
            "top25": top["trainingHours"],
            "unit": " hrs",
            "higherIsBetter": True,
        },
        {
            "metric": "Internal Mobility",
            "company": company["internalMobility"],
            "industry": industry["internalMobility"],
            "top25": top["internalMobility"],
            "unit": "%",
            "higherIsBetter": True,
        },
        {
            "metric": "Time to Fill",
            "company": company["timeToFill"],
            "industry": industry["timeToFill"],
            "top25": top["timeToFill"],
            "unit": " days",
            "higherIsBetter": False,
        },
    ]


def _build_radar(company: dict, industry: dict, top: dict) -> list[dict]:
    def score(value: float, scale: float = 10) -> float:
        return round(min(100, max(0, (value / scale) * 100)), 1)

    return [
        {
            "metric": "Retention",
            "company": company["retentionRate"],
            "industry": round(100 - industry["attritionRate"], 1),
            "topPerformer": round(100 - top["attritionRate"], 1),
        },
        {
            "metric": "Satisfaction",
            "company": score(company["avgSatisfaction"]),
            "industry": score(industry["avgSatisfaction"]),
            "topPerformer": score(top["avgSatisfaction"]),
        },
        {
            "metric": "Engagement",
            "company": score(company["avgSatisfaction"] * 0.95),
            "industry": score(industry["avgSatisfaction"] * 0.95),
            "topPerformer": score(top["avgSatisfaction"] * 0.95),
        },
        {
            "metric": "Development",
            "company": score(company["trainingHours"], 40),
            "industry": score(industry["trainingHours"], 40),
            "topPerformer": score(top["trainingHours"], 40),
        },
        {
            "metric": "Recognition",
            "company": score(company["avgPerformance"]),
            "industry": score(industry.get("avgSatisfaction", 7) * 0.9),
            "topPerformer": score(top["avgSatisfaction"] * 0.95),
        },
        {
            "metric": "Work-Life",
            "company": score(company["workLifeBalance"]),
            "industry": score(industry.get("avgSatisfaction", 7) * 0.98),
            "topPerformer": score(top["avgSatisfaction"]),
        },
    ]


def _build_gaps(metrics: list[dict]) -> list[dict]:
    gaps: list[dict] = []
    for item in metrics:
        if item["higherIsBetter"]:
            gap_pct = round(((item["company"] - item["top25"]) / max(item["top25"], 1)) * 100, 1)
            benchmark = item["top25"]
        else:
            gap_pct = round(((item["top25"] - item["company"]) / max(item["top25"], 1)) * 100, 1)
            benchmark = item["top25"]
        priority = "high" if gap_pct < -20 else "medium" if gap_pct < 0 else "low"
        gaps.append(
            {
                "area": item["metric"],
                "current": item["company"],
                "benchmark": benchmark,
                "gap": gap_pct,
                "priority": priority,
            }
        )
    return gaps


def _build_summary(metrics: list[dict], company: dict, industry: dict) -> dict:
    above_count = sum(
        1
        for item in metrics
        if (item["company"] > item["industry"] if item["higherIsBetter"] else item["company"] < item["industry"])
    )
    improvement_areas = len(metrics) - above_count
    retention_delta = round(industry["attritionRate"] - company["attritionRate"], 1)
    ranking = "Top 30%" if above_count >= 5 else "Top 50%" if above_count >= 3 else "Below Avg"
    return {
        "aboveIndustryDelta": retention_delta,
        "metricsAboveAvg": above_count,
        "metricsTotal": len(metrics),
        "improvementAreas": improvement_areas,
        "industryRanking": ranking,
    }


def get_industry_benchmarks(db: Session, user: User, industry: str = "technology") -> dict:
    industry_key = industry.lower()
    industry_data = INDUSTRY_BENCHMARKS.get(industry_key, INDUSTRY_BENCHMARKS["technology"])
    kpis = compute_kpis(db, user)
    averages = _employee_averages(db, user)

    company = {
        "attritionRate": kpis["attritionRate"],
        "avgTenure": kpis["avgTenure"],
        "avgSatisfaction": kpis["avgSatisfaction"],
        "retentionRate": kpis["retentionRate"],
        "trainingHours": averages["trainingHours"],
        "internalMobility": averages["internalMobility"],
        "timeToFill": averages["timeToFill"],
        "workLifeBalance": averages["workLifeBalance"],
        "avgPerformance": averages["avgPerformance"],
    }

    metrics = _build_metrics(company, industry_data, TOP_QUARTILE)
    radar = _build_radar(company, industry_data, TOP_QUARTILE)
    gaps = _build_gaps(metrics)
    summary = _build_summary(metrics, company, industry_data)

    return {
        "industry": industry_key,
        **industry_data,
        "companyAttritionRate": company["attritionRate"],
        "companyTenure": company["avgTenure"],
        "companySatisfaction": company["avgSatisfaction"],
        "companyRetentionRate": company["retentionRate"],
        "metrics": metrics,
        "radar": radar,
        "gaps": gaps,
        "summary": summary,
    }


def get_competitors(db: Session, user: User) -> list[dict]:
    kpis = compute_kpis(db, user)
    return [
        {"company": "Industry Avg", "attritionRate": 13.2, "retentionPrograms": 3, "satisfaction": 7.1, "tenure": 3.8, "training": 20},
        {"company": "Competitor A", "attritionRate": 11.5, "retentionPrograms": 5, "satisfaction": 7.4, "tenure": 4.2, "training": 28},
        {"company": "Competitor B", "attritionRate": 14.8, "retentionPrograms": 2, "satisfaction": 6.9, "tenure": 3.5, "training": 18},
        {
            "company": "Your Company",
            "attritionRate": kpis["attritionRate"],
            "retentionPrograms": 4,
            "satisfaction": kpis["avgSatisfaction"],
            "tenure": kpis["avgTenure"],
            "training": _employee_averages(db, user)["trainingHours"],
        },
    ]


def get_best_practices() -> list[dict]:
    return [
        {"title": "Regular Stay Interviews", "impact": "high", "adoption": 45},
        {"title": "Flexible Work Arrangements", "impact": "high", "adoption": 78},
        {"title": "Career Pathing Programs", "impact": "medium", "adoption": 52},
    ]
