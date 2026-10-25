"use strict";

/* ==========================================================
   Comment Analyser - connected to the FastAPI backend
   Sends the comment to the API and shows the scores it returns.

   Expected response from POST /analyze:
   {
     "sentiment": "POSITIVE",          // label as text
     "sentiment_score": 98.7,          // confidence, 0 to 100
     "toxicity": { "toxic": 1.2, ... } // category scores, 0 to 100
   }
   ========================================================== */

/* ---------- Settings ---------- */
const API_URL = "https://comment-analyserr.onrender.com/analyze";
const REQUEST_TIMEOUT_MS = 15000; // give up if the server takes longer than this
const MAX_LENGTH = 500;
const MIN_LENGTH = 3;

const SAMPLE_COMMENTS = [
  { label: "Positive", text: "I love this tutorial! The examples were clear and it helped me finish my project. Great work, thank you!" },
  { label: "Neutral", text: "The meeting is scheduled for Tuesday at 3 PM. Please bring the printed report." },
  { label: "Negative", text: "This was the worst update ever. The app is slow, broken and honestly pretty disappointing." },
  { label: "Rude", text: "You are such an idiot, nobody wants to read your garbage. Shut up already." },
  { label: "Spam", text: "WIN a free prize now! Click www.example.com to claim your offer and subscribe today." }
];

/* ---------- Page elements ---------- */
const form = document.getElementById("comment-form");
const input = document.getElementById("comment");
const analyzeBtn = document.getElementById("analyze-btn");
const clearBtn = document.getElementById("clear-btn");
const errorEl = document.getElementById("input-error");
const counterEl = document.getElementById("counter");
const samplesEl = document.getElementById("samples");
const resultsEl = document.getElementById("results");

let pendingController = null; // the in-flight request, so Clear can cancel it

/* A small error type for problems we want to show to the user as-is */
class ApiError extends Error {}

/* ---------- Start-up ---------- */
function init() {
  buildSampleButtons();
  form.addEventListener("submit", handleAnalyze);
  clearBtn.addEventListener("click", handleClear);
  input.addEventListener("input", () => {
    updateCounter();
    if (errorEl.textContent) clearInputError(); // remove the error once the user edits
  });
  updateCounter();
  showEmptyState();
}

/* ---------- Event handlers ---------- */
async function handleAnalyze(event) {
  event.preventDefault();
  if (pendingController !== null) return; // already analyzing

  const text = input.value.trim();
  const problem = validateComment(text);
  if (problem) {
    showInputError(problem);
    input.focus();
    return;
  }

  clearInputError();
  setLoading(true);
  showLoadingState();

  const controller = new AbortController();
  pendingController = controller;
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const result = await requestAnalysis(text, controller.signal);
    if (pendingController !== controller) return; // user pressed Clear meanwhile
    renderResults(result);
  } catch (err) {
    if (pendingController !== controller) return;
    if (err.name === "AbortError") {
      showErrorState(timedOut
        ? "The server took too long to respond. Try again in a moment."
        : "The request was cancelled.");
    } else if (err instanceof ApiError) {
      showErrorState(err.message);
    } else {
      console.error("Could not show the results:", err);
      showErrorState("Something went wrong while showing the results. Try analyzing the comment again.");
    }
  } finally {
    clearTimeout(timeoutId);
    if (pendingController === controller) {
      pendingController = null;
      setLoading(false);
    }
  }
}

function handleClear() {
  if (pendingController !== null) {
    pendingController.abort();
    pendingController = null;
  }
  input.value = "";
  clearInputError();
  updateCounter();
  setLoading(false);
  showEmptyState();
  input.focus();
}

function handleSample(text) {
  input.value = text;
  clearInputError();
  updateCounter();
  input.focus();
}

/* ---------- Validation ---------- */
function validateComment(text) {
  if (text.length === 0) return "Enter a comment before analyzing.";
  if (text.length < MIN_LENGTH) return "Comments need at least " + MIN_LENGTH + " characters.";
  if (!/[a-z]/i.test(text)) return "Include some words. Numbers and symbols alone can't be analyzed.";
  if (text.length > MAX_LENGTH) return "Comments can be up to " + MAX_LENGTH + " characters.";
  return "";
}

function showInputError(message) {
  errorEl.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

function clearInputError() {
  errorEl.textContent = "";
  input.removeAttribute("aria-invalid");
}

function updateCounter() {
  counterEl.textContent = input.value.length + " / " + MAX_LENGTH;
}

/* ---------- Talking to the API ---------- */
async function requestAnalysis(text, signal) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ comment: text }),
      signal: signal
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    // fetch only fails like this when the server can't be reached (or CORS blocks it)
    throw new ApiError(
      "Couldn't reach the analysis server at " + API_URL +
      ". Check that FastAPI is running and that it allows requests from this page (CORS)."
    );
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response));
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new ApiError("The server replied, but the response was not valid JSON.");
  }
  return normalizeResponse(data);
}

// FastAPI errors usually look like {"detail": "text"} or {"detail": [{"msg": "..."}]}
async function readErrorMessage(response) {
  const prefix = "Server error (" + response.status + ")";
  try {
    const body = await response.json();
    const detail = body && body.detail;
    if (typeof detail === "string") return prefix + ": " + detail;
    if (Array.isArray(detail) && detail[0] && detail[0].msg) return prefix + ": " + detail[0].msg;
  } catch (err) {
    // the body wasn't JSON; fall through to the generic message
  }
  return prefix + ". Please try again.";
}

