import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Wrench } from "lucide-react"
import type { Branch, RepairJob } from "@/types"

interface RecentRepairsProps {
  repairJobs: RepairJob[]
  branches: Branch[]
}

export default function RecentRepairs({ repairJobs, branches }: RecentRepairsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          รายการซ่อมล่าสุด
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {repairJobs.length > 0 ? (
            <div className="space-y-3">
              {repairJobs.slice(0, 10).map((job) => (
                <div key={job.id} className="flex justify-between items-start p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{job.customerName}</p>
                    <p className="text-xs text-muted-foreground">{job.symptoms}</p>
                    <p className="text-xs text-muted-foreground">
                      สาขา: {branches.find((b) => b.id === job.branchId)?.name || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.dateReceived).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary">฿{job.estimatedPrice?.toLocaleString() || 0}</Badge>
                    <Badge variant={job.status === "completed" ? "default" : "outline"}>
                      {job.status === "completed" ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">ยังไม่มีรายการซ่อม</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
