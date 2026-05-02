import { useEffect, useState, useCallback } from 'react'
import { Save, Loader2, RefreshCw, Cpu, Percent, Wallet, Layout, ShieldAlert, Upload, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../store/useAdminStore'
import { AdminPageHeader, AdminSpinner } from '../../components/admin/ui'

// Default settings with labels and descriptions
const SETTING_DEFS = [
  { 
    group: 'Trading Profits',
    icon: Cpu,
    items: [
      { key: 'daily_roi_min',     label: 'Min Daily Profit (%)', type: 'number', step: '0.01', placeholder: '0.50' },
      { key: 'daily_roi_max',     label: 'Max Daily Profit (%)', type: 'number', step: '0.01', placeholder: '1.50' },
      { key: 'roi_cap_multiplier',label: 'Total Profit Limit (e.g. 2.0x)',    type: 'number', step: '0.1',  placeholder: '2.0'  },
    ]
  },
  { 
    group: 'Referral Bonuses',
    icon: Percent,
    items: [
      { key: 'direct_bonus_pct',  label: 'Direct Bonus (%)',  type: 'number', step: '0.1', placeholder: '5' },
    ]
  },
  { 
    group: 'Withdrawal Settings',
    icon: Wallet,
    items: [
      { key: 'withdrawal_fee_pct',     label: 'Withdrawal Fee (%)',     type: 'number', step: '0.1', placeholder: '5'   },
      { key: 'min_withdrawal',         label: 'Min Withdrawal ($)',   type: 'number', step: '1',   placeholder: '10'  },
      { key: 'max_withdrawal',         label: 'Max Withdrawal ($)',   type: 'number', step: '1',   placeholder: '5000'},
      { key: 'withdrawal_days',        label: 'Withdrawal Days', type: 'text',   placeholder: 'mon,tue,wed,thu,fri' },
    ]
  },
  { 
    group: 'System Settings',
    icon: Layout,
    items: [
      { key: 'min_deposit',            label: 'Min Deposit ($)', type: 'number', step: '1',   placeholder: '50'  },
      { key: 'registration_bonus',     label: 'Signup Bonus ($)',        type: 'number', step: '1',   placeholder: '0'   },
      { key: 'maintenance_mode',       label: 'Maintenance Mode',     type: 'select', options: ['off', 'on'] },
    ]
  },
  {
    group: 'Deposit Configuration',
    icon: QrCode,
    items: [
      { key: 'deposit_address', label: 'USDT Deposit Address (BEP20)', type: 'text', placeholder: 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXnovatrix' },
    ]
  },
]

export default function SettingsPage() {
  const [values,  setValues]  = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminApi.get('/settings')
      setValues(data.settings || {})
    } catch { toast.error('Could not load system parameters') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.put('/settings/bulk', { settings: values })
      toast.success('System parameters updated and synchronized.')
    } catch (err) { toast.error(err?.response?.data?.error || 'Synchronization failed') }
    finally { setSaving(false) }
  }

  if (loading) return <AdminSpinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)', maxWidth: 900 }}>
      <AdminPageHeader
        title="System Settings"
        subtitle="Configure platform rules, bonuses, and withdrawal limits"
        action={
          <button onClick={load} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 800 }}>
            <RefreshCw size={14} /> <span>Refresh</span>
          </button>
        }
      />

      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
        {SETTING_DEFS.map(({ group, icon: Icon, items }) => (
          <div key={group} style={{ padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
               <Icon size={18} style={{ color: 'var(--orange)' }} />
               <h3 style={{ fontSize: '0.8125rem', fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group}</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {items.map(({ key, label, type, step, placeholder, options }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{label}</label>
                  {type === 'select' ? (
                    <select value={values[key] || ''} onChange={(e) => set(key, e.target.value)} className="input">
                      {options.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type}
                      step={step}
                      value={values[key] || ''}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder}
                      className="input"
                    />
                  )}
                </div>
              ))}
            </div>

            {group === 'Deposit Configuration' && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                 <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '1rem' }}>Deposit QR Code</p>
                 <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ width: 120, height: 120, background: '#fff', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex' }}>
                       {values.deposit_qr_url ? (
                         <img src={values.deposit_qr_url} alt="Deposit QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                       ) : (
                         <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QrCode size={32} style={{ color: 'rgba(0,0,0,0.2)' }} />
                         </div>
                       )}
                    </div>
                    <label style={{ flex: 1, height: 120, border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'var(--transition-normal)' }} className="hover-glow">
                       <Upload size={20} style={{ color: 'var(--text-faint)' }} />
                       <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Upload New QR Code</span>
                       <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                         const file = e.target.files[0]
                         if (!file) return
                         const fd = new FormData()
                         fd.append('qr', file)
                         try {
                           const { data } = await adminApi.post('/settings/upload-qr', fd)
                           set('deposit_qr_url', data.url)
                           toast.success('QR Code updated!')
                         } catch (err) { 
                           toast.error(err?.response?.data?.error || 'Upload failed') 
                         }
                       }} />
                    </label>
                 </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ position: 'sticky', bottom: '1.5rem', zIndex: 10, padding: '1.25rem', background: 'rgba(10,18,34,0.8)', backdropFilter: 'blur(12px)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
           <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>Save Settings</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Changes will be applied to the system immediately.</p>
           </div>
           <button type="submit" disabled={saving} className="btn-primary" style={{ minWidth: 200, height: 48 }}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> <span>Save Now</span></>}
           </button>
        </div>
      </form>
    </div>
  )
}
