# ScholarStack MVP Development Requirements

Based on the strategic goals outlined in your Business Plan and the specific MVP targets defined in the CW2 Plan, here are the recommended functional and non-functional requirements, technology stack considerations, and initial development focus.

## 1. Functional Requirements
The MVP must support a tight, end-to-end workflow to demonstrate execution and tangible outputs for the Dragon's Den pitch. 

* **Project Management**: Users must be able to create isolated project containers to organize their research.
* **Document Ingestion**: Users must be able to add papers via direct PDF upload or by entering a DOI. 
* **Split-View Interface**: A unified UI featuring a PDF reader side-by-side with a project notebook to eliminate context switching, users should be able to move any tab, document or window to any location in their application and across multiple monitors.
* **Active Highlighting & Annotation**: Users must be able to highlight text in the PDF reader and instantly add the quote to their active notebook page with semantic tags (e.g., `#evidence`, `#critique`).
* **Nested Notebook Sections**: Notebooks should support structured sections (e.g., Introduction, Methodology) that cross-reference and maintain links back to the source PDFs.
* **Scoped AI Companion (RAG)**: An integrated AI assistant that answers queries *strictly* using the project corpus. The AI must provide direct citations back to the source passages to prevent hallucinations.
* **Dynamic Bibliography**: Automatic generation of a tailored reference list based on the citations used within a specific notebook section.
* **Legal/IP Compliance Pivot**: As a critical "Semester 2 decision", the system must **not** automatically download paywalled PDFs. It should rely exclusively on user-uploads or linking out to publisher/university access routes.

## 2. Non-Functional Requirements
* **Performance & Flow**: The split-view interface and PDF rendering must maintain low latency. Highlighting text and transferring it to the notebook must feel instantaneous.
* **Accuracy & Trust**: The AI companion must eliminate hallucinations by strictly scoping generation to uploaded documents and enforcing citeable origins.
* **Usability (Testing Readiness)**: The core workflow must be intuitive enough that a first-time user can complete tasks (upload, highlight, AI query) quickly during your "Round A" usability testing.
* **Data Privacy & Authentication (GDPR)**: The system must support Organizational SSO (Single Sign-On) for user access. Additionally, instead of centralized API billing for the AI, the MVP should allow users to 'bring their own key' or link their Personal LLM Accounts (like OpenAI). This mitigates API cost risk, enforces data retention limits locally where possible, and provides transparent disclosures regarding what data is sent to the LLM provider.

## 3. Technology Stack Recommendations


### Frontend: React
* **Why it fits**: Building a complex, state-heavy UI like a split-view PDF reader and real-time notebook requires a robust component-based framework.
* **Key Libraries to consider**: 
  * `react-pdf`: For rendering uploaded documents reliably.
  * `TipTap` or `Slate.js`: A specialized block-based text editor framework to handle the complex requirements of the notebook (tagging, cross-referencing, dynamic bibliography).
  * `Tailwind CSS` + `shadcn/ui`: For rapid, polished, and accessible interface design.

### Backend: Node.js with Express
* **Why it fits**: Node is perfect for I/O heavy operations and asynchronous requests, which aligns well with handling PDF uploads, and proxying requests to external LLM APIs.
* **Database & Storage**: 
  * **Relational Data**: SQLite (via an ORM like `Prisma`) to handle users, projects, and metadata locally.
  * **Document Storage**: Local filesystem storage (e.g., a dedicated `app_data/uploads` directory) to store the physical PDFs securely without relying on cloud buckets.


### AI Integration
* **LLM Provider Integration**: The system should support users plugging in their **Personal LLM Accounts** (e.g., providing an OpenAI API Key).


## 4. Initial Development Focus
To ensure you have a demo-able MVP for the pitch and can conduct your two rounds of user testing, your initial development sprints should focus strictly on the **Core Reading & Annotation Loop**:

1. **Foundational UI & Split-Pane Layout**: Set up the React frontend wrapper and the core split-pane layout. Implement basic project creation.
2. **The PDF Reader + Notebook Link**: Integrate the PDF viewer and a basic text editor. *Crucial:* Build the "Highlight -> Add to Notebook" mechanical hook. This is the core interaction of your app and the primary metric for your early user testing.
3. **Document Parsing Pipeline (Backend)**: Build the backend endpoint to accept a PDF upload, extract its text (e.g., via `pdf-parse`), chunk the text, and generate embeddings for the vector database.
4. **Scoped AI Querying**: Create the chat interface. Implement the backend logic to retrieve relevant chunks from the vector DB and prompt the LLM to answer *only* based on the retrieved context, returning specific citations.

*Strategic Advice: Do not attempt to build the visual Knowledge Graph or the advanced Dynamic Bibliography until this core loop (Upload -> Read -> Highlight -> Ask AI) is perfectly seamless.*
