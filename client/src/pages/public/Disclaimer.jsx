import LegalPage from '../../components/public/LegalPage'

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
    <div className="text-slate-400 text-sm leading-relaxed space-y-2">{children}</div>
  </div>
)

export default function Disclaimer() {
  return (
    <LegalPage title="Risk Disclaimer">
      <div className="bg-orange-400/10 border border-orange-400/30 rounded-xl p-4 mb-6">
        <p className="text-orange-400 font-semibold text-sm">
          ⚠️ Important: Please read this disclaimer carefully before investing.
        </p>
      </div>
      <Section title="1. Investment Risk">
        <p>All forms of investment, including Crypto and Forex trading, carry substantial risk of loss. Past performance is not indicative of future results. You may lose some or all of your invested capital.</p>
      </Section>
      <Section title="2. No Guaranteed Returns">
        <p>While Novatrix strives to deliver consistent returns through professional trading, no returns are guaranteed. Market conditions can result in periods of reduced or no profit distribution.</p>
      </Section>
      <Section title="3. Not Financial Advice">
        <p>Nothing on this platform constitutes financial, investment, legal, or tax advice. You should consult with a qualified financial advisor before making investment decisions.</p>
      </Section>
      <Section title="4. Cryptocurrency Risks">
        <p>Cryptocurrency markets are highly volatile and unregulated in many jurisdictions. Exchange rates and market conditions can change rapidly and unpredictably.</p>
      </Section>
      <Section title="5. Regulatory Compliance">
        <p>It is your responsibility to ensure that your participation in this platform complies with the laws and regulations of your country of residence. Novatrix does not guarantee availability or legality of its services in all jurisdictions.</p>
      </Section>
      <Section title="6. Only Risk Capital">
        <p>We strongly recommend only investing funds you can afford to lose. Never invest money needed for essential living expenses, emergency funds, or borrowed capital.</p>
      </Section>
    </LegalPage>
  )
}
