
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="Comment Analyser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Local development only
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading sentiment model...")
sentiment_model = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
)

print("Loading toxicity model...")
toxicity_model = pipeline(
    "text-classification",
    model="unitary/toxic-bert",
    top_k=None
)

class CommentRequest(BaseModel):
    comment: str

@app.get("/")
def home():
    return {"message": "Comment Analyser API is running"}

@app.post("/analyze")
def analyze(request: CommentRequest):
    comment = request.comment.strip()

    if not comment:
        return {"error": "Please enter a comment"}

    sentiment = sentiment_model(comment[:512])[0]
    toxicity_results = toxicity_model(comment[:512])[0]

    return {
        "sentiment": sentiment["label"],
        "sentiment_score": round(sentiment["score"] * 100, 2),
        "toxicity": {
            item["label"]: round(item["score"] * 100, 2)
            for item in toxicity_results
        }
    }
