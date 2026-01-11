# Project Overview

This is a [Next.js](https://nextjs.org/) application designed for childminders to manage their business. It provides features to track children's attendance, log hours, manage finances, and generate invoices. The application uses `localStorage` for data persistence, making it a client-side-only application. It also features a voice assistant for hands-free operation.

The application is structured as follows:

-   `app/`: Contains the main pages of the application, including the dashboard, children management, and finances.
-   `components/`: Contains reusable React components, such as the navigation bar, modals, and the voice assistant.
-   `lib/`: Contains the core business logic, including data storage (`store.js`) and PDF generation (`pdfGenerator.js`).
-   `public/`: Contains static assets like images and the web app manifest.

## Building and Running

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 20 or later)
-   [npm](https://www.npmjs.com/)

### Running the Development Server

1.  Install the dependencies:
    ```bash
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

To create a production-ready build, run:

```bash
npm run build
```

This will generate an optimized version of the application in the `.next` directory. To run the production server, use:

```bash
npm run start
```

### Linting

To check the code for any linting errors, run:

```bash
npm run lint
```

## Development Conventions

### Data Storage

The application uses the browser's `localStorage` to store all data. The data is managed by the functions in `lib/store.js`. This means that all data is stored on the client-side, and no database is required.

### Voice Assistant

The application includes a voice assistant that can be used to perform common tasks, such as adding a child or logging hours. The voice assistant is powered by the OpenAI API. To use the voice assistant, you will need to create a `.env.local` file with your OpenAI API key:

```
OPENAI_API_KEY=your-api-key
```

### Invoicing

The application can generate and send invoices to parents via email. This functionality is provided by the [Resend](https://resend.com) service. To enable invoicing, you will need to create a Resend account and add your API key to the `.env.local` file:

```
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=your-email@example.com
```

Refer to the `INVOICE_SETUP.md` file for more detailed instructions.
