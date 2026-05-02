import HeroSection        from '../../components/public/HeroSection'
import LiveMarketSection  from '../../components/public/LiveMarketSection'
import AboutSection       from '../../components/public/AboutSection'
import ServicesSection    from '../../components/public/ServicesSection'
import HowItWorksSection  from '../../components/public/HowItWorksSection'
import PlansSection       from '../../components/public/PlansSection'
import WhyUsSection       from '../../components/public/WhyUsSection'
import TestimonialsSection from '../../components/public/TestimonialsSection'
import FAQSection         from '../../components/public/FAQSection'

/**
 * Public Homepage — assembles all sections.
 * Each section manages its own id anchor for navbar scroll links.
 */
export default function Home() {
  return (
    <>
      <HeroSection />
      <LiveMarketSection />
      <AboutSection />
      <ServicesSection />
      <HowItWorksSection />
      <PlansSection />
      <WhyUsSection />
      <TestimonialsSection />
      <FAQSection />
    </>
  )
}
