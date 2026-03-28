import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, MessageSquare, Clipboard, Mail, Globe } from 'lucide-react';

const ExternalLinkIcon = () => (
  <ExternalLink size={14} style={{ color: 'var(--primary-purple)', marginLeft: '4px', flexShrink: 0, verticalAlign: 'middle' }} />
);

const Sidebar = ({ selectedCountry, data, onClose }) => {
  const [showFeedbackMenu, setShowFeedbackMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const sidebarRef = useRef(null);

  const isoA3 = selectedCountry ? (selectedCountry.ISO_A3 || selectedCountry['ISO3166-1-Alpha-3'] || selectedCountry.ADM0_A3) : null;
  const isoA2 = selectedCountry ? (selectedCountry.ISO_A2 || selectedCountry['ISO3166-1-Alpha-2']) : null;

  // Scroll to top when country changes
  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = 0;
    }
  }, [isoA3]);

  if (!selectedCountry) return null;

  const countryData = data[isoA3];
  
  const displayData = countryData || {
    name: selectedCountry.ADMIN,
    agency: 'Data Not Available',
    agencyFullName: '',
    agencyUrl: '',
    framework: 'Please consult local regulatory authorities for specific medical device frameworks.',
    acceptsCE: false,
    acceptsUKCA: false,
    acceptsFDA: false,
    mdsapStatus: 'Non-Participant',
    isIMDRF: false,
    imdrfStatus: 'Non-Member',
    imdrfSince: '',
    whoListed: 'Unknown',
    mra: 'None'
  };

  // Formatting helpers for memberships
  const mdsapStatus = displayData.mdsapStatus || (displayData.isMDSAP ? 'Participant' : 'Non-Participant');
  const isMdsapActive = mdsapStatus !== 'Non-Participant';

  const imdrfStatus = displayData.imdrfStatus || (displayData.isIMDRF ? 'Member' : 'Non-Member');
  const isImdrfActive = imdrfStatus !== 'Non-Member';
  const imdrfDisplay = (isImdrfActive && displayData.imdrfSince) 
    ? `${imdrfStatus} (since ${displayData.imdrfSince})`
    : imdrfStatus;

  // MRA display logic
  const mraText = displayData.mra || 'None';
  const hasMra = mraText !== 'None';
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Feedback handlers
  const getFeedbackData = () => {
    const subject = `Map Feedback: ${displayData.name || 'Unknown Country'}`;
    const body = `Country: ${displayData.name || 'Unknown'}\n\nPlease describe the issue or suggestion:\n\n`;
    const email = 'map@hardianhealth.com';
    return { email, subject, body };
  };

  const handleNativeMail = () => {
    const { email, subject, body } = getFeedbackData();
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowFeedbackMenu(false);
  };

  const handleGmail = () => {
    const { email, subject, body } = getFeedbackData();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    setShowFeedbackMenu(false);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('map@hardianhealth.com');
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    setShowFeedbackMenu(false);
    }, 2000);
  };

  return (
    <div ref={sidebarRef} className={`sidebar ${selectedCountry ? 'open' : ''}`}>
      <div className="sidebar-header">
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>
        {isoA2 && isoA2 !== '-99' && (
          <img 
            src={`https://flagcdn.com/w80/${isoA2.toLowerCase()}.png`} 
            alt={`Flag`} 
            style={{ width: '40px', borderRadius: '4px', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} 
          />
        )}
        <h2 className="country-name">{displayData.name || selectedCountry.ADMIN}</h2>
        <div style={{ marginTop: '12px', paddingLeft: '4px' }}>
          <h3 className="agency-name" style={{ marginBottom: '4px' }}>
            <span className="agency-dot"></span>
            {displayData.agency}
          </h3>
          {displayData.agencyFullName && (
            <div style={{ marginLeft: '18px', fontSize: '0.9em', color: 'var(--text-light)', lineHeight: '1.3' }}>
              {displayData.agencyFullName}
            </div>
          )}
          {displayData.agencyUrl && (
            <a href={displayData.agencyUrl} target="_blank" rel="noopener noreferrer" className="external-link-styled" style={{ marginLeft: '18px', display: 'inline-flex', alignItems: 'center', fontSize: '0.85em', marginTop: '6px' }}>
              Visit Agency Website <ExternalLinkIcon />
            </a>
          )}
        </div>
      </div>
      
      <div className="sidebar-content">
        <div className="sidebar-section">
          <h4 className="section-title">
            <span className="section-dot dot-1"></span>
            Regulatory Framework
          </h4>
          <p className="framework-text">{displayData.framework}</p>
        </div>

        <div className="sidebar-section">
          <h4 className="section-title">
            <span className="section-dot dot-2"></span>
            Compliance & Recognition
          </h4>
          <div className="tags-list">
            <div className="tag-item">
              <span className="tag-label">CE Marking</span>
              <span className={`tag-value ${displayData.acceptsCE}`}>{displayData.acceptsCE ? 'Accepted / Relied On' : 'Not Accepted'}</span>
            </div>
            <div className="tag-item">
              <span className="tag-label">FDA 510(k)</span>
              <span className={`tag-value ${displayData.acceptsFDA}`}>{displayData.acceptsFDA ? 'Accepted / Relied On' : 'Not Accepted'}</span>
            </div>
            <div className="tag-item">
              <span className="tag-label">UKCA</span>
              <span className={`tag-value ${displayData.acceptsUKCA}`}>{displayData.acceptsUKCA ? 'Accepted' : 'Not Accepted'}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h4 className="section-title">
            <span className="section-dot dot-3"></span>
            International Memberships
          </h4>
          <div className="tags-list">
            <div className="tag-item">
              <a href="https://www.imdrf.org/" target="_blank" rel="noopener noreferrer" className="tag-label external-link-styled" style={{ display: 'inline-flex', alignItems: 'center' }}>
                IMDRF <ExternalLinkIcon />
              </a>
              <span className={`tag-value ${isImdrfActive}`}>{imdrfDisplay}</span>
            </div>
            <div className="tag-item">
              <a href="https://www.mdsap.global/" target="_blank" rel="noopener noreferrer" className="tag-label external-link-styled" style={{ display: 'inline-flex', alignItems: 'center' }}>
                MDSAP <ExternalLinkIcon />
              </a>
              <span className={`tag-value ${isMdsapActive}`}>{mdsapStatus}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h4 className="section-title">
            <span className="section-dot dot-4"></span>
            WHO Listed Authority
          </h4>
          <div className="tags-list">
            <div className="tag-item">
              <span className="tag-label">WLA Status</span>
              <span className={`tag-value ${displayData.whoListed && displayData.whoListed.startsWith('Yes')}`}>{displayData.whoListed || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h4 className="section-title">
            <span className="section-dot dot-5"></span>
            Mutual Recognition Agreements
          </h4>
          <div className="tags-list">
            <div className="tag-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span className="tag-label">MRA (Medical Devices)</span>
              {hasMra ? (
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.85em', lineHeight: '1.6', color: 'var(--text-color)' }}>
                  {mraText.split('; ').map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <span className="tag-value false" style={{ fontSize: '0.85em' }}>None</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '30px', borderTop: '1px solid #eaeaea', paddingTop: '20px', position: 'relative' }}>
          {showFeedbackMenu ? (
            <div className="feedback-menu">
              {!isMobile && <button className="feedback-menu-item" onClick={handleNativeMail}><Mail size={16} /> Open Mail App</button>}
              <button className="feedback-menu-item" onClick={handleGmail}>
                <Globe size={16} /> Open in Gmail
              </button>
              <button className="feedback-menu-item" onClick={handleCopyEmail}>
                <Clipboard size={16} /> {copied ? 'Copied Email!' : 'Copy Email Address'}
              </button>
              <button className="feedback-menu-item cancel" onClick={() => setShowFeedbackMenu(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button 
              className="feedback-btn" 
              onClick={() => setShowFeedbackMenu(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-purple)', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', color: '#fff', width: '100%', justifyContent: 'center', transition: 'all 0.2s', fontWeight: 600 }}
            >
              <MessageSquare size={16} />
              Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
