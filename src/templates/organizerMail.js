exports.organizerMail = (name, event, is_approved) => {
  let year = new Date().getFullYear();
  let html = `
<html>
<head>
    <style>
        /* Base Styles */
        body {
            background-color: #f8fafc;
            color: #334155;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        /* Header Section */
        .header {
            text-align: center;
            padding: 10px 0;
            color: black;
        }
        
        .header img {
            width: 48px;
            height: 48px;
            margin-bottom: 16px;
            border-radius: 8px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 8px;
            color: black;
        }
        
        .header p {
            font-size: 16px;
            margin: 0;
            opacity: 0.9;
        }
        
        .greeting {
            font-size: 16px;
            margin-bottom: 24px;
            color: #475569;
        }
        
        .greeting strong {
            color: #1e293b;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        /* Event Cards */
        .event-details {
            margin-bottom: 24px;
        }
        
        .card {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 16px;
            background-color: #f8fafc;
            border-radius: 8px;
            margin-bottom: 12px;
            transition: background-color 0.2s;
        }
        
        .card:hover {
            background-color: #f1f5f9;
        }
        
        .card-icon {
            width: 20px;
            height: 20px;
            color: #4f46e5;
            flex-shrink: 0;
            margin-top: 2px;
        }
        
        .card-content {
            flex: 1;
        }
        
        .card-title {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .card-value {
            font-size: 14px;
            font-weight: 500;
            color: #1e293b;
        }
        
        /* Status Badge */
        .status-container {
            margin: 20px 0;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .status-approved {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        /* Action Buttons */
        .actions {
            display: flex;
            gap: 12px;
            margin: 24px 0;
        }

       .actions a {
          text-decoration: none;
           color: inherit;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            text-align: center;
            transition: all 0.2s;
            flex: 1;
            margin-right: 1.5rem;
        }
        
        .btn-primary {
            background-color: #4f46e5;
            color: white !important;
        }
        
        .btn-primary:hover {
            background-color: #4338ca;
        }
        
        .btn-secondary {
            background-color: transparent;
            color: #4f46e5 !important;
            border: 1px solid #4f46e5;
        }
        
        .btn-secondary:hover {
            background-color: #f8fafc;
        }
        
        /* Footer */
        .footer-text {
            font-size: 14px;
            color: #64748b;
            margin-top: 24px;
            line-height: 1.6;
        }
        
        .footer {
            text-align: center;
            margin-top: 15px;
            padding: 20px 24px;
            font-size: 14px;
            color: #94a3b8;
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }
        
        /* Responsive Adjustments */
        @media (max-width: 480px) {
            .body {
                padding: 24px 16px;
            }
            
            .header {
                padding: 24px 16px 20px;
            }
            
            .actions {
                flex-direction: column;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="https://event.assistbuddi.com/favicon.png" alt="Assist Buddi Event" />
            <h1>New Registration</h1>
        </div>

        <!-- Body -->
        <div class="body">
          <p style="text-align: center">
            <strong class="highlight-purple">${name}</strong> has registered for
            <strong class="highlight-black">${event}</strong>.
          </p>

          ${
            is_approved
              ? ` <p class="highlight-black" style="font-size: 15px; color: #4f46e5; text-align: center;">Approved</p>`
              : ` <p class="highlight-black" style="font-size: 15px; color: #c7334c; text-align: center;">Approval Pending</p>
              <p style="text-align: center;">
                  Head over to the
                  <span class="highlight-purple"><a href="https://event.assistbuddi.com/creator/events" target="_blank">Manage Event</a></span> page
                  to approve or reject the registration.
              </p>

              <p style="text-align: center;">
                Guests won't have access to the event details, ticket or booking until you approve them.
            </p>`
          }
        </div>

        <!-- Footer -->
        <div class="footer">
            Assist Buddi Event © ${year} — Powered by <a href="https://assistbuddi.com">Assist Buddi</a>
        </div>
    </div>
</body>
</html>`;

  return html;
};
