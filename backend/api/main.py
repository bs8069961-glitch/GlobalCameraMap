from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from api.routes.cameras import router as camera_router
from api.routes.reports import router as reports_router
from api.routes.stats import router as stats_router


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Global Camera Map API",
    version="3.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(
    camera_router,
    prefix="/api"
)

app.include_router(
    reports_router,
    prefix="/api"
)

app.include_router(
    stats_router,
    prefix="/api"
)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Global Camera Map API Running",
        "version": "3.0",
        "status": "active"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "OK",
        "message": "Backend is running"
    }