import { useState } from 'react'
import './ToSPPModal.css'

const TERMS_OF_SERVICE = `
TERMS OF SERVICE

Last Updated: April 15, 2026

1. ACCEPTANCE OF TERMS
By accessing and using AeroSign ("the Service"), you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.

2. DESCRIPTION OF SERVICE
AeroSign is a high-performance signature capture and verification platform powered by computer vision technology. The Service allows users to capture, store, and verify digital signatures with biometric authentication.

3. USER RESPONSIBILITIES
You agree to:
- Provide accurate and complete information during registration
- Maintain the confidentiality of your account credentials
- Notify us immediately of any unauthorized access
- Use the Service in compliance with all applicable laws and regulations
- Not attempt to circumvent security measures or gain unauthorized access

4. INTELLECTUAL PROPERTY RIGHTS
All content, features, and functionality of the Service (including but not limited to software, code, algorithms) are owned by AeroSign, its licensors, or other providers and are protected by international copyright, trademark, and other intellectual property laws.

5. USER-GENERATED CONTENT
You retain ownership of any signatures you capture and store. By using the Service, you grant AeroSign a non-exclusive, worldwide, royalty-free license to use your signatures solely for the purpose of providing the Service and improving our algorithms.

6. LIMITATION OF LIABILITY
IN NO EVENT SHALL AEROSIGN BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, REVENUE, OR BUSINESS OPPORTUNITIES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

7. WARRANTY DISCLAIMER
THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

8. INDEMNIFICATION
You agree to indemnify, defend, and hold harmless AeroSign from any claims, damages, costs, or expenses arising from your use of the Service or violation of these terms.

9. MODIFICATIONS TO TERMS
AeroSign reserves the right to modify these Terms of Service at any time. Continued use of the Service following such modifications constitutes your acceptance of the updated terms.

10. GOVERNING LAW
These Terms of Service shall be governed by and construed in accordance with applicable law, without regard to its conflict of law provisions.

11. CONTACT INFORMATION
For questions regarding these Terms of Service, please contact our support team through the Service.
`

const PRIVACY_POLICY = `
PRIVACY POLICY

Last Updated: April 15, 2026

1. INTRODUCTION
AeroSign ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and otherwise process your information, including biometric data.

2. INFORMATION WE COLLECT
We collect information in the following ways:

A. Information You Provide:
- Account Information: Full name, email address, password
- Biometric Data: Signature samples captured through our platform
- Usage Data: Information about how you interact with the Service

B. Information Collected Automatically:
- Device Information: Device type, operating system, browser type
- Usage Analytics: Pages visited, time spent, features used
- Location Data: Approximate location based on IP address (non-precise)

3. BIOMETRIC DATA HANDLING
Your signatures and biometric data are subject to enhanced security measures:
- Biometric data is encrypted in transit and at rest using industry-standard protocols
- Biometric data is stored in isolated, access-controlled environments
- We do not share your biometric data with third parties for marketing purposes
- You have the right to request deletion of your biometric data at any time

4. HOW WE USE YOUR INFORMATION
We use collected information for:
- Providing and improving the Service
- Authenticating your identity
- Responding to your inquiries and customer support
- Detecting and preventing fraud
- Complying with legal obligations
- Improving Service performance and user experience
- Sending service announcements and updates

5. DATA RETENTION
- Account Information: Retained for the duration of your account, plus 90 days after deletion
- Biometric Data: Retained for the duration of your account, deleted upon request or account termination
- Usage Analytics: Retained for 24 months, then anonymized

6. DATA SHARING AND DISCLOSURE
We do not sell your personal information. We may disclose information:
- To service providers who assist us in operating the Service
- When required by law or legal process
- To protect rights, privacy, safety, or property
- With your explicit consent

7. THIRD-PARTY SERVICES
Our Service may contain links to third-party websites and services. We are not responsible for their privacy practices. We encourage you to review their privacy policies.

8. DATA SECURITY
We implement industry-standard security measures including:
- Encryption (TLS/SSL)
- Secure authentication protocols
- Regular security audits
- Access controls and monitoring
- However, no method of transmission is 100% secure

9. YOUR RIGHTS
Depending on your location, you may have rights to:
- Access your personal information
- Correct inaccurate data
- Request deletion of your information
- Opt-out of certain processing
- Data portability
- Lodge complaints with supervisory authorities

10. CHILDREN'S PRIVACY
The Service is not intended for individuals under 13 years of age. We do not knowingly collect information from children under 13.

11. MARKETING COMMUNICATIONS
You may receive service-related announcements and updates. You can manage your communication preferences in your account settings.

12. INTERNATIONAL TRANSFERS
Your information may be transferred to and processed in countries other than your country of residence, which may have different data protection laws.

13. CHANGES TO PRIVACY POLICY
We may update this Privacy Policy periodically. We will notify you of significant changes via email or prominent notice on the Service.

14. CONTACT US
For privacy-related inquiries or to exercise your rights, contact:
Email: privacy@aerosign.com
Data Protection Officer: dpo@aerosign.com
`

export default function ToSPPModal({ isOpen, onClose }) {
  const [currentPage, setCurrentPage] = useState(0) // 0 = Terms, 1 = Privacy

  if (!isOpen) return null

  const content = currentPage === 0 ? TERMS_OF_SERVICE : PRIVACY_POLICY
  const title = currentPage === 0 ? 'Terms of Service' : 'Privacy Policy'

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentPage(prev => Math.min(1, prev + 1))
  }

  return (
    <div className="tospp-modal-overlay" onClick={onClose}>
      <div className="tospp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="tospp-modal-header">
          <h2>{title}</h2>
          <button
            className="tospp-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="tospp-modal-body">
          <div className="tospp-content">
            {content.split('\n').map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>

        <div className="tospp-modal-footer">
          <button
            className="tospp-btn tospp-btn-secondary"
            onClick={handlePrevious}
            disabled={currentPage === 0}
          >
            Previous
          </button>
          <span className="tospp-page-indicator">
            {currentPage + 1} / 2
          </span>
          <button
            className="tospp-btn tospp-btn-secondary"
            onClick={handleNext}
            disabled={currentPage === 1}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