/* ---------- Turning the API response into data we can draw ---------- */
function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// "identity_attack" -> "Identity attack", "POSITIVE" -> "Positive"
function formatName(name) {
  const text = String(name).replace(/[_-]+/g, " ").trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Keeps a score between 0 and 100 with at most one decimal place
function cleanScore(value) {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

function normalizeResponse(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ApiError("The server sent a response in an unexpected format.");
  }

  // Sentiment: one label plus the model's confidence in it
  if (typeof data.sentiment !== "string" || data.sentiment.trim() === "") {
    throw new ApiError('The response is missing a "sentiment" label.');
  }
  if (!isNumber(data.sentiment_score)) {
    throw new ApiError('The response is missing a numeric "sentiment_score".');
  }

  // Toxicity: an object like { toxic: 1.2, insult: 0.4, ... }
  const toxicity = data.toxicity;
  if (!toxicity || typeof toxicity !== "object" || Array.isArray(toxicity)) {
    throw new ApiError('The response is missing the "toxicity" scores.');
  }
  const categories = Object.entries(toxicity)
    .filter(([, value]) => isNumber(value))
    .map(([name, value]) => ({ name: formatName(name), score: cleanScore(value) }));

  return {
    sentiment: {
      label: formatName(data.sentiment),
      key: data.sentiment.trim().toLowerCase(),
      score: cleanScore(data.sentiment_score)
    },
    toxicity: categories
  };
}

function getLevel(score) {
  if (score < 25) return "low";
  if (score < 60) return "medium";
  return "high";
}

function sentimentTone(key) {
  if (key.includes("pos")) return "positive";
  if (key.includes("neg")) return "negative";
  return "neutral";
}

/* ---------- Rendering ---------- */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? "Analyzing…" : "Analyze Comment";
  resultsEl.setAttribute("aria-busy", String(isLoading));
  samplesEl.querySelectorAll("button").forEach((btn) => { btn.disabled = isLoading; });
}

function buildSampleButtons() {
  SAMPLE_COMMENTS.forEach((sample) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = sample.label;
    button.addEventListener("click", () => handleSample(sample.text));
    samplesEl.appendChild(button);
  });
}

function showEmptyState() {
  resultsEl.innerHTML =
    '<div class="status-card"><p>Results will appear here. Type a comment or pick a sample, then choose <strong>Analyze Comment</strong>.</p></div>';
}

function showLoadingState() {
  resultsEl.innerHTML =
    '<div class="status-card"><div class="spinner" aria-hidden="true"></div><p>Analyzing your comment…</p></div>';
}

function showErrorState(message) {
  resultsEl.innerHTML =
    '<div class="status-card is-error"><p>' + escapeHtml(message) + "</p></div>";
}

function metricRow(label, score, tone, levelText) {
  const safeLabel = escapeHtml(label);
  const levelHtml = levelText
    ? ' <span class="level text-' + tone + '">' + levelText + "</span>"
    : "";
  return (
    '<li class="metric">' +
      '<div class="metric-head"><span class="metric-label">' + safeLabel + "</span>" +
      '<span class="metric-value">' + score + "%" + levelHtml + "</span></div>" +
      '<div class="bar" role="progressbar" aria-label="' + safeLabel + ' score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + score + '">' +
        '<span class="bar-fill tone-' + tone + '" data-width="' + score + '"></span>' +
      "</div>" +
    "</li>"
  );
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function renderResults(result) {
  // Sentiment card: the detected label and its confidence (nothing is made up)
  const s = result.sentiment;
  const sentimentHtml =
    '<p class="summary">Detected sentiment: ' + escapeHtml(s.label) + "</p>" +
    '<ul class="metrics">' +
      metricRow(s.label + " confidence", s.score, sentimentTone(s.key)) +
    "</ul>";

  // Moderation card: every toxicity category the API returned
  let moderationHtml;
  if (result.toxicity.length === 0) {
    moderationHtml = '<p class="summary">The API did not return any toxicity categories.</p>';
  } else {
    const top = result.toxicity.reduce((a, b) => (a.score >= b.score ? a : b));
    const level = getLevel(top.score);
    const summary =
      level === "low" ? "No categories flagged"
      : level === "medium" ? "Some categories would need review"
      : "Would likely be flagged for " + top.name.toLowerCase();
    moderationHtml =
      '<p class="summary">' + escapeHtml(summary) + "</p>" +
      '<ul class="metrics">' +
      result.toxicity.map((row) => {
        const rowLevel = getLevel(row.score);
        return metricRow(row.name, row.score, rowLevel, capitalize(rowLevel));
      }).join("") +
      "</ul>";
  }

  resultsEl.innerHTML =
    '<div class="results-grid">' +
      '<article class="result-card">' +
        "<h2>Sentiment</h2>" +
        '<span class="tag">API result</span>' +
        sentimentHtml +
        '<p class="footnote">Confidence in the detected label, as returned by the API.</p>' +
      "</article>" +
      '<article class="result-card">' +
        "<h2>Text moderation</h2>" +
        '<span class="tag">API result</span>' +
        moderationHtml +
        '<p class="footnote">Each category is scored from 0% to 100%.</p>' +
      "</article>" +
    "</div>";

  // Fill the bars on the next frame so the width change animates
  requestAnimationFrame(() => {
    resultsEl.querySelectorAll(".bar-fill").forEach((bar) => {
      bar.style.width = bar.dataset.width + "%";
    });
  });
}

init();
