# Comment Analyser — Development Plan

## 1. Project Overview

Comment Analyser is an AI-powered web application that analyses YouTube comments to identify audience sentiment, potentially toxic content, recurring phrases, common topics, and audience complaints.

Users will paste a YouTube video URL into the application. The backend will retrieve available comments through the official YouTube Data API v3 and analyse up to 500 comments per analysis.

The application will support multiple languages where compatible models are available and validated. Results will be presented through an interactive dashboard with charts, statistics, filters, and comment-level insights.

## 2. Finalised Project Scope

- **Input method:** YouTube video URL only.
- **Comment limit:** Maximum of 500 comments per analysis.
- **Language support:** Multiple languages, subject to model compatibility and evaluation.
- **Sentiment analysis:** Positive, negative, and neutral classification using an appropriate three-class or equivalent model.
- **Toxicity detection:** Identify potentially toxic comments and supported toxicity categories.
- **Visualisation:** Interactive sentiment and toxicity charts.
- **Repeated content:** Detect duplicate comments and frequently occurring phrases.
- **Topic analysis:** Identify common discussion themes, complaints, requests, and praise.
- **Privacy:** Minimise data retention and protect API credentials.
- **Deployment:** Frontend on Vercel and Python backend on a compatible hosting platform.
- **Account connection:** Not included in the initial version. Users will not need to connect their Google accounts.

## 3. Existing Project Structure

The development must start with the existing project files rather than rebuilding the application unnecessarily.

Expected project structure:

    comment-analyser/
    ├── index.html
    ├── style.css
    ├── script.js
    ├── app.py
    ├── requirements.txt
    ├── README.md
    ├── DEVELOPMENT.md
    ├── .gitignore
    └── .env.example

The `.env` file will contain local secrets and must not be committed to GitHub. The `.env.example` file will contain placeholder variable names only.

Additional files or folders may be introduced when required for configuration, testing, or deployment.

## 4. Technology Stack

### Frontend
- HTML
- CSS
- JavaScript
- Chart.js for interactive charts

### Backend
- Python
- FastAPI
- Uvicorn

### Machine Learning
- Hugging Face Transformers
- PyTorch where required by the selected models
- A multilingual sentiment model capable of three-class classification
- A suitable multilingual toxicity model or an explicitly defined language-specific fallback

### External API
- YouTube Data API v3 for retrieving accessible comments

### Deployment
- Vercel for the frontend
- A Python-compatible backend host with sufficient memory, storage, and request-processing capacity

## 5. Implementation Steps

### Phase 1 — Inspect and stabilise the existing application

1. Review `index.html`, `style.css`, `script.js`, and `app.py`.
2. Confirm the existing sentiment and toxicity analysis endpoint works.
3. Remove the obsolete simulated-results banner.
4. Confirm the frontend displays actual backend responses and meaningful error messages.
5. Document the current API request and response formats.
6. Create a working backup or Git commit before major changes.

**Completion criteria:** The existing text-analysis application works reliably before YouTube integration begins.

### Phase 2 — Configure YouTube Data API v3

1. Create or select a Google Cloud project.
2. Enable YouTube Data API v3.
3. Create an API key and restrict it according to Google's supported security options.
4. Store the API key in a backend environment variable named `YOUTUBE_API_KEY`.
5. Never place the API key in `index.html`, `script.js`, or other frontend code.
6. Implement URL validation to extract and validate the YouTube video ID.
7. Retrieve video metadata and available top-level comments using the official API.
8. Handle videos with disabled comments, invalid IDs, inaccessible videos, and API errors.

**Completion criteria:** The application accepts a valid video URL and retrieves available comments without exposing the API key.

### Phase 3 — Enforce comment and API quota limits

1. Set a hard limit of 500 comments per analysis.
2. Retrieve comments in pages using the API's pagination mechanism.
3. Stop retrieval when the limit is reached or no more comments are available.
4. Track the number of comments retrieved, skipped, and analysed.
5. Handle quota exhaustion and rate-limit responses without repeated uncontrolled requests.
6. Avoid unnecessary metadata and comment requests.
7. Explain when fewer than 500 comments were available.

