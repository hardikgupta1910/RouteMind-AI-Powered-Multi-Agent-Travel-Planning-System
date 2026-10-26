import { useEffect, useRef, useState } from "react";
import { api } from "./api";

const STORAGE_KEY = "routemind-editorial-v2";

const emptySession = {
  threadId: null,
  result: null,
  request: "",
};

const starters = [
  {
    number: "01",
    title: "A long weekend",
    description: "Three days. A new city. Room to wander.",
    query:
      "Plan a relaxed 3-day trip from Mumbai to Jaipur under ₹25,000 per person. Include flights, stays, local food, and sightseeing.",
  },
  {
    number: "02",
    title: "The slower route",
    description: "Less rushing. More time in each place.",
    query:
      "Plan a relaxed 5-day Kerala trip for two people. Prioritize comfortable stays, local food, and a realistic daily schedule.",
  },
  {
    number: "03",
    title: "Closer to home",
    description: "A short escape without a complicated plan.",
    query:
      "Suggest a budget weekend trip from Bhopal. Include transport, accommodation, local food, and approximate costs.",
  },
];

function readSession() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    if (
      value &&
      typeof value.threadId === "string" &&
      value.result &&
      typeof value.result === "object"
    ) {
      return {
        threadId: value.threadId,
        result: value.result,
        request: typeof value.request === "string" ? value.request : "",
      };
    }
  } catch {
    // Start fresh if storage is unavailable or invalid.
  }

  return emptySession;
}

function asText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value, null, 2);
}

