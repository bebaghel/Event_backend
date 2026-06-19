const moment = require("moment");
require("moment-timezone");

exports.guestMail = (
  name,
  event,
  location,
  start_at,
  end_at,
  is_approved,
  event_id,
  tin
) => {
  const startTime = moment
    .utc(start_at)
    .tz("Asia/Kolkata")
    .format("DD MMM, YYYY • hh:mm A");
  const endTime = moment
    .utc(end_at)
    .tz("Asia/Kolkata")
    .format("DD MMM, YYYY • hh:mm A");

  const year = new Date().getFullYear();

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
            padding: 20px 0;
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
            padding: 32px 24px 24px;
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
        
        /* Body Section */
        .body {
            padding: 32px 24px;
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
            <h1>Registration Confirmed</h1>
        </div>

        <!-- Body -->
        <div class="body">
            <p class="greeting">Hello <strong>${name}</strong>, Thank you for registering! <strong>${event}</strong></p>

            <div class="section-title">Event Details</div>
            
            <div class="event-details">
                <!-- Date & Time -->
                <div class="card">
                    <svg class="card-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <div class="card-content">
                        <div class="card-title">Date & Time</div>
                        <div class="card-value">${startTime} - ${endTime}</div>
                    </div>
                </div>

                <!-- Location -->
                <div class="card">
                    <svg class="card-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4.5 8-10c0-3.866-3.582-7-8-7s-8 3.134-8 7c0 5.5 8 10 8 10z"/>
                    </svg>
                    <div class="card-content">
                        <div class="card-title">Location</div>
                        <div class="card-value">${location}</div>
                    </div>
                </div>
            </div>

            <!-- Status -->
            <div class="status-container">
                ${
                  is_approved
                    ? `<span class="status-badge status-approved">✓ Approved</span>`
                    : `<span class="status-badge status-pending">Approval Pending</span>`
                }
            </div>

            <!-- Action Buttons -->
            <div class="actions">
                <a href="${
                  process.env.WEB_APP_URL
                }/${event_id}" class="btn btn-primary">View Event</a>
                ${
                  is_approved
                    ? `<a href="${process.env.WEB_APP_URL}/ticket/${event_id}?t=${tin}" class="btn btn-secondary">View Ticket</a>`
                    : ""
                }
            </div>

            <p class="footer-text">
                Need help? Reply to this email or contact the event organizer directly.
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            © ${year} Assist Buddi Event — Host your event with <a href="https://event.assistbuddi.com/" target="_blank">Assist Buddi Event</a>
        </div>
    </div>
</body>
</html>`;

  return html;
};
