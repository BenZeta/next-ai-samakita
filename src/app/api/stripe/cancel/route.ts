import { NextResponse } from "next/server";

export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Cancelled</title>
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
          .cancel-message {
            text-align: center;
            padding: 2rem;
            background-color: white;
            border-radius: 0.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .icon {
            color: #dc2626;
            font-size: 3rem;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="cancel-message">
          <div class="icon">×</div>
          <h1 style="color: #dc2626; margin: 0 0 1rem 0;">Payment Cancelled</h1>
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