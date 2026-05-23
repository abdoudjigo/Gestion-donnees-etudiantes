from fastapi import APIRouter, Query
from services.student_service import get_all_etudiants

router = APIRouter()

@router.get("/")
def read_etudiants(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):

    etudiants = get_all_etudiants(page, limit)

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "count": len(etudiants),
        "data": etudiants
    }