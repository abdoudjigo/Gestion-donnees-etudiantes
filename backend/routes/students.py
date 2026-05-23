from fastapi import APIRouter
from services.student_service import get_all_etudiants

router = APIRouter()


# =====================================================
# GET /students
@router.get("/")
def read_etudiants():
    """Retourne la liste des étudiants avec leur moyenne"""
    etudiants = get_all_etudiants()

    return {
        "success": True,
        "count": len(etudiants),
        "data": etudiants
    }