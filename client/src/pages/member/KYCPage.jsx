import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, CheckCircle, Clock, XCircle, Loader2, ShieldCheck, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { PageHeader, Spinner, Panel, Badge } from '../../components/member/ui'

const schema = z.object({
  doc_type: z.enum(['passport', 'aadhar_card', 'pan_card'], { required_error: 'Select a document type' }),
})

const DOC_TYPES = [
  { value: 'aadhar_card', label: 'Aadhar Card' },
  { value: 'pan_card',    label: 'Pan Card'    },
  { value: 'passport',    label: 'Passport'    },
]

const STATUS_CONFIG = {
  pending:  { icon: Clock,         color: 'var(--orange)', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', label: 'Under Review' },
  approved: { icon: CheckCircle,   color: 'var(--green)',  bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: 'Verified'     },
  rejected: { icon: XCircle,       color: 'var(--red)',    bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  label: 'Action Required' },
}

export default function KYCPage() {
  const [kyc,     setKyc]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [frontPrev, setFrontPrev] = useState(null)
  const [backPrev,  setBackPrev]  = useState(null)
  const [frontFile, setFrontFile] = useState(null)
  const [backFile,  setBackFile]  = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({ 
    resolver: zodResolver(schema),
    defaultValues: { doc_type: 'aadhar_card' }
  })

  const selectedType = watch('doc_type')

  const loadKyc = () => {
    setLoading(true)
    api.get('/kyc/status')
      .then(({ data }) => setKyc(data.kyc))
      .catch(() => toast.error('Could not load KYC status'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadKyc() }, [])

  const onFileChange = (side, e) => {
    const file = e.target.files[0]
    if (!file) return
    if (side === 'front') { setFrontFile(file); setFrontPrev(URL.createObjectURL(file)) }
    else                  { setBackFile(file);  setBackPrev(URL.createObjectURL(file))  }
  }

  const onSubmit = async (data) => {
    if (!frontFile) return toast.error('Front image is required')
    if (selectedType === 'aadhar_card' && !backFile) return toast.error('Back image is required for Aadhar Card')
    
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('doc_type', data.doc_type)
      fd.append('front', frontFile)
      if (backFile) fd.append('back', backFile)
      await api.post('/kyc/submit', fd)
      toast.success('KYC submitted! We\'ll review it within 24 hours.')
      setFrontFile(null); setFrontPrev(null)
      setBackFile(null);  setBackPrev(null)
      loadKyc()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  if (loading) return <Spinner />

  // Status display for approved/pending
  if (kyc && kyc.status !== 'rejected') {
    const cfg = STATUS_CONFIG[kyc.status]
    const Icon = cfg.icon
    return (
      <div className="fade-in" style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
        <PageHeader title="Verify Identity" subtitle="Your identity verification status" />
        
        <Panel style={{ textAlign: 'center', padding: '3.5rem 2rem', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--navy-card)', border: `2px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Icon size={40} style={{ color: cfg.color }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>{cfg.label}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
            {kyc.status === 'approved'
              ? 'Your identity has been successfully verified. You now have full access to all platform trading and withdrawal limits.'
              : 'Your documents are currently being reviewed by our compliance team. This process typically takes less than 24 hours.'}
          </p>
          
          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Document</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.25rem' }} className="capitalize">{kyc.doc_type?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Submitted</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.25rem' }}>{new Date(kyc.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="Verify Identity" subtitle="Confirm your identity to unlock all platform features" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--gap-md)' }} id="kyc-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
          {/* Why KYC */}
          <Panel style={{ background: 'rgba(0,212,255,0.02)', border: '1px solid var(--border-cyan)' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <ShieldCheck size={24} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Why verify?</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Verifying your identity helps keep your account safe and allows you to withdraw larger amounts easily.
                </p>
              </div>
            </div>
          </Panel>

          {/* Rejected notice */}
          {kyc?.status === 'rejected' && (
            <Panel style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid var(--border-red)' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Info size={24} style={{ color: 'var(--red)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 800, color: 'var(--red)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Action Required</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{kyc.review_note || 'Please resubmit with clearer, valid identification documents.'}</p>
                </div>
              </div>
            </Panel>
          )}

          <Panel>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Document type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Select Verification Document</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {DOC_TYPES.map(({ value, label }) => (
                    <label key={value} style={{ cursor: 'pointer' }}>
                      <input type="radio" {...register('doc_type')} value={value} style={{ display: 'none' }} />
                      <div className="kyc-radio-item" style={{
                        padding: '1rem', textAlign: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                        fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', transition: 'var(--transition-normal)'
                      }}>
                        {label}
                      </div>
                    </label>
                  ))}
                </div>
                {errors.doc_type && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{errors.doc_type.message}</p>}
              </div>

              {/* Upload areas */}
              <div style={{ display: 'grid', gridTemplateColumns: selectedType === 'pan_card' ? '1fr' : '1fr 1fr', gap: '1.5rem' }} id="kyc-upload-row">
                {[
                  { side: 'front', label: 'Front Photo', required: true,  preview: frontPrev, show: true },
                  { side: 'back',  label: 'Back Photo',  required: selectedType === 'aadhar_card', preview: backPrev,  show: selectedType !== 'pan_card'  },
                ].filter(f => f.show).map(({ side, label, required, preview }) => (
                  <div key={side}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                      {label} <span style={{ color: required ? 'var(--red)' : 'var(--text-faint)', fontSize: '0.75rem' }}>{required ? '(Required)' : '(Optional)'}</span>
                    </label>
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                      height: 180, border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      transition: 'var(--transition-normal)', position: 'relative', overflow: 'hidden'
                    }} className="upload-box">
                      {preview ? (
                        <img src={preview} alt={`${side} preview`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Upload size={20} style={{ color: 'var(--text-faint)' }} />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Click to Upload</p>
                            <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginTop: '0.25rem' }}>JPG, PNG up to 10MB</p>
                          </div>
                        </>
                      )}
                      <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => onFileChange(side, e)} />
                    </label>
                  </div>
                ))}
              </div>

              <button type="submit" disabled={submitting} className="btn-primary" style={{ height: 50, marginTop: '0.5rem' }}>
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /><span>Submit for Review</span></>}
              </button>
            </form>
          </Panel>
        </div>
      </div>

      <style>{`
        input[type="radio"]:checked + .kyc-radio-item {
          border-color: var(--cyan);
          background: rgba(0,212,255,0.08);
          color: var(--cyan);
          box-shadow: 0 0 15px rgba(0,212,255,0.1);
        }
        .upload-box:hover {
          border-color: var(--cyan);
          background: rgba(0,212,255,0.02);
        }
        @media (max-width: 639px) {
          #kyc-upload-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
