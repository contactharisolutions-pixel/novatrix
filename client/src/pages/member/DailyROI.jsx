import IncomeReportPage from './IncomeReportPage'
import { TrendingUp } from 'lucide-react'

export default function DailyROI() {
  return (
    <IncomeReportPage 
      type="trading" 
      title="Daily Trading Profit" 
      subtitle="History of your daily trading returns (ROI) based on your active packages"
      icon={TrendingUp}
    />
  )
}
