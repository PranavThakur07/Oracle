import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, decision
from app.config import PORT, HOST

# Configure logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("oracle_main")

# Auto-create SQLAlchemy Database Tables
try:
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Error initializing database tables: {e}")

# Initialize FastAPI App
app = FastAPI(
    title="ORACLE API",
    description="Backend services for the ORACLE Decision Intelligence Platform MVP.",
    version="1.0.0"
)

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for specific origin (e.g. http://localhost:5173) in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
# Prefix matches the routing declarations
app.include_router(auth.router)
app.include_router(decision.router) # Prefix handled in decision router definition (/api/history) but wait!
# Let's verify decision.py prefixes. In decision.py we used prefix="/api/history".
# Wait, let's verify if the POST /api/analyze is under this prefix.
# In decision.py we have:
# router = APIRouter(prefix="/api/history", tags=["decisions"])
# and @router.post("/analyze", response_model=DecisionOut) -> so it mounts to /api/history/analyze.
# Wait! The requirement says:
# POST /api/analyze
# Let's adjust decision.py's endpoints so they match:
# - POST /api/analyze
# - GET /api/history
# - GET /api/history/{id}
# - POST /api/history/{id}/followup
# - DELETE /api/history/{id}
# - GET /api/history/{id}/export (or POST /api/export)
# Wait, let's double check if we need to refine the router prefix or route mapping.
# If decision router is prefix="", then we can define:
# @router.post("/api/analyze")
# @router.get("/api/history")
# etc. This is cleaner and matches the exact API specifications!
# Let's verify this. Let's make sure the paths align with:
# POST /api/analyze
# GET /api/history
# GET /api/history/{id}
# POST /api/history/{id}/followup
# DELETE /api/history/{id}
# GET /api/history/{id}/export (PDF export is GET or POST, both are fine, let's support GET or POST as requested).
# Let's check: in decision.py we wrote:
# router = APIRouter(prefix="/api/history", tags=["decisions"])
# and @router.post("/analyze") -> which makes it /api/history/analyze.
# Let's fix this in decision.py or in main.py by writing the routes without a shared prefix, or putting the prefix as "/api" and routes as "/analyze", "/history", etc.
# That is much cleaner! Let's modify decision.py to have prefix="/api" and define:
# - @router.post("/analyze") -> /api/analyze
# - @router.get("/history") -> /api/history
# - @router.get("/history/{id}") -> /api/history/{id}
# - @router.put("/history/{id}/favorite") -> /api/history/{id}/favorite
# - @router.delete("/history/{id}") -> /api/history/{id}
# - @router.post("/history/{id}/followup") -> /api/history/{id}/followup
# - @router.get("/history/{id}/export") -> /api/history/{id}/export
# Let's double check what the user asked for:
# POST /api/analyze
# GET /api/history
# GET /api/history/{id}
# DELETE /api/history/{id}
# POST /api/export (wait, user requested: POST /api/export. We can support POST /api/export or GET /api/history/{id}/export. Let's make sure we support both or exactly POST /api/export!)
# Let's write a replacement for decision.py to adjust routes to match this prefix structure!
# Let's create main.py first, then fix decision.py to make sure the router mapping is perfectly matched.