function cleanText(value) {
  return asText(value)
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/```[^\n]*\n?/g, "")
    .replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, "")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      "$1 ($2)"
    )
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[ \t]*[-*][ \t]+/gm, "• ")
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const SECTION_HEADINGS = new Set([
  "trip overview",
  "overview",
  "day-by-day itinerary",
  "estimated budget",
  "budget",
  "practical notes",
  "practical tips",
  "practical tips & local flavor",
  "suggested packing list",
  "packing list",
  "flight information",
  "hotel suggestions",
  "weather information",
  "final recommendations",
  "final thought",
]);

function TravelText({ value }) {
  const text = cleanText(value);

  if (!text) {
    return (
      <p className="quiet">
        No information returned for this section.
      </p>
    );
  }

  const lines = text.split("\n");

  return (
    <div className="travel-document">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) return null;

        const headingKey = line
          .replace(/^\d+[.)]\s*/, "")
          .replace(/:$/, "")
          .toLowerCase();

        if (/^day[\s\u00a0\u202f]+\d+\b/i.test(line)) {
          return (
            <h3 className="itinerary-day" key={index}>
              {line}
            </h3>
          );
        }

        if (SECTION_HEADINGS.has(headingKey)) {
          return (
            <h3 className="itinerary-heading" key={index}>
              {line}
            </h3>
          );
        }

        const labeledLine = line.match(
          /^(Morning|Afternoon|Evening|Stay|Breakfast|Lunch|Dinner|Flights?|Accommodation|Transport|Food|Activities|Total)\s*:\s*(.*)$/i
        );

        if (labeledLine) {
          return (
            <div className="itinerary-row" key={index}>
              <span className="itinerary-label">
                {labeledLine[1]}
              </span>
              <p>{labeledLine[2]}</p>
            </div>
          );
        }

        if (line.startsWith("• ")) {
          return (
            <div className="itinerary-bullet" key={index}>
              <span aria-hidden="true">•</span>
              <p>{line.slice(2)}</p>
            </div>
          );
        }

        return (
          <p className="itinerary-paragraph" key={index}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

function Spinner({ label }) {
  return (
    <span className="loading-inline">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function App() {
  const [page, setPage] = useState("plan");
  const [session, setSession] = useState(readSession);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [section, setSection] = useState("itinerary");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [online, setOnline] = useState(null);
  const [guideQuestion, setGuideQuestion] = useState("");
  const [guideAnswer, setGuideAnswer] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");

  const inputRef = useRef(null);
  const resultRef = useRef(null);

  const result = session.result;
  const pending = result?.requires_approval === true;
  const disabled = Boolean(busy);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Saving is optional; the current page remains usable.
    }
  }, [session]);

  useEffect(() => {
    let active = true;

    api.health()
      .then(() => active && setOnline(true))
      .catch(() => active && setOnline(false));

    return () => {
      active = false;
    };
  }, []);

  function acceptResult(data, request = session.request) {
    setSession({
      threadId: data.thread_id,
      result: data,
      request,
    });
    setSection("itinerary");
    setFeedback("");

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  function resetTrip() {
    if (disabled) return;

    if (
      pending &&
      !window.confirm(
        "Start a new trip? This clears the displayed draft, not its saved backend checkpoint."
      )
    ) {
      return;
    }

    setSession({ ...emptySession });
    setQuery("");
    setFeedback("");
    setError("");
    setSection("itinerary");
    setPage("plan");
  }

  async function plan(event) {
    event.preventDefault();
    const message = query.trim();
    if (!message || disabled || pending) return;

    setBusy("plan");
    setError("");

    try {
      const data = await api.plan(message, session.threadId);
      acceptResult(data, message);
      setQuery("");
      setOnline(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function review(approved) {
    if (!session.threadId || disabled) return;

    if (!approved && !feedback.trim()) {
      setError("Describe what you want changed first.");
      return;
    }

    setBusy("review");
    setError("");

    try {
      const data = await api.review(
        session.threadId,
        approved,
        feedback.trim()
      );
      acceptResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || disabled) return;

    setError("");
    setUploadNotice("");

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("The PDF must be 15 MB or smaller.");
      return;
    }

    setBusy("upload");

    try {
      const data = await api.upload(file);
      setUploadNotice(
        `${data.filename} added. ${data.chunks_stored} text chunks indexed.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function ask(event) {
    event.preventDefault();
    const question = guideQuestion.trim();
    if (!question || disabled) return;

    setBusy("ask");
    setError("");
    setGuideAnswer("");

    try {
      const data = await api.ask(question);
      setGuideAnswer(asText(data.answer));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  const tabs = [
    ["itinerary", "Itinerary"],
    ["flight_results", "Flights"],
    ["hotel_results", "Stays"],
    ["weather_results", "Weather"],
    ["budget_results", "Budget"],
  ];

  const displayedText =
    section === "itinerary"
      ? result?.itinerary || result?.answer
      : result?.[section];

  const tripTitle =
    asText(result?.trip_constraints?.destination).trim() ||
    "Your next journey";

  return (
    <div className="site">
      <header className="site-header">
        <div className="header-inner">
          <button
            className="wordmark"
            onClick={() => setPage("plan")}
            aria-label="RouteMind trip planner"
          >
            <span className="brand-symbol" aria-hidden="true">↗</span>
            routemind<span className="brand-period">.</span>
          </button>

          <nav aria-label="Main navigation">
            <button
              className={page === "plan" ? "nav-link selected" : "nav-link"}
              onClick={() => setPage("plan")}
            >
              Trip planner
            </button>
            <button
              className={page === "guides" ? "nav-link selected" : "nav-link"}
              onClick={() => setPage("guides")}
            >
              Travel guides
            </button>
          </nav>

          <button
            className="header-action"
            onClick={resetTrip}
            disabled={disabled}
          >
            New trip <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="error-strip" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      <main>
        {page === "plan" ? (
          <>
            {!result && (
              <section className="hero page-width">
                <div className="hero-copy">
                  <p className="kicker">GO SOMEWHERE GOOD.</p>
                  <h1>
                    A little less planning.
                    <br />
                    <span>A lot more going.</span>
                  </h1>
                  <p className="hero-description">
                    The right places, a realistic budget, and a plan that
                    leaves room for the unexpected.
                  </p>
                </div>

                <div className="route-art" aria-hidden="true">
                  <div className="art-grid" />
                  <div className="art-circle circle-one" />
                  <div className="art-circle circle-two" />
                  <div className="route-track" />
                  <span className="art-point point-start" />
                  <span className="art-point point-end" />
                  <span className="art-label label-start">YOUR EVERYDAY</span>
                  <span className="art-label label-end">SOMEWHERE ELSE</span>
                  <span className="art-arrow">↗</span>
                  <span className="art-caption">TAKE THE SCENIC ROUTE / 001</span>
                </div>
              </section>
            )}

            <section className={`page-width planning-area ${result ? "compact" : ""}`}>
              <div className="planning-heading">
                <div>
                  <p className="kicker">THE STARTING POINT</p>
                  <h2>{result ? "Keep shaping your trip." : "What do you have in mind?"}</h2>
                </div>
                <span className="planning-hint">
                  Destination. Dates. Budget. Your kind of trip.
                </span>
              </div>

              <form className="trip-form" onSubmit={plan}>
                <label className="sr-only" htmlFor="trip-input">
                  Describe the trip you want to plan
                </label>

                <textarea
                  id="trip-input"
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  disabled={disabled || pending}
                  placeholder={
                    pending
                      ? "Review your draft below before sending another request."
                      : "A 3-day trip from Mumbai to Jaipur, under ₹25,000 per person. Good food, a comfortable stay, and no rushed mornings."
                  }
                  rows={3}
                />

                <div className="form-bottom">
                  <span className="form-note">
                    No bookings. Just a considered plan.
                  </span>
                  <button
                    className="button button-dark"
                    type="submit"
                    disabled={disabled || pending || !query.trim()}
                  >
                    {busy === "plan" ? (
                      <Spinner label="Planning your trip" />
                    ) : (
                      <>Create itinerary <span aria-hidden="true">↗</span></>
                    )}
                  </button>
                </div>
              </form>

              {busy === "plan" && (
                <p className="operation-note" role="status">
                  Researching your request. The itinerary appears when the
                  backend completes its work—there is no live progress feed.
                </p>
              )}
            </section>

            {!result && (
              <section className="page-width inspiration">
                <div className="section-rule">
                  <span>NEED A STARTING POINT?</span>
                  <span>THREE WAYS TO GET AWAY</span>
                </div>

                <div className="starter-grid">
                  {starters.map((item) => (
                    <button
                      className="starter"
                      key={item.number}
                      disabled={disabled}
                      onClick={() => {
                        setQuery(item.query);
                        inputRef.current?.focus();
                      }}
                    >
                      <span className="starter-top">
                        <span>{item.number}</span>
                        <span aria-hidden="true">↗</span>
                      </span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {result && (
              <section className="page-width result-section" ref={resultRef}>
                <div className="result-topline">
                  <p className="kicker">YOUR TRAVEL NOTES</p>
                  <span className={`result-status ${pending ? "pending" : ""}`}>
                    <span />
                    {pending
                      ? "Draft · awaiting review"
                      : result.guardrail_allowed === false
                        ? "Request not supported"
                        : "Plan generated"}
                  </span>
                </div>

                <h2 className="trip-title">{tripTitle}</h2>
                <p className="request-caption">{session.request}</p>

                <div className="trip-facts">
                  {[
                    ["From", result.trip_constraints?.origin],
                    ["Duration", result.trip_constraints?.duration],
                    ["Budget", result.trip_constraints?.budget],
                    ["Travel style", result.trip_constraints?.travel_style],
                  ]
                    .filter(([, value]) => Boolean(value))
                    .map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <p>{asText(value)}</p>
                      </div>
                    ))}
                </div>

                <div className="document-layout">
                  <aside className="document-nav" aria-label="Trip sections">
                    <span className="document-nav-title">IN THIS PLAN</span>
                    {tabs.map(([key, label], index) => (
                      <button
                        key={key}
                        className={section === key ? "document-tab active" : "document-tab"}
                        onClick={() => setSection(key)}
                        aria-pressed={section === key}
                      >
                        <span className="tab-number">0{index + 1}</span>
                        {label}
                        <span className="tab-arrow" aria-hidden="true">↗</span>
                      </button>
                    ))}
                    <p className="document-nav-note">
                      Estimates are not quotes. Confirm details before booking.
                    </p>
                  </aside>

                  <div className="document-content">
                    <div className="document-section-title">
                      <h3>{tabs.find(([key]) => key === section)?.[1]}</h3>
                      <span>ROUTEMIND / TRAVEL NOTES</span>
                    </div>

                    <TravelText value={displayedText} />

                    {pending && (
                      <section className="review-box">
                        <p className="kicker">A QUICK CHECK BEFORE YOU GO</p>
                        <h3>Does this feel like your trip?</h3>
                        <p>
                          Approve the draft, or tell us what needs changing.
                        </p>

                        <label htmlFor="feedback">Anything to adjust?</label>
                        <textarea
                          id="feedback"
                          value={feedback}
                          onChange={(event) => setFeedback(event.target.value)}
                          placeholder="Less sightseeing on day two. A lower hotel budget. More time for local food."
                          rows={3}
                          disabled={disabled}
                        />

                        <div className="review-actions">
                          <button
                            className="button button-dark"
                            onClick={() => review(true)}
                            disabled={disabled}
                          >
                            {busy === "review" ? (
                              <Spinner label="Updating plan" />
                            ) : (
                              <>Approve itinerary <span aria-hidden="true">↗</span></>
                            )}
                          </button>
                          <button
                            className="button button-outline"
                            onClick={() => review(false)}
                            disabled={disabled || !feedback.trim()}
                          >
                            Revise & finalize
                          </button>
                        </div>

                        <small>
                          Revisions are finalized directly by your current
                          backend, without a second review.
                        </small>
                      </section>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="page-width guides-page">
            <p className="kicker">BRING YOUR OWN KNOWLEDGE</p>
            <h1>
              Good guides.
              <br />
              <span>Better questions.</span>
            </h1>
            <p className="hero-description">
              Add a travel PDF, then ask for the details that matter to you.
            </p>

            <div className="guides-layout">
              <section className="upload-section">
                <span className="section-index">01 / BUILD YOUR LIBRARY</span>
                <h2>A guide worth keeping.</h2>
                <p>
                  Upload a destination guide or travel document.
                  PDF files up to 15 MB.
                </p>

                <label className="upload-control">
                  <span className="upload-symbol" aria-hidden="true">↑</span>
                  <span>
                    {busy === "upload" ? "Uploading and indexing…" : "Choose a PDF"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={upload}
                    disabled={disabled}
                  />
                </label>

                {uploadNotice && (
                  <p className="upload-success" role="status">{uploadNotice}</p>
                )}

                <small>
                  Documents are added to the backend’s shared knowledge base.
                  This is not private document storage.
                </small>
              </section>

              <section className="question-section">
                <span className="section-index">02 / FIND WHAT MATTERS</span>
                <h2>Ask something specific.</h2>

                <form onSubmit={ask}>
                  <label htmlFor="guide-question">Your question</label>
                  <textarea
                    id="guide-question"
                    value={guideQuestion}
                    onChange={(event) => setGuideQuestion(event.target.value)}
                    placeholder="What does the guide suggest for a relaxed two-day visit?"
                    rows={5}
                    disabled={disabled}
                  />
                  <button
                    className="button button-dark"
                    type="submit"
                    disabled={disabled || !guideQuestion.trim()}
                  >
                    {busy === "ask" ? (
                      <Spinner label="Reading your guides" />
                    ) : (
                      <>Find an answer <span aria-hidden="true">↗</span></>
                    )}
                  </button>
                </form>
              </section>
            </div>

            {guideAnswer && (
              <section className="guide-answer">
                <p className="kicker">FROM YOUR KNOWLEDGE BASE</p>
                <TravelText value={guideAnswer} />
              </section>
            )}
          </section>
        )}
      </main>

      <footer className="site-footer page-width">
        <span>RouteMind — make room for the journey.</span>
        <span className="connection-label">
          <span
            className={`connection-dot ${
              online === true ? "online" : online === false ? "offline" : ""
            }`}
          />
          {online === null
            ? "Checking connection"
            : online
              ? "Backend connected"
              : "Backend unavailable"}
        </span>
      </footer>
    </div>
  );
}