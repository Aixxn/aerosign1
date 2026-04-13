import { useState } from 'react'
import './FAQPage.css'

export function FAQPage({ onBack, onHistory, onSignOut, user }) {
  const [expandedItems, setExpandedItems] = useState({})

  const faqItems = [
    {
      id: 1,
      question: 'How do I hold my hand?',
      answer: 'Hold your index and middle fingers together as if you\'re holding a pen. Keep them about 2-3cm apart when signing.'
    },
    {
      id: 2,
      question: 'What is the optimal distance?',
      answer: 'Position your hand approximately 50cm (about arm\'s length) from the camera for best results.'
    },
    {
      id: 3,
      question: 'How do I capture a signature?',
      answer: 'Press "Start Capture" to begin, then move your fingers apart while signing. Close your fingers together to stop capturing.'
    },
    {
      id: 4,
      question: 'What are keyboard shortcuts?',
      answer: 'Z - Record signature | X - Finalize/Save | Q - Quit/Back'
    },
    {
      id: 5,
      question: 'What does the confidence score mean?',
      answer: 'The confidence score (0-100%) indicates how well the system tracked your signature. Higher scores mean better quality captures.'
    },
    {
      id: 6,
      question: 'What is latency?',
      answer: 'Latency measures the delay between your hand movement and the display. Lower values (under 100ms) are ideal.'
    },
    {
      id: 7,
      question: 'Can I edit a saved signature?',
      answer: 'Each signature is finalized when saved. You can view and download all signatures from your History.'
    },
    {
      id: 8,
      question: 'What if my hand is not detected?',
      answer: 'Ensure your hand is visible and well-lit. Try moving closer to the camera or adjusting the lighting in your environment.'
    }
  ]

  const toggleExpanded = (id) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const [showAccountMenu, setShowAccountMenu] = useState(false)

  return (
    <div className="faq-page">
      {/* Header */}
      <header className="faq-header">
        <nav className="faq-nav">
          <div className="logo">AeroSign</div>
          
          {/* Authenticated User Navbar */}
          {user && (
            <>
              <div className="nav-links desktop-only">
                <button className="nav-link-btn" onClick={onBack} title="Back to signature capture">
                  Capture
                </button>
                <button className="nav-link-btn" onClick={onHistory} title="View signature history">
                  History
                </button>
                <a href="#" className="nav-link active">FAQ</a>
              </div>
              <div className="nav-icons">
                <button 
                  className="icon-btn" 
                  title="Account" 
                  aria-label="Account menu"
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                >
                  <span className="material-symbols-outlined">account_circle</span>
                </button>
                {showAccountMenu && (
                  <div className="account-dropdown">
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowAccountMenu(false)
                        // Navigate to settings - you can add onSettings prop
                      }}
                    >
                      <span className="material-symbols-outlined">settings</span>
                      Settings
                    </button>
                    <button 
                      className="dropdown-item logout"
                      onClick={() => {
                        setShowAccountMenu(false)
                        onSignOut()
                      }}
                    >
                      <span className="material-symbols-outlined">logout</span>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Unauthenticated User Navbar */}
          {!user && (
            <div className="nav-icons">
              <button 
                className="icon-btn" 
                title="Back" 
                aria-label="Go back"
                onClick={onBack}
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            </div>
          )}
        </nav>
      </header>

      <main className="faq-main">
        {/* Title Section */}
        <div className="faq-title-section">
          <h1>Frequently Asked Questions</h1>
          <p className="faq-subtitle">Find answers to common questions about using AeroSign</p>
        </div>

        {/* FAQ Items */}
        <div className="faq-container">
          {faqItems.map((item) => (
            <div 
              key={item.id} 
              className={`faq-accordion-item ${expandedItems[item.id] ? 'expanded' : ''}`}
            >
              <button
                className="faq-question-btn"
                onClick={() => toggleExpanded(item.id)}
                aria-expanded={expandedItems[item.id]}
              >
                <span className="faq-question-text">{item.question}</span>
                <span className="material-symbols-outlined faq-icon">
                  {expandedItems[item.id] ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {expandedItems[item.id] && (
                <div className="faq-answer">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="faq-contact-section">
          <h2>Still have questions?</h2>
          <p>If you need further assistance, please contact our support team.</p>
          <button className="contact-btn" onClick={onBack}>
            Back to Capture
          </button>
        </div>
      </main>
    </div>
  )
}

export default FAQPage
