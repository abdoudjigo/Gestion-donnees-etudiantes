from fastapi import APIRouter, Query
from services.student_service import get_all_etudiants

router = APIRouter()

@router.get("/")  #reçoit la requête HTTP
def read_etudiants(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = None
):

    etudiants = get_all_etudiants(page, limit, search) #contient la logique SQL

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "search": search,
        "count": len(etudiants),
        "data": etudiants
    }