from fastapi import FastAPI
from routes import students, dashboard  

app = FastAPI(title="Projet P8 - Gestion Étudiants")

# =========================
# ROUTES
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])


# TEST API
@app.get("/")
def home():
    return {
        "message": "API Projet P8 OK 🚀"
    }