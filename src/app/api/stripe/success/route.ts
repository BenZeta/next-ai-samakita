import { NextResponse } from "next/server";

export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Successful</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f9fafb;
          }
          .success-message {
            text-align: center;
            padding: 2rem;
            background-color: white;
            border-radius: 0.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .checkmark {
            color: #059669;
            font-size: 3rem;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="success-message">
          <div class="checkmark">✓</div>
          <h1 style="color: #059669; margin: 0 0 1rem 0;">Payment Successful!</h1>
          <p style="color: #6b7280; margin: 0;">This window will close automatically.</p>
        </div>
        <script>
          setTimeout(() => {
            window.close();
          }, 2000);
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
} 