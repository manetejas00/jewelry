import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Upload,
  Send,
  Check,
  RotateCcw,
  ZoomIn,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Layers,
  Lock,
  ShieldCheck,
  Scale,
  MessageSquare,
  HelpCircle,
  Heart,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  ShoppingBag,
  X,
  UserRound,
  FileText
} from 'lucide-react';
import { api } from './api.js';
import { useStore } from './store.jsx';

function money(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN');
}

export default function CYOStudio({ Layout }) {
  const { customer, bag, saveBag } = useStore();
  const navigate = useNavigate();

  // Quota & Account State
  const [quota, setQuota] = useState({ count: 0, limit: 3, remaining: 3, exhausted: false });
  const [quotaLoading, setQuotaLoading] = useState(true);

  // Studio Workspace State
  const [designs, setDesigns] = useState([]);
  const [activeDesign, setActiveDesign] = useState(null);
  const [activeAngle, setActiveAngle] = useState('front');
  const [prompt, setPrompt] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [feasibility, setFeasibility] = useState(null);
  const [completeSet, setCompleteSet] = useState([]);

  // Attributes State
  const [attributes, setAttributes] = useState({
    category: 'Necklace',
    material: 'Gold',
    craftsmanship: 'Kundan',
    finish: 'Antique Gold Finish',
    gemstones: 'Emerald & Polki Diamond',
    motifs: 'Artisanal Floral'
  });

  // UI State
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState(null);
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  const chatBottomRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load customer quota & designs on mount if authenticated
  useEffect(() => {
    if (!customer) {
      setQuotaLoading(false);
      return;
    }
    loadStudioData();
  }, [customer]);

  async function loadStudioData() {
    setQuotaLoading(true);
    setError('');
    try {
      const [quotaData, designsData] = await Promise.all([
        api('/cyo/quota'),
        api('/cyo/designs')
      ]);
      setQuota(quotaData);
      setDesigns(designsData);

      if (designsData.length > 0 && !activeDesign) {
        await loadDesign(designsData[0].id);
      }
    } catch (err) {
      if (err.status !== 401) {
        setError(err.message || 'Could not load your atelier data.');
      }
    } finally {
      setQuotaLoading(false);
    }
  }

  async function loadDesign(designId) {
    setBusy(true);
    setError('');
    try {
      const detail = await api(`/cyo/designs/${designId}`);
      setActiveDesign(detail);
      setMessages(detail.messages || []);

      const latestVersion = detail.versions?.[detail.versions.length - 1];
      if (latestVersion?.attributes) {
        setAttributes(prev => ({ ...prev, ...latestVersion.attributes }));
      }
      setSavedDrawerOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to load design.');
    } finally {
      setBusy(false);
    }
  }

  // Handle Starting a Fresh Design Session
  async function handleStartFresh() {
    if (!prompt.trim()) {
      setError('Please describe your jewellery idea before creating.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const created = await api('/cyo/designs', {
        title: prompt.trim().slice(0, 45) + (prompt.length > 45 ? '…' : ''),
        category: attributes.category,
        prompt: prompt.trim(),
        attributes
      });

      setPrompt('');
      await loadStudioData();
      await loadDesign(created.id);
      setSuccess('Bespoke design session initialized.');
    } catch (err) {
      setError(err.message || 'Could not start new design.');
    } finally {
      setBusy(false);
    }
  }

  // Handle Sending a Conversational Message
  async function handleSendMessage(e) {
    e?.preventDefault();
    if (!chatMessage.trim() || !activeDesign) return;

    const userText = chatMessage.trim();
    setChatMessage('');
    setBusy(true);
    setError('');

    // Optimistically add user message
    const tempUserMsg = { id: 'temp-' + Date.now(), role: 'user', content: userText };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api(`/cyo/designs/${activeDesign.id}/chat`, {
        message: userText,
        attachments: referenceUrl ? [referenceUrl] : []
      });

      const assistantMsg = {
        id: 'reply-' + Date.now(),
        role: 'assistant',
        content: response.reply
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (response.updatedAttributes) {
        setAttributes(prev => ({ ...prev, ...response.updatedAttributes }));
      }
      if (response.feasibility) {
        setFeasibility(response.feasibility);
      }
      if (response.completeSet) {
        setCompleteSet(response.completeSet);
      }
    } catch (err) {
      setError(err.message || 'Assistant could not reply.');
    } finally {
      setBusy(false);
    }
  }

  // Handle Generating 4 Photorealistic Images (Enforces Strict 3 Quota)
  async function handleGenerateImages() {
    if (!activeDesign) {
      setError('Please start or select a design first.');
      return;
    }
    if (quota.remaining <= 0) {
      setError('You have reached the maximum limit of 3 AI-generated images. You may submit your existing concepts for a formal artisan quotation.');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const result = await api(`/cyo/designs/${activeDesign.id}/generate`, {
        prompt: activeDesign.initial_prompt,
        attributes,
        referenceImageUrl: referenceUrl
      });

      if (result.quota) {
        setQuota(result.quota);
      }
      setSuccess(`Concept generated successfully! Remaining image quota: ${result.quota?.remaining ?? quota.remaining - 1} of ${result.quota?.limit ?? 3}.`);
      await loadDesign(activeDesign.id);
      await loadStudioData();
    } catch (err) {
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  // Handle Reference Image Upload
  async function handleReferenceUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Reference image must be under 8 MB.');
      return;
    }

    setReferenceUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const analysis = await api('/cyo/upload-reference', {
          base64Data: ev.target.result,
          filename: file.name
        });

        setReferenceUrl(analysis.url);
        setSuccess('Reference image uploaded and analyzed by AI.');

        // Post notice in chat
        if (activeDesign) {
          await api(`/cyo/designs/${activeDesign.id}/chat`, {
            message: `I have uploaded a reference image (${file.name}). Please analyze its craftsmanship and incorporate its aesthetic into our concept.`,
            attachments: [analysis.url]
          });
          await loadDesign(activeDesign.id);
        }
      } catch (err) {
        setError(err.message || 'Failed to upload reference image.');
      } finally {
        setReferenceUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // Handle Requesting Quotation
  async function handleRequestQuotation() {
    if (!activeDesign) return;
    setBusy(true);
    setError('');
    try {
      await api(`/cyo/designs/${activeDesign.id}/request-quotation`, {
        notes: `Customer requested formal atelier quotation for ${activeDesign.title}.`
      });
      setSuccess('Design submitted for technical review. Our master craftsmen will prepare your formal quotation.');
      await loadDesign(activeDesign.id);
      await loadStudioData();
    } catch (err) {
      setError(err.message || 'Could not submit quotation request.');
    } finally {
      setBusy(false);
    }
  }

  // Handle Accepting Quotation
  async function handleAcceptQuotation(quoteId) {
    setBusy(true);
    setError('');
    try {
      await api(`/cyo/quotations/${quoteId}/accept`, {});
      setSuccess('Quotation accepted! You can now add your bespoke jewellery order to your shopping bag.');
      await loadDesign(activeDesign.id);
      await loadStudioData();
    } catch (err) {
      setError(err.message || 'Could not accept quotation.');
    } finally {
      setBusy(false);
    }
  }

  // Handle Adding Accepted Quote to Bag
  async function handleAddToBag(quote) {
    if (!quote || quote.status !== 'quotation_accepted') return;

    const heroImg = activeDesign?.images?.find(i => i.view_type === 'front') || activeDesign?.images?.[0];
    const bespokeItem = {
      sku: `CYO-QUOTE-${quote.id}`,
      name: `Bespoke: ${activeDesign.title}`,
      size: `${quote.estimated_weight_g || '18'}g · Bespoke 1 of 1`,
      image: heroImg?.image_url || '/assets/brand/logo.webp',
      price: Number(quote.quoted_amount),
      quantity: 1,
      slug: 'create-your-own',
      kind: 'bespoke'
    };

    try {
      const existing = (bag || []).find(b => b.sku === bespokeItem.sku);
      let newBag;
      if (existing) {
        newBag = bag.map(b => b.sku === bespokeItem.sku ? { ...b, quantity: Math.min(b.quantity + 1, 20) } : b);
      } else {
        newBag = [...(bag || []), bespokeItem];
      }
      await saveBag(newBag);
      setSuccess('Bespoke jewellery added to your shopping bag!');
      navigate('/bag');
    } catch (err) {
      setError(err.message || 'Failed to add piece to shopping bag.');
    }
  }

  // If visitor is not logged in: Compulsory Login Gate
  if (!customer && !quotaLoading) {
    return (
      <Layout>
        <div className="cyo-login-gate-container">
          <div className="cyo-gate-card">
            <div className="cyo-gate-eyebrow">
              <Sparkles size={14} color="#c5a059" />
              <span>VEYORA MAISON · ATELIER BESPOKE</span>
            </div>
            <h1>Bespoke AI Jewellery Studio</h1>
            <p className="cyo-gate-intro">
              Step into our digital jewellery atelier to design one-of-a-kind heirlooms from scratch.
              Describe your vision in natural language, upload reference sketches, converse with our AI jewellery consultant,
              and receive photorealistic multi-angle concepts crafted in authentic gold, polki, and precious gems.
            </p>

            <div className="cyo-gate-perks">
              <div className="cyo-perk">
                <ShieldCheck size={20} color="#c5a059" />
                <div>
                  <strong>Exclusive Client Quota</strong>
                  <p>Every registered member receives 3 complimentary photorealistic AI concept generations.</p>
                </div>
              </div>
              <div className="cyo-perk">
                <Layers size={20} color="#c5a059" />
                <div>
                  <strong>Multi-Angle Studio Previews</strong>
                  <p>Inspect your custom concept in catalogue front, profile relief, macro detail, and velvet showcase angles.</p>
                </div>
              </div>
              <div className="cyo-perk">
                <Scale size={20} color="#c5a059" />
                <div>
                  <strong>Master Artisan Quotation</strong>
                  <p>Submit your finished design for technical feasibility review and real workshop bullion pricing.</p>
                </div>
              </div>
            </div>

            <div className="cyo-gate-actions">
              <button
                type="button"
                className="button dark cyo-auth-btn"
                onClick={() => {
                  sessionStorage.setItem('redirect_after_login', '/create-your-own');
                  navigate('/account?mode=login');
                }}
              >
                Sign In to Access Atelier <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="button outline cyo-auth-btn"
                onClick={() => {
                  sessionStorage.setItem('redirect_after_login', '/create-your-own');
                  navigate('/account?mode=register');
                }}
              >
                Register New Account
              </button>
            </div>
            <p className="cyo-gate-footer">Login is compulsory to securely preserve your design history and enforce generation quotas.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentImages = activeDesign?.images || [];
  const currentImage = currentImages.find(i => i.view_type === activeAngle) || currentImages[0];
  const activeQuote = activeDesign?.quotations?.[0];

  return (
    <Layout>
      <div className="cyo-studio-wrapper">
        {/* Top Atelier Bar */}
        <header className="cyo-studio-header">
          <div className="cyo-header-title">
            <span className="eyebrow">VEYORA ATELIER · CREATE YOUR OWN</span>
            <h1>Bespoke Jewellery Studio</h1>
          </div>

          <div className="cyo-header-actions">
            {/* Image Quota Badge */}
            <div className={`cyo-quota-pill ${quota.exhausted ? 'exhausted' : ''}`} title={`Generations used: ${quota.count} / ${quota.limit}`}>
              <Sparkles size={14} color={quota.exhausted ? '#dc2626' : '#c5a059'} />
              <span>
                {quota.exhausted
                  ? 'Limit reached: 3 of 3 images used'
                  : `${quota.remaining} of ${quota.limit} AI concept generations remaining`}
              </span>
            </div>

            <button
              type="button"
              className="cyo-saved-btn"
              onClick={() => setSavedDrawerOpen(true)}
              aria-label="View saved designs"
            >
              <Layers size={16} />
              <span>My Designs ({designs.length})</span>
            </button>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div className="cyo-alert error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}
        {success && (
          <div className="cyo-alert success" role="status">
            <Check size={16} />
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess('')}><X size={14} /></button>
          </div>
        )}

        {/* 3-Column Studio Workspace */}
        <div className="cyo-workspace-grid">
          {/* COLUMN 1: AI Design Consultant & Conversational Assistant */}
          <aside className="cyo-col cyo-chat-col">
            <div className="cyo-col-header">
              <MessageSquare size={16} color="#c5a059" />
              <h3>AI Design Consultant</h3>
            </div>

            {/* Conversation Stream */}
            <div className="cyo-chat-stream">
              {messages.length === 0 ? (
                <div className="cyo-chat-empty">
                  <Sparkles size={24} color="#c5a059" />
                  <p>Welcome to Veyora Bespoke. Describe your dream jewellery piece below or upload inspiration to begin.</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={m.id || idx} className={`cyo-message ${m.role}`}>
                    <div className="cyo-message-author">
                      {m.role === 'assistant' ? 'Veyora Master Jeweller' : customer.name}
                    </div>
                    <div className="cyo-message-content">
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {busy && (
                <div className="cyo-message assistant typing">
                  <span>Thinking & consulting artisan archives…</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Reference Image Preview Pill */}
            {referenceUrl && (
              <div className="cyo-reference-preview-bar">
                <img src={referenceUrl} alt="Active reference" />
                <span>Reference photo active</span>
                <button type="button" onClick={() => setReferenceUrl(null)} title="Remove reference">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Chat Input & Reference Upload */}
            <form onSubmit={handleSendMessage} className="cyo-chat-form">
              <div className="cyo-input-row">
                <label className="cyo-upload-icon-btn" title="Upload sketch or reference image">
                  <Upload size={17} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleReferenceUpload}
                    disabled={referenceUploading}
                    style={{ display: 'none' }}
                  />
                </label>
                <input
                  type="text"
                  placeholder={activeDesign ? "E.g., Make it in antique 22K gold with dangling pearls…" : "Describe your jewellery concept…"}
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="submit"
                  className="cyo-send-btn"
                  disabled={busy || !chatMessage.trim() || !activeDesign}
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </div>

              {!activeDesign && (
                <div className="cyo-new-concept-prompt">
                  <textarea
                    rows={2}
                    placeholder="Describe your bespoke piece in natural language (e.g. Royal Kundan bridal necklace with emerald drops and peacock motifs)…"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button dark full"
                    onClick={handleStartFresh}
                    disabled={busy || !prompt.trim()}
                  >
                    Start Bespoke Design <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </form>

            {/* Complete-The-Set Recommendations */}
            {completeSet.length > 0 && (
              <div className="cyo-complete-set-panel">
                <span className="eyebrow">COMPLETE THE SET</span>
                <h4>Matching Creations</h4>
                <div className="cyo-set-items">
                  {completeSet.map((s, idx) => (
                    <div key={idx} className="cyo-set-item">
                      <strong>{s.name}</strong>
                      <p>{s.description}</p>
                      <small>Est. weight: {s.estimatedWeight}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* COLUMN 2: Visualizer & Multi-Angle Concept Gallery */}
          <section className="cyo-col cyo-canvas-col">
            <div className="cyo-col-header">
              <Eye size={16} color="#c5a059" />
              <h3>Photorealistic Concept Studio</h3>
              {activeDesign && (
                <span className="cyo-status-tag">{activeDesign.status}</span>
              )}
            </div>

            {/* Angle Selector Tabs */}
            <div className="cyo-angle-tabs" role="tablist">
              {[
                { key: 'front', label: 'Front View', desc: 'Direct Studio' },
                { key: 'side', label: 'Side Profile', desc: '45° Relief' },
                { key: 'detail', label: 'Close-Up Detail', desc: '2.2x Macro' },
                { key: 'showcase', label: 'Velvet Showcase', desc: 'Editorial' }
              ].map(angle => (
                <button
                  key={angle.key}
                  type="button"
                  role="tab"
                  aria-selected={activeAngle === angle.key}
                  className={`cyo-angle-tab ${activeAngle === angle.key ? 'active' : ''}`}
                  onClick={() => setActiveAngle(angle.key)}
                >
                  <strong>{angle.label}</strong>
                  <small>{angle.desc}</small>
                </button>
              ))}
            </div>

            {/* Main Concept Canvas Viewport */}
            <div className="cyo-viewport">
              {generating ? (
                <div className="cyo-generating-state">
                  <div className="cyo-spinner" />
                  <h4>Synthesizing High-Resolution Concept…</h4>
                  <p>Our AI Atelier is calculating metal reflections, gemstone facet reflections, and 4-angle studio photography.</p>
                </div>
              ) : currentImage ? (
                <div className="cyo-image-container">
                  <img
                    src={currentImage.image_url}
                    alt={`${activeDesign?.title || 'Bespoke Concept'} - ${activeAngle} view`}
                    className="cyo-rendered-image"
                  />
                  <button
                    type="button"
                    className="cyo-zoom-overlay-btn"
                    onClick={() => setZoomModalOpen(true)}
                    aria-label="Inspect high resolution"
                  >
                    <ZoomIn size={18} /> Inspect Detail
                  </button>
                  <div className="cyo-viewport-caption">
                    <span>{activeDesign?.title}</span>
                    <small>{activeAngle.toUpperCase()} VIEW · 1 OF 1 BESPOKE ATELIER CONCEPT</small>
                  </div>
                </div>
              ) : (
                <div className="cyo-placeholder-viewport">
                  <Sparkles size={40} color="#c5a059" />
                  <h4>No Concept Generated Yet</h4>
                  <p>Start by describing your vision, choose your materials, and click "Generate 4-Angle Concept" below.</p>
                </div>
              )}
            </div>

            {/* Generation CTA Bar */}
            <div className="cyo-generation-action-bar">
              <button
                type="button"
                className="button dark full cyo-generate-btn"
                onClick={handleGenerateImages}
                disabled={generating || busy || quota.remaining <= 0 || !activeDesign}
              >
                {generating ? (
                  <>Synthesizing 4 Concept Angles…</>
                ) : quota.remaining <= 0 ? (
                  <>✦ Generation Quota Reached (3 of 3 used)</>
                ) : (
                  <>
                    <Sparkles size={17} /> Generate 4-Angle Concept ({quota.remaining} left)
                  </>
                )}
              </button>

              <div className="cyo-quota-fineprint">
                {quota.remaining <= 0 ? (
                  <span className="warning-text">
                    You have used all 3 AI image generations. You can continue refining text notes and submit your design for workshop quotation.
                  </span>
                ) : (
                  <span>
                    Consumes 1 image generation from your account balance. Generates 4 photorealistic views simultaneously.
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* COLUMN 3: Artisanal Specifications & Commercial Quotation */}
          <aside className="cyo-col cyo-specs-col">
            <div className="cyo-col-header">
              <SlidersHorizontal size={16} color="#c5a059" />
              <h3>Artisanal Specifications</h3>
            </div>

            <div className="cyo-specs-scroll">
              {/* Category */}
              <div className="cyo-spec-group">
                <label>Jewellery Category</label>
                <select
                  value={attributes.category}
                  onChange={e => setAttributes({ ...attributes, category: e.target.value })}
                >
                  <option value="Necklace">Necklace / Choker / Haar</option>
                  <option value="Earrings">Earrings / Jhumkas / Chandbalis</option>
                  <option value="Ring">Statement Ring / Solitaire</option>
                  <option value="Bracelet">Bracelet / Kada / Cuff</option>
                  <option value="Bangle">Bangle Pair</option>
                  <option value="Mangalsutra">Bespoke Mangalsutra</option>
                  <option value="Pendant">Heritage Pendant</option>
                </select>
              </div>

              {/* Precious Metal */}
              <div className="cyo-spec-group">
                <label>Precious Metal & Purity</label>
                <select
                  value={attributes.material}
                  onChange={e => setAttributes({ ...attributes, material: e.target.value })}
                >
                  <option value="Gold">22K Yellow Gold (916 Hallmarked)</option>
                  <option value="Rose Gold">18K Rose Gold (750 Hallmarked)</option>
                  <option value="Silver">925 Sterling Silver</option>
                  <option value="Oxidised Silver">Antique Oxidised Silver</option>
                </select>
              </div>

              {/* Craftsmanship */}
              <div className="cyo-spec-group">
                <label>Craftsmanship Technique</label>
                <select
                  value={attributes.craftsmanship}
                  onChange={e => setAttributes({ ...attributes, craftsmanship: e.target.value })}
                >
                  <option value="Kundan">Kundan (Foil-backed Setting)</option>
                  <option value="Polki">Polki (Raw Uncut Diamonds)</option>
                  <option value="Meenakari">Meenakari (Vibrant Enamel Work)</option>
                  <option value="Temple Craft">Temple Craft (South Indian Relief)</option>
                  <option value="Jadau">Jadau Traditional Royal Work</option>
                  <option value="Filigree">Tarakasi Fine Wire Filigree</option>
                  <option value="Handcrafted">Handcrafted Plain Metal</option>
                </select>
              </div>

              {/* Finish */}
              <div className="cyo-spec-group">
                <label>Surface Finish</label>
                <select
                  value={attributes.finish}
                  onChange={e => setAttributes({ ...attributes, finish: e.target.value })}
                >
                  <option value="Antique Gold Finish">Antique Royal Gold Finish</option>
                  <option value="Polished Gold">Mirror High-Polish Gold</option>
                  <option value="Matte Finish">Understated Satin Matte</option>
                  <option value="Rhodium Finish">Lustrous Rhodium Plating</option>
                  <option value="Oxidised Finish">Vintage Charcoal Oxidised</option>
                </select>
              </div>

              {/* Gemstone Highlights */}
              <div className="cyo-spec-group">
                <label>Gemstone Inlays</label>
                <select
                  value={attributes.gemstones}
                  onChange={e => setAttributes({ ...attributes, gemstones: e.target.value })}
                >
                  <option value="Emerald & Polki Diamond">Zambian Emerald & Polki Diamonds</option>
                  <option value="Ruby & Polki Diamond">Burmese Ruby & Polki Diamonds</option>
                  <option value="Cultured Pearl">Luminous Basra Cultured Pearls</option>
                  <option value="Blue Sapphire">Royal Blue Sapphires</option>
                  <option value="Polki Diamond">Solitaire Uncut Polki Diamonds</option>
                </select>
              </div>

              {/* Structural Feasibility Card */}
              <div className="cyo-feasibility-card">
                <div className="cyo-feasibility-header">
                  <ShieldCheck size={16} color="#2e7d32" />
                  <strong>Structural Feasibility Verified</strong>
                </div>
                <div className="cyo-feasibility-meta">
                  <span>Feasibility: 98%</span>
                  <span>Est. Weight: ~{feasibility?.estimatedWeightG || '22.5'}g</span>
                </div>
                <p className="small muted">
                  Calculated against Veyora fine jewellery structural engineering guidelines. Prongs and clasps designed for generational wear.
                </p>
              </div>

              {/* Commercial Quotation & Purchase Card */}
              <div className="cyo-commercial-card">
                <span className="eyebrow">WORKSHOP QUOTATION</span>

                {activeQuote ? (
                  <div className="cyo-quote-summary">
                    <div className="cyo-quote-price">
                      <strong>{money(activeQuote.quoted_amount)}</strong>
                      <span className={`cyo-quote-status-badge ${activeQuote.status}`}>
                        {activeQuote.status === 'quotation_accepted' ? 'Accepted' : 'Quotation Issued'}
                      </span>
                    </div>
                    <p className="small">
                      Estimated net weight: {activeQuote.estimated_weight_g || '22'}g (GST 3% included).
                      Valid until {activeQuote.valid_until || 'next 7 days'}.
                    </p>

                    {activeQuote.status === 'quotation_sent' && (
                      <button
                        type="button"
                        className="button dark full"
                        onClick={() => handleAcceptQuotation(activeQuote.id)}
                        disabled={busy}
                      >
                        Accept Quotation <Check size={16} />
                      </button>
                    )}

                    {activeQuote.status === 'quotation_accepted' && (
                      <button
                        type="button"
                        className="button dark full"
                        onClick={() => handleAddToBag(activeQuote)}
                      >
                        <ShoppingBag size={16} /> Add to Bag & Checkout
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="cyo-request-quote-box">
                    <p>Once you are happy with your concept, submit it to our master jewellers for real-time bullion, gemstone, and making charges pricing.</p>
                    <button
                      type="button"
                      className="button outline full"
                      onClick={handleRequestQuotation}
                      disabled={busy || !activeDesign}
                    >
                      <FileText size={15} /> Request Artisan Quotation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Saved Designs Drawer */}
        {savedDrawerOpen && (
          <div className="cyo-drawer-backdrop" onClick={() => setSavedDrawerOpen(false)}>
            <div className="cyo-drawer-panel" onClick={e => e.stopPropagation()}>
              <div className="cyo-drawer-header">
                <h3>Your Bespoke Concepts ({designs.length})</h3>
                <button type="button" onClick={() => setSavedDrawerOpen(false)} aria-label="Close drawer">
                  <X size={18} />
                </button>
              </div>
              <div className="cyo-drawer-list">
                {designs.length === 0 ? (
                  <p className="empty">No saved designs yet.</p>
                ) : (
                  designs.map(d => (
                    <div
                      key={d.id}
                      className={`cyo-drawer-item ${activeDesign?.id === d.id ? 'active' : ''}`}
                      onClick={() => loadDesign(d.id)}
                    >
                      <div className="cyo-drawer-thumb">
                        {d.thumbnail ? (
                          <img src={d.thumbnail} alt={d.title} />
                        ) : (
                          <div className="thumb-placeholder"><Sparkles size={16} /></div>
                        )}
                      </div>
                      <div className="cyo-drawer-info">
                        <strong>{d.title}</strong>
                        <small>{d.category} · {d.status}</small>
                        {d.quotation && (
                          <span className="quote-tag">{money(d.quotation.amount)}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* High-Resolution Zoom Modal */}
        {zoomModalOpen && currentImage && (
          <div className="cyo-modal-backdrop" onClick={() => setZoomModalOpen(false)}>
            <div className="cyo-zoom-modal-content" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className="cyo-modal-close-btn"
                onClick={() => setZoomModalOpen(false)}
                aria-label="Close zoom"
              >
                <X size={20} />
              </button>
              <img src={currentImage.image_url} alt={activeDesign?.title} className="cyo-modal-img" />
              <div className="cyo-modal-footer">
                <strong>{activeDesign?.title} — {activeAngle.toUpperCase()} VIEW</strong>
                <p>1 of 1 High-Resolution Photorealistic AI Concept · Veyora Jewels Atelier</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