The 500-comment limit is an application-level limit, not a guarantee that every video's comments can be retrieved. YouTube API quota limits remain applicable, and pagination requests consume quota.

**Completion criteria:** No analysis processes more than 500 retrieved comments, and API failures produce clear user-facing messages.

### Phase 4 — Build multilingual sentiment analysis

1. Select a pretrained multilingual sentiment model suitable for the supported languages.
2. Prefer a model that explicitly supports positive, neutral, and negative sentiment.
3. Verify its documented language coverage and model licence.
4. Test representative comments in each target language.
5. Batch predictions to improve performance.
6. Return the predicted label and relevant model scores.
7. Calculate sentiment counts and percentages from the comments actually analysed.
8. Mark unsupported languages or uncertain predictions where possible.

**Important:** Model confidence is not the same as verified accuracy. Sarcasm, slang, mixed-language text, and context-dependent comments may still be misclassified.

**Completion criteria:** Sentiment labels, scores, and aggregate statistics are internally consistent and tested on a labelled sample.

### Phase 5 — Add toxicity analysis

1. Evaluate the existing Toxic-BERT model for language compatibility.
2. Select a multilingual toxicity model or use language-specific models where appropriate.
3. Define which toxicity categories the selected model actually supports.
4. Configure documented score thresholds for highlighting potentially toxic comments.
5. Return category scores and flag results for review where needed.
6. Calculate the percentage of comments flagged by the selected threshold.
7. Test false positives and false negatives on representative examples.

**Completion criteria:** Toxicity results accurately reflect the selected model's output and are clearly labelled as predictions, not definitive judgements.

### Phase 6 — Build the analytics dashboard

Display the following information:

- Video title.
- Number of comments retrieved.
- Number of comments analysed.
- Positive, neutral, and negative comment counts and percentages.
- Potentially toxic comment count and percentage.
- Sentiment distribution chart.
- Toxicity category chart where supported.
- A searchable list of analysed comments.
- Filters for sentiment and toxicity.
- A clear message when results are incomplete.

Use Chart.js for interactive charts. All percentages must be calculated from actual analysis results rather than simulated values.

**Completion criteria:** Dashboard statistics agree with the underlying comment-level results.

### Phase 7 — Implement repeated phrases and topic analysis

1. Detect exact duplicate comments.
2. Normalise text carefully before comparing comments.
3. Detect frequently occurring words and meaningful phrases.
4. Filter common stop words while preserving important negations and complaint terms.
5. Group similar comments using a suitable text-similarity method.
6. Identify recurring complaints, feature requests, praise, and questions.
7. Display representative comments for each detected theme.
8. Add optional summarisation only after the underlying grouping is tested.

**Completion criteria:** The application presents understandable repeated phrases and themes without claiming that simple frequency counts prove the meaning or intent of comments.

### Phase 8 — Improve reliability and performance

1. Load machine-learning models once per backend process rather than once per request.
2. Use batched inference where supported.
3. Validate input length and reject malformed requests.
4. Add appropriate timeouts and clear failure responses.
5. Limit concurrent heavy analysis jobs according to available resources.
6. Prevent repeated requests from exhausting API quota or server resources.
7. Test the application with different comment volumes, including 500 comments.
8. Avoid logging API keys, authentication secrets, or raw comment text unnecessarily.

**Completion criteria:** The backend handles normal inputs, large permitted batches, and expected API or model failures without crashing.

### Phase 9 — Security and privacy

1. Store secrets in local environment variables or the hosting provider's secret-management settings.
2. Add `.env`, virtual environments, Python caches, model caches, and private files to `.gitignore`.
3. Commit only `.env.example` with placeholder values.
4. Keep the YouTube API key on the backend.
5. Validate all user input on the backend.
6. Restrict CORS to the actual frontend origin in production.
7. Apply sensible rate limits to prevent abuse.
8. Avoid storing retrieved comments persistently in the first version.
9. Do not retain analysis history unless a future feature explicitly requires it.
10. Publish a clear privacy notice describing data processing, logging, retention, and third-party hosting.
11. Review applicable YouTube API policies before storing, exporting, or reusing API data.

