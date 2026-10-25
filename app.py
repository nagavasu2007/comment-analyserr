
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from huggingface_hub import InferenceClient

app = FastAPI(title="Comment Analyser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_TOKEN = os.getenv("HF_TOKEN")

sentiment_model = "distilbert/distilbert-base-uncased-finetuned-sst-2-english"
toxicity_model = "unitary/toxic-bert"

client = InferenceClient(
    provider="hf-inference",
    api_key=HF_TOKEN,
)

class CommentRequest(BaseModel):
    comment: str = Field(min_length=1, max_length=500)

@app.get("/")
def home():
    return {"message": "Comment Analyser API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
def analyze(request: CommentRequest):
    comment = request.comment.strip()

    if not comment:
        raise HTTPException(
            status_code=400,
            detail="Please enter a comment."
        )

    if not HF_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="The analysis service is not configured yet."
        )

    try:
        sentiment_results = client.text_classification(
            comment[:512],
            model=sentiment_model,
        )

        toxicity_results = client.text_classification(
            comment[:512],
            model=toxicity_model,
            function_to_apply="sigmoid",
        )

        sentiment = max(
            sentiment_results,
            key=lambda item: item.score
        )

        return {
            "sentiment": sentiment.label,
            "sentiment_score": round(sentiment.score * 100, 2),
            "toxicity": {
                item.label: round(item.score * 100, 2)
                for item in toxicity_results
            },
        }

    except Exception as e:
        print(f"AI inference error: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(
            status_code=502,
            detail=f"AI inference failed: {type(e).__name__}: {e}",
        )
