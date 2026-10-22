



// function humanizeKey(key) {
//   return String(key)
//     .replace(/([a-z])([A-Z])/g, "$1 $2")
//     .replace(/[_-]/g, " ")
//     .replace(/\b\w/g, (letter) => letter.toUpperCase());
// }

// // Clean escaped Markdown characters returned by the AI.
// function cleanMarkdown(text) {
//   return String(text ?? "")
//     .replace(/\r\n/g, "\n")
//     .replace(/\\([\\`*_{}\[\]()#+.!|>~\-])/g, "$1")
//     .replace(/^\s*(?:\*\s*){3,}$/gm, "")
//     .trim();
// }

// // Render inline Markdown: bold, italic, code and links.
// function renderInline(text) {
//   const cleaned = cleanMarkdown(text);

//   const tokenRegex =
//     /(\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[^\*\n]+\*|_[^_\n]+_|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;

//   return cleaned.split(tokenRegex).map((part, index) => {
//     // Bold
//     if (
//       (part.startsWith("**") && part.endsWith("**")) ||
//       (part.startsWith("__") && part.endsWith("__"))
//     ) {
//       return (
//         <strong key={index}>
//           {part.slice(2, -2)}
//         </strong>
//       );
//     }

//     // Italic
//     if (
//       (part.startsWith("*") && part.endsWith("*")) ||
//       (part.startsWith("_") && part.endsWith("_"))
//     ) {
//       return (
//         <em key={index}>
//           {part.slice(1, -1)}
//         </em>
//       );
//     }

//     // Inline code
//     if (part.startsWith("`") && part.endsWith("`")) {
//       return (
//         <code key={index}>
//           {part.slice(1, -1)}
//         </code>
//       );
//     }

//     // Links
//     const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);

//     if (link) {
//       return (
//         <a
//           key={index}
//           href={link[2]}
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           {link[1]}
//         </a>
//       );
//     }

//     return part;
//   });
// }

// function MarkdownContent({ content }) {
//   const text = cleanMarkdown(content);

//   if (!text) return null;

//   const lines = text.split("\n");
//   const blocks = [];
//   let i = 0;

//   // Split a Markdown table row into cells.
//   function parseTableRow(row) {
//     return row
//       .trim()
//       .replace(/^\|/, "")
//       .replace(/\|$/, "")
//       .split("|")
//       .map((cell) => cell.trim());
//   }

//   // Detect Markdown table separator rows.
//   function isTableSeparator(line) {
//     const cells = parseTableRow(line);

//     return (
//       cells.length > 0 &&
//       cells.every((cell) => /^:?-{3,}:?$/.test(cell))
//     );
//   }

//   while (i < lines.length) {
//     const line = lines[i].trim();

//     // Skip empty lines.
//     if (!line) {
//       i++;
//       continue;
//     }

//     // Headings: # Heading, ## Heading, ### Heading
//     const heading = line.match(/^(#{1,3})\s+(.+)$/);

//     if (heading) {
//       const level = heading[1].length;
//       const HeadingTag = `h${level}`;

//       blocks.push(
//         <HeadingTag
//           className="markdown-heading"
//           key={`heading-${i}`}
//         >
//           {renderInline(heading[2])}
//         </HeadingTag>
//       );

//       i++;
//       continue;
//     }

//     // Markdown tables.
//     if (
//       line.includes("|") &&
//       i + 1 < lines.length &&
//       isTableSeparator(lines[i + 1].trim())
//     ) {
//       const headers = parseTableRow(line);
//       i += 2;

//       const rows = [];

//       while (
//         i < lines.length &&
//         lines[i].trim().includes("|")
//       ) {
//         rows.push(parseTableRow(lines[i]));
//         i++;
//       }

//       blocks.push(
//         <div
//           className="markdown-table-wrap"
//           key={`table-${blocks.length}`}
//         >
//           <table className="markdown-table">
//             <thead>
//               <tr>
//                 {headers.map((header, index) => (
//                   <th key={index}>
//                     {renderInline(header)}
//                   </th>
//                 ))}
//               </tr>
//             </thead>

//             <tbody>
//               {rows.map((row, rowIndex) => (
//                 <tr key={rowIndex}>
//                   {headers.map((_, columnIndex) => (
//                     <td key={columnIndex}>
//                       {renderInline(row[columnIndex] || "—")}
//                     </td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       );

//       continue;
//     }

