# C.A.S.H. Method AI Growth Analyzer

A Next.js application that analyzes web content using the C.A.S.H. Method (Clarity, Authority, Structure, Headlines) with AI-powered insights.

## Features

- **Web Scraping**: Automatically extracts content from any URL
- **C.A.S.H. Scoring**: Calculates scores for Clarity, Authority, Structure, and Headlines
- **AI Analysis**: Generates detailed, actionable feedback using OpenAI
- **Request Tracking**: Every analysis includes a unique request ID for logging

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Edit `.env.local` and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
cash-analyzer/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts      # API endpoint for analysis
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   ├── URLInputForm.tsx      # URL input component
│   └── ResultViewer.tsx      # Results display component
├── utils/
│   ├── cash-scoring.ts       # CASH score calculation
│   ├── formatter.ts          # Formatting utilities
│   ├── logger.ts             # Logging utilities
│   └── scraper.ts            # Web scraping logic
├── types/
│   └── index.ts              # TypeScript type definitions
├── .env.example              # Environment variables template
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## Usage

1. Enter a URL in the input field
2. Click "Analyze" to start the analysis
3. View the C.A.S.H. scores and AI-generated recommendations
4. Review the scraped content preview

## C.A.S.H. Method

- **Clarity**: Measures content readability, word count, and sentence structure
- **Authority**: Evaluates credibility indicators, depth, and expertise signals
- **Structure**: Assesses heading hierarchy, organization, and content flow
- **Headlines**: Analyzes title and heading quality, length, and engagement

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Cheerio (HTML parsing)

## License

MIT

