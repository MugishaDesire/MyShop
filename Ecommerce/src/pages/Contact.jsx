// src/pages/Contact.jsx
export default function Contact() {
  return (
    <>
      <div className="contact-container">
        <h1 className="contact-title">Contact Us</h1>
        <p className="contact-text">
          If you have any questions, feel free to reach out:
        </p>
        <ul className="contact-list">
          <li><strong>Email:</strong> support@myshop.com</li>
          <li><strong>Phone:</strong> +250 781 539 501</li>
          <li><strong>Location:</strong> Kigali, Rwanda</li>
        </ul>
      </div>

      {/* Enhanced CSS - Same content, better UX */}
      <style>{`
        .contact-container {
          max-width: 700px;
          margin: 60px auto;
          padding: 50px 40px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          text-align: center;
          border: 1px solid rgba(59, 130, 246, 0.1);
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .contact-title {
          font-size: 2.8rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .contact-text {
          font-size: 1.2rem;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 40px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .contact-list {
          margin-top: 30px;
          padding-left: 0;
          list-style: none;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .contact-list li {
          font-size: 1.1rem;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s ease;
          border-radius: 12px;
          margin-bottom: 12px;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .contact-list li:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          border-color: #3b82f6;
        }

        .contact-list li:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .contact-list strong {
          color: #2563eb;
          font-weight: 700;
          min-width: 100px;
          text-align: right;
          display: inline-block;
        }

        .contact-list li::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          margin-right: 8px;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .contact-container {
            margin: 40px 20px;
            padding: 40px 24px;
            border-radius: 16px;
          }

          .contact-title {
            font-size: 2.2rem;
          }

          .contact-text {
            font-size: 1.1rem;
            margin-bottom: 30px;
          }

          .contact-list li {
            flex-direction: column;
            gap: 8px;
            padding: 16px 20px;
          }

          .contact-list strong {
            text-align: center;
            min-width: auto;
          }

          .contact-list li::before {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .contact-container {
            margin: 30px 16px;
            padding: 32px 20px;
          }

          .contact-title {
            font-size: 1.8rem;
          }

          .contact-text {
            font-size: 1rem;
          }

          .contact-list li {
            font-size: 1rem;
          }
        }

        /* Print styles */
        @media print {
          .contact-container {
            box-shadow: none;
            border: 1px solid #ddd;
            margin: 20px;
          }
          
          .contact-list li:hover {
            transform: none;
            box-shadow: none;
          }
        }

        /* Accessibility improvements */
        .contact-list li:focus-within {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}