//     // Horizontal separators: ---, ***, ___
//     if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) {
//       blocks.push(
//         <hr key={`hr-${i}`} />
//       );

//       i++;
//       continue;
//     }

//     // Blockquotes.
//     if (/^>\s?/.test(line)) {
//       const quoteLines = [];

//       while (
//         i < lines.length &&
//         /^>\s?/.test(lines[i].trim())
//       ) {
//         quoteLines.push(
//           lines[i].trim().replace(/^>\s?/, "")
//         );

//         i++;
//       }

//       blocks.push(
//         <blockquote key={`quote-${blocks.length}`}>
//           {quoteLines.map((quote, index) => (
//             <p key={index}>
//               {renderInline(quote)}
//             </p>
//           ))}
//         </blockquote>
//       );

//       continue;
//     }

//     // Ordered and unordered lists.
//     if (
//       /^[-*+]\s+/.test(line) ||
//       /^\d+[.)]\s+/.test(line)
//     ) {
//       const ordered = /^\d+[.)]\s+/.test(line);
//       const items = [];

//       while (
//         i < lines.length &&
//         (
//           /^[-*+]\s+/.test(lines[i].trim()) ||
//           /^\d+[.)]\s+/.test(lines[i].trim())
//         )
//       ) {
//         items.push(
//           lines[i]
//             .trim()
//             .replace(/^([-*+]|\d+[.)])\s+/, "")
//         );

//         i++;
//       }

//       const ListTag = ordered ? "ol" : "ul";

//       blocks.push(
//         <ListTag
//           className="markdown-list"
//           key={`list-${blocks.length}`}
//         >
//           {items.map((item, index) => (
//             <li key={index}>
//               {renderInline(item)}
//             </li>
//           ))}
//         </ListTag>
//       );

//       continue;
//     }

//     // Regular paragraphs.
//     const paragraph = [line];
//     i++;

//     while (
//       i < lines.length &&
//       lines[i].trim() &&
//       !/^(#{1,3})\s|^>\s?|^[-*+]\s+|^\d+[.)]\s+/.test(
//         lines[i].trim()
//       )
//     ) {
//       // Stop if a table begins.
//       if (
//         lines[i].includes("|") &&
//         i + 1 < lines.length &&
//         isTableSeparator(lines[i + 1].trim())
//       ) {
//         break;
//       }

//       // Stop at a horizontal separator.
//       if (
//         /^(?:-{3,}|\*{3,}|_{3,})$/.test(
//           lines[i].trim()
//         )
//       ) {
//         break;
//       }

//       paragraph.push(lines[i].trim());
//       i++;
//     }

//     blocks.push(
//       <p
//         className="markdown-paragraph"
//         key={`paragraph-${blocks.length}`}
//       >
//         {renderInline(paragraph.join(" "))}
//       </p>
//     );
//   }

//   return (
//     <div className="markdown-content">
//       {blocks}
//     </div>
//   );
// }

// function ResultValue({ value }) {
//   if (
//     value === null ||
//     value === undefined ||
//     value === ""
//   ) {
//     return null;
//   }

//   // Markdown strings.
//   if (typeof value === "string") {
//     return <MarkdownContent content={value} />;
//   }

//   // Numbers and booleans.
//   if (
//     typeof value === "number" ||
//     typeof value === "boolean"
//   ) {
//     return <span>{String(value)}</span>;
//   }

//   // Arrays.
//   if (Array.isArray(value)) {
//     if (!value.length) return null;

//     return (
//       <div className="result-list">
//         {value.map((item, index) => (
//           <div
//             className="result-list-item"
//             key={index}
//           >
//             <ResultValue value={item} />
//           </div>
//         ))}
//       </div>
//     );
//   }

//   // Objects.
//   const entries = Object.entries(value).filter(
//     ([, item]) =>
//       item !== null &&
//       item !== undefined &&
//       item !== ""
//   );

//   if (!entries.length) return null;

//   return (
//     <div className="result-fields">
//       {entries.map(([key, item]) => (
//         <div
//           className="result-field"
//           key={key}
//         >
//           <span className="result-field-label">
//             {humanizeKey(key)}
//           </span>

//           <div className="result-field-value">
//             <ResultValue value={item} />
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// function ResultPanel({ title, eyebrow, value, icon }) {
//   if (
//     value === null ||
//     value === undefined ||
//     value === "" ||
//     (Array.isArray(value) && value.length === 0)
//   ) {
//     return null;
//   }

