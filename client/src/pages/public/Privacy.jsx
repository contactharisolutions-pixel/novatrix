import LegalPage from '../../components/public/LegalPage'

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '1.75rem' }}>
    <h2 style={{
      fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)',
      marginBottom: '0.625rem', fontFamily: 'Outfit, sans-serif',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <span style={{ color: 'var(--cyan)', fontSize: '0.7rem' }}>▶</span>
      {title}
    </h2>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
      {children}
    </div>
  </div>
)

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <Section title="1. Information We Collect">
        <p>We collect information you provide during registration (name, email, phone number) and information generated through your use of the platform (transaction records, IP address, device data).</p>
      </Section>
      <Section title="2. How We Use Your Information">
        <p>Your data is used to operate your account, process transactions, send notifications, provide customer support, and comply with legal obligations.</p>
      </Section>
      <Section title="3. Data Sharing">
        <p>We do not sell or rent your personal data to third parties. Data may be shared with service providers essential to platform operations under strict confidentiality agreements.</p>
      </Section>
      <Section title="4. Data Security">
        <p>All sensitive data is encrypted using industry-standard protocols. Wallet addresses and passwords are hashed and never stored in plain text.</p>
      </Section>
      <Section title="5. Cookies">
        <p>We use cookies to maintain your session and improve platform performance. You may disable cookies in your browser but this may affect platform functionality.</p>
      </Section>
      <Section title="6. Your Rights">
        <p>You may request access to, correction of, or deletion of your personal data by contacting us at{' '}
          <a href="mailto:support@novatrix.vip" style={{ color: 'var(--cyan)' }}>support@novatrix.vip</a>.
        </p>
      </Section>
      <Section title="7. Contact">
        <p>For privacy-related inquiries, email us at{' '}
          <a href="mailto:support@novatrix.vip" style={{ color: 'var(--cyan)' }}>support@novatrix.vip</a>.
        </p>
      </Section>
    </LegalPage>
  )
}