**Completion criteria:** No secrets are exposed in frontend files or the public repository, and data handling is documented.

A `.gitignore` file does not remove files already committed or guarantee privacy. Any previously exposed credentials must be rotated.

### Phase 10 — Testing and model evaluation

Test the following scenarios:

- Valid YouTube video with accessible comments.
- Invalid or malformed YouTube URL.
- Video with comments disabled.
- Video with fewer than 500 available comments.
- Video with more than 500 available comments.
- API quota exhaustion.
- Network failure and backend timeout.
- Empty, duplicated, multilingual, and very long comments.
- Positive, neutral, negative, sarcastic, and ambiguous comments.
- Toxic and non-toxic examples across supported languages.
- Incorrect sentiment or toxicity predictions.
- Consistency between chart totals and analysed comment totals.

Create a labelled evaluation dataset covering the intended languages. Measure appropriate metrics such as precision, recall, and F1-score for sentiment and toxicity classification.

**Completion criteria:** Known limitations are documented, aggregate results are validated, and performance is acceptable for the intended hosting environment.

### Phase 11 — Deployment

1. Upload the reviewed project to GitHub.
2. Confirm that no `.env` file, API key, credentials, or private data is included.
3. Deploy the frontend to Vercel.
4. Deploy the Python backend to a compatible hosting platform.
5. Configure `YOUTUBE_API_KEY` in the backend host's environment settings.
6. Configure the frontend to use the deployed backend URL.
7. Restrict production CORS to the deployed frontend domain.
8. Configure health checks, request limits, and error reporting.
9. Test the deployed application using a valid YouTube URL.
10. Verify that secrets are not visible in browser developer tools or network responses.

**Completion criteria:** The deployed application retrieves accessible comments, performs analysis, displays accurate aggregate results, and handles errors safely.

## 6. API Response Design

The backend should return structured JSON containing:

- Video metadata.
- Number of comments retrieved.
- Number of comments analysed.
- Sentiment labels and available scores.
- Toxicity categories and available scores.
- Aggregate sentiment counts and percentages.
- Aggregate toxicity statistics.
- Repeated phrases and detected themes when enabled.
- Warnings about partial retrieval or unsupported languages.

The frontend must render actual API data and must not generate simulated analysis results.

## 7. Scope Exclusions for Version 1

The first release will not include:

- Google account connection or OAuth.
- Automatic analysis of every video on a channel.
- Continuous monitoring of new comments.
- Guaranteed access to all YouTube comments.
- Guaranteed detection of sarcasm or every toxic comment.
- Guaranteed multilingual accuracy without evaluation.
- Permanent comment storage or user accounts.
- AI-generated recommendations that have not been validated.

These features can be considered after the core application is stable.

## 8. Final Definition of Done

The project is ready for its first release when:

- A user can submit a valid YouTube video URL.
- The application retrieves accessible comments within the 500-comment limit.
- API keys remain on the backend.
- Supported-language sentiment and toxicity models return real predictions.
- Dashboard statistics match the analysed comments.
- Repeated phrases and topic results are clearly distinguished from verified facts.
- Errors, quota limits, and partial results are handled properly.
- Tests document model accuracy and known limitations.
- The frontend and backend are deployed and communicating correctly.
- The public GitHub repository contains no secrets or unintended private data.
- The privacy notice accurately describes data handling and retention.

## 9. Development Priority

Build and verify the application in this order:

1. Stabilise existing text analysis.
2. Integrate YouTube URL validation and comment retrieval.
3. Enforce the 500-comment limit and API quota handling.
4. Add and evaluate multilingual sentiment and toxicity models.
5. Build dashboard charts and filters.
6. Implement repeated phrase and topic analysis.
7. Test security, reliability, and performance.
8. Deploy the frontend and backend.
9. Add future features only after the first release is stable.