//   return (
//     <article className="structured-result-card">
//       <div className="structured-result-header">
//         <span className="structured-result-icon">
//           {icon}
//         </span>

//         <div>
//           <span className="structured-result-eyebrow">
//             {eyebrow}
//           </span>

//           <h3>{title}</h3>
//         </div>
//       </div>

//       <div className="structured-result-content">
//         <ResultValue value={value} />
//       </div>
//     </article>
//   );
// }



import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const initialForm = {
  destination: "",
  origin: "",
  startDate: "",
  endDate: "",
  travelers: "2",
  budget: "",
  preferences: "",
};

function buildTravelMessage(form) {
  return [
    `Plan a trip to ${form.destination}.`,
    form.origin && `Starting from ${form.origin}.`,
    form.startDate && `Departure date: ${form.startDate}.`,
    form.endDate && `Return date: ${form.endDate}.`,
    `Number of travelers: ${form.travelers}.`,
    form.budget && `Total trip budget: ${form.budget}.`,
    form.preferences && `Travel preferences: ${form.preferences}.`,
    "Find suitable flights and hotels, then create a practical day-by-day itinerary.",
  ]
    .filter(Boolean)
    .join("\n");
}

function humanizeKey(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isUsefulValue(value) {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some(isUsefulValue);
  }

  if (typeof value === "object") {
    return Object.values(value).some(isUsefulValue);
  }

  return typeof value === "number" || typeof value === "boolean";
}

/*
 * Repair common AI-escaped formatting conservatively.
 * Code spans and fenced code blocks remain untouched.
 * Ordinary backslashes and literal escaped pipes remain intact.
 */
