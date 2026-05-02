import IncomeReportPage from './IncomeReportPage'
import { User } from 'lucide-react'

export default function DirectIncome() {
  return (
    <IncomeReportPage 
      type="direct" 
      title="Direct Referral Bonus" 
      subtitle="Commissions earned from your direct network's investments"
      icon={User}
    />
  )
}
