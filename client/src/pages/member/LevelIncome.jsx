import IncomeReportPage from './IncomeReportPage'
import { Layers } from 'lucide-react'

export default function LevelIncome() {
  return (
    <IncomeReportPage 
      type="level" 
      title="Team Level Bonus" 
      subtitle="Commissions generated from your multi-level team (up to 15 levels)"
      icon={Layers}
    />
  )
}