function cleanMarkdown(text) {
  const source = String(text ?? "").replace(/\r\n?/g, "\n");

  const protectedParts = source.split(
    /(`{3,}[\s\S]*?`{3,}|~{3,}[\s\S]*?~{3,}|`+[^`\n]*`+)/g
  );

  return protectedParts
    .map((part, index) => {
      if (index % 2 === 1) return part;

      let cleaned = part
        .replace(/\\\*\\\*([^\n]+?)\\\*\\\*/g, "**$1**")
        .replace(/\\_\\_([^\n]+?)\\_\\_/g, "__$1__")
        .replace(/\\\*([^*\n]+?)\\\*/g, "*$1*")
        .replace(/^([ \t]*)\\(#{1,6})(?=\s)/gm, "$1$2")
        .replace(/^([ \t]*)\\>(?=\s|$)/gm, "$1>")
        .replace(/^([ \t]*)\\([-+*])(?=\s)/gm, "$1$2");

      /*
       * Unescape table delimiters only in a contiguous table-shaped
       * block with an escaped separator row. A literal \| elsewhere
       * is not changed.
       */
      const lines = cleaned.split("\n");

      for (let i = 1; i < lines.length; i += 1) {
        if (!lines[i].includes("\\|")) continue;

        const separator = lines[i].replace(/\\\|/g, "|").trim();

        if (!/^\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)+\|?$/.test(separator)) {
          continue;
        }

        if (!lines[i - 1].includes("\\|")) continue;

        lines[i - 1] = lines[i - 1].replace(/\\\|/g, "|");
        lines[i] = separator;

        let row = i + 1;

        while (
          row < lines.length &&
          lines[row].trim() &&
          lines[row].includes("\\|")
        ) {
          lines[row] = lines[row].replace(/\\\|/g, "|");
          row += 1;
        }

        i = row - 1;
      }

      cleaned = lines.join("\n");
      return cleaned;
    })
    .join("")
    .trim();
}

function safeMarkdownUrl(url) {
  const value = String(url ?? "").trim();

  if (!value) return "";

  try {
    const parsed = new URL(value, window.location.origin);

    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "mailto:"
    ) {
      return value;
    }
  } catch {
    return "";
  }

  return "";
}

const markdownComponents = {
  a: ({ href, title, children }) =>
    href ? (
      <a
        href={href}
        title={title}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),

  // Do not load arbitrary remote images from AI-generated output.
  img: ({ alt }) => (
    <span className="markdown-image-label">
      {alt ? `[Image: ${alt}]` : "[Image omitted]"}
    </span>
  ),

  table: ({ children }) => (
    <div className="markdown-table-wrap">
      <table className="markdown-table">{children}</table>
    </div>
  ),
};

function MarkdownContent({ content }) {
  const text = cleanMarkdown(content);

  if (!text) return null;

  return (
    <div className="markdown-content">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeMarkdownUrl}
        components={markdownComponents}
      >
        {text}
      </Markdown>
    </div>
  );
}

function ResultValue({ value }) {
  if (!isUsefulValue(value)) return null;

  if (typeof value === "string") {
    return <MarkdownContent content={value} />;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="result-list">
        {value.map((item, index) =>
          isUsefulValue(item) ? (
            <div className="result-list-item" key={index}>
              <ResultValue value={item} />
            </div>
          ) : null
        )}
      </div>
    );
  }

  return (
    <div className="result-fields">
      {Object.entries(value)
        .filter(([, item]) => isUsefulValue(item))
        .map(([key, item]) => (
          <div className="result-field" key={key}>
            <span className="result-field-label">
              {humanizeKey(key)}
            </span>

            <div className="result-field-value">
              <ResultValue value={item} />
            </div>
          </div>
        ))}
    </div>
  );
}

function ResultPanel({ title, eyebrow, value, icon }) {
  if (!isUsefulValue(value)) return null;

  return (
    <article className="structured-result-card">
      <div className="structured-result-header">
        <span className="structured-result-icon" aria-hidden="true">
          {icon}
        </span>

        <div>
          <span className="structured-result-eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="structured-result-content">
        <ResultValue value={value} />
      </div>
    </article>
  );
}

function getApiError(data, status) {
  const fallback = `Travel planning failed (HTTP ${status}).`;

  if (!data || typeof data !== "object") return fallback;

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    const messages = data.detail.map((item) => {
      if (typeof item === "string") return item;

      if (item && typeof item === "object") {
        const location = Array.isArray(item.loc)
          ? item.loc.join(".")
          : "";

        const message =
          typeof item.msg === "string" ? item.msg : JSON.stringify(item);

        return location ? `${location}: ${message}` : message;
      }

      return String(item);
    });

    return messages.join("; ") || fallback;
  }

  if (isUsefulValue(data.detail)) {
    return JSON.stringify(data.detail);
  }

  return fallback;
}

function App() {
  const [form, setForm] = useState({ ...initialForm });
  const [result, setResult] = useState(null);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [threadId, setThreadId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const requestRef = useRef(null);

  // Cleanup only: no synchronous state updates inside this effect.
  useEffect(() => {
    return () => {
      const activeRequest = requestRef.current;
      requestRef.current = null;
      activeRequest?.abort();
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetTrip() {
    const activeRequest = requestRef.current;

    // Invalidate the request before aborting so stale responses are ignored.
    requestRef.current = null;
    activeRequest?.abort();

    setForm({ ...initialForm });
    setResult(null);
    setSubmittedForm(null);
    setError("");
    setThreadId("");
    setIsLoading(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // A ref locks immediately, including before React renders loading state.
    if (requestRef.current) return;

    const nextForm = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()])
    );

    if (!nextForm.destination) {
      setError("Enter a destination.");
      return;
    }

    const travelers = Number(nextForm.travelers);

    if (!Number.isInteger(travelers) || travelers < 1) {
      setError("The number of travelers must be a positive whole number.");
      return;
    }

    if (
      nextForm.startDate &&
      nextForm.endDate &&
      nextForm.endDate < nextForm.startDate
    ) {
      setError("The return date cannot be before the departure date.");
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/travel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: buildTravelMessage(nextForm),
          thread_id: threadId,
        }),
        signal: controller.signal,
      });

      const responseText = await response.text();

      if (requestRef.current !== controller) return;

      let data = null;
      let validJson = false;

      try {
        data = JSON.parse(responseText);
        validJson = true;
      } catch {
        validJson = false;
      }

      if (!response.ok) {
        if (validJson) {
          throw new Error(getApiError(data, response.status));
        }

        const plainText = responseText.trim();
        const looksLikeHtml = plainText.startsWith("<");

        throw new Error(
          plainText && !looksLikeHtml
            ? `HTTP ${response.status}: ${plainText.slice(0, 500)}`
            : `Travel planning failed (HTTP ${response.status}). Check the backend and Vite proxy.`
        );
      }

      if (!validJson) {
        throw new Error(
          "The backend returned an empty or invalid JSON response."
        );
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("The backend response must be a JSON object.");
      }

      const nextResult = {
        answer: data.answer ?? null,
        flight_results: data.flight_results ?? null,
        hotel_results: data.hotel_results ?? null,
        itinerary: data.itinerary ?? null,
        llm_calls: data.llm_calls ?? null,
      };

      const returnedThreadId = data.thread_id;

      if (
        typeof returnedThreadId === "string" &&
        returnedThreadId.trim()
      ) {
        setThreadId(returnedThreadId);
      }

      setResult(nextResult);
      setSubmittedForm({ ...nextForm });
    } catch (requestError) {
      if (requestRef.current !== controller) return;
      if (requestError?.name === "AbortError") return;

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to plan the trip. Check the backend connection."
      );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  }

  const snapshot = submittedForm ?? form;

  const hasUsefulResult =
    result !== null &&
    [
      result.answer,
      result.flight_results,
      result.hotel_results,
      result.itinerary,
      result.llm_calls,
    ].some(isUsefulValue);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="RouteMind home">
          <span className="brand-mark" aria-hidden="true">↗</span>
          RouteMind
        </a>

        <div className="topbar-right">
          <span className="status-dot" aria-hidden="true" />
          Multi-agent travel planner
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" aria-hidden="true" />
              YOUR NEXT JOURNEY, THOUGHTFULLY PLANNED
            </div>

            <h1>
              Travel further.
              <br />
              <span>Plan smarter.</span>
            </h1>

            <p className="hero-description">
              Tell us where you want to go. RouteMind brings together
              flight research, hotel options, and a practical itinerary
              in one travel plan.
            </p>

            <div className="hero-footnote">
              <span className="hero-star" aria-hidden="true">✦</span>
              Your preferences. One coordinated travel team.
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-sun" />
            <div className="art-circle art-circle-one" />
            <div className="art-circle art-circle-two" />

            <div className="art-card art-card-top">
              <span className="art-card-label">LESS PLANNING. MORE LIVING.</span>
              <strong>
                A world
                <br />
                of possibilities.
              </strong>
              <span className="art-card-arrow">↗</span>
            </div>

            <div className="art-route">
              <span className="route-point route-point-start" />
              <span className="route-point route-point-end" />
            </div>

            <div className="art-stamp">
              EXPLORE WITH INTENTION
              <br />
              TRAVEL WITH ROUTEMIND
            </div>
          </div>
        </section>

        <section className="planner-section" id="planner">
          <div className="section-heading">
            <div>
              <span className="section-kicker">START WITH THE DETAILS</span>
              <h2>Where are we headed?</h2>
            </div>

            <span className="step-label">YOUR JOURNEY STARTS HERE</span>
          </div>

          <form
            className="planner-form"
            onSubmit={handleSubmit}
            aria-busy={isLoading}
          >
            <fieldset className="form-fieldset" disabled={isLoading}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="destination">Destination *</label>
                  <input
                    id="destination"
                    name="destination"
                    value={form.destination}
                    onChange={handleChange}
                    placeholder="Tokyo, Japan"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="origin">Starting location</label>
                  <input
                    id="origin"
                    name="origin"
                    value={form.origin}
                    onChange={handleChange}
                    placeholder="Delhi, India"
                  />
                </div>

                <div className="field">
                  <label htmlFor="startDate">Departure date</label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label htmlFor="endDate">Return date</label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label htmlFor="travelers">Number of travelers</label>
                  <input
                    id="travelers"
                    name="travelers"
                    type="number"
                    min="1"
                    step="1"
                    value={form.travelers}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="budget">Total budget</label>
                  <input
                    id="budget"
                    name="budget"
                    value={form.budget}
                    onChange={handleChange}
                    placeholder="INR 150,000 for the entire trip"
                  />
                </div>

                <div className="field field-wide">
                  <label htmlFor="preferences">Travel preferences</label>
                  <textarea
                    id="preferences"
                    name="preferences"
                    rows={4}
                    value={form.preferences}
                    onChange={handleChange}
                    placeholder="Food preferences, interests, hotel style, transport, accessibility needs..."
                  />
                </div>
              </div>
            </fieldset>

            {error && (
              <div className="error-message" role="alert">
                <span aria-hidden="true">!</span>
                <div>{error}</div>
              </div>
            )}

            <div className="form-footer">
              <p>
                <span className="privacy-symbol" aria-hidden="true">✦</span>
                One request. A coordinated flight, hotel, and itinerary plan.
              </p>

              <div className="form-buttons">
                <button
                  className="reset-button"
                  type="button"
                  onClick={resetTrip}
                >
                  {isLoading ? "Cancel & reset" : "Reset"}
                </button>

                <button
                  className="plan-button"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Planning your trip" : "Plan my trip"}
                  {isLoading ? (
                    <span className="loading-spinner" aria-hidden="true" />
                  ) : (
                    <span className="button-arrow" aria-hidden="true">↗</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {isLoading && (
          <section className="loading-panel" role="status" aria-live="polite">
            <span className="loading-orbit" aria-hidden="true">✦</span>
            <h2>Your travel team is on it.</h2>
            <p>
              Researching flights, exploring hotels, and building your itinerary.
            </p>
            <div className="loading-bar" aria-hidden="true">
              <span />
            </div>
          </section>
        )}

        {result !== null && !isLoading && (
          <section className="result-section" id="results">
            <div className="result-heading">
              <div>
                <span className="section-kicker">YOUR JOURNEY, ORGANIZED</span>
                <h2>Your travel plan</h2>
                <p className="result-subtitle">
                  Flight options, places to stay, and a day-by-day plan
                  from your travel team.
                </p>
              </div>

              <button
                className="reset-button"
                type="button"
                onClick={resetTrip}
              >
                Start a new trip ↗
              </button>
            </div>

            <div className="result-dashboard">
              <div className="result-main-column">
                {!hasUsefulResult && (
                  <div className="empty-result" role="status">
                    The backend returned no travel details. Adjust your
                    request and try again.
                  </div>
                )}

                <ResultPanel
                  title="Flight Results"
                  eyebrow="GETTING THERE"
                  icon="✈"
                  value={result.flight_results}
                />

                <ResultPanel
                  title="Hotel Results"
                  eyebrow="YOUR PLACE TO STAY"
                  icon="⌂"
                  value={result.hotel_results}
                />

                <ResultPanel
                  title="Day-by-Day Itinerary"
                  eyebrow="MAKE THE MOST OF EVERY DAY"
                  icon="▦"
                  value={result.itinerary}
                />

                <ResultPanel
                  title="Travel Team Notes"
                  eyebrow="THE COMPLETE PICTURE"
                  icon="✦"
                  value={result.answer}
                />
              </div>

              <aside className="result-side-column">
                <section className="result-side-card">
                  <span className="result-side-kicker">AT A GLANCE</span>
                  <h3>Trip Snapshot</h3>

                  <div className="snapshot-row">
                    <span>Destination</span>
                    <strong>{snapshot.destination || "Not specified"}</strong>
                  </div>

                  <div className="snapshot-row">
                    <span>Starting from</span>
                    <strong>{snapshot.origin || "Not specified"}</strong>
                  </div>

                  <div className="snapshot-row">
                    <span>Departure</span>
                    <strong>{snapshot.startDate || "Flexible"}</strong>
                  </div>

                  <div className="snapshot-row">
                    <span>Return</span>
                    <strong>{snapshot.endDate || "Flexible"}</strong>
                  </div>

                  <div className="snapshot-row">
                    <span>Travelers</span>
                    <strong>{snapshot.travelers}</strong>
                  </div>

                  <div className="snapshot-row">
                    <span>Total budget</span>
                    <strong>{snapshot.budget || "Not specified"}</strong>
                  </div>

                  {snapshot.preferences && (
                    <div className="snapshot-row">
                      <span>Preferences</span>
                      <strong>{snapshot.preferences}</strong>
                    </div>
                  )}

                  {threadId && (
                    <div className="snapshot-row">
                      <span>Thread ID</span>
                      <strong className="thread-id">{threadId}</strong>
                    </div>
                  )}

                  <p className="snapshot-note">
                    Verify prices, availability, and travel requirements
                    before booking. AI-generated plans are not reservations.
                  </p>
                </section>

                {isUsefulValue(result.llm_calls) && (
                  <section className="result-side-card agent-card">
                    <span className="result-side-kicker">BEHIND THE PLAN</span>
                    <h3>Agent Activity</h3>
                    <div className="structured-result-content">
                      <ResultValue value={result.llm_calls} />
                    </div>
                  </section>
                )}
              </aside>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#top">
          <span aria-hidden="true">↗</span>
          RouteMind
        </a>
        <p>AI-Powered Multi-Agent Travel Planning System</p>
        <span className="footer-year">PLAN THOUGHTFULLY. EXPLORE FREELY.</span>
      </footer>
    </div>
  );
}

export default App;