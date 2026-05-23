from fastapi import APIRouter
from services.dashboard_service import get_dashboard_stats, get_stats_par_classe, get_top10

router = APIRouter()


# =====================================================
# GET /dashboard/stats
# KPI globaux : total étudiants, moyenne, notes
# =====================================================
@router.get("/stats")
def dashboard_stats():
    return {"success": True, "data": get_dashboard_stats()}


# =====================================================
# GET /dashboard/classes
# répartition nb étudiants + moyenne par classe
# =====================================================
@router.get("/classes")
def dashboard_classes():
    return {"success": True, "data": get_stats_par_classe()}


# =====================================================
# GET /dashboard/top10
# top 10 meilleures moyennes (sans notes exclus)
# =====================================================
@router.get("/top10")
def dashboard_top10():
    return {"success": True, "data": get_top10()}