"""
routes/dashboard.py
Routes dashboard — délègue tout à dashboard_service.
"""

from fastapi import APIRouter
import services.dashboard_service as svc

router = APIRouter()


@router.get("/stats")
async def stats_globales():
    return svc.get_stats_globales()


@router.get("/classes")
async def stats_classes():
    return svc.get_stats_par_classe()


@router.get("/top10")
async def top10():
    return svc.get_top10()


@router.get("/repartition-source")
async def repartition_source():
    return svc.get_repartition_source()


