exports.mailOtp = (otp) => {
  let html = `
 <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: "Satoshi Regular";
      }

      .header-div {
        text-align: center;
        padding: 1rem 0;
      }

      .eb-logo {
        height: 5.5rem;
        border-radius: 50%;
      }

      .eb-text {
        font-size: 1.25rem;
        font-weight: 700;
        padding: 1rem 0;
      }

      .otp-div {
        text-align: center;
        padding: 2rem 0;
      }

      .otp-text1 {
        font-size: 1.25rem;
        font-weight: 500;
        width: 90%;
        margin: auto;
      }

      .otp-text2 {
        font-weight: 900;
        font-size: 3rem;
        letter-spacing: 1rem;
        padding: 2rem 0;
      }

      .otp-text3 {
        font-size: 1rem;
        font-weight: 500;
        width: 75%;
        margin: auto;
      }

      .otp-text4 {
        font-size: 0.8rem;
        font-weight: 500;
        color: #b6b6b6;
        width: 75%;
        margin: auto;
        padding: 1rem 0;
      }

      .otp-image {
        height: 4.5rem;
      }

      .social-div {
        text-align: center;
        padding: 1rem 0;
      }

      .follow-text {
        font-weight: 700;
        font-size: 1rem;
        color: #191919;
      }

      .social-image {
        width: 2.5rem;
        max-height: 2.5rem;
      }
    </style>
  </head>

  <body>
    <div style="margin: auto">
      <div class="otp-div">
        <img class="otp-image" src="https://event.assistbuddi.com/favicon.png" />
        <div class="eb-text">Assist Buddi Event</div>
        <div class="otp-text1">
          Here is your one-time password to validate your email address
        </div>
        <div class="otp-text2">${otp}</div>
        <div class="otp-text3">
          Never share your OTP. Keep your account secure
        </div>
        <div class="otp-text4">
          Powered by <a href="https://assistbuddi.com">Assist Buddi</a>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return html;
};
