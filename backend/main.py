from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 🔥 LETAKKAN DI SINI (SETELAH app dibuat, SEBELUM route)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://lectur-recommendation.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ROUTES DI BAWAH INI
# =========================

@app.get("/")
def root():
    return {"message": "API running"}
