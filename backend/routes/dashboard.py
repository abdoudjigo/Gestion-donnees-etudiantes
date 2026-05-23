from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_etudiants():
    return{"message": "route etudiant OKKKK!"}
