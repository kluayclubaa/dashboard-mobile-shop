import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Wrench, CheckCircle, Clock } from "lucide-react"

interface StatsCardsProps {
  totalRevenue: number
  totalRepairs: number
  completedRepairs: number
  inProgressRepairs: number
}

export default function StatsCards({
  totalRevenue,
  totalRepairs,
  completedRepairs,
  inProgressRepairs,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">รายได้รวม</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">฿{totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">จากงานซ่อมที่เสร็จแล้ว</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">งานซ่อมทั้งหมด</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalRepairs.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">รวมทุกสถานะ</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">งานเสร็จสิ้น</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedRepairs}</div>
          <p className="text-xs text-muted-foreground">งานที่เสร็จแล้ว</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inProgressRepairs}</div>
          <p className="text-xs text-muted-foreground">งานที่ยังไม่เสร็จ</p>
        </CardContent>
      </Card>
    </div>
  )
}
