from fastapi import FastAPI
from routes import students, dashboard  
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Projet P8 - Gestion Étudiants")